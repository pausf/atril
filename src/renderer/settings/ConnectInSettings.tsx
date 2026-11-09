import { useContext } from 'react'
import { useT } from '../ui'
import { NavigationContext } from './navigation'

export function ConnectInSettings({ service }: { service: string }) {
  const { openSettings } = useContext(NavigationContext)
  const t = useT()
  return (
    <>
      {t('Conecta {service} en', { service })}{' '}
      <button className="linklike" onClick={openSettings}>
        {t('Ajustes')}
      </button>
    </>
  )
}
