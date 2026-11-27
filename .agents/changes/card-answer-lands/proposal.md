# card-answer-lands

Tracker: none (GitHub issue pausf/atril #6)
Targets: workspaces
Durable decisions: the five in Prior decisions below

## The ask, verbatim

> Fix GitHub issue pausf/atril#6 (gh issue view 6 -R pausf/atril). A tall question or permission card must never shrink the embedded terminal so far that Atril resizes the agent tmux window below a usable height (it went to 90x1 and Claude Code ignored the answer). The card scrolls inside itself; the terminal keeps a minimum height; Atril never resizes a tmux window under a floor of rows. And a card answer reads Sent only once the agent left the prompt; if the prompt is still there after a few seconds, the card says the answer did not arrive and offers to send it again. Run it through the Libretto flow, drive it in the real app, open a PR against main and do not merge it.

### The issue, in the reporter's words

- **#6** «The agent asked to run a long command, `gh pr create` with its whole PR body inline. The permission card grew so tall that it covered the terminal pane. The embedded terminal then fitted itself to the space left, and the agent's tmux window was resized to **90x1**. From then on, clicking **Allow** on the card showed **Sent**, but Claude Code's option selector never took the answer, and clicking again did nothing.» Expected: «A tall card scrolls inside itself. It never pushes the terminal under a minimum size, and Atril never resizes an agent's tmux window below a usable height (for example 10 rows). **Sent** is shown only once the agent has left the prompt. If the prompt is still on screen after a few seconds, the card says the answer didn't arrive and offers to send it again.» Repro: «Have an agent ask to run a command whose text is about 3 KB … Open that work: the card fills the centre and the pane reads `pane_height = 1`. Click **Allow**: the card reads **Sent**, but the prompt stays.»

## Reading

A bug, in two places. (1) Layout: `.term-ask` (the strip above the terminal, `Workspace.tsx`) has no rule, so as a
flex item of `.pane` it never shrinks below its content, while `.xterm-host` has `min-height: 0` and takes what is
left — down to one row. `Terminal.tsx`'s ResizeObserver then fits xterm and sends `term:resize`, and `pty.resize`
passes the rows to the attached tmux client unchanged, so the agent's window becomes 90x1. (2) Feedback:
`answerAgent` answers `{ ok: true }` as soon as `send-keys` returns 0, which says the keys were written, not that
Claude Code took them. Owner: `workspaces` (`src/main/pty.ts`, `src/main/status.ts`, `src/main/index.ts`,
`src/renderer/components/AgentCard.tsx`, `src/renderer/styles.css`).

## Decision log

### Session 2026-11-27
- Q: What is the row floor? → A: 10 rows, the issue's own example, applied in main to both `attach` and `resize` of the read-only tmux client (assumed; if wrong, one constant).
- Q: A column floor too? → A: no: the issue saw rows go to 1, columns stayed 90 (assumed; if wrong, the same clamp on `cols`).
- Q: How tall does the terminal stay in the window? → A: `.xterm-host` keeps `min-height: 180px` (about ten 12.5 px rows plus padding) and the strip above it scrolls (`min-height: 0; overflow-y: auto`) (assumed; if wrong, one CSS value).
- Q: What does «the agent left the prompt» mean, read by main? → A: after the keys go, the hook's state file moved on (state no longer `needs-you`, or a new `at`), or the pane's visible text (`capture-pane -p`) differs from what it was just before the keys (assumed; if wrong, main would have to recognise Claude Code's prompt text, which changes between releases).
- Q: How many seconds is «a few»? → A: checked every 500 ms for up to 4 s (assumed; if wrong, two constants).
- Q: Which senders wait for that? → A: only the card's answer (`atril:status:answer`); Automático (W205–W207) and the numbered Mac reply (N3) still call `answerAgent` and do not wait (assumed; if wrong, Automático's poll would block 4 s per answer).
- Q: What does the card show while it waits? → A: «Sending…» with its buttons disabled, so a second click cannot send twice (assumed).
- Q: (phase 5) How is «landed» checked? → A: a wrapper `answerLanded` in main around `answerAgent`, used only by the card's IPC handler: snapshot hook `at` and pane text, send, poll both (assumed; rejected: the window polling `status.wait` after an immediate ok; matching Claude Code's prompt text in the pane).
- Q: (spec-reviewer) W340 contradicts W76's «show «Enviado»» on press? → A: W76 is amended here: «Enviado» once main confirms (W339), «Sending…» until then (assumed).
- Q: (spec-reviewer) A pane that changes on its own (a timer, a spinner) reads as landed? → A: yes, reading A kept and named as a ceiling; Claude Code draws nothing moving while it waits at a prompt (assumed; if wrong, the check must compare only the prompt's lines).
- Q: (spec-reviewer) The row's card and the strip's card show one wait; the one not pressed could send again during the 4 s? → A: main refuses a second card answer to a work while one is still landing, with «An answer to that agent is already on its way.»; the `ANSWERED` event (next question in the other card) fires after main's answer, as today (assumed).
- Q: (spec-reviewer) In a window too short for both, which side wins? → A: the terminal keeps 180 px and the strip keeps 64 px (one option, scrolling); what does not fit is cut by `.pane`'s `overflow: hidden`, and main's floor (W338) still holds (assumed).
- Q: (spec-reviewer) Does «Pausar» (W294) go through the wait? → A: no: it is `pauseAgent`, not a card answer; it keeps its immediate answer (assumed).
- Q: (real-app drive) A 3 KB command pushed «Permitir» and the «did not arrive» problem below the strip's fold: is that in scope? → A: yes: the question text scrolls in its own box of 8 lines (`.term-ask .ask-q`), W337 grows that clause; the row's card in the sidebar is still out (assumed).
- Q: (real-app drive) At 800 px the «did not arrive» problem landed under the strip's fold → A: the card scrolls the problem into view when it appears (W340) (assumed).
- Q: «offers to send it again»? → A: the existing error shape (`Problem` with «Try again», W76), which presses the same choice again; the sentence is «The answer did not reach the agent: its prompt is still on screen.» (assumed).

## Outcomes

- A tall question or permission card above the terminal scrolls inside itself; the terminal below keeps at least 180 px.
- Whatever size the window asks for, main never attaches or resizes an agent's tmux client below 10 rows.
- A card answer reads «Sent» only once the agent's hook state moved on or its pane changed after the keys; until then the card reads «Sending…» with its buttons disabled.
- If neither happened 4 s after the keys, the card says the answer did not reach the agent and offers «Try again», which sends the same choice again.

## Scope boundaries

**In:** `src/renderer/styles.css` (`.term-ask`, `.xterm-host`); `src/main/pty.ts` (the row floor); `src/main/tmux.ts`
(read a pane's text); `src/main/status.ts` (`answerLanded`, wrapping `answerAgent`); `src/main/index.ts` (the
`atril:status:answer` handler); `src/renderer/components/AgentCard.tsx` («Sending…»); `src/preload/i18n-es.ts`;
tests beside each.

**Out:**
- Recognising Claude Code's prompt by its text.
- Automático and the numbered Mac reply waiting for the answer to land.
- A column floor.
- The row's card and the «All agents» card layout (they are not above a terminal).
- Resizing an already-squeezed tmux window back up: the next fit after this change sends ≥ 10 rows anyway.

## Constraints

- tmux's window follows the attached read-only client's size; nothing else resizes it from Atril.
- `answerAgent` stays as it is: W75's proofs, Automático and N3 rely on its immediate answer.
- No new process per poll; the extra `capture-pane` calls happen only during a card answer (at most 9).
- Texts through `t()` with Spanish entries; colours untouched.
- An IPC handler never throws (W149).

## Prior decisions

- (2026-11-27, card-answer-lands) Main floors the read-only tmux client at 10 rows on attach and resize; columns pass as asked (assumed; if wrong, one constant, or the same clamp on columns).
- (2026-11-27, card-answer-lands) The terminal keeps 180 px and the strip above it scrolls (assumed).
- (2026-11-27, card-answer-lands) «Landed» = the hook's state file moved on, or the pane text changed, within 4 s (every 500 ms) after the keys. Ceiling: a key that changes the pane without leaving the prompt (text left typed in Claude Code's input, a cursor that moved), or a pane that changes on its own (a timer), reads as landed; the upgrade is reading Claude Code's prompt from the pane, which ties Atril to its wording (assumed).
- (2026-11-27, card-answer-lands) While a card answer to a work is landing, main refuses another one to it; the strip keeps 64 px in a window too short for both (assumed).
- (2026-11-27, card-answer-lands) Only the card's answer waits; Automático and N3 keep `answerAgent`'s immediate answer (assumed).

