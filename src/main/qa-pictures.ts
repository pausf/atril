import { createHash, randomBytes } from 'node:crypto'
import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { QaPictureReason, QaPictureRow, QaReport } from '../preload/api'
import { scrub } from './crash/report'
import { t } from './lang'
import { atrilHome } from './paths'
import { shotsDir } from './qa'
import type { Runner } from './run'

const MAX_BYTES = 5 * 1024 * 1024
const MAX_PICTURES = 20
const TOKEN_MS = 10 * 60_000
const OCR_MS = 15_000
const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const KEEP = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'])

/** W244: the PNG with its critical chunks only, so no text, EXIF, XMP or time chunk leaves. Throws on a broken file. */
export function cleanPng(buf: Buffer): Buffer {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIG)) throw new Error('not a png') // i18n-ignore
  const out: Buffer[] = [SIG]
  for (let at = 8; ; ) {
    if (at + 12 > buf.length) throw new Error('cut png') // i18n-ignore
    const len = buf.readUInt32BE(at)
    const type = buf.toString('ascii', at + 4, at + 8)
    const end = at + 12 + len
    if (end > buf.length || (at === 8 && type !== 'IHDR')) throw new Error('broken png') // i18n-ignore
    if (KEEP.has(type)) out.push(buf.subarray(at, end))
    if (type === 'IEND') return Buffer.concat(out)
    at = end
  }
}

const sha = (b: Buffer): string => createHash('sha256').update(b).digest('hex')

export interface Machine {
  home: string
  host: string
  user: string
}

const ORDER: QaPictureReason[] = ['token', 'email', 'host', 'path', 'machine']
const PLACEHOLDER: Array<[string, QaPictureReason]> = [
  ['<token>', 'token'],
  ['<key>', 'token'],
  ['<email>', 'email'],
  ['<url>', 'host'],
  ['<path>', 'path']
]
const word = (w: string): RegExp => new RegExp(`(?<![A-Za-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`, 'i')

