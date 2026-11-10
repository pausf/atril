# add-subagent-detail

Tracker: none
Targets: workspaces
Durable decisions: the four in Prior decisions below

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

## Decision log

### Session 2026-11-10
- Q: ¿Dónde está el archivo del subagente? → A: el hook lo deriva en SubagentStart de `transcript_path` (campo documentado de todo hook): `<transcript_path sin .jsonl>/subagents/agent-<agent_id>.jsonl`, comprobado en disco con Claude Code de hoy; se guarda en main y nunca sale a la ventana (assumed). Si cambia el formato, el modal sale vacío y la lista sigue igual.
- Q: ¿Se borra el emparejamiento por orden? → A: sí, como pide la propuesta: la descripción sale de `agent-<id>.meta.json`; sin meta, solo el tipo (assumed). Si el meta deja de existir, se pierden las descripciones, no la lista.
- Q: ¿Terminal de verdad (xterm) o texto con aspecto de terminal? → A: texto monoespaciado de solo lectura con el estilo de Claude Code; xterm no aporta nada sin entrada (assumed).
- Q: ¿En vivo cómo? → A: la ventana pide el registro cada segundo mientras el modal está abierto y el subagente trabaja; main relee el archivo (assumed). Techo: archivos de varios MB; leer solo la cola si pesa.
- Q: ¿Qué se pinta? → A: el encargo (`> ` y sus 3 primeras líneas), texto del asistente con `⏺`, `⏺ Herramienta(arg)`, `⎿` con las 3 primeras líneas del resultado y «… +N líneas», y «✻ Pensando…» sin su contenido; como mucho las 500 últimas líneas (assumed).
- Q: (fase 5) ¿Cómo se construye? → A: ruta guardada por el hook + lectura bajo demanda en main + sondeo desde el modal (assumed). Perdieron: un `fs.watch` por archivo de subagente (más estado y fugas por cada modal para ganar menos de 1 s) y buscar el archivo por la ruta del trabajo codificada en `~/.claude/projects` (depende de otra regla interna más y falla con trabajos en sitio).

## Outcomes

- Pulsar un subagente del panel abre un modal que parece una terminal y enseña lo que ha hecho y está
  haciendo ese Claude, leído de su archivo local, sin gastar cuota.
- Mientras el subagente trabaja, el modal se actualiza solo cada segundo; al terminar se queda quieto.
- La descripción de cada subagente sale de su `meta.json`, así que dos subagentes del mismo tipo
  lanzados a la vez ya no pueden intercambiarse la etiqueta.
- El hook ya no guarda la cola `pending` ni lee el PreToolUse de `Agent` para los subagentes.

## Scope boundaries

**In:** la ruta del archivo en la entrada (solo en main), la descripción desde el meta, el registro
del subagente como líneas, el modal terminal y su refresco.

**Out:** escribirle al subagente o pararlo; ver el razonamiento (`thinking`) por dentro; subagentes de
subagentes; registros de subagentes de antes de este cambio (no tienen ruta: el modal dice que no
hay registro); colores por herramienta; buscar dentro del registro.

**Never scoped out:** la ventana nunca manda una ruta: pide por id de trabajo e id de subagente y main
solo lee la ruta que guardó el hook; el contenido se pinta como texto, nunca como HTML; el modal
se maneja con teclado (foco al abrir, Tab dentro, Esc cierra y devuelve el foco a la fila).

## Constraints

- El formato del transcript y del meta es interno de Claude Code, no documentado: todo campo se
  comprueba por tipo y lo que no encaja se salta, sin romper.
- Sin dependencias nuevas; el modal reutiliza `useModalKeys` y las clases `modal`/`dlg`.
- Textos por `t()` con su inglés en `src/preload/i18n-en.ts`; colores solo como tokens.
- El hook sigue leyendo el payload una vez y solo saca de él los campos listados.

## Prior decisions

- (add-subagents-view, 10 nov) «Events only» y «Pairing by order» quedan sustituidas: Pau pidió el
  9 nov ver lo que hace el subagente como terminal y borrar el emparejamiento (assumed en el cómo).
- La ruta vive en `$ATRIL_HOME/subagents/<session>.json` y no sale de main (assumed).
- Refresco por sondeo de 1 s solo con el modal abierto (assumed); techo: relee el archivo entero,
  pasar a leer la cola cuando un registro pese varios MB.
