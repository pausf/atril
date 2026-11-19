import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setLang } from './lang'
import { createRefiner } from './refine'
import type { RunOptions, RunResult, Runner } from './run'

const answer = (questions: unknown, extra: Record<string, unknown> = {}): RunResult => ({
  code: 0,
  stdout: JSON.stringify({ type: 'result', is_error: false, result: '', structured_output: { questions }, ...extra }),
  stderr: ''
})

function fakeClaude(reply: () => RunResult | Promise<RunResult> = () => answer(['¿Qué pantalla?'])) {
  const calls: Array<{ cmd: string; args: string[]; opts: RunOptions }> = []
  const run: Runner = async (cmd, args, opts = {}) => {
    calls.push({ cmd, args, opts })
    return reply()
  }
  return { run: vi.fn(run) as unknown as Runner, calls }
}

beforeEach(() => setLang('es'))
afterEach(() => setLang('es'))

describe('refine', () => {
  it('asks haiku once with the request on stdin and keeps well-formed questions', async () => {
    const REQUEST = 'Añadir filtro de laboratorios al listado'
    const long = 'x'.repeat(250)
    const { run, calls } = fakeClaude(() => answer([' ¿Qué listado?\n¿El de la web? ', '', '   ', '¿Qué listado? ¿El de la web?', long, '¿Uno?', '¿Dos?', '¿Tres?', '¿Cuatro?']))
    const refiner = createRefiner({ run })

    const r = await refiner.ask(`  ${REQUEST}\n `)
    expect(r).toEqual({ questions: ['¿Qué listado? ¿El de la web?', 'x'.repeat(200), '¿Uno?', '¿Dos?', '¿Tres?'] })

    expect(calls).toHaveLength(1)
    const { cmd, args, opts } = calls[0]!
    expect(cmd).toBe('claude')
    // The request goes on stdin only: never in argv, where `ps` would show it.
    expect(args.some((a) => a.includes('laboratorios'))).toBe(false)
    expect(args.slice(0, 10)).toEqual(['-p', '--model', 'haiku', '--output-format', 'json', '--tools', '', '--no-session-persistence', '--json-schema', args[9]])
    const schema = JSON.parse(args[9]!)
    expect(schema.properties.questions).toMatchObject({ type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } })
    expect(args).toHaveLength(11)
    expect(args[10]).toMatch(/Write the questions in Spanish\.$/)
    expect(opts).toMatchObject({ input: REQUEST, timeoutMs: 60_000, secret: true })

    setLang('en')
    await refiner.ask(REQUEST)
    expect(calls[1]!.args[10]).toMatch(/Write the questions in English\.$/)

    const bad = fakeClaude()
    const other = createRefiner({ run: bad.run })
    const refused = { error: 'There is no request to refine.', detail: 'argument', fix: 'retry' }
    for (const arg of [undefined, 42, '', '   ', 'a\0b', 'x'.repeat(2001)]) expect(await other.ask(arg)).toEqual(refused)
    setLang('es')
    expect(await other.ask(null)).toEqual({ error: 'No hay petición que afinar.', detail: 'argument', fix: 'retry' })
    expect(bad.calls).toHaveLength(0)
    expect(await other.ask(` ${'x'.repeat(2000)} `)).toHaveProperty('questions')
  })

  it('a failed ask says why and runs one at a time', async () => {
    const SECRET = 'salida-de-claude-que-no-se-enseña'
    const cases: Array<[RunResult, string, string]> = [
      [{ code: 124, stdout: SECRET, stderr: SECRET }, 'Claude no ha contestado a tiempo.', 'timeout'],
      [{ code: 127, stdout: '', stderr: SECRET }, 'No encuentro Claude Code en este Mac.', 'claude'],
      [{ code: 2, stdout: SECRET, stderr: SECRET }, 'Claude ha fallado.', 'exit 2'],
      [{ code: 0, stdout: `${SECRET} no json`, stderr: '' }, 'Claude no ha devuelto preguntas.', 'json'],
      [answer(['¿Qué?'], { is_error: true, result: SECRET }), 'Claude no ha devuelto preguntas.', 'is_error'],
      [{ code: 0, stdout: JSON.stringify({ is_error: false, result: SECRET }), stderr: '' }, 'Claude no ha devuelto preguntas.', 'schema'],
      [answer(SECRET), 'Claude no ha devuelto preguntas.', 'schema'],
      [answer(['  ', '\n', 7]), 'Claude no ha devuelto preguntas.', 'empty']
    ]
    for (const [result, error, detail] of cases) {
      const refiner = createRefiner({ run: fakeClaude(() => result).run })
      const r = await refiner.ask('Añadir filtro')
      expect(r).toEqual({ error, detail, fix: 'retry' })
      expect(JSON.stringify(r)).not.toContain(SECRET)
    }

    const thrown = createRefiner({ run: vi.fn(async () => Promise.reject(new Error(SECRET))) as unknown as Runner })
    const r = await thrown.ask('Añadir filtro')
    expect(r).toMatchObject({ error: 'Claude ha fallado.', fix: 'retry' })
    expect(JSON.stringify(r)).not.toContain(SECRET)

    let release: (r: RunResult) => void = () => undefined
    let n = 0
    const { run, calls } = fakeClaude(() => (++n === 1 ? new Promise<RunResult>((res) => (release = res)) : answer(['¿Otra?'])))
    const refiner = createRefiner({ run })
    const first = refiner.ask('Añadir filtro')
    expect(await refiner.ask('Otra cosa')).toEqual({ error: 'Ya está preguntando.', detail: 'busy', fix: 'retry' })
    expect(calls).toHaveLength(1)
    release(answer(['¿Qué?']))
    expect(await first).toEqual({ questions: ['¿Qué?'] })
    expect(await refiner.ask('Otra cosa')).toEqual({ questions: ['¿Otra?'] })
    expect(calls).toHaveLength(2)
  })
})
