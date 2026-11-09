Tracker: none
Targets: workspaces
Durable decisions: the ones in Prior decisions below

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

## Decision log

### Session 2026-11-09
- Q: «No le preguntes, tú sigue» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Cómo lee el hook el JSON sin node ni jq en el PATH? → A: con el propio Electron de Atril como Node (`ELECTRON_RUN_AS_NODE=1 <execPath> claude-hook.mjs`), comprobado 9 nov (assumed).
- Q: ¿Dónde se ve la actividad? → A: pestañas «Libretto | Actividad» en el panel derecho, y la última línea en la fila de cada trabajo (assumed).
- Q: ¿Qué se guarda? → A: solo una línea de resumen por evento (≤ 200 caracteres), nunca el payload: de Edit/Write solo la ruta, del prompt solo los primeros 80 caracteres; las últimas 200 líneas por sesión (assumed).

## Outcomes

- Next to the terminal, an **Actividad** tab in the right panel shows, newest first and live,
  what the selected agent is doing: «Leyendo Repository.php», «Editando ListOrders.php»,
  «Ejecutando vendor/bin/phpunit --filter Orders», «✗ phpunit falló», «Lanzando un subagente:
  T5 paginación», «Claude dice: …», «Te pregunta: …».
- Each workspace row in the sidebar shows its latest activity line under the branch.
- The macOS needs-you notification carries the agent's real message, not only the branch.

## Scope boundaries

**In:** summarising Claude Code hook payloads (PreToolUse, PostToolUse, Notification, Stop,
UserPromptSubmit) into short local lines; the feed, the row line, the notification body.

**Out:** token or cost per workspace; replaying the whole transcript; Codex; sending activity
anywhere off the machine.

**Never scoped out:** the raw payload is never written to disk; file contents never leave the
hook process; lines are capped at 200 characters and 200 lines per session.

## Constraints

- The hook runs as `ELECTRON_RUN_AS_NODE=1 "<Atril's execPath>" "<resources>/claude-hook.mjs"
  <event>` from the hooks.json Atril writes; it keeps writing the agent state exactly as
  today (W14–W16, W26) plus the activity line.
- Activity lives in `$ATRIL_HOME/activity/<session>.jsonl` (`{at, kind, text}` per line);
  main watches it like the state files.
- `Stop` reads the last assistant text from the payload's `transcript_path` (JSONL), only the
  last entry, only its text.

## Prior decisions

- **More feedback than the terminal** — Pau, 9 nov: «Podemos mejorar la terminal para ver lo
  que dice Claude … Molaría un poco más de feedback … También aparte del que hay».
- **Summaries, never payloads** (assumed, decision log).
- **Electron as the hook's Node** (assumed, decision log): a Finder-launched app has no PATH.

## Task breakdown

- claude-hook.mjs: parse, summarise, append, cap; keep the state write.
- Main: watch activity files; feed + latest line per workspace over IPC; notification body.
- Renderer: Libretto | Actividad tabs, the row line.

## Verification criteria

- **A1** When a Claude hook fires, Atril shall append one line `{at, kind, text}` of at most
  200 characters to the session's activity file, and never write the hook's raw payload.
  Proof: src/main/activity.test.ts hook appends a short summary, never the payload
- **A2** When PreToolUse reports Read, Edit, Write, Bash, Grep/Glob or Task, the line shall
  read «Leyendo <file>», «Editando <file>», «Escribiendo <file>», «Ejecutando <first 60 chars of
  the command>», «Buscando <pattern>» or «Lanzando un subagente: <description>»; any other
  tool shall show its name.
  Proof: src/main/activity.test.ts summarises each tool
- **A3** If PostToolUse reports a Bash command that failed, then the line shall read «✗ <first
  60 chars> falló».
  Proof: src/main/activity.test.ts failed command is marked
- **A4** When a Notification hook fires, the line and the macOS notification body shall carry
  the agent's message («Te pregunta: …»).
  Proof: src/main/activity.test.ts notification carries the agent's message
- **A5** When a Stop hook fires, the line shall quote the first 200 characters of the last
  assistant text in the transcript as «Claude dice: …».
  Proof: src/main/activity.test.ts stop quotes the last thing claude said
- **A6** The activity file shall keep at most its last 200 lines.
  Proof: src/main/activity.test.ts activity file stays bounded
- **A7** While a workspace is selected, the Actividad tab shall list its lines newest first and
  update live, and every workspace row shall show its latest line.
  Proof: src/renderer/activity.test.ts feed and row show the latest activity

## Approach

### Summary

Replace `claude-hook.sh` with `claude-hook.mjs` run by Atril's own Electron in Node mode: it
reads the payload, writes the state file as today and appends one summarised line; main
watches `activity/` and pushes lines to the renderer.

### Technical context

Files: resources/claude-hook.mjs (new; .sh removed), src/main/agent.ts (hooksSettings: the new
command, PreToolUse/PostToolUse added), src/main/activity.ts (+test, summariser shared with
the hook through a plain .mjs import or duplicated pure function tested once), src/main/status.ts
(notification body), index.ts/preload IPC, renderer FlowPanel tabs + WorkspaceList line, sketch.

### The approach

- The summariser is a pure function `summarise(event, payload) → {kind, text} | null` living in
  `resources/summarise.mjs`, imported by the hook and by the tests.
- Bounded append: read, keep the last 199 lines, append, write temp + rename.
- Packaged path: execPath of the app binary; dev: the Electron binary. hooks.json is rewritten
  at every launch, so the path stays current.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Parse JSON in POSIX sh | fragile and unsafe with arbitrary payloads |
| Require node/jq on PATH | a Finder-launched app has no PATH |
| Read the whole transcript | heavy, and it holds file contents; one last entry is enough |
| Store raw payloads and summarise in main | puts prompts and file contents on disk |

### Risks

| Risk | What catches it |
|---|---|
| A hook slower than Claude's hook timeout | one small file read/write; Claude ignores a failed hook |
| Transcript format changes | A5 falls back to «Claude ha terminado» when no text is found |

### Validation and rollback

A1–A7 forced red once each; one real Claude start in a private tmux socket with a SessionStart
probe proving the .mjs hook runs. Rollback: one revert (the .sh comes back).

### Complexity deliberately kept

None.

## Checklist

- [ ] agent activity: the Electron-as-Node hook summarising every event into a bounded activity file, main watching it, the Actividad tab, the row line and the notification body · Closes: A1, A2, A3, A4, A5, A6, A7
