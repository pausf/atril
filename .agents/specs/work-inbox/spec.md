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

### Repos in Ajustes (move-repos-to-settings, 9 nov 2026)

- The own-task dialog opens two ways: «Nueva tarea» in Tareas (text required, as I23) and
  «Nuevo trabajo» in Trabajo (text optional; without text the agent is plain Claude).
- With no repo registered, the dialog points to Ajustes → Repos with a button that goes there.

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

- Tareas and MR say what really failed (token, permission, address, overloaded, down, no network) with their button and the code folded.
- With the MR list failed, «Ninguna MR.» does not appear.
- Connecting GitHub or GitLab states the cause without exception names, as Jira already does (S32).

### Refining the request (refine-request, 20 nov 2026)

Whoever creates a task can, if they want, answer four fixed questions or ask Claude Haiku for 3–5 questions about their request, and what is answered travels with the request to the agent. Left untouched, everything is as today.

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

### Repos in Ajustes (move-repos-to-settings, 9 nov 2026)

**In:** the optional text, the plain-Claude path, the no-repo pointer. **Out:** anything else in
the dialog.

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

**In:** `src/main/net-problem.ts` (new), `src/main/jira/inbox.ts`, `src/main/forge/mrs.ts` (`statusText`, `networkText`, the list), `src/main/credentials/forge.ts`, `src/renderer/inbox/Inbox.tsx`, `src/renderer/mr/MrScreen.tsx`, `src/renderer/settings/Forges.tsx` and `Connection.tsx`, i18n. **Out:** buttons in threads, scores, lenses and inline comments (MR redesign); the Jira board in Libretto; GitHub against a self-hosted server.

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

### Repos in Ajustes (move-repos-to-settings, 9 nov 2026)

- Plain work calls `workspaces.open` without a task, as the old «+ trabajo» did.

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

- `err.message` never reaches the window; only list codes (`ENOTFOUND`…), the exception name or `HTTP <n>`, and only in the detail.
- Tokens do not leave main.

### Refining the request (refine-request, 20 nov 2026)

- No calls to Claude without pressing the button (CLAUDE.md, quota).
- Texts through `t()` with their English entry; errors with `Problem`.
- The call uses the same `run` as the scores (`claude -p … --tools '' --no-session-persistence --json-schema`), with the request on stdin, never in argv.

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
- Q: Which board? → A: the one the person picks in Ajustes, with a search by name; just one (assumed). If wrong: several boards at once or one per project.
- Q: And the tasks that are in no column of the board? → A: a «Fuera del tablero» group, at the end and folded (assumed).
- Q: Which column comes folded? → A: the first column unfolded; the ones the board calls Done/Hecho are not shown (the query already excludes finished work); the rest unfolded except «Fuera del tablero» (assumed).
- Q: (spec-reviewer) And if reading the board fails? → A: it goes back to the category groups and warns «No se pudo leer el tablero (…)» (assumed). If wrong: I18 would show an error instead of groups.
- Q: (spec-reviewer) Which columns come folded? → A: all open; only «Fuera del tablero» folded (assumed).
- Q: (spec-reviewer) Does deleting the Jira token forget the board? → A: yes; Replace keeps it (assumed).
- Q: (spec-reviewer) Where does the board search live and how does it search? → A: `src/main/credentials/boards.ts`; from 2 letters, 300 ms after typing stops, «Ningún tablero coincide» when there are no results (assumed).
- Q: Which tasks appear? → A: «solo debería salir las tareas que me estén asignadas a mí. a desarrollar utilizaremos cualquiera, pero cuando esté el producto final solamente tiene que salir las que están relacionadas a mí» — the board only gives the columns; the tasks are always the ones assigned to whoever holds the token; invented data exists only in development screenshots and never in the packaged app.
- Q: (work-reviewer) Is "first column" the board's one even if it is empty? → A: yes, the board's first column; empty means nothing to start (assumed).
- Q: No board picked? → A: the current grouping by category, with a notice «Elige tu tablero en Ajustes para ver sus columnas» (assumed).

### Next up (add-next-up, 9 nov 2026)

