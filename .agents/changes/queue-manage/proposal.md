# queue-manage

Tracker: none
Targets: workspaces
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> si la IA ve una mejora que lo apunte en la la cola de ideas de Libretto y que pueda crear un jira en el tablero, o poder borrar la idea  o editar

## Reading

Gestionar las ideas en cola desde la pantalla Libretto: editarlas, borrarlas y pasarlas a Jira. Que la IA apunte
mejoras va en el cambio siguiente (`agent-suggestions`). Incluye un fallo visto en la app real: una idea encolada
desde Atril sale sin descripción.

## Decision log

### Session 2026-11-11
- Q: ¿Qué se edita? → A: la petición literal de una idea en cola: «Editar» cambia la fila por una caja con ese texto;
  «Guardar» reescribe `## The ask, verbatim` (cita línea a línea) y commitea solo ese archivo como
  `docs(queue): edit <name>`; el nombre no cambia (assumed).
- Q: ¿Borrar? → A: «Borrar» pide confirmación en la propia fila («¿Borrar <name>?» Sí / No) y hace `git rm -r` de la
  carpeta y un commit solo de esa ruta, `docs(queue): drop <name>` (assumed).
- Q: ¿Solo en cola? → A: sí; una idea «Empezada» o un cambio en curso no se editan ni borran desde aquí (assumed).
- Q: ¿Pasar a Jira? → A: «Pasar a Jira» crea una incidencia de tipo «Task» (o el primer tipo no subtarea del
  proyecto) en el proyecto del tablero elegido en Ajustes (S-board), con resumen = primera línea de la petición
  (máx. 255) y descripción = la petición entera; luego borra la idea como «Borrar», con
  `docs(queue): <KEY> en Jira, <name>`, porque `/libretto-queue` dice que una clave hace del tracker la fuente de
  verdad. La fila dice «Creada <KEY>» y la tarea aparece en Tareas (assumed).
- Q: ¿Sin Jira conectado o sin tablero? → A: el botón no sale; si Jira falla, el error sale en la fila y la idea se
  queda (assumed).
- Q: ¿El texto vacío bajo la idea? → A: `queueIdea` escribe en `## Reading` la primera línea de la petición, y la
  lectura usa la primera línea de la petición cuando `## Reading` está vacío (ideas ya escritas) (assumed).

### Session 2026-11-11 (revisión en frío y diseño)
- Q: ¿«En cola» para editar/borrar/Jira? → A: línea `Queued:` y sin rama `feat/<name>`; una idea empezada se rechaza
  (assumed).
- Q: ¿«Primera línea»? → A: el texto sin el `> ` de la cita (assumed). W101 y W100 se enmiendan aquí, no hay W109.
- Q: ¿Nombre que llega por IPC? → A: el mismo `SAFE_NAME` sin `..` que `startQueued`; si no vale, error y nada se toca
  (assumed).
- Q: ¿Archivos sin seguir en la carpeta? → A: `git rm -r` y luego `rm -rf` de la carpeta; el commit sigue llevando solo
  esa ruta (assumed).
- Q: ¿Credenciales y tablero? → A: main pasa `savedJira()` y el tablero guardado (lo que da `JiraSettingsStatus.board`)
  a `ideaToJira`; el renderer enseña «Pasar a Jira» si `atril:settings:jira` (o el IPC que ya da ese estado) devuelve
  `saved` y `board` (assumed).
- Q: ¿Jira crea y el borrado falla? → A: se devuelve `{ key, error }`; la fila dice «Creada {KEY}» y el error, y deja
  de ofrecer «Pasar a Jira» mientras la pantalla siga abierta (assumed). Ceiling: al volver a la pantalla, el botón
  vuelve; si molesta, escribir `Tracker: <KEY>` en la idea.
