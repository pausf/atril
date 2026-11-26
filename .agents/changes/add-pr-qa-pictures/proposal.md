# add-pr-qa-pictures

Tracker: none
Targets: workspaces
Durable decisions: the five in Prior decisions below, plus the four ceilings

## Ask (verbatim)

> When Atril opens a PR/MR for a work («Push y abrir PR»), the PR body shows pictures so a reviewer can judge it by looking, without reading the code (idea from CodelyTV's "Agent Harness en 15 minutos"). Use what Atril already has: the live-QA report captures per criterion (Pasa/Falla/Sin probar with its screenshot), and where a capture of the same view exists on the base branch, a before/after pair. Images must render in the PR on GitHub and GitLab (decide how they are hosted: uploaded to the forge, or committed to a place that is not the work's branch history; justify the choice in the Decision log).
> Privacy is a hard rule: the repo may be public, so a picture must never carry a hostname, a home path, a token or real data; say how that is enforced, not hoped. No Claude calls to build the PR body. If there are no captures, the PR is opened as today.
> New criterion ids: use W240 and up (another work in parallel uses W217–W239). Tests first; drive it in the real app before landing; all in English.

## Reading

New behaviour, not a bug. Today the agent opens the PR itself (`gh pr create` / `glab mr create` in its pane, asked by W59), and the QA screen's «Publicar en la MR» (W170) posts a text-only comment ending «Las capturas están en Atril.». This change puts the captures themselves in front of the reviewer, in the PR description.

## Decision log

### Session 2026-11-26
- Q: Atril never opens the PR itself (the agent runs `gh pr create`); when do the pictures reach the PR body? → A: «No more questions» — taken: «Publicar en la MR» (W170) grows a preview sheet showing exactly the pictures that will go and the blocked ones with why; on «Send», main writes an Atril section into the PR description, replaced on each re-publish (assumed). If wrong (pictures should land with no press): drop W251's sheet and call publish when the work's MR first appears; privacy then rests on W243 alone.
- Q: where are the pictures hosted? → A: GitHub: an orphan branch `atril-qa` in the same repo, written through the Git Data API, each picture linked by its commit (`/blob/<commit>/qa/<name>.png?raw=true`); GitLab: the project uploads API (assumed). Why: GitHub has no public API to upload a PR attachment (the web's user-attachments endpoint is undocumented and session-bound), and an orphan branch shares no history with the work's branch, so the work's commits and diff never carry a binary; GitLab's uploads API is the native, documented attachment store and puts nothing in any git history. Committing to the work's branch was rejected because the ask forbids it and it would grow every clone. If wrong (no extra branch on GitHub wanted): GitHub falls back to the text comment.
- Q: how is privacy enforced, not hoped? → A: in main, before any byte leaves, five layers (assumed): (1) only validated QA step shots that are real PNGs, size-capped; (2) every PNG rebuilt with critical chunks only and named by its hash, so no metadata or file name leaves; (3) on-device OCR (macOS Vision through `osascript -l JavaScript`, no new dependency, measured 1.6 s per picture on this Mac) whose text is matched against the crash scrubber's rules plus this Mac's host name and user name, failing closed when OCR fails; (4) the section's text goes through the same scrubber; (5) the person sees every picture in the sheet before anything is sent, which is the only gate for real data that has no shape (a person's name). If wrong (a picture with text that OCR cannot read, e.g. tiny or stylised): layer 5 is what catches it.
- Q: what is «the same view on the base branch»? → A: a QA step may name its `view` (a short slug the QA agent writes); after a publish, main records each view's picture URL with the work's head commit; a later work's picture of the same view in the same repo shows as «After» next to the latest recorded «Before» whose commit is already in the PR's target branch (assumed; replaced at the stop: the recorded PR must be merged into the same target branch, see the last entry). If wrong (a baseline captured on demand from the base branch): that needs a QA run on the base branch, i.e. a Claude call, which the ask forbids.
- Q: (phase 5 fork) how is it built? → A: «No more questions» — taken: main owns the whole pipeline in two calls (`qa.preparePublish` → sheet → `qa.publish(id, token)`), OCR by a JXA script run through the existing `Runner`, PNG cleaned by a pure chunk filter (assumed). Rejected: a compiled Swift helper for OCR (a build step and a binary to sign, for the same Vision call); `nativeImage` re-encoding (needs Electron in the tests and re-compresses every picture, while the chunk filter is exact and pure); one IPC call that prepares and sends at once (no preview, so layer 5 would not exist). If wrong: the Swift helper replaces only `ocr()`.
- Q: does the W170 comment stay when pictures go in the description? → A: no: with at least one sendable picture the description section replaces the comment; with none, publish posts the W170 comment exactly as today (assumed).
- Q: (stop before code) the cold reader's ten findings? → A: «Apply fixes, build (Rec.)» (Pau, 26 Nov). Settled with it: prepare writes nothing to a forge but reads it; the sheet shows the cleaned bytes prepare kept, not W113's thumbnails; no shots → the comment posts with no sheet, all blocked → the sheet with «Publicar sin imágenes»; a token survives a failed send until it expires; «Antes» comes from a recorded PR the forge reports merged into the same target branch (squash merges break ancestry, mr spec); the block keeps W170's quoted failing note and drops «Las capturas están en Atril.»; the button is disabled while preparing and pictures are read one at a time; the first leak reason in a fixed order is shown; W114's step answer carries `view`.

