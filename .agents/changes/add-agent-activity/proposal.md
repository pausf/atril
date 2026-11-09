Tracker: none
Queued: 2026-11-09

# add-agent-activity

## The ask, verbatim

Pau, 9 nov 2026:

> Podemos mejorar la terminal para ver lo que dice Claude, porque ahora mismo solamente dice trabajo terminado, no sé qué es cuánto. Molaría un poco más de feedback, ¿sabes? También aparte del que hay,

## The reading

Not a bug: today Atril's Claude hook drains the hook payload and keeps only working /
needs-you, so the person sees a state word and a bare notification. Wanted: more feedback
about what the agent is doing, **in addition to** the terminal.

Sources Claude Code already gives every hook: the Notification `message`, PreToolUse /
PostToolUse `tool_name` + `tool_input` (file, command), and `transcript_path` (the JSONL with the
agent's last words). Candidate shape: a per-workspace activity feed («Leyendo…», «Editando…»,
«Ejecutando tests… 12 en verde», «Claude dice: …»), the real message in the macOS notification,
and the last action on the workspace row. Privacy: the payload can carry prompt text and file
contents — keep only short summaries, locally, never the full input.
