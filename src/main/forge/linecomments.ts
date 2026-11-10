import { FORGE_NAME, forgeApi } from '../credentials/forge'
import { networkText, statusText } from './mrs'
import { Failure, forgeGet, type ScoreTarget } from './scores'

export interface LinePost {
  head: string
  file: string
  /** GitLab's position needs the path before a rename. */
  oldFile: string
  line: number
  body: string
}

/** `diff --git a/old b/new` of a unified diff: the renamed files, new path to old path. */
export function renames(diff: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [, from, to] of diff.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)) if (from !== to) out[to!] = from!
  return out
}

/**
 * M36: reads the MR from the forge, then posts one comment on a line of its diff. `moved` when the forge's
 * head is not the drafts' head; `rejected` when the forge refuses the line (400, 422). Any other failure
 * throws M6's text.
 */
export async function postLine(tgt: ScoreTarget, secret: Record<string, string>, fetchImpl: typeof fetch, p: LinePost): Promise<'posted' | 'rejected' | 'moved'> {
  const mr = (await (await forgeGet(tgt, secret, fetchImpl)(tgt.ref)).json()) as { head?: { sha?: string }; diff_refs?: { base_sha?: string; start_sha?: string; head_sha?: string } | null }
  let path = `${tgt.ref}/comments`
  let payload: object = { body: p.body, commit_id: p.head, path: p.file, line: p.line, side: 'RIGHT' }
  if (tgt.forge === 'github') {
    if (mr.head?.sha !== p.head) return 'moved'
  } else {
    const refs = mr.diff_refs
    if (!refs?.base_sha || !refs.start_sha || refs.head_sha !== p.head) return 'moved'
    path = `${tgt.ref}/discussions`
    payload = { body: p.body, position: { position_type: 'text', base_sha: refs.base_sha, start_sha: refs.start_sha, head_sha: refs.head_sha, old_path: p.oldFile, new_path: p.file, new_line: p.line } }
  }
  const name = FORGE_NAME[tgt.forge]
  const { base, headers } = forgeApi(tgt.forge, secret['site'] ?? 'https://gitlab.com', secret['token'] ?? '')
  let res: Response
  try {
    // A redirect would carry the token to another host.
    res = await fetchImpl(new URL(`${base}${path}`), { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), redirect: 'error', signal: AbortSignal.timeout(10_000) })
  } catch (err) {
    throw new Failure(networkText(name, err))
  }
  if (res.status === 422 || res.status === 400) return 'rejected'
  if (!res.ok) throw new Failure(statusText(name, res.status))
  return 'posted'
}