## Outcomes

- A reviewer opening the work's PR on GitHub or GitLab sees, in its description, one block per criterion: Pasa/Falla/Sin probar, the criterion text, its screenshot, and a «Before» screenshot where one exists.
- Before anything is sent, the person sees in Atril exactly which pictures will go and which are blocked and why; nothing leaves without their press.
- A picture whose text shows a host name, an address, a home path, a token, an e-mail, or this Mac's name or user, never reaches the forge; neither does any PNG metadata or original file name.
- Publishing again replaces Atril's block in the description and leaves the rest of the description byte for byte.
- With no shots, «Publicar en la MR» does exactly what it does today, with no sheet; with every picture blocked, the sheet says why and «Publicar sin imágenes» does what it does today.
- No Claude process starts at any point of this.

## Scope boundaries

In:
- `src/main/qa-report.ts`: the optional `view` on a step (W240).
- `src/main/qa.ts`: the QA prompt asks for `view` (W240).
- New `src/main/qa-pictures.ts`: picking, PNG rebuild, OCR, leak check (W241–W245, W252).
- New `src/main/forge/qa-hosting.ts`: GitHub orphan-branch writes, GitLab uploads, description read and write (W246–W248). It lives under `src/main/forge/` but is not in `mr`'s `Governs:` list, so `workspaces` governs it.
- `src/main/qa-publish.ts`: prepare and send, the views ledger, the fallback (W249, W250).
- `src/main/paths.ts`: one exported `userHome()` (the lint rule allows `homedir()` only there).
- `src/main/index.ts`, `src/preload/api.ts`, `src/preload/index.ts`, `src/renderer/mockApi.ts`: the `qa.preparePublish` / `qa.publish(id, token)` channels.
- `src/renderer/qa/QaScreen.tsx` and its CSS: the preview sheet (W251).
- `src/preload/i18n-en.ts`: every new string.
- `bocetos/novedades.html`, `bocetos/fase1-nucleo.html` and a photo (outside git since 26 Nov).

Out (named so nobody adds them):
- Atril opening the PR itself, or editing the PR without the press.
- Any Claude call, including to describe pictures or detect «real data».
- Capturing a base-branch picture on demand (needs a QA run on the base branch).
- Blurring or redacting a blocked picture: it is blocked whole.
- JPEG or other formats: only PNG goes.
- Deleting old pictures from `atril-qa` or GitLab uploads.
- Pictures from more than the last shot of each criterion.

## Constraints

- Tokens stay in main; every forge request uses `forgeApi` with `redirect: 'error'` and a timeout, as `create.ts` does.
- Errors follow W150: what happened, what it stops, one fixing button; codes only in «Ver detalle».
- Every string through `t()` with its English entry; colours only as tokens.
- Lint: no `homedir()` outside `paths.ts`; renderer and main talk only through preload; `window.atril` only in `mockApi()`.
- Tests use a temporary `ATRIL_HOME`, a fake `fetch` and a fake runner; OCR is injected so tests never run `osascript`.
- macOS only (Atril is a Mac app); `osascript` and Vision ship with macOS.
- The description section is in the app's language, like W170's comment.

