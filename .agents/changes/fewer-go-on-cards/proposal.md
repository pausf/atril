# fewer-go-on-cards

Tracker: GitHub issues #7 and #5 (pausf/atril) — «Too many 'Finished its turn · Go on' cards». Type: bug (label `dogfood`).
Targets: workspaces
Durable decisions: the six in Prior decisions below

## The ask, verbatim

> Fix GitHub issue #7 (pausf/atril): too many «Ha terminado su turno · Sigue» cards. Today every Claude Code Stop event becomes a needs-you turn-end wait (src/main/status.ts kindOfWait, the hook command in src/main/agent.ts), and the person has to press «Sigue» again and again. Goal: the person only sees a card when the agent really needs them.
>
> What to build:
> 1. Keep going on its own: when the agent tries to stop while its change in .agents/changes/<change>/proposal.md still has open boxes under ## Checklist, and it has no pending question or permission, the Stop hook answers {"decision":"block","reason":"..."} so Claude Code continues by itself. Respect stop_hook_active from the hook input so it never loops forever, and cap it (say 5 blocks in a row per session), after which it falls back to today's card.
> 2. A question written in prose (the last assistant message ends with a question to the person, e.g. «¿Hago push…?») shows as a question card, not a plain «Sigue».
> 3. A finished change (no open boxes, or the agent says it is done) shows as done, not "needs you".
> 4. The same turn end must not notify twice (seen twice in a row in the dev log).
>
> Constraints: no Claude calls from Atril to decide any of this (deterministic rules only); tests first; the hook stays a tiny shell command; update the flow-status/workspaces spec criteria through the Libretto flow. Out: changing Automático's 3-press limit beyond what item 1 needs.

## The ask, verbatim (scope addition, 26 nov, mid-build)

> Scope addition from Pau, in this same change so the two don't collide in status.ts: also fix issue #5. When the agent stops while one of its own background shells is still running (the status line says «1 shell still running»; you did this yourself several times today while waiting for the suite), that stop is not a wait: Claude Code resumes the agent by itself when the shell ends. Atril must show it as working (no card, no «Sigue», no notice), the same way W199 already treats a stop while a subagent runs. Find a deterministic signal (e.g. a run_in_background Bash tool_use in the transcript with no completion yet), add the criterion with its Proof to the contract (ids after your last one), write the test red first, then build it as one more box. Then carry on with the rest of the flow.

## The ask, verbatim (second scope addition, 26 nov, after the work review)

> One more box from Pau, in this same change (same files): whenever a «Sigue» card still shows, it must say WHY the agent stopped and what it needs, in plain words above the button, so the person can tell an important stop from a loop. Deterministic, no Claude calls. At least:
> - the keep-going cap was hit: «Ha parado 5 veces con casillas abiertas: puede estar atascado» (name the box it is on if known);
> - a loop: the same last message (or the same tool error) on 2+ consecutive stops reads «Se repite: parece un bucle» and offers «Pausar» next to «Sigue»;
> - otherwise the agent's own last sentence, quoted, under «Para porque:».
> Add the criteria (ids after your last one) with their Proof, test red first, drive it in the real app, then finish the flow.

## Observed vs expected (issue #7, reporter's words)

- Observed: every Claude Code Stop event becomes a needs-you `turn-end` card. Most are not a real wait: the agent stopped mid-task with open boxes; the agent asks in prose ("Shall I push?") so it shows as a turn end with a plain «Go on»; the same turn end is notified twice in a row (dev log, two works).
- Expected: a card only when the agent really needs the person.

## Decision log