- Q: ¿Mientras espera? → A: los botones de esa fila se desactivan hasta la respuesta (assumed).
- Q: ¿Teclado? → A: todo son botones; al pedir confirmación el foco va a «No» (assumed).
- Q: ¿Diseño de la pantalla (Pau: «más orgánico lo de ver los repos»)? → A: el del boceto 10: tarjetas de repo con
  sus cuentas en lugar del desplegable, una línea «Apunta una idea…» que crece arriba, «En cola N» y «En curso N», la
  fecha dentro de la línea de la idea y las acciones en gris siempre visibles; columna de 760 px como máximo
  (assumed).

## Outcomes

- Una idea en cola se puede corregir, quitar o mandar a Jira sin abrir archivos, y cada idea enseña de qué va.

## Scope boundaries

**In:** editar, borrar con confirmación, pasar a Jira, la descripción de las ideas, el nuevo diseño de la pantalla.
**Out:** que la IA proponga ideas (`agent-suggestions`); editar cambios en curso; elegir proyecto o tipo en Jira.
**Never scoped out:** cada commit toca solo la ruta de esa idea; borrar pide confirmación; el token de Jira no sale de
main; si Jira falla no se borra nada; teclado; textos por `t()`.

## Prior decisions

- Solo ideas en cola, no empezadas (assumed, 11 nov).
- Pasar a Jira = crear y borrar la idea; Jira manda (assumed, 11 nov).
- Commits con pathspec, como W101 (assumed, 11 nov).

## Verification criteria

- **W100** (amended) When Atril reads a repo's Libretto state, it shall return as the queue the folders under
  `.agents/changes/` whose `proposal.md` holds a line `Queued: YYYY-MM-DD` before its first `## ` heading, oldest
  first then by name, each with name, date, the first non-blank line under `## Reading` — or, when that section is
  empty, the first line of `## The ask, verbatim` without its `> ` — its whole request without the `> ` as `ask`, and `started: true` when a local branch
  `feat/<name>` exists; and every other folder as in flight with name and `readChecklist`'s closed, total and first
  open box (or none); and if the repo has no `.agents/changes/`, then it shall return `{ none: true }`.
  Proof: src/main/libretto.test.ts a repo's queue and work in flight are read from disk
- **W101** (amended) When the person queues an idea, Atril shall write `.agents/changes/<name>/proposal.md` with
  `# <name>`, `Tracker: none`, `Queued: <local date>`, `## The ask, verbatim` with every line of the text quoted, and
  `## Reading` holding the text's first line, the name taken from that line (lowercase, accents stripped,
  non-alphanumerics to one dash, no edge dashes, at most 40 characters including a `-2`… suffix when taken, `idea`
  when empty), and commit only that file as `docs(queue): capture <name>`, leaving every other change in the repo
  uncommitted; if the text is blank or the repo has no `.agents/changes/`, then it shall write nothing; if the commit
  fails, then it shall remove the folder and return the error.
  Proof: src/main/libretto.test.ts queueing an idea writes and commits only its proposal
- **W106** When the person saves an edited idea, Atril shall rewrite only its `## The ask, verbatim` section with
  every line of the new text quoted, keep its name and `Queued:` line, and commit only that file as
  `docs(queue): edit <name>`, leaving every other change uncommitted; if the text is blank, the name is unsafe, or the
  idea has no `Queued:` line or already has its `feat/<name>` branch, then it shall write nothing and return an error.
  Proof: src/main/libretto.test.ts editing a queued idea commits only its proposal
- **W107** When the person confirms deleting a queued idea, Atril shall remove its folder (tracked and untracked
  files) and commit only that path as `docs(queue): drop <name>`, leaving every other change uncommitted; if the name
  is unsafe, or the idea has no `Queued:` line or already has its branch, then it shall remove nothing and return an
  error.
  Proof: src/main/libretto.test.ts deleting a queued idea commits only its removal
