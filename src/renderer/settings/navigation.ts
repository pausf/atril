import { createContext } from 'react'

export interface Navigation {
  openSettings(): void
}

export const NavigationContext = createContext<Navigation>({ openSettings: () => {} })
