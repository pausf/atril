# add-repo-by-path

Tracker: pausf/atril#1
Targets: workspaces
Durable decisions: the nine in Prior decisions below

## The ask, verbatim

> Fix GitHub issue pausf/atril#1 (gh issue view 1 -R pausf/atril): in Settings a repo can only be added through the macOS folder picker. Add a way to type or paste a path (with ~ expanded) and validate it is a git repo, with the error rules from CLAUDE.md. Use criterion ids W440+. Drive it in the real app with a temp ATRIL_HOME, never Pau real repos. Run it through the Libretto flow, open a PR against main and do not merge it. (Pau, 27 Nov 2026)

Issue #1, «Settings: a repo can only be added through the macOS folder picker», in its own words:

> **What happens:** Settings → Repos → «＋ Añadir repo…» opens the native macOS folder picker and nothing else. There is no way to type or paste a path.
> **Why it matters:** people who keep repos in hidden or deep folders, or who already have the path copied, must click through Finder. It also makes the screen impossible to drive from tests or automation (the native dialog is outside the window).
> **Expected:** a path field beside the button (with validation that it is a git repo), or drag-and-drop of a folder onto the Repos card; the picker stays as an option.
> **Where:** `src/main/index.ts` (`atril:repos:add` only calls `dialog.showOpenDialog`), `src/renderer/settings/Repos.tsx`.

## The reading

Not a bug: a capability that was never built (the picker was the whole design, S11–S13). The issue offers a path field **or** drag-and-drop; the invocation asks for the field. `origin/main` was fetched and the issue still holds: `atril:repos:add` is the only way in.

## Decision log

