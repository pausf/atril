# work-vs-main

Tracker: none (GitHub issues pausf/atril #11, #10, #8)
Targets: workspaces
Durable decisions: the four in Prior decisions below

## The ask, verbatim

> Fix three dogfood issues in pausf/atril that are about a work and main drifting apart: #11 (a new work branches from the local checkout instead of an up-to-date origin default branch; the «rama grande» size is measured against that stale base too), #10 (a work whose PR is merged still says «te necesita» and keeps raising «Choca con …» overlaps) and #8 (parallel works pick the same spec criterion ids). Read the three issues with gh first.
> New criterion ids: W300 and up. Tests first; drive it in the real app on its own CDP port with a temp ATRIL_HOME before landing; all in English (UI texts English in t(), Spanish in i18n-es.ts). Open the PR against main and do not merge it.

### The issues, in the reporter's words

- **#11** A new work branches from the local checkout, not the up-to-date default branch. «Works started from «Nuevo trabajo» after PRs had been merged into origin/main still branched from the repo's local checkout (an old branch, crash-reports), so fewer-go-on-cards was built on a stale base and proposed a PR against crash-reports […] Expected: a new work fetches and branches from origin's default branch (or shows which base it will use in the dialog).» Comment: «the «rama grande» warning on repo-harness said 21648 lines while `git diff origin/main...HEAD` is 1074 lines, so the size is measured against a stale base too.»
- **#10** A work whose PR is merged still says it needs you. «After a work's PR is merged […], the work stays in «Trabajo en marcha» as «te necesita · Sigue», and keeps raising «Choca con … y 266 más» overlap warnings against new works that start from the merged main. […] when it is merged, the work could read as done, drop out of the overlap check and offer «Quitar».»
- **#8** Parallel works pick the same spec criterion ids. «Two works started from the same main […] both numbered their new workspaces criteria from the next free id, so both took W217–W224. […] Atril already shows file overlaps («Choca con … en …»); it could also tell a work which ids another open work already reserved, or the land script could renumber on landing.»

## Reading

Three bugs: behaviour already built that goes wrong. Each needs a criterion that is red before the fix.

The three come from one cause: a work never learns where `origin`'s default branch is. It starts from whatever the
person's checkout holds (#11), measures itself against that frozen commit for ever (#11's size, #10's «266 más»),
never notices its branch landed (#10), and cannot see what a sibling work has already claimed (#8).
Owner: `workspaces` (`src/main/workspaces.ts`, `src/main/radar.ts`, `src/main/index.ts`, `resources/branchsize.mjs`,
`src/renderer/**` outside `flow/`). Nothing under `src/main/flow/**` changes.

## Decision log

### Session 2026-11-26
- Q: Which base does a new work take? → A: `origin`'s default branch after `git fetch origin`: the target of `refs/remotes/origin/HEAD`, else `origin/main`, else `origin/master` (assumed; a remote not called `origin` falls back to the local HEAD).
- Q: And when the fetch fails (offline)? → A: the default ref as last fetched, with no message; no `origin` or no ref at all → the local HEAD as before (assumed; if Pau wants to see the base, the dialog line in #11 comes back as its own change).
- Q: Does the new branch track `origin/main`? → A: no, `--no-track`: a branch tracking `main` under another name makes `git push` refuse or, worse, aim at `main` (assumed).
- Q: In-place repos too? → A: yes, `git switch --no-track -c <branch> <ref>` (assumed; the copy is already required clean).
- Q: What is the size measured against? → A: `git merge-base HEAD <baseRef>` while the record has `baseRef`, else `baseCommit`; the same base for the hook's size, the panel's total and boxes, and the radar. `stageOf`, history and QA keep `baseCommit` (assumed; they count or show commits, not a size).
- Q: How does Atril learn a PR is merged? → A: two signals, either one: a `merged` notice matched to a work by W187's rule, and, after a new work's fetch, a sibling branch with commits of its own that are all in the default ref. The mark is sticky (`merged: true` in the record) (assumed; squash merges are seen only through the notice).
- Q: What does a merged work look like? → A: «Merged» in place of its state, no agent card, counted as done; «Remove» stays as it is (assumed).
- Q: #8, warn or renumber? → A: warn, in the radar, like files: «Same criterion ids as {branch}: W217 and 7 more». `scripts/land.py` renumbering is out: it is this repo's script, not Atril (assumed).

- Q: (phase 5) How is it built? → A: resolve the base in workspaces (one `defaultRef` + `workBase` in `workspaces.ts`) and pass the resolved base into the unchanged flow functions; merged is a record field; ids ride the radar (assumed; rejected: a `base` argument threaded through `src/main/flow/**`, and a separate «merged» poll of the forge).

- Q: (spec-reviewer) Which ids are a work's own? → A: ids defined in its `.agents/changes/*/*.md` that no `- **<id>**` line under `.agents/` defines at the work's base (W303); ids already on main are nobody's to clash on (assumed).
- Q: (spec-reviewer) W166/W168 contradicted? → A: both amended in this change; the hook-equals-panel equality gets W312 through one helper `panelBoxes`/`panelBoxDiff` that index.ts calls; `stateOf` gets W313 (assumed).
- Q: (spec-reviewer) Muted merged notices, reopening a merged work, a failed fetch? → A: ceilings, named in Prior decisions; no extra code (assumed).

## Outcomes

- «New work» in a repo whose checkout sits on an old branch creates a branch whose first commit is `origin`'s current default branch, not the checkout's HEAD; the person's checkout is not moved.
- A work that later merges or rebases onto a newer `origin/main` reports a size, a panel total and clashes counted only from where it left `origin/main`.
- A work whose PR has been merged reads «Merged», shows no «needs you» card, drops out of every clash, and can be removed as before.
- Two open works of one repo that define the same new criterion id say so on their rows.

## Scope boundaries

**In:** `src/main/workspaces.ts` (base choice, `workBase`, merged marks); `src/main/radar.ts` (base, merged, ids);
`src/main/index.ts` (boxes/boxdiff base, merged notices); `resources/branchsize.mjs` (size base);
`src/preload/api.ts` (`baseRef`, `merged`, `RadarHit.ids`); `src/renderer/agents.ts` (`stateOf`);
`src/renderer/components/WorkspaceList.tsx` (row); `src/renderer/mockApi.ts` if a fixture needs it;
`src/preload/i18n-es.ts` (new texts); tests beside each.

**Out:**
- Showing the base in the «New work» dialog (#11's alternative): the base is now right, so there is nothing to choose.
- Renumbering ids on landing (`scripts/land.py`) and telling the agent about reserved ids: Atril never types into an agent on its own.
- A Mac notice for shared ids (W182 stays files only).
- Asking the forge for a work's PR state: the notice and git already carry it.
- Closed (not merged) PRs: unchanged.
- Re-basing records made before this change: they keep `baseCommit` and no `baseRef`.
- `stageOf`, history, QA prompts: keep `baseCommit`.

## Constraints

- Every git call through the `Runner`; the fetch with a 15 s timeout so a dead network cannot hang «New work».
- W167/F46: a quiet work spawns nothing: the merge-base is computed inside the work's `quietly` cache (its watcher sees `refs/` of the common dir, so a fetch invalidates it).
- W46: the hook's count equals the panel's total for the same tree, so both use the same base.
- `src/main/flow/**` belongs to flow-status and does not change: the base is resolved before calling it.
- Texts through `t()` with the English key; Spanish in `src/preload/i18n-es.ts`.
- Reading `.agents/changes/*/*.md` of a worktree: `lstat`, no links followed, files over 1 MB skipped.

## Prior decisions

- (2026-11-26, work-vs-main) Base = `origin`'s default branch after a fetch, `--no-track`; fallback to the last fetched ref, then to the local HEAD with no `baseRef` (assumed; if wrong, a dialog line naming the base).
- (2026-11-26, work-vs-main) Size, panel total, boxes and radar measure from `merge-base HEAD <baseRef>`; `stageOf`, history and QA keep `baseCommit` (assumed).
- (2026-11-26, work-vs-main) `merged: true` is sticky in the record, set by a matched `merged` notice or by ancestry after a new work's fetch. Ceiling: a squash-merged PR with forges disconnected is never seen as merged; the person removes it by hand.
- (2026-11-26, work-vs-main) Shared criterion ids are a radar warning, not a renumbering (assumed). A work's ids are those its change documents define and its base does not.
- (2026-11-26, work-vs-main) Ceilings of the merged mark: with `merged` notices muted the forge is not asked about vanished MRs (`avisos.ts`), so only ancestry marks; a fetch that fails marks nothing; a reopened merged work keeps reading «Merged» until removed. The hook falls back to `baseCommit` after its own 5 s timeout while the panel may already have the merge-base: the two can differ for one read.

## Task breakdown

- Base choice at creation (worktree and in-place), with its fallbacks.
- `workBase` and its use in the size hook, the panel's boxes and the radar.
- Merged marks: from notices, from ancestry after a fetch.
- Merged works out of the radar; the row and `stateOf`.
- Criterion ids in the radar and on the row.

## Verification criteria

- **W300** When a new work (not `existing`, not a review) opens in a worktree of a repo that has a remote named `origin`, main shall run `git fetch origin` with a 15 s timeout and create the branch with `--no-track` from `origin`'s default ref — the target of `refs/remotes/origin/HEAD`, else `refs/remotes/origin/main`, else `refs/remotes/origin/master` — recording that commit as `baseCommit` and the ref's short name (`origin/main`) as `baseRef`; the person's checkout keeps its branch and HEAD.
  Proof: src/main/workspaces.test.ts a new work branches from origin's default branch, not the local checkout
- **W301** When a new work opens in place (W7), main shall do W300's fetch and switch the person's copy with `git switch --no-track -c <branch> <ref>` from the same default ref, recording the same `baseCommit` and `baseRef`; a branch that already exists locally is switched to as it is, with its HEAD as `baseCommit` and no `baseRef`.
  Proof: src/main/workspaces.test.ts an in-place new work starts from origin's default branch
- **W302** If W300's or W301's fetch fails or times out, then main shall branch from the default ref as last fetched; if the repo has no `origin` remote or none of the three refs resolves, then it shall branch from the local HEAD as before this change and record no `baseRef`.
  Proof: src/main/workspaces.test.ts without a reachable origin a new work uses the last fetched default branch or the local HEAD
- **W303** `workBase(record)` shall answer `git merge-base HEAD <baseRef>` run in the work's folder while the record has `baseRef` and that command answers a commit, and `baseCommit` otherwise; while nothing counted (F46) changes in the work, asking again shall run no process.
  Proof: src/main/workspaces.test.ts workBase answers where the work left its base ref and spawns nothing while quiet
- **W304** While a record has `baseRef`, the branch size the hook claims (W45) shall be counted against the same base as W303.
  Proof: src/main/agent.test.ts the branch size counts from where the work left origin's default branch
- **W305** The radar (W166) shall list each work's files against W303's base, so a work that merged a newer `origin/main` clashes only on files it changed itself.
  Proof: src/main/radar.test.ts a work that merged origin's default branch clashes only on its own files
- **W312** The panel's boxes and total (`atril:flow:boxes`) and a box's diff (`atril:flow:boxdiff`) shall be computed against W303's base, through `panelBoxes` and `panelBoxDiff`, so the panel's total equals the hook's count (W46) for a work with `baseRef`.
  Proof: src/main/workspaces.test.ts the panel's total counts from the same base as the hook
- **W306** When a `merged` notice is added and W187's rule matches it to a work, main shall set `merged: true` on that work's record; a `closed` notice or a notice with no match changes no record.
  Proof: src/main/workspaces.test.ts a merged notice marks its work merged and nothing else
- **W307** When W300's or W301's fetch succeeds, main shall set `merged: true` on every other non-review record of that repo whose branch (`refs/heads/<branch>` in the repo) has at least one commit after its `baseCommit` and is an ancestor of the default ref; a branch with no commits of its own, with a commit not in the default ref, or missing, stays as it is; a failed fetch marks nothing.
  Proof: src/main/workspaces.test.ts a new work's fetch marks siblings whose branch already landed
- **W308** The radar shall leave every `merged` record out on both sides: it gets an empty list and appears in nobody's.
  Proof: src/main/radar.test.ts a merged work is out of the clash check
- **W309** While a work's record is `merged`, its row shall show «Merged» in place of its agent state and no agent card even while its agent waits for the person; «Remove» behaves as before (W136).
  Proof: src/renderer/radar.test.ts a merged work reads Merged with no agent card
- **W313** `stateOf` shall answer `done` for a `merged` work whatever its agent's state.
  Proof: src/renderer/agents.test.ts a merged work counts as done
- **W310** Each radar hit shall carry `ids`: the ids both works own, where a work owns an id defined by a line starting `- **<capital letters><digits>**` without `(amended` in one of its `.agents/changes/*/*.md`, and that no such line anywhere under `.agents/` defines in the work's base commit (W303); sorted by `localeCompare` with `numeric: true`; files are read with `lstat`, links are not followed and files over 1 MB are skipped.
  Proof: src/main/radar.test.ts two works defining the same new criterion ids clash on those ids
- **W311** When a row's hits share ids, the row shall show, under the file line, «Same criterion ids as {branch}: {id}» for the first hit with ids and its first id, followed by « and {n} more» where n is that hit's ids minus one, with every «{branch}: {id}» of every hit as the line's title.
  Proof: src/renderer/radar.test.ts a row with shared criterion ids says which and with whom
- **W166** (amended) Main shall answer, for every workspace record that is neither a review nor `merged` (W308), the other such records of the same repo that change at least one of the same files against W303's base (committed or not) or own at least one of the same criterion ids (W310), as `{ id, branch, files, ids }` with repo-relative files sorted; records of different repos never collide, and a record sharing no file and no id gets an empty list.
  Proof: src/main/radar.test.ts two works on one file collide and nothing else does
- **W168** (amended) A workspace row whose collisions share files shall show, under its repo line and in the secondary grey, «Clashes with {branch} in {file}» for the first collision with files and its first file, followed by « and {n} more» where n is the total of files across all its collisions minus one, with every «{branch}: {file}» as the line's title; a row without shared files shows no such line. The window asks the radar every 10 s.
  Proof: src/renderer/radar.test.ts a colliding row says with whom and where
  Proof: src/renderer/radar.test.ts a row without collisions shows nothing new

## Approach

### Summary

Three small seams in main. At creation, `defaultRef(repo)` fetches `origin` and names its default branch; the new
branch starts there with `--no-track` and the record keeps `baseRef`. Wherever a size or a file list is computed,
`workBase(record)` turns `baseRef` into `merge-base HEAD <baseRef>` inside the work's quiet cache. `merged: true` is a
record field set from two places (a matched `merged` notice, ancestry after a fetch) and read by the radar and the row.
The radar also reads each work's new criterion ids from its change documents and reports the shared ones.

### Technical context

Electron main in TypeScript, vitest with real git repos under `tmp()` (`src/main/test-helpers.ts`), renderer tests with
`mockApi()`. Gates: `pnpm -s typecheck`, `pnpm -s lint`, `pnpm -s test`. Blast radius: `src/main/workspaces.ts`,
`src/main/radar.ts`, `src/main/index.ts` (three call sites), `resources/branchsize.mjs` (+ `.d.mts` unchanged unless the
signature changes), `src/preload/api.ts`, `src/preload/i18n-es.ts`, `src/renderer/agents.ts`,
`src/renderer/components/WorkspaceList.tsx`; tests in `src/main/workspaces.test.ts`, `src/main/radar.test.ts`,
`src/main/agent.test.ts`, `src/renderer/radar.test.ts`.

### The approach

- **`defaultRef(path, run)`** (workspaces.ts): `git remote get-url origin` fails → `null`. Else `git fetch origin`
  (`timeoutMs: 15000`, result kept as `fetched: boolean`), then the first of `git symbolic-ref --short
  refs/remotes/origin/HEAD`, `origin/main`, `origin/master` that `rev-parse --verify --quiet` resolves → `{ ref, sha,
  fetched }`, else `null`.
- **`openWorktree`**: for a new branch (not `existing`, not review) it calls `defaultRef` once. Worktree:
  `where = ['--no-track', '-b', branch, path, ref]`. In place: `git switch --no-track -c <branch> <ref>` when the branch
  does not exist yet (an existing branch is switched to as today). `head` becomes `sha`; the record gets `baseRef: ref`.
  With `null`, everything stays as today. After the record is written and when `fetched`, `markLanded(repo, ref)` runs
  (W307): for each other non-review record of the repo, `rev-list --count <baseCommit>..refs/heads/<branch>` > 0 and
  `merge-base --is-ancestor refs/heads/<branch> <ref>` → `merged: true`; one `writeRecords` at the end, re-reading the
  records first.
- **`workBase(rec, run)`**: no `baseRef` → `baseCommit`. Else `quietly(rec.path, 'base:' + baseCommit + ':' + baseRef,
  run, merge-base)` with `baseCommit` on failure.
- **Hook** (`branchsize.mjs` `claimSize`): `base = ws.baseRef ? mergeBase(ws.path, ws.baseRef) ?? ws.baseCommit :
  ws.baseCommit` through its own `git()` (5 s timeout).
- **index.ts**: `atril:flow:boxes` and `atril:flow:boxdiff` call `panelBoxes(ws, change, run)` / `panelBoxDiff(ws, change, index, file, run)` (workspaces.ts: `boxRanges`/`boxDiff` with `await workBase(ws, run)`);
  `tell` also passes the added notices to `markMergedFrom(added, closable)` (workspaces.ts), which marks the matched
  work of each `merged` notice.
- **radar.ts**: filters `!r.merged`; inside the existing `quietly` callback lists changes against `await workBase(r)`
  and reads ids (`changeIds(path)`: `readdir .agents/changes`, per folder per `*.md`, `lstat` is a file ≤ 1 MB, regex
  `^- \*\*([A-Z]+\d+)\*\*` per line not containing `(amended`), minus the ids its base already defines: `git grep -h -E
  '^- \*\*[A-Z]+[0-9]+\*\*' <base> -- .agents` (exit 1 means none). The cache key stays `radar:<baseCommit>`: the
  watcher already invalidates it on any `refs/` change, which is what moves the merge-base. The answer per work becomes `{ files, ids }`; a hit
  holds both shared sets and exists when either is non-empty. `createClashWatch` keeps reading `files` only.
- **Renderer**: `stateOf` answers `done` for `w.merged`; the row shows `<span className="state done">{t('Merged')}</span>`
  for a merged work instead of `StateLabel` and gates the agent card on `stateOf(...) === 'needs-you'`; `RadarLine`
  shows the file line (as now, only from hits with files) and an ids line from the first hit with ids.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Thread a `ref` argument through `boxRanges`/`boxDiff` in `src/main/flow/**` | Touches flow-status for a value its functions never need to know: they already take a base. |
| Rewrite `baseCommit` in the record when main moves | A stored base goes stale again at the next merge; the merge-base is always current and cached by the watcher. |
| Poll the forge for each work's PR state | A new request per work per poll and a second path beside the notices that already arrive. |
| Renumber criterion ids in `scripts/land.py` | Fixes only this repo, not Atril's users; and silently rewrites ids other documents cite. |
| Show the base in the «New work» dialog (#11's alternative) | Asks the person to choose what has one right answer. Comes back if a repo needs another base. |

### Risks

| Risk | Mitigation |
|---|---|
| A slow `git fetch` holds «New work» | 15 s `timeoutMs`; W302's test makes the fetch fail and still opens. |
| `--no-track` missing → the branch tracks `origin/main` and a push aims at main | W300's test asserts `branch.<b>.merge` is unset. |
| `workBase` adds a process per panel poll | Inside `quietly`; W303's test counts spawns on the second ask. |
| A branch that landed by squash never reads merged without forges | Accepted, named in Prior decisions. |
| The radar reading change docs costs time | Inside the same `quietly` callback; fs reads only, capped at 1 MB per file. |
| A stale ids hit after the first work lands | Its record becomes merged (W307) and leaves the radar (W308). |

### Validation and rollback

New tests per criterion, each seen red before its code. Ones that could pass for the wrong reason: W300 (a repo whose
local HEAD equals `origin/main` would pass without the change — the fixture puts the checkout on an older branch and
moves origin after the clone); W305 (a fixture with no merge of main passes trivially — the work must merge a newer
`origin/main`); W307 (a branch with zero own commits must stay unmerged). Real-app drive on its own CDP port with a temp
`ATRIL_HOME`: a merged and a clashing fixture work on screen. Rollback: one revert; old records simply lack the fields.

### Complexity deliberately kept

- Two merged signals instead of one: the notice sees squash merges, ancestry works with forges disconnected; each is a
  few lines.
- The hook keeps its own merge-base call instead of importing `workBase`: it is plain Node outside the TypeScript build
  (W45).

## Checklist

- [x] A new work starts from origin's default branch (worktree and in place, with fallbacks) · Closes: W300, W301, W302
- [x] `workBase` and its use in the hook's size, the panel's boxes and the radar · waits on box 1 · Closes: W303, W304, W305, W312
- [ ] Merged marks from notices and from ancestry after a fetch, merged works out of the radar, the row reads Merged · waits on box 1 · Closes: W306, W307, W308, W309, W313
- [ ] Shared criterion ids in the radar and on the row · waits on box 2 · Closes: W310, W311, W166, W168
- [ ] Drive it in the real app on its own CDP port with a temp ATRIL_HOME (a merged work, a clash on ids) · waits on boxes 3 and 4