## Task breakdown

- CSS: the strip scrolls, the terminal keeps its height.
- Main: the row floor in `pty.attach` and `pty.resize`.
- Main: `paneText` in `tmux.ts` and `answerLanded` in `status.ts`; the IPC handler uses it.
- Window: «Sending…» and disabled buttons while the answer is on its way; the new error reaches the existing «Try again».

## Verification criteria

- **W337** The strip above the terminal (`.term-ask`) shall shrink down to `min-height: 64px` and scroll with `overflow-y: auto`, and the terminal (`.xterm-host`) shall keep `min-height: 180px`; inside the strip, the card's question text (`.term-ask .ask-q`) shall scroll on its own past `max-height: 8lh`, so its buttons and a problem stay in view under it. Ceiling: the proof reads the rules from `styles.css`; the layout they produce is watched in the real-app drive (box 5).
  Proof: src/renderer/quickreplies.test.ts a tall card scrolls inside itself and the terminal keeps its height
- **W338** Main shall attach and resize an agent's read-only tmux client with at least 10 rows, whatever rows the window asks for; columns pass unchanged.
  Proof: src/main/pty.test.ts the tmux client never goes under ten rows
- **W339** When the window answers a card (`atril:status:answer`) and `answerAgent` (W75) sent the keys, main shall answer `{ ok: true }` only once, within 4 s, the work's hook state file is no longer `needs-you` or carries a new `at`, or its pane's visible text differs from the text read just before the keys; if neither happens, main shall answer «The answer did not reach the agent: its prompt is still on screen.». A refusal from `answerAgent` passes through unchanged. If a card answer to the same work is still landing, main shall send nothing and answer «An answer to that agent is already on its way.».
  Proof: src/main/status.test.ts a card answer counts only once the agent leaves the prompt
