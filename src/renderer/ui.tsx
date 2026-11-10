import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Palette, Theme, UiState } from '../preload/api'
import { translate, type Lang, type LangChoice } from '../preload/i18n'

interface UiContextValue {
  /** null until ui.json has been read. */
  ui: UiState | null
  setTheme(theme: Theme): void
  setPalette(palette: Palette): void
  /** Main answers with the resolved language, which the window then speaks (W48). */
  setLanguage(language: LangChoice): void
  setFolded(id: string, folded: boolean): void
  markTutorialSeen(): void
}

const noop = (): void => {}
export const UiContext = createContext<UiContextValue>({
  ui: null,
  setTheme: noop,
  setPalette: noop,
  setLanguage: noop,
  setFolded: noop,
  markTutorialSeen: noop
})

export const useUi = (): UiContextValue => useContext(UiContext)

export type T = (es: string, vars?: Record<string, string | number>) => string

/** Atril's own texts in the language main resolved; Spanish until ui.json is read. */
export function useT(): T {
  const lang: Lang = useContext(UiContext).ui?.lang ?? 'es'
  return useCallback((es: string, vars?: Record<string, string | number>) => translate(lang, es, vars), [lang])
}

/** The locale dates and weekdays are written in. */
export const useLocale = (): string => (useContext(UiContext).ui?.lang === 'en' ? 'en-GB' : 'es-ES')

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

  const palette = ui?.palette ?? 'original'
  useEffect(() => {
    document.documentElement.dataset['palette'] = palette
  }, [palette])

  const patch = useCallback((p: Partial<UiState>): void => {
    setUi((u) => (u ? { ...u, ...p, folded: { ...u.folded, ...p.folded } } : u))
    void window.atril.ui.set(p)
  }, [])

  const value = useMemo<UiContextValue>(
    () => ({
      ui,
      setTheme: (t) => patch({ theme: t }),
      setPalette: (p) => {
        // Set in the click itself (W73), not after the re-render.
        document.documentElement.dataset['palette'] = p
        patch({ palette: p })
      },
      setLanguage: (language) => {
        setUi((u) => (u ? { ...u, language } : u))
        void window.atril.ui.set({ language }).then((next) => setUi((u) => (u ? { ...u, language: next.language, lang: next.lang } : next)))
      },
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
