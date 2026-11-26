import { Menu, type MenuItemConstructorOptions } from 'electron'
import type { AgentState, MenuAction } from '../preload/api'
import { t } from './lang'

export interface MenuDeps {
  selected: string | null
  count: number
  /** Trabajo or Tareas shown and something waiting (N2). */
  nextEnabled: boolean
  /** The window is in focus mode (W77). */
  focusOn: boolean
  /** Trabajo shown with a workspace selected: focus can be turned on (W77). */
  focusAvailable: boolean
  /** Trabajo shown with at least one workspace: «Todos» can be toggled (W81). */
  overviewAvailable: boolean
  /** Trabajo shown as «Uno» with a workspace selected: the code can be enlarged (F40). */
  bigAvailable?: boolean
  /** Main's state of the selected workspace: Pausar / Reanudar follow it (W88). */
  selectedState?: AgentState
  /** Pauses a working selected workspace or resumes a paused one (W86, W87). */
  togglePause?(): void
  send(action: MenuAction): void
}

/** Accelerators live here, not in the renderer: Electron handles them before xterm.js sees the key. */
export function menuTemplate(d: MenuDeps): MenuItemConstructorOptions[] {
  return [
    { role: 'appMenu' },
    { label: t('Edit'), submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    {
      label: t('Work'),
      submenu: [
        {
          label: d.selectedState === 'paused' ? t('Resume') : t('Pause'),
          accelerator: 'CmdOrCtrl+Shift+P',
          enabled: d.selectedState === 'paused' || d.selectedState === 'working',
          click: () => d.togglePause?.()
        },
        { label: t('Next'), accelerator: 'CmdOrCtrl+Return', enabled: d.nextEnabled, click: () => d.send({ kind: 'next' }) },
        { label: t('Focus mode'), accelerator: 'CmdOrCtrl+Shift+F', type: 'checkbox', checked: d.focusOn, enabled: d.focusOn || d.focusAvailable, click: () => d.send({ kind: 'focusMode' }) },
        { label: t('Enlarge code'), accelerator: 'CmdOrCtrl+Shift+E', enabled: d.bigAvailable === true, click: () => d.send({ kind: 'bigCode' }) },
        { label: t('All agents'), accelerator: 'CmdOrCtrl+Shift+A', enabled: d.overviewAvailable, click: () => d.send({ kind: 'overview' }) },
        { label: t('Back'), accelerator: 'CmdOrCtrl+Alt+Left', enabled: d.focusOn, click: () => d.send({ kind: 'back' }) },
        { label: t('Search…'), accelerator: 'CmdOrCtrl+K', click: () => d.send({ kind: 'palette' }) },
        { type: 'separator' },
        { label: t('Go to the sidebar'), accelerator: 'CmdOrCtrl+L', click: () => d.send({ kind: 'focus', target: 'sidebar' }) },
        { label: t('Go to the Libretto panel'), accelerator: 'CmdOrCtrl+J', click: () => d.send({ kind: 'focus', target: 'flow' }) },
        { type: 'separator' },
        ...Array.from({ length: 9 }, (_, i): MenuItemConstructorOptions => ({
          label: t('Work {n}', { n: i + 1 }),
          accelerator: `CmdOrCtrl+${i + 1}`,
          enabled: i < d.count,
          click: () => d.send({ kind: 'select', index: i })
        }))
      ]
    },
    { role: 'windowMenu' },
    { role: 'help', submenu: [{ label: t('Tutorial'), click: () => d.send({ kind: 'tutorial' }) }] }
  ]
}

export const installMenu = (d: MenuDeps): void => Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate(d)))
