# add-subagents-view

Tracker: none
Targets: workspaces
Durable decisions: the ones in Prior decisions below

## Decision log

### Session 2026-11-09
- Q: Pau, 9 nov: «si claude crea subagentes también estaría bien verlos».
- Q: ¿De dónde salen? → A: de los hooks `SubagentStart`/`SubagentStop` de Claude Code (`agent_id`, `agent_type`) y del PreToolUse de la herramienta `Agent` (`description`, `subagent_type`); documentado en code.claude.com/docs/en/hooks (assumed).
- Q: ¿Se lee el transcript del subagente? → A: no: ni cuota ni contenido, solo los eventos (assumed).
- Q: ¿Cuánto se quedan los terminados? → A: hasta el siguiente mensaje de la persona (UserPromptSubmit), como mucho 20 (assumed).
- Q: ¿Agentes internos de Claude Code (agent_type vacío)? → A: se ignoran (assumed).
- Q: (revisor) ¿El PreToolUse de Agent deja de marcar «trabajando»? → A: no, sigue igual; solo SubagentStart/Stop no tocan el estado (assumed).
- Q: (revisor) ¿Sin subagent_type? ¿Pendientes que nunca emparejan? → A: cuenta como general-purpose; los pendientes caducan a los 10 min (assumed).
- Q: (revisor) ¿Unidades y formato? → A: segundos epoch; «45 s», «1 min 20 s»; terminado muestra la duración (assumed).

## Outcomes

- The flow panel shows the workspace's subagents: what each was asked (its description, or its type
  when none is known), its type, and «trabajando · 1 min 20 s» or «terminado · 45 s».
- The workspace row shows «2 subagentes» while any is running.
- SubagentStart and SubagentStop never change the workspace's own state (working / needs-you); the
  Agent call itself and the subagent's tool calls still count as working, as today.

## Scope boundaries

**In:** the two hook events, the description from the Agent tool, the list per workspace, the row
count. **Out:** reading a subagent's transcript or output, stopping a subagent from Atril, subagents of
subagents shown as a tree, history past the next prompt.

**Never scoped out:** the hook payload is read once and only the listed fields leave it (as today).

## Constraints

- The hook stays one script; the new events install alongside the existing ones in `agent.ts`' `HOOK_EVENTS`.
- Descriptions are text from Claude: shown as text, cut at 120 characters.

## Prior decisions

- **Events only** (assumed): the transcript would cost reading and could leak content.
- **Pairing by order** (assumed): SubagentStart carries no description, so it takes the oldest unpaired
  Agent PreToolUse description of the same `subagent_type`; if none, the type alone is shown.

## Task breakdown

- Hook: SubagentStart/SubagentStop/PreToolUse(Agent) write `$ATRIL_HOME/subagents/<session>.json`;
  UserPromptSubmit drops finished ones.
- Main: watch the folder like activity, push lists per workspace.
- Window: the panel section and the row count.

## Verification criteria

- **W62** When the hook gets a PreToolUse for tool `Agent`, it shall keep its existing state and
  activity writes and also append `{ type: subagent_type or "general-purpose", description (cut to 120
  characters), at }` to `pending` in `$ATRIL_HOME/subagents/<session>.json`; on SubagentStart with a
  non-empty `agent_type` it shall add `{ id: agent_id, type, description?, startedAt }` (epoch seconds),
  taking and removing the oldest pending entry of that type younger than 10 minutes, and dropping
  pending entries older than that.
  Proof: src/main/agent.test.ts a subagent start takes its description
- **W63** On SubagentStop with that `agent_id` the hook shall set `endedAt`; SubagentStart and
  SubagentStop with an empty `agent_type`, or an unknown `agent_id` on stop, shall change nothing; neither
  event shall write the state file or an activity line.
  Proof: src/main/agent.test.ts subagent events never change the agent state
- **W64** On UserPromptSubmit the hook shall drop every finished entry; the file shall keep at most 20
  entries plus 20 pending, dropping the oldest finished entry, then the oldest pending, and never a
  running one (more than 20 running is kept as is).
  Proof: src/main/agent.test.ts the subagent list stays bounded
- **W65** Atril shall install SubagentStart and SubagentStop hooks with the same command as the other
  hook events; main shall answer `atril:subagents:get(workspaceId)` with the entries only (no
  `pending`; `[]` without a file) and send `atril:subagents:changed(workspaceId, entries)` whenever the
  file's content changes, an `endedAt` flip included; removing a workspace deletes its file.
  Proof: src/main/subagents.test.ts the subagent list reaches the window
- **W66** A workspace row shall show «{n} subagentes» («1 subagente») while n > 0 of its entries have
  no `endedAt`, and nothing otherwise.
  Proof: src/renderer/subagents.test.ts the row counts running subagents

## Approach

### Summary

The hook gains three branches that read-modify-write the session's subagents file with the same
atomic `replace` it uses for activity. Pending Agent descriptions live in the same file under
`pending: { type, description }[]` (at most 20). `agent.ts`' `HOOK_EVENTS` gains the two events.
`src/main/subagents.ts` watches the folder (like `activity.ts`) and emits `atril:subagents:changed`
with `(workspaceId, list)`; `atril:subagents:get(id)` answers the current list. The window loads each workspace's list with `get` when its workspaces load and
follows `changed`, in one map per workspace: the FlowPanel shows a «Subagentes» section, the row shows the running count; times
tick once a second only while one runs.

### Technical context

Files: `resources/claude-hook.mjs`, `src/main/{agent,subagents,index}.ts` (+ tests),
`src/preload/{api,index,i18n-en}.ts`, `src/renderer/flow/FlowPanel.tsx` (+ `subagents.test.ts`),
`src/renderer/components/WorkspaceList.tsx`, `mockApi.ts`, styles, both bocetos. F27 lands in
flow-status. Gates: typecheck, lint, test.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Read subagent transcripts for live progress | quota, content, size |
| Derive the list from the activity feed | the feed keeps 200 lines: a long run drops the start |
| Pair by `tool_use_id` | SubagentStart does not carry it (not documented) |

### Risks

| Risk | What catches it |
|---|---|
| Two Agent calls of the same type at once get each other's description | named: pairing by order; at worst a swapped label |
| A subagent killed without SubagentStop stays «trabajando» | the file is deleted with the workspace (W65); named ceiling |
| Concurrent hook processes writing the same file | atomic rename: last writer wins, an entry may be lost; named ceiling |

### Validation and rollback

W62–W66, F27 seen red first. Rollback: one revert.

### Complexity deliberately kept

None.

## Checklist

- [ ] hook and main: the three hook branches, the two installed events, the watcher and IPC · Closes: W62, W63, W64, W65
- [ ] the window: the Subagentes section and the row count · waits on box 1 · Closes: W66, F27