### Session 2026-11-26
- Q: A finished change (no open boxes, no question): a new agent state «terminado», or still `needs-you` with a card without «Sigue»? → A: «No más preguntas» — taken: a new state `done` (assumed: the row stops asking for attention, which is the issue; if wrong, `done` becomes a `needs-you` kind and the renderer pieces go).
- Q: «or the agent says it is done» with boxes still open? → A: (assumed) no phrase list: open boxes keep the agent going (W217) and the cap (W218) brings back the card; a deterministic phrase list would misread «done with phase 2». If wrong: add a phrase rule before W217.
- Q: What is «the same turn end» for item 4? → A: (assumed) the same prompt turn (no `UserPromptSubmit` in between), same kind and same text. The dev log that showed it was not kept, so the cause is unknown; the rule guards the symptom whatever its source. If wrong: narrow to the same hook `at`.
- Q: Does keep-going apply in Manual too? → A: (assumed) yes, in every mode: the ask names no mode and the cards it removes are Manual's.
- Q: (phase 5) Where is a stop classified? → A: (assumed, «No más preguntas») all in the hook, in a new pure `resources/keepgoing.mjs`; main only reads `state`/`kind`. Lost: main classifying `done` from the workspace path (two readers of the same boxes, and the block must be in the hook anyway); the block in `branchsize.mjs`'s style of side claims (a claim file main acts on cannot block a Stop, which is synchronous).
- Q: Which changes count? → A: (assumed) every `.agents/changes/*/proposal.md` of the agent's repo whose `## Checklist` has an open box; the old `tasks.md`/`plan.md` layouts do not (none in flight here).
- Q: (issue #5, Pau) What signal says a background shell still runs? → A: (assumed, read off this session's own transcript) in the transcript tail, a `tool_result` block whose content starts «Command running in background with ID: <id>» with no later user entry whose content starts «<task-notification>» and holds `<task-id><id></task-id>`. Parsed entries only, never raw text: a transcript quoting those strings (this one does) must not count. Lost: the hook tracking `run_in_background` from PreToolUse/PostToolUse into its own file (a second store, and the end of a shell fires no hook event).
- Q: (why-card) Which box is «the box it is on»? → A: (assumed) the first open box of the first change W217 lists, the next one the agent would take; its text after `[ ]`, clipped to 120.
- Q: (why-card) Does a «Sigue» pressed between two stops break a loop? → A: (assumed) no: the count carries across prompts, because pressing «Sigue» on the same answer again is exactly the loop to show.
- Q: (why-card) «Pausar» on a turn end: Escape too? → A: (assumed) no: the agent is already stopped; only the mark is written, so it reads «en pausa» and Automático leaves it.
- Q: (spec-reviewer) V11, W27, W199, W217's bounds, joined proofs, W223's head, W222's rank, other `AgentState` readers? → A: Pau: «Arreglar y construir». V11 amended in `spec-avisos.md` (entering `done` marks nothing read; leaving `done` for any other state does); W27 bounded by W221 and a missing `turn` never matches; W199 covers `done`; the search stops at the repo root (`.git`), every change of the worktree counts (an Atril workspace is one branch), and the reason drops «mark it»; one proof per clause (W225–W227 split out); W223 asserts q exactly; W224 ranks `done` with `working`; F51 for `DocModal`. Accepted: the double notice is not reproduced, so W221 guards the symptom only.

## Outcomes

- An agent whose change still has open boxes and that stops without asking anything keeps going by itself: no card, no notice, the row stays «trabajando». After 5 stops in a row blocked this way, it shows today's «Ha terminado su turno · Sigue» card.
- An agent that ends its turn with a question in prose shows a question card with that question and no buttons (the composer answers), notifies as `ask`, and Automático leaves it to the person.
- An agent that stops with no open boxes and no question reads «terminado»: no card, not in «Siguiente», one `done` notice; Automático presses nothing.
- One turn end gives at most one notice.
- An agent that stops while one of its own background shells still runs reads «trabajando» with the activity «Esperando a una shell en segundo plano»: no card, no notice, no block (issue #5).

## Scope boundaries

**In:** `resources/claude-hook.mjs` and a new `resources/keepgoing.mjs` (box count, prose question, block decision); `src/main/status.ts` (`done` state, dedupe); `src/main/index.ts` (V11 expiry skips `done`); `src/preload/api.ts` (`AgentState` gains `done`); renderer pieces keyed by `AgentState` (`StateLabel`, `Icon`, `agents.ts` order, `styles.css`, `AgentCard` for a question without options); `src/renderer/flow/DocModal.tsx` (F51, in `spec-flow-status.md`); V11 amended in `spec-avisos.md`; read and left as they are: `src/main/flow/document.ts` (`done` is not `working`, so saving is allowed) and `AgentsOverview.tsx` (no card or pause button for `done`); `src/preload/i18n-en.ts` («terminado»); tests; `bocetos/` per CLAUDE.md.

**Out:**
- A background shell started before the transcript tail the hook reads (64 KB), or one stopped without a `<task-notification>`: read as not running / still running respectively (Prior decisions).
- Automático's 3-press limit (W206) — unchanged; it now only meets turn ends from W218's fallback.
- A phrase list for «I am done» (decision log).
- Checklists in `tasks.md`/`plan.md`.
- Any Claude call to classify a stop: rules only.
- The hook command line in `src/main/agent.ts`: unchanged.

## Constraints

- No Claude calls from Atril; the hook decides from its payload, the transcript tail it already reads, and files in the repo.
- The hook command stays `ELECTRON_RUN_AS_NODE=1 <execPath> claude-hook.mjs <Event>`; it must never throw at Claude (existing outer `try`).
- Claude Code's Stop hook contract: stdout `{"decision":"block","reason":"…"}` with exit 0 makes Claude continue with `reason` as its instruction; the payload carries `stop_hook_active: true` when the stop follows a continuation caused by a stop hook, and `cwd`.
- The state file is rewritten whole on every event (atomic rename); any field that must survive (`turn`, `blocks`) is carried from `prev` by the hook.
- Text for Claude (the block reason) is English and never shown; `// i18n-ignore` is not needed in `resources/*.mjs` (not scanned), but «terminado» goes through `t()`.

## Prior decisions

- 2026-11-26 (assumed, decision log): `done` is a fourth agent state, not a `needs-you` kind.
- 2026-11-26 (assumed): no «I'm done» phrase list; open boxes decide.
- 2026-11-26 (assumed): dedupe key is (turn, kind, text) per workspace.
- 2026-11-26 (assumed): keep-going in every mode.
- Ponytail: the prose-question rule looks only at the end of the last assistant text; a rhetorical question at the end reads as a question (it costs one card, never a wrong push). Ceiling: if it misfires often, require the question in the last paragraph outside code fences.
- Ponytail (issue #5): the shell signal reads only the 64 KB tail. Ceiling: a shell started earlier in a long turn is missed and the stop is classified as before (a card, never a lost one); a shell that ends with no `<task-notification>` (Claude Code killed) leaves the row «trabajando» until the next hook event. Upgrade: track starts in the hook's own state.
- Ponytail: the cap is a count of blocks in a row (5), not a progress check; an agent that loops without closing boxes costs 5 extra turns before the card. Upgrade: compare the open-box count between blocks.

## Task breakdown

- Hook: count open boxes per change from `cwd`; detect a prose question; decide block / question / turn-end / done on `Stop`; carry `turn` and `blocks`.
- Main: `done` state, its notice, no expiry on entering it, Automático ignores it; dedupe of identical turn ends.
- Renderer: «terminado» label and icon, order, the option-less question card, the editor's status for `done`.
- Sketch and novedades.

## Verification criteria

- **W197** (amended) When the hook writes `needs-you`, it shall also write `kind`: `question` for a `PreToolUse` of `AskUserQuestion` or a `Stop` under W219, `permission` for a `Notification` with `notification_type` `permission_prompt` or a message starting «Claude needs your permission», and `turn-end` for a `Stop` under W218's fallback; a `Stop` otherwise follows W217 or W220; an idle reminder (`idle_prompt` or «waiting for your input») shall leave `kind` as it was and set `idle: true` (W195). Ceiling: one test walks every event kind, as before this change; the new `Stop` branches have their own proofs below.
  Proof: src/main/agent.test.ts the hook says what kind of wait it is
- **W217** When the hook gets `Stop`, W228, W229 and W219 do not hold, the session has no pause mark (W86), fewer than 5 blocks are in a row (W218), and at least one `.agents/changes/*/proposal.md` under the repo root has an open box, then the hook shall print `{"decision":"block","reason":…}` whose reason names every change with open boxes and its count, and write `state: working` with no `kind`. The repo root is the nearest folder at or above the payload's `cwd` that holds `.git` (a file or a folder); without one, nothing is open. An open box is a line matching `^\s*[-*]\s+\[ \]`, outside a ``` fence, between the `## Checklist` heading and the next `## ` heading.
  Proof: src/main/agent.test.ts a stop with open boxes keeps the agent going
  Proof: src/main/agent.test.ts only open boxes under the checklist of the repo count
- **W218** The hook shall keep `blocks` in the state file, carried across events: `UserPromptSubmit` sets it to 0, a `Stop` whose payload has `stop_hook_active: false` counts from 0 (an absent field carries the count), and each block under W217 adds 1.
  Proof: src/main/agent.test.ts a fresh stop or a prompt restarts the count
- **W225** If a `Stop` would block under W217 but 5 blocks are already in a row, or the session has a pause mark, then the hook shall print nothing and write `needs-you` with `kind: turn-end`, as before this change.
  Proof: src/main/agent.test.ts keeping going stops after five blocks in a row
  Proof: src/main/agent.test.ts a paused agent is never kept going
- **W219** When the hook gets `Stop`, W228 and W229 do not hold, and the newest assistant text in the transcript tail, after removing trailing whitespace and the characters `` *_`"'»”) ``, ends with `?`, the hook shall write `needs-you` with `kind: question`, `text` «Te pregunta: <q>» and `questions: [{ question: q, header: '', options: [], multiSelect: false }]`, where q is that text's last non-empty line with whitespace collapsed, the same characters and a leading `*_` trimmed from both ends, and clipped to 200 characters; it shall not block, whatever boxes are open.
  Proof: src/main/agent.test.ts a question in prose is a question wait
- **W223** While a question wait's due question has no options, the card shall show q exactly as its head, no header and no buttons.
  Proof: src/renderer/components/agentcard.test.tsx a question in prose shows without buttons
- **W226** While a workspace is in Automático, a question wait whose due question has no options shall not be answered by Atril, and Atril shall add one `ask` notice for it (W15).
  Proof: src/main/status.test.ts automatic leaves a question in prose to the person
- **W228** If the hook gets `Stop` while its state file says `needs-you` with `kind` `question` or `permission`, then it shall write `needs-you` with `kind: turn-end`, keeping the stored questions, as before this change: no block, no W219, no `done`.
  Proof: src/main/agent.test.ts the hook keeps every question and what a permission is for
- **W26** (amended) When a Claude hook reports `Stop` for a session, Atril shall set its agent state as W217–W220 and W228 decide (`working`, `needs-you` or `done`; with no checklist and no question, `done`); when it reports `UserPromptSubmit`, to `working`.
  Proof: src/main/status.test.ts stop marks done and prompt submit marks working
- **W87** (amended) When the person resumes a paused workspace, main shall type «Sigue donde lo dejaste.» then Enter into its agent pane and remove the mark; a UserPromptSubmit or a needs-you or done state shall also remove it, except Claude Code's idle reminder (a Notification with `notification_type` idle_prompt or «waiting for your input»), which keeps it; resuming a workspace that is not paused shall answer «Ese agente no está en pausa.» and a gone one N3's message. One test holds a case per clause.
  Proof: src/main/pause.test.ts resuming asks the agent to go on
- **W229** When the hook gets `Stop`, W228 does not hold, and the transcript tail holds a `tool_result` whose content starts «Command running in background with ID: <id>» with no later user entry whose content starts «<task-notification>» and contains `<task-id><id></task-id>`, then the hook shall print nothing and write `state: working` with `waiting: 'shell'`, before W219, W217, W225 and W220 are considered; text that merely quotes those strings (an assistant text, a tool's output) shall not count.
  Proof: src/main/agent.test.ts a stop while a background shell runs is working
- **W230** While a session's state file says `working` with `waiting: 'shell'`, Atril shall show the activity «Esperando a una shell en segundo plano» on top, as W199 does for a subagent, and add no notice.
  Proof: src/main/status.test.ts a stop behind a background shell shows what it waits for
- **W231** When the hook writes W225's fallback because 5 blocks are already in a row (not because of the pause mark), it shall also write `why: 'cap'` and `box`: the text after `[ ]` of the first open box of the first change W217 lists, whitespace collapsed and clipped to 120 characters.
  Proof: src/main/agent.test.ts the keep-going cap names the box it is on
- **W232** On every `Stop` the hook shall write `said`, the last sentence of the newest assistant text (its last non-empty line, whitespace collapsed, split after `.`, `!`, `?` or `…`, the last non-empty piece, clipped to 200), and keep, carried across every event, `fail` (the text of the newest failed-`Bash` line since the previous `Stop`, A-fail), `lastStop: { said, fail }` and `repeat`: the previous `repeat` plus 1 when this stop's `said` is non-empty and equals `lastStop.said`, or its `fail` is non-empty and equals `lastStop.fail`, else 0; each `Stop` then sets `lastStop` to its own pair and clears `fail`.
  Proof: src/main/agent.test.ts stops that repeat themselves are counted
- **W233** For a `turn-end` wait, main shall pass `why` (`loop` when `repeat` ≥ 1, else `cap` when the file says so, with its `box`) and `said` to the card, and the card shall head, first match: `loop` → «Se repite: parece un bucle» with «Pausar» after «Sigue»; `cap` → «Ha parado 5 veces con casillas abiertas: puede estar atascado» and, with a box, «Va por: {box}»; `said` → «Para porque: “{said}”»; otherwise W202's.
  Proof: src/main/status.test.ts the wait carries why the agent stopped
  Proof: src/renderer/components/agentcard.test.tsx a go-on card says why the agent stopped
- **W234** When the person presses «Pausar» on a `turn-end` card, main shall write the pause mark (W86) without sending Escape, so the state reads `paused`; pausing shall still be refused in any other state but `working`.
  Proof: src/main/pause.test.ts a looping turn end pauses without a key
- **W202** (amended) For a `turn-end` without a W233 reason, the card shall show «Ha terminado: {last text}» with «Sigue» (`{ continue: true }`) and focus the composer; while `idle` is true it adds «Lleva un rato esperándote».
  Proof: src/renderer/components/agentcard.test.tsx a turn end offers to continue
- **W220** When the hook gets `Stop` and none of W228, W229, W217, W225 or W219 applies, it shall write `state: done` with the turn's text as today and no `kind`, and remove the pause mark as for `needs-you`.
  Proof: src/main/agent.test.ts a stop with nothing left is done
- **W227** Atril shall report a session whose state file says `done` as `done`, with no wait (`waitOf` null) and outside «Siguiente» (N1), and Automático shall send nothing to it.
  Proof: src/main/status.test.ts a done agent is done, not a wait
- **W199** (amended) While a session is in `needs-you` with `kind` `turn-end`, or in `done`, and its subagents file holds an entry without `endedAt`, Atril shall show it as `working` with the activity «Esperando a un subagente» and add no notice; on the first poll after the last entry ends, the state counts as entering `needs-you` or `done` (W15). Background shells: W229, W230.
  Proof: src/main/status.test.ts a turn end with a subagent still running is working
  Proof: src/main/status.test.ts a done agent waits for its subagents too
- **W15** (amended) When a session enters `needs-you` or `done`, Atril shall add one `ask` or `done` notice (V3) — `done` always for `done` — and show it on the Mac only when `route()` (V10) answers `mac`; no other `ask` or `done` notice for that session until it leaves the state, except W176 and W221; W180's `idle` is a different kind and is allowed.
  Proof: src/main/status.test.ts notifies once per needs-you transition
  Proof: src/main/status.test.ts entering done adds one done notice
- **W27** (amended) When a session leaves `needs-you` or `done` and enters either again, Atril shall notify again, except under W221.
  Proof: src/main/status.test.ts re-entering needs-you notifies again
- **W221** The hook shall keep `turn` in the state file, set to the event's time on `UserPromptSubmit` and carried across every other event. If a session enters `needs-you` or `done` with a `turn` present and equal to, and the same wait kind (or `done`) and text as, the last entry Atril notified for that workspace, then Atril shall add no notice for it; a state without `turn` never matches.
  Proof: src/main/agent.test.ts a prompt starts a turn that every event carries
  Proof: src/main/status.test.ts the same turn end notifies once
- **W222** Wherever an agent's state is shown with `StateLabel`, `done` shall read «terminado» with the `done` icon.
  Proof: src/renderer/components/statelabel.test.tsx a done agent reads terminado
- **W224** «Todos» shall rank `done` equal to `working`, ties by latest activity as for `working` (W81).
  Proof: src/renderer/agents.test.ts done sorts with working

## Approach

### Summary

The Stop hook becomes the one place that classifies a turn end. A pure module, `resources/keepgoing.mjs`, answers two questions from plain inputs: how many open boxes each change has (from the repo folder), and whether the last assistant text ends with a question. The hook combines them with `stop_hook_active`, the pause mark and a carried `blocks` counter into one of four outcomes — block (print the decision, write `working`), prose question, turn-end (fallback), done — and carries `turn` and `blocks` across every write. Main learns one new state, `done`, and one dedupe rule; the renderer learns a label.

### Technical context

- Hook: `resources/claude-hook.mjs` (plain ESM run by Electron as Node, no TS, no deps; imports siblings `summarise.mjs`, `branchsize.mjs` — the resources test checks each import exists). Typings beside them as `*.d.mts` when TS tests import them.
- Tests: `src/main/agent.test.ts` runs the real hook in a real tmux on a test socket (`fireIn`), with `ATRIL_HOME` temp; `src/main/status.test.ts` drives `createStatus` with state files; renderer tests in jsdom with `mockApi`.
- Gates: `pnpm -s typecheck`, `pnpm -s lint`, `pnpm -s test` (maxWorkers 4); never `pnpm build`.
- Blast radius: `resources/claude-hook.mjs`, `resources/keepgoing.mjs` (+ `.d.mts`), `resources/summarise.mjs` (export the full last text), `src/preload/api.ts`, `src/main/status.ts`, `src/main/index.ts` (one line), `src/renderer/components/{StateLabel,Icon,AgentCard}.tsx`, `src/renderer/agents.ts`, `src/renderer/styles.css`, `src/preload/i18n-en.ts`, tests, `bocetos/`. About 12 files.

### The approach

1. `keepgoing.mjs` exports:
   - `openBoxes(cwd)` → `[{ change, open }]`: walk up from `cwd` to the first folder holding `.git` (none → `[]`), read each `.agents/changes/ `*/proposal.md` (`lstat`, regular files only), count lines matching `^\s*[-*]\s+\[ \]` outside ``` fences between `## Checklist` and the next `## `. Errors → `[]`.
   - `proseQuestion(text)` → the clipped last non-empty line when the trimmed text (minus trailing `` *_`"'»”) ``) ends with `?`, else `''`.
   - `decideStop({ open, question, active, blocks, paused })` → `{ outcome: 'block'|'question'|'turn-end'|'done', blocks }`. Order: question → if any open: (paused or blocks≥5 ? turn-end : block) → done. `blocks` restarts at 0 only when `active === false` (an absent field carries the count, so a payload without it still meets the cap).
   - `REASON(change, n)` → English instruction: keep going with the next open box of `.agents/changes/<change>/proposal.md` (n open); if a box cannot be done or you need the person, ask with AskUserQuestion.
2. `summarise.mjs` exports `lastText(tail)` (the unflattened newest assistant text); `lastSaid` uses it.
3. Hook, on `Stop` only: compute the outcome before the state write; for `block`, `stdout.write(JSON.stringify({ decision: 'block', reason }))` and write `{ state: 'working', at, turn, blocks }`; for `question`, `needs-you` with `kind: 'question'`, text «Te pregunta: q», `questions`; for `turn-end`, today's write; for `done`, `{ state: 'done', at, text, turn, blocks }`. Every write carries `turn` (`UserPromptSubmit` sets it to `at`) and `blocks` (`UserPromptSubmit` → 0). The pause mark is removed for `needs-you` and `done`, never for a block.
4. Main: `AgentState` adds `'done'`. `hookState` passes `done` through (after W199's subagent check, which now also covers `done`). `waitOf` stays null (state ≠ needs-you). `createStatus`: `shouldNotify` → entry into `needs-you` or `done`; the notice kind is `done` for `done`; a per-workspace `lastNotified = turn|kind|text` skips an identical entry (W221). `automatic` returns early for anything but `needs-you` — `done` falls through untouched. Prose-question waits already fall out of Automático (`options.length === 0`). `index.ts:868` expires only when `state !== 'needs-you' && state !== 'done'` (V11 amended). `DocModal` says «✎ editable · Claude ha terminado» for `done` (F51).
5. Renderer: `StateLabel` «terminado», `Icon` a check for `done`, `overviewOrder` gives `done` `working`'s rank, `.state.done` colour from an existing token (grey/accent per Grafito; `rg "var(--"` before picking). `AgentCard` already renders a question with zero buttons; the test pins it.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Main classifies `done` from the workspace's folder | Two readers of the boxes; the block must live in the hook (synchronous), so main would duplicate the parser in TS. |
| `done` as a `needs-you` kind | Phase 2 decision: the row would still ask for attention (issue #7). |
| Count blocks in a separate file or tmux option | The state file is already rewritten per event; carrying two fields costs less than a new store. |
| Honour only `stop_hook_active` (never block when true) | Caps at one block per stop chain, so the agent stops again after one extra turn; the ask wants up to 5. |

### Risks

| Risk | What catches it |
|---|---|
| Claude Code's Stop payload lacks `cwd` or `stop_hook_active` in this version | Missing `cwd` → no boxes → `done` (no block, nothing loops); missing `active` → the count carries (only `false` resets it), so the cap still trips; the cap test fires one run without the field. |
| A blocked agent loops forever | W218 cap; test fires 6 Stops with `stop_hook_active: true`. |
| The Libretto stop before code ends in prose without `?` («Dime si sigo.») | It blocks up to 5 times, then the card. Accepted; reason text tells it to use AskUserQuestion. |
| A renderer `Record<AgentState,…>` missed | TS exhaustiveness fails typecheck. Non-Record checks (`=== 'needs-you'`) keep `done` out of «needs you» by construction. |
| Real Claude Code untested (quota) | Listed under «Sin probar con datos reales» in CLAUDE.md. |

### Validation and rollback

New tests (red first): the four hook cases in `agent.test.ts`, three in `status.test.ts`, `statelabel.test.tsx`, the card case. Pass-for-the-wrong-reason traps: the block test must assert stdout JSON **and** `state: working` (a hook that writes working but prints nothing would pass a state-only check); the dedupe test must enter twice through `working` with the same `turn` (a test that never leaves `needs-you` passes without the rule); the cap test must use `stop_hook_active: true` on every Stop after the first. Force red: run the cap test with the cap removed. Rollback: one revert; state files with `done` read as `working` by an older Atril (its `hookState` maps unknown to working).

### Issue #5, added mid-build

`keepgoing.mjs` gains `shellsRunning(tail)`: parse each tail line as JSON (a cut first line is skipped); collect ids from `tool_result` blocks whose string content starts with the background prefix, drop ids named by a user entry whose `message.content` string starts with `<task-notification>` (`<task-id>(id)</task-id>`); true when any is left. The hook checks it on `Stop` right after W228's pending check and writes `{ state: 'working', waiting: 'shell', … }`. `waitingLine` in `status.ts` returns «Esperando a una shell en segundo plano» for that file, beside W199's subagent line; the string goes through `localiseActivity` like W199's.

### Why the card says why (added after the work review)

The hook, which already reads the transcript tail on `Stop`, computes `said` with `lastSentence` in `keepgoing.mjs` and keeps four carried fields (`fail`, `lastStop`, `repeat`, plus `why`/`box` on the cap write). A failed `Bash` PostToolUse sets `fail` from the activity line it already summarises. `waitOf` maps them to `AgentWait.why` and `AgentWait.said`; `AgentCard`'s turn-end branch picks the head and adds «Pausar» (calling `status.pause`) for a loop. `pauseAgent` accepts a `needs-you` `turn-end` and then skips the Escape.

### Complexity deliberately kept

- `turn` and `blocks` carried in every state write: the only per-session memory the hook has between processes.
- Box parsing duplicated in `.mjs` (main has its own in `src/main/flow`): the hook cannot import TS, and it runs as Electron-as-Node without the app bundle.

## Checklist

- [x] Keep going on its own: `keepgoing.mjs` (`openBoxes`, `decideStop`, reason), the hook blocks a `Stop` with open boxes, carries `blocks` and `turn`, stops blocking after 5 or under a pause mark (today's turn-end otherwise) · Closes: W217, W218, W225
- [x] A question in prose: `summarise.mjs` `lastText`, `proseQuestion`, the hook writes a question wait with one option-less question; the card shows it without buttons; Automático leaves it · waits on box 1 · Closes: W219, W223, W226
- [x] Done: the hook writes `state: done` when nothing is open and nothing is asked; `AgentState` `done` through main (state, `done` notice, no V11 expiry, Automático ignores it, out of «Siguiente») and the renderer («terminado», icon, «Todos» order) · waits on box 2 · Closes: W220, W228, W26, W87, W227, W199, W197, W15, W27, W222, W224, V11, F51
- [x] One notice per turn end: main remembers the last notified `turn|kind|text` per workspace and skips an identical entry · waits on box 3 · Closes: W221
- [x] A stop behind a background shell is working: `shellsRunning`, the hook writes `waiting: 'shell'`, main's activity line and its i18n · waits on box 4 · Closes: W229, W230
- [x] Shown in the real app and recorded: drive a fake hook state through `done`, a prose question and a background shell in dev, photo of the window in `bocetos/novedades/`, `bocetos/novedades.html` and `bocetos/fase1-nucleo.html`, the real-Claude check under «Sin probar» in CLAUDE.md · waits on box 5
- [ ] A «Sigue» card says why: the hook's `said`, `repeat`, `fail`, cap `why`/`box`; main's `why`/`said`; the card heads and «Pausar»; `pauseAgent` on a turn end; driven in the real app with its photo and novedades · waits on box 6 · Closes: W231, W232, W233, W234, W202
