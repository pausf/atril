# carry-ignored-config

Tracker: pausf/atril#9
Targets: workspaces
Durable decisions: the seven in Prior decisions below

## The ask, verbatim

> Fix GitHub issue pausf/atril#9 (gh issue view 9 -R pausf/atril): copy a repo's listed ignored config files (.env, web/config.local) into each new worktree. Per repo, a short list of files to carry, suggested from git ls-files --others --ignored outside dependency/build folders, editable in Settings > Repos. Copy only regular files inside the repo (no symlinks out, no paths escaping the repo), never commit them, never log or show their contents, and say in the work which files were copied or failed. Never read Pau real repos or ~/.atril/secrets.bin; tests use temp repos and a temp ATRIL_HOME. Use criterion ids W480+. Run it through the Libretto flow, open a PR against main and do not merge it. (Pau, 27 Nov 2026)

Issue #9, «Worktrees: copy a repo's ignored config (.env) into a new worktree», in its own words:

> Follow-up to #2 (PR #8). An ignored file no longer forces in-place. Because of that, a repo whose work needs an ignored `.env` or `web/config.local` now gets a worktree without that file. The workaround today is to set the repo to in-place by hand (W4).
> **Expected:** Each repo has a short list of ignored files to carry over, suggested from what `git ls-files --others --ignored` finds outside dependency and build folders. Atril copies those files into every new worktree, never committing them and never logging their contents.

## The reading

Not a bug: the ceiling named when #2 landed (`ignored-files-not-dirty`, Prior decisions: «the upgrade path is copying a listed set of ignored files into the worktree, a separate change»). `origin/main` fetched (129be39); nothing copies files into a worktree today. Two capabilities: `workspaces` (the list in `repos.json`, the suggestion, the copy, the work's header) and `settings` (the Repos card that edits the list, `spec-settings.md`).

## Decision log

