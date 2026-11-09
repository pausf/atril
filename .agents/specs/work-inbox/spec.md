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

## Scope boundaries

**In:** reading tasks, the Jira→repo memory, Start, the In Progress transition.

**Out:** creating, editing or commenting on Jira issues; any transition other than In
Progress (Done belongs to phase 2, with the MR); boards, epics, other people's tasks; Jira
through MCP. (The REST API is IN, with the token from Ajustes — decision log, 9 nov.)

**Never scoped out:** the issue key and the branch are validated before they reach a
command; the Jira token lives only in Atril's main process, encrypted at rest, and never reaches
the renderer, a log or an agent (the settings spec).

## Constraints

- The Jira REST API with the site, email and token saved in Ajustes (`.agents/specs/settings/spec.md`):
  `GET /rest/api/3/search/jql` with the JQL below, across every project in one call. The
  `jira` CLI is no longer used by Atril itself; the Libretto agent still uses it.
- The JQL: `assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC`. No
  sprint filter: observed 9 nov, the person has 0 tasks in open sprints and 24 open ones.
- The command Start runs goes through the primary spec's agent session, with Claude's hooks
  passed by `--settings` (the workspaces spec, W14).

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
