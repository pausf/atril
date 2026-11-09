// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { mockApi, mockSystemTheme, workspace } from './mockApi'

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

const now = Math.floor(Date.now() / 1000)

describe('activity', () => {
  it('feed and row show the latest activity', async () => {
    const user = userEvent.setup()
    const api = mockApi({
      // Stopped workspaces: a live one would mount xterm, which jsdom cannot run.
      workspaces: [workspace('aaaaaaa1', 'PF-1', false), workspace('aaaaaaa2', 'PF-2', false)],
      activity: {
        aaaaaaa1: [
          { at: now - 5, kind: 'fail', text: '✗ vendor/bin/phpunit falló' },
          { at: now - 120, kind: 'edit', text: 'Editando ListOrders.php' },
          { at: now - 4000, kind: 'read', text: 'Leyendo Repository.php' }
        ],
        aaaaaaa2: [{ at: now - 30, kind: 'says', text: 'Claude dice: listo' }]
      }
    })
    render(createElement(App))
    await screen.findByText('PF-2')

    const rows = Array.from(document.querySelectorAll('.ws-row'))
    expect(rows.map((r) => r.querySelector('.ws-act')?.textContent)).toEqual(['✗ vendor/bin/phpunit falló', 'Claude dice: listo'])

    await user.click(rows[0] as HTMLElement)
    const first = screen.getByRole('tab', { name: 'Libretto' })
    const second = screen.getByRole('tab', { name: 'Actividad' })
    expect(first.getAttribute('aria-selected')).toBe('true')
    first.focus()
    await user.keyboard('{ArrowRight}')
    expect(second.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(second)

    const feed = within(await screen.findByRole('list', { name: /Actividad del agente/ }))
    const items = feed.getAllByRole('listitem')
    expect(items.map((li) => li.querySelector('.act-text')?.textContent)).toEqual([
      '✗ vendor/bin/phpunit falló',
      'Editando ListOrders.php',
      'Leyendo Repository.php'
    ])
    expect(items.map((li) => li.querySelector('.act-at')?.textContent)).toEqual(['ahora', 'hace 2 min', 'hace 1 h'])
    expect(items.map((li) => li.className)).toEqual(['act fail', 'act edit', 'act read'])

    await user.keyboard('{ArrowLeft}')
    expect(first.getAttribute('aria-selected')).toBe('true')

    // Live: a new line from main reaches the open feed and the row without a reload.
    await user.keyboard('{ArrowRight}')
    act(() =>
      api.pushActivity('aaaaaaa1', [
        { at: now, kind: 'says', text: 'Claude dice: tests en verde' },
        { at: now - 5, kind: 'fail', text: '✗ vendor/bin/phpunit falló' }
      ])
    )
    const live = within(await screen.findByRole('list', { name: /Actividad del agente/ }))
    expect(live.getAllByRole('listitem')[0]?.querySelector('.act-text')?.textContent).toBe('Claude dice: tests en verde')
    expect(document.querySelector('.ws-row .ws-act')?.textContent).toBe('Claude dice: tests en verde')
  })
})
