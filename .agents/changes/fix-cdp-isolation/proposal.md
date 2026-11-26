# fix-cdp-isolation

Tracker: none (GitHub issue pausf/atril#13, "An agent's real-app drive can attach to another Atril over CDP")
Kind: bug
Criteria: W320 and up
Targets: workspaces
Durable decisions: the two in Prior decisions below

## The ask (verbatim)

Fix dogfood issue #13 in pausf/atril (read it with gh): an agent's real-app drive attached over CDP to another, real Atril because the port was taken, and read real data. Make it impossible, not careful: a dev Atril with ATRIL_CDP_PORT set must fail loudly if the port is busy (never silently skip or share), and the snapshot/drive helpers must verify they talk to the instance they launched (e.g. a per-launch token on window) before reading anything.
FIRST: this work was created from a stale local checkout, so run git fetch origin and reset this branch onto origin/main before anything (it has no commits yet).
New criterion ids: W320 and up. Tests first; all in English. Open the PR against main and do not merge it.

## The report (issue #13, reporter's words)

While several works ran at once, one agent launched its dev Atril to take photos, but its CDP port was already taken by the Atril driving the works, so its Playwright script attached to that one and read the real person's data (the Skills screen with the real catalog). It noticed, deleted the photo before committing and switched to its own port. Make it impossible rather than careful: a dev Atril should refuse to start CDP on a busy port (fail loudly), and the snapshot/drive helpers should verify they are talking to the instance they launched (e.g. a per-launch token exposed on window) before reading anything.

- Observed: with `ATRIL_CDP_PORT` busy, `app.commandLine.appendSwitch('remote-debugging-port', …)` in `src/main/index.ts` is silently ignored by Chromium; the dev app starts anyway and `connectOverCDP` lands on whichever Atril owns the port.
- Expected: the second app refuses to start (loud), and a driver can prove it is attached to the app it launched.
- Seen before, three times, as prose lessons only: `add-pr-qa-pictures` · 6, `skills-dense` · real app, `repo-harness` · real app. Prose did not hold; this change moves it into code.

## Reading

A bug: something already built (a dev Atril opened for a drive) behaved wrong. The hole in the contract: nothing said the CDP port belongs to the instance that asked for it, so a busy port was silently shared. Three prose lessons never closed it; the criteria below do.

## Decision log

### Session 2026-11-26
- Q: where does the per-launch token live, on `window` or elsewhere? → A: in the URL the page loads (`?launch=<token>`), readable from `/json/list` before any page is read; no `window` global (assumed). If wrong: the driver would have to evaluate JS in a page it has not yet proved is its own, which is the bug.
- Q: who makes the token? → A: whoever runs `pnpm dev` (the drive session): it generates 16 to 128 characters of `A-Z a-z 0-9 _ -`, puts them in `ATRIL_LAUNCH_TOKEN` for Electron and gives the same value to `attachVerified`. Atril refuses to open CDP without it (assumed, from the cold review). If wrong: an app that invents its own token cannot be checked by a driver that was not told it. A drive that sets only `ATRIL_CDP_PORT` now dies at start, on purpose.
- Q: both ends compare the token how? → A: both parse the page URL with `URL` and compare the `launch` parameter for exact equality, never a text match (assumed, from the cold review: a token that is a prefix of another would pass a text match).
- Q: (approach fork) token proved from the URL by main and the driver, pre-probe of the port with `net`, or a `window` global read over CDP? → A: token in the URL, self-check by asking the port for a page that carries it (assumed). Lost: pre-probe (races Chromium's bind, and says nothing about which process answers); `window` global (the driver must run JS in a page before knowing it is its own).
- Q: (stop before code, asked by the cold review's finding 6) where does main's guard run: after the window loads (about 1 s after startup) or before the app's startup? → A: «Reordenar el guard antes de whenReady» (user, 2026-11-26): the guard runs before the rest of the startup. Mechanism chosen by the session (assumed): at the very start of the `whenReady` callback a hidden probe window loads `about:blank?launch=<token>`, main asks its own port for it, and only then continues. If wrong: the probe URL form may not survive Chromium; the real-app drive tells, and a `file:` URL replaces it.
- Q: do the criteria need a new capability? → A: no, `workspaces` already governs `src/main/**`; `Governs:` gains `scripts/cdp-drive.mjs` by a hand edit of `.agents/specs/workspaces/spec.md` in the landing commit, because `land.py` does not apply `Governs:` lines (assumed).

## Outcomes

- A dev Atril started with `ATRIL_CDP_PORT` either owns that port's debugger, proved by its own token, or exits non-zero with one line on stderr before its `whenReady` startup runs (no loginPath, no handlers, no window, no tools, no forge or agent work). It never starts on a port another process holds.
- A driver cannot read anything from an Atril it did not launch: it proves the page carries the token it handed to the launch before reading, and otherwise disconnects and throws.
- A packaged app ignores all of it.

## Scope boundaries

In:
- `src/main/cdp.ts` (new): config, token in URLs, verification of its own target, the guard with retries.
- `src/main/index.ts`: replaces the bare `appendSwitch` line, runs the gate first in `whenReady`, and loads the real window through the token.
- `scripts/cdp-drive.mjs` (new): the one way a session attaches over CDP (`attachVerified`).
- `CLAUDE.md` «Photos» line shows the launch with `ATRIL_CDP_PORT` and `ATRIL_LAUNCH_TOKEN` and the `attachVerified` call, within W235's cap; a lessons entry; the `Governs:` hand edit.

Out, named so it is not added quietly:
- The `ATRIL_SNAPSHOT` photo: taken in-process with `capturePage` of its own window, it cannot attach to another Atril. Unchanged; with `ATRIL_CDP_PORT` also set, the gate applies like to any dev start.
- Launching Electron from the helper, picking a free port, `lsof` checks: the gate makes a wrong port fatal, so choosing one is no longer a safety matter.
- A `window` global, authenticating the DevTools endpoint, anything outside dev builds.

Never scoped out: the gate and the driver check are a trust boundary (what a driver may read); an error line never carries the token.

## Constraints

- Electron cannot report that Chromium failed to bind `remote-debugging-port`: it only logs. Detection has to be by asking the port.
- `src/main` and `src/renderer` cannot import each other (W210); `src/main` takes no `homedir()` (W212). Dev-only stderr lines are English and need no UI text.
- Tests run with no Electron: logic is plain functions over injected `fetch`, `sleep`, `err` and `exit`, or over a real `node:http` server on port 0.
- Module-level code that runs before `whenReady` (secret store, crash hooks) still runs; they do no network or agent work before their gates.
- `pnpm build` is never run (W233).

## Prior decisions

- 2026-11-26 (assumed) The answers in the Decision log above, the placement of the guard (before the rest of `whenReady`) being the user's.
- Lessons `add-pr-qa-pictures` · 6, `skills-dense` · real app and `repo-harness` · real app each ended in «check the port with lsof». This change replaces that prose with code; the lessons stay as history.
- 2026-11-26 (assumed) A dev debugger port is trusted only after the instance proves, by a token the launcher chose, that the page behind it is its own; a busy port is fatal, never shared. Any future dev-only endpoint follows the same rule.
- Ceiling: the token proves «this page was loaded by the launch I made», not that nobody else on localhost can attach to the same debugger. Dev-only, loopback; Chromium's own endpoint stays unauthenticated.

## Task breakdown

- Pure module `src/main/cdp.ts`: `cdpConfig`, `withLaunch`, `verifyOwnTarget`, `guardCdp`, `LAUNCH_QUERY`.
- Gate and wiring in `src/main/index.ts`.
- `scripts/cdp-drive.mjs` with `attachVerified`.
- Hygiene: `CLAUDE.md`, lessons, `Governs:`.

## Verification criteria

- **W320** While the app is not packaged, `ATRIL_CDP_PORT` is a whole number from 1024 to 65535 and `ATRIL_LAUNCH_TOKEN` is 16 to 128 characters of `A-Z a-z 0-9 _ -`, `cdpConfig` shall answer `{ port, token }`.
  Proof: src/main/cdp.test.ts cdpConfig enables only in dev with a port and a token
- **W321** While the app is packaged, or `ATRIL_CDP_PORT` is unset or empty, `cdpConfig` shall answer nothing, whatever `ATRIL_LAUNCH_TOKEN` holds.
  Proof: src/main/cdp.test.ts cdpConfig answers nothing when packaged or without a port
- **W322** If `ATRIL_CDP_PORT` is set and not empty in a dev start and is not a whole number from 1024 to 65535, or `ATRIL_LAUNCH_TOKEN` is missing or not as W320 says, then `cdpConfig` shall answer an error that names the variable at fault and never contains the token.
  Proof: src/main/cdp.test.ts cdpConfig refuses a bad port or token without echoing the token
- **W323** When given a URL and a token, `withLaunch` shall answer that URL with the query parameter `launch` set to the token, keeping any other parameter, and shall answer the same value for a `file:` URL.
  Proof: src/main/cdp.test.ts withLaunch sets the launch parameter and keeps the rest
- **W324** When `/json/list` on `127.0.0.1:<port>` returns a page target whose `url`, parsed with `URL`, has the parameter `launch` equal to the token, `verifyOwnTarget(port, token)` shall answer true, whatever other targets it lists.
  Proof: src/main/cdp.test.ts verifyOwnTarget finds its own page on a real server
- **W325** If that list has no page with that exact parameter (another Atril's pages, a page whose token only starts with ours, a non-JSON body, an error status, or nothing answering), then `verifyOwnTarget` shall answer false.
  Proof: src/main/cdp.test.ts verifyOwnTarget refuses a port another Atril holds
- **W326** When `guardCdp` is given a `verify`, an attempt count, a delay and a `sleep`, it shall ask until `verify` answers true or the attempts are spent, printing nothing and not exiting on a true; if every attempt answers false, then it shall print one line on stderr naming the port and never the token, and call `exit(1)`.
  Proof: src/main/cdp.test.ts guardCdp retries then exits on a port another Atril holds
- **W327** When CDP is enabled, the first statement in `src/main/index.ts`'s `app.whenReady().then(async () => {` callback shall be `await cdpGate(`, so that the guard passes before `loginPath`, any handler or any window.
  Proof: src/main/cdp.test.ts index runs the cdp gate before any other startup
- **W328** If no page of any context of the browser has the parameter `launch` equal to the token, then `attachVerified(connect, port, token)` shall close the connection and throw an error that names the port, without calling `content`, `evaluate`, `title`, `screenshot` or any read other than `url()` on any page.
  Proof: scripts/cdp-drive.test.ts attachVerified refuses a browser that is not ours without reading it
- **W329** While the browser also holds pages of another Atril, `attachVerified` shall never return or read them and shall return the one page carrying the token; if two pages carry it, then it shall close the connection and throw.
  Proof: scripts/cdp-drive.test.ts attachVerified ignores the pages of another Atril
- **W330** The query name `scripts/cdp-drive.mjs` looks for shall equal `LAUNCH_QUERY` of `src/main/cdp.ts` (the script repeats it, because a `.mjs` cannot import the `.ts`), so that a rename in one breaks a test, not a drive.
  Proof: scripts/cdp-drive.test.ts attachVerified uses the query name main writes
- **W331** While the app has not yet created its first real window, closing the hidden probe of W327's gate shall not quit the app: `window-all-closed` quits only once `createWindow` has run. (Found by the real-app drive of box 1: destroying the probe, the only window, quit the app before the real window existed.)
  Proof: src/main/cdp.test.ts index keeps running when the probe closes before the first real window

## Approach

### Summary

Make the wrong attach impossible at both ends. Before anything else in startup, main opens a hidden probe page carrying the launcher's token and asks its own debugging port for it; a busy port answers with another app's pages, so the app exits 1 with one line. The driver helper refuses any browser whose pages do not carry the same token, before it reads one byte. The token travels in the loaded URL, so it is checkable from `/json/list` without evaluating anything.

### Technical context

TypeScript 5 on Electron main (`src/main/**`, built by electron-vite, never by this session), Node `fetch` and `node:http`, vitest 5 running `src/**` and `scripts/**` tests, `playwright-core` 1.64.1 already a dependency. Gates: `pnpm -s typecheck`, `pnpm -s lint` (W210, W212), `pnpm -s test`. Blast radius: two new files (`src/main/cdp.ts`, `scripts/cdp-drive.mjs`) with their two tests, one edited region of `src/main/index.ts` (the switch line, a `cdpGate` function, the first line of `whenReady`, `createWindow`'s load), `CLAUDE.md` (one line), `.agents/lessons.md`, one hand edit of `workspaces/spec.md`'s `Governs:`.

### The approach

`src/main/cdp.ts` exports `LAUNCH_QUERY = 'launch'` and:
- `cdpConfig({ packaged, env })` → `undefined` | `{ port, token }` | `{ error }` (W320–W322). Pure.
- `withLaunch(url, token)` sets `launch=<token>` through `URL` (W323); the real window loads `withLaunch(devUrl, token)`, or `loadFile(path, { query: { launch: token } })` when packaged-style files are loaded.
- `verifyOwnTarget(port, token, fetchFn = fetch)` → boolean: GET `http://127.0.0.1:<port>/json/list`, parse, true iff a `type: 'page'` target's `url`, parsed with `URL`, has `searchParams.get('launch') === token` (W324, W325). Any throw, non-200 or non-JSON is false.
- `guardCdp({ verify, attempts, delayMs, sleep, port, err, exit })`: asks `verify` up to `attempts` times with `sleep(delayMs)` between; on exhaustion writes `atril: ATRIL_CDP_PORT <port> is busy or not served by this app; refusing to start` and calls `exit(1)` (W326). The retry exists because the target list fills slightly after a page is created.

`src/main/index.ts`: `const CDP = app.isPackaged ? undefined : cdpConfig({ packaged: false, env: process.env })`. An error there is printed and `app.exit(1)` right away. A `{ port, token }` does `appendSwitch('remote-debugging-port', port)` as today. `async function cdpGate()` returns at once without CDP; with it, it opens a hidden `BrowserWindow` (`show: false`) on `about:blank?launch=<token>`, runs `guardCdp` with `verifyOwnTarget`, about 10 attempts at 150 ms, and closes the probe. `app.whenReady().then(async () => {` begins with `await cdpGate()` (W327, proved by reading the source text: a ceiling named below). `createWindow` loads through `withLaunch`.

`scripts/cdp-drive.mjs` exports `attachVerified(connect, port, token)`: `connect` defaults to `chromium.connectOverCDP`. It lists `browser.contexts().flatMap(c => c.pages())`, reads only `page.url()`, parses it, keeps pages whose `launch` equals the token, returns the single match, and otherwise `await browser.close()` then throws `no page on port <port> carries this launch's token; another app may hold it` (also for two matches). It never calls anything else on a non-matching page. It repeats `'launch'` and W330 compares it with main's constant.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Pre-probe the port with `net.createServer().listen` before `appendSwitch` | The switch must be set before `ready`, the probe is asynchronous, and the port can be taken between probe and Chromium's bind. It says nothing about who answers. |
| A `window.__atrilLaunch` global read by the driver | The driver would run JS in a page it has not yet proved is its own: the read the issue forbids. |
| Guard after the real window loads (first plan) | The app would run its startup, about a second of work, on a port it does not own. The user chose to move it before `whenReady`'s setup. |
| Create the real window first and verify it | The renderer would call IPC handlers that do not exist yet; the hidden probe avoids reordering the handlers. |
| `lsof` check in the helper | The careful path that already failed three times. |
| Random port chosen by Atril and reported back | Changes how every drive finds the app; the fatal check gives the same safety with no new protocol. |

### Risks

| Risk | What catches it |
|---|---|
| `about:blank?launch=…` loses its query in Chromium, so the healthy app kills itself | The real-app drive in box 1 starts a dev Atril on a free port and must see it stay up; if the probe URL fails, a `file:` URL replaces it (Decision log). |
| Target list not yet filled, so a healthy start dies | `guardCdp` retries; W326's test holds a verify that answers false twice and then true and a `sleep` spy. |
| `cdpGate` is not the first statement, so startup runs on a busy port | W327's test reads `index.ts`; the drive also checks a busy port exits 1 with no window. |
| The query name drifts between main and the script | W330. |
| A packaged build reads the variables | W321; `index.ts` passes `app.isPackaged`. |
| Another process serves a page with a guessable token | The token is 16 to 128 random characters per launch; ceiling in Prior decisions. |

### Validation and rollback

Tests first, red for the reason the bug exists: `verifyOwnTarget` against a real `node:http` server that lists a page without the token (or with a token that only starts with ours) must answer false, and `attachVerified` with a fake browser that holds only a foreign page must throw with the page spies never called and the `close` spy called once. The two fake-browser tests would pass for the wrong reason if the spies were not real; each is forced red once by making the helper call `evaluate` on a foreign page. W327 is forced red by moving the `await` one line down. The exit-1 behaviour is observed by running `pnpm -s dev` with `ATRIL_CDP_PORT` on a port a throwaway `node:http` server holds, reading the exit code and the stderr line. Rollback: one revert, nothing migrates.

### Complexity deliberately kept

The hidden probe window and `cdpGate` (about fifteen lines): without them the guard either runs after startup or needs the real window before its handlers exist. `ponytail: probe window so the guard runs before startup; a textual order test is the ceiling, a lint rule if it ever drifts`. The textual W327 test is a deliberate shortcut: it reads source, not behaviour, and a drive proves the behaviour.

## Checklist

- [x] `src/main/cdp.ts` (`cdpConfig`, `withLaunch`, `verifyOwnTarget`, `guardCdp`, `LAUNCH_QUERY`) with `src/main/cdp.test.ts` written first and seen red, wired in `src/main/index.ts` (switch, `cdpGate` first in `whenReady`, token in the window URL), and the real-app drive: a dev Atril on a port a throwaway server holds exits 1 with the one line and opens no window, and on a free port with a token starts and stays up · Closes: W320, W321, W322, W323, W324, W325, W326, W327, W331
- [ ] `scripts/cdp-drive.mjs` (`attachVerified`) with `scripts/cdp-drive.test.ts` written first and seen red, plus a forced-red run with an `evaluate` on a foreign page · waits on box 1 · Closes: W328, W329, W330
- [ ] Landing hygiene: `CLAUDE.md` «Photos» line shows the launch with the token and `attachVerified` and stays under the W235 cap, lessons entry, hand edit of `workspaces` `Governs:` to add `scripts/cdp-drive.mjs` (no criterion) · waits on boxes 1 and 2
