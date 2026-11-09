# Workspaces

Governs: src/main/** src/preload/** src/renderer/** resources/** !src/main/jira/** !src/renderer/inbox/** !src/main/flow/** !src/renderer/flow/** !src/main/credentials/** !src/renderer/settings/**

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

The `workspaces` capability, phase 1. Its siblings in this change: `.agents/specs/work-inbox/spec.md`
(Jira tasks and Start), `.agents/specs/flow-status/spec.md` (the Libretto stage of each workspace) and
`.agents/specs/settings/spec.md` (the person's tokens, write-only).

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

### Agent activity (add-agent-activity, 9 nov 2026)

- Next to the terminal, an **Actividad** tab in the right panel shows, newest first and live,
  what the selected agent is doing: «Leyendo Repository.php», «Editando ListOrders.php»,
  «Ejecutando vendor/bin/phpunit --filter Orders», «✗ phpunit falló», «Lanzando un subagente:
  T5 paginación», «Claude dice: …», «Te pregunta: …».
- Each workspace row in the sidebar shows its latest activity line under the branch.
- The macOS needs-you notification carries the agent's real message, not only the branch.

### Next up (add-next-up, 9 nov 2026)

- A **«Qué me toca»** strip at the top of Trabajo lists, in order, the agents waiting for the
  person (oldest first) and then the tasks waiting to start; **⌘↩** opens the next one.
- The needs-you notification has a **reply field**: what the person types goes into that
  agent's terminal, followed by Enter, without opening Atril.

### Own tasks (add-own-tasks, 9 nov 2026)

- `workspaces.open` takes an optional task text; the agent then starts with the Libretto flow
  and that text as its request.

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

### Agent activity (add-agent-activity, 9 nov 2026)

**In:** summarising Claude Code hook payloads (PreToolUse, PostToolUse, Notification, Stop,
UserPromptSubmit) into short local lines; the feed, the row line, the notification body.

**Out:** token or cost per workspace; replaying the whole transcript; Codex; sending activity
anywhere off the machine.

**Never scoped out:** the raw payload is never written to disk; file contents never leave the
hook process; lines are capped at 200 characters and 200 lines per session.

### Next up (add-next-up, 9 nov 2026)

**In:** the strip, ⌘↩, the reply notification. **Out:** MRs in the strip (phase 2), replies to
anything but the agent's own pane.

**Never scoped out:** a reply only ever reaches the pane of the workspace the notification
belongs to; the reply text goes to tmux as a literal (`send-keys -l`), never as key names or
shell; an empty reply sends nothing.

### Own tasks (add-own-tasks, 9 nov 2026)

**In:** validating the text and building the agent argument in main. **Out:** storing the text
in the workspace record.

**Never scoped out:** the text is one argv element after `/libretto:libretto-flow `, so it can
never become a `claude` flag or reach a shell; the renderer cannot choose the command.

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
  person saved in Ajustes (`.agents/specs/settings/spec.md`). Agents keep using the `jira` CLI.
- Libretto's file layout as `~/gitrepos/libretto-automata/docs/FLOW.md` defines it; the
  checklist rule is the one `find-work` uses.
- Tests with vitest; side-effecting commands behind a small runner interface so tests run
  against a temporary git repo and a fake tmux, never the person's real sessions.
- Visual: the boceto's minimal style — colour only for state (needs-you / working /
  failed), a text label beside every colour.

### Agent activity (add-agent-activity, 9 nov 2026)

- The hook runs as `ELECTRON_RUN_AS_NODE=1 "<Atril's execPath>" "<resources>/claude-hook.mjs"
  <event>` from the hooks.json Atril writes; it keeps writing the agent state exactly as
  today (W14–W16, W26) plus the activity line.
- Activity lives in `$ATRIL_HOME/activity/<session>.jsonl` (`{at, kind, text}` per line);
  main watches it like the state files.
- `Stop` reads the last assistant text from the payload's `transcript_path` (JSONL), only the
  last entry, only its text.

### Next up (add-next-up, 9 nov 2026)

- Electron `Notification` with `hasReply: true` and the `reply` event (macOS).
- `tmux send-keys -t <pane id> -l <text>` then `send-keys -t <pane id> Enter`, through the runner.
- The list is computed in main from the agent states (waiting time from the state file's `at`)
  and the inbox groups; ⌘↩ is a menu accelerator, handled before xterm.

### Own tasks (add-own-tasks, 9 nov 2026)

- tmux `respawn-pane` already receives argv as separate arguments (W39); the text rides that.

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

### Alternatives that lost (from the approach, 9 nov 2026)

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

### Complexity deliberately kept

- **tmux**, an extra dependency, because it is what makes agents outlive the app.
- **React**, because phases 2–4 are UI-heavy; the alternatives table says why.
- **The runner interface**, so no test ever spawns into the person's real sessions or repos.
- **Hooks through `--settings`** instead of terminal scraping: one tiny script for a signal
  that does not break when Claude Code redraws its UI.

### Decision log, answers as given (2026-11-09)
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
- Q: ¿Se guarda copia de `~/.claude.json` antes de escribir la confianza? → A: no; puede contener otros secretos (claves de servidores MCP). Protege la escritura atómica con reintento y no escribir nunca un archivo ilegible (assumed, revisión en frío 9 nov). Si es falso: vuelve una copia, pero fuera de `~/.atril` y cifrada.

### Agent activity (add-agent-activity, 9 nov 2026)

- **More feedback than the terminal** — Pau, 9 nov: «Podemos mejorar la terminal para ver lo
  que dice Claude … Molaría un poco más de feedback … También aparte del que hay».
- **Summaries, never payloads** (assumed, decision log).
- **Electron as the hook's Node** (assumed, decision log): a Finder-launched app has no PATH.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Parse JSON in POSIX sh | fragile and unsafe with arbitrary payloads |
| Require node/jq on PATH | a Finder-launched app has no PATH |
| Read the whole transcript | heavy, and it holds file contents; one last entry is enough |
| Store raw payloads and summarise in main | puts prompts and file contents on disk |

#### Decision log, answers as given (2026-11-09)
- Q: «No le preguntes, tú sigue» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Cómo lee el hook el JSON sin node ni jq en el PATH? → A: con el propio Electron de Atril como Node (`ELECTRON_RUN_AS_NODE=1 <execPath> claude-hook.mjs`), comprobado 9 nov (assumed).
- Q: ¿Dónde se ve la actividad? → A: pestañas «Libretto | Actividad» en el panel derecho, y la última línea en la fila de cada trabajo (assumed).
- Q: ¿Qué se guarda? → A: solo una línea de resumen por evento (≤ 200 caracteres), nunca el payload: de Edit/Write solo la ruta, del prompt solo los primeros 80 caracteres; las últimas 200 líneas por sesión (assumed).
- Q: (spec-reviewer) ¿Qué lleva el cuerpo del aviso del Mac y de dónde sale? → A: con Notification, el mensaje del agente; con Stop, el «Claude dice: …»; el hook escribe ese texto en el mismo archivo de estado (`{state, at, text}`) que dispara el aviso, así no hay orden entre dos archivos (assumed).
- Q: (spec-reviewer) ¿Los eventos de herramienta cambian el estado? → A: sí: PreToolUse y PostToolUse ponen `working` (aprobar un permiso hace que el agente vuelva a trabajar) (assumed). Amplía W26.
- Q: (spec-reviewer) ¿Qué línea deja UserPromptSubmit? → A: «Le has escrito: <primeros 80 caracteres>» (assumed, A8).
- Q: (spec-reviewer) ¿Qué es un Bash «fallido»? → A: código de salida distinto de 0, un error o una interrupción en la respuesta de la herramienta, el que venga (assumed).
- Q: (work-reviewer) el `.gitignore` de esta rama (`.DS_Store`, `caso-*`, `flujo-mr*`) no lo cubre el contrato → A: viene de otra petición de Pau, hacer el repo privado («Cambian el nombre. Ponlo en privado y que se llame Atril»); los archivos del concepto viejo llevan datos del trabajo y no deben subirse nunca.
- Q: (work-reviewer) ¿la descripción de un subagente puede llevar texto tipo prompt? → A: sí; mismo límite de 80 caracteres que el prompt (assumed).

### Next up (add-next-up, 9 nov 2026)

- **The usability batch** — Pau, 9 nov: «Para que sea más usable y todo esto, ¿qué mejorarías?»
  → «si» to the next-up queue, the reply notification and one-click Start, in their own change.
- **A click right after a reply is ignored** (N3): macOS may follow a reply with a click; one
  within 1 s of a reply does not bring Atril to the front. Unverified on a real notification —
  if it proves unnecessary or too short, this is the knob.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Reply by opening Atril | the point is answering without switching apps |
| `send-keys` without `-l` | text like `C-c` or `Enter` would be interpreted as keys |

#### Decision log, answers as given (2026-11-09)
- Q: ¿Qué entra en «Qué me toca»? → A: agentes en «te necesita» (los más antiguos primero), después tareas de la primera columna del tablero (o «Por empezar» sin tablero); las MR llegan con la fase 2 (assumed).
- Q: ¿Cómo se responde desde el aviso? → A: aviso de macOS con respuesta (`hasReply`); el texto se escribe en el panel del agente con `tmux send-keys -l` y Enter, solo en ese panel (assumed).
- Q: (spec-reviewer) ¿Qué tareas entran en la lista? → A: solo las que no tienen ya un trabajo abierto; si el tablero no se puede leer (I18), las del grupo «Por empezar» (assumed).
- Q: (spec-reviewer) ¿Dónde funciona ⌘↩? → A: solo con Trabajo o Tareas a la vista y con algo en la lista; si no, el elemento del menú está desactivado (assumed).
- Q: (spec-reviewer) ¿Responder en el aviso cuenta como pulsarlo (W38)? → A: no: responder no trae Atril al frente ni cambia de pantalla; solo pulsar el aviso lo hace (assumed).
- Q: (spec-reviewer) ¿Y si el trabajo ya no existe al responder? → A: no se envía nada y un aviso dice «No se pudo enviar: ese trabajo ya no está» (assumed).
- Q: (work-reviewer) ⌘↩ sobre una tarea que la ventana aún no ha cargado no hacía nada → A: abre Tareas, que recarga Jira al montarse (assumed, N2).

### Own tasks (add-own-tasks, 9 nov 2026)

- **The flow command is built in main** (assumed): the renderer sends data, never a command line.

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
- Siblings: `.agents/specs/work-inbox/spec.md`, `.agents/specs/flow-status/spec.md`.

## Verification criteria

- **W1** When a repo is registered and none of the three signals is found, Atril shall set
  its mode to `worktree`.
  Proof: src/main/repos.test.ts chooses worktree when no signal
- **W2** If the checkout holds a git-ignored file outside dependency, build and editor
  noise (`node_modules`, `vendor`, `dist`, `build`, `.cache`, `.next`, `coverage`, `tmp`,
  `.idea`, `.vscode`, `.DS_Store`, `*.log`), then Atril shall set the mode to `in-place` and
  name that file as the reason. Only files count — entries of `git ls-files --others
  --ignored --exclude-standard --directory` that do not end in `/`; ignored folders (build
  output, tool caches) are never a signal. Noise names match at any depth.
  Proof: src/main/repos.test.ts chooses in-place when an ignored config file exists
- **W3** If every `node_modules` and `vendor` directory, at any depth, together exceed 2 GB, then Atril shall set the mode to
  `in-place` and say so.
  Proof: src/main/repos.test.ts chooses in-place when dependencies are heavy
- **W4** Where the person has set a repo's mode, Atril shall use it instead of detection,
  across restarts.
  Proof: src/main/repos.test.ts person override wins over detection
- **W5** When a workspace opens in `worktree` mode, Atril shall run `git worktree add` at
  `~/.atril/wt/<repo>/<branch>` on a new branch.
  Proof: src/main/workspaces.test.ts creates the worktree on a new branch
- **W6** If a branch name fails `git check-ref-format --branch`, then Atril shall refuse
  before running any other command.
  Proof: src/main/workspaces.test.ts refuses an invalid branch name
- **W7** While an `in-place` repo has an open workspace, Atril shall refuse to open a second
  one in that repo.
  Proof: src/main/workspaces.test.ts refuses a second in-place workspace
- **W8** If the main checkout has uncommitted changes, then opening an `in-place` workspace
  shall refuse and change nothing.
  Proof: src/main/workspaces.test.ts in-place refuses a dirty checkout
- **W9** When an `in-place` workspace is closed, Atril shall check out the previous branch
  from its workspace record; if the branch has uncommitted changes, it shall refuse instead.
  Proof: src/main/workspaces.test.ts in-place close restores the previous branch
- **W10** If a worktree has uncommitted changes, then Atril shall refuse to remove it and say
  to commit or discard first; a clean worktree is removed with `git worktree remove` (never a
  recursive delete) and its agent session ended.
  Proof: src/main/workspaces.test.ts refuses to remove a dirty worktree
- **W11** When a workspace opens, Atril shall write its workspace record and start its agent
  in a tmux session named `atril-<workspace id>` with `remain-on-exit on`, recording the
  agent's pane id.
  Proof: src/main/tmux.test.ts starts the agent in a named tmux session
- **W12** When Atril starts, it shall show every workspace record, attach to its tmux session
  when one exists, and start no new agent; a record whose session is gone shows `stopped`.
  Proof: src/main/tmux.test.ts reattaches to sessions that outlived the app
- **W13** When the person splits a pane, Atril shall add a tmux pane to that session.
  Proof: src/main/tmux.test.ts split adds a pane to the session
- **W14** When a Claude hook reports a `Notification` event for a session, Atril shall set
  its agent state to `needs-you`.
  Proof: src/main/status.test.ts claude notification marks needs-you
- **W15** When a session enters `needs-you`, Atril shall show one macOS notification, and no
  other until the session leaves that state.
  Proof: src/main/status.test.ts notifies once per needs-you transition
- **W16** If the agent's pane (by its recorded pane id) is dead or missing, Atril shall set
  the agent state to `stopped`; other panes of the session do not count.
  Proof: src/main/status.test.ts exited agent marks stopped
- **W17** When the usage endpoint answers, Atril shall show the Claude 5 h and 7 d
  percentages and reset times it returns.
  Proof: src/main/usage.test.ts parses claude five hour and seven day
- **W18** The OAuth token shall never appear in Atril's log, in any IPC message to the
  renderer, or in any file under `~/.atril/`; the runner shall not log the stdout of a command
  marked secret.
  Proof: src/main/usage.test.ts token never leaves the main process
- **W20** If a usage source cannot be read, then Atril shall show "—" with the reason.
  Proof: src/main/usage.test.ts missing source shows a reason
- **W21** If git, tmux, claude or jira is missing or fails its version command — `-V`
  for tmux, `version` for jira, `--version` for the rest — then Atril shall
  name it with its install command — git `xcode-select --install`, tmux `brew install tmux`,
  claude `curl -fsSL https://claude.ai/install.sh | bash`,
  jira `brew install ankitpokhrel/jira-cli/jira-cli` — and keep the rest of the app working.
  Proof: src/main/doctor.test.ts names each missing tool with its install command
- **W22** The sidebar, panes and every button shall be reachable by keyboard — `⌘L` moves
  focus from the terminal to the sidebar and `⌘J` to the right panel, as menu accelerators
  the terminal never receives — and every state colour shall carry a text label.
  Proof: src/renderer/a11y.test.ts states have text labels and controls are focusable
- **W23** When Atril launches for the first time, it shall run the tutorial, highlighting
  each element in turn with its explanation.
  Proof: src/renderer/tutorial.test.ts first launch runs the tutorial over every element
- **W24** When the person skips or finishes the tutorial, Atril shall not run it again on
  launch, and shall reopen it from Help → Tutorial.
  Proof: src/renderer/tutorial.test.ts tutorial runs once and reopens from help
- **W25** While the tutorial runs, it shall be operable by keyboard alone (next, back, skip).
  Proof: src/renderer/tutorial.test.ts tutorial works with the keyboard alone
- **W28** When the person clicks a sidebar section's title, Atril shall fold or unfold that
  section, keep its count visible, and remember the state across restarts.
  Proof: src/renderer/sidebar.test.ts section title folds the section and keeps its count
- **W29** When Atril starts a Claude agent, it shall pass `--plugin-dir` with the Libretto
  copy bundled in the app, so the flow works on a machine where Libretto was never installed.
  Proof: src/main/agent.test.ts claude starts with the bundled libretto plugin
- **W30** The bundled Libretto shall carry its `LICENSE`, `THIRD-PARTY.md` and every licence
  file under `licenses/`, and the version it was copied from.
  Proof: src/main/libretto-bundle.test.ts bundle carries every licence and its version
- **W31** When Atril starts a Claude agent in a workspace it created, the agent shall not stop
  at Claude Code's folder-trust prompt.
  Proof: src/main/agent.test.ts claude in an atril workspace skips the trust prompt
- **W32** While one or more tools have problems, the top bar shall show a single chip with
  their count, and the full list with install commands only when the chip is opened.
  Proof: src/renderer/doctor.test.ts problems show as one chip that opens the list
- **W33** When Atril starts a Claude agent, the agent shall load the person's own user and
  project skills, commands, agents and plugins as well as the bundled Libretto: Atril adds
  `--plugin-dir` and never passes `--setting-sources`, `--bare` or anything else that drops
  them.
  Proof: src/main/agent.test.ts claude keeps the person's own skills
- **W34** Where the person picks a model in Start or in "Nuevo trabajo", Atril shall launch
  Claude with `--model <alias>` (`opus`, `sonnet`, `haiku`; no flag for "Por defecto"), store it
  in the workspace record, and show it on the workspace row. Fable is not offered.
  Proof: src/main/agent.test.ts chosen model reaches claude and the record
- **W35** Atril shall offer three themes in Ajustes — Claro, Oscuro and Automático (default,
  follows macOS); the choice persists across restarts, Automático switches live when the
  system appearance changes, and every theme keeps text contrast at 4.5:1 or more.
  Proof: src/renderer/theme.test.ts theme follows the choice and the system
- **W36** If the main checkout of an in-place workspace is no longer on that workspace's
  branch when it is closed, then Atril shall refuse, say which branch it is on, and move
  nothing.
  Proof: src/main/workspaces.test.ts in-place close refuses when the branch was changed by hand
- **W37** If reading usage fails (429, network) after a successful read, then Atril shall keep
  showing the last good values marked with their age, and double the wait before the next try
  (up to 10 min); the first success returns to every 60 s.
  Proof: src/main/usage.test.ts rate limit keeps the last value and backs off
- **W38** When the person clicks a needs-you notification, Atril shall show the Trabajo screen
  with that workspace selected, whatever screen was open.
  Proof: src/renderer/a11y.test.ts notification click opens the workspace from any screen
- **W26** When a Claude hook reports `Stop` for a session, Atril shall set its agent state to
  `needs-you`; when it reports `UserPromptSubmit`, to `working`.
  Proof: src/main/status.test.ts stop marks needs-you and prompt submit marks working
- **W27** When a session leaves `needs-you` and enters it again, Atril shall notify again.
  Proof: src/main/status.test.ts re-entering needs-you notifies again

### Agent activity (add-agent-activity, 9 nov 2026)

- **A1** When a Claude hook fires, Atril shall append one line `{at, kind, text}` of at most
  200 characters to the session's activity file, and never write the hook's raw payload.
  Proof: src/main/activity.test.ts hook appends a short summary, never the payload
- **A2** When PreToolUse reports Read, Edit, Write, Bash, Grep/Glob or Task, the line shall
  read «Leyendo <file>», «Editando <file>», «Escribiendo <file>», «Ejecutando <first 60 chars of
  the command>», «Buscando <pattern>» or «Lanzando un subagente: <first 80 characters of the
  description>»; any other
  tool shall show its name.
  Proof: src/main/activity.test.ts summarises each tool
- **A3** If PostToolUse reports a Bash command that failed — a non-zero exit code, an error or
  an interruption in the tool response — then the line shall read «✗ <first 60 chars> falló».
  Proof: src/main/activity.test.ts failed command is marked
- **A4** When a Notification hook fires, the line and the macOS notification body shall carry
  the agent's message («Te pregunta: …»); when a Stop hook fires, the body shall carry A5's
  «Claude dice: …». The hook writes that text into the state file it writes, so the body always
  belongs to the event that changed the state.
  Proof: src/main/activity.test.ts notification carries the agent's message
- **A5** When a Stop hook fires, the line shall quote, within A1's 200-character cap, the start of the last
  assistant text in the transcript as «Claude dice: …».
  Proof: src/main/activity.test.ts stop quotes the last thing claude said
- **A6** The activity file shall keep at most its last 200 lines.
  Proof: src/main/activity.test.ts activity file stays bounded
- **A8** When UserPromptSubmit fires, the line shall read «Le has escrito: <first 80
  characters of the prompt>», and PreToolUse / PostToolUse shall set the agent state to `working`.
  Proof: src/main/activity.test.ts prompt line is short and tool events mean working
- **W39** When an agent exits as soon as it starts, its session shall remain with the dead pane
  (state `stopped`): Atril sets the session's options on an idle pane and only then starts the
  agent in it (found 9 nov as a race that failed a test under load).
  Proof: src/main/tmux.test.ts an agent that exits at once still leaves its session
- **A7** While a workspace is selected, the Actividad tab shall list its lines newest first and
  update live, and every workspace row shall show its latest line.
  (One proof holds both: the test pushes two lines for two workspaces and asserts the feed
  order and each row's latest line on the same render.)
  Proof: src/renderer/activity.test.ts feed and row show the latest activity

### Next up (add-next-up, 9 nov 2026)

- **N1** The «Qué me toca» list shall order agents in `needs-you` by how long they have been
  waiting (oldest first), then the tasks with no open workspace from the first board column — or
  from «Por empezar» when there is no board or it cannot be read (I18) — in Jira's order.
  Proof: src/main/nextup.test.ts orders waiting agents before tasks
- **N2** While Trabajo or Tareas is shown and the list is not empty, ⌘↩ shall open its first
  item — the workspace for an agent, the Start for a task, or Tareas when that task is not loaded
  yet; otherwise the menu item is disabled.
  Proof: src/renderer/nextup.test.ts command enter opens the next item
- **N3** When the person replies to a needs-you notification, Atril shall type the reply into
  that workspace's agent pane as literal text followed by Enter, without bringing Atril to the
  front; it shall send nothing for an empty reply, and if the workspace or its pane no longer
  exists it shall send nothing and say «No se pudo enviar: ese trabajo ya no está».
  Proof: src/main/reply.test.ts reply reaches only its own pane as literal text

### Own tasks (add-own-tasks, 9 nov 2026)

- **W40** When a workspace is opened with a task text, the agent's last argument shall be the
  single string `/libretto:libretto-flow <trimmed text>`; a text holding `$(…)`, `;`, both kinds
  of quote, a newline, or starting with `--` shall arrive byte for byte, as that one argument, and
  run nothing.
  Proof: src/main/tmux.test.ts task text reaches the agent as one literal argument
- **W41** If the task is not a string, or its text is empty after trimming, longer than 2000 characters, or contains a NUL
  character, then `workspaces.open` shall refuse with «El texto de la tarea no es válido (máx. 2000
  caracteres).» and create nothing.
  Proof: src/main/workspaces.test.ts invalid task text creates nothing

### Test isolation (fix-test-home-leak, 9 nov 2026)

- **W42** While the tests run, any Atril path (`ATRIL_HOME`, `ATRIL_CLAUDE_JSON`) without its
  env override shall throw instead of resolving to the person's home (found 9 nov: a timed-out
  tmux test kept writing after its `afterEach` deleted `ATRIL_HOME`, and left a workspace record
  in the real `~/.atril/workspaces.json`).
  Proof: src/main/paths.test.ts a test without its own home never reaches the real one
