import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Theme, UiState } from '../preload/api'

interface UiContextValue {
  /** null until ui.json has been read. */
  ui: UiState | null
  setTheme(theme: Theme): void
  setFolded(id: string, folded: boolean): void
  markTutorialSeen(): void
}

const noop = (): void => {}
export const UiContext = createContext<UiContextValue>({
  ui: null,
  setTheme: noop,
  setFolded: noop,
  markTutorialSeen: noop
})

export const useUi = (): UiContextValue => useContext(UiContext)

const DARK = '(prefers-color-scheme: dark)'

/** The theme the page really wears: Automático asks the system. */
export function resolveTheme(theme: Theme, systemDark: boolean): 'light' | 'dark' {
  return theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [ui, setUi] = useState<UiState | null>(null)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.(DARK).matches ?? false)

  useEffect(() => {
    let live = true
    window.atril.ui.get().then((u) => live && setUi(u), () => undefined)
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia?.(DARK)
    if (!mq) return
    const on = (e: MediaQueryListEvent): void => setSystemDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const theme = ui?.theme ?? 'auto'
  useEffect(() => {
    document.documentElement.dataset['theme'] = resolveTheme(theme, systemDark)
  }, [theme, systemDark])

  const patch = useCallback((p: Partial<UiState>): void => {
    setUi((u) => (u ? { ...u, ...p, folded: { ...u.folded, ...p.folded } } : u))
    void window.atril.ui.set(p)
  }, [])

  const value = useMemo<UiContextValue>(
    () => ({
      ui,
      setTheme: (t) => patch({ theme: t }),
      setFolded: (id, folded) => patch({ folded: { [id]: folded } }),
      markTutorialSeen: () => patch({ tutorialSeen: true })
    }),
    [ui, patch]
  )
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

/** `defaultFolded` applies until the person clicks the title once. */
export function useFolded(id: string, defaultFolded: boolean): [boolean, () => void] {
  const { ui, setFolded } = useUi()
  const folded = ui?.folded[id] ?? defaultFolded
  return [folded, () => setFolded(id, !folded)]
}
