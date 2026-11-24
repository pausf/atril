import type { PluginFailure } from '../../preload/api'
import { Problem } from '../components/Problem'
import { useT } from '../ui'

/** K34: a plugin or catalog failure; `missing` is Claude Code absent, with the doctor's fix, and nothing else offers its own. */
export function PluginProblem({ what, failure, fix, onFix, onClose }: { what: string; failure: PluginFailure; fix?: string; onFix?: () => void; onClose?: () => void }) {
  const t = useT()
  if (failure.code === 'missing') {
    return <Problem what={t('No encuentro Claude Code en este Mac.')} fix={t('Instalar Claude Code')} onFix={() => void window.atril.installTool('claude')} onClose={onClose} detail={failure.error} />
  }
  return <Problem what={what} fix={fix} onFix={onFix} onClose={onClose} detail={failure.error} />
}