- **W340** While a card answer is on its way, the card shall show «Sending…» and disable its buttons and number keys; when main says the answer did not arrive, the card shall show that sentence with «Try again», scrolled into view within its strip, and «Try again» shall send the same choice again.
  Proof: src/renderer/components/agentcard.test.tsx the card says sending until the answer lands and offers to send again
- **W76** (amended) While a workspace is needs-you, its row and the strip above its terminal shall show one card by `kind` (W200–W202) instead of today's quick replies; pressing a button, by mouse or with keys 1–4 while the card has focus, shall send it (W75, through W339) and show «Sending…» (W340) until main answers, then «Enviado», disabling the card until the state changes, or show the error and keep it live.
  Proof: src/renderer/components/agentcard.test.tsx the card says sending until the answer lands and offers to send again

## Approach

### Summary

Two independent fixes. The layout stops squeezing the terminal (two CSS rules) and main refuses to shrink the tmux
client below 10 rows (a clamp in `pty.ts`), so the 90x1 window cannot happen again. And the card's answer becomes a
promise main keeps: `answerLanded` wraps `answerAgent`, then watches the hook's state file and the pane until the
agent visibly moved, or gives up after 4 s with a sentence the card already knows how to show with «Try again».

### Technical context

TypeScript, Electron main + React 19 renderer, vitest (`pnpm -s test`), gates `typecheck`, `lint`, `test`. Main tests
in `status.test.ts` run a real tmux on their own socket (`tmuxSock()`), so a pane running `cat` echoes keys and a pane
running `stty -echo; sleep` does not — the two cases W339 needs, with no fake of Claude Code. `pty.test.ts` mocks
`node-pty`. Blast radius: `src/renderer/styles.css`, `src/main/pty.ts`, `src/main/tmux.ts`, `src/main/status.ts`,
`src/main/index.ts` (one line), `src/renderer/components/AgentCard.tsx`, `src/preload/i18n-es.ts`; tests in
`quickreplies.test.ts`, `pty.test.ts`, `status.test.ts`, `agentcard.test.tsx`.

### The approach

- CSS: `.term-ask { min-height: 64px; overflow-y: auto; }` — a flex item of `.pane` (column) that may shrink below its
  content down to 64 px and scrolls; `.xterm-host` `min-height: 0` → `180px`, so flex gives the terminal its 180 px first.
- `pty.ts`: `const MIN_ROWS = 10`; `attach` spawns with `Math.max(rows, MIN_ROWS)` and `resize` calls
  `resize(cols, Math.max(rows, MIN_ROWS))`. xterm in the window may then show fewer rows than the client has; with
  W337 that only happens in a window shorter than the terminal's 180 px.
