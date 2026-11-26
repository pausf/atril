import { useEffect, useRef, useState } from 'react'
import type { FlowBox } from '../../preload/api'
import { useT } from '../ui'
import { diffLines } from './DiffText'

interface Props {
  workspaceId: string
  box: FlowBox
  /** Counts the panel's answers: the live box's diff is asked again with each one. */
  tick: number
  /** The file that was chosen where it was enlarged from. */
  start?: string
  onClose: () => void
}

/** F39: a box's files and the chosen file's diff in the centre, in place of the terminal. */
export function BigCode({ workspaceId, box, tick, start, onClose }: Props) {
  const t = useT()
  const root = useRef<HTMLElement>(null)
  const files = box.files ?? []
  const [pick, setPick] = useState(start)
  const file = files.find((f) => f.path === pick)?.path ?? files[0]?.path
  const [shown, setShown] = useState<{ file: string; text: string } | null>(null)
  const live = box.state === 'current'

  useEffect(() => root.current?.focus(), [])
  // F40: Escape closes the view and goes no further, so the terminal never sees it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || document.querySelector('[aria-modal="true"]')) return
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const version = live ? tick : 0
  const asked = useRef('')
  useEffect(() => {
    if (!file) return
    const key = `${workspaceId}\0${box.index}\0${file}`
    asked.current = key
    void window.atril.flow.boxDiff(workspaceId, box.index, file).then((text) => asked.current === key && setShown({ file, text }))
  }, [workspaceId, box.index, file, version])

  const diff = shown && shown.file === file ? shown.text : null
  const lines = (diff ?? '').replace(/\n$/, '').split('\n')
  const chosen = files.find((f) => f.path === file)
  return (
    <section className="bigcode" role="region" aria-label={t('Enlarged code')} ref={root} tabIndex={-1}>
      <div className="edhead">
        <h3>{box.text}</h3>
        <span className="docchange">{file}</span>
        <span className="sp" />
        <button type="button" className="btn" onClick={onClose}>
          {t('Back to the terminal ⌘⇧E')}
        </button>
      </div>
      <div className="doc-editor">
        <nav className="outline" aria-label={t('Files')}>
          <span className="olh">{t('Files')}</span>
          {files.map((f) => (
            <button key={f.path} type="button" className={f.path === file ? 'on' : undefined} title={f.path} onClick={() => setPick(f.path)}>
              <span className={`fst ${f.status}`}>{f.status}</span> {f.path.split('/').pop()}
            </button>
          ))}
        </nav>
        <div className="edwrap">
          <div className="gutter" aria-hidden="true">
            {lines.map((_, i) => i + 1).join('\n')}
          </div>
          <div className="ed">
            <pre className="hl diffview" tabIndex={0} aria-label={t('Diff of {file}', { file: file ?? '' })}>
              {!file ? t('No code changes.') : diff === null ? t('Loading…') : diff === '' ? t('This file has no changes any more.') : diffLines(diff)}
            </pre>
          </div>
        </div>
      </div>
      <div className="edstatus">
        <span className="ro">{t('read only · what this box changed')}</span>
        {chosen && (
          <span>
            <span className="fa">+{chosen.added}</span> <span className="fd">−{chosen.removed}</span>
          </span>
        )}
        <span className="sp" />
        {live && <span>{t('live')}</span>}
      </div>
    </section>
  )
}
