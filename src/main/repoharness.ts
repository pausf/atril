import { lstat, open, readdir, realpath } from 'node:fs/promises'
import type { Stats } from 'node:fs'
import { join, sep } from 'node:path'
import type { HarnessItem } from '../preload/api'

const MAX_BYTES = 1024 * 1024
const MAX_SKILLS = 300
// npm's own placeholder: a package.json that still says this has no test script.
const NPM_TEST_STUB = 'echo "Error: no test specified" && exit 1'

type Found = { path: string; stat: Stats }

/**
 * The repo's files are untrusted input: lstat every segment, and follow a link only when
 * its real target stays inside the repo (W284). Anything missing, dangling or outside is absent.
 */
async function resolveIn(root: string, rel: string): Promise<Found | undefined> {
  try {
    const top = await realpath(root)
    let cur = top
    for (const seg of rel.split('/')) {
      cur = join(cur, seg)
      if ((await lstat(cur)).isSymbolicLink()) {
        cur = await realpath(cur)
        if (cur !== top && !cur.startsWith(top + sep)) return undefined
      }
    }
    return { path: cur, stat: await lstat(cur) }
  } catch {
    return undefined
  }
}

const fileIn = async (root: string, rel: string): Promise<Found | undefined> => {
  const f = await resolveIn(root, rel)
  return f?.stat.isFile() ? f : undefined
}
const dirIn = async (root: string, rel: string): Promise<Found | undefined> => {
  const f = await resolveIn(root, rel)
  return f?.stat.isDirectory() ? f : undefined
}

async function readText(file: Found): Promise<string | undefined> {
  if (file.stat.size > MAX_BYTES) return undefined
  try {
    const h = await open(file.path)
    try {
      return await h.readFile('utf8')
    } finally {
      await h.close()
    }
  } catch {
    return undefined
  }
}

type Json = { state: 'absent' } | { state: 'unreadable' } | { state: 'ok'; value: unknown }
async function readJson(root: string, rel: string): Promise<Json> {
  const file = await fileIn(root, rel)
  if (!file) return { state: 'absent' }
  const text = await readText(file)
  if (text === undefined) return { state: 'unreadable' }
  try {
    return { state: 'ok', value: JSON.parse(text) }
  } catch {
    return { state: 'unreadable' }
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** `scripts` of package.json, then of composer.json; a damaged or oversize file contributes nothing. */
async function scriptsOf(root: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  for (const name of ['package.json', 'composer.json']) {
    const json = await readJson(root, name)
    if (json.state === 'ok' && isObject(json.value) && isObject(json.value['scripts'])) out.push(json.value['scripts'])
  }
  return out
}

const gap = (id: HarnessItem['id'], group: HarnessItem['group']): HarnessItem => ({ id, group, ok: false })

async function memory(root: string): Promise<HarnessItem> {
  for (const name of ['CLAUDE.md', 'AGENTS.md']) {
    const file = await fileIn(root, name)
    if (!file) continue
    const base = { id: 'memory', group: 'context', ok: true, detail: name } as const
    if (file.stat.size > MAX_BYTES) return { ...base, big: true }
    const text = await readText(file)
    if (text === undefined) continue
    const lines = text === '' ? [] : text.split('\n')
    if (lines.at(-1) === '') lines.pop()
    return { ...base, n: lines.length }
  }
  return gap('memory', 'context')
}

async function skills(root: string): Promise<HarnessItem> {
  const dir = await dirIn(root, '.claude/skills')
  if (!dir) return gap('skills', 'context')
  const names = await readdir(dir.path).then(
    (all) => all.slice(0, MAX_SKILLS),
    () => []
  )
  const found = await Promise.all(names.map((name) => fileIn(root, `.claude/skills/${name}/SKILL.md`)))
  const n = found.filter(Boolean).length
  return n > 0 ? { id: 'skills', group: 'context', ok: true, n } : gap('skills', 'context')
}

function script(all: Record<string, unknown>[], id: 'lint' | 'typecheck' | 'test', names: string[]): HarnessItem {
  for (const scripts of all) {
    for (const name of names) {
      const cmd = scripts[name]
      if (typeof cmd !== 'string' || !cmd.trim()) continue
      if (id === 'test' && cmd.trim() === NPM_TEST_STUB) continue
      return { id, group: 'verification', ok: true, detail: name }
    }
  }
  return gap(id, 'verification')
}

/** W280–W284: what a repo already has of an agent harness, read from its files. No writes, no processes. */
export async function detectHarness(root: string): Promise<HarnessItem[]> {
  const [mem, skl, scripts] = await Promise.all([memory(root), skills(root), scriptsOf(root)])
  return [
    mem,
    skl,
    script(scripts, 'lint', ['lint']),
    script(scripts, 'typecheck', ['typecheck', 'type-check', 'tsc']),
    script(scripts, 'test', ['test'])
  ]
}
