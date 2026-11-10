import { createContext } from 'react'

export interface Navigation {
  openSettings(): void
  /** Trabajo with that workspace selected, re-listed first: it may have just been opened. */
  openWorkspace?(id: string): void
}

export const NavigationContext = createContext<Navigation>({ openSettings: () => {}, openWorkspace: () => {} })
