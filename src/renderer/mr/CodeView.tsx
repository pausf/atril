import { Fragment, type ReactNode } from 'react'
import type { ForgeId, MrDraft, MrPageFile, MrPageLine, MrThread } from '../../preload/api'
import { useT } from '../ui'

const NAME: Record<ForgeId, string> = { github: 'GitHub', gitlab: 'GitLab' }

/** Where M47 puts each thread and draft: after a line, under a file's header, above the files, or in Conversación. */
export interface Placed {
  /** `${path}\n${index of the line}` → what follows that line. */
  onLine: Map<string, { threads: MrThread[]; drafts: MrDraft[] }>
  onFile: Map<string, MrThread[]>
  top: MrDraft[]
  /** Conversación: the threads with a note when their line left the diff, and the drafts that cannot sit on a line. */
  talk: Array<{ th: MrThread; gone: boolean }>
  talkDrafts: MrDraft[]
}

const key = (path: string, i: number): string => `${path}\n${i}`

export function place(files: MrPageFile[], threads: MrThread[], drafts: MrDraft[]): Placed {
  const out: Placed = { onLine: new Map(), onFile: new Map(), top: [], talk: [], talkDrafts: [] }
  const byPath = new Map(files.map((f) => [f.path, f]))
  const at = (path: string) => {
    const k = out.onLine.get(path) ?? { threads: [], drafts: [] }
    out.onLine.set(path, k)
    return k
  }
  const find = (f: MrPageFile, line: number, side: 'old' | 'new'): number => f.lines.findIndex((l) => (side === 'old' ? l.kind !== 'added' && l.old === line : l.kind !== 'removed' && l.new === line))
  for (const th of threads) {
    const f = th.file ? (byPath.get(th.file) ?? files.find((x) => x.oldPath === th.file)) : undefined
    if (!th.file || !f) {
      out.talk.push({ th, gone: false })
      continue
    }
    if (th.line === undefined) {
      out.onFile.set(f.path, [...(out.onFile.get(f.path) ?? []), th])
      continue
    }
    const i = th.outdated ? -1 : find(f, th.line, th.side === 'old' ? 'old' : 'new')
    if (i < 0) out.talk.push({ th, gone: true })
    else at(key(f.path, i)).threads.push(th)
  }
  for (const d of drafts) {
    if (d.line === undefined) {
      out.top.push(d)
      continue
    }
    const f = d.file ? byPath.get(d.file) : undefined
    const i = f && !f.cut && !f.tooLarge ? find(f, d.line, 'new') : -1
    if (i < 0) out.talkDrafts.push(d)
    else at(key(f!.path, i)).drafts.push(d)
  }
  return out
}

/** A jump in either numbering starts a new hunk; the line that starts one is marked. */
function gapsOf(f: MrPageFile): Set<number> {
  const gaps = new Set<number>()
  let old: number | undefined
  let nu: number | undefined
  f.lines.forEach((l, i) => {
    if ((l.old !== undefined && old !== undefined && l.old > old + 1) || (l.new !== undefined && nu !== undefined && l.new > nu + 1)) gaps.add(i)
    old = l.old ?? old
    nu = l.new ?? nu
  })
  return gaps
}

const SIGN: Record<MrPageLine['kind'], string> = { added: '+', removed: '−', context: ' ' }

/** M47: each file with its lines, both numbers and the sign; what M47 places after a line goes right after it. */
export function CodeView({ forge, files, placed, thread, draft }: { forge: ForgeId; files: MrPageFile[]; placed: Placed; thread: (th: MrThread) => ReactNode; draft: (d: MrDraft) => ReactNode }) {
  const t = useT()
  return (
    <>
      {files.map((f) => {
        const gaps = gapsOf(f)
        return (
        <section key={f.path} className="mr-file" aria-label={f.path}>
          <h3 className="mr-file-h">
            {f.path}
            <span className="mr-file-n">{`+${f.added} −${f.removed}`}</span>
          </h3>
          {(placed.onFile.get(f.path) ?? []).map(thread)}
          {f.cut && <p className="f-note mr-file-note">{t('Demasiado grande para enseñarlo aquí: ábrela en {forge}', { forge: NAME[forge] })}</p>}
          {f.tooLarge && <p className="f-note mr-file-note">{t('GitLab no manda este archivo: es demasiado grande')}</p>}
          {f.lines.length > 0 && (
            <div className="mr-lines">
              {f.lines.map((l, i) => {
                const here = placed.onLine.get(key(f.path, i))
                return (
                  <Fragment key={i}>
                    <div className={`mr-ln ${l.kind}${gaps.has(i) ? ' gap' : ''}`}>
                      <span className="ln-o">{l.old ?? ''}</span>
                      <span className="ln-n">{l.new ?? ''}</span>
                      <span className="ln-c">{SIGN[l.kind]}</span>
                      <code>{l.text}</code>
                    </div>
                    {here?.threads.map(thread)}
                    {here?.drafts.map(draft)}
                  </Fragment>
                )
              })}
            </div>
          )}
        </section>
        )
      })}
    </>
  )
}
