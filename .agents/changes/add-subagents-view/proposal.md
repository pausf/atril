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

## Outcomes

- The flow panel shows the workspace's subagents: what each was asked (its description, or its type
  when none is known), its type, and «trabajando · 1 min 20 s» or «terminado · 45 s».
- The workspace row shows «2 subagentes» while any is running.
- A subagent starting or stopping never changes the workspace's own state (working / needs-you).

## Scope boundaries

**In:** the two hook events, the description from the Agent tool, the list per workspace, the row
count. **Out:** reading a subagent's transcript or output, stopping a subagent from Atril, subagents of
subagents shown as a tree, history past the next prompt.

**Never scoped out:** the hook payload is read once and only the listed fields leave it (as today).

## Constraints

- The hook stays one script; the new events install alongside the five existing ones (W29).
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

- **W62** When Claude Code fires SubagentStart with a non-empty `agent_type` in a workspace's session,
  the hook shall add `{ id: agent_id, type, description?, startedAt }` to
  `$ATRIL_HOME/subagents/<session>.json`, taking `description` (cut to 120 characters) from the oldest
  unpaired PreToolUse of tool `Agent` with that `subagent_type`; SubagentStop with that `agent_id`
  shall set `endedAt`; a SubagentStart or SubagentStop with an empty `agent_type` shall be ignored;
  UserPromptSubmit shall drop every entry with `endedAt`; the file shall keep at most 20 entries,
  dropping the oldest finished first; none of these shall write the workspace's state file.
  Proof: src/main/agent.test.ts the hook keeps the subagents of a session
- **W63** Atril shall install SubagentStart and SubagentStop hooks with the same command as the other
  five, and main shall push a workspace's subagent list to the window whenever its file changes.
  Proof: src/main/agent.test.ts subagent hooks are installed and their list reaches the window

## Approach

### Summary

The hook gains three branches that read-modify-write the session's subagents file with the same
atomic `replace` it uses for activity. Pending Agent descriptions live in the same file under
`pending: { type, description }[]` (at most 20). `agent.ts`' `HOOK_EVENTS` gains the two events.
`src/main/subagents.ts` watches the folder (like `activity.ts`) and emits `atril:subagents:changed`
with `(workspaceId, list)`; `atril:subagents:get(id)` answers the current list. The window keeps a map
per workspace: the FlowPanel shows a «Subagentes» section, the row shows the running count; times
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
| A subagent killed without SubagentStop stays «trabajando» | dropped only when finished; cleared when the workspace is removed; named ceiling |
| Concurrent hook processes writing the same file | atomic rename: last writer wins, an entry may be lost; named ceiling |

### Validation and rollback

W62, W63, F27 seen red first. Rollback: one revert.

### Complexity deliberately kept

None.

## Checklist

- [ ] hook and main: the three hook branches, the two installed events, the watcher and IPC · Closes: W62, W63
- [ ] the window: the Subagentes section and the row count · waits on box 1 · Closes: F27
