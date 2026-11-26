// The one way a session drives a dev Atril over CDP (issue #13). A port can belong to ANOTHER Atril
// (the person's own), so nothing is read until a page proves it carries THIS launch's token:
//
//   const token = randomBytes(16).toString('hex')          // 16 to 128 chars of A-Za-z0-9_-
//   // start: ATRIL_CDP_PORT=<port> ATRIL_LAUNCH_TOKEN=<token> pnpm -s dev
//   const page = await attachVerified(connectOverCdp, port, token)
//
// Repeats src/main/cdp.ts's LAUNCH_QUERY on purpose (a .mjs cannot import the .ts); scripts/cdp-drive.test.ts keeps them equal.
import { URL } from 'node:url'

export const LAUNCH_QUERY = 'launch'

export async function connectOverCdp(endpoint) {
  const { chromium } = await import('playwright-core')
  return chromium.connectOverCDP(endpoint)
}

const carries = (url, token) => {
  try { return new URL(url).searchParams.get(LAUNCH_QUERY) === token } catch { return false }
}

/** @returns the single page whose URL carries `token`; otherwise closes the connection and throws, having called only `url()` on any page. */
export async function attachVerified(connect, port, token) {
  const browser = await connect(`http://127.0.0.1:${port}`)
  const ours = browser.contexts().flatMap((c) => c.pages()).filter((p) => carries(p.url(), token))
  if (ours.length === 1) return ours[0]
  await browser.close()
  throw new Error(ours.length ? `${ours.length} pages on port ${port} carry this launch's token; refusing to guess` : `no page on port ${port} carries this launch's token; another app may hold it`)
}