### Session 2026-11-27
- Q: which works get the files? → A: only a new worktree (`openWorktree` in worktree mode, `existing` MR branches included); in-place and review works already run in the checkout that holds them (assumed; if wrong, nothing to add: in-place has the files by construction).
- Q: are suggestions ticked by default? → A: no; suggestions are shown unticked and only what the person ticks is copied (assumed: a media file or a 2 GB dump is ignored too, and copying it unasked is worse than one click; if wrong, `suggestCarry` results are saved on first open).
- Q: what is «outside dependency/build folders»? → A: a fixed set of folder names, any segment of the path: `node_modules`, `vendor`, `dist`, `build`, `out`, `target`, `coverage`, `.next`, `.nuxt`, `.svelte-kit`, `.venv`, `venv`, `__pycache__`, `.cache`, `.turbo`, `.gradle`, `Pods`, `DerivedData`; plus `.DS_Store` files (assumed; if wrong, only the set changes).
- Q: a wholly ignored folder (`config/` holding only ignored files)? → A: `--directory` lists it as `config/`, a folder, which is never suggested and never copied; the person can type a file inside it (assumed; if wrong, expand folders with a second `ls-files` per folder, bounded).
- Q: how many entries, how long? → A: at most 20 entries of at most 300 characters; suggestions also cap at 20 (assumed: «a short list», and every entry costs a `check-ignore` on each open).
- Q: «never commit them»: how is it guaranteed? → A: a file is copied only when git in the new worktree reports it ignored (`git check-ignore -q`), so it never shows as a change and `git add -A` skips it (assumed; a file not ignored there is refused as `not-ignored`).
- Q: what if something is already at the destination (tracked on that branch, or a leftover)? → A: never overwritten; the file is reported `exists`, which is checked before `not-ignored`, so a file tracked on the branch reads `exists` (assumed).
- Q: does a failed copy stop the work? → A: no; the work opens and its header says what failed (assumed: the issue's own workaround is a work without the file; if wrong, the failure becomes a `prepare` error that undoes the open).
- Q: where does the work say it? → A: in the work's header, one line «Copied: …» and one «Not copied: … (reason)», from a `carried` field of the workspace record; names and reason codes only (assumed; a notice or activity line would be a second place to keep in sync).
- Q: the edit UI? → A: a «Carried files» button per healthy repo row, like «Harness», opening a panel with one checkbox per path (saved list ticked, suggestions unticked) and a field to type a path; each change saves at once (assumed; if wrong, only `Repos.tsx` changes).
- Q: a tour step (W23)? → A: none: the button lives in the Repos card the `repos` step already points at (assumed).
- Q: `bocetos/` pages and photo? → A: `bocetos/` is local-only and absent from this worktree; the real-app drive is still done and its screenshot attached to the PR (assumed, same as add-repo-by-path).
- Q: criterion ids? → A: W480 onward, both specs (Pau).
- Q: (cold review, run as the author) `exists` against `not-ignored` for a file tracked on the branch? → A: the first failing check in W484's order wins; `exists` comes before `not-ignored` (acted on).
- Q: (cold review) `mkdir` of the destination folder before its check could create folders outside the worktree through a tracked symlinked folder? → A: the nearest existing ancestor of the destination is resolved and checked before any write; a proof plants a symlinked folder in the branch only (acted on).
- Q: (cold review) throws other than the copy's (`lstat` EACCES, `realpath` ELOOP, `mkdir`)? → A: every step of one file sits in one catch: ENOENT on the source is `missing`, any other throw is `failed`; `carryFiles` never rejects (acted on).
- Q: (cold review) `config/`, a non-array, and a 21-entry list holding a bad entry? → A: a trailing `/` is an empty segment and refused; a non-array is refused naming the value as text; the count is checked first (acted on).
- Q: (cold review) W485's window half and «never read into the process» had no failing run? → A: W485 promises the record and main's console only; the window shows names by W487; `copyFile` stays an approach rule (acted on).
- Q: (cold review) the separator of «Copied: {files}»? → A: `, ` (acted on).
- Q: (cold review, settings) an unticked typed entry, the field after a refusal, the damaged file and the `Problem`'s button? → A: an unticked entry that is not a suggestion leaves the panel; the field keeps its text on a refusal; a damaged `repos.json` shows the card's S33 problem, as the mode select does; a refusal is a `Problem` with only «Close», because the fix is the panel itself (acted on, assumed).
- Q: (the stop before code) → A: answered by the invocation (`/libretto-attacca`): the document is written, cold-reviewed, committed and carried into phase 6; the run acted on every finding above and rejected none. Box 1 and 2's tests were written red while the reviewer read, then adjusted to the amended criteria.
- Q: which approach (the fork)? → A: a `carryFiles(repoPath, worktree, list, run)` in `workspaces.ts` called inline by `openWorktree` right after `git worktree add`, its result stored on the record (assumed, the recommended one: one place, before `prepare` and the agent, inside the same undo). Rejected: a git `post-checkout` hook in the repo (writes into the person's repo config and runs on their own checkouts too); passing it as the `prepare` callback (that callback belongs to the caller, W102, and its error undoes the open, which W484 forbids).

## Outcomes

A repo can hold a short list of ignored files (`.env`, `web/config.local`). In Ajustes → Repos the person opens «Carried files» on a repo, sees the ignored files Atril found outside dependency and build folders, ticks the ones each work needs or types one, and the list is saved in `repos.json`. Every new worktree of that repo gets those files copied from the person's checkout before the agent starts. A file is copied only when it is a regular file inside the repo, is ignored by git in the new worktree, and nothing is at its destination. The work's header names what was copied and what was not, and why; no file's contents are ever read into Atril, logged, shown or written anywhere but the copy.

## Scope boundaries

**In:** `Repo.carry`, `setCarry`, `suggestCarry` and the carry-preserving `setOverride` in `src/main/repos.ts`; `carryFiles` and the `carried` record field in `src/main/workspaces.ts`; the handlers `atril:repos:setCarry` and `atril:repos:carrySuggest` in `src/main/index.ts`; types and `repos.setCarry`/`repos.carrySuggest` in `src/preload/{api,index}.ts`; the header lines in `src/renderer/components/Workspace.tsx`; the card panel in `src/renderer/settings/Repos.tsx` (spec-settings.md); `mockApi.ts`; Spanish entries in `src/preload/i18n-es.ts`; the tests; this change's criteria.
**Out (named):** copying folders; carrying into in-place or review works; syncing changes back from a worktree to the checkout, or later edits of the source into open works; templates or per-work lists; a content diff or preview of a carried file; ticking suggestions automatically; re-copying on «Reopen»; the `bocetos/` pages; a tour step.

**Never scoped out:** the list crosses IPC as untrusted input and is validated in main before `repos.json` is written; the copy refuses symlinks, paths escaping the checkout or the worktree and files git would not ignore; no file content is read into JS, logged or shown; tests never touch Pau's repos or `~/.atril/secrets.bin`; the panel's controls are native checkboxes, inputs and buttons with labels.

## Constraints

- `repos.json` is written only through `writeRepos` (atomic, refuses over a damaged file, W148); `setOverride` today rebuilds the record with only `id`, `path`, `override` and would drop `carry`.
- Git runs through the injected `Runner`; English messages; paths go to git after `--` or as `-C` arguments only.
- The copy uses `fs.copyFile` with `COPYFILE_EXCL`, so the bytes never enter the JS heap and nothing is overwritten.
- Main stays language-free for the reasons: codes (`missing`, `not-a-file`, `outside`, `not-ignored`, `exists`, `failed`); the window writes the sentences through `t()` with Spanish entries in `i18n-es.ts`.
- Errors in the card follow CLAUDE.md: what happened, what Atril can't do because of it, detail folded (`Problem`).
- Tests: real git in temp dirs, a temp `ATRIL_HOME`, their own tmux socket.

## Prior decisions

- (2026-11-27, carry-ignored-config) Only new worktrees are carried into (assumed). If wrong: nothing to add; in-place already works in the checkout.
- (2026-11-27, carry-ignored-config) Suggestions are never ticked for the person (assumed). If wrong: save the suggestions on first open.
- (2026-11-27, carry-ignored-config) The dependency/build folder set is fixed in code (assumed); ceiling: a project with another build folder name sees it suggested and simply does not tick it.
- (2026-11-27, carry-ignored-config) «Never committed» is enforced by `git check-ignore` in the new worktree; a file not ignored there is refused (assumed).
- (2026-11-27, carry-ignored-config) A failed carry never blocks the open; the header says so (assumed). If wrong: return the failure from `prepare`.
- (2026-11-27, carry-ignored-config) At most 20 entries, 300 characters each (assumed); ceiling: a repo needing more is setting up an environment, not carrying config.
- (2026-11-27, carry-ignored-config) ponytail: the realpath checks and the copy are two steps, not one atomic open; a file swapped for a symlink between them in the person's own checkout is a race against the person, not an attacker. Upgrade path: open with `O_NOFOLLOW` and copy from the handle.

## Task breakdown

- The list in `repos.json`: validation, save, and an override change that keeps it.
- Suggestions from `git ls-files --others --ignored --directory`, filtered.
- The copy into a new worktree with its guards and the `carried` record.
- The work's header lines.
- The Repos card panel (spec-settings.md).
- Spanish entries, mock, and a drive in the real app with a temp `ATRIL_HOME`.

## Verification criteria

- **W480** When main is asked to set a repo's carry list, it shall accept only an array of at most 20 strings, each 1–300 characters, holding no NUL byte, not starting with `/` or `~`, and with no empty, `.` or `..` segment when split on `/` (so a leading, doubled or trailing `/` is refused); it shall save the list with duplicates removed in first-seen order, remove `carry` for an empty list, and answer the repos as listed. If the value is not such an array, then main shall refuse the whole list, checking in this order: more than 20 entries → «Up to 20 files.»; a non-array, or the first bad entry → «{entry} is not a file path inside the repo.» with the value as text, and leave `repos.json` unchanged; an unknown repo id is refused with «There is no repo “{id}”». One test holds every clause.
  Proof: src/main/repos.test.ts a carry list is saved only when every entry is a plain path inside the repo
- **W481** When the mode override of a repo is set or cleared, main shall keep its carry list; when its carry list is set, main shall keep its override.
  Proof: src/main/repos.test.ts the mode override and the carry list never erase each other
- **W482** When the window asks for a repo's suggestions, main shall run `git -C <repo> ls-files -z --others --ignored --exclude-standard --directory` and answer, sorted and at most 20, the entries that do not end in `/`, are not named `.DS_Store` and have no path segment in the dependency/build set (`node_modules`, `vendor`, `dist`, `build`, `out`, `target`, `coverage`, `.next`, `.nuxt`, `.svelte-kit`, `.venv`, `venv`, `__pycache__`, `.cache`, `.turbo`, `.gradle`, `Pods`, `DerivedData`), opening no file. If git fails, then main shall answer «git could not list the ignored files of {repo}.» with git's stderr as detail.
  Proof: src/main/repos.test.ts suggested carry files are ignored files outside dependency and build folders
- **W483** When a work opens in a new worktree of a repo with a carry list, main shall copy each listed file from the repo's checkout to the same relative path in the worktree after `git worktree add` and before the agent starts, and the workspace record shall hold `carried: { copied, failed }` in list order; when the work is in-place or a review, or the repo has no list, main shall copy nothing and the record shall have no `carried`.
  Proof: src/main/workspaces.test.ts a new worktree gets the repo's listed ignored files
- **W484** If a listed file is missing in the checkout (`missing`), is not a regular file, a symlink or a folder (`not-a-file`), resolves through a symlinked folder to a path outside the checkout, or its destination's nearest existing folder resolves outside the worktree (`outside`), already exists at its destination, tracked on the branch included (`exists`), is not ignored by git in the new worktree (`not-ignored`), or any step for it throws otherwise (`failed`), then main shall not copy it, shall record it in `failed` with the first of these codes in this order, shall write nothing for it (no folder created outside the worktree, nothing at the destination changed), and shall still open the work. One test holds every clause.
  Proof: src/main/workspaces.test.ts a listed file is carried only when it is a regular ignored file inside the repo
- **W485** The workspace record and main's console output shall never contain a carried file's contents, for a copied or a failed file: only its relative path and a reason code.
  Proof: src/main/workspaces.test.ts a carried file's contents never reach the record or the log
- **W486** When a clean work whose worktree holds carried files is closed, main shall close it as any clean work (the carried files are ignored, so they are neither changes nor a reason to refuse).
  Proof: src/main/workspaces.test.ts a work with carried files closes like a clean one
- **W487** Where a work's record has `carried`, its header shall show «Copied: {files}» when any file was copied and «Not copied: {file} ({reason}), …» when any failed, entries joined by `, `, the reasons reading «not found», «not a regular file», «outside the repo», «not ignored by git», «already there» and «could not copy»; it shall show neither line for a work without `carried`, and never any file's contents.
  Proof: src/renderer/components/workspace.test.tsx a work says which ignored files it carried and which failed

## Approach

### Summary
`Repo` grows an optional `carry: string[]`. Main validates and saves it (`setCarry`), suggests candidates from git (`suggestCarry`), and `openWorktree` calls a new `carryFiles` right after `git worktree add`, storing `carried: { copied, failed }` on the workspace record. The work's header reads that field; the Repos card edits the list through two new IPC calls.

### Technical context
Electron + TypeScript + React 19, pnpm, vitest (node tests with real git and tmux on a private socket, temp `ATRIL_HOME`; jsdom tests over `mockApi`). Gates: `pnpm -s typecheck`, `lint`, `test`. Radius, about 12 files: `src/main/{repos,workspaces,index}.ts`, `src/preload/{api,index,i18n-es}.ts`, `src/renderer/components/Workspace.tsx`, `src/renderer/settings/Repos.tsx`, `src/renderer/mockApi.ts`, tests in `src/main/{repos,workspaces}.test.ts`, `src/renderer/settings/repos.test.ts` and a new `src/renderer/components/workspace.test.tsx`; the specs at landing.

### The approach
- `src/preload/api.ts`: `CarryFail = 'missing' | 'not-a-file' | 'outside' | 'not-ignored' | 'exists' | 'failed'`; `Carried = { copied: string[]; failed: { file: string; why: CarryFail }[] }`; `WorkspaceRecord.carried?: Carried`; `RepoView.carry?: string[]`; `ReposApi.setCarry(id, files): Promise<Listed<RepoView> | { error: string }>` (main's `setCarry` answers `RepoResult` through `orProblem`; the handler turns a `StateProblem` into `{ problem }` as `setOverride`'s does, `{ ok }` into the listed repos, and passes `{ error }` through) and `carrySuggest(id): Promise<string[] | { error: string; detail: string }>`.
- `src/main/repos.ts`: `Repo.carry?: string[]`. `carryProblem(files: unknown): string | undefined` applies W480's rules. `setCarry(id, files)` → `orProblem`: validate, unknown id refused, `writeRepos` with `carry` replaced (deleted when empty). `setOverride` spreads the old record (`{ ...r }`, then sets or deletes `override`) so `carry` survives (W481). `suggestCarry(id, run)`: `ls-files -z …`, split on `\0`, filter per W482, sort, slice 20; a non-zero exit → `{ error, detail: stderr }`.
- `src/main/workspaces.ts`: `carryFiles(checkout, worktree, files, run): Promise<Carried>`; per file in order, all inside one try (ENOENT from the source `lstat` → `missing`, any other throw → `failed`; it never rejects): `lstat(join(checkout, f))`, not `isFile()` → `not-a-file`; `realpath` of the source must start with `realpath(checkout) + sep` else `outside`; walk up from `dirname(dest)` to the nearest existing path and `realpath` it, which must be the worktree's realpath or inside it, else `outside` (before any write); `lstat(dest)` succeeds → `exists`; `run('git', ['-C', worktree, 'check-ignore', '-q', '--', f])` exit ≠ 0 → `not-ignored`; `mkdir(dirname(dest), { recursive: true })`; `copyFile(src, dest, COPYFILE_EXCL)`. Never `readFile`; no logging. `openWorktree` calls it only in the worktree branch, after a successful `worktree add` and when `repo.carry?.length`; the result spreads into the record as `carried`.
- `src/main/index.ts`: `atril:repos:setCarry` (`(_e, id: unknown, files: unknown)` → `setCarry(String(id), files)` then `listRepos`) and `atril:repos:carrySuggest`.
- `src/renderer/components/Workspace.tsx`: under the header's title, a `<div className="m carried">` with the two lines from W487, reasons mapped through `t()`.
- `src/renderer/settings/Repos.tsx` (spec-settings): a «Carried files» pill beside «Harness», `aria-expanded`; a `CarryPanel` in the same file holding suggestions, the field and an optional `Problem`; every change calls `setCarry` with the whole list and `show()`s the answer.
- `src/renderer/mockApi.ts`: defaults for both calls; `i18n-es.ts`: the new keys.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| A git `post-checkout` hook installed in the repo | Writes into the person's repo config and fires on their own checkouts and other tools' worktrees. |
| The copy as `openWorktree`'s `prepare` callback | `prepare` belongs to the caller (W102) and its error undoes the open; W484 says a failed carry never blocks the work. |
| Read the file and write it with `writeFile` | Pulls the secret into the JS heap, one log line away from leaking (W485); `copyFile` never does. |
| Save the list from `git status --ignored` instead of `ls-files` | Same data, a second parser; the issue names `ls-files`, and `detectMode` already runs it. |

### Risks
| Risk | What catches it |
|---|---|
| `setOverride` drops `carry` (it rebuilds the record today) | W481's test, written red first. |
| A symlinked parent folder leads the copy outside the checkout | W484's test plants `out -> /outside` in the checkout; realpath check. |
| A symlinked folder tracked on the branch leads the destination outside the worktree | W484's test commits `cfg -> /outside2` and replaces it with a real folder in the checkout only; the ancestor check runs before `mkdir`, and the test asserts nothing appeared in `/outside2`. |
| A file tracked on the work's branch is overwritten or committed | `check-ignore` refuses it as `not-ignored` and `COPYFILE_EXCL` refuses an existing destination: both cases in W484's test. |
| The secret reaches the record or a log | W485's test spies on `console.*` and greps `workspaces.json` for a marker held in the file. |
| `--directory` hides a file inside a wholly ignored folder | Accepted (decision log): the person types it. |
| A large file (a dump) is ticked and copied on every open | Accepted: the person ticked it; `copyFile` clones on APFS. |

### Validation and rollback
New tests: W480–W482 in `src/main/repos.test.ts` (real git), W483–W486 in `src/main/workspaces.test.ts` (real git, tmux on a private socket, `SLEEP` argv), W487 in a new `src/renderer/components/workspace.test.tsx`, W488–W489 in `src/renderer/settings/repos.test.ts`. Would pass for the wrong reason and are forced red once: W484's `outside` unless the realpath check is removed (it would copy); W484's `not-ignored` unless check-ignore is skipped; W485 unless the copy is swapped for a `readFile` + `console.log`; W481 is red on today's `setOverride`. Then the real-app drive over CDP with a temp `ATRIL_HOME` and a throwaway repo. Rollback: one revert; `carry` and `carried` are optional fields older code ignores.

### Complexity deliberately kept
Two realpath checks (source inside the checkout, destination parent inside the worktree) and a `check-ignore` per file: each is one of the issue's «never» clauses, and none can be dropped without a path that escapes or a secret that gets committed.

## Checklist

- [ ] the carry list in `repos.json`: `Repo.carry`, `setCarry` with W480's validation, `setOverride` keeping it, `suggestCarry`, the two IPC handlers, `repos.setCarry`/`repos.carrySuggest` in preload and their `mockApi` defaults, main's Spanish entries, proved by real-git tests with forced-red checks · Closes: W480, W481, W482
- [ ] the copy into a new worktree: `carryFiles` with every guard, called by `openWorktree` after `worktree add` in worktree mode only, `carried` on the record and its type, proved by real-git/tmux tests with forced-red checks (outside, not-ignored, contents leak) · Closes: W483, W484, W485, W486
- [ ] the work's header lines from `carried`, their Spanish entries, proved in jsdom · waits on box 2 · Closes: W487
- [ ] the Repos card «Carried files» panel: button, checkboxes, field, the `Problem`, Spanish entries, the `mockApi` overrides, proved in jsdom (full suite run, other cards' tests included) · waits on box 1 · Closes: W488, W489
- [ ] the change driven in the real app (Playwright over CDP, unlikely port, fresh token, temp `ATRIL_HOME`, a throwaway repo with an ignored `.env` and `web/config.local`): it passes only if, in Atril's own window, the panel suggests both files, ticking them saves, opening a work shows «Copied: .env, web/config.local» in its header, and the files exist in the worktree; screenshot attached to the PR · waits on boxes 3 and 4 · Closes: no criterion (the real-window check CLAUDE.md requires)
