Tracker: none
Targets: workspaces
Durable decisions: the ones in Prior decisions below
Governs: src/main/** src/preload/** src/renderer/** resources/** !src/main/jira/** !src/renderer/inbox/** !src/main/flow/** !src/renderer/flow/** !src/main/credentials/** !src/renderer/settings/**

# add-atril-core

## The ask, verbatim

Pau, 9 nov 2026, en una sola conversación (en orden):

> ya me gustaria hacer un software de gestion de MR de gitlab o github

> podriamos combinar libretto con un nuevo softwaree de gestion con integration co github y gitlab para revisar lo que se tiene que ver etc... si quieres primero hazme bocetos en html. es un aaplicacion repito de MAC

> no tiene que combinar la dos cosas, para que sea un flujo en un app y que gestione githib y gitlab con lo que te pasado de flujos

> tambien que lea lo jira asignado a la persona que va

> haz un diseño mas visual, intentqado que se pueda abrir lo sugagente con lo que se esta trabajando por tara para ver como va etc..

> busca en intenet diseño etc... tiene que se mas minimalistas para que todo sea entendible

> tiene que funcionar como https://www.onorca.dev/

> ok adelante , importate lo de claude code para ponerle puntuaciones etc.. de complejidad de IA como explica 530 de las notas etc....

> mw gustaia hacerlo de 0 no utlizar orca

> peor que sea muy parecido pero con flujo de LIBRETTO , las puntuaciones etcc revisor de gitlaby github, que cargue tus tearea de Jira

> pero que tenga la funcionalidades tambien de orca ehh

> sisi con electron y typescript

"los flujos" y "530 de las notas" are the two 540 newsletters he pasted (#13 and #14):
software factory with deterministic guardrails shifted left, explain-pr, deciding which PRs
a human reads, spec-first, an orchestrator with core / worker / workflow executor / UI.

## The reading

**Not a bug.** Nothing exists yet; this is new work.

The whole product, agreed across the conversation: a native-feeling Mac app, built from
scratch in Electron + TypeScript, that works like Orca (an agent development environment:
one git worktree per agent, real agent terminals in split panes, Claude Code only,
usage meters) and adds what Orca lacks — the Libretto flow as the spine of every piece of
work, the person's own Jira tasks as the input, and review of GitLab and GitHub MRs with
scores (deterministic metrics decide, `claude -p --json-schema` explains). AI goes through
the Claude Code CLI on the subscription, never an API key.

Delivered in four phases, agreed 9 nov:

| Phase | Orca's part | Atril's own part |
|---|---|---|
| **1 · core — THIS CHANGE** | worktree per agent · real terminals with split panes · Claude Code · usage meter · macOS notifications | the person's Jira sprint tasks · Libretto flow per stage · "Empezar" opens a worktree and launches `/libretto-flow <KEY>` |
| 2 · review | built-in diff with inline comments sent back to the agent · open PR/MR from the app | GitLab and GitHub MRs · scores · which MR a human reads |
| 3 · comfort | file and Markdown previews · ⌘K jump anywhere · dictation · chat beside the terminal | visible guardrails · the spec stop inside the app |
| 4 · scale | remote hosts over SSH · scheduled automations · embedded browser · mobile app | a model per stage (Claude, Qwen on the VPS) |

**This change is phase 1 only.** Phases 2–4 are later changes.

Visual reference for this change: `bocetos/fase1-nucleo.html` (boceto 8). `bocetos/app-mac.html`
(boceto 6) is the whole product, phases 2–4 included — left sidebar with Jira tasks and
worktrees, centre the agent's terminal, right the Libretto panel. Minimal: colour only for
state (needs you / working / failed). Earlier sketches kept in `bocetos/` for history.

Orca (`github.com/stablyai/orca`, MIT, TypeScript + Electron) may be read for how it solves
PTYs and worktrees, and pieces reused with attribution — but Atril does not run on it.

## Decision log

### Session 2026-11-09
- Q: Si cierras Atril (o se cuelga) con agentes trabajando, ¿qué pasa con ellos? → A: Siguen vivos (tmux)
- Q: Para el medidor de cuota de Claude, ¿puede Atril leer tu token OAuth del Llavero y preguntarle a api.anthropic.com cuánto llevas? → A: Sí, como la statusline
- Q: Un worktree nuevo no trae los archivos que git ignora; ¿qué hace Atril al crear uno? → A: «No más preguntas», y después: «worktree si pero en alguno proyecto es imposibole por que son muyc complejos de hacer asi que tiene que saber cuando puee o no»
- Q: ¿Qué hace Atril cuando un repo no puede ir en worktree? → A: lo detecta con las tres señales de review-project (archivos sin versionar que la build necesita, dependencias demasiado pesadas, «el usuario lo dijo») y trabaja in-place cambiando de rama, con restauración garantizada; avisa del modo y el porqué (assumed, a partir de la respuesta anterior). Si es falso: cambia W1–W4 y W7–W9.
- Q: ¿Dónde viven los worktrees? → A: `~/.atril/wt/<repo>/<branch>` (assumed). Si es falso: solo cambia la ruta.
- Q: ¿Para quién es la app? → A: una persona, su Mac, sus CLIs ya configurados; sin servidor ni cuenta (assumed). Si es falso: toda la sincronización está por diseñar; la vista de equipo va después.
- Q: ¿Cómo sabe Atril que un agente te necesita? → A: en Claude, con hooks que Atril pasa por `claude --settings` y que escriben el estado de la sesión; en Codex, en esta fase solo «trabajando/parado» (assumed). El `notify` de Codex no se pudo comprobar: el CLI está roto en esta máquina (`codex --help` → ENOENT).
- Q: ¿Cómo se sabe el repo de un ticket de Jira? → A: se pregunta la primera vez por proyecto y componente y se recuerda (assumed). Si es falso: cambia I4.
- Q: ¿Cómo debe verse? → A: «el diseño que sea mas abierto y mas visual, aparte añade tutorial al principio señalando cada elemento ye xplicando como funciona todo»
- Q: ¿Cómo pintamos los paneles divididos (⌘D) de cada agente? → A: tmux los dibuja. Descartadas: «Tarjetas separadas (control mode)» — un parser del protocolo -CC, redimensionado y foco por panel, mucho más código; «Una sesión por panel» — tmux deja de saber que los paneles son del mismo trabajo y el layout pasa a Atril, cambiando el vocabulario de la spec.
- Q: El revisor encontró huecos que romperían el código; ¿cómo seguimos? → A: Corregir y luego casilla 1
- Q: (W10) ¿Qué pasa al quitar un worktree con trabajo sin commitear? → A: nunca se borra, ni confirmando; Atril dice que commitees o descartes antes (assumed, por la regla «nothing is deleted with uncommitted work»). Si es falso: cambia W10.
- Q: (build, casilla 1) tmux y jira no aceptan `--version` → A: cada herramienta con su comando: `tmux -V`, `jira version`, `--version` el resto (corrección de la spec: el contrato estaba mal, observado al renderizar)
- Q: (build, casilla 2) tus dos repos salían in-place por carpetas ignoradas (`out/`, `.atl/`, `.claude/`, `bin/`) → A: solo cuentan archivos ignorados, nunca carpetas (corrección de la spec, observada en los repos reales); el id del repo es el basename en minúsculas y con guiones
- Q: ¿Libretto viene dentro de la app? → A: «Libreto estará puesto directamente en la aplicación, ¿no? Es decir, la gente no se tendrá que bajar el libreto oficial, sino que ya estará oficialmente metido dentro del sistema.»
- Q: «Para que sea más usable y todo esto, ¿qué mejorarías?» → propuestas 1 (sin la pregunta de confianza de Claude en cada worktree) y 6 (el doctor como chip) a la fase 1, el resto a otra change → A: «si»
- Q: ¿Codex? → A: «no pongas codex»
- Q: «Pero Claude tiene que cargar las propias skills que se le vayan metiendo también, aparte del libreto. ¿Eso lo hace?» → A: sí, observado en la casilla 4 (`(user)` y `(libretto)` a la vez); queda como criterio W33 y se prohíbe saltarse las del usuario
- Q: ¿Tokens propios en vez de gh/glab/jira? → A: «Pensaba poner los tokens, o sea, los tokens de GitLab, GitHub y de Jira, no utilizar los GH y cosas de estas» → propuesta híbrida → A: «Yo lo haría. Yo lo haría, vale, híbrido, pero si no encuentra nada de token ni nada, una sección de ajustes donde pongan el token … pero ocultos, ¿sabes? O sea, cuando una vez que lo ponen, que ya no se puede visualizar.» (sustituye la decisión «Jira solo por el CLI» para lo que lee Atril; el agente de Libretto sigue usando el `jira` CLI)
- Q: ¿GitLab y GitHub en la fase 1? → A: «Y hacemos solo la fase 1 núcleo»
- Q: «Cuando se crea una nueva tarea, que se pueda elegir qué modelo utilizar … Cuando haces empezar … utiliza este modelo» → A: selector Modelo en Empezar y Nuevo trabajo: Por defecto · Opus · Sonnet · Haiku (sin Fable, por gasto); el modelo se guarda en el workspace record
- Q: la carpeta de código `src/main/secrets/` choca con tu regla global `Read/Edit(**/secrets/**)` → A: «si» a renombrarla `src/main/credentials/` (la regla queda intacta; el `mv` lo ejecutó Pau)
- Q: nombre de la rama → A: «Las ramas del proyecto suelen ser el nombre de la tarea. Por ejemplo, pf-4870 … suele ser referenciado con la tarea del Jira» (en los repos: la clave en mayúsculas, y una letra B/C… para un segundo intento)
- Q: ¿Otro nombre mejor que Atril? (propuestos Batuta, Podio, Concertino, Ensayo) → A: «atril»
- Q: «Haría que cogiera el icono del Tira o del GitHub o del GitLab … para mostrar como arriba como una sesión … saber que soy yo el que está en esa sesión de atril» → A: chip de sesión arriba con el avatar y nombre de Jira en la fase 1; GitHub y GitLab se suman en la fase 2
- Q: «no obtiene ninguna tarjeta de Jira» — 0 tareas en sprints abiertos, 24 abiertas asignadas (WEB, SHOP, APP) → A: «Todas, por estado»: Por empezar, En curso, y Code Review/Testing/Ready to Deploy plegadas
- Q: «quiero también efecto oscuro y efecto plano y que uno sea automático del sistema» → A: tema Claro, Oscuro y Automático (sigue al sistema), elegible en Ajustes; Automático por defecto
- Q: la lista de Jira tapa los trabajos en marcha → A: «Jira en su propia pantalla»
- Q: ¿seguir preguntando? → A: «de crear tareas y hacer cosas para mejorar este proyecto, que no se apague el ordenador, y tú sigue trabajando, ¿vale? No le preguntes, tú sigue.» (a partir de aquí, las decisiones van marcadas `(assumed)`)
- Q: ¿Qué hace Empezar con una tarea que ya está «En curso»? → A: no la mueve en Jira y lo dice («ya está en curso») (assumed, casilla 12). Si es falso: I8 intentaría la transición siempre.
- Q: ¿Cuándo se recuerda el repo de un proyecto de Jira? → A: solo cuando el trabajo se abre bien (assumed, casilla 12). Si es falso: un fallo al abrir también lo recordaría.
- Q: ¿El pie muestra el reinicio de las 5 h? → A: solo el de los 7 días, redondeado al minuto (assumed, casilla 8).
- Q: ¿Cómo evita Atril la pregunta de confianza de Claude? → A: Claude Code 2.1.319 no tiene flag para eso; Atril escribe `projects[<ruta>].hasTrustDialogAccepted` en `~/.claude.json` de forma atómica, con reintento y copia por arranque, solo en carpetas que crea Atril (assumed, casilla 14). Comprobado: sin la clave sale la pregunta, con ella no.
- Q: ¿El avatar de Jira lleva el token? → A: solo si la imagen está en el mismo dominio que Jira; el CDN de avatares de Atlassian es público (assumed, casilla 14).
- Q: el pie mostraba «api.anthropic.com respondió 429» (bug observado 9 nov: Atril y la statusline consultan la misma API) → A: mantener el último valor bueno con su antigüedad y espaciar los reintentos (assumed, W37)

## Vocabulary

Shared by every spec of this change, one name per concept.

| Term | Meaning |
|---|---|
| **repo** | a git repository the person registered in Atril; its **repo id** is the folder's basename, lowercased with `-` for anything outside `[a-z0-9-]`, and registering a second repo with the same basename asks for another id (`[a-z0-9-]+`) |
| **mode** | how a repo hosts work: `worktree` (one worktree per piece of work) or `in-place` (the main checkout switches branch; one piece of work at a time) |
| **workspace** | where one piece of work happens: a worktree, or the main checkout on a branch in `in-place` mode |
| **workspace record** | one entry in `~/.atril/workspaces.json`: workspace id, repo id, branch, mode, path, base commit, previous branch (in-place only), agent (`claude`), model (`default`, `opus`, `sonnet` or `haiku`), Jira key (if started from a task), tmux session name, the agent's pane id |
| **agent session** | a tmux session named `atril-<workspace id>`, where the workspace id is `[a-z0-9]{8}`; everything else about it is read from its workspace record, never parsed from the name |
| **pane** | a tmux pane of an agent session, shown as a terminal in the centre column |
| **agent state** | `working`, `needs-you` or `stopped` |
| **task** | a Jira issue assigned to the person and not Done, in any project, sprint or not |
| **Start** | the action that turns a task into a workspace plus an agent session running `/libretto-flow <KEY>` |
| **stage** | the Libretto stage of a workspace, read from its `.agents/changes/` files |
| **usage** | the 5-hour and 7-day quota of Claude |

## Outcomes

The `workspaces` capability, phase 1. Its siblings in this change: `spec-work-inbox.md`
(Jira tasks and Start), `spec-flow-status.md` (the Libretto stage of each workspace) and
`spec-settings.md` (the person's tokens, write-only).

- The person registers a repo by picking its folder; it appears in the sidebar with its
  **mode** and a one-line reason ("worktree: no signal found" or "in-place: `web/config.local`
  is unversioned and the build reads it"). The person can override the mode; the override
  persists across restarts.
- Opening a workspace creates it (a new worktree on a new branch, or — in `in-place` — a
  branch switch in the main checkout) and starts an agent session in tmux. The centre column
  shows its pane live and accepts typing as a real terminal does.
- `⌘D` and `⌘⇧D` split the focused pane into a new shell pane of the same session; panes
  sit side by side or stacked, as tmux lays them.
- Quitting Atril leaves every agent session running. Reopening lists them from tmux and
  attaches to them; nothing is restarted and nothing is lost.
- Each workspace shows its **agent state** with a dot and a text label. Entering `needs-you`
  raises one macOS notification; clicking it opens that workspace.
- The footer shows **usage**: Claude 5 h and 7 d with reset time. A
  source that cannot be read shows "—" and why.
- Removing a workspace never loses work: a worktree or in-place branch with uncommitted
  changes is never removed or switched away from — Atril says to commit or discard first.
  Removing a clean workspace ends its agent session; `in-place` restores the branch that was
  checked out before.
- Besides Start, each repo has "Nuevo trabajo": a branch name; the agent is always Claude.
- A missing or broken dependency (tmux, git, claude, jira) is named in the app with the
  command that installs it, and the rest of the app keeps working.
- The first launch opens a **tutorial** that highlights each element in turn (Jira tasks,
  workspaces, the agent's terminal, panes, the Libretto panel, agent states, usage) and
  explains what it does and how the flow runs through them. It can be skipped, and reopened
  later from the Help menu.
- The sidebar's sections ("Mis Jira", "Trabajo en marcha") fold by clicking their title and
  show their count, so seven tasks and five workspaces still fit (Pau, 9 nov: «en mis giras
  hay como 7 y en trabajo en marcha hay como 5, no cabe»). The rail of screens (Trabajo · MR ·
  Avisos) is drawn in boceto 8; only Trabajo is built in this change.
- The layout is open and visual: generous spacing, large readable type, each column with a
  clear title, empty states that explain what goes there.

## Scope boundaries

**In:** the three columns and footer of `bocetos/fase1-nucleo.html` (boceto 8), the
first-launch tutorial; repos,
modes, workspaces, agent sessions, panes, agent state, notifications, usage; and the two
sibling specs.

**Out, named so it is not added quietly:**
- every phase 2–4 feature: diff view, inline comments to the agent, MR/PR review, scores,
  GitLab/GitHub APIs, ⌘K, previews, dictation, chat UI, SSH hosts, automations, embedded
  browser, mobile app, model per stage
- a team view, a server, accounts, sync
- Windows and Linux builds
- editing files inside Atril (the agent and the person's editor do that)
- Codex, or any agent other than Claude Code — Pau, 9 nov: «no pongas codex»
- installing tmux, git, claude or jira for the person — Atril names the command, the
  person runs it
- auto-update and code signing / notarisation (run from source or an unsigned local build)

**Never scoped out:** branch names and issue keys are validated before they reach a shell;
the OAuth token never leaves the main process; nothing is deleted with uncommitted work in
it; keyboard reachability and text labels for every state.

## Constraints

- Electron (current stable) + TypeScript in strict mode, pnpm, Node 24 (installed:
  v24.21.0). The renderer runs with `contextIsolation` on and no Node integration; it talks
  to the main process through a typed preload bridge only.
- Terminals: `xterm.js` in the renderer, `node-pty` in the main process attached to
  `tmux attach -t <session>`. `node-pty` is native and must be rebuilt for Electron.
- tmux ≥ 3 (installed: 3.7b). Git worktrees. CLIs used as installed and configured by the
  person: `git`, `tmux`, `claude`, `jira`. Every external command is spawned with an
  argument array, never a shell string.
- macOS on Apple Silicon only.
- Network: `https://api.anthropic.com/api/oauth/usage`, plus the services whose tokens the
  person saved in Ajustes (`spec-settings.md`). Agents keep using the `jira` CLI.
- Libretto's file layout as `~/gitrepos/libretto-automata/docs/FLOW.md` defines it; the
  checklist rule is the one `find-work` uses.
- Tests with vitest; side-effecting commands behind a small runner interface so tests run
  against a temporary git repo and a fake tmux, never the person's real sessions.
- Visual: the boceto's minimal style — colour only for state (needs-you / working /
  failed), a text label beside every colour.

## Prior decisions

- **Built from scratch, not on Orca** — Pau, 9 nov: «mw gustaia hacerlo de 0 no utlizar
  orca». Orca's MIT source may be read and pieces reused with attribution.
- **Electron + TypeScript** — Pau, 9 nov: «sisi con electron y typescript».
- **Agent sessions live in tmux and outlive the app** — Pau, 9 nov (decision log).
- **Claude usage via the Keychain OAuth token, like the statusline** — Pau, 9 nov
  (decision log). Read per request from `Claude Code-credentials`, sent only to
  `api.anthropic.com`, cached 60 s in memory, never written anywhere.
- **AI through the Claude Code CLI on the subscription, never an API key** — agreed 9 nov.
- **Libretto ships inside Atril** — Pau, 9 nov (decision log). Loaded as a plugin, its flow
  command is `/libretto:libretto-flow` (observed in Claude's autocomplete, box 4); the bundle
  pins libretto-automata `171db90`. A pinned copy of
  libretto-automata's payload (MIT, with its vendored MIT items) lives in `resources/libretto/`
  as a Claude Code plugin; every Claude agent is launched with `--plugin-dir` pointing at it,
  for that session only. Nobody installs Libretto, and the person's `~/.claude` is untouched.
- **Claude Code is the only agent** — Pau, 9 nov: «no pongas codex». It is also the only one
  that runs the flow (`libretto --help` v0.44.2: «codex cannot run the flow»).
- **Worktree unless the repo cannot take one** — Pau, 9 nov: «worktree si pero en alguno
  proyecto es imposibole … tiene que saber cuando puee o no». Signals are review-project's
  (decision log, assumed).
- **Open, visual design and a first-launch tutorial pointing at each element** — Pau,
  9 nov (decision log).
- **tmux draws the panes** — Pau, 9 nov (decision log): one terminal per workspace attached
  to its session; ⌘D asks tmux to split. The boceto's separate cards are not built; panes
  look like tmux's.
- **Assumed defaults**, each with what changes if wrong, are in the decision log: worktree
  path, single person, needs-you detection, Jira→repo mapping.
- **Shortcut, with its ceiling:** usage polled every 60 s and Jira every 5 min. Adequate for
  one person; if the endpoint rate-limits or the numbers feel stale, move to the
  statusline's stdin feed or a longer cache.
- **Shortcut, with its ceiling:** the "heavy dependencies" signal is a size threshold of
  2 GB across `node_modules` and `vendor` (assumed). Wrong for a repo whose install is slow
  but small; the per-repo override covers it until a better signal is known.

## Task breakdown

- App shell: Electron main, preload bridge, renderer with sidebar / centre / right panel /
  footer, the boceto's minimal style.
- Dependency doctor: detect git, tmux, claude, jira; name the install command.
- Repo registry and mode detection, with the person's override persisted.
- Workspace lifecycle: create and remove, in both modes, with the safety rules.
- tmux session manager: create, list, attach, split, kill, named `atril-<repo>-<branch>`.
- Terminal bridge: `node-pty` attached to tmux, streamed to `xterm.js`, resize and input.
- Agent state: Claude hooks via `--settings` writing state; process exit → stopped.
- macOS notifications on entering `needs-you`.
- Usage reader: the Claude OAuth endpoint.
- First-launch tutorial: a step per element, highlight plus explanation, skip and reopen.
- Siblings: `spec-work-inbox.md`, `spec-flow-status.md`.

## Verification criteria

- **W1** When a repo is registered and none of the three signals is found, Atril shall set
  its mode to `worktree`.
  Proof: src/main/repos.test.ts  chooses worktree when no signal
- **W2** If the checkout holds a git-ignored file outside dependency, build and editor
  noise (`node_modules`, `vendor`, `dist`, `build`, `.cache`, `.next`, `coverage`, `tmp`,
  `.idea`, `.vscode`, `.DS_Store`, `*.log`), then Atril shall set the mode to `in-place` and
  name that file as the reason. Only files count — entries of `git ls-files --others
  --ignored --exclude-standard --directory` that do not end in `/`; ignored folders (build
  output, tool caches) are never a signal. Noise names match at any depth.
  Proof: src/main/repos.test.ts  chooses in-place when an ignored config file exists
- **W3** If every `node_modules` and `vendor` directory, at any depth, together exceed 2 GB, then Atril shall set the mode to
  `in-place` and say so.
  Proof: src/main/repos.test.ts  chooses in-place when dependencies are heavy
- **W4** Where the person has set a repo's mode, Atril shall use it instead of detection,
  across restarts.
  Proof: src/main/repos.test.ts  person override wins over detection
- **W5** When a workspace opens in `worktree` mode, Atril shall run `git worktree add` at
  `~/.atril/wt/<repo>/<branch>` on a new branch.
  Proof: src/main/workspaces.test.ts  creates the worktree on a new branch
- **W6** If a branch name fails `git check-ref-format --branch`, then Atril shall refuse
  before running any other command.
  Proof: src/main/workspaces.test.ts  refuses an invalid branch name
- **W7** While an `in-place` repo has an open workspace, Atril shall refuse to open a second
  one in that repo.
  Proof: src/main/workspaces.test.ts  refuses a second in-place workspace
- **W8** If the main checkout has uncommitted changes, then opening an `in-place` workspace
  shall refuse and change nothing.
  Proof: src/main/workspaces.test.ts  in-place refuses a dirty checkout
- **W9** When an `in-place` workspace is closed, Atril shall check out the previous branch
  from its workspace record; if the branch has uncommitted changes, it shall refuse instead.
  Proof: src/main/workspaces.test.ts  in-place close restores the previous branch
- **W10** If a worktree has uncommitted changes, then Atril shall refuse to remove it and say
  to commit or discard first; a clean worktree is removed with `git worktree remove` (never a
  recursive delete) and its agent session ended.
  Proof: src/main/workspaces.test.ts  refuses to remove a dirty worktree
- **W11** When a workspace opens, Atril shall write its workspace record and start its agent
  in a tmux session named `atril-<workspace id>` with `remain-on-exit on`, recording the
  agent's pane id.
  Proof: src/main/tmux.test.ts  starts the agent in a named tmux session
- **W12** When Atril starts, it shall show every workspace record, attach to its tmux session
  when one exists, and start no new agent; a record whose session is gone shows `stopped`.
  Proof: src/main/tmux.test.ts  reattaches to sessions that outlived the app
- **W13** When the person splits a pane, Atril shall add a tmux pane to that session.
  Proof: src/main/tmux.test.ts  split adds a pane to the session
- **W14** When a Claude hook reports a `Notification` event for a session, Atril shall set
  its agent state to `needs-you`.
  Proof: src/main/status.test.ts  claude notification marks needs-you
- **W15** When a session enters `needs-you`, Atril shall show one macOS notification, and no
  other until the session leaves that state.
  Proof: src/main/status.test.ts  notifies once per needs-you transition
- **W16** If the agent's pane (by its recorded pane id) is dead or missing, Atril shall set
  the agent state to `stopped`; other panes of the session do not count.
  Proof: src/main/status.test.ts  exited agent marks stopped
- **W17** When the usage endpoint answers, Atril shall show the Claude 5 h and 7 d
  percentages and reset times it returns.
  Proof: src/main/usage.test.ts  parses claude five hour and seven day
- **W18** The OAuth token shall never appear in Atril's log, in any IPC message to the
  renderer, or in any file under `~/.atril/`; the runner shall not log the stdout of a command
  marked secret.
  Proof: src/main/usage.test.ts  token never leaves the main process
- **W20** If a usage source cannot be read, then Atril shall show "—" with the reason.
  Proof: src/main/usage.test.ts  missing source shows a reason
- **W21** If git, tmux, claude or jira is missing or fails its version command — `-V`
  for tmux, `version` for jira, `--version` for the rest — then Atril shall
  name it with its install command — git `xcode-select --install`, tmux `brew install tmux`,
  claude `curl -fsSL https://claude.ai/install.sh | bash`,
  jira `brew install ankitpokhrel/jira-cli/jira-cli` — and keep the rest of the app working.
  Proof: src/main/doctor.test.ts  names each missing tool with its install command
- **W22** The sidebar, panes and every button shall be reachable by keyboard — `⌘L` moves
  focus from the terminal to the sidebar and `⌘J` to the right panel, as menu accelerators
  the terminal never receives — and every state colour shall carry a text label.
  Proof: src/renderer/a11y.test.ts  states have text labels and controls are focusable
- **W23** When Atril launches for the first time, it shall run the tutorial, highlighting
  each element in turn with its explanation.
  Proof: src/renderer/tutorial.test.ts  first launch runs the tutorial over every element
- **W24** When the person skips or finishes the tutorial, Atril shall not run it again on
  launch, and shall reopen it from Help → Tutorial.
  Proof: src/renderer/tutorial.test.ts  tutorial runs once and reopens from help
- **W25** While the tutorial runs, it shall be operable by keyboard alone (next, back, skip).
  Proof: src/renderer/tutorial.test.ts  tutorial works with the keyboard alone
- **W28** When the person clicks a sidebar section's title, Atril shall fold or unfold that
  section, keep its count visible, and remember the state across restarts.
  Proof: src/renderer/sidebar.test.ts  section title folds the section and keeps its count
- **W29** When Atril starts a Claude agent, it shall pass `--plugin-dir` with the Libretto
  copy bundled in the app, so the flow works on a machine where Libretto was never installed.
  Proof: src/main/agent.test.ts  claude starts with the bundled libretto plugin
- **W30** The bundled Libretto shall carry its `LICENSE`, `THIRD-PARTY.md` and every licence
  file under `licenses/`, and the version it was copied from.
  Proof: src/main/libretto-bundle.test.ts  bundle carries every licence and its version
- **W31** When Atril starts a Claude agent in a workspace it created, the agent shall not stop
  at Claude Code's folder-trust prompt.
  Proof: src/main/agent.test.ts  claude in an atril workspace skips the trust prompt
- **W32** While one or more tools have problems, the top bar shall show a single chip with
  their count, and the full list with install commands only when the chip is opened.
  Proof: src/renderer/doctor.test.ts  problems show as one chip that opens the list
- **W33** When Atril starts a Claude agent, the agent shall load the person's own user and
  project skills, commands, agents and plugins as well as the bundled Libretto: Atril adds
  `--plugin-dir` and never passes `--setting-sources`, `--bare` or anything else that drops
  them.
  Proof: src/main/agent.test.ts  claude keeps the person's own skills
- **W34** Where the person picks a model in Start or in "Nuevo trabajo", Atril shall launch
  Claude with `--model <alias>` (`opus`, `sonnet`, `haiku`; no flag for "Por defecto"), store it
  in the workspace record, and show it on the workspace row. Fable is not offered.
  Proof: src/main/agent.test.ts  chosen model reaches claude and the record
- **W35** Atril shall offer three themes in Ajustes — Claro, Oscuro and Automático (default,
  follows macOS); the choice persists across restarts, Automático switches live when the
  system appearance changes, and every theme keeps text contrast at 4.5:1 or more.
  Proof: src/renderer/theme.test.ts  theme follows the choice and the system
- **W36** If the main checkout of an in-place workspace is no longer on that workspace's
  branch when it is closed, then Atril shall refuse, say which branch it is on, and move
  nothing.
  Proof: src/main/workspaces.test.ts  in-place close refuses when the branch was changed by hand
- **W37** If reading usage fails (429, network) after a successful read, then Atril shall keep
  showing the last good values marked with their age, and double the wait before the next try
  (up to 10 min); the first success returns to every 60 s.
  Proof: src/main/usage.test.ts  rate limit keeps the last value and backs off
- **W26** When a Claude hook reports `Stop` for a session, Atril shall set its agent state to
  `needs-you`; when it reports `UserPromptSubmit`, to `working`.
  Proof: src/main/status.test.ts  stop marks needs-you and prompt submit marks working
- **W27** When a session leaves `needs-you` and enters it again, Atril shall notify again.
  Proof: src/main/status.test.ts  re-entering needs-you notifies again

## Approach

### Summary

An Electron app in three processes: the **main** process owns every side effect (git, tmux,
`jira`, `claude`, the Keychain, the file watchers) behind one command runner; a **preload**
exposes a typed, minimal bridge; the **renderer** is React and draws the boceto 8 layout,
the Start dialog and the tutorial. Every agent lives in a tmux session the main process
creates and never owns: the renderer shows it through one `xterm.js` terminal bridged to a
`node-pty` running `tmux attach`. State that must survive restarts lives under `~/.atril/`
or in tmux itself, never in the window.

### Technical context

- **Stack:** Electron (current stable), TypeScript strict, React, `electron-vite` (the same
  build Orca uses), pnpm, Node 24.21. `@xterm/xterm` + `@xterm/addon-fit` in the renderer,
  `node-pty` in main, rebuilt for Electron's ABI with `@electron/rebuild` on install.
- **Tests:** vitest. Pure logic (mode detection, stage, checklist, parsers, branch slugs)
  against fixtures; git behaviour against a real temporary repo; tmux behaviour against a
  real tmux on a private socket (`tmux -L atril-test`), so no test ever touches the
  person's sessions. Renderer tests with Testing Library in jsdom.
- **Gates:** `pnpm typecheck` (`tsc --noEmit`), `pnpm test`, `pnpm lint`. No CI in this
  change.
- **Blast radius:** a new repository. About 25 source files: `src/main/` (run, doctor,
  repos, workspaces, tmux, pty, status, notify, usage), `src/main/jira/`, `src/main/flow/`,
  `src/preload/`, `src/renderer/` (app, sidebar, workspace, flow panel, footer, start dialog,
  tutorial), `resources/claude-hook.mjs`, and one test file per capability area as the
  `Proof:` lines name.
- **State on disk:** `~/.atril/repos.json` (registered repos and their ids, overrides,
  Jira→repo memory), `~/.atril/workspaces.json` (workspace records),
  `~/.atril/state/<session>.json` (agent state written by hooks), `~/.atril/wt/` (worktrees),
  `~/.atril/hooks.json` (the settings file passed to Claude). The tutorial's "seen" flag in
  `~/.atril/ui.json`.

### The approach

- **One runner.** `run(cmd, args, { cwd, env })` spawns with an argument array and returns
  `{ code, stdout, stderr }`. Nothing else in main spawns a process; tests swap it.
  Branch names pass `git check-ref-format --branch` and issue keys their regex before any
  call that uses them (W6, I7).
- **Doctor** runs each tool's version command for git, tmux, claude, jira at launch; a
  failure becomes a named message with its install command (W21).
- **Mode detection** (W1–W4): `git ls-files --others --ignored --exclude-standard
  --directory` minus the noise list → first survivor is the in-place reason; `du -sk` of
  `node_modules` + `vendor` over 2 GB → in-place; an override in `repos.json` beats both.
- **Workspaces** (W5–W10): worktree mode runs `git worktree add -b <branch>
  ~/.atril/wt/<repo>/<branch>`; in-place records `git branch --show-current`, refuses on a
  non-empty `git status --porcelain`, then `git switch -c <branch>`, and on close switches
  back. Removal checks `git status --porcelain` in the worktree, asks if dirty, then `git
  worktree remove` (never `rm`).
- **tmux** (W11–W13): `tmux new-session -d -s atril-<id> -c <cwd> -P -F '#{pane_id}' <agent
  cmd>` returns the agent's pane id; then `set-option -t atril-<id> remain-on-exit on` and
  `window-size latest`. On launch, `workspaces.json` is the list; `tmux has-session` says
  which are alive (W12). ⌘D → `split-window -h`, ⌘⇧D → `split-window -v`.
- **Terminal bridge:** per open workspace, `node-pty` spawns `tmux attach -t <session>`; data
  and resize flow over IPC to one `xterm.js` instance. Switching workspace detaches the pty,
  never the session.
- **Agent state** (W14–W16): the agent command is `claude --settings ~/.atril/hooks.json
  …`; that file registers `Notification`, `Stop` and `UserPromptSubmit` hooks running
  `resources/claude-hook.mjs`, which asks tmux for its session name (`tmux display -p '#S'`)
  and writes `{ state, at }` to `~/.atril/state/<session>.json` — `Notification` and `Stop`
  mean `needs-you`, `UserPromptSubmit` means `working`. Main watches that directory. A 2 s
  poll of `tmux display -p -t <pane id> '#{pane_dead}'` marks `stopped` when it says 1 or the
  pane is gone (W16).
- **Notifications** (W15): Electron `Notification` on the transition into `needs-you` only;
  clicking focuses the window and selects that workspace.
- **Usage** (W17–W20): every 60 s, `security find-generic-password -s "Claude
  Code-credentials" -w` → parse `claudeAiOauth.accessToken` → `fetch`
  `https://api.anthropic.com/api/oauth/usage` with `Authorization: Bearer`, `anthropic-beta:
  oauth-2025-04-20` (the headers the statusline sends). The `security` call is marked secret
  so the runner never logs its stdout; the token is a local variable of that function and
  never crosses IPC, a logger or a file.
- **Jira** (I1–I9): `jira issue list --raw --jql …` every 5 min; Start →
  `repos.json` lookup or ask → branch slug → workspace → tmux with `claude --settings … "/
  libretto-flow <KEY>"` → `jira issue move <KEY> "In Progress"`, whose failure is shown and
  changes nothing else.
- **Nuevo trabajo / removal:** a per-repo action asks for a branch and an agent; removal
  checks `git status --porcelain`, refuses when dirty (W10), else kills `atril-<id>` and runs
  `git worktree remove` (or switches back, in-place).
- **Keyboard:** `⌘L` / `⌘J` / `⌘1…9` are Electron menu accelerators, handled before xterm.js
  sees the key, so focus can always leave the terminal (W22).
- **Flow** (F1–F12): `fs.watch` on each workspace's `.agents/changes/` (debounced 500 ms)
  → checklist reader with Libretto's rule → stage → IPC to the right panel.
- **Libretto bundled** (W29, W30): `scripts/bundle-libretto.mjs <ref>` copies `skills/`,
  `agents/`, `commands/`, `LICENSE`, `THIRD-PARTY.md` and `licenses/` from
  `~/gitrepos/libretto-automata` at a git ref into `resources/libretto/`, and writes
  `.claude-plugin/plugin.json` (`name: "libretto"`, the ref as version). The copy is committed;
  updating Libretto is re-running the script with a new ref. The exact name the flow command
  takes once loaded as a plugin (`/libretto-flow` or a namespaced form) is checked in that box
  with one real `claude` start, and I6 uses whatever it observed.
- **Trust prompt** (W31): the mechanism is chosen in its box from what Claude Code offers and
  is observed working with one real start (as W29's check). Candidates, in order: a setting or
  flag that marks the folder trusted for that session; writing `hasTrustDialogAccepted` for the
  workspace path into `~/.claude.json` — only if done atomically, because running Claude
  processes rewrite that file and a lost update would corrupt the person's config.
- **Tutorial** (W23–W25): React overlay with a spotlight over each `data-tour` element, 8
  steps as in boceto 8; `ui.json` records it as seen; Help → Tutorial reopens it.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Panes as separate cards via tmux control mode (`-CC`) | Pau chose tmux drawing them: control mode means a protocol parser and per-pane resize and focus — the most code for a visual difference |
| One tmux session per pane | the layout moves into Atril and tmux no longer knows the panes belong to one piece of work; the spec's vocabulary would change |
| `node-pty` without tmux | agents die with the app — Pau chose that they live on |
| Running on Orca as a plugin | Pau: «mw gustaia hacerlo de 0 no utlizar orca» |
| Vanilla DOM renderer, no React | fine for phase 1, but phases 2–4 add a diff view, review and chat; rewriting the renderer then costs more than React now |
| Claude's `rate_limits` from the statusline's stdin | only the statusline receives it; Atril is not a statusline. Becomes the better source if Claude Code ever exposes it to other processes |
| Detecting needs-you by scraping the terminal | brittle against every Claude Code UI change; hooks are the documented signal |
| Installing hooks into the person's `~/.claude/settings.json` | touches their global config and fires for every session; `--settings` scopes them to Atril's agents |

### Risks

| Risk | What catches it |
|---|---|
| `node-pty` built for Node's ABI, not Electron's → crash on first terminal | `@electron/rebuild` in `postinstall`; box 3 opens the first terminal and is checked by running the app |
| The usage endpoint is undocumented and may change shape | W20: an unreadable answer shows "—" with the reason; the parser test runs on a captured fixture |
| The Keychain prompts when Electron runs `security` | the call goes through `/usr/bin/security`, the same binary the statusline uses; if it prompts, the person allows once — observed in the first run, reported in present-work |
| Mode detection flags almost every repo as in-place | the noise list (W2) and the person's override (W4); the reason is always shown, so a wrong call is visible |
| Two tmux clients on one session fight over the size | `window-size latest` on every session Atril creates |
| `node-pty` must be rebuilt for Electron | `pnpm rebuild` runs `electron-rebuild -f -w node-pty`; `pnpm-workspace.yaml` holds `allowBuilds: node-pty: false` so pnpm 11 stops failing the install and the rebuild is explicit |
| pnpm 11 skips Electron's install script on a fresh clone, so `pnpm dev` says "Electron uninstall" | not solved: `allowBuilds` and `onlyBuiltDependencies` in `pnpm-workspace.yaml` were both tried on a fresh install and neither ran it; until found, run `node node_modules/electron/install.js` once after `pnpm install` |
| Launched from Finder, a macOS app does not inherit the shell's PATH, so tmux, claude and jira look missing | not hit while Atril runs from source with `pnpm dev`; a packaged build must resolve PATH from the login shell first |
| The runner has no timeout, so a tool that hangs on its version command blocks the doctor | accepted for phase 1; add a timeout to `run` the first time it is seen |
| The person also has Libretto installed globally, so the agent sees two copies of each skill | accepted: the plugin's are namespaced (`/libretto:…`) and Start always calls the plugin's. Atril never skips the person's own skills to avoid duplicates (W33) |
| Libretto's own `libretto` CLI (loop, metrics, init) is not bundled | accepted: the flow's skills do not need it to run; bundle it with the app when a feature calls it |
| Claude's `/hooks` menu does not list hooks passed with `--settings`, so it cannot prove they loaded | a `SessionStart` probe through the same script wrote its state file in a real Claude start (box 7); that is the evidence, not the menu |
| Reopening Atril would notify for every agent already waiting | the first refresh after launch only records state; notifications start from the next transition (box 7 choice) |
| Libretto's find-work branches when it writes the proposal; Start already put the agent on branch `<KEY>` | Libretto's rule is "ensure, not create" off the base branch; checked in the Start box with one real run that the change stays on `<KEY>` |
| The `/rest/api/3/search/jql` response shape was proved only against invented fixtures | closed 9 nov: with Pau's real token the Tareas screen showed his 24 open tasks grouped 1 / 8 / 15 |
| Trust entries stay in `~/.claude.json` after a workspace is closed | accepted for phase 1: one small key per path Atril created; clean them on removal if they pile up |
| `~/.claude.json` is rewritten by every running Claude process | trust writes are atomic (temp + rename) and retried when the file changed between read and rename; a write that cannot parse the file is skipped, never forced |
| `Stop` fires at the end of every turn, so `needs-you` may be noisy | accepted for phase 1; one notification per transition (W15) bounds it |

### Validation and rollback

- Every W/I/F criterion has its vitest `Proof:`; `spec-drift --anchors` must pass before
  landing.
- **Forced red before believed:** W18 (put the token into a log line, an IPC payload and a
  file under `~/.atril/` in turn → the test must fail each time),
  W15 (notify twice → must fail), W8 (dirty checkout must refuse — make it clean and watch
  the test fail), F7 (a fenced box must not count).
- tmux tests on a private socket can pass for the wrong reason if they never attach — W12's
  test kills nothing and asserts the session survived a simulated app restart.
- The visual outcomes (open layout, tutorial placement) have no automated proof beyond
  W22–W25; they are checked by running the app against boceto 8 in present-work.
- **Rollback:** a new repository — delete the app, `rm -r ~/.atril` after `git worktree
  remove` for each worktree, `tmux kill-session` for each `atril-*` session. Nothing in the
  person's repos changes except branches Atril created.

### Complexity deliberately kept

- **tmux**, an extra dependency, because it is what makes agents outlive the app.
- **React**, because phases 2–4 are UI-heavy; the alternatives table says why.
- **The runner interface**, so no test ever spawns into the person's real sessions or repos.
- **Hooks through `--settings`** instead of terminal scraping: one tiny script for a signal
  that does not break when Claude Code redraws its UI.

## Checklist

- [x] the app opens: Electron + React shell with the three columns and footer of boceto 8, the runner, and the doctor naming each missing tool with its install command · Closes: W21
- [x] register a repo by folder; the sidebar shows its mode with the reason, and the person's override persists · waits on box 1 · Closes: W1, W2, W3, W4
- [x] "Nuevo trabajo" opens a workspace in worktree mode on a new branch with claude in an `atril-<id>` tmux session recorded in workspaces.json, shown live in the centre terminal; relaunching Atril reattaches without starting agents; a dirty worktree is never removed · waits on box 2 · Closes: W5, W6, W10, W11, W12
- [x] Libretto bundled: the script copies the pinned payload with its licences into resources/libretto as a Claude Code plugin, and every Claude agent starts with --plugin-dir pointing at it · waits on box 3 · Closes: W29, W30, W33
- [x] in-place workspaces: refuse a dirty checkout, refuse a second one per repo, restore the previous branch on close, and refuse to close when the branch was changed by hand · waits on box 3 · Closes: W7, W8, W9, W36
- [x] ⌘D and ⌘⇧D split the focused workspace through tmux · waits on box 3 · Closes: W13
- [x] agent state from Claude hooks passed by --settings and from the agent's dead pane, with one macOS notification per needs-you transition that opens the workspace · waits on box 3 · Closes: W14, W15, W16, W26, W27
- [x] usage footer: Claude 5 h and 7 d from the Keychain token and the usage endpoint, "—" with a reason when unreadable, the token never leaving main · waits on box 1 · Closes: W17, W18, W20
- [x] the right panel shows the Libretto stage and checklist of the selected workspace and follows file changes · waits on box 3 · Closes: F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12
- [x] Ajustes: the Jira token card, encrypted with safeStorage, checked on save, write-only once saved, and the "Conecta X en Ajustes" state · waits on box 1 · Closes: S1, S2, S3, S4, S5, S6, S7
- [x] "Mis Jira" lists the person's open sprint tasks through the Jira REST API with the token from Ajustes, grouped by status in its own Tareas screen with a sidebar summary, and links to Ajustes when there is none · waits on box 10 · Closes: I1, I2, I3, I11, I12
- [x] Start, and a Modelo selector in Start and Nuevo trabajo: repo memory, branch slug, validated key, claude running /libretto-flow <KEY> in a new workspace, In Progress transition whose failure keeps the workspace, and the task showing its workspace afterwards · waits on boxes 3, 4, 7, 11 · Closes: I4, I5, I6, I7, I8, I9, I10, W34
- [x] keyboard reachability and text labels everywhere, foldable sidebar sections, the Claro/Oscuro/Automático theme, and the first-launch tutorial over every element, skippable, reopenable from Help, keyboard-only · waits on boxes 3, 8, 9, 11 · Closes: W22, W23, W24, W25, W28, W35
- [x] Claude agents in Atril workspaces start without the folder-trust prompt, tool problems collapse into one top-bar chip, and the top bar shows who is signed in · waits on boxes 3, 10 · Closes: W31, W32, S8
- [x] usage survives rate limits: the last good values stay with their age and retries back off up to 10 min · waits on box 8 · Closes: W37
