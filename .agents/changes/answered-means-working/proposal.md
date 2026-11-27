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
- Q: Which answers turn the work to working? → A: Allow, Deny, and the last question of a question call. Not an answer to a non-final question of a multi-question call (the next one is still due), and not a go-on answer (its own message already fires UserPromptSubmit) (assumed; if wrong, a multi-question call would hide its remaining questions, or a go-on would keep reading needs-you).
- Q: When does it read needs-you again? → A: when the hook writes a wait with another `at` or another kind; a same-second, same-kind wait is not told apart (assumed ceiling; the human latency plus the 500 ms landing poll makes it improbable).
- Q: (phase 5) Which approach? → A: a Map in main keyed by `at` and kind, read by `hookState`, `waitOf` and `answerAgent` (assumed; rejected: the hook writing `working`, marking on keys sent, writing `working` into the state file from main). If wrong, the memory is replaced behind the same three reads.
- Q: (invocation) What did `/libretto-attacca` answer? → A: it carried this document past the stop into phase 6 and the push of the branch plus a PR against main, never a merge; findings of the fresh reader the run acted on are listed under «Reviewer findings acted on» at the end (assumed).

## Outcomes

- After «Allow», «Deny» or the last question of a card lands, the row, the chip, the strip and the sidebar read `working` and show no card, for as long as the approved command runs.
- The first hook write after that (PostToolUse, Stop, a new Notification) takes over again: a new wait reads `needs-you` and notifies as W15 says.
- An answer that did not land, an answer to a question that is not the last, and a go-on answer read as before.

## Scope boundaries

**In:** `src/main/status.ts` (the memory of the answered wait, read by `hookState` and `waitOf`, written by `answerLanded`); new cases in `src/main/status.test.ts`; the criteria in `.agents/specs/workspaces/spec.md`; one line in `CLAUDE.md` under «Untested with real data».

**Out:**
- The hook (`resources/claude-hook.mjs`) and the state file format.
- A new hook event, or reading Claude Code's screen to know the command runs.
- Surviving an Atril restart (the memory is not persisted).
- Anything for an answer typed by hand in the terminal (terminals are read-only, W-terminal; the card is the only path).
- The renderer: it reads main's state and needs no change unless a proof shows otherwise.

## Constraints

- The notification rule (W15, W27) is unchanged: one per entry into needs-you.
- Pause (W86) still outranks everything in `hookState`.
- W199 (subagent behind a stop) and W332 (merged is done) keep their precedence.
- Failing towards asking: when the memory and the file cannot be compared (no numeric `at`), nothing is hidden.

## Prior decisions

- (2026-11-27, answered-means-working) The answered wait is kept in main, keyed by session, `at` and kind; the hook's state file is untouched (assumed). Ceiling: not persisted, so a restart of Atril reads the stale `needs-you` again; a second wait in the same second with the same kind is not told apart; the upgrade is a hook that writes `working` on its own, which has no event to hang on today.
- (2026-11-27, answered-means-working) Only Allow, Deny and the last question mark the wait as answered; go-on and non-final questions do not (assumed).
- (2026-11-27, answered-means-working) W76's «disabling the card until the state changes» is unchanged: the state now changes at once.

## Task breakdown

- Tests first, red: an answered permission reads `working` through `agentState` and `waitOf`; a non-final question and a failed landing keep `needs-you`; a newer wait reads `needs-you` again.
- The memory in `status.ts`, written by `answerLanded` once it returns ok, read by `hookState` and `waitOf`.
- The criteria in the spec, the `CLAUDE.md` line.

## Verification criteria

- **W460** When `answerLanded` (W339) answers `{ ok: true }` to an Allow or Deny, or to the last question of a question call, then main shall read that work's state as `working`, `waitOf` shall return null and `answerAgent` shall refuse a further answer as «no longer waiting» (W75), until the hook's state file carries another `at` or another kind of wait.
  Proof: src/main/status.test.ts an answered card reads working until the hook writes again