## Prior decisions

- W170/W174 stay: the MR is the work's own MR in Mías by repo and branch; the comment text is W170's (2026-11-11).
- Trigger is the press with a preview sheet, not automatic (2026-11-26, assumed; see Decision log).
- Hosting: GitHub orphan branch `atril-qa` via Git Data API; GitLab uploads API (2026-11-26, assumed; reasons in Decision log).
- Privacy is five layers, fail closed, person last (2026-11-26, assumed).
- Before/after comes from Atril's own ledger of published views whose commit is in the target branch (2026-11-26, assumed).
- Ceiling, OCR: Vision reads ordinary UI text; text it cannot read (tiny, rotated, stylised) is not checked by machine — the sheet is the gate for it.
- Ceiling, leak rules: the crash scrubber's rules are best effort (R1); a hit blocks the whole picture, so a false positive costs a picture, never a leak.
- Ceiling, description race: main reads the description again just before writing and refuses if it changed since the sheet was built; an edit landing in the second between that read and the write is lost. No forge offers a conditional write on the PR body.
- «Antes» comes from a recorded PR the forge reports merged into the same target branch, not from git ancestry: GitHub merges here squash (mr spec), and a squashed head is never an ancestor (2026-11-26, stop before code).
- Ceiling, «Antes» lookup: one forge read per candidate PR, newest first, stopping at the first merged one; at most 5 candidates are read per view.
- A prepare token survives a failed send until its 10 min expiry, so «Volver a intentar» resends the same bytes (2026-11-26, stop before code).

## Task breakdown

- `view` on a step, validated, and asked for in the QA prompt.
- Pick the pictures: the last shot of each criterion, PNG check, size and count caps.
- Rebuild a PNG with critical chunks only; hash name.
- OCR through `osascript` and the leak check, fail closed.
- Prepare: the preview answer and a token that pins the exact bytes.
- GitHub hosting on `atril-qa`; GitLab uploads.
- Description section: build, replace or append, race check, write.
- Views ledger and Before lookup.
- Fallback to the W170 comment.
- Preview sheet in the QA screen.
- Strings, photo, bocetos.

## Verification criteria

