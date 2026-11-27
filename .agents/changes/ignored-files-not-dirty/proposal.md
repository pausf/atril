# ignored-files-not-dirty

Tracker: GitHub pausf/atril#2
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask

Fix GitHub issue pausf/atril#2 (gh issue view 2 -R pausf/atril): a git-ignored file in the repo makes Atril choose working in place instead of a worktree. Only tracked changes should count as a dirty tree when deciding. Use criterion ids W400+ to avoid clashing with the parallel work card-answer-lands. Run it through the Libretto flow, open a PR against main and do not merge it.

## The reading

A **bug**: something built behaved wrong. Reporter's words (issue #2, label `dogfood`):

- **Observed:** adding a repo whose checkout holds a file matched by `.gitignore` (`caso-1-stripe.gif`, ignored by `caso-*`) makes Atril pick **in-place** with the reason «caso-1-stripe.gif no está versionado».
- **Expected:** ignored files do not count; only tracked changes or untracked, not-ignored files do.
- **Repro:** in any repo, `touch caso-1.gif` with `caso-*` in `.gitignore`, add the repo in Settings → Repos, read its mode.

Cause, read in the code: not a dirty-tree check (W8's `git status --porcelain` already skips ignored files). It is `detectMode` in `src/main/repos.ts`, which reads `git ls-files --others --ignored` and turns the first ignored file outside a noise list into in-place. That is W2 as written, on purpose: the case it was written for is a `.env`-like file a worktree would not carry. The issue asks to remove that signal; this change does, and amends W2.

## Decision log

### Session 2026-11-27
- Q: the invocation says "dirty tree", the code has no such check on this path: which rule changes? → A: W2, the ignored-file signal of `detectMode`; W8's porcelain check is correct and stays (assumed). If wrong: nothing else reads ignored files, so only W2 moves.
- Q: drop the ignored-file signal entirely, or narrow it (e.g. skip media extensions)? → A: drop it entirely, as the issue's Expected says; a name-based narrowing is a guess that fails on the next filename (assumed). If wrong: a repo with an ignored `.env` now gets a worktree without it, and the person sets in-place by hand (W4).
- Q: should untracked, not-ignored files count, as the issue's Expected allows? → A: no; `detectMode` never looked at them and the issue's repro does not need it (assumed). If wrong: a new criterion, not a change to these.
- Q: approach fork: delete the ignored-file branch, vs keep it behind a filter (extension or `git check-ignore` on pattern kind), vs ask the person at registration? → A: delete the branch (assumed). The filter loses on the next filename; the prompt adds a stop to a registration flow the issue calls a bug. If wrong: the `.env` case returns as a regression the person feels in a worktree without it.
- Q: the invocation ran through the Libretto flow with no stop before code → A: the document was carried into phase 6; the fresh reader's findings acted on are named below once `review-spec` has run (assumed).

## Outcomes

- Registering a repo that holds a git-ignored file (`caso-1-stripe.gif` under `caso-*`, `web/config.local`, a `.env`) reads `worktree` with the «no signal» reason, never naming a file.
- A repo whose `node_modules`/`vendor` weigh over 2 GB still reads `in-place` (W3), also when ignored files sit beside them.
- A person who wants in-place for a repo with an ignored `.env` still chooses it (W4).

## Scope boundaries

In: `detectMode` in `src/main/repos.ts`; W1 and W2 amended and W400, W401 added (W1 said «none of the three signals»; the ignored-file signal was one of them, so two remain); the now-unused «{path} is not versioned» text and its Spanish entry removed; the W2 test replaced.

Out, named:
- Untracked, not-ignored files as a signal (never read today; not added).
- Copying ignored files (`.env`) into a new worktree: a different feature, not asked.
- W8's refusal on uncommitted changes in an in-place checkout: correct as it is.
- Any heuristic that tells «config» from «media» among ignored files.

## Constraints

- Same `Runner` seam and `git ls-files` call stay: W3 still needs the ignored folders for its size count.
- Texts through `t()`; a removed text leaves no orphan in `src/preload/i18n-es.ts` (checked by `rg` for the key in `src`).
- No new dependency.

## Prior decisions

- 2026-11-27 · W2 was a deliberate choice (ignored config files make a worktree lose them). It is reversed here on the issue's authority, **assumed** as the owner's intent from the invocation; what it costs is the `.env` case above, answered by W4's override. Ceiling: a repo whose work needs an ignored file in the checkout and is never overridden gets a worktree that lacks it; the upgrade path is copying a listed set of ignored files into the worktree, a separate change.
- 2026-11-27 · The criterion ids are W400+ because `card-answer-lands` runs in parallel and takes the next free ids (invocation).
- 2026-11-27 · Acted on the fresh reader's findings: W1 amended (signals count), W2's internals clause dropped, W400's reason tied to W1, `NOISE` settled, landing named as phase 8. Left as they are: W400/W401 overlap with W2 (each fails alone in its own test), W401's faked `du` (the real size path is W3's own test).
- 2026-11-27 · Bug order: the proofs are written and seen red before `detectMode` changes.

## Task breakdown

- Replace the W2 test by one asserting an ignored file never chooses in-place; add the issue's repro and the heavy-deps-with-ignored-file case; see them red.
- Remove the ignored-file branch from `detectMode`.
- Remove the orphan text and its Spanish entry.
- Land the spec: W1 and W2 amended, W400, W401. The capability spec's old Outcomes example and 1200/2255 decision-log lines are dated history and stay.

## Verification criteria

- **W1** (amended) When a repo is registered and no signal (W3) is found, Atril shall set its mode to `worktree`.
  Proof: src/main/repos.test.ts chooses worktree when no signal
- **W2** (amended) If the checkout holds git-ignored files, then Atril shall not take any of them as a reason for `in-place`, whatever their names (a config file, a `.env`, a media file); the mode is decided by W3 and W4 alone, and with no other signal it is `worktree`.
  Proof: src/main/repos.test.ts an ignored file never chooses in-place
- **W400** When a repo whose root holds a file matched by a `.gitignore` pattern (`caso-1-stripe.gif` under `caso-*`) is registered, Atril shall set its mode to `worktree` with W1's «no signal» reason (in the Spanish locale the tests run in, «ninguna señal: cada trabajo en su propio worktree»), naming no file.
  Proof: src/main/repos.test.ts a media file ignored by pattern leaves the repo in worktree
- **W401** While an ignored file sits beside `node_modules` or `vendor` directories that together exceed 2 GB, Atril shall set `in-place` and name the dependencies (W3), not the file.
  Proof: src/main/repos.test.ts heavy dependencies still win beside an ignored file

## Approach

### Summary

Delete the `survivor` branch of `detectMode`. The `ls-files` call stays because W3 sizes the ignored dependency folders from it. Net change: about four lines out of `repos.ts`, one text out of the Spanish catalog, tests rewritten.

### Technical context

TypeScript, Vitest, real git repos in temp dirs (`makeRepo` in `src/main/repos.test.ts`). Gates: `pnpm -s typecheck`, `pnpm -s lint`, `pnpm -s test`. Blast radius: `src/main/repos.ts`, `src/main/repos.test.ts`, `src/preload/i18n-es.ts`, and the W2 text of the workspaces spec at landing. `NOISE` is still used by nothing else once `survivor` goes, so it goes too; `segments` stays (W3 uses it).

### The approach

In `detectMode`, remove `survivor` and its `return`. Keep `ignored` and the `depDirs` size check. `NOISE` and the `.log` filter go with the branch: nothing else reads them. Remove the key `{path} is not versioned` from `i18n-es.ts`. Tests: replace `chooses in-place when an ignored config file exists` by the three W2/W400/W401 cases.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Filter ignored files by extension (media out, config in) | A guess about names; fails on the next file, and the issue says an ignored file should never decide. |
| `git check-ignore` to tell pattern-ignored from listed-ignored | Both kinds are equally ignored; the distinction is not what separates `.env` from a gif. |
| Ask the person at registration | A new stop in Settings for what the issue calls a bug; W4 already is the person's lever. |

### Risks

| Risk | Catch |
|---|---|
| A repo that relied on W2 for an ignored `.env` now gets a worktree without it | Accepted and named in Prior decisions; W4 override; no mitigation in code. |
| Other tests build in-place repos through an ignored file | `pnpm -s test` runs the whole suite; any such test is rewritten to use the override, never weakened. |
| New tests pass for the wrong reason | See below: forced red first. |

### Validation and rollback

The three tests are written and were seen red against the current `detectMode`: all three fail because the ignored-file branch answers in-place first (W401 included, since that branch runs before the dependency check). Rollback: one revert, nothing migrates; a repo's stored override is untouched.

### Complexity deliberately kept

None: this deletes code.


## Checklist

- [x] (landing the spec is phase 8, after this box) an ignored file never decides the mode: the three tests seen red, the `survivor` branch and its orphan text removed, suite green · Closes: W1, W2, W400, W401
