import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const tasksDir = join(here, 'tasks')
const copy = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'evals-f-'))
  cpSync(join(here, 'sample'), dir, { recursive: true })
  return dir
}
const nodeTest = (cwd: string) => spawnSync(process.execPath, ['--test'], { cwd, encoding: 'utf8' })

describe('evals fixtures', () => {
  it('the sample is green and every task starts red', () => {
    const base = nodeTest(copy())
    expect(base.status, base.stdout + base.stderr).toBe(0)

    const ids = existsSync(tasksDir) ? readdirSync(tasksDir) : []
    expect(ids.length).toBeGreaterThanOrEqual(3)
    for (const id of ids) {
      const task = JSON.parse(readFileSync(join(tasksDir, id, 'task.json'), 'utf8'))
      expect(task.prompt, id).toMatch(/\S/)
      expect(task.expect.files.length, id).toBeGreaterThan(0)
      const dir = copy()
      cpSync(join(tasksDir, id, 'acceptance.test.js'), join(dir, 'acceptance.test.js'))
      expect(nodeTest(dir).status, `${id} must fail on the baseline`).not.toBe(0)
    }
  })
})