- **W461** If the answer did not land (W339's «did not reach the agent»), or answers a question that is not the last of its call (W74), or is a go-on, then main shall not read that wait as answered: `agentState` keeps `needs-you` and `waitOf` keeps its card.
  Proof: src/main/status.test.ts an answer that is not final or did not land keeps the wait
- **W462** When the hook writes a wait with another `at` or kind after W460 took effect, or any state other than `needs-you`, then main shall read the hook's state as written, and a new `needs-you` shall still count as an entry into needs-you for W15.
  Proof: src/main/status.test.ts a newer wait after an answer reads needs-you again

## Approach

### Summary

`answerLanded` remembers `{ at, kind }` of the wait it just answered; `hookState` reads a `needs-you` file that still
carries that `at` and kind as `working`, `waitOf` returns no card for it, and `answerAgent` refuses a second answer to it.
Any other hook write differs in `at` or kind, so the memory stops matching and the file speaks again. One Map, three reads.

### Technical context

Electron main, TypeScript, vitest. `src/main/status.ts`: `hookFile` (line 47) reads the state file, `kindOfWait` (59)
classifies it, `progress` (83) is the existing `at`-keyed memory for multi-question calls and the pattern to copy,
`hookState` (125) feeds `agentState` (176, the row, chip and poller), `waitOf` (134) feeds the card, `answerAgent` (259)
re-reads `needs-you` before typing, `answerLanded` (288) is W339. Tests: `src/main/status.test.ts` (real tmux on its own
socket, `wait(session, …)` writes a hook file, `spied()` gives a runner, `open([...])` a workspace). Gates:
`pnpm -s typecheck`, `lint`, `test`. Blast radius: `src/main/status.ts`, `src/main/status.test.ts`,
`.agents/specs/workspaces/spec.md`, `CLAUDE.md`; `.agents/specs/README.md` is regenerated by `libretto wiki`.

### The approach

1. `const answered = new Map<string, { at: number; kind: WaitKind | undefined }>()` beside `progress`, and
   `isAnswered(session, file)`: the file is `needs-you`, `file.at` is a number equal to the memory's, and `kindOfWait(file)` equals its kind.
2. `answerLanded`: after the landing loop returns `r` (ok), when `before.at` is a number and the answer is final, set
   `answered`. Final: `allow`, `deny`, or an option whose `question + 1 >= questionsOf(file).length` (the file read before the
   keys); never `continue`, never a non-final question. `before` also keeps the kind and the question count.
3. `hookState`: after the pause check, `file.state === 'needs-you' && isAnswered(...)` → `'working'`. `waitOf`: `isAnswered` → `null`.
   `answerAgent`: `isAnswered` → «That agent is no longer waiting for an answer.» (a notice reply «1» must not retype into a running command).
4. Nothing clears the Map: a different `at` or kind simply stops matching (a stale entry is one small object per session).

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| The hook writes `working` itself on the answer | No hook event fires at the grant (issue #11); Atril would have to tell the hook, and the hook is out of scope |
| Mark answered in `answerAgent` (on keys sent) | W339 exists because keys sent is not landed (issue #6); a deaf pane would read `working` |
| Mark by session only, clear on any file change | Needs a watcher or a poll compare; the `at`+kind key is stateless to read and mirrors `progress` |
| Write `working` into the state file from main | Two writers of one file; races the hook's own write and loses the Notification text the card shows |

### Risks

| Risk | What catches it |
|---|---|
| A new wait in the same second with the same kind stays hidden | Named ceiling in Prior decisions; kind differs for the likely case (permission → turn-end), tested in W462 |
| A non-final question hides the next one | W461 case: a two-question call answered at question 0 keeps `needs-you` and its card |
| The answered `working` never ends if the agent dies | The pane-dead path (`stopped`, W53) outranks `hookState` in `agentState`; the next hook write also ends it |
| A test passes for the wrong reason (state already `working`) | Each W460 case first asserts `needs-you` before the answer; the proof is seen red before the code |

### Validation and rollback

Three `it`s in `status.test.ts`, one per criterion, written red first: W460 checks `agentState` and `waitOf` and `answerAgent`
before and after `answerLanded` on a permission (Allow and Deny) and on a one-question call; W461 uses a deaf pane
(landing fails), a two-question call answered at question 0, and `continue`; W462 rewrites the file with a new `at`, a new
kind, and `working`. W460 would pass for the wrong reason if the hook file were already `working`, hence the explicit
`needs-you` assert first. Rollback: one revert, nothing migrates.

### Complexity deliberately kept

The `kind` in the key, not only `at`: a turn-end written in the same second as the answered permission is the likely collision
(an instant command), and the kind tells them apart.

## Reviewer findings acted on

(none yet)

## Checklist

- [ ] the answered-wait memory and its three reads (`hookState`, `waitOf`, `answerAgent`), tests first and red · Closes: W460, W461, W462
- [ ] drive the real app: an answered permission card reads working, the `CLAUDE.md` «Untested» line for what only real Claude Code can show · waits on box 1 · Closes: W460