/** W243: the first reason, in a fixed order, that any line or the joined lines give; null when the text is clean. */
export function leakOf(text: string, m: Machine): QaPictureReason | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  // OCR breaks a host across lines; only the joined text shows it whole.
  const variants = [...lines, lines.join(''), lines.join(' ')]
  const machine = [m.host, m.host.split('.')[0] ?? '', m.user].filter((w) => w.length >= 3).map(word)
  const found = new Set<QaPictureReason>()
  for (const raw of variants) {
    // The scrubber blanks quoted text; without the quotes it judges the words inside.
    const x = raw.replace(/["'«»“”‘’]/g, ' ') // i18n-ignore
    const out = scrub(x, m.home)
    for (const [mark, reason] of PLACEHOLDER) if (out.includes(mark) && !x.includes(mark)) found.add(reason)
    if (m.home.length > 1 && x.includes(m.home)) found.add('path')
    if (machine.some((re) => re.test(x))) found.add('machine')
  }
  return ORDER.find((r) => found.has(r)) ?? null
}

const OCR_JS = `ObjC.import('Vision')
function run(argv) {
  const req = $.VNRecognizeTextRequest.alloc.init
  req.recognitionLevel = 0
  req.usesLanguageCorrection = false
  const handler = $.VNImageRequestHandler.alloc.initWithURLOptions($.NSURL.fileURLWithPath(argv[0]), $({}))
  if (!handler.performRequestsError($([req]), Ref())) throw new Error('vision')
  const out = []
  const res = req.results
  for (let i = 0; i < res.count; i++) out.push(res.objectAtIndex(i).topCandidates(1).objectAtIndex(0).string.js)
  return out.join('\\n')
}
`

/** W243: the picture's text, read by macOS Vision on this Mac; null when it cannot be read in time. */
export async function ocrText(file: string, run: Runner): Promise<string | null> {
  const script = join(atrilHome(), 'ocr.js')
  await mkdir(atrilHome(), { recursive: true })
  await writeFile(script, OCR_JS)
  const r = await run('osascript', ['-l', 'JavaScript', script, file], { timeoutMs: OCR_MS })
  return r.code === 0 ? r.stdout.trim() : null
}

interface Picture {
  id: string
  view?: string
  name: string
  bytes: Buffer
  file: string
  source: string
}

interface Prepared<E> {
  id: string
  at: number
  pictures: Picture[]
  extra: E
}

export type Taken<E> = { pictures: Array<Omit<Picture, 'file' | 'source'>>; extra: E } | { error: string; fix: 'recheck' }

interface Deps extends Machine {
  ocr: (file: string) => Promise<string | null>
  now?: () => number
}

/** W241–W245: pick, clean and check the pictures, and keep exactly the previewed bytes under a token. */
export function createPictures<E = unknown>({ ocr, now = Date.now, ...machine }: Deps) {
  const prepared = new Map<string, Prepared<E>>()
  const changed = (): Taken<E> => ({ error: t('Las capturas han cambiado: revísalas otra vez'), fix: 'recheck' })

  async function check(file: string): Promise<{ reason: QaPictureReason } | { bytes: Buffer; source: string }> {
    const st = await lstat(file).catch(() => null)
    if (!st?.isFile()) return { reason: 'unreadable' }
    if (st.size > MAX_BYTES) return { reason: 'too-big' }
    const source = await readFile(file).catch(() => null)
    if (!source) return { reason: 'unreadable' }
    if (!source.subarray(0, 8).equals(SIG)) return { reason: 'not-png' }
    let bytes: Buffer
    try {
      bytes = cleanPng(source)
    } catch {
      return { reason: 'unreadable' }
    }
    // OCR reads Atril's own copy of the cleaned bytes, so what was read is what would be sent.
    const tmpDir = join(atrilHome(), 'tmp')
    await mkdir(tmpDir, { recursive: true })
    const copy = join(tmpDir, `${randomBytes(8).toString('hex')}.png`)
    try {
      await writeFile(copy, bytes)
      const text = await ocr(copy)
      if (text === null) return { reason: 'unreadable' }
      const reason = leakOf(text, machine)
      return reason ? { reason } : { bytes, source: sha(source) }
    } finally {
      await rm(copy, { force: true })
    }
  }

  return {
    async prepare(id: string, report: QaReport, extra: E): Promise<{ rows: QaPictureRow[]; token: string | null }> {
      const rows: QaPictureRow[] = []
      const pictures: Picture[] = []
      for (const c of report.criteria) {
        const entry = report.entries.find((e) => e.id === c.id)
        const step = entry?.steps.findLast((s) => s.shot)
        if (!entry || !step?.shot) continue
        const row: QaPictureRow = { id: c.id, status: entry.status, ...(step.view && { view: step.view }), verdict: 'blocked' }
        rows.push(row)
        if (rows.length > MAX_PICTURES) {
          row.reason = 'too-many'
          continue
        }
        // ponytail: one picture at a time, ~1.6 s each; 20 pictures is the ceiling that keeps this bearable.
        const file = join(shotsDir(id), step.shot)
        const got = await check(file)
        if ('reason' in got) {
          row.reason = got.reason
          continue
        }
        row.verdict = 'send'
        row.src = `data:image/png;base64,${got.bytes.toString('base64')}`
        pictures.push({ id: c.id, ...(step.view && { view: step.view }), name: `${sha(got.bytes).slice(0, 16)}.png`, bytes: got.bytes, file, source: got.source })
      }
      if (rows.length === 0) return { rows, token: null }
      const token = randomBytes(16).toString('hex')
      prepared.set(token, { id, at: now(), pictures, extra })
      return { rows, token }
    },

    async take(token: string, id: string): Promise<Taken<E>> {
      const p = prepared.get(token)
      if (!p || p.id !== id) return changed()
      if (now() - p.at > TOKEN_MS) {
        prepared.delete(token)
        return changed()
      }
      for (const pic of p.pictures) {
        const now = await readFile(pic.file).catch(() => null)
        if (!now || sha(now) !== pic.source) return changed()
      }
      return { pictures: p.pictures.map(({ id, view, name, bytes }) => ({ id, ...(view && { view }), name, bytes })), extra: p.extra }
    },

    /** A successful send ends the token; a failed one keeps it for the retry. */
    done(token: string): void {
      prepared.delete(token)
    }
  }
}