### Session 2026-11-27
- Q: path field or drag-and-drop onto the card? → A: the path field, as the invocation says «type or paste a path»; drag-and-drop is out (assumed: the issue says «or», and a drop needs `webUtils.getPathForFile` in preload, a second path through the trust boundary; if wrong, a drop handler calls the same `atril:repos:addPath`).
- Q: which `~` forms expand? → A: `~` alone and `~/…`, to the person's own home; `~name/…` is not expanded and is refused as not absolute (assumed: resolving another user's home needs the user database and nobody asked; if wrong, expand it in main only).
- Q: a path inside a repo, not at its root? → A: registers the git top level, exactly as the picker does through `registerRepo` (assumed: one rule for both ways in).
- Q: an already registered folder? → A: no error, the existing repo comes back, as the picker does today (assumed).
- Q: does the picker's own bare «not a git repository» line (S13) become a `Problem` too? → A: no, out of this change; S13 stays as it is (assumed: the invocation scopes the error rules to the new path; if wrong, amend S13 and the picker branch of `settle`).
- Q: whose is the home when a test runs? → A: main reads it through `userHome()` (the one place allowed to, W210/W212); main tests give it their own `HOME` (assumed: lesson «a check that reads the user's home needs the test to own that home»).
- Q: which approach (the fork)? → A: a new `atril:repos:addPath` and `addRepoByPath` in main, ending in `registerRepo` (assumed, the recommended one: it keeps «the window sends text, main decides» and reuses every registering rule; if wrong, nothing user-visible changes, only where the check sits). Rejected: overloading `atril:repos:add` with an optional path (the handler is «main opens the picker», W158, and one channel would then mean two things); validating in the window and sending a «checked» path to `addWithId` (the window must never decide what is a folder, and `~` needs main's home).
- Q: (cold review, run as the author) W440 against W441 for blank text? → A: W441's check runs first and W440 is scoped to what it lets through (acted on).
- Q: (cold review) `detail` when there is no text, or a NUL byte? → A: empty for that first sentence, in both cases (acted on; if wrong, show the text for NUL).
- Q: (cold review) is «There is no folder» also for an unreadable folder? → A: yes, any `stat` failure: the message names the path and Atril cannot add what it cannot examine (acted on, assumed).
- Q: (cold review) what do `StateProblem` and `not-a-git-repo` from `registerRepo` do in W443? → A: come back unchanged with `path`; the card shows the S33 problem for the first (W447) (acted on).
- Q: (cold review) what is `path` for a subfolder? → A: the typed text resolved, never the top level (acted on).
- Q: (cold review) does the field empty after the id prompt? → A: yes, whenever a repo is registered by either route (acted on).
- Q: (cold review) do field and button stay while the id prompt or the picker error shows, and do the two messages coexist? → A: they stay; starting an add by either route clears the other's message (acted on, assumed; if wrong, only the card changes).
- Q: (cold review) the «Choose a folder…» label and a failing git install? → A: the label lives in the card, `fixLabel` is left alone; the install's answer is ignored as `sharedFix` does everywhere (acted on, assumed; if wrong, the card shows a second `Problem`).
- Q: (cold review) which box owns the mock default and the Spanish entries, and what closes box 3? → A: box 1 owns the default and main's keys, box 2 the override and the card's keys; box 3 closes no criterion and passes only on its listed observations (acted on).
- Q: (the stop before code) → A: answered by the invocation (`/libretto-attacca`): the document is written, cold-reviewed, committed and carried into phase 6; the run acted on every finding above and rejected none. The reviewer also noted the box-1 tests already existed, written red while it read; they were written against the contract before its report and adjusted where it asked.
- Q: (while building box 2) the existing test «adding a repo asks for a free id» looked for the only `textbox` in the card, and the new field makes two. → A: its selector now names the id prompt by its label («Ya hay otro repo con ese nombre. Elige otro id.»); the assertions are untouched (S12 stays proved as it was).
- Q: (while building box 2) `settings.test.ts` «saved token cannot be seen again» counts every `input` in Ajustes except `#jira-board`; the Repos card now has one. → A: the path field gets `id="repo-path"` and the test's selector excludes it too (`input:not(#jira-board):not(#repo-path)`); its intent — no credential field is left once the token is saved — and its other assertions are unchanged.
- Q: criterion ids? → A: W440 onward in both specs, the card's too, as the invocation says; no `S` ids (Pau).
- Q: `bocetos/novedades.html`, `bocetos/fase1-nucleo.html` and a photo? → A: not in this change: `bocetos/` is local-only and absent from this worktree (assumed: CLAUDE.md says it lives on Pau's disk; the real-app drive is still done and reported; if wrong, Pau adds the section from the drive's screenshot).
- Q: a tour step (W23) for the new field? → A: none: the field lives inside the Repos card that the `repos` step already points at, and no rail screen or primary control is added (assumed; if wrong, W23's proof lists the target).

## Outcomes

In Ajustes → Repos the person can type or paste a folder's path (a leading `~` meaning their home), press «Add this path» or Enter, and get the repo registered exactly as if the picker had returned that folder. A path that cannot be added says what happened, that nothing was added, and offers one button that fixes it, with the technical detail folded; nothing is written to `repos.json` on a refusal. The picker stays.

## Scope boundaries

**In:** `addRepoByPath` and the path expansion in `src/main/repos.ts`; the handler `atril:repos:addPath` in `src/main/index.ts`; `repos.addPath` and the `PathProblem` type in `src/preload/{api,index}.ts`; the field, the button and the problem in `src/renderer/settings/Repos.tsx`; `repos.addPath` in `src/renderer/mockApi.ts`; the Spanish entries in `src/preload/i18n-es.ts`; the tests; this change's criteria.
**Out (named):** drag-and-drop; `~name` expansion; changing the picker's own error line (S13); changing «Find the folder…» (relocate); relative paths resolved against some working directory; autocompletion of the path; the `bocetos/` pages and a photo of them; a tour step.

**Never scoped out:** the path crosses the IPC boundary as an untrusted value (a non-string, empty text and a NUL byte are refused in main, before any git or file write); a refusal changes nothing on disk; the field is a native `<input>` with a label and the button a native `<button>`, so both are keyboard-reachable.

## Constraints

- Main reads the home only through `userHome()` (`paths.ts`); `pnpm lint` forbids `homedir()` elsewhere (W210/W212).
- The window and main talk through preload only; the window sends the typed text and nothing else (W158's rule: it never decides what is a folder).
- Texts go through `t()`/`useT()`, the key is the English text, its Spanish entry lives in `src/preload/i18n-es.ts` (S16/S19 scan for it).
- Errors follow the rule in CLAUDE.md: what happened, what Atril can't do because of it, one button that fixes it, the code only under «Show detail» (`Problem`).
- No new dependency, no Claude call; tests use a temp `ATRIL_HOME` and a temp `HOME`, never the person's repos.
- `repos.json` is written only through `registerRepo` (atomic, W148 refuses to overwrite a damaged file).

## Prior decisions

- (2026-11-27, add-repo-by-path) The typed path ends in `registerRepo`: same git top level, same id derivation, same `id-taken` and `invalid-id` answers as the picker. Nothing about registering is duplicated.
- (2026-11-27, add-repo-by-path) Path field, not drag-and-drop (assumed). If wrong: a drop handler sends the dropped path to the same `atril:repos:addPath`; nothing in main changes.
- (2026-11-27, add-repo-by-path) Only `~` and `~/…` expand (assumed). If wrong: `~name` is added in `expandPath` only.
- (2026-11-27, add-repo-by-path) A subfolder registers its git top level; an already registered folder returns the existing repo (assumed). If wrong: refuse in `addRepoByPath` before `registerRepo`.
- (2026-11-27, add-repo-by-path) The picker's S13 line stays as it is (assumed). If wrong: amend S13 and give `settle`'s picker branch the same `Problem`.
- (2026-11-27, add-repo-by-path) `bocetos/` and the tour are untouched (assumed, see the decision log).
- (2026-11-27, add-repo-by-path) The window shows nothing for a failed git install started from the card's fix, as `sharedFix` does elsewhere (assumed). If wrong: show a second `Problem` from `installTool`'s `{ error }`.
- (2026-11-27, add-repo-by-path) Starting an add by one route clears the other route's message; field and button stay visible while the id prompt shows (assumed). If wrong: only `Repos.tsx` changes.
- (2026-11-27, add-repo-by-path) ponytail: one extra `git rev-parse` per typed path (about 125 ms on Pau's Mac) so the refusal can carry git's own stderr, instead of widening `registerRepo`'s answer; ceiling: if a second caller wants git's stderr, move it into `registerRepo`.

## Task breakdown

- Expand and validate a typed path in main, ending in `registerRepo`, with its own refusals.
- Expose it through IPC and preload with a typed `PathProblem`.
- The Repos card: field, button, the problem, the id prompt for a taken id.
- Spanish entries, mock, and a drive in the real app with a temp `ATRIL_HOME` and a temp `HOME`.

## Verification criteria

- **W440** When main is asked to add a repo by text that W441's first check lets through (a string, not blank, no NUL byte), it shall trim the text, expand a leading `~` alone or `~/` to the person's home, and refuse any text that is still not an absolute path (a relative path and `~name/…` included) with «{text} is not a full path: start it with / or ~/.», `fix: 'pick'` and the text as `detail`, before running git or writing anything. One test holds every clause.
  Proof: src/main/repos.test.ts "a typed path is trimmed, ~ expanded and anything not absolute refused"
- **W441** This check runs first, before W440's. If the text is not a string, is empty after trimming or holds a NUL byte, then main shall refuse with «Type the path of a folder first.» and `detail: ''`; if the resolved path does not exist or cannot be examined (any `stat` failure, a path through a file and an unreadable parent included), with «There is no folder at {path}.»; if it is a file, with «{path} is a file, not a folder.»; each answer shall be `{ error: 'bad-path', what, detail, fix: 'pick' }` with the resolved path as `detail` (except the first, whose `detail` is empty), shall run no git command and shall leave `repos.json` as it was. One test holds every clause.
  Proof: src/main/repos.test.ts "a typed path that is not a folder is refused before git and writes nothing"
- **W442** If `git -C <path> rev-parse --show-toplevel` fails with «not a git repository» in its stderr, then main shall refuse with «{path} is not a git repository.» and `fix: 'pick'`; if it exits 127 or has «xcode-select» in its stderr, with «git does not work on this Mac.» and `fix: 'git'`; for any other failure, with «git could not read {path}.» and `fix: 'pick'`; each with git's stderr as `detail`, and none shall write `repos.json`. One test holds every clause.
  Proof: src/main/repos.test.ts "a typed folder git cannot read is refused with its own fix and writes nothing"
- **W443** When the typed path is a folder inside a git repository, main shall register that repository's top level through `registerRepo` and answer its result unchanged with `path` added, `path` being the typed text resolved (`path.resolve` of the expanded text — for a subfolder the subfolder, never the top level); an already registered top level shall come back as that repo with nothing written, a taken or invalid id as `registerRepo`'s own `id-taken` or `invalid-id`, and any other answer of `registerRepo` (`not-a-git-repo`, a `StateProblem` for a damaged `repos.json`) as it is. One test holds every clause except the damaged file, which W447 proves from the window.
  Proof: src/main/repos.test.ts "a typed path registers the git top level like the picker does"

## Approach

### Summary
One new main function, `addRepoByPath(raw, run)`, turns the typed text into an absolute folder, checks it is a directory and that git reads it, and then hands it to the existing `registerRepo`. A new IPC `atril:repos:addPath` and `repos.addPath` carry it; the Repos card gets a field and a button and shows a refusal as a `Problem`.

### Technical context
Electron + TypeScript + React 19, pnpm, vitest (node tests with real git in temp dirs and a temp `ATRIL_HOME`; jsdom tests with `mockApi`). `src/main/repos.ts` already holds `registerRepo` (git top level, id rules, atomic write, `orProblem` for a damaged file) and the `Runner` is injected. `paths.ts` has `userHome()`; ESLint bans `homedir()` elsewhere. `Problem` and `fixLabel` live in `src/renderer/components/Problem.tsx`. Gates: `pnpm -s typecheck`, `lint`, `test`. Radius: about 9 files — `repos.ts`, `index.ts`, `preload/api.ts`, `preload/index.ts`, `Repos.tsx`, `mockApi.ts`, `i18n-es.ts`, the two test files — plus the specs at landing.

### The approach
- `src/main/repos.ts`: `export interface PathProblem { error: 'bad-path'; what: string; detail: string; fix: 'pick' | 'git' }` (declared in `preload/api.ts`, imported here as the other result types are); `expandPath(text)` trims and maps `~` / `~/x` onto `userHome()`; `addRepoByPath(raw: unknown, run)` in this order: not a string / blank / contains `\0` → problem; not absolute after expansion → problem (W440); `path.resolve` to normalise `..` and a trailing slash; `fs.stat` — a throw → «There is no folder at {path}.», not a directory → «{path} is a file, not a folder.» (W441); `run('git', ['-C', path, 'rev-parse', '--show-toplevel'])` non-zero → classify by `gitBroken` (W156's own test), then «not a git repository» in stderr, else the generic sentence (W442); success → `{ ...(await registerRepo(path, run)), path }` (W443). `what` goes through main's `t()`.
- `src/main/index.ts`: `ipcMain.handle('atril:repos:addPath', (_e, text: unknown) => addRepoByPath(text, run))`.
- `src/preload/api.ts` + `index.ts`: `PathProblem` type and `repos.addPath(text: string): Promise<(AddRepoResult & { path: string }) | PathProblem>`.
- `src/renderer/settings/Repos.tsx`: `text` and `pathProblem` state and a request counter in a ref bumped on every edit; a `<form>` (so Enter submits) with a labelled `<input>` and the «Add this path» button, inside the existing `!problem` block; the reply is applied only when the counter did not move; `'what' in r` means `PathProblem` → `<Problem what cant="Nothing was added." fix onFix detail />`, `fix: 'pick'` calls the existing picker `add()`, `fix: 'git'` calls `window.atril.installTool('git')` and, like `sharedFix` everywhere else, shows nothing for its answer (the doctor chip owns install status); the button labels come from the card itself — `t('Choose a folder…')` for `'pick'`, `fixLabel(t, 'git')` for `'git'` — because `fixLabel` takes only the work and net fixes; anything else goes through the existing `settle(r, r.path)` (so `id-taken` reuses S12's prompt with main's resolved path, and a `StateProblem` sets the card-level problem that hides the field, W447); the field empties whenever a repo is registered, straight from `addPath` or later through `confirmId`; starting an add by either route clears the other's message (`pathProblem` and the picker's `error`); the field and button stay while the id prompt or the picker's error line is showing.
- `src/renderer/mockApi.ts`: `repos.addPath` as a `vi.fn` — its default in box 1 (the preload type changes), its `addPath` override in box 2; `src/preload/i18n-es.ts`: main's keys in box 1, the card's in box 2.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| Overload `atril:repos:add` with an optional path | The handler's contract is «main opens the picker» (W158); one channel meaning two things hides the trust boundary. |
| Validate and expand in the window, send a «checked» path to `addWithId` | The window must never decide what is a folder, and only main knows the home (`userHome()`); `addWithId` would also skip the id-taken answer for the typed path. |
| Drag-and-drop onto the card | Needs `webUtils.getPathForFile` in preload, a second way across the boundary; the invocation asked for typing or pasting. Kept as a later add on the same IPC. |
| Widen `registerRepo` to return git's stderr and drop the pre-check | Touches the picker's path and `create.ts`, which also call it; one extra `rev-parse` is cheaper than that blast radius (ponytail, ceiling in Prior decisions). |

### Risks
| Risk | What catches it |
|---|---|
| `~` expands against the real home in a test and the test reads Pau's machine | The W440 test sets its own `HOME` and asserts the expanded path starts with its temp home; the lint rule keeps `homedir()` out of `repos.ts`. |
| A refusal writes `repos.json` (a half-registered repo) | W440–W442 tests assert the file is absent after each refusal, and the runner spy in W441 throws if git is called. |
| A slow reply lands under newer text | The request counter in `Repos.tsx`; W445's test edits the field while the reply is held back. |
| A pasted path with quotes or backslash-escaped spaces (`/a\ b`) is refused as «no folder» | Accepted: the message names the path as read, so the cause is visible; stripping quotes or escapes is another change. |
| A folder name that ends in a space cannot be added | Accepted: the text is trimmed; the picker still adds it. |
| Double press of the button | Idempotent: the second answer is the already registered repo and writes nothing (W443). |

### Validation and rollback
Gates: typecheck, lint, test, run behind the commit guard. New tests: W440–W443 in `src/main/repos.test.ts` (real git in temp dirs; a fake runner only for the 127/xcode-select and «other failure» branches, which a real git here cannot produce), W444–W446 in `src/renderer/settings/repos.test.ts`. Would pass for the wrong reason: W440's `~` case if `HOME` were unset (the temp home must be set and asserted), W441's «no git» clause unless the runner spy throws, W445's stale-reply clause unless the reply is held back (a deferred promise), W446's «never the text typed» unless the mock answers a `path` that differs from the typed text (`~/shop` typed, `/resolved/shop` answered), and W442's classification if the fake stderr for the generic case contained «not a git repository» — each is forced red once (drop the `~` branch, call git before `stat`, remove the counter guard, swap the classification order). Then the real-app drive: Playwright over CDP with a temp `ATRIL_HOME` and a temp `HOME` holding one throwaway git repo. Rollback: one revert; nothing migrates and entries already added stay valid.

### Complexity deliberately kept
The extra `git rev-parse` before `registerRepo` duplicates a call so the refusal can show git's own stderr and tell «not a repository» from «git broken» from «git could not read it»; `// ponytail:` marks it. A separate `PathProblem` type exists because `StateProblem` means «a state file is damaged» and its fixes are not these.

## Checklist

- [x] main accepts a typed path end to end: `expandPath` and `addRepoByPath`, the `atril:repos:addPath` handler, the `PathProblem` type and `repos.addPath` in preload, the default of `repos.addPath` in `mockApi`, main's Spanish entries (the S16/S19 i18n scans stay green), proved by real-git tests with forced-red checks · Closes: W440, W441, W442, W443
- [x] the Repos card takes a typed path: field, button, Enter, the `Problem` with its one fix and its label, the stale-reply guard, the id prompt for a taken id, the damaged-file case, the card's Spanish entries (the i18n scans stay green), the `addPath` override in `mockApi`, proved in jsdom with forced-red checks · waits on box 1 · Closes: W444, W445, W446, W447
- [x] the change driven in the real app (Playwright over CDP, temp `ATRIL_HOME` and temp `HOME` holding a throwaway repo): it passes only if all of these are seen in Atril's own window — typing `~/<repo>` adds a row with the expanded path; typing a missing `~/…` shows the problem with «Nothing was added.», «Choose a folder…» and a folded detail; a second repo with the same name asks for another id; «＋ Add repo…» is still there; the report says which failed, and a screenshot is attached · waits on box 2 · Closes: no criterion (the jsdom proofs close W444–W447; this is the real-window check CLAUDE.md requires)