- **W108** When the person sends a queued idea to Jira with saved credentials and a board, Atril shall create one
  issue in that board's project with type «Task», or the first type whose `subtask` is false when the project has no
  «Task», summary the request's first line cut to 255 characters and description the whole request, then remove the
  idea as W107 with the message `docs(queue): <KEY> en Jira, <name>` and return the key; if Jira answers an error,
  then it shall remove nothing and return the error; if the removal fails after the issue exists, then it shall
  return both the key and the error. One test holds a case per clause.
  Proof: src/main/libretto.test.ts sending an idea to Jira creates one issue and drops the idea
- **W110** Each queued, not started idea in the Libretto screen shall offer «Editar» (a text box with its request,
  «Guardar» and «Cancelar»), «Borrar» (asking «¿Borrar {name}?» with «Sí» and «No» in the row, focus on «No») and,
  while Jira is saved with a board, «Pasar a Jira» (then «Creada {KEY}», and no second «Pasar a Jira» for it); that
  row's buttons shall be disabled while its request is pending; an error shall show in the row and keep the idea.
  Proof: src/renderer/libretto.test.ts a queued idea can be edited, deleted or sent to Jira
- **W111** The Libretto screen shall show the registered repos as buttons with their counts («{q} en cola · {f} en
  curso», «sin Libretto»), the picked one pressed, instead of a select; a one-line «Apunta una idea…» box with
  «Encolar» above the queue; and «En cola» and «En curso» with their counts.
  Proof: src/renderer/libretto.test.ts the Libretto screen shows each repo with its counts

## Approach

### Summary
Tres funciones nuevas en `src/main/libretto.ts` (`editIdea`, `dropIdea`, `ideaToJira`), sus IPC
`atril:libretto:{edit,drop,jira}`, un IPC `atril:libretto:repos` con las cuentas de cada repo, y la pantalla
rediseñada como el boceto 10 en `src/renderer/libretto/Libretto.tsx`.

### Technical context
Reutiliza el commit con pathspec de `queueIdea`; credenciales con `savedJira()` (`src/main/index.ts`) y el
tablero guardado (el mismo que da `JiraSettingsStatus.board`), pasados como `deps`. Jira Cloud REST:
`GET /rest/agile/1.0/board/{id}` → `location.projectKey`; `GET /rest/api/3/issue/createmeta/{projectKey}/issuetypes`
para el tipo (lista en `issueTypes` o `values`, cada uno con `subtask`); `POST /rest/api/3/issue` con descripción ADF (un párrafo por línea). `fetchImpl` inyectable como en
`start.ts`. El renderer sabe si hay tablero por el estado de Ajustes que ya lee Tareas.

### The approach
- `editIdea(repoPath, name, text, run)`, `dropIdea(repoPath, name, run, message?)`, `ideaToJira(repoPath, name, deps)`.
- «Queued» se comprueba leyendo el `proposal.md` (línea `Queued:` antes del primer `## `) y la rama `feat/<name>`.
- La lectura (W100) cae a la primera línea de la petición si `## Reading` está vacío.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| guardar la clave de Jira en el proposal y dejar la idea | `/libretto-queue`: con clave, el tracker es la fuente; dos copias se desvían |
| borrar sin confirmar | perder una idea por un clic |
| abrir el `proposal.md` en el editor | la idea es solo su petición; editar el archivo entero invita a romper la plantilla |

### Risks
| Risk | Mitigation |
|---|---|
| Jira crea y el commit de borrado falla | se devuelve la clave y el error; la fila dice «Creada {KEY}» y que la idea sigue |
| tipo «Task» no existe en el proyecto | primer tipo no subtarea de createmeta |
| no se puede probar contra un Jira real | `fetchImpl` falso en el test; «sin probar» en CLAUDE.md |

### Validation and rollback
Gates, y la app real manejada con Playwright (editar, borrar; Jira con un servidor falso no: queda «sin probar»).
Un revert.

### Complexity deliberately kept
Ninguna.

## Checklist

- [x] edit, drop, to Jira, the reading line and the repo counts in main with their IPC · Closes: W100, W101, W106, W107, W108
- [x] the redesigned screen, row buttons, confirm, editor and Jira result; real-app drive; photo; novedades · waits on box 1 · Closes: W110, W111
