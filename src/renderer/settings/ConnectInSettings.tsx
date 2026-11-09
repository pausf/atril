import { useContext } from 'react'
import { NavigationContext } from './navigation'

export function ConnectInSettings({ service }: { service: string }) {
  const { openSettings } = useContext(NavigationContext)
  return (
    <>
      Conecta {service} en{' '}
      <button className="linklike" onClick={openSettings}>
        Ajustes
      </button>
    </>
  )
}
