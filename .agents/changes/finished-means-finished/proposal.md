# finished-means-finished

Tracker: none (GitHub issue pausf/atril #4)
Targets: workspaces
Durable decisions: the four in Prior decisions below

## The ask, verbatim

> Fix GitHub issue pausf/atril#4 (gh issue view 4 -R pausf/atril). A work that has finished must read as finished, never as needs-you waiting for Go on. When the work's PR is merged (forge notice or branch ancestry, the check work-vs-main already has), the agent card reads finished, offers no Go on, adds no What's mine chip and counts no wait. A stale needs-you turn-end written by an older hook must not outrank that. Also consider a turn-end whose last text is a final report (PR opened, nothing asked, checklist closed) reading as finished. Run it through the Libretto flow, open a PR against main and do not merge it.

### The issue, in the reporter's words

- **#4** «Five works (english-source, english-specs, public-readme, enforced-rules, fewer-go-on-cards) finished, opened their PRs, and those PRs were merged. Their cards still read **needs you**, offer **Go on**, show "Waiting for you a while", and fill the top "What's mine" bar with five chips.» Why: «The `done` state (W220) is only written by `resources/claude-hook.mjs` on a new Stop. These agents stopped before that hook landed, so their state files still say `needs-you` with a turn-end wait, and they will never stop again to rewrite it. The merged-PR check from work-vs-main (W300+) only changes the row label and the clash check. It doesn't touch the agent card.» Expected: «When a work's PR is merged, either by the forge notice or by branch ancestry, the agent card reads **finished · PR merged**. It offers no Go on, adds no "What's mine" chip and counts no wait time. A stale `needs-you` turn-end left by an older hook shouldn't outrank a merged PR.» Repro: «Finish a work, merge its PR on the forge, and leave the agent idle: the card stays at "needs you".»

## Reading

A bug: behaviour already built that goes wrong. Since the issue was filed, work-vs-main landed W309 and W313, so the
window already hides the card of a `merged` work and `stateOf` answers `done` for it. Main does not: `agentState` in
`src/main/status.ts` still reads the stale `needs-you` from the hook's file. So «Up next» (N1, the issue's "What's
mine" bar, built from main's snapshot) keeps a chip per merged work, the status poll counts its wait and fires the
idle reminder (W180), Automático can press «Go on» into it (W206), and the «All agents» card and the work header say
«done» rather than that the PR merged. Owner: `workspaces` (`src/main/status.ts`, `src/main/nextup.ts`,
`src/renderer/components/**`).

## Decision log

### Session 2026-11-27
- Q: Where is «merged outranks the hook» decided? → A: in main's `agentState`, the one reader every main consumer (N1, idle reminder, Automático, notices, `status.list`) goes through; `stateOf` in the window already does it (W313) (assumed; if wrong, each consumer would filter `merged` itself).
- Q: A merged work whose tmux session died: `done` or `stopped`? → A: `done`, the same as W313 «whatever its agent's state», and no «stopped» notice for it; the header's reopen panel (`Workspace.tsx`, read from `alive`) stays as it is (assumed; if wrong, a dead merged work would read «stopped»).
- Q: Does the switch from `needs-you` to `done` caused by the merge send a «finished its turn» notice? → A: no: the forge already sent «merged», and the agent did nothing (assumed; if wrong, one extra notice per merged work).
- Q: What does the card say? → A: «Merged», the label the row already shows (W309), on the «All agents» card and the work header too; no new text «finished · PR merged» (assumed; if wrong, a new key and its Spanish entry).
- Q: A turn end whose last text is a final report reads as finished? → A: not built here: the current hook already writes `done` for a Stop with no question and no open box (W220); only state files from older hooks keep `needs-you`, and a merged PR now outranks them. Reading the report's words in main would be a second W220 that guesses from prose (assumed; if wrong, a stale `needs-you` on an unmerged, finished work stays until its next Stop or its merge).
- Q: (phase 5) How is it built? → A: one check at the top of main's `agentState` (`ws.merged` → `done`), the poll skips the done notice for a merged work, and `StateLabel` takes `merged` (assumed; rejected: filtering `merged` in `nextUp`, the idle timer and Automático one by one; rewriting stale state files to `done`).
- Q: (spec-reviewer) W334 joins two promises on one proof? → A: kept joined; the one test asserts both, the reminder on a manual work and the silence on an Automático one (assumed).
- Q: (spec-reviewer) W336's «no Go on» cannot fail (W313 already hides the card)? → A: dropped from W336; W336 is the label only (assumed).
- Q: (spec-reviewer) W335, only the merge switch or every later turn end? → A: the same code: under W332 a merged work's state never changes again, so W335 reads «while merged, no done notice» (assumed).
- Q: (spec-reviewer) The work's unread `ask`/`idle` notices stored before the merge? → A: out: they are V11's (`avisos`), and entering `done` marks nothing read; they stay until read or removed (assumed; if wrong, an `avisos` delta that expires them on merge).
- Q: (spec-reviewer) How does the real-app drive get a merged work? → A: a temp `ATRIL_HOME` seeded with a record `merged: true` and a state file `needs-you` turn-end; no forge (assumed).
- Q: Does merge detection change? → A: no: W306 (notice) and W307 (ancestry after a new work's fetch) as they are (assumed; the ceilings in work-vs-main's prior decisions still hold).

## Outcomes

- A work whose record is `merged` reads `done` in main whatever its state file says, so `status.list` and every `onChange` carry `done`.
- «Up next» shows no chip for a merged work.
- A merged work gets no idle reminder, Automático sends it nothing, and the merge itself raises no «finished» notice.
- The «All agents» card and the work header of a merged work say «Merged», as its row does, with no «Go on».

## Scope boundaries

**In:** `src/main/status.ts` (`agentState`, the poll's done notice); `src/renderer/components/StateLabel.tsx`
(a `merged` prop), `AgentsOverview.tsx`, `Workspace.tsx`, `WorkspaceList.tsx` (pass it); tests beside each.

**Out:**
- Guessing «finished» from a turn end's words (see the decision log).
- Changing how a merge is detected (W306, W307), or asking the forge on a timer.
- Rewriting stale state files on disk: main reads past them.
- `closed` (not merged) PRs: unchanged.
- A new label text: «Merged» is reused.
- Expiring the work's stored notices on merge (V11, `avisos`).
- The header's reopen panel for a dead merged work.

## Constraints

- W313 already holds in the window; main must agree with it, so the two never disagree on one work.
- No new process per poll: `merged` is on the record `listWorkspaces` already reads.
- Texts through `t()`; no new key.

## Prior decisions

- (2026-11-27, finished-means-finished) A `merged` record outranks the hook's state file and the pause mark in main's `agentState`: it reads `done`, alive or not (assumed; if wrong, a dead merged work would read «stopped»).
- (2026-11-27, finished-means-finished) Becoming `done` because of a merge sends no notice (assumed).
- (2026-11-27, finished-means-finished) Ceilings: a dead merged work still offers reopen in its header (read from `alive`); its `ask`/`idle` notices stored before the merge stay unread (V11) (assumed).
- (2026-11-27, finished-means-finished) No «final report» heuristic: W220 already writes `done` for new Stops. Ceiling: a `needs-you` written by a hook older than W220, on a work that is finished but not merged, keeps reading «needs you» until its next Stop or its merge (assumed).
- (2026-11-27, finished-means-finished) A merged work's card and header say «Merged» (W309's text) (assumed).

## Task breakdown

- `agentState` answers `done` for a merged record.
- The poll sends no notice when a merge makes a work `done`.
- `StateLabel` with `merged`, used by the row, the «All agents» card and the header.

## Verification criteria

- **W332** `agentState` shall answer `done` for a work whose record is `merged`, whatever its state file, its pause mark or its tmux session say.
  Proof: src/main/status.test.ts a merged work is done in main whatever its state file says
- **W333** While a work's record is `merged`, «Up next» (N1) shall hold no `agent` item for it, even when its state file says `needs-you`.
  Proof: src/main/status.test.ts a merged work adds no up-next chip
- **W334** While a work's record is `merged`, the status poll shall send it no idle reminder (W180) and Automático (W205–W207) shall send nothing to its pane, even when its state file says `needs-you`. Ceiling: one test asserts both clauses, the reminder on a manual work and the silence on an Automático one.
  Proof: src/main/status.test.ts a merged work gets no reminder and no automatic answer
- **W335** While a work's record is `merged`, the status poll shall send no «done» notice for it, including on the poll where its record became `merged`.
  Proof: src/main/status.test.ts a merge sends no finished notice
- **W336** While a work's record is `merged`, the «All agents» card and the work header shall show «Merged» in place of its agent state.
  Proof: src/renderer/overview.test.ts a merged work's card and header read Merged

## Approach

### Summary

Main learns what the window learned in W313: a `merged` record reads `done`. One check at the top of `agentState`
makes every main consumer agree (N1's chips, the idle reminder, Automático, `status.list`), the poll stays silent when
that switch is caused by the merge, and `StateLabel` grows a `merged` flag so the «All agents» card and the header say
«Merged» like the row (W309).

### Technical context

TypeScript, Electron main + React 19 renderer, vitest (`pnpm -s test`), gates `typecheck`, `lint`, `test`. Blast
radius: `src/main/status.ts` (two lines), `src/renderer/components/StateLabel.tsx`, `AgentsOverview.tsx`,
`Workspace.tsx`, `WorkspaceList.tsx`; tests in `src/main/status.test.ts` and `src/renderer/overview.test.ts`.
`WorkspaceView` already carries `merged` (`listWorkspaces` spreads the record).

### The approach

- `agentState(ws)`: `if (ws.merged) return 'done'` before the alive and pane checks. `refresh` calls it for every
  work, so `known` holds `done`, `snapshot()` gives `nextUp` no `needs-you` (W333), `waits` is dropped so no reminder
  (W334), and `automatic` returns early for any state but `needs-you` (W334).
- In `refresh`, the `done` notice also requires `!ws.merged` (W335). A merged work never enters `stopped`, so no stop
  notice either.
- `StateLabel({ state, merged })`: with `merged`, the done icon and `t('Merged')`, class `state done`. The row's inline
  ternary (W309) becomes `<StateLabel state={…} merged={w.merged} />`; the overview card and the header pass
  `merged` too. The card itself is already gone: `stateOf` answers `done` (W313), and the card mounts only on
  `needs-you`.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Filter `merged` in `nextUp`, the idle timer and Automático separately | Three checks that can drift; `agentState` is the one reader they share |
| Rewrite stale state files to `done` when a merge is seen | Two writers of the hook's file (main and the hook); the record already says it |
| Guess «finished» from a turn end's last words | A second W220 from prose; W220 already covers new Stops (see Decision log) |

### Risks

| Risk | What catches it |
|---|---|
| A `merged` record set by mistake hides a real wait | Unchanged from W306/W307 (sticky mark); their own proofs bound when it is set |
| The merge-time switch still notifies | W335's test drives needs-you → merged across two polls and asserts no notice; forced red by removing `!ws.merged` |

### Validation and rollback

New tests W332–W336, each seen red before the fix (W332–W334 red without the `agentState` line, W335 red without the
notice guard, W336 red without the `merged` prop). One revert; nothing migrates.

### Complexity deliberately kept

None.

## Checklist

- [x] 1. main reads a merged work as done: W332–W335 tests in `src/main/status.test.ts` seen red, then the `agentState` check and the notice guard in `src/main/status.ts`, gates green · Closes: W332, W333, W334, W335
- [x] 2. «Merged» on the «All agents» card and the header: W336 test in `src/renderer/overview.test.ts` seen red, then `StateLabel`'s `merged` and its three callers, gates green · independent of box 1 · Closes: W336
- [x] 3. Drive the real app (own CDP port and token, `attachVerified`, temp `ATRIL_HOME` seeded with a record `merged: true` and a `needs-you` turn-end state file, no forge): no «Up next» chip, no card, card and header read «Merged»; the project's real-app rule, the unit proofs stay the evidence · waits on boxes 1 and 2 · Closes: none