- `tmux.ts`: `paneText(paneId, run)` = `capture-pane -p -t paneId` stdout, `''` on failure.
- `status.ts`: `answerLanded(id, choice, run, { tries = 8, every = 500 })`: resolve the workspace; read hook `at` and
  `paneText` before; `r = await answerAgent(...)`; refusal → return it; then up to `tries` times wait `every` ms and
  return `r` as soon as the hook file's `state !== 'needs-you'` or its `at` changed, or `paneText` differs; otherwise
  the W339 sentence. A module-level `Set` of work ids being landed refuses a second call for the same id (removed in a
  `finally`). The test passes small `every`.
- `index.ts`: `atril:status:answer` calls `answerLanded` instead of `answerAgent`.
- `AgentCard.tsx`: three states of `result`: `null` (idle, buttons live); `{ sent: false, text: '' }` (pending, set on
  press: «Sending…», buttons and number keys disabled); `{ sent: true, text: 'Sent' }` after main's ok. The
  `ANSWERED` event still fires after main's ok, so the other card moves on after the wait. «Pausar» (`pauseAgent`)
  shares `press()` and the pending state but not the wait. The error path (Problem +
  «Try again» pressing the same choice) is unchanged and now also receives W339's sentence.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| The window polls `status.wait` after an immediate ok and decides | Two round trips per check, and the pane text is only readable in main |
| Recognise Claude Code's prompt («Do you want to proceed?», the `❯ 1.` selector) in the pane | Ties Atril to Claude Code's wording, which changes between releases |
| Wait inside `answerAgent` itself | Automático's poll and N3 would block 4 s per answer, and W75's proofs would change |
| Only the CSS fix | A window simply shorter than 10 rows (a small screen, a dragged divider) would still squeeze tmux |

### Risks

| Risk | What catches it |
|---|---|
| A keypress that changes the pane but leaves the prompt reads «Sent» | Accepted, named as the ceiling in Prior decisions |
| An agent slower than 4 s to react reads «did not arrive», and «Try again» sends a second `1` | The hook's `at` usually moves within a second (PostToolUse); a second `1`+Enter into a working Claude Code is typed into its input, visible in the terminal. Accepted |
| The clamp breaks the attach (W160) or the dead-client rule (W149) | `pty.test.ts`'s existing cases stay green beside the new one |

### Validation and rollback

New tests: W337 (CSS rules read from `styles.css`), W338 (mocked node-pty sees ≥ 10 rows on attach and resize), W339
(real tmux: `cat` pane lands; `stty -echo` pane gives the sentence; a hook file that moves on lands; a refusal passes
through), W340 (card with a slow `answer` mock shows «Sending…» and disabled buttons; a W339 error shows «Try again»
and a click calls `answer` again with the same choice). Each seen red before its fix. W339's «lands» cases would pass
for the wrong reason if `answerLanded` returned ok unconditionally: the `stty -echo` case is the one that has to be
red first. Then the real app is driven. One revert; nothing migrates.

### Complexity deliberately kept

`answerLanded` is a second entry beside `answerAgent` rather than a flag on it: Automático and N3 must stay immediate.

## Checklist

- [x] 1. The terminal keeps its height: W337 test in `src/renderer/quickreplies.test.ts` seen red, then the `.term-ask` and `.xterm-host` rules in `src/renderer/styles.css`, gates green · independent · Closes: W337
- [x] 2. The tmux client never goes under 10 rows: W338 test in `src/main/pty.test.ts` seen red, then the clamp in `attach` and `resize` of `src/main/pty.ts`, gates green · independent · Closes: W338
- [x] 3. A card answer counts only once it lands: W339 test in `src/main/status.test.ts` seen red (the `stty -echo` case first), then `paneText` in `src/main/tmux.ts`, `answerLanded` in `src/main/status.ts`, the `atril:status:answer` handler in `src/main/index.ts` and the sentence's Spanish entry, gates green · independent · Closes: W339
- [x] 4. The card says «Sending…» and offers to send again: W340 test in `src/renderer/components/agentcard.test.tsx` seen red, then the pending state in `AgentCard.tsx` and «Sending…» in `src/preload/i18n-es.ts`, gates green · independent of box 3 (the card only sees an error sentence) · Closes: W340, W76
- [x] 5. Drive the real app (own CDP port and token, `attachVerified`, temp `ATRIL_HOME`, a fake `SHELL`/`claude` so no quota): a work whose state is a permission wait with a ~3 KB summary shows a scrolling card, the terminal keeps its height and `tmux display -p '#{pane_height}'` reads ≥ 10 with the window made short; pressing «Allow» on a pane that ignores input reads «Sending…» then the «did not arrive» problem with «Try again»; the project's real-app rule, and the layout check W337's ceiling names · waits on boxes 1–4 · Closes: none
