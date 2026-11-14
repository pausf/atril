import { FitAddon } from '@xterm/addon-fit'
import { Terminal as Xterm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TermAttach } from '../../preload/api'
import { useT } from '../ui'
import { Problem } from './Problem'

export function Terminal({ id }: { id: string }) {
  const t = useT()
  const host = useRef<HTMLDivElement>(null)
  const xterm = useRef<Xterm | null>(null)
  const [problem, setProblem] = useState<{ error: string; detail: string } | null>(null)
  // W161: an answer is painted only while this id is still the one shown.
  const shown = useRef(id)
  const attach = useCallback(
    (cols: number, rows: number) =>
      void window.atril.term.attach(id, cols, rows).then((r: TermAttach) => {
        if (shown.current === id) setProblem('error' in r ? r : null)
      }),
    [id]
  )

  useEffect(() => {
    const el = host.current
    if (!el) return
    shown.current = id
    const term = new Xterm({
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: 12.5,
      // W196: the terminal only shows; everything said to the agent goes through Atril.
      disableStdin: true,
      theme: { background: '#16161a', foreground: '#d1d1d6' }
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(el)
    fit.fit()
    xterm.current = term

    const off = window.atril.term.onData((wid, data) => {
      if (wid === id) term.write(data)
    })
    attach(term.cols, term.rows)

    const ro = new ResizeObserver(() => {
      fit.fit()
      window.atril.term.resize(id, term.cols, term.rows)
    })
    ro.observe(el)

    return () => {
      shown.current = ''
      xterm.current = null
      ro.disconnect()
      off()
      window.atril.term.detach(id)
      term.dispose()
    }
  }, [id, attach])

  return (
    <>
      {problem && (
        <div className="term-problem">
          <Problem
            what={problem.error}
            cant={t('Tu agente sigue en tmux: solo falla esta vista.')}
            fix={t('Volver a intentar')}
            onFix={() => xterm.current && attach(xterm.current.cols, xterm.current.rows)}
            detail={problem.detail}
          />
        </div>
      )}
      <div className="xterm-host" ref={host} />
    </>
  )
}
