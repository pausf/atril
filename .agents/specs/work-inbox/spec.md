# Work inbox

Governs: src/main/jira/** src/renderer/inbox/**

## Outcomes

- The tasks live in their own **Tareas** screen on the rail; the Trabajo sidebar keeps the
  running work on top, always visible, under a one-line clickable summary — "Jira: N en curso
  · M por empezar →" — that opens Tareas. The Tareas screen lists every **task**: assigned to the person and not Done, in any
  project — key, summary, type, status — grouped: **Por empezar** (status category "new":
  Backlog, To Do), **En curso** (In Progress), and **En revisión y despliegue** (the rest of
  "in progress": Code Review, Testing, Ready to Deploy), the last group folded by default. It refreshes on launch, every 5 minutes, and on
  demand.
- A task that already has a workspace shows that, instead of a Start button.
- **Start** opens a dialog with: the repo (remembered per Jira project and component, asked
  the first time), the branch (the Jira key as it is, e.g. `WEB-3535`, editable), the repo's mode with its
  reason, and the full command line that will run (`claude --plugin-dir <bundled Libretto>
  --settings ~/.atril/hooks.json "/libretto:libretto-flow <KEY>"`). Confirming opens the
  workspace, starts the agent session, and moves the issue to In Progress.
- If Jira cannot be reached, the inbox says why and what the person runs; the rest of Atril
  keeps working.

### Board columns (use-jira-board-columns, 9 nov 2026)

- With a board picked, the Tareas screen groups the person's open tasks by **that board's
  columns, in the board's order**, each with its count; empty columns are not shown.
- Tasks whose status is in no column of the board go to **«Fuera del tablero»**, last, folded.
- With no board picked, the current status-category groups stay, under a notice «Elige tu
  tablero en Ajustes para ver sus columnas» that opens Ajustes.
- The sidebar summary keeps working: it counts the first column as "por empezar" and every
  other column as "en curso" when a board is picked.

### Next up (add-next-up, 9 nov 2026)

- **Empezar** starts at once, without the dialog, when the task's project and component already
  have a remembered repo and the proposed branch (the key) is free; ⌥-click, a first task of a
  project, or a taken branch open the dialog as before (I4–I10).

### Own tasks (add-own-tasks, 9 nov 2026)

- Tareas has a **«Nueva tarea»** button. It opens a dialog with a text area («¿Qué hay que
  hacer?»), the repo, a branch proposed from the first words of the text (editable) and the model.
- **Empezar** opens a workspace on that branch whose agent runs the Libretto flow with the text
  as the request, and shows it in Trabajo, like a Jira Start.

## Scope boundaries

**In:** reading tasks, the Jira→repo memory, Start, the In Progress transition.

**Out:** creating, editing or commenting on Jira issues; any transition other than In
Progress (Done belongs to phase 2, with the MR); boards, epics, other people's tasks; Jira
through MCP. (The REST API is IN, with the token from Ajustes — decision log, 9 nov.)

**Never scoped out:** the issue key and the branch are validated before they reach a
command; the Jira token lives only in Atril's main process, encrypted at rest, and never reaches
the renderer, a log or an agent (the settings spec).

### Board columns (use-jira-board-columns, 9 nov 2026)

**In:** reading one board's column configuration; grouping by it; the Ajustes board picker
(the settings spec).

**Out:** several boards at once; moving a task between columns from Atril (only Start's In
Progress transition stays); swimlanes, quick filters, WIP limits; the board's own JQL filter
(the list is still "assigned to me, not Done").

**Never scoped out:** only the person's own tasks — the list is always `assignee =
currentUser()`, whoever owns the saved token; the board contributes columns, never issues;
the Jira token stays in main; the board id is validated as a positive
integer before it reaches a URL.

### Next up (add-next-up, 9 nov 2026)

**In:** the one-click path. **Out:** an undo (Quitar closes a fresh workspace); choosing model or
repo on one click.

### Own tasks (add-own-tasks, 9 nov 2026)

**In:** the button, the dialog, the branch proposal, starting the workspace with the text.
**Out:** saving drafts, editing the text after Start, a separate list of own tasks, creating a
Jira issue from the text, Jira transitions (there is no issue).

**Never scoped out:** the text reaches the agent as one literal argument behind the flow
command — never a shell string, never a flag (`spec-workspaces.md`, W40); the dialog is fully
keyboard-reachable (Tab cycles inside it, Escape closes, ⌘↩ submits from the text area).

## Constraints

- The Jira REST API with the site, email and token saved in Ajustes (`.agents/specs/settings/spec.md`):
  `GET /rest/api/3/search/jql` with the JQL below, across every project in one call. The
  `jira` CLI is no longer used by Atril itself; the Libretto agent still uses it.
- The JQL: `assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC`. No
  sprint filter: observed 9 nov, the person has 0 tasks in open sprints and 24 open ones.
- The command Start runs goes through the primary spec's agent session, with Claude's hooks
  passed by `--settings` (the workspaces spec, W14).

### Board columns (use-jira-board-columns, 9 nov 2026)

- `GET /rest/agile/1.0/board/{boardId}/configuration` → `columnConfig.columns[]` with `name`
  and `statuses[].id`; matched against each issue's `status.id` (add `id` to the fields the
  search reads).
- Same basic auth and 10 s timeout as the inbox; one extra request per refresh.
- The work-inbox spec's grouping by status category (I11) becomes the fallback when no board is
  picked; it is not removed.

### Next up (add-next-up, 9 nov 2026)

- One click calls the same `proposeStart` and `start` as the dialog, with W34's «Por defecto»
  model (no `--model`).

### Own tasks (add-own-tasks, 9 nov 2026)

- Reuses `workspaces.open` (W-criteria for both modes) with the text as one more argument; the
  flow command is built in main, never in the renderer.
- Same dialog look and focus rules as the Start dialog (I4–I10).

## Prior decisions

- **Tareas is its own screen** — Pau, 9 nov: the full list in the sidebar «se ha creado un
  scroll … los que están corriendo … no se ve», then chose «Jira en su propia pantalla».
- **All open tasks, by status, not only the sprint** — Pau, 9 nov: «Todas, por estado».
- **Read the tasks of the person using the app** — Pau, 9 nov: «tambien que lea lo jira
  asignado a la persona que va».
- **Jira through the REST API with the token from Ajustes** — Pau, 9 nov (workspaces spec, decision log), replacing the CLI-only rule for what Atril reads. The token never reaches an agent.
- **Start runs Claude only** — `libretto --help`: «codex cannot run the flow».
- **Jira→repo asked once and remembered per project and component** — decision log,
  assumed. The memory key is the issue's project plus its first component, or the project
  alone when it has none.
- **The branch is the Jira key, uppercase, as the team names them** — Pau, 9 nov: «Las ramas
  del proyecto suelen ser el nombre de la tarea … suele ser referenciado con la tarea del
  Jira». Observed in shop-web/v2: `WEB-3535`, `SHOP-2630`, `OPS-4131`; a second
  attempt adds a letter: `WEB-3535B`, `SHOP-2613c`.
- **The task→workspace link is the Jira key in the workspace record** (the workspaces spec
  vocabulary); it survives restarts with the record.
- **"Unconfigured" means no Jira token in Ajustes, or `/myself` rejects it.**

### Board columns (use-jira-board-columns, 9 nov 2026)

- **The flow comes from the board** — Pau, 9 nov: «los flujos de tareas del Jira, cógelas del
  tablero».
- **The person picks the board** — the project filter of the boards list does not narrow it
  (observed 9 nov), so it is chosen in Ajustes; one board (assumed, decision log).
- **«Fuera del tablero» last and folded; no board → old groups + notice** (assumed, decision log).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Infer the board from the projects of the tasks | the boards list does not narrow by project here (observed); a guess would be wrong silently |
| Group in the renderer | main already owns the Jira data; one shape for both groupings keeps the renderer dumb |

#### Decision log, answers as given (2026-11-09)
- Q: «No le preguntes, tú sigue» stands → decisions below are taken with the recommended option and marked (assumed).
- Q: ¿Qué tablero? → A: el que la persona elige en Ajustes, con un buscador por nombre; uno solo (assumed). Si es falso: varios tableros a la vez o uno por proyecto.
- Q: ¿Y las tareas que no están en ninguna columna del tablero? → A: grupo «Fuera del tablero», al final y plegado (assumed).
- Q: ¿Qué columna viene plegada? → A: la primera columna desplegada; las que el tablero llama Done/Hecho no salen (la consulta ya excluye lo terminado); el resto desplegadas salvo «Fuera del tablero» (assumed).
- Q: (spec-reviewer) ¿Y si falla la lectura del tablero? → A: vuelve a los grupos por categoría y avisa «No se pudo leer el tablero (…)» (assumed). Si es falso: I18 mostraría un error en lugar de grupos.
- Q: (spec-reviewer) ¿Qué columnas vienen plegadas? → A: todas abiertas; solo «Fuera del tablero» plegada (assumed).
- Q: (spec-reviewer) ¿Borrar el token de Jira olvida el tablero? → A: sí; Reemplazar lo conserva (assumed).
- Q: (spec-reviewer) ¿Dónde vive la búsqueda de tableros y cómo se busca? → A: `src/main/credentials/boards.ts`; desde 2 letras, 300 ms tras dejar de escribir, «Ningún tablero coincide» si no hay resultados (assumed).
- Q: ¿Qué tareas salen? → A: «solo debería salir las tareas que me estén asignadas a mí. a desarrollar utilizaremos cualquiera, pero cuando esté el producto final solamente tiene que salir las que están relacionadas a mí» — el tablero solo da las columnas; las tareas son siempre las asignadas a quien tiene el token; los datos inventados solo existen en las capturas de desarrollo y nunca en la app empaquetada.
- Q: (work-reviewer) ¿«primera columna» es la del tablero aunque esté vacía? → A: sí, la primera columna del tablero; vacía significa nada por empezar (assumed).
- Q: ¿Sin tablero elegido? → A: la agrupación actual por categoría, con un aviso «Elige tu tablero en Ajustes para ver sus columnas» (assumed).

### Next up (add-next-up, 9 nov 2026)

- **One click for a known project** — Pau, 9 nov, usability batch («si» to item 4). The first
  task of a project still picks its repo in the dialog, so one click never guesses a repo.
- Q: (spec-reviewer) ¿Y el «deshacer»? → A: fuera de alcance: «Quitar» ya cierra un trabajo recién abierto (assumed).

### Own tasks (add-own-tasks, 9 nov 2026)

- **Own tasks from the same panel** — Pau, 9 nov: «puedo lanzar el libreto flow desde uno
  creado yo mismo … Personalizado, poniendo yo el prom o lo que sea desde el mismo panel».
- **No separate list** (assumed): an own task is a workspace like any other; its text lives in
  the Libretto proposal the agent writes, which is where Libretto keeps a request anyway.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| A text field in the Sidebar's «+ trabajo» form | Pau asked for it «desde el mismo panel» as Jira, i.e. Tareas |
| Building the flow command in the renderer | the renderer would choose the command line; main must |
| A Jira issue created from the text | out of scope; not every own task belongs in Jira |

#### Decision log, answers as given (2026-11-09)
- Q: «No le preguntes, tú sigue» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Dónde se escribe la tarea propia? → A: botón «Nueva tarea» en la cabecera de Tareas («desde el mismo panel»), que abre un diálogo: texto, repo, rama y modelo (assumed).
- Q: ¿Qué recibe el agente? → A: `/libretto:libretto-flow <texto>` como un único argumento; Libretto ya toma «lo que dijo el usuario» como fuente y lo guarda literal en su proposal (assumed).
- Q: ¿Y la rama? → A: se propone a partir de las primeras palabras (minúsculas, sin acentos, guiones, máx. 40) y se puede editar; deja de seguir al texto en cuanto la tocas (assumed).
- Q: ¿Límite del texto? → A: 2000 caracteres; Libretto escribe el resto en la spec, no hace falta más en una línea de comandos (assumed).
- Q: (spec-reviewer) ¿Qué es una «palabra» para la rama? → A: un tramo de `[a-z0-9]` tras quitar acentos y pasar a minúsculas; la puntuación separa palabras. «Editada» = cualquier cambio tuyo en el campo, aunque lo vacíes (assumed).
- Q: (spec-reviewer) ¿«Nueva tarea» sin Jira conectado? → A: sí, se ve y funciona: la cabecera de Tareas queda fuera del estado «Conecta…» (assumed, I25).
- Q: (spec-reviewer) ¿Qué agente? → A: siempre `claude` (assumed).
- Q: (spec-reviewer) ¿Dónde se nota el límite de 2000? → A: el área de texto no deja escribir más (`maxLength`, unidades UTF-16, igual que `.length` en main) (assumed).
- Q: (spec-reviewer) ¿Se extrae el atrapado de foco del diálogo de Empezar? → A: no: el diálogo nuevo lleva el suyo y el de Empezar no se toca, así no puede romperse sin prueba (assumed).
- Q: ¿Se listan las tareas propias aparte? → A: no: cada una es un trabajo más en Trabajo, con su rama; una lista aparte sería una segunda fuente de verdad (assumed).

## Task breakdown

- Jira reader: run the query, parse the raw JSON, map errors to messages.
- Repo memory per project and component.
- Branch derivation and validation.
- Start dialog and the launch.
- In Progress transition with failure handling.

## Verification criteria

- **I1** When the inbox refreshes, Atril shall call `GET /rest/api/3/search/jql` once with
  the JQL in Constraints.
  Proof: src/main/jira/inbox.test.ts queries my open sprint issues
- **I2** When the API returns issues, Atril shall list each issue's key, summary, type and
  status.
  Proof: src/main/jira/inbox.test.ts parses issues from raw json
- **I3** If no Jira token is saved, or the API rejects it, then the inbox shall show "Conecta
  Jira en Ajustes" with a link, and shall never ask for the token anywhere but Ajustes.
  Proof: src/renderer/inbox/inbox.test.ts inbox without a jira token links to ajustes
- **I4** When the person starts a task whose project and component have no remembered repo,
  Atril shall ask for one and remember it for the next task of that project and component.
  Proof: src/main/jira/start.test.ts remembers the repo per project and component
- **I5** When the dialog opens, Atril shall propose the issue key exactly as Jira gives it
  (`WEB-3535`) as the branch name.
  Proof: src/main/jira/start.test.ts proposes the issue key as the branch
- **I6** When Start is confirmed, Atril shall launch `claude` with the bundled Libretto plugin,
  its hooks and the prompt `/libretto:libretto-flow <KEY>` in the new workspace's agent
  session — the plugin-namespaced name observed in box 4, because the bare `/libretto-flow`
  exists only where Libretto is installed globally.
  Proof: src/main/jira/start.test.ts start launches libretto-flow with the key
- **I7** If an issue key does not match `^[A-Z][A-Z0-9]+-[0-9]+$`, then Atril shall refuse
  to start it.
  Proof: src/main/jira/start.test.ts refuses a malformed issue key
- **I8** If the In Progress transition fails, then Atril shall keep the workspace and agent
  running and show the error.
  Proof: src/main/jira/start.test.ts transition failure keeps the workspace
- **I9** While a workspace record carries a task's key, the inbox shall show that workspace
  instead of Start, also after a restart.
  Proof: src/main/jira/inbox.test.ts task with a workspace shows it instead of start
- **I10** If the proposed branch already exists in the repo, or its worktree path exists,
  then the dialog shall say so and propose the key with the first free letter suffix: `B`,
  `C`, `D`… (`WEB-3535B`), as the team does.
  Proof: src/main/jira/start.test.ts proposes a free branch when the slug is taken
- **I11** When the inbox shows tasks, Atril shall group them: status category `new` → Por
  empezar; `indeterminate` whose status name says in progress → En curso; any other
  `indeterminate` → En revisión y despliegue, folded by default.
  Proof: src/main/jira/inbox.test.ts groups tasks by status
- **I12** While the Trabajo screen is shown, the sidebar shall show the running work first and
  the Jira tasks only as a one-line summary of counts that opens the Tareas screen.
  Proof: src/renderer/inbox/inbox.test.ts sidebar shows a jira summary that opens tareas

### Board columns (use-jira-board-columns, 9 nov 2026)

- **I13** When a board is picked, the inbox shall group the tasks by its columns, in the
  board's order, matching each task's status id to the column that lists it, every column
  unfolded; empty columns shall not appear. (One proof holds both promises: main computes the
  order and the filtering in one pass, and the test asserts both on one result.)
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

- **I17** While a board is picked, the sidebar summary shall count the first column's tasks as
  "por empezar" and the tasks of every other column as "en curso" («Fuera del tablero» counts
  in neither).
  Proof: src/renderer/inbox/inbox.test.ts summary follows the board columns
- **I18** If reading the picked board fails (timeout, 403, 404), then the inbox shall fall back
  to the status-category groups and show «No se pudo leer el tablero (<status>)».
  Proof: src/main/jira/board.test.ts board failure falls back to the status groups

- **I19** Whether or not a board is picked, the inbox shall list only issues from the search
  with `assignee = currentUser()`, and shall never request the board's own issues.
  Proof: src/main/jira/inbox.test.ts only my tasks even with a board

### Next up (add-next-up, 9 nov 2026)

- **I20** When the person clicks Empezar on a task whose project and component have a remembered
  repo and whose proposed branch is free, Atril shall start it without the dialog and without a
  `--model` flag.
  Proof: src/renderer/nextup.test.ts one click starts a remembered task
- **I21** When the person ⌥-clicks Empezar, or the project has no remembered repo, or the
  proposed branch is taken, Atril shall open the Start dialog.
  Proof: src/renderer/nextup.test.ts option click or unknown project opens the dialog

### Own tasks (add-own-tasks, 9 nov 2026)

- **I22** When the person writes a task in «Nueva tarea», picks a repo and presses Empezar, Atril
  shall open a workspace on the shown branch with the chosen model, passing the text as the task with agent `claude`,
  and show it in Trabajo.
  Proof: src/renderer/inbox/owntask.test.ts own task opens a workspace with its text
- **I23** While the text is empty or only spaces, Empezar shall be disabled, and the text area
  shall accept at most 2000 characters (UTF-16 units).
  Proof: src/renderer/inbox/owntask.test.ts own task needs text
- **I25** If no repo is registered, then the dialog shall say «Añade un repo en Trabajo para
  empezar» and Empezar shall be disabled.
  Proof: src/renderer/inbox/owntask.test.ts own task needs a repo
- **I26** While Jira is not connected (I3), «Nueva tarea» shall still be shown and open the dialog.
  Proof: src/renderer/inbox/owntask.test.ts own task works without jira
- **I24** While the person has not edited the branch, the branch shall be the first five words of
  the text, a word being a run of `[a-z0-9]` after lower-casing and removing accents, joined by
  hyphens, at most 40 characters with no trailing hyphen («Añadir filtro de Laboratorios» →
  `anadir-filtro-de-laboratorios`; «fix: bug-in api, ya» → `fix-bug-in-api-ya`); once the person
  changes the field in any way, it shall stay as they left it.
  Proof: src/renderer/inbox/owntask.test.ts branch follows the text until edited