- **W240** When report.json gives a step a `view` matching `^[a-z0-9][a-z0-9-]{0,39}$`, main shall keep it on that step and answer it to the window with the step (amending W114's step shape); any other `view` shall be dropped and the step kept. The QA prompt shall ask the agent to name each screenshot's view with such a slug.
  Proof: src/main/qa-report.test.ts a step keeps only a slug view
- **W241** When the person presses «Publicar en la MR» and at least one criterion has a step with a shot, main shall answer a preview — one row per such criterion with its id, status, view, `send` or `blocked`, the block reason, and for a `send` row the cleaned bytes as a `data:image/png` URL — and a token, reading the pictures one at a time, without any write to a forge (reading the MR and its description is allowed) and without starting any `claude` process; if no criterion has a step with a shot, then it shall answer no rows and no token.
  Proof: src/main/qa-pictures.test.ts prepare previews without touching the forge or claude
  Proof: src/main/qa-publish.test.ts prepare reads the mr and writes nothing
- **W242** The picture of a criterion shall be the last step shot of that criterion; if it is not a PNG (signature), is over 5 MB, or comes after the first 20 pictures, then it shall be `blocked` with the reason «not-png», «too-big» or «too-many».
  Proof: src/main/qa-pictures.test.ts only the last png of each criterion goes, within caps
- **W243** For each remaining picture main shall read its text on-device (Vision through `osascript -l JavaScript`); if any line, the lines joined with nothing, or the lines joined with a space holds what the crash scrubber's rules replace (quotes excepted), the person's home path, this Mac's host name or the user name, then the picture shall be `blocked` with the first reason that applies in the order «token», «email», «host», «path», «machine»; if reading fails or takes over 15 s, then it shall be `blocked` with «unreadable».
  Proof: src/main/qa-pictures.test.ts a picture showing a host, path, token, email or the mac is blocked
- **W244** The bytes sent for a picture shall be its PNG rebuilt with only the IHDR, PLTE, tRNS, IDAT and IEND chunks, named by the first 16 hex characters of their SHA-256 and `.png`.
  Proof: src/main/qa-pictures.test.ts the sent png keeps critical chunks only and a hash name
- **W245** When the person presses «Send» in the sheet, main shall send exactly the pictures the token's preview marked `send`; if any of them changed on disk since, or the token is unknown, then it shall send nothing and answer «Las capturas han cambiado: revísalas otra vez» with the fix «Revisar otra vez» (prepare again). A token shall stay valid after a failed send and shall expire 10 minutes after prepare or on a successful send.
  Proof: src/main/qa-pictures.test.ts send refuses pictures that changed after the preview
- **W246** Where the MR is on GitHub, main shall write the pictures as one commit on the branch `atril-qa` of the MR's repo — with no parent when the branch does not exist, else on its tip — through the Git Data API, and link each as `https://github.com/{owner}/{repo}/blob/{commit}/qa/{name}?raw=true`; it shall never push to or write the work's branch.
  Proof: src/main/forge/qa-hosting.test.ts github pictures land on an orphan atril-qa branch
- **W247** Where the MR is on GitLab, main shall upload each picture with `POST /projects/:id/uploads` and link it by the answered `full_path` on the GitLab site.
  Proof: src/main/forge/qa-hosting.test.ts gitlab pictures go to project uploads
- **W248** After the pictures are hosted, main shall read the MR description again and, if it differs from the one read when preparing, then it shall write nothing and answer «La descripción de la MR ha cambiado: publica otra vez» with the fix «Revisar otra vez»; otherwise it shall write the description with the text between `<!-- atril-qa -->` and `<!-- /atril-qa -->` replaced by the new block (or the block appended after a blank line when there is none, or alone when the description is empty or null), every other byte unchanged; an opening marker with no closing one, or several blocks, shall be replaced from the first opening marker to the last closing marker (or to the end) by one block. The block holds W170's title line, then per criterion its status word, text, a failing criterion's quoted note as W170 has it, and its «Después» picture, plus «Antes» per W249; a criterion without a sendable picture appears as text only; there is no «Las capturas están en Atril.» line.
  Proof: src/main/forge/qa-hosting.test.ts the atril block is replaced and the rest kept
  Proof: src/main/forge/qa-hosting.test.ts a description changed since prepare is not written
- **W249** After a successful send, main shall record in `$ATRIL_HOME/qa-views/<repoId>.json` each sent picture's view, link, the MR URL and the time; a picture with a view shall get as «Antes» the link of the most recently recorded row of that view from another MR that the forge answers as merged into the same target branch as this MR (reading at most 5 candidates, newest first), and none when there is none.
  Proof: src/main/qa-publish.test.ts a view already in the target branch shows as before
- **W250** If no criterion has a step shot, then «Publicar en la MR» shall post the W170 comment unchanged with no sheet; if every picture is `blocked`, then «Publicar sin imágenes» shall post the W170 comment unchanged; in both cases nothing is written to the description, `atril-qa` or uploads.
  Proof: src/main/qa-publish.test.ts without sendable pictures the comment goes as today
- **W251** While main prepares, «Publicar en la MR» shall be disabled and read «Revisando las capturas…». The QA screen shall then show the preview as a sheet: each row with its criterion, the cleaned picture from W241 for a `send` row, «Se envía» or «No se envía: {reason in words}», and the button «Enviar {n} imágenes» («Enviar 1 imagen» for one, «Publicar sin imágenes» when n is 0), reachable by keyboard and closed by Escape without sending; a failed send shall show the W150 problem in the sheet with its own fix button, whose retry sends the same token again, or «Revisar otra vez» (prepare again) for W245/W248's answers.
  Proof: src/renderer/qa-publish.test.ts the sheet shows what goes and what is blocked before sending
- **W252** The criterion texts and failing criteria's quoted notes in the block shall go through the crash scrubber with the person's home before they are written.
  Proof: src/main/forge/qa-hosting.test.ts block text is scrubbed

## Approach

### Summary

«Publicar en la MR» becomes two steps. `preparePublish(id)` picks the last shot of each criterion, cleans and OCR-checks it in main, keeps the clean bytes in memory under a random token, and answers the preview. The sheet shows it. `publish(id, token)` hosts exactly those bytes (GitHub: one commit on orphan `atril-qa`; GitLab: uploads), rewrites Atril's block in the MR description, and records the views. With nothing sendable it posts W170's comment as today.

### Technical context

Electron main in TypeScript, Node's `fetch`, `node:crypto` for SHA-256 and the token, `node:os` `hostname()`. Vitest with a temporary `ATRIL_HOME`, injected `fetch`, injected `Runner` and injected `ocr`. Gates: `pnpm -s typecheck`, `pnpm -s lint`, `pnpm -s test`. Blast radius: two new main files and their tests, `qa-report.ts`, `qa.ts` (prompt line), `qa-publish.ts`, `paths.ts`, `index.ts`, preload `api.ts`/`index.ts`, `mockApi.ts`, `QaScreen.tsx` and its CSS, `i18n-en.ts` — about 14 files.

### The approach

- `qa-report.ts`: `validStep` keeps `view` when it matches the slug regex; `QaStep.view?: string`.
- `qa-pictures.ts` (pure where it can be):
  - `pick(report)` → per criterion the last step with a shot, in criterion order; `isPng` (8-byte signature), 5 MB and 20 caps → `blocked` reasons.
  - `cleanPng(buf)` walks chunks (length, type, data, CRC), keeps IHDR/PLTE/tRNS/IDAT/IEND, throws on a broken chunk (→ `unreadable`); `name = sha256(clean).slice(0,16) + '.png'`.
  - `ocr(file, run)` runs `osascript -l JavaScript <script> <file>` with a 15 s timeout; the JXA script ships as a string constant written once to `$ATRIL_HOME/ocr.js` (no resource packaging). Non-zero exit → `unreadable`.
  - `leak(text, home, host, user)` → reason or null: strip quote characters, then `scrub(x, home) !== x` decides; the reason comes from which placeholder appeared (`<token>`→token, `<email>`→email, `<url>`→host, `<path>`→path, `<key>`→token); `host`/`user` (case-insensitive, user ≥ 3 chars) → machine. Run on each line and on the lines joined with "" and with " ".
  - `prepare` stores `{ id, rows, bytes per criterion, sourceHash per shot, description, mr }` in a `Map<token, …>` with a 10 min life; `send` re-hashes each source file and compares before using the stored clean bytes.
- `forge/qa-hosting.ts`: from the MR URL derive owner/repo/number (GitHub) or project path/iid (GitLab). `readMr` → `{ description, targetBranch }`. GitHub host: `GET git/ref/heads/atril-qa` (404 → no parent), `POST git/blobs` (base64) per picture, `POST git/trees` (with `base_tree` when there is a parent), `POST git/commits`, then `PATCH git/refs/heads/atril-qa` or `POST git/refs`. GitLab host: multipart `POST projects/:id/uploads`, link `${site}${full_path}`. `block(...)` builds the markdown, `splice(description, block)` replaces between markers or appends. `writeDescription`: GitHub `PATCH pulls/:n {body}`, GitLab `PUT merge_requests/:iid {description}`.
- `qa-publish.ts`: `preparePublish` = `mrFor` + `qaReport` + `readMr` (reads only: the description snapshot and target branch) + pictures, read sequentially; `publish(id, token)` = W250 fallback when nothing sends, else host → re-read and compare → write → ledger. Before lookup: ledger rows of the same view from other MR URLs, newest first, at most 5, the first whose `readMr` answers merged with the same target branch (GitHub `merged_at` set and `base.ref`; GitLab `state: merged` and `target_branch`).
- Renderer: the publish button calls `preparePublish` (disabled, «Revisando las capturas…», while it runs); no rows → it calls the W170 comment path straight away; else the sheet lists rows with the cleaned `data:` picture prepare answered (never W113's thumbnails, which stop at 12 and 2 MB), status words, and the send button; Escape closes. The token goes back in `publish`; a failed send keeps the sheet's token for «Volver a intentar».

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Swift OCR helper binary | a build step and code signing for the same Vision call JXA already makes |
| `nativeImage` re-encode | Electron needed in tests; lossy re-compression; the chunk filter is exact |
| One call that prepares and sends | no preview, so the person never sees what leaves |
| GitHub: commit pictures to the work's branch | the ask forbids it; binaries in every clone and in the diff |
| GitHub: user-attachments upload | undocumented, needs a browser session, not a token |
| Pictures as a comment (W170 grown) | the ask names the PR body |
| Redacting the leaking area | needs text boxes and image editing; blocking is simpler and fails safe |

### Risks

| Risk | Mitigation |
|---|---|
| OCR misses text (tiny, stylised) | the sheet shows every picture before send (W251); stated as ceiling |
| Scrubber false positives block good pictures | the sheet says why; the person can retake; nothing leaks |
| GitHub token lacks `contents:write`, or a ruleset forbids `atril-qa` | the forge's refusal becomes a W150 problem; nothing half-written in the description (host first, description last) |
| Description edited by someone between read and write | re-read and compare (W248); second-wide window stated as ceiling |
| Pictures hosted but description write fails | orphan pictures stay on `atril-qa`/uploads unlinked; harmless, they passed the gate; publishing again reuses nothing but works |
| Private-repo images not rendering for viewers | blob `?raw=true` links render for anyone who can read the repo; unverified on a real private repo → added to the with-Pau list |
| Token in memory for a preview | expires 10 min after prepare or on a successful send; survives a failed send for the retry |
| Squash merges hide «Antes» under git ancestry | «Antes» is looked up by the recorded MR being merged per the forge, not by commits |

### Validation and rollback

New tests: `qa-pictures.test.ts`, `forge/qa-hosting.test.ts`, cases in `qa-report.test.ts`, `qa-publish.test.ts`, `renderer/qa-publish.test.ts`. Must be forced red on purpose: the leak test (comment out the scrub call → a host picture is sent), the race test (skip the re-read → it writes), the chunk test (keep tEXt → fails), the changed-file test (skip re-hash → sends). The real-app drive uses a seeded report with three PNGs (one showing `localhost:5173`) and a fake forge; OCR runs for real there. Rollback: one revert; `qa-views/*.json` and `ocr.js` in `ATRIL_HOME` are inert leftovers.

### Complexity deliberately kept

- The token map: it is what makes «exactly what you saw» true; without it a shot rewritten between sheet and send would leave unseen.
- Three OCR text variants (lines, joined, joined with spaces): OCR splits `pausf/shop-` / `web` across lines (seen on a real Atril screenshot), so a host can only be caught joined.
- Host first, description last, re-read between: ordering that keeps a failure from leaving the PR with broken image links.

## Checklist

- [x] a step's `view` validated in report.json and asked for in the QA prompt · Closes: W240
- [x] `qa-pictures.ts`: pick, PNG check and caps, chunk clean and hash name, OCR runner, leak check, prepare with token and send-time re-hash (OCR injected in tests; `userHome()` in `paths.ts`) · Closes: W242, W243, W244, W245
- [x] `forge/qa-hosting.ts`: read the MR (description, target branch), GitHub orphan `atril-qa` commit, GitLab uploads, block build with scrubbed text, splice, write · waits on box 2 · Closes: W246, W247, W248, W252
- [x] `qa-publish.ts` prepare/publish wired through main and preload: preview without forge or claude, fallback to the W170 comment, views ledger and Before by ancestry · waits on boxes 1–3 · Closes: W241, W249, W250
- [x] QA screen sheet: rows with thumbnail and reason, «Enviar {n} imágenes» / «Publicar sin imágenes», Escape, W150 problem, English strings · waits on box 4 · Closes: W251
- [ ] real-app drive with a seeded report (one PNG showing `localhost:5173`) and a fake forge; photo; novedades and fase1 bocetos · waits on box 5 · Closes: W241, W243, W251
