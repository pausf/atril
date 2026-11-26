#!/usr/bin/env node
// A stand-in for `claude -p` used by the tests: never calls a model. FAKE_MODE picks what it does.
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { setTimeout } from 'node:timers'

const mode = process.env.FAKE_MODE ?? 'solve'
const cwd = process.cwd()

if (process.argv[2] === '--version') {
  process.stdout.write('9.9.9 (Fake Claude)\n')
  process.exit(0)
}
if (process.env.FAKE_ARGV_FILE) writeFileSync(process.env.FAKE_ARGV_FILE, JSON.stringify({ argv: process.argv.slice(2), cwd }))

const out = (event) => process.stdout.write(JSON.stringify(event) + '\n')
const use = (name, input) => out({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } })
const git = (...args) => execFileSync('git', args, { cwd, stdio: 'ignore' })
const put = (file, text) => {
  mkdirSync(join(cwd, file, '..'), { recursive: true })
  writeFileSync(join(cwd, file), text)
  use('Write', { file_path: join(cwd, file) })
}

if (mode === 'hang') {
  const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore' })
  writeFileSync(process.env.FAKE_CHILD_FILE, String(child.pid))
  setTimeout(() => {}, 60000)
} else if (mode === 'fail') {
  process.exit(3)
} else {
  use('Skill', { skill: 'libretto:libretto-attacca' })
  put('test/coupon.test.js', "import assert from 'node:assert/strict'\nimport { test } from 'node:test'\nimport { applyCoupon } from '../src/coupon.js'\ntest('FIVE takes 500 off', () => assert.equal(applyCoupon(900, 'FIVE'), 400))\n")
  put(
    'src/coupon.js',
    "export function applyCoupon(total, code) {\n  if (code === 'SAVE10') return total - Math.round((total * 10) / 100)\n  if (code === 'FIVE') return Math.max(0, total - 500)\n  throw new Error(`unknown coupon: ${code}`)\n}\n"
  )
  const proposal = '# add-coupon\n\n- **C1** When FIVE is applied, the cart shall take 500 cents off.\n  Proof: test/coupon.test.js "FIVE takes 500 off"\n'
  if (mode === 'untracked') {
    mkdirSync(join(cwd, '.agents/changes/add-coupon'), { recursive: true })
    writeFileSync(join(cwd, '.agents/changes/add-coupon/proposal.md'), proposal)
  } else {
    // Landed and deleted: the criteria exist only in history.
    put('.agents/changes/add-coupon/proposal.md', proposal)
    git('add', '-A')
    git('commit', '-m', 'docs: add-coupon contract')
    git('rm', '-r', '-q', '.agents/changes/add-coupon')
    git('commit', '-m', 'docs: land add-coupon')
  }
  out({ type: 'result', total_cost_usd: 0.01, num_turns: 2, duration_ms: 5 })
}