- **One click for a known project** — Pau, 9 nov, usability batch («si» to item 4). The first
  task of a project still picks its repo in the dialog, so one click never guesses a repo.
- Q: (spec-reviewer) And the "undo"? → A: out of scope: «Quitar» already closes a freshly opened work (assumed).

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
- Q: Where is the own task written? → A: a «Nueva tarea» button in the Tareas header («desde el mismo panel»), which opens a dialog: text, repo, branch and model (assumed).
- Q: What does the agent receive? → A: `/libretto:libretto-flow <text>` as a single argument; Libretto already takes «lo que dijo el usuario» as its source and stores it verbatim in its proposal (assumed).
- Q: And the branch? → A: it is proposed from the first words (lower case, no accents, hyphens, max 40) and can be edited; it stops following the text as soon as you touch it (assumed).
- Q: Text limit? → A: 2000 characters; Libretto writes the rest in the spec, no more is needed on a command line (assumed).
- Q: (spec-reviewer) What is a "word" for the branch? → A: a run of `[a-z0-9]` after removing accents and lower-casing; punctuation separates words. "Edited" = any change of yours in the field, even if you empty it (assumed).
- Q: (spec-reviewer) «Nueva tarea» without Jira connected? → A: yes, it shows and works: the Tareas header stays outside the «Conecta…» state (assumed, I25).
- Q: (spec-reviewer) Which agent? → A: always `claude` (assumed).
- Q: (spec-reviewer) Where is the 2000 limit noticed? → A: the text area does not let you type more (`maxLength`, UTF-16 units, same as `.length` in main) (assumed).
- Q: (spec-reviewer) Is the focus trap extracted from the Empezar dialog? → A: no: the new dialog carries its own and the Empezar one is not touched, so it cannot break without a test (assumed).
- Q: Are own tasks listed apart? → A: no: each is one more work in Trabajo, with its branch; a separate list would be a second source of truth (assumed).

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

- A network or service failure states the cause by status or by code, with «Volver a comprobar» if it is transient and «Abrir Ajustes» if the person fixes it; the code, folded.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| One sentence per screen | three copies that diverge; it already happened with «ha rechazado el token» |
| Automatic retries | they burn the person's API quota without being asked; «Volver a comprobar» is one click |

#### Decision log, answers as given (2026-11-11)
- Q: (cold review) Who governs `net-problem.ts`? → A: workspaces (`src/main/**`): its criterion is W150 in `spec-workspaces.md`; inbox, mr and settings cite it.
- Q: (cold review) An address that does not exist or a bad certificate? → A: «Abrir Ajustes», because the person fixes it.
- Q: (cold review) And the MR list with a forge down? → A: each downed forge's problem goes above the sections; each section shows its rows, and «Ninguna MR.» appears only if no forge failed (assumed).
- Q: (cold review) And Ajustes' Jira (S32)? → A: it stays as it is; S34 is only for GitHub and GitLab. Ajustes has no fix button: the form already carries «Guardar y comprobar» (assumed).
- Q: One sentence per service or a shared helper? → A: a shared helper in main (`src/main/net-problem.ts`) for Jira, GitHub and GitLab, with a sentence per status and per network cause (assumed).
- Q: Which buttons? → A: «Volver a comprobar» for the transient (429, 5xx, network) and «Abrir Ajustes» for what the person fixes (401, 403, 404) (assumed).
- Q: And threads, scores and inline comments, which also use these sentences? → A: they take the new sentences (no codes), with no new button: they go in the MR redesign (assumed).
- Q: (builder) Which code does a timeout carry? → A: the exception name, `TimeoutError` (W150); `networkCode` stops translating it to `timeout`, and `UND_ERR_CONNECT_TIMEOUT` also counts as a timeout (assumed).
- Q: (builder) And if the bridge to main fails when reading Tareas? → A: «No llego a Jira: ¿hay conexión?» with «Volver a comprobar» and the exception name in the detail, never its message (assumed).
- Q: (builder) And an invalid board id or a configuration with no columns? → A: they keep their earlier text after «No puedo leer el tablero:», without detail; they are not network failures (assumed).

### Refining the request (refine-request, 20 nov 2026)

