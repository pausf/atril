import { FitAddon } from '@xterm/addon-fit'
import { Terminal as Xterm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef } from 'react'

export function Terminal({ id }: { id: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const term = new Xterm({
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: 12.5,
      cursorBlink: true,
      theme: { background: '#16161a', foreground: '#d1d1d6' }
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(el)
    fit.fit()

    const off = window.atril.term.onData((wid, data) => {
      if (wid === id) term.write(data)
    })
    const typed = term.onData((d) => window.atril.term.input(id, d))
    void window.atril.term.attach(id, term.cols, term.rows)
    term.focus()

    const ro = new ResizeObserver(() => {
      fit.fit()
      window.atril.term.resize(id, term.cols, term.rows)
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      typed.dispose()
      off()
      window.atril.term.detach(id)
      term.dispose()
    }
  }, [id])

  return <div className="xterm-host" ref={host} />
}
