import { Menu, type MenuItemConstructorOptions } from 'electron'
import type { MenuAction } from '../preload/api'

export interface MenuDeps {
  selected: string | null
  count: number
  split(direction: 'h' | 'v'): void
  send(action: MenuAction): void
}

/** Accelerators live here, not in the renderer: Electron handles them before xterm.js sees the key. */
export function menuTemplate(d: MenuDeps): MenuItemConstructorOptions[] {
  const none = d.selected === null
  return [
    { role: 'appMenu' },
    { label: 'Edición', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    {
      label: 'Trabajo',
      submenu: [
        { label: 'Dividir a la derecha', accelerator: 'CmdOrCtrl+D', enabled: !none, click: () => d.split('h') },
        { label: 'Dividir abajo', accelerator: 'CmdOrCtrl+Shift+D', enabled: !none, click: () => d.split('v') },
        { type: 'separator' },
        { label: 'Ir a la barra lateral', accelerator: 'CmdOrCtrl+L', click: () => d.send({ kind: 'focus', target: 'sidebar' }) },
        { label: 'Ir al panel de Libretto', accelerator: 'CmdOrCtrl+J', click: () => d.send({ kind: 'focus', target: 'flow' }) },
        { type: 'separator' },
        ...Array.from({ length: 9 }, (_, i): MenuItemConstructorOptions => ({
          label: `Trabajo ${i + 1}`,
          accelerator: `CmdOrCtrl+${i + 1}`,
          enabled: i < d.count,
          click: () => d.send({ kind: 'select', index: i })
        }))
      ]
    },
    { role: 'windowMenu' }
  ]
}

export const installMenu = (d: MenuDeps): void => Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate(d)))