- (2026-11-16, refine-request) The refine answers travel inside the request text, not as a separate field: Libretto receives them in `The ask, verbatim` without changing anything in Libretto.
- (2026-11-16, refine-request) «Que Claude me pregunte» uses Haiku and only runs when pressed; no other action of the dialog calls Claude.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Send the answers as a separate field to main and have main paste them | main would have to know the format; the text composed in the dialog is what the person sees in «Lanza» |
| Raise the 2000 cap in main | it touches `workspaces` and its criterion; the case is rare and the notice is enough |
| Sonnet for the questions | the sketch says Haiku; short questions need no more |

#### Decision log, answers as given (2026-11-20)
- Q: Where does it live? → A: in «Nueva tarea» and «Nuevo trabajo», folded and optional, as in the sketch; shown only with text written, like Modo (assumed).
- Q: How do the answers reach the agent? → A: pasted onto the request text after a blank line, one per line: the fixed ones as «Hecho cuando: …», Claude's as «¿pregunta? respuesta». Empty ones are not sent (assumed; this way Libretto reads them in `The ask, verbatim` without touching Libretto).
- Q: And if the text with answers exceeds 2000 characters (main's cap, W-MAX_TASK)? → A: the dialog says so and disables Empezar; main does not change (assumed). If wrong: the cap goes up in `workspaces.ts`.
- Q: Which model and when? → A: Haiku, only when «Que Claude me pregunte» is pressed; never automatic (CLAUDE.md quota rule) (assumed).
- Q: Does «Volver a preguntar» erase what was answered? → A: it replaces Claude's questions and their answers; the four fixed ones stay (assumed).
- Q: (spec-reviewer) Who governs `refine.ts`? → A: `workspaces`, which governs `src/main/**`; I35/I36 become W208/W209 in `spec-workspaces.md` (assumed).
- Q: (spec-reviewer) What does Claude's error say? → A: a fixed sentence and the code in `detail` («Ver detalle»), never Claude's output, like M16 (assumed).
- Q: (spec-reviewer) Answers hidden if the text is deleted? → A: with blank text nothing of refining is sent (I27 opens plain Claude); what was answered stays in the dialog and shows again when typing (assumed).
- Q: (spec-reviewer) Does it share the score queue? → A: no: Haiku runs beside it, one question at a time; waiting for a 3-minute score to ask a few questions makes no sense (assumed).
- Q: (work-reviewer) Does `App.tsx`'s photo view belong? → A: yes, in development only, for box 4's photo; added to Scope (assumed).
- Q: Does Enter in a refine field start the task, like Enter in Rama? → A: no: it moves to the next field; ⌘↩ still starts (assumed; starting half-answered would be a scare).

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
- **I3** If no Jira token is saved, then the inbox shall show "Conecta Jira en Ajustes" with a link, and shall never ask for the token anywhere but Ajustes; a saved token the API rejects follows I29.
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
- **I18** If reading the picked board fails, then the inbox shall fall back to the status-category groups and show «No puedo leer el tablero: {W150 sentence}» with the W150 detail folded.
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
- **I23** While the dialog is «Nueva tarea» and the text is empty or only spaces,
  Empezar shall be disabled; in both dialogs the text area shall accept at most 2000 characters.
  Proof: src/renderer/inbox/owntask.test.ts own task needs text
- **I25** If no repo is registered, then the dialog shall say «Añade un repo en
  Ajustes → Repos», offer «Ir a Ajustes» which closes the dialog and shows Ajustes, and Empezar
  shall be disabled.
  Proof: src/renderer/inbox/owntask.test.ts own task needs a repo
- **I26** While Jira is not connected (I3), «Nueva tarea» shall still be shown and open the dialog.
  Proof: src/renderer/inbox/owntask.test.ts own task works without jira
- **I24** While the person has not edited the branch, the branch shall be the first five words of
  the text, a word being a run of `[a-z0-9]` after lower-casing and removing accents, joined by
  hyphens, at most 40 characters with no trailing hyphen («Añadir filtro de Laboratorios» →
  `anadir-filtro-de-laboratorios`; «fix: bug-in api, ya» → `fix-bug-in-api-ya`); once the person
  changes the field in any way, it shall stay as they left it.
  Proof: src/renderer/inbox/owntask.test.ts branch follows the text until edited

### Repos in Ajustes (move-repos-to-settings, 9 nov 2026)

- **I27** When the person starts from «Nuevo trabajo», Atril shall open the workspace with the
  text as its task when the text is not blank (as I22), and with no task — plain Claude — when it
  is blank; Empezar needs only a repo and a branch there.
  (One proof holds both: the test starts one with text and one without and checks each call.)
  Proof: src/renderer/inbox/owntask.test.ts new work without text opens plain claude

### Jira, GitHub y GitLab (net-errors, 11 nov 2026)

- **I29** While Jira is connected and reading the tasks fails (including a 401 or 403), Tareas shall show the W150 problem with «No puedo enseñarte tus tareas.» under it, its button («Volver a comprobar» reads again; «Abrir Ajustes» opens Ajustes) and the detail folded — never «Conecta Jira en Ajustes», which stays for Jira not connected.
  Proof: src/main/jira/inbox.test.ts a jira failure says its cause and fix
  Proof: src/renderer/inbox/inbox.test.ts a connected jira failure shows its problem and button

### Refining the request (refine-request, 20 nov 2026)

- **I30** (amends what I22 and I27 call «the text»: from here it is the composed text below) While the text of «Nueva tarea» or «Nuevo trabajo» is not blank, the dialog shall show a folded `<details>` «Afinar la petición · opcional»; opened, it shall hold four fields — «¿Qué tiene que pasar cuando esté hecho?», «¿Qué no entra?», «¿Dónde se toca? (pantalla, archivos)», «Un ejemplo». The composed text shall be the request as typed, then — only if any answer (fixed or Claude's, I31) is filled — a blank line and one line per filled answer: the fixed ones first, in that order, as «Hecho cuando: …», «No entra: …», «Dónde: …», «Ejemplo: …», then Claude's (I31). Every answer shall be trimmed with inner newlines turned into spaces; blank ones add nothing. While the text is blank the section shall be hidden and nothing of it sent (I27 opens plain Claude), its answers kept in the dialog. Empezar shall send the composed text, and the «Lanza» line shall show the template with the composed text in place of «tu texto» whenever the text is not blank. The `<details>` summary shall add «1 respuesta añadida» or «{n} respuestas añadidas», n counting fixed and Claude's filled answers, and nothing at 0.
  Proof: src/renderer/inbox/refine.test.tsx the fixed questions add their answers to the request
  Proof: src/renderer/inbox/refine.test.tsx nuevo trabajo in automatic mode launches the composed text too
- **I31** When the person presses «Que Claude me pregunte» with text written, the dialog shall call `refine.ask(text)` once, show «Pensando…» with the button disabled while it waits, then one field per returned question under «Claude pregunta, sobre tu petición»; each filled one shall add «{pregunta} {respuesta}» after the fixed lines, cleaned as I30. Claude's questions stay when the request is edited. The button shall then read «Volver a preguntar», and pressing it shall replace Claude's questions and their answers, keeping the fixed ones. With blank text the button shall not exist (I30), and no other action of the dialog shall call `refine.ask`.
  Proof: src/renderer/inbox/refine.test.tsx claude asks only when pressed and its answers join the request
- **I32** If `refine.ask` answers an error, then the section shall show a `Problem` with that sentence, its `detail` folded, «Puedes empezar igual: afinar es opcional.» and «Volver a intentar», which asks again; Empezar shall stay usable.
  Proof: src/renderer/inbox/refine.test.tsx a failed ask says why and leaves the dialog usable
- **I33** While the request with its answers is longer than 2000 characters, Empezar shall be disabled and the dialog shall say «Con las respuestas pasa de 2000 caracteres: acorta algo.».
  Proof: src/renderer/inbox/refine.test.tsx a request too long with its answers cannot start
- **I34** When Enter is pressed in a field of the section, focus shall move to the next field of the section (from the last, to «Que Claude me pregunte»), and nothing shall start; ⌘↩ shall still start (I22).
  Proof: src/renderer/inbox/refine.test.tsx enter moves through the questions
