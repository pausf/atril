# fewer-go-on-cards

Tracker: GitHub issue #7 (pausf/atril) — «Too many 'Finished its turn · Go on' cards». Type: bug (label `dogfood`).
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

## Observed vs expected (issue #7, reporter's words)

- Observed: every Claude Code Stop event becomes a needs-you `turn-end` card. Most are not a real wait: the agent stopped mid-task with open boxes; the agent asks in prose ("Shall I push?") so it shows as a turn end with a plain «Go on»; the same turn end is notified twice in a row (dev log, two works).
- Expected: a card only when the agent really needs the person.
- Out of this change: the agent waiting on its own background shell (issue #5).

## Decision log

### Session 2026-11-26
- Q: A finished change (no open boxes, no question): a new agent state «terminado», or still `needs-you` with a card without «Sigue»? → A: «No más preguntas» — taken: a new state `done` (assumed: the row stops asking for attention, which is the issue; if wrong, `done` becomes a `needs-you` kind and the renderer pieces go).
- Q: «or the agent says it is done» with boxes still open? → A: (assumed) no phrase list: open boxes keep the agent going (W217) and the cap (W218) brings back the card; a deterministic phrase list would misread «done with phase 2». If wrong: add a phrase rule before W217.
- Q: What is «the same turn end» for item 4? → A: (assumed) the same prompt turn (no `UserPromptSubmit` in between), same kind and same text. The dev log that showed it was not kept, so the cause is unknown; the rule guards the symptom whatever its source. If wrong: narrow to the same hook `at`.
- Q: Does keep-going apply in Manual too? → A: (assumed) yes, in every mode: the ask names no mode and the cards it removes are Manual's.
- Q: (phase 5) Where is a stop classified? → A: (assumed, «No más preguntas») all in the hook, in a new pure `resources/keepgoing.mjs`; main only reads `state`/`kind`. Lost: main classifying `done` from the workspace path (two readers of the same boxes, and the block must be in the hook anyway); the block in `branchsize.mjs`'s style of side claims (a claim file main acts on cannot block a Stop, which is synchronous).
- Q: Which changes count? → A: (assumed) every `.agents/changes/*/proposal.md` of the agent's repo whose `## Checklist` has an open box; the old `tasks.md`/`plan.md` layouts do not (none in flight here).

## Outcomes

- An agent whose change still has open boxes and that stops without asking anything keeps going by itself: no card, no notice, the row stays «trabajando». After 5 stops in a row blocked this way, it shows today's «Ha terminado su turno · Sigue» card.
- An agent that ends its turn with a question in prose shows a question card with that question and no buttons (the composer answers), notifies as `ask`, and Automático leaves it to the person.
- An agent that stops with no open boxes and no question reads «terminado»: no card, not in «Siguiente», one `done` notice; Automático presses nothing.
- One turn end gives at most one notice.

## Scope boundaries

**In:** `resources/claude-hook.mjs` and a new `resources/keepgoing.mjs` (box count, prose question, block decision); `src/main/status.ts` (`done` state, dedupe); `src/main/index.ts` (V11 expiry skips `done`); `src/preload/api.ts` (`AgentState` gains `done`); renderer pieces keyed by `AgentState` (`StateLabel`, `Icon`, `agents.ts` order, `styles.css`, `AgentCard` for a question without options); `src/preload/i18n-en.ts` («terminado»); tests; `bocetos/` per CLAUDE.md.

**Out:**
- Background shells (issue #5).
- Automático's 3-press limit (W206) — unchanged; it now only meets turn ends from W218's fallback.
- A phrase list for «I am done» (decision log).
- Checklists in `tasks.md`/`plan.md`.
- Any Claude call to classify a stop: rules only.
- The hook command line in `src/main/agent.ts`: unchanged.
- `flow-status`: it governs `src/main/flow/**`, which this change does not touch; nothing to amend there.

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
- Ponytail: the cap is a count of blocks in a row (5), not a progress check; an agent that loops without closing boxes costs 5 extra turns before the card. Upgrade: compare the open-box count between blocks.

## Task breakdown

- Hook: count open boxes per change from `cwd`; detect a prose question; decide block / question / turn-end / done on `Stop`; carry `turn` and `blocks`.
- Main: `done` state, its notice, no expiry on entering it, Automático ignores it; dedupe of identical turn ends.
- Renderer: «terminado» label and icon, order, the option-less question card.
- Sketch and novedades.

## Verification criteria

- **W197** (amended) When the hook writes `needs-you`, it shall also write `kind`: `question` for a `PreToolUse` of `AskUserQuestion` or a `Stop` under W219, `permission` for a `Notification` with `notification_type` `permission_prompt` or a message starting «Claude needs your permission», and `turn-end` for a `Stop` under W218's fallback; a `Stop` otherwise follows W217 or W220; an idle reminder (`idle_prompt` or «waiting for your input») shall leave `kind` as it was and set `idle: true` (W195).
  Proof: src/main/agent.test.ts the hook says what kind of wait it is
- **W217** When the hook gets `Stop`, W219 does not hold, the session has no pause mark (W86), fewer than 5 blocks are in a row (W218), and some `.agents/changes/*/proposal.md` in the nearest folder at or above the payload's `cwd` that holds `.agents/changes` has at least one open box (a line matching `^\s*[-*]\s+\[ \]` outside a ``` fence) between its `## Checklist` heading and the next `## ` heading, then the hook shall print `{"decision":"block","reason":…}` whose reason names that change and its open-box count, and write `state: working` with no `kind`.
  Proof: src/main/agent.test.ts a stop with open boxes keeps the agent going
- **W218** The hook shall keep `blocks` in the state file, carried across events: `UserPromptSubmit` sets it to 0, a `Stop` whose payload has `stop_hook_active: false` counts from 0 (an absent field carries the count), and each block under W217 adds 1. If a `Stop` would block under W217 but 5 blocks are already in a row, or the session has a pause mark, then the hook shall print nothing and write `needs-you` with `kind: turn-end`, as before this change.
  Proof: src/main/agent.test.ts keeping going stops after five blocks in a row
- **W219** When the hook gets `Stop` and the newest assistant text in the transcript tail, after removing trailing whitespace and the characters `` *_`"'»”) ``, ends with `?`, the hook shall write `needs-you` with `kind: question`, `text` «Te pregunta: <q>» and `questions: [{ question: q, header: '', options: [], multiSelect: false }]`, where q is that text's last non-empty line with whitespace collapsed and clipped to 200 characters; it shall not block.
  Proof: src/main/agent.test.ts a question in prose is a question wait
- **W223** While a question wait's due question has no options, the card shall show the question as its head and no buttons; Automático shall not answer it and Atril shall add an `ask` notice as for any question (W15).
  Proof: src/renderer/components/agentcard.test.tsx a question in prose shows without buttons
  Proof: src/main/status.test.ts automatic leaves a question in prose to the person
- **W220** When the hook gets `Stop` and none of W217, W218's fallback or W219 applies, it shall write `state: done` with the turn's text as today and no `kind`, and remove the pause mark as for `needs-you`. Atril shall report a session whose state file says `done` as `done` (W199's running-subagent rule makes it `working` as for a turn end), with no wait (`waitOf` null), outside «Siguiente» (N1), and Automático shall send nothing to it.
  Proof: src/main/agent.test.ts a stop with nothing left is done
  Proof: src/main/status.test.ts a done agent is done, not a wait
- **W15** (amended) When a session enters `needs-you` or `done`, Atril shall add one `ask` or `done` notice (V3) — `done` always for `done` — and show it on the Mac only when `route()` (V10) answers `mac`; no other `ask` or `done` notice for that session until it leaves the state, except W176; W180's `idle` is a different kind and is allowed; entering `done` shall not mark that session's notices read (V11 applies when it leaves `needs-you` for any state but `done`).
  Proof: src/main/status.test.ts notifies once per needs-you transition
  Proof: src/main/status.test.ts a done agent is done, not a wait
- **W221** The hook shall keep `turn` in the state file, set to the event's time on `UserPromptSubmit` and carried across every other event. If a session enters `needs-you` or `done` with the same `turn`, wait kind (or `done`) and text as the last entry Atril notified for that workspace, then Atril shall add no notice for it.
  Proof: src/main/status.test.ts the same turn end notifies once
- **W222** Wherever an agent's state is shown with `StateLabel`, `done` shall read «terminado» with its own icon, and «Todos» shall order it with `working`.
  Proof: src/renderer/components/statelabel.test.tsx a done agent reads terminado

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
   - `openBoxes(cwd)` → `[{ change, open }]`: walk up from `cwd` to the first folder holding `.agents/changes` (stop at `/` or a folder with `.git`), read each `*/proposal.md` (`lstat`, regular files only), count lines matching `^\s*[-*]\s+\[ \]` outside ``` fences between `## Checklist` and the next `## `. Errors → `[]`.
   - `proseQuestion(text)` → the clipped last non-empty line when the trimmed text (minus trailing `` *_`"'»”) ``) ends with `?`, else `''`.
   - `decideStop({ open, question, active, blocks, paused })` → `{ outcome: 'block'|'question'|'turn-end'|'done', blocks }`. Order: question → if any open: (paused or blocks≥5 ? turn-end : block) → done. `blocks` restarts at 0 only when `active === false` (an absent field carries the count, so a payload without it still meets the cap).
   - `REASON(change, n)` → English instruction: keep going with the next open box of `.agents/changes/<change>/proposal.md` (n open); if you need the person, ask with AskUserQuestion; if a box cannot be done, say why and mark it.
2. `summarise.mjs` exports `lastText(tail)` (the unflattened newest assistant text); `lastSaid` uses it.
3. Hook, on `Stop` only: compute the outcome before the state write; for `block`, `stdout.write(JSON.stringify({ decision: 'block', reason }))` and write `{ state: 'working', at, turn, blocks }`; for `question`, `needs-you` with `kind: 'question'`, text «Te pregunta: q», `questions`; for `turn-end`, today's write; for `done`, `{ state: 'done', at, text, turn, blocks }`. Every write carries `turn` (`UserPromptSubmit` sets it to `at`) and `blocks` (`UserPromptSubmit` → 0). The pause mark is removed for `needs-you` and `done`, never for a block.
4. Main: `AgentState` adds `'done'`. `hookState` passes `done` through (after W199's subagent check, which now also covers `done`). `waitOf` stays null (state ≠ needs-you). `createStatus`: `shouldNotify` → entry into `needs-you` or `done`; the notice kind is `done` for `done`; a per-workspace `lastNotified = turn|kind|text` skips an identical entry (W221). `automatic` returns early for anything but `needs-you` — `done` falls through untouched. Prose-question waits already fall out of Automático (`options.length === 0`). `index.ts:868` expires only when `state !== 'needs-you' && state !== 'done'`.
5. Renderer: `StateLabel` «terminado», `Icon` a check for `done`, `overviewOrder` rank 1, `.state.done` colour from an existing token (grey/accent per Grafito; `rg "var(--"` before picking). `AgentCard` already renders a question with zero buttons; the test pins it.

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

### Complexity deliberately kept

- `turn` and `blocks` carried in every state write: the only per-session memory the hook has between processes.
- Box parsing duplicated in `.mjs` (main has its own in `src/main/flow`): the hook cannot import TS, and it runs as Electron-as-Node without the app bundle.
