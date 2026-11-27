# answered-means-working

Tracker: none (GitHub issue pausf/atril #11)
Targets: workspaces
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> Fix GitHub issue pausf/atril#11 (gh issue view 11 -R pausf/atril): after a permission or question card is answered and the answer landed (answerLanded, W339), the work must read working, not needs-you, while the approved command runs and until the next hook event. Use criterion ids W460+. Run it through the Libretto flow, open a PR against main and do not merge it.

### The issue, in the reporter's words

- **#11** «In push-guard-heredoc, «Allow» was pressed on a permission card. The answer landed and the command started: Claude Code showed it running, at 55 s. For that whole time, the row, the "What's mine" chip and the state still read **needs you**. No hook fires between the permission grant and the end of the tool, so the state file keeps the `needs-you` that the permission's Notification wrote until PostToolUse arrives.» Expected: «Once a card's answer has landed (W339's check), the work reads **working**. A long approved command (tests, a build check, a push) shouldn't look like the agent is waiting for you.» Repro: «In an automatic work, let the agent ask permission for a command that takes about 60 s, such as the full test suite. Click Allow. The command runs, and the state stays at needs-you until it ends.»

## Reading

A bug: W339 decides when an answer *landed* but nothing records it, so `hookState` and `waitOf` (`src/main/status.ts`)
keep reading the Notification's `needs-you` from the state file until the next hook write. Owner: `workspaces`
(W339, W76, W15). The fix remembers, in main, the wait whose answer landed, and reads that wait as `working`.

## Decision log

### Session 2026-11-27
- Q: Where does «answered» live: in the hook's state file or in main's memory? → A: in main's memory, keyed by session and by the wait's `at` and kind; the hook and its state file stay byte for byte (assumed; if wrong, an Atril restart during the command reads needs-you again until the next hook write, and the state file would need a hook change instead).
- Q: Which answers turn the work to working? → A: Allow and the last question of a question call. Not Deny (Escape interrupts the turn and no Stop follows, so `working` would stick on an agent that sits idle), not a non-final question (the next one is still due), not a go-on (its own message fires UserPromptSubmit) (assumed; if wrong, a deny would read needs-you until the agent speaks, or a multi-question call would hide its remaining questions).
- Q: When does it read needs-you again? → A: when the hook writes a wait with another `at` or another kind, or any other state; a same-second, same-kind wait is not told apart (assumed ceiling; human latency plus the 500 ms landing poll makes it improbable).
- Q: (phase 5) Which approach? → A: a Map in main keyed by `at` and kind, read by `hookState`, `waitOf` and `answerAgent` (assumed; rejected: the hook writing `working`, marking on keys sent, writing `working` into the state file from main). If wrong, the memory is replaced behind the same three reads.
- Q: (invocation) What did `/libretto-attacca` answer? → A: it carried this document past the stop into phase 6 and the push of the branch plus a PR against main, never a merge; the fresh reader's findings the run acted on are listed under «Reviewer findings acted on» at the end (assumed).

## Outcomes

- After «Allow» or the last question of a card lands, the row, the chip, the strip and the sidebar read `working` and show no card, for as long as the approved command runs.
- The first hook write after that (PostToolUse, Stop, a new Notification) takes over again, as W15 and W221 already decide notices on the states main reads.
- An answer that did not land, a Deny, an answer to a question that is not the last, and a go-on read as before.

## Scope boundaries

**In:** `src/main/status.ts` (the memory of the answered wait, read by `hookState`, `waitOf` and `answerAgent`, written by `answerLanded`); new cases in `src/main/status.test.ts`; the criteria and W75's amendment in `.agents/specs/workspaces/spec.md`; one line (under 250 bytes) in `CLAUDE.md` under «Untested with real data».

**Out:**
- The hook (`resources/claude-hook.mjs`) and the state file format.
- A new hook event, or reading Claude Code's screen to know the command runs.
- Surviving an Atril restart (the memory is not persisted).
- Deny: what an Escape-deny produces in Claude Code is unverified, so it reads as before.
- The renderer: it reads main's state and needs no change unless a proof shows otherwise.

## Constraints

- The notification rules (W15, W27, W221) are unchanged: they run on the states main reads, so a new wait after `working` is an entry into needs-you and W221 may still suppress an identical one.
- Pause (W86) still outranks everything in `hookState`; W199 and W332 keep their precedence.
- `CLAUDE.md` stays within W235's 7000 bytes (6627 today).
- Failing towards asking: when the file has no numeric `at`, nothing is hidden.

## Prior decisions

- (2026-11-27, answered-means-working) The answered wait is kept in main, keyed by session, `at` and kind; the hook's state file is untouched (assumed). Ceiling: not persisted, so a restart of Atril reads the stale `needs-you` again; a second wait in the same second with the same kind is not told apart; the upgrade is a hook that writes `working` on its own, which has no event to hang on today.
- (2026-11-27, answered-means-working) Only Allow and the last question mark the wait as answered; Deny, an earlier question and a go-on do not (assumed). Deny is the one to revisit once a real Claude Code shows what follows an Escape-deny.
- (2026-11-27, answered-means-working) W75's «while it is needs-you» now reads the state as main reads it, so an answered wait is not needs-you (W75 amended); W76's «disabling the card until the state changes» is unchanged: the state now changes at once.

## Task breakdown

- Tests first, red: an answered Allow and a last question read `working` through `agentState` and `waitOf`; a second answer is refused; a failed landing, a Deny, an early question and a go-on keep `needs-you`; a newer wait reads `needs-you` again.
- The memory in `status.ts`, written by `answerLanded` once it returns ok and the file still shows the answered wait, read by `hookState`, `waitOf` and `answerAgent`.
- The criteria and W75's amendment in the spec, the `CLAUDE.md` line.

## Verification criteria

- **W460** When `answerLanded` (W339) answers `{ ok: true }` to an Allow, or to the last question of a question call (the one whose index is the count of questions less one), then main shall read that work's state as `working` and `waitOf` shall return null, until the hook's state file carries another `at` or another kind of wait, or a state other than needs-you.
  Proof: src/main/status.test.ts an answered card reads working until the hook writes again
- **W461** While W460 holds, `answerAgent` (W75) shall type nothing and answer «Ese agente ya no está esperando una respuesta.».
  Proof: src/main/status.test.ts an answered card takes no second answer
- **W462** If the answer did not land (W339's «did not reach the agent»), then main shall keep reading the wait as the file says: `agentState` needs-you and `waitOf` with its card.
  Proof: src/main/status.test.ts an answer that did not land keeps the wait
- **W463** When a Deny, an answer to a question that is not the last of its call, or a go-on lands, then main shall keep reading the wait as the file says.
  Proof: src/main/status.test.ts a deny, an early question and a go-on keep the wait
- **W464** When the hook writes a wait with another `at`, or another kind, or a state other than needs-you after W460 took effect, then main shall read the hook's state as written.
  Proof: src/main/status.test.ts a newer wait after an answer reads needs-you again
- **W75** *(amended)* When the window asks `atril:status:answer(workspaceId, choice)`, main shall re-read that workspace's state and, while it is needs-you and its wait is not one whose answer landed (W460), act by the choice: `{ option: n, question: i }` for a stored question i with option n — type n plus one then Enter, and after the last question of the call also Enter to submit; `{ allow: true }` while `kind` is `permission` — type `1` then Enter; `{ deny: true }` while `kind` is `permission` — press Escape; `{ continue: true }` — paste «Sigue con el plan; no hagas nada que no esté en él.» as a bracketed paste then Enter. Any other shape, a stale question index or option, or a state that is not needs-you, shall type nothing and answer «Ese agente ya no está esperando una respuesta.» or «Esa opción ya no existe.»; a gone workspace or pane answers W53's sentence. Main shall remember per session which question is next, starting at 0 on each entry into needs-you.
  Proof: src/main/status.test.ts an answered card takes no second answer

## Approach

### Summary

`answerLanded` remembers `{ at, kind }` of the wait it just answered, when the answer is an Allow or a call's last question and the file still shows that wait; `hookState` reads a `needs-you` file that still carries that `at` and kind as `working`, `waitOf` returns no card for it, and `answerAgent` refuses a second answer to it. Any other hook write differs in `at` or kind, so the memory stops matching and the file speaks again. One Map, three reads.

### Technical context

Electron main, TypeScript, vitest. `src/main/status.ts`: `hookFile` reads the state file, `kindOfWait` classifies it, `progress` is the existing `at`-keyed memory for multi-question calls and the pattern copied, `hookState` feeds `agentState` (the row, chip and poller), `waitOf` feeds the card, `answerAgent` re-reads `needs-you` before typing, `answerLanded` is W339. Tests: `src/main/status.test.ts` (real tmux on its own socket, `wait(session, …)` writes a hook file, `spied()` gives a runner, `open([...])` a workspace). Gates: `pnpm -s typecheck`, `lint`, `test`. Blast radius: `src/main/status.ts`, `src/main/status.test.ts`, `.agents/specs/workspaces/spec.md`, `CLAUDE.md`; `.agents/specs/README.md` is regenerated by `libretto wiki`.

### The approach

1. `const answered = new Map<string, { at: number; kind: WaitKind | undefined }>()` beside `progress`, and `isAnswered(session, file)`: the file is `needs-you`, its `at` equals the memory's and `kindOfWait(file)` equals its kind.
2. `answerLanded` reads the file once before the keys (`asked`); finality is decided from that read, so if the file changes between that read and `answerAgent`'s own, the memory keys on the `at` read first and simply stops matching. After a landing it sets `answered` only when the answer is final (`allow`, or an option whose `question + 1 >= questionsOf(asked).length`; never `deny`, `continue` or an earlier question) and the file it last read still shows the same `at` as needs-you (a hook that already moved on needs no memory).
3. `hookState`: after the pause check, `isAnswered` → `'working'`. `waitOf`: `isAnswered` → `null`. `answerAgent`: `isAnswered` → «That agent is no longer waiting for an answer.»
4. Nothing clears the Map: a different `at` or kind simply stops matching (a stale entry is one small object per session).

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| The hook writes `working` itself on the answer | No hook event fires at the grant (issue #11); Atril would have to tell the hook, and the hook is out of scope |
| Mark answered in `answerAgent` (on keys sent) | W339 exists because keys sent is not landed (issue #6); a deaf pane would read `working` |
| Mark by session only, clear on any file change | Needs a watcher or a poll compare; the `at`+kind key is stateless to read and mirrors `progress` |
| Write `working` into the state file from main | Two writers of one file; races the hook's own write and loses the Notification text the card shows |
| Mark Deny too | An Escape-deny interrupts the turn and no Stop follows, so `working` would stick on an idle agent |

### Risks

| Risk | What catches it |
|---|---|
| A new wait in the same second with the same kind stays hidden | Named ceiling in Prior decisions; the kind differs for the likely case (permission then turn-end), tested in W464 |
| A non-final question hides the next one | W463 case: a two-question call answered at question 0 keeps `needs-you` and its card |
| A Deny or an unforeseen path leaves `working` stuck | Deny is not marked (W463); the pane-dead path (`stopped`) outranks `hookState`; any hook write ends it |
| A test passes for the wrong reason | Each W460 case asserts `needs-you` before the answer; W462 and W463 were forced red by mutation (always mark, mark on failure) before being believed |

### Validation and rollback

Five `it`s in `status.test.ts`, one per criterion. W460 and W464 were red before the code; W461 through W463 guard against over-marking and were forced red by mutation. The go-on case is driven by `answerLanded({ continue: true })` on a `cat` pane, whose echo lands it. Box 2 drives the real app with a hand-written state file and a fake agent pane; what only real Claude Code can show stays in `CLAUDE.md`'s «Untested». Rollback: one revert, nothing migrates.

### Complexity deliberately kept

The `kind` in the key, not only `at`: a turn-end written in the same second as the answered permission is the likely collision (an instant command), and the kind tells them apart.

## Reviewer findings acted on

Cold reader, 7 findings, all acted on:
1. W460 joined three effects and two triggers on one `Proof:` → split: W460 (state, card), W461 (second answer), W462 (not landed), W463 (not final, Deny, go-on), W464 (newer wait), one test each.
2. Deny fires no hook, so `working` would stick → Deny is no longer marked (decision log, Scope «Out», W463, risks table).
3. W462's W15 clause could not fail in its proof → dropped; the notice rules are named under Constraints instead.
4. W462 against W221 and W27 → Constraints say W221 still applies on the states main reads.
5. W75 against W460 → W75 amended here (text above), W76 stays.
6. W461's three negatives under one proof → split into W462 and W463.
7. Which read decides finality → Approach step 2 says the read before the keys.
Box 2's closing outcome and `CLAUDE.md`'s byte ceiling are now stated in the checklist and Scope.

## Checklist

- [x] the answered-wait memory and its three reads (`hookState`, `waitOf`, `answerAgent`), tests first and red · Closes: W460, W461, W462, W463, W464
- [x] drive the real app: a hand-written needs-you permission wait in an automatic work, Allow pressed on its card, the row reads working and no card shows (seen in a photo or a snapshot); add the `CLAUDE.md` «Untested» line (under 250 bytes) for what only real Claude Code can show · waits on box 1 · Closes: W460
