# add-subagent-detail

Queued: 2026-11-09
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
