import { Menu, type MenuItemConstructorOptions } from 'electron'
import type { MenuAction } from '../preload/api'
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
  split(direction: 'h' | 'v'): void
  send(action: MenuAction): void
}

/** Accelerators live here, not in the renderer: Electron handles them before xterm.js sees the key. */
export function menuTemplate(d: MenuDeps): MenuItemConstructorOptions[] {
  const none = d.selected === null
  return [
    { role: 'appMenu' },
    { label: t('Edición'), submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    {
      label: t('Trabajo'),
      submenu: [
        { label: t('Dividir a la derecha'), accelerator: 'CmdOrCtrl+D', enabled: !none, click: () => d.split('h') },
        { label: t('Dividir abajo'), accelerator: 'CmdOrCtrl+Shift+D', enabled: !none, click: () => d.split('v') },
        { label: t('Siguiente'), accelerator: 'CmdOrCtrl+Return', enabled: d.nextEnabled, click: () => d.send({ kind: 'next' }) },
        { label: t('Modo foco'), accelerator: 'CmdOrCtrl+Shift+F', type: 'checkbox', checked: d.focusOn, enabled: d.focusOn || d.focusAvailable, click: () => d.send({ kind: 'focusMode' }) },
        { label: t('Volver'), accelerator: 'CmdOrCtrl+Alt+Left', enabled: d.focusOn, click: () => d.send({ kind: 'back' }) },
        { label: t('Buscar…'), accelerator: 'CmdOrCtrl+K', click: () => d.send({ kind: 'palette' }) },
        { type: 'separator' },
        { label: t('Ir a la barra lateral'), accelerator: 'CmdOrCtrl+L', click: () => d.send({ kind: 'focus', target: 'sidebar' }) },
        { label: t('Ir al panel de Libretto'), accelerator: 'CmdOrCtrl+J', click: () => d.send({ kind: 'focus', target: 'flow' }) },
        { type: 'separator' },
        ...Array.from({ length: 9 }, (_, i): MenuItemConstructorOptions => ({
          label: t('Trabajo {n}', { n: i + 1 }),
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
