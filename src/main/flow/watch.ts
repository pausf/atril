import { existsSync, watch, type FSWatcher } from 'node:fs'
import { join } from 'node:path'
import type { FlowStage } from '../../preload/api'
import type { Runner } from '../run'
import { lastModified, stageOf } from './stage'

export interface FlowWatcher {
  close(): void
}

interface Options {
  path: string
  baseCommit: string
  run: Runner
  onChange: (stage: FlowStage) => void
  debounceMs?: number
}

// Resolves once the first stage is known and the watches are armed, so a caller that
// writes right after cannot slip a change in between.
export async function watchFlow(o: Options): Promise<FlowWatcher> {
  const agents = join(o.path, '.agents')
  const changes = join(agents, 'changes')
  let closed = false
  let timer: NodeJS.Timeout | undefined
  let last = ''
  let inner: { dir: string; w: FSWatcher } | undefined

  const arm = (): void => {
    const dir = existsSync(changes) ? changes : existsSync(agents) ? agents : undefined
    if (inner?.dir === dir) return
    inner?.w.close()
    inner = undefined
    if (!dir) return
    try {
      // Recursive only for changes/: .agents/ itself just needs to show changes/ appearing.
      inner = { dir, w: watch(dir, { recursive: dir === changes }, schedule) }
      inner.w.on('error', () => undefined)
    } catch {
      /* directory vanished between the check and the watch: the next event re-arms */
    }
  }

  // F14: an edit that keeps the stage must still notify, so the folder's newest mtime is part of the key.
  const keyOf = async (stage: FlowStage): Promise<string> =>
    JSON.stringify(stage) + (stage.change ? `@${await lastModified(join(changes, stage.change)).catch(() => 0)}` : '')

  const refresh = async (): Promise<void> => {
    const stage = await stageOf(o.path, o.baseCommit, o.run)
    if (closed) return
    arm()
    const key = await keyOf(stage)
    if (key === last) return
    last = key
    o.onChange(stage)
  }

  function schedule(): void {
    clearTimeout(timer)
    timer = setTimeout(() => void refresh(), o.debounceMs ?? 500)
  }

  const root = watch(o.path, { recursive: false }, (_e, name) => {
    if (name === '.agents') schedule()
  })
  root.on('error', () => undefined)
  arm()
  last = await keyOf(await stageOf(o.path, o.baseCommit, o.run))

  return {
    close() {
      closed = true
      clearTimeout(timer)
      root.close()
      inner?.w.close()
    }
  }
}

interface Hub {
  /** Starts watching that workspace and closes every other; null closes all. */
  select(id: string | null): Promise<FlowStage | null>
  forget(id: string): void
}

export function createFlowHub(opts: {
  run: Runner
  find: (id: string) => Promise<{ path: string; baseCommit: string } | undefined>
  emit: (id: string, stage: FlowStage) => void
}): Hub {
  const open = new Map<string, Promise<FlowWatcher>>()
  const forget = (id: string): void => {
    void open.get(id)?.then((w) => w.close())
    open.delete(id)
  }
  return {
    forget,
    async select(id) {
      for (const other of [...open.keys()]) if (other !== id) forget(other)
      const ws = id ? await opts.find(id) : undefined
      if (!id || !ws) return null
      if (!open.has(id)) {
        open.set(id, watchFlow({ ...ws, run: opts.run, onChange: (s) => opts.emit(id, s) }))
      }
      await open.get(id)
      return stageOf(ws.path, ws.baseCommit, opts.run)
    }
  }
}