- 500 líneas como mucho en el modal (assumed): un subagente largo enseña su final.

## Task breakdown

- Hook: en SubagentStart guardar `transcript`; quitar el PreToolUse de `Agent`, `pending`, su TTL y su tope.
- Main: descripción desde el meta (recortada a 120), entradas sin ruta hacia la ventana,
  `atril:subagents:log(workspaceId, agentId)` que lee la ruta guardada y la convierte en líneas.
- Un parser puro de JSONL a líneas al estilo Claude Code.
- Ventana: cada fila del panel es un botón que abre el modal; el modal pinta las líneas y refresca.
- Boceto: el modal del subagente pasa de lista a terminal.

## Verification criteria

- **W62** (amended) On SubagentStart with a non-empty `agent_type` and `agent_id`, the hook shall add
  `{ id: agent_id, type, startedAt, transcript? }` (epoch seconds) to `entries` in
  `$ATRIL_HOME/subagents/<session>.json`, where `transcript` is the payload's `transcript_path` without
  its `.jsonl` ending plus `/subagents/agent-<agent_id>.jsonl`, present only when `transcript_path` is a
  string ending in `.jsonl`; a PreToolUse shall never write that file.
  Proof: src/main/agent.test.ts a subagent start records its transcript
- **W64** (amended) On UserPromptSubmit the hook shall drop every finished entry; the file shall keep at
  most 20 entries, dropping the oldest finished entry and never a running one (more than 20 running is
  kept as is).
  Proof: src/main/agent.test.ts the subagent list stays bounded
- **W67** Main shall send each entry to the window without `transcript`, with `description` taken from
  the meta file beside its transcript (`agent-<id>.meta.json`, field `description`,
  whitespace collapsed, cut to 120 characters) and no `description` when that file is missing or not
  JSON.
  Proof: src/main/subagents.test.ts the description comes from the meta file
- **W68** When the window asks `atril:subagents:log(workspaceId, agentId)`, main shall read only the
  `transcript` stored for that agent in that workspace's file and answer its lines; if the workspace,
  the agent or its `transcript` is unknown, or the file cannot be read, it shall answer `[]`.
  Proof: src/main/subagents.test.ts the log reads only the stored transcript
- **W69** The log parser shall turn each JSONL line into, in order: a `prompt` line for the first user
  text (its first 3 lines), a `text` line per assistant text block, a `tool` line `Name(arg)` per
  `tool_use` (arg = the first string among `file_path`, `command`, `pattern`, `url`, `description`,
  `skill`, `prompt`, one line, cut to 80 characters), a `result` line per `tool_result` (its first 3
  lines plus «… +N líneas» when longer, text blocks joined when the content is a list), and a
  `thinking` line with no text per thinking block; it shall skip any other line type, any line that is
  not JSON, and keep only the last 500 lines.
  Proof: src/main/subagents.test.ts the log reads like Claude Code

## Approach

### Summary

El hook apunta en cada entrada la ruta del registro del subagente, que deriva del `transcript_path` del
propio evento. Main la usa para dos cosas: rellenar la descripción desde el `meta.json` de al lado y,
cuando la ventana lo pide, convertir el `.jsonl` en líneas con un parser puro. La fila del panel pasa a
ser un botón que abre un modal de solo lectura con aspecto de terminal. Mientras el subagente trabaja,
el modal pide el registro cada segundo.

### Technical context

TypeScript, Electron (main y preload) y React 19 (renderer), con vitest; el hook es Node ESM sin
dependencias (`resources/claude-hook.mjs`). Puertas: `pnpm -s typecheck`, `lint` y `test`.

Lo que toca el cambio:
- `resources/claude-hook.mjs`: queda más corto.
- `src/main/subagents.ts`: descripción, quitar la ruta antes de mandar y `log`.
- Un parser nuevo, `src/main/subagent-log.ts`.
- `src/main/index.ts`: un handler más.
- `src/preload/{api,index}.ts`: el tipo `SubagentLine` y `log`.
- `src/renderer/flow/Subagents.tsx` y un modal nuevo, `src/renderer/flow/SubagentModal.tsx`.
- `src/renderer/styles.css`, `src/preload/i18n-en.ts` y `src/renderer/mockApi.ts`.
- Tests: `agent.test.ts`, `subagents.test.ts` (main) y `flow/subagents.test.ts`.
- `bocetos/fase1-nucleo.html`.

