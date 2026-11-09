// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentState, FlowDocs, FlowStage } from '../../preload/api'
import { App } from '../App'
import { mockApi, mockSystemTheme, workspace } from '../mockApi'

const PROPOSAL = '# add-x\n\n## Outcomes\n- a\n\n## Verification criteria\n- **X1** shall\n\n## Approach\nplan v1\n'
const docs = (proposal = PROPOSAL): FlowDocs => ({
  change: 'add-x',
  files: [
    { name: 'proposal.md', text: proposal, mtimeMs: 1 },
    { name: 'spec-other.md', text: '# other\n', mtimeMs: 1 }
  ]
})
const plan: FlowStage = { stage: 'plan', change: 'add-x', others: [] }

async function boot(o: { state?: AgentState; docs?: FlowDocs; flow?: FlowStage } = {}) {
  const api = mockApi({
    workspaces: [workspace('aaaaaaa1', 'PF-1', false)],
    states: { aaaaaaa1: o.state ?? 'needs-you' },
    flow: o.flow ?? plan,
    docs: o.docs ?? docs()
  })
  const user = userEvent.setup()
  render(createElement(App))
  await user.click(await screen.findByRole('button', { name: /^PF-1/ }))
  return { api, user }
}
const editor = (): HTMLTextAreaElement => screen.getByLabelText('Contenido del archivo') as HTMLTextAreaElement

beforeEach(() => mockSystemTheme(false))
afterEach(cleanup)

describe('flow documents', () => {
  it('stage opens what the agent wrote', async () => {
    const { user } = await boot()
    // Plan stage: Spec and Plan are reachable; Construir and the checklist are not yet.
    expect(screen.queryByRole('button', { name: /^Construir/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Ver checklist/ })).toBeNull()

    await user.click(await screen.findByRole('button', { name: /^Plan/ }))
    const dialog = await screen.findByRole('dialog', { name: /Plan/ })
    expect(within(dialog).queryByRole('tab', { name: /spec-other/ })).toBeNull()
    await vi.waitFor(() => expect(editor().value).toBe(PROPOSAL))
    await vi.waitFor(() => expect(editor().selectionStart).toBe(PROPOSAL.indexOf('## Approach')))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()

    // Spec: one tab per file, the cursor at the first section.
    await user.click(screen.getByRole('button', { name: /^Spec/ }))
    const spec = await screen.findByRole('dialog', { name: /Spec/ })
    await vi.waitFor(() => expect(editor().selectionStart).toBe(PROPOSAL.indexOf('## Outcomes')))
    await user.click(within(spec).getByRole('tab', { name: /spec-other\.md/ }))
    expect(editor().value).toBe('# other\n')
  })

  it('document view follows the file live', async () => {
    const { api, user } = await boot()
    await user.click(await screen.findByRole('button', { name: /^Plan/ }))
    await vi.waitFor(() => expect(editor().value).toBe(PROPOSAL))

    // The agent rewrites the plan; the stage does not change.
    vi.mocked(api.flowApi.docs).mockResolvedValue(docs(PROPOSAL.replace('plan v1', 'plan v2')))
    act(() => api.pushFlow('aaaaaaa1', plan))
    await vi.waitFor(() => expect(editor().value).toContain('plan v2'))

    // With unsaved edits, a write from the agent never replaces the person's text.
    await user.type(editor(), ' mío')
    vi.mocked(api.flowApi.docs).mockResolvedValue(docs(PROPOSAL.replace('plan v1', 'plan v3')))
    act(() => api.pushFlow('aaaaaaa1', plan))
    await new Promise((r) => setTimeout(r, 50))
    expect(editor().value).toContain('plan v2')
    expect(editor().value).toContain(' mío')
  })

  it('edit only while the agent waits', async () => {
    const working = await boot({ state: 'working' })
    await working.user.click(await screen.findByRole('button', { name: /^Plan/ }))
    await vi.waitFor(() => expect(editor().readOnly).toBe(true))
    expect(screen.getByText(/solo lectura · Claude está escribiendo/)).toBeTruthy()
    cleanup()

    const { api, user } = await boot({ state: 'needs-you' })
    await user.click(await screen.findByRole('button', { name: /^Plan/ }))
    await vi.waitFor(() => expect(editor().value).toBe(PROPOSAL))
    expect(editor().readOnly).toBe(false)
    await user.type(editor(), 'X')
    expect(screen.getByRole('tab', { name: /proposal\.md.*sin guardar/ })).toBeTruthy()

    // A refused save keeps the text and says why.
    vi.mocked(api.flowApi.save).mockResolvedValueOnce({ error: 'Claude ha cambiado el archivo mientras editabas: copia tu texto y vuelve a abrirlo' })
    await user.keyboard('{Meta>}s{/Meta}')
    expect(await screen.findByText(/Claude ha cambiado el archivo mientras editabas/)).toBeTruthy()
    expect(editor().value).toContain('X')

    await user.click(screen.getByRole('button', { name: /Guardar/ }))
    await vi.waitFor(() => expect(api.flowApi.save).toHaveBeenCalledTimes(2))
    expect(vi.mocked(api.flowApi.save).mock.calls.at(-1)).toEqual(['aaaaaaa1', 'add-x', 'proposal.md', editor().value, 1])
    await vi.waitFor(() => expect(screen.queryByRole('tab', { name: /sin guardar/ })).toBeNull())
  })

  it('markdown renders as text only', async () => {
    const hostile = '# t\n- <script>alert(1)</script>\n- **<img src=x onerror=alert(1)>**\n```\n<b>x</b>\n```\n## Approach\n'
    const { user } = await boot({ docs: docs(hostile) })
    await user.click(await screen.findByRole('button', { name: /^Plan/ }))
    const dialog = await screen.findByRole('dialog', { name: /Plan/ })
    await vi.waitFor(() => expect(dialog.textContent).toContain('<script>alert(1)</script>'))
    expect(dialog.querySelector('script, img, b')).toBeNull()
  })

  it('the modal holds the keyboard before its documents arrive', async () => {
    const { api, user } = await boot()
    vi.mocked(api.flowApi.docs).mockReturnValue(new Promise(() => undefined))
    await user.click(await screen.findByRole('button', { name: /^Plan/ }))
    const dialog = await screen.findByRole('dialog', { name: /Plan/ })
    expect(dialog.contains(document.activeElement)).toBe(true)
    // Tab never leaves the modal.
    for (let i = 0; i < 6; i++) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
