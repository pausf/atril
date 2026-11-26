import { Component, type ReactNode } from 'react'
import { Problem } from '../components/Problem'
import { useT } from '../ui'
import { fromError } from './window'

function Fallback({ detail, onReload }: { detail: string; onReload: () => void }) {
  const t = useT()
  return (
    <main className="ajustes">
      <Problem what={t('Something failed on this screen.')} fix={t('Reload')} onFix={onReload} detail={detail} />
    </main>
  )
}

/** crash R5: a render error goes to main and the screen offers a reload. A class: React has no other boundary. */
export class CrashBoundary extends Component<{ children: ReactNode; onReload?: () => void }, { failed: string | null }> {
  override state = { failed: null as string | null }

  static getDerivedStateFromError(e: unknown): { failed: string } {
    return { failed: fromError(e).message }
  }

  override componentDidCatch(e: unknown): void {
    try {
      window.atril.crash.report(fromError(e))
    } catch {
      // Reporting must never break the fallback.
    }
  }

  override render(): ReactNode {
    if (this.state.failed === null) return this.props.children
    return <Fallback detail={this.state.failed} onReload={this.props.onReload ?? (() => window.location.reload())} />
  }
}