### The approach

- **Hook.** En SubagentStart, si `transcript_path` acaba en `.jsonl`, escribe
  `transcript = transcript_path.slice(0, -6) + '/subagents/agent-' + id + '.jsonl'`. Se borran la rama
  PreToolUse de `trackSubagents`, `pending`, `PENDING_TTL` y `MAX_PENDING`. El archivo pasa a ser
  `{ entries }`; un `pending` que quede de antes se ignora y se pierde en la siguiente escritura.
- **Main.**
  - `readSubagents` devuelve las entradas internas, con `transcript`.
  - `toWindow(entries)` quita `transcript` y añade `description` desde
    `transcript.replace(/\.jsonl$/, '.meta.json')`. Cachea por id, porque la descripción no cambia.
    Ojo: un meta que aún no existe no se cachea, así se reintenta.
  - `log(id, agentId)` busca la entrada en el registro del trabajo, lee `transcript` con `readFile` y
    llama a `parseSubagentLog`.
- **Parser** (`parseSubagentLog(text): SubagentLine[]`). `SubagentLine` es
  `{ kind: 'prompt'|'text'|'tool'|'result'|'thinking', text: string, more?: number }`.
  Aplica W69 y corta a las 500 últimas.
- **Ventana.**
  - En `Subagents.tsx`, el `<li>` lleva un `<button>` y su estado `open` guarda el id.
  - `SubagentModal` pide `log` al abrir y, mientras no haya `endedAt`, cada 1 s. Pinta un `<pre>`-like
    con un `div` por línea y su prefijo, y usa `useModalKeys`.
  - La entrada viene de las mismas `entries` de la lista, así que el estado y la duración siguen al hook.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| `fs.watch` por archivo de subagente y empujar líneas | Un vigilante por modal, que hay que cerrar bien, para ganar menos de 1 s de latencia. |
| Localizar el archivo por `~/.claude/projects/<ruta codificada>/*/subagents/` | Una regla interna más (la codificación de la ruta) y un glob por sesiones. |
| xterm.js en el modal | Sin entrada no aporta nada y añade otro terminal vivo con su tamaño. |
| Mantener el emparejamiento por orden para la descripción | Se intercambia con dos del mismo tipo a la vez; el meta da la de verdad. |

### Risks

| Risk | Mitigation |
|---|---|
| Claude Code cambia el formato o la ubicación | El parser valida tipos y salta lo raro, y el modal dice «Sin registro de este subagente». Prueba: el test de W69 mete líneas basura y la de W68 un archivo que falta. |
| La ventana pide un archivo ajeno | `log` solo recibe ids y lee la ruta que guardó el hook (W68). El test pide un agente desconocido y recibe `[]`. |
| Un registro de varios MB cada segundo | Aceptado y marcado con `ponytail:`. Se pasa a leer la cola cuando pese. |
| El contenido del transcript trae HTML | React lo pinta como texto; no se usa `dangerouslySetInnerHTML`. |

### Validation and rollback

Tests nuevos o cambiados, todos vistos en rojo primero:
- `agent.test.ts`, «a subagent start records its transcript» y «the subagent list stays bounded».
- `subagents.test.ts`: «the description comes from the meta file», «the log reads only the stored
  transcript» y «the log reads like Claude Code».
- `flow/subagents.test.ts`, «a subagent opens as a terminal».

El de F28 podría pasar por la razón equivocada si el sondeo nunca se dispara. Se obliga con fake
timers: el segundo `log` tiene que llegar tras 1 s y no debe llegar con `endedAt`.

Rollback: un revert. Los archivos con `pending` antiguo se siguen leyendo.

### Complexity deliberately kept

La caché de descripciones en main se queda: sin ella, cada evento del vigilante relee 20 metas por trabajo.

## Checklist

- [ ] the hook records the transcript and drops pending; main fills the description from the meta and never sends the path · Closes: W62, W64, W67
- [ ] the log parser and `atril:subagents:log` reading only the stored transcript · waits on box 1 · Closes: W68, W69
- [ ] the row as a button opening the terminal modal, live while it runs; sketch modal as terminal · waits on box 2 · Closes: F28
