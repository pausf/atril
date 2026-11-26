import type { MrThread } from '../../preload/api'
import { ago } from '../flow/ActivityFeed'
import { useT } from '../ui'

export interface ReplyState {
  text: string
  sending?: boolean
  error?: string
}

/** M21: one thread, its comments oldest first as plain text, and its reply box. */
/** `onLine`: it sits under the line it points at, so the forge's copy of that line is not repeated. */
export function Thread({ th, title, note, onLine, reply, onType, onSend }: { th: MrThread; title?: string; note?: string; onLine?: boolean; reply: ReplyState; onType: (text: string) => void; onSend: () => void }) {
  const t = useT()
  return (
    <article className={`mr-thread${th.yourTurn ? ' you' : ''}`} aria-labelledby={`th-${th.id}`}>
      <h4 id={`th-${th.id}`}>
        {title ?? (th.id === 'general' ? t('General') : th.line === undefined ? th.file : `${th.file}:${th.line}`)}
        {th.resolved !== undefined && <span className="tag">{th.resolved ? t('Resolved') : t('Unresolved')}</span>}
        {th.yourTurn && <span className="tag your-turn">{t('Your turn to reply')}</span>}
      </h4>
      {note && <p className="f-note">{note}</p>}
      {th.code && !onLine && <pre className="mr-code">{th.code}</pre>}
      {th.comments.map((cm) => (
        <div key={cm.id} className="mr-comment">
          <span className="who">{cm.author}</span> <span className="age">{ago(t, Date.parse(cm.at) / 1000, Date.now())}</span>
          <p>{cm.body}</p>
        </div>
      ))}
      <textarea aria-label={t('Reply')} rows={2} value={reply.text} onChange={(e) => onType(e.target.value)} />
      {reply.error && (
        <p className="mr-score-error" role="alert">
          {reply.error}
        </p>
      )}
      <button type="button" className="btn" onClick={onSend} disabled={!reply.text.trim() || reply.sending}>
        {t('Send')}
      </button>
    </article>
  )
}
