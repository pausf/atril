# add-subagent-detail

Tracker: none

Pau, 9 nov: «pero cómo se puede ver el otro subagente lo que hace?» — after add-subagents-view lists them.

- Pau, 9 nov: «¿puedo abrir un modal para ver lo que hace el subagente?» → click a subagent in the
  panel opens a **modal** (sketched in bocetos/fase1-nucleo.html): title = its description, type ·
  state · time, its own activity feed (Leyendo X, Editando Y, Ejecutando Z), live.
  Needs the subagent's PreToolUse/PostToolUse payloads to carry `agent_id` — not documented; verify
  with one real run before the spec (the hook can log which fields arrive, without content).
- When it finishes: its final answer (`last_assistant_message` of SubagentStop), cut and shown as text.
- Fallback if tool payloads carry no `agent_id`: only the final answer, and the main Actividad feed
  keeps showing subagent tool calls mixed with the main agent's (as today).

## Pau, 9 nov, later: «el modal debería ser un terminal que se vea lo que hace el claude del subagente»

Found on disk (Claude Code, undocumented, verify per version):
- `<transcript_path without .jsonl>/subagents/agent-<agent_id>.jsonl`: lines `type: assistant` (content
  `text` / `tool_use` / `thinking`) and `type: user` (`tool_result`), with `timestamp`, `agentId`.
- `agent-<agent_id>.meta.json`: `agentType`, `description`, `toolUseId`, `model`, `finished`.
  → replaces add-subagents-view's pairing-by-order for the description (delete that code).

Design: the modal is a read-only terminal, Claude Code style — `⏺ Tool(arg)`, `⎿` first lines of the
result, the assistant's text, «✻ Pensando…» for thinking (never its content); tailed live while it
runs; local file only, no quota. Ceiling: internal format, may change with Claude Code versions.
