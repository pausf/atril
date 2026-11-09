Tracker: none
Targets: work-inbox
Durable decisions: the ones in Prior decisions below

# use-jira-board-columns

## The ask, verbatim

Pau, 9 nov 2026:

> los flujos de tareas del Jira, cógelas del tablero.

## The reading

Not a bug: the Tareas screen groups tasks by Jira status category (Por empezar / En curso /
En revisión y despliegue), a heuristic of Atril's. Pau wants the groups — the flow — to be the
**columns of his Jira board**, in the board's order.

Observed 9 nov: `jira board list -p <PROJECT>` returns the same many kanban boards for WEB,
SHOP and APP (the project filter does not narrow it), so the board cannot be inferred: the
person picks it.

## Decision log

### Session 2026-11-09
- Q: «No le preguntes, tú sigue» stands → decisions below are taken with the recommended option and marked (assumed).
- Q: ¿Qué tablero? → A: el que la persona elige en Ajustes, con un buscador por nombre; uno solo (assumed). Si es falso: varios tableros a la vez o uno por proyecto.
- Q: ¿Y las tareas que no están en ninguna columna del tablero? → A: grupo «Fuera del tablero», al final y plegado (assumed).
- Q: ¿Qué columna viene plegada? → A: la primera columna desplegada; las que el tablero llama Done/Hecho no salen (la consulta ya excluye lo terminado); el resto desplegadas salvo «Fuera del tablero» (assumed).
- Q: ¿Sin tablero elegido? → A: la agrupación actual por categoría, con un aviso «Elige tu tablero en Ajustes para ver sus columnas» (assumed).

## Outcomes

- With a board picked, the Tareas screen groups the person's open tasks by **that board's
  columns, in the board's order**, each with its count; empty columns are not shown.
- Tasks whose status is in no column of the board go to **«Fuera del tablero»**, last, folded.
- With no board picked, the current status-category groups stay, under a notice «Elige tu
  tablero en Ajustes para ver sus columnas» that opens Ajustes.
- The sidebar summary keeps working: it counts the first column as "por empezar" and every
  other column as "en curso" when a board is picked.

## Scope boundaries

**In:** reading one board's column configuration; grouping by it; the Ajustes board picker
(`spec-settings.md`).

**Out:** several boards at once; moving a task between columns from Atril (only Start's In
Progress transition stays); swimlanes, quick filters, WIP limits; the board's own JQL filter
(the list is still "assigned to me, not Done").

**Never scoped out:** the Jira token stays in main; the board id is validated as a positive
integer before it reaches a URL.

## Constraints

- `GET /rest/agile/1.0/board/{boardId}/configuration` → `columnConfig.columns[]` with `name`
  and `statuses[].id`; matched against each issue's `status.id` (add `id` to the fields the
  search reads).
- Same basic auth and 10 s timeout as the inbox; one extra request per refresh.
- The work-inbox spec's grouping by status category (I11) becomes the fallback when no board is
  picked; it is not removed.

## Prior decisions

- **The flow comes from the board** — Pau, 9 nov: «los flujos de tareas del Jira, cógelas del
  tablero».
- **The person picks the board** — the project filter of the boards list does not narrow it
  (observed 9 nov), so it is chosen in Ajustes; one board (assumed, decision log).
- **«Fuera del tablero» last and folded; no board → old groups + notice** (assumed, decision log).

## Task breakdown

- Read the board configuration and map status ids to columns.
- Group the inbox by columns; fallback when no board.
- Ajustes: search boards by name, pick one, store it with the Jira metadata.
- Tareas screen and sidebar summary follow the columns.

## Verification criteria

- **I13** When a board is picked, the inbox shall group the tasks by its columns, in the
  board's order, matching each task's status id to the column that lists it; empty columns
  shall not appear.
  Proof: src/main/jira/board.test.ts groups tasks by the board columns in order
- **I14** If a task's status is in no column of the picked board, then it shall go to «Fuera
  del tablero», after every column, folded.
  Proof: src/main/jira/board.test.ts tasks outside the board go last
- **I15** While no board is picked, the Tareas screen shall keep the status-category groups and
  show «Elige tu tablero en Ajustes para ver sus columnas» with a link to Ajustes.
  Proof: src/renderer/inbox/inbox.test.ts no board keeps the status groups and asks to pick one
- **I16** If the board id is not a positive integer, then Atril shall refuse it before any
  request.
  Proof: src/main/jira/board.test.ts refuses a board id that is not a positive integer

## Approach

### Summary

A small module `src/main/jira/board.ts` reads the picked board's column configuration and turns
the inbox's flat list into ordered groups; the renderer draws whatever groups main returns, so
the category grouping and the column grouping share one shape.

### Technical context

Same stack and tests as the work-inbox capability (vitest, fake fetch). Files: `jira/inbox.ts`
(status id in fields; groups in the result), new `jira/board.ts` (+ test), `credentials/jira.ts`
(board id/name stored beside account metadata), `index.ts` IPC (board search + pick),
`preload/api.ts`, `renderer/inbox/Inbox.tsx`, `renderer/settings/Ajustes.tsx`, sketch.

### The approach

- `InboxResult` gains `groups: { id, title, folded, keys[] }[]`, computed in main: by board
  columns when a board is picked (I13, I14), by status category otherwise (I11, unchanged).
- Board search: `GET /rest/agile/1.0/board?name=<q>&maxResults=50` → `{ id, name, type }[]`.
- The pick is stored with the Jira metadata (never with the token); changing the Jira token
  keeps it.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Infer the board from the projects of the tasks | the boards list does not narrow by project here (observed); a guess would be wrong silently |
| Group in the renderer | main already owns the Jira data; one shape for both groupings keeps the renderer dumb |

### Risks

| Risk | What catches it |
|---|---|
| A board with hundreds of statuses or many columns | grouping is a map lookup; empty columns hidden |
| The board search returns many boards | name search + 50 results; the person types more letters |

### Validation and rollback

The four criteria's tests, forced red once each; a real check with Pau's token: pick a board
in the app and snapshot Tareas. Rollback: one revert; without a picked board the app behaves as
before.

### Complexity deliberately kept

None.

## Checklist

- [ ] board columns: read the picked board's configuration, group the inbox by its columns with «Fuera del tablero» last, keep the category groups and the pick notice when there is no board, validate the board id · Closes: I13, I14, I15, I16, S9
