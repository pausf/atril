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

## Outcomes

- Una idea en cola se puede corregir, quitar o mandar a Jira sin abrir archivos, y cada idea enseña de qué va.

## Scope boundaries

**In:** editar, borrar con confirmación, pasar a Jira, la descripción de las ideas.
**Out:** que la IA proponga ideas (`agent-suggestions`); editar cambios en curso; elegir proyecto o tipo en Jira.
**Never scoped out:** cada commit toca solo la ruta de esa idea; borrar pide confirmación; el token de Jira no sale de
main; si Jira falla no se borra nada; teclado; textos por `t()`.

## Prior decisions

- Solo ideas en cola, no empezadas (assumed, 11 nov).
- Pasar a Jira = crear y borrar la idea; Jira manda (assumed, 11 nov).
- Commits con pathspec, como W101 (assumed, 11 nov).

## Verification criteria

- **W106** When the person saves an edited idea, Atril shall rewrite only its `## The ask, verbatim` section with
  every line of the new text quoted, keep its name and `Queued:` line, and commit only that file as
  `docs(queue): edit <name>`, leaving every other change uncommitted; if the text is blank or the idea is not queued,
  then it shall write nothing and return an error.
  Proof: src/main/libretto.test.ts editing a queued idea commits only its proposal
- **W107** When the person confirms deleting a queued idea, Atril shall remove its folder and commit only that path
  as `docs(queue): drop <name>`, leaving every other change uncommitted; if the idea is not queued, then it shall
  remove nothing.
  Proof: src/main/libretto.test.ts deleting a queued idea commits only its removal
- **W108** When the person sends a queued idea to Jira with a board set, Atril shall create one issue in that board's
  project with type «Task» (or the project's first non-subtask type), summary the request's first line cut to 255
  and description the whole request, then remove the idea as W107 with the message
  `docs(queue): <KEY> en Jira, <name>` and return the key; if Jira answers an error, then it shall remove nothing
  and return the error.
  Proof: src/main/libretto.test.ts sending an idea to Jira creates one issue and drops the idea
- **W109** `queueIdea` shall write the request's first line under `## Reading`, and the queue read shall show the
  request's first line for an idea whose `## Reading` is empty.
  Proof: src/main/libretto.test.ts every queued idea shows what it is about
- **W110** Each queued, not started idea in the Libretto screen shall offer «Editar» (a text box with its request,
  «Guardar» and «Cancelar»), «Borrar» (asking «¿Borrar {name}?» with «Sí» and «No» in the row) and, while Jira has
  a board, «Pasar a Jira» (then «Creada {KEY}»); an error shall show in the row and keep the idea.
  Proof: src/renderer/libretto.test.ts a queued idea can be edited, deleted or sent to Jira

## Approach

### Summary
Tres funciones nuevas en `src/main/libretto.ts` (`editIdea`, `dropIdea`, `ideaToJira`), sus IPC
`atril:libretto:{edit,drop,jira}`, y los botones en `src/renderer/libretto/Libretto.tsx`.

### Technical context
Reutiliza el commit con pathspec de `queueIdea`; credenciales con `readJira`/`JiraCreds`
(`src/main/credentials/`), tablero elegido en Ajustes (mirar cómo `src/main/jira/board.ts` lo lee). Jira Cloud REST:
`GET /rest/agile/1.0/board/{id}` → `location.projectKey`; `GET /rest/api/3/issue/createmeta/{projectKey}/issuetypes`
para el tipo; `POST /rest/api/3/issue` con descripción ADF (un párrafo por línea). `fetchImpl` inyectable como en
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

- [ ] edit, drop, to Jira and the reading fallback in main with their IPC · Closes: W106, W107, W108, W109
- [ ] the row buttons, confirm, editor and Jira result; real-app drive; sketch; novedades · waits on box 1 · Closes: W110
