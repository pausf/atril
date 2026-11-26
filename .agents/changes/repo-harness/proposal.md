# repo-harness

Tracker: none
Targets: workspaces
Durable decisions: the three in Prior decisions below that start «Detection»

## The ask, verbatim

> Show, per repo, which agent harness it has and what it is missing (idea from CodelyTV's "Agent Harness en 15 minutos": context, actions, verification, guardrails). In Atril's repo settings (or the repo's detail), a read-only "Harness" card lists what is detected, each with a tick or a gap and one line on why it matters: context (CLAUDE.md or AGENTS.md and its size, skills in .claude/skills), verification (a lint script, a typecheck script, a test script, a pre-commit hook, CI workflows), guardrails (Claude Code hooks and permission rules in .claude/settings.json, a pre-push hook). Detection is deterministic file reading in main, cheap, no Claude calls, no writes to the repo. A gap may offer one button that opens the relevant doc or file; never auto-fix.
> New criterion ids: use W280 and up (other works in parallel use W217–W279). Tests first; drive it in the real app with a sample repo before landing; all in English (UI texts through t() with their Spanish in i18n-es.ts). (Pau, 26 Nov 2026)

## Reading

A new feature (not a bug report): a read-only card per repo that reads the repo's own files in main and shows ticks and gaps.

## Decision log

### Session 2026-11-26
Zero questions asked: the repo's autonomy rule says take the recommended option and mark it `(assumed)`. Each answer below names what changes if it is wrong.
- Q: Where does the card live? → A: a «Harness» disclosure under each row of Settings → Repos; it reads the repo when opened, not when the list loads (assumed; if wrong, the card component moves, the detector stays).
- Q: Which capability owns it, given W ids? → A: workspaces. The detector is `src/main/repoharness.ts`, the card `src/renderer/harness/HarnessCard.tsx` (outside `src/renderer/settings/**`, so settings' `Governs:` is untouched), and `Repos.tsx` gets one mount line (assumed; if wrong, the same criteria move to settings with S ids).
- Q: Which items, and what counts as present? → A: ten items, listed in Scope; a script is present when the repo's `package.json` or `composer.json` has it (assumed; Makefile targets and `pyproject` are out, named below).
- Q: What does a gap's one button open? → A: a docs page in the browser from a fixed list in main, only for items that have an obvious page (assumed; items without one show no button).
- Q: What does a ticked item show? → A: its detail only (file name, script name, line count, count); no button (assumed).
- Q: (build, box 1) Main speaks Spanish by default (`lang.ts`), so can a detail like «142 lines» come from main? → A: no; items carry `detail` (a name), `n` (a count) and `big`, and the window composes the sentence through `t()`, with singular and plural as their own keys (assumed; found while writing the first test; W280, W285 and the approach reworded, no criterion dropped).
- Q: (phase 5 fork) How is it built? → A: one pure `detectHarness(root)` in main that reads with `node:fs/promises`, runs only when the card opens, and returns plain data; the window owns every sentence (assumed; the recommended option). Rejected: (B) detect eagerly inside `repos:list` and put the result on `RepoView` — it taxes every list load for ten file reads per repo and nobody asked to see it until they open the card; (C) ask git for `core.hooksPath` and read effective settings through `claude` — the ask says no Claude calls and cheap file reading, and a spawned process is exactly what W284 forbids.

## Outcomes

In Settings → Repos, each healthy repo row has a «Harness» button. Opening it shows, with no Claude call, ten items in three groups (Context, Verification, Guardrails). Each is either found (with a short detail such as `CLAUDE.md · 142 lines`) or missing, with one line on why it matters; a missing item that has a docs page offers one button that opens it. Nothing in the repo is written, and nothing is fixed for the person.

## Scope boundaries

**In:**
- `src/main/repoharness.ts` (detector, doc list) and `src/main/repoharness.test.ts`.
- IPC `atril:harness:get` and `atril:harness:doc` in `src/main/index.ts`; `src/preload/{api,index}.ts`; `src/renderer/mockApi.ts`.
- `src/renderer/harness/HarnessCard.tsx` and its test; one mount line and a toggle in `src/renderer/settings/Repos.tsx`.
- Texts through `t()` with Spanish in `src/preload/i18n-es.ts`.
- A dev-only snapshot view for the photo; `bocetos/novedades.html`, `bocetos/fase1-nucleo.html` and the photo (local files).
- The ten items:
  - Context: `memory` (`CLAUDE.md` or `AGENTS.md` at the root), `skills` (`.claude/skills/*/SKILL.md`).
  - Verification: `lint`, `typecheck`, `test` (scripts), `precommit` (hook file), `ci` (workflow files).
  - Guardrails: `hooks` and `permissions` (in `.claude/settings.json`), `prepush` (hook file).

**Out (named):**
- Any write, fix, install or scaffold; any Claude call; any git call made by the detector (the `get` handler reuses `repoHealth`, which the Repos list already runs, to decide missing or not-git).
- `.claude/settings.local.json` and user-level settings.
- Makefile, `pyproject.toml` and other task runners.
- Hook managers whose config is not a hook file (`.pre-commit-config.yaml`, `lefthook.yml`).
- Judging whether a lint script or CLAUDE.md is any good, or a score.
- A repo-wide summary screen, a badge elsewhere, caching, a watcher.
- Repos whose folder is missing or not git (their row already says so).

## Constraints

- The detector is deterministic file reading only: no `child_process`, no network. The only process is `repoHealth`'s `git rev-parse` in the `get` handler, the one the Repos list already runs; the only network is the browser open for a doc.
- Repo files are untrusted: lstat every segment, never read through a link that leaves the repo, cap each file read at 1 MB, never throw on bad JSON.
- The window sends a repo id or an item id, never a path or a URL.
- Texts via `t()` (S16, S19 scan them); colours only as tokens; a tick or a gap is never conveyed by colour alone.
- Tests use a temp folder repo and the temp `ATRIL_HOME`; never a real repo of the person.
- The lint rule keeps renderer and main apart: they talk through preload.

## Prior decisions

- (2026-11-26, repo-harness) Read-only and never auto-fixing: Pau's ask. A gap offers at most one button that opens a doc.
- (2026-11-26, repo-harness) The card lives under the Repos row and reads on open (assumed).
- (2026-11-26, repo-harness) Owned by workspaces with W280+ ids; the card sits outside settings' `Governs:` (assumed).
- (2026-11-26, repo-harness) Scripts are read from `package.json` and `composer.json` only. Ceiling: a repo driven by a Makefile reads as gaps; adding Makefile targets is the next step if that proves common (assumed).
- (2026-11-26, repo-harness) Hook files are looked up in `.githooks/`, `.husky/` and `.git/hooks/` (only when `.git` is a folder; a worktree's `.git` is a file and its hooks are shared) — ponytail: three fixed places, no `core.hooksPath` read (assumed).
- (2026-11-26, repo-harness) Doc URLs are a fixed list in main, verified with `curl -I` when built (assumed).
- (2026-11-26, repo-harness) The one edit in `src/renderer/settings/Repos.tsx` (a toggle and a mount line, W286/W287) belongs to workspaces; settings' own Repos criteria are unchanged because nothing existing in the row moves (assumed; found by the cold review).
- (2026-11-26, repo-harness) Detection is one pure function over a root path, run on demand when the card opens, never during `repos:list` (assumed).
- (2026-11-26, repo-harness) Detection returns data only (`id`, `group`, `ok`, `detail`); the why-lines and labels are written in the window through `t()` (assumed).
- (2026-11-26, repo-harness) Detection spawns no process and calls no Claude; the first thing that needs one (effective hooks path, merged settings) is a new change (assumed).

## Task breakdown

- Detector with its tests: items, link and size safety, no writes.
- IPC, preload, mock.
- Card and Repos toggle with its test; Spanish entries.
- Drive it in the real app with a sample repo; photo and sketches.

## Verification criteria

- **W280** When the detector reads a repo, it shall report `memory` as found, with `detail` the file name and `n` its line count, when `CLAUDE.md` or `AGENTS.md` is a file at the repo root (`CLAUDE.md` wins when both are), and `skills` as found with its count when `.claude/skills/<name>/SKILL.md` exists for one or more names; otherwise each is a gap. A `CLAUDE.md` over 1 MB shall be found without being read, with `big: true` and no `n`. `skills` shall carry `n` the number of skills, counting at most 300. A `CLAUDE.md` that is a file but cannot be read shall still be the memory file, found with its name and no `n`. A `.claude/skills/<name>` entry that is a link to a folder inside the repo counts like a folder (W284). One test holds every clause.
  Proof: src/main/repoharness.test.ts context items read CLAUDE.md or AGENTS.md and the skills folder
- **W281** When the detector reads a repo, it shall report `lint` found when the `scripts` of its `package.json` or `composer.json` has `lint`, `typecheck` when it has `typecheck`, `type-check` or `tsc`, and `test` when it has `test` whose command is not npm's default placeholder (`echo "Error: no test specified" && exit 1`), each with the script name as detail; a missing file, damaged JSON or a `scripts` that is not an object, or a file over 1 MB, shall read as gaps, never as an error. One test holds every clause.
  Proof: src/main/repoharness.test.ts verification scripts come from package.json and composer.json
- **W282** When the detector reads a repo, it shall report `precommit` or `prepush` found when a regular file named `pre-commit` or `pre-push` (not `*.sample`) is in `.githooks/`, `.husky/` or, only when `.git` is a folder, `.git/hooks/`; and `ci` found, with as detail the first of `.github/workflows`, `.gitlab-ci.yml` and `.circleci/config.yml` that matches, when `.github/workflows/` holds a `.yml` or `.yaml` file, or `.gitlab-ci.yml` or `.circleci/config.yml` is a file. The executable bit is not read: a hook file counts whatever its mode. One test holds every clause.
  Proof: src/main/repoharness.test.ts hook files and CI workflows are found in their fixed places
- **W283** When the detector reads a repo, it shall report `hooks` found when `.claude/settings.json` parses and its `hooks` is an object with at least one event holding a non-empty array, and `permissions` found when its `permissions` has a non-empty `allow`, `deny` or `ask` array; if the file is damaged, missing or over 1 MB, then both shall be gaps (damaged and over-size with the detail `unreadable`), never an error. One test holds every clause.
  Proof: src/main/repoharness.test.ts guardrails read hooks and permissions from claude settings
- **W284** The detector shall write nothing in the repo (the tree is identical before and after, mtimes included), spawn no process, and, for every segment of a path it checks (folders and the last one), treat a symlink whose real target is outside the repo as absent and one that resolves inside the repo as the thing it points to. One test holds every clause.
  Proof: src/main/repoharness.test.ts never writes, never spawns and never follows a link out of the repo
- **W285** When the window asks `atril:harness:get` with a repo id, main shall answer `{ items }` (ten items, each `{ id, group, ok, detail?, n?, big?, doc? }`, language-free data, where `doc: true` is present exactly on the items whose id is in main's docs list) for that registered repo; for an id no repo has it shall answer `{ error: 'unknown' }`, and for a repo whose `repoHealth` is `missing` or not `ok` it shall answer `{ error: 'missing' }`, in both cases reading nothing. When the window asks `atril:harness:doc` with an item id that has a docs page, main shall open that page from its fixed list with `shell.openExternal` and answer true; any other value shall open nothing and answer false. One test holds every clause, calling the exported `harnessGet` and `openDoc` with injected `readRepos`, `health` and `open`.
  Proof: src/main/repoharness.test.ts the get handler answers by repo id and the doc handler opens only listed pages
- **W286** When the person presses «Harness» on a repo row, the card shall read that repo and show «Harness · N of 10», the three groups, and for each item a tick or a gap written as text («Found» / «Missing», not colour alone), its name, its detail when found and one line on why it matters; each gap whose item has `doc: true` shall show one button «How to set it up» that asks main to open it; no found item shall show a button; each row owns its own card, so several can be open, and closing then opening a card reads again. One test holds every clause.
  Proof: src/renderer/harness/harness.test.tsx the Harness card lists found and missing items and offers a doc for each gap
- **W287** While a repo row's `health` is `missing` or `not-git`, the row shall show no «Harness» button.
  Proof: src/renderer/harness/harness.test.tsx a broken repo row has no Harness button
- **W288** When an item carries a count or a size, the card shall write its detail in words: «{file} · {n} lines» (singular «1 line»), «{file} · over 1 MB» when `big`, «{n} skills» (singular «1 skill»), and «Could not read the file» when the detail is `unreadable`.
  Proof: src/renderer/harness/harness.test.tsx the Harness card writes counts, singular, size and unreadable files in words
- **W289** While a read of the card is outstanding and a newer read of the same card begins (another repo id), the card shall drop the older read's reply when it arrives.
  Proof: src/renderer/harness/harness.test.tsx the Harness card ignores the reply of an older read of the same card
- **W290** If the read rejects or answers `{ error }`, then the card shall show a `Problem` saying what happened, that nothing was changed and a «Check again» button that reads again, with the technical text only under «Show detail».
  Proof: src/renderer/harness/harness.test.tsx the Harness card shows a Problem when the read fails or answers an error

## Approach

### Summary

One pure function in main, `detectHarness(root)`, reads a handful of fixed paths with `node:fs/promises` and returns ten `{ id, group, ok, detail? }` items. Two IPC handlers expose it by repo id and open a docs page by item id. A small card component in the window turns the data into ticks, gaps and why-lines, mounted under each Repos row.

### Technical context

- TypeScript strict, Electron main plus React 19 window, Vitest. Gates: `pnpm -s typecheck`, `pnpm -s lint`, `pnpm -s test`; `.githooks/pre-commit` runs the first two. Never `pnpm build`.
- Precedents to copy, not invent: `src/main/skills/read.ts` for reading untrusted files, `revealFile` in `src/main/skills/write.ts` and `ipcMain.handle('atril:skills:reveal', …)` in `src/main/index.ts` for id-in, effect-out handlers; `Problem` in `src/renderer/components/Problem.tsx` for the failure state; `mockApi(over)` for window tests (W211).
- Repo lookup: `readRepos()` and `listRepos(run)` in `src/main/repos.ts` (health `missing` / `not-git`).
- Blast radius: 2 new main files (`repoharness.ts` and its test), 1 new window folder (`HarnessCard.tsx` and its test), and edits to `src/main/index.ts` (2 handlers), `src/preload/api.ts`, `src/preload/index.ts`, `src/renderer/mockApi.ts`, `src/renderer/settings/Repos.tsx` (toggle and mount), `src/renderer/App.tsx` (dev snapshot view only), `src/preload/i18n-es.ts`; plus local `bocetos/` files. About 12 files.
- Generated files: none.

### The approach

`detectHarness(root, deps?)`:
1. Every probe goes through two helpers: `fileIn(root, rel)` lstats each segment of `rel` below `root`; a segment that is a link is followed with `realpath` and must land inside `realpath(root)` (W284), and the path counts only when what it finally points to is a regular file; `dirIn(root, rel)` the same for a folder. Anything else is absent.
2. `readCapped(path)` reads at most 1 MB and returns `undefined` beyond that; `readJson` wraps it in a `try` and returns `undefined` on damage.
3. Items are a fixed table of ten small async functions run with `Promise.all`; each returns `{ ok, detail? }` and the table adds `id` and `group`.
4. `memory`: `CLAUDE.md` then `AGENTS.md`; detail is the file name and `n` the line count, or `big: true` and no `n` over 1 MB. `skills`: list `.claude/skills`, count entries whose `SKILL.md` passes `fileIn`.
5. `lint` / `typecheck` / `test`: merge the `scripts` of `package.json` and `composer.json` (package first), look up the accepted names, detail is the script name.
6. `precommit` / `prepush`: first of `.githooks/<n>`, `.husky/<n>`, `.git/hooks/<n>` that passes `fileIn` (the last only when `.git` is a folder); detail is the folder. `ci`: `.github/workflows` entries ending `.yml` or `.yaml`, `.gitlab-ci.yml`, `.circleci/config.yml`; detail is what it saw.
7. `hooks` / `permissions`: one `readJson` of `.claude/settings.json`, then the two shape checks; unreadable gives both `ok: false, detail: 'unreadable'` when the file exists and is damaged or too large, and no detail when it is absent.

`src/main/index.ts` registers `atril:harness:get` and `atril:harness:doc`. Their logic is two exported functions in `repoharness.ts`, so a test can reach it without Electron: `harnessGet(id, { readRepos, health, run })` finds the repo by id, decides missing or not-git with `repoHealth` (the one place a process runs, as the Repos list does), calls `detectHarness` and sets `doc: true` on items in `DOCS`; `openDoc(id, open)` looks the item id up in `DOCS` and calls `open(url)`. `index.ts` only wires them to `ipcMain.handle` with the real `readRepos`, `repoHealth` and `shell.openExternal`. `detectHarness(root)` takes no other argument. `DOCS` holds `memory`, `skills`, `hooks`, `permissions` (Claude Code docs) and `precommit`, `prepush` (git-scm hooks page).

The window: `HarnessCard({ repoId })` calls `window.atril.harness.get(repoId)` on mount, keeps a request counter in a ref (bumped on unmount) and ignores a reply from an older request or an unmounted card (the K11 rule), renders groups from a constant table of `{ id, group, name, why }` whose strings go through `t()`, and a gap whose item carries `doc: true` gets the button, so main's list is the only one. `Repos.tsx` adds a «Harness» toggle per healthy row and mounts the card under it when open. A dev-only `ajustes-harness` snapshot view, read through the existing `snapshotView()` the way `create-repo` is in `Repos.tsx`, opens the first repo's card for the photo.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Detect eagerly in `repos:list` and put the result on `RepoView` | Ten file reads per repo on every list load, for something read only when the card opens; also widens a type used everywhere. |
| Ask git for `core.hooksPath` and read merged Claude settings through `claude` | The ask says file reading, no Claude; a spawned process is what W284 forbids and makes tests slower and flaky. Ceiling: a repo with a custom `core.hooksPath` outside the three folders reads as a gap. |
| Main returns the sentences (labels and why-lines) | Main would need `t()` for ten more strings per item and the window could not test them without IPC; data in, words out keeps S16/S19 scanning one place. |
| A settings-capability card with S ids | The ask fixed W280+; putting the card under `src/renderer/harness/` keeps it in workspaces without touching settings' `Governs:`. |

### Risks

| Risk | What catches it |
|---|---|
| A symlinked `CLAUDE.md` or `.claude/settings.json` points outside the repo and its contents reach the window | `fileIn` realpath check; W284's test plants a link to a file outside the repo and expects absent. |
| A huge or hostile `package.json` or settings file stalls main | `readCapped` at 1 MB; W281 and W283 tests include an oversize case. |
| The docs URLs rot or are wrong | The `DOCS` list is fixed and checked with `curl -I` at build; W285's test only proves that listed ids open and others do not. Accepted: a page that moves later opens a stale link until someone updates the list. |
| Atril's real repo is used by a test and gets touched | Tests build their repo in a temp folder; W284 compares the tree before and after. |
| The card claims a harness exists when a script is a no-op (`"lint": "true"`) | Accepted: presence, not quality, is the promise (named Out). |
| A stale reply lands in a card that was re-read for another repo | The request counter, bumped on each read and on unmount; W289's test resolves the older reply after the newer one. |

### Validation and rollback

- Gates: typecheck, lint and the full suite behind an `if`, all three exit codes read.
- New tests: `src/main/repoharness.test.ts` (W280–W285) and `src/renderer/harness/harness.test.tsx` (W286–W290). Tests first, red.
- Would pass for the wrong reason: W284's no-write check passes trivially if the comparison walks nothing, so force it red by making a probe write a file; its link test passes if the link target is missing, so the target must exist outside the repo. W289's test must be seen red with the counter check removed.
- Real app: drive it with Playwright against a sample repo in a temp folder (one with everything, one bare, one with a damaged `.claude/settings.json`, one with a symlinked `CLAUDE.md` out of the repo) before landing; photo goes into `bocetos/novedades/`.
- Rollback: one revert; nothing migrates and nothing is stored.

### Complexity deliberately kept

- `fileIn` lstats every segment instead of one `stat`: the repo is untrusted input and a linked `.claude` folder out of the repo is the exact hole the earlier lessons (qa-targets, skills-toggle) paid for. A plain `existsSync` would be shorter and wrong.
- The key-to-sentence table lives in the window, not in main, so the detector stays free of language and each sentence has one `t()` site.

## Checklist

- [x] detector core: `detectHarness(root)` with the safe-read helpers and the `memory`, `skills`, `lint`, `typecheck` and `test` items, tests first and seen red (including the link and no-write cases forced red on purpose) · Closes: W280, W281, W284 · evidence: src/main/repoharness.test.ts, 3 tests green; link check forced red
- [x] the `precommit`, `prepush`, `ci`, `hooks` and `permissions` items, same tests-first rule · waits on box 1 · Closes: W282, W283 · evidence: src/main/repoharness.test.ts, 6 tests green; guardrail clauses forced red
- [x] `atril:harness:get` and `atril:harness:doc` in main, `DOCS` list (URLs checked with `curl -I`), preload, `api.ts` and `mockApi` · waits on box 2 · Closes: W285 · evidence: src/main/repoharness.test.ts, 7 tests green; allowlist forced red; the five doc URLs answered 200 to `curl -I`
- [x] the Harness card and the «Harness» toggle on healthy Repos rows, Spanish entries in `i18n-es.ts`, tests first, stale-reply clause forced red · waits on box 3 · Closes: W286–W290 · evidence: src/renderer/harness/harness.test.tsx, 5 tests green plus the i18n scans; stale-reply guard forced red; W286 split into W286–W290 so each clause has its own cited test
- [x] drive it in the real app with Playwright against sample repos (full, bare, damaged settings, symlinked `CLAUDE.md`), dev snapshot view, photo, `bocetos/novedades.html` and `bocetos/fase1-nucleo.html`, lessons · waits on box 4 · Closes: the Outcomes paragraph · evidence: driven in the real app over CDP on four sample repos (full 7 of 10, bare 0 of 10, damaged settings 1 of 10 with «No se pudo leer el archivo», CLAUDE.md linked out of the repo 0 of 10 and its text never reached the window); photo `bocetos/novedades/harness.png` (local). Not done: «Cómo montarlo» was not clicked (it opens the real browser; W285 covers the handler), and `bocetos/novedades.html` and `bocetos/fase1-nucleo.html` are not in this worktree (local-only, in Pau's main checkout), so they are not updated; lessons come from the review seam
