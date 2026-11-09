import { useEffect, useState } from 'react'
import type { JiraIssue, NextItem, WorkspaceView } from '../preload/api'

export function useNextUp(): NextItem[] {
  const [items, setItems] = useState<NextItem[]>([])
  useEffect(() => {
    void window.atril.nextup.get().then(setItems)
    return window.atril.nextup.onChange(setItems)
  }, [])
  return items
}

export type QuickStart =
  | { kind: 'dialog' }
  | { kind: 'started'; workspace: WorkspaceView; transitionError?: string }
  | { kind: 'error'; error: string }

/**
 * I20/I21: starts at once (default model, no dialog) only when the project already has a remembered
 * repo and the proposed branch is the bare key; anything else, or ⌥-click, needs the dialog.
 */
export async function startOrAsk(issue: JiraIssue, optionClick: boolean): Promise<QuickStart> {
  if (optionClick) return { kind: 'dialog' }
  const p = await window.atril.jira.proposeStart(issue)
  if ('error' in p || !p.repoId || !p.branch || p.note) return { kind: 'dialog' }
  const r = await window.atril.jira.start({
    key: issue.key,
    components: issue.components,
    group: issue.group,
    repoId: p.repoId,
    branch: p.branch,
    model: 'default'
  })
  if ('error' in r) return { kind: 'error', error: r.error }
  return { kind: 'started', workspace: r.workspace, ...(r.transitionError && { transitionError: r.transitionError }) }
}
