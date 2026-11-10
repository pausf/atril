# Workspaces

Governs: src/main/** src/preload/** src/renderer/** resources/** !src/main/jira/** !src/renderer/inbox/** !src/main/flow/** !src/renderer/flow/** !src/main/credentials/** !src/renderer/settings/** !src/main/forge/mrs.ts !src/renderer/mr/** !src/main/forge/scores.ts !src/main/forge/threads.ts !src/main/forge/lenses.ts !src/main/avisos.ts !src/renderer/avisos/**

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

### Repos in Ajustes (move-repos-to-settings, 9 nov 2026)

- The Trabajo sidebar starts with «＋ Nuevo trabajo», then «Trabajo en marcha» and the Jira
  summary; the repo list and its per-repo «+ trabajo» form are gone.

### Flow documents (add-flow-documents, 9 nov 2026)

- When Claude asks the person something with its question tool — Libretto's stop before code is
  one — the workspace shows «te necesita», notifies with the question, and the documents become
  editable (F15); once the person answers, it shows «trabajando» again.

### Large branches (add-split-large-branch, 9 nov 2026)

- When a workspace's branch passes 400 changed lines against its base — and again at 800,
  1200… — Claude is told once, through its hook, to ask the person at its next natural stop
  whether to split the work into smaller chained MRs; its question reaches Atril as «te
  necesita» (W44).
- The «Cambios» section shows the total as a warning past 400 lines: «⚠ N líneas: rama grande (más
  de 400). Atril le ha pedido a Claude que te proponga separarla en MRs más pequeñas.»

### Language (add-language, 9 nov 2026)

- `ui.json` keeps the language choice beside the theme; main resolves it and owns the result for
  the menu, notifications, its messages and the window.

### Create repos (add-create-repo, 9 nov 2026)

- A repo created on GitHub or GitLab under the person's account, optionally cloned over SSH and
  registered as an Atril repo.

### MR lists (add-mr-lists, 9 nov 2026)

- Main also opens the MR links of the latest listing.

### MR scores (add-mr-scores, 9 nov 2026)

- A command can be given text on stdin and a time limit after which it is killed.

### Command palette (add-command-palette, 9 nov 2026)

- **⌘K** opens a palette over any screen: a search box and a list; typing filters it; ↑/↓ move,
  Enter runs the highlighted item, Escape closes.
- Items take you somewhere (a screen, a workspace, an MR view, a task's Start) or do something
  (new work, new task, refresh MRs, mark notices read, tutorial).

### Automatic or manual mode (add-auto-mode, 9 nov 2026)

- Empezar (Jira), Nueva tarea and Nuevo trabajo with text offer **Manual** (default: Libretto stops at
  the spec and plan, as today) or **Automático** (no stop: from the spec and plan straight to build).
- An automatic workspace shows «Auto» on its row; its Spec, Plan and Checklist open read-only.
- Before an automatic agent pushes or opens a request, Claude Code asks the person.

### Subagentes (add-subagents-view, 10 nov 2026)

- The flow panel shows the workspace's subagents: what each was asked (its description, or its type
  when none is known), its type, and «trabajando · 1 min 20 s» or «terminado · 45 s».
- The workspace row shows «2 subagentes» while any is running.
- SubagentStart and SubagentStop never change the workspace's own state (working / needs-you); the
  Agent call itself and the subagent's tool calls still count as working, as today.

### Detalle del subagente (add-subagent-detail, 10 nov 2026)

- Pulsar un subagente del panel abre un modal que parece una terminal y enseña lo que ha hecho y está
  haciendo ese Claude, leído de su archivo local, sin gastar cuota.
- Mientras el subagente trabaja, el modal se actualiza solo cada segundo; al terminar se queda quieto.
- La descripción de cada subagente sale de su `meta.json`, así que dos subagentes del mismo tipo
  lanzados a la vez ya no pueden intercambiarse la etiqueta.
- El hook ya no guarda la cola `pending` ni lee el PreToolUse de `Agent` para los subagentes.

## Scope boundaries

**In:** the three columns and footer of `bocetos/fase1-nucleo.html` (boceto 8), the
first-launch tutorial; repos,
modes, workspaces, agent sessions, panes, agent state, notifications, usage; and the two
sibling specs.

**Out, named so it is not added quietly:**
- the phase 2–4 features not yet built: inline comments sent to the agent (queued as
  add-mr-lens-drafts), previews, dictation, chat UI, SSH hosts, automations, embedded browser,
  mobile app, model per stage. (Built since, in their own capabilities: the diff view — flow-status
  F18–F24 —, MR lists, scores and threads — mr —, GitHub/GitLab connections — settings —, Avisos and
  the ⌘K palette — W54–W57.)
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

### Repos in Ajustes (move-repos-to-settings, 9 nov 2026)

**In:** the button and removing the section. **Out:** anything in main.

### Flow documents (add-flow-documents, 9 nov 2026)

**In:** the hook's state for `AskUserQuestion`. **Out:** any other tool.

### Large branches (add-split-large-branch, 9 nov 2026)

**In:** measuring after file-changing tools, the once-per-threshold note to Claude, the warning in
Cambios (`spec-flow-status.md`). **Out:** splitting the branch (Claude does it, with
`chained-pr`), a configurable threshold, counting lines Claude has not written yet.

**Never scoped out:** the hook never blocks a tool, adds at most two git calls (numstat and the
untracked list) per file-changing event, never prints anything when it cannot find its workspace,
and the note never carries file contents.

### Language (add-language, 9 nov 2026)

**In:** storing, resolving, the menu rebuild, `t()` in main. **Out:** anything in the window.

### Create repos (add-create-repo, 9 nov 2026)

**In:** validation, the create request, the clone and the registration. **Out:** the cards and
the dialog (proposal.md).

### MR lists (add-mr-lists, 9 nov 2026)

**In:** the guard. **Out:** everything else.

### MR scores (add-mr-scores, 9 nov 2026)

**In:** `input` and `timeoutMs` on the runner. **Out:** anything else.

### Command palette (add-command-palette, 9 nov 2026)

**In:** the palette, its items, filtering, the keyboard, the menu accelerator. **Out:** recent or
ranked items, custom commands, running shell commands, searching inside files or MR comments, a
tutorial step for the palette. This change removes ⌘K from the workspaces spec's «Out» list.

**Never scoped out:** fully keyboard-operable with a visible highlight; MR titles, task titles and
branch names shown as text; the palette never posts anything, and a task item does exactly what
Tareas' Empezar does (I20/I21).

### Automatic or manual mode (add-auto-mode, 9 nov 2026)

**In:** the choice in the three dialogs, the attacca command, the record field, the row badge,
read-only documents, the push confirmation. **Out:** switching mode on a running workspace, picking
the mode from task size automatically, a setting for the default mode.

**Never scoped out:** the task text stays one argv element (W40); the push needs the person.

### Subagentes (add-subagents-view, 10 nov 2026)

**In:** the two hook events, the description from the Agent tool, the list per workspace, the row
count. **Out:** reading a subagent's transcript or output (superseded by add-subagent-detail), stopping a subagent from Atril, subagents of
subagents shown as a tree, history past the next prompt.

**Never scoped out:** the hook payload is read once and only the listed fields leave it (as today).

### Detalle del subagente (add-subagent-detail, 10 nov 2026)

**In:** la ruta del archivo en la entrada (solo en main), la descripción desde el meta, el registro
del subagente como líneas, el modal terminal y su refresco.

**Out:** escribirle al subagente o pararlo; ver el razonamiento (`thinking`) por dentro; subagentes de
subagentes; registros de subagentes de antes de este cambio (no tienen ruta: el modal dice que no
hay registro); colores por herramienta; buscar dentro del registro.

**Never scoped out:** la ventana nunca manda una ruta: pide por id de trabajo e id de subagente y main
solo lee la ruta que guardó el hook; el contenido se pinta como texto, nunca como HTML; el modal
se maneja con teclado (foco al abrir, Tab dentro, Esc cierra y devuelve el foco a la fila).

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

### Flow documents (add-flow-documents, 9 nov 2026)

- Same hook, same state file (W14–W16, W26, A1–A8).

### Large branches (add-split-large-branch, 9 nov 2026)

- The hook already runs on PostToolUse (W14–W16, A1–A8); it finds its workspace in
  `$ATRIL_HOME/workspaces.json` by its tmux session name.
- Claude Code reads `hookSpecificOutput.additionalContext` from a PostToolUse hook's stdout and
  gives it to Claude on its next request (verified 9 nov, code.claude.com/docs/en/hooks).

### Language (add-language, 9 nov 2026)

- Same `ui.json` and `atril:ui:*` IPC as the theme (W35).

### Create repos (add-create-repo, 9 nov 2026)

- The tokens come from the secret store in main only; registration is `registerRepo` (W1–W4).

### MR lists (add-mr-lists, 9 nov 2026)

- Same guard module as W52.

### MR scores (add-mr-scores, 9 nov 2026)

- Still an argument array, never a shell.

### Command palette (add-command-palette, 9 nov 2026)

- Uses data the app already holds: workspaces, the app-wide MR listing (M9), the Jira inbox, the
  notices; no new request when it opens.
- ⌘K is a menu accelerator (like N2's ⌘↩); every text through `t()` (S16).

### Automatic or manual mode (add-auto-mode, 9 nov 2026)

- The mode only changes the slash command; W29/W31/W33/W34 apply unchanged.
- The hook stays the only thing Claude Code runs from Atril; it reads a marker, never the record.

### Subagentes (add-subagents-view, 10 nov 2026)

- The hook stays one script; the new events install alongside the existing ones in `agent.ts`' `HOOK_EVENTS`.
- Descriptions are text from Claude: shown as text, cut at 120 characters.

### Detalle del subagente (add-subagent-detail, 10 nov 2026)

- El formato del transcript y del meta es interno de Claude Code, no documentado: todo campo se
  comprueba por tipo y lo que no encaja se salta, sin romper.
- Sin dependencias nuevas; el modal reutiliza `useModalKeys` y las clases `modal`/`dlg`.
- Textos por `t()` con su inglés en `src/preload/i18n-en.ts`; colores solo como tokens.
- El hook sigue leyendo el payload una vez y solo saca de él los campos listados.

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

### Flow documents (add-flow-documents, 9 nov 2026)

- **The stop must be visible** — Pau, 9 nov: «si la spec y plan no nos gusta como lo hacemos ya que
  pasa directamente a construir»: it does not — Libretto stops before code with a question — but
  the hook marked every tool as working, so Atril hid that stop (found 9 nov).

### Large branches (add-split-large-branch, 9 nov 2026)

- **Smaller MRs, asked by Claude** — Pau, 9 nov: «si una rama se esta haciendo muy grande que el
  propio claude te pida si quiere separar esta tarea en mas MR pequeñas».
- **400 lines** (assumed): the `chained-pr` skill's own threshold for a reviewable MR.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Atril shows a button that types the suggestion into the terminal | Pau asked for Claude itself to ask; the hook note does that without the person acting |
| Measuring on every tool | Read, Grep and the like change nothing; one git call per edit is enough |
| Libretto deciding the split up front | it already can, at write-tasks; this catches the branch that grew past the plan |

#### Decision log, answers as given (2026-11-09)
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Cuánto es «grande»? → A: más de 400 líneas cambiadas (añadidas + borradas) contra la base del trabajo, el umbral de `chained-pr`; y de nuevo a 800, 1200… (assumed).
- Q: ¿Qué cuenta? → A: lo mismo que «Cambios» (F18): lo commiteado, lo no commiteado y lo nuevo sin seguimiento que git no ignora; un binario cuenta 0 (assumed).
- Q: ¿Cuándo se mira? → A: después de cada Edit, Write, MultiEdit o Bash (PostToolUse); otras herramientas no cambian archivos (assumed).
- Q: ¿Qué se le dice a Claude? → A: un `additionalContext` en español: el tamaño, el umbral, y que en su siguiente parada natural pregunte con AskUserQuestion si separar en MRs encadenadas (`chained-pr` si está) o seguir; que no separe sin preguntar (assumed).
- Q: ¿Y si Atril no encuentra el trabajo? → A: el hook no dice nada; nunca molesta a Claude (assumed).

- Q: (spec-reviewer) ¿Un salto de 0 a 900? → A: una sola nota; quedan avisados los umbrales hasta el alcanzado; solo un umbral más alto vuelve a avisar (assumed).
- Q: (spec-reviewer) ¿El número es exacto? → A: sí, el total de F18, sin cortar la cuenta (assumed).
- Q: (spec-reviewer) ¿Dos hooks a la vez? → A: cada umbral se reclama creando un archivo en exclusiva (`wx`); como mucho una nota por umbral (assumed).
- Q: (spec-reviewer) ¿El aviso promete una pregunta que ya no vendrá? → A: el texto dice lo que ya pasó: «Atril le ha pedido a Claude que te proponga separarla» (assumed).

### Language (add-language, 9 nov 2026)

- **One source for Sistema** (assumed, proposal.md decision log): main.

### Create repos (add-create-repo, 9 nov 2026)

- **SSH, never a token URL** (proposal.md).

### MR lists (add-mr-lists, 9 nov 2026)

- **Listed links count** (assumed, proposal.md decision log).

### MR scores (add-mr-scores, 9 nov 2026)

- **Scores need it** (proposal.md): the diff goes on stdin; a hung `claude` must not block the queue.

### Command palette (add-command-palette, 9 nov 2026)

- **⌘K, phase 3** — agreed in the usability batch (add-next-up).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| A fuzzy-matching library | every-word containment is enough for names and branches |
| A keydown listener in the window for ⌘K | xterm would swallow it while the terminal has focus |

#### Decision log, answers as given (2026-11-09)
- Q: «sigue con todo haz mejoras, nuevas features» — Pau → decisions taken with the recommended option, marked (assumed).
- Q: ¿Qué sale en la paleta? → A: pantallas, trabajos (por rama y repo), MRs de la última carga (título y proyecto), tareas de Jira (clave y título) y acciones: Nuevo trabajo, Nueva tarea, Actualizar MR, Marcar avisos leídos, Tutorial (assumed).
- Q: ¿Cómo filtra? → A: cada palabra escrita debe aparecer en el texto del elemento, sin distinguir mayúsculas ni tildes; como mucho 50 resultados (assumed).
- Q: ¿Cómo se abre? → A: ⌘K como acelerador del menú, igual que ⌘↩, así la terminal no se lo come (assumed).
- Q: (spec-reviewer) workspaces tiene ⌘K en «fuera de alcance» → A: este cambio lo saca de ahí al integrarse (assumed).
- Q: (spec-reviewer) ¿⌘K con otro diálogo abierto? → A: no hace nada (assumed).
- Q: (spec-reviewer) ¿Una tarea desde la paleta arranca sola si el repo está recordado? → A: hace lo mismo que pulsar Empezar en Tareas (I20/I21): es tu acción, como allí (assumed).

### Automatic or manual mode (add-auto-mode, 9 nov 2026)

- **Auto = attacca** (assumed): Libretto's own unattended mode; if it is wrong, the command is one
  string in `jira/start.ts` and `workspaces.ts`.
- **Push asks in auto** (assumed): what changes if wrong is one hook rule.
- **Automatic still stops where attacca stops**: a failing gate twice, a missing `jira`/`gh`/`glab`, the release question at the end and the push question; the row then shows «te necesita» like any agent.
- **Free text to attacca**: attacca hands `$ARGUMENTS` to find-work, which takes a request made in conversation (assumed).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Atril answers Libretto's stop question itself | fragile: reads Claude's terminal |
| attacca untouched (it pushes and opens the MR) | Pau was told the push would ask |
| A "no push" argument to attacca | changes the Libretto payload, not Atril |

#### Decision log, answers as given (2026-11-09)
- Q: Pau, 9 nov: «cuando se crea la tarea te diga si lo quieres automático o manual en que se pare en la spec y plan; si una tarea es pequeña puede ser modo auto y sigue a construir solo con el spec y plan sin revisar, solo lectura».
- Q: ¿Qué lanza el automático? → A: `/libretto:libretto-attacca`, el modo sin paradas de Libretto: mismas fases, nada que mantener en Atril (assumed).
- Q: attacca hace push y abre la MR solo; ¿se deja? → A: no: en automático Atril pide confirmación antes de `git push`, `gh pr create` y `glab mr create`, con el permiso de Claude Code («ask» desde el hook); se lo dije a Pau al encolar (assumed).
- Q: ¿Nuevo trabajo sin texto? → A: sin modo: es Claude a secas (assumed).
- Q: ¿Por defecto? → A: Manual, como hoy (assumed).
- Q: (revisor) ¿El clic directo de Empezar (I20)? → A: siempre Manual; ⌥-clic abre el diálogo con la elección (assumed).
- Q: (revisor) ¿Campo `mode`? → A: ya existe (in-place/worktree): campo nuevo `auto` (assumed).
- Q: (revisor de obra) La regex no veía `bash -c "git push"`, `/usr/bin/git push`, `--no-pager`… → A: cualquier `git … push` en un mismo segmento; un «push» en un mensaje de commit solo añade una pregunta (assumed).
- Q: (revisor) ¿F15 frente a F26? → A: F26 es la excepción y su texto gana; solo el editor de documentos (assumed).

### Subagentes (add-subagents-view, 10 nov 2026)

- **Events only** (assumed): the transcript would cost reading and could leak content. Superseded by add-subagent-detail (10 nov).
- **Pairing by order** (assumed, superseded by add-subagent-detail: the description comes from the meta file): SubagentStart carries no description, so it takes the oldest unpaired
  Agent PreToolUse description of the same `subagent_type`; if none, the type alone is shown.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Read subagent transcripts for live progress | quota, content, size |
| Derive the list from the activity feed | the feed keeps 200 lines: a long run drops the start |
| Pair by `tool_use_id` | SubagentStart does not carry it (not documented) |

#### Decision log, answers as given (2026-11-10)
- Q: Pau, 9 nov: «si claude crea subagentes también estaría bien verlos».
- Q: ¿De dónde salen? → A: de los hooks `SubagentStart`/`SubagentStop` de Claude Code (`agent_id`, `agent_type`) y del PreToolUse de la herramienta `Agent` (`description`, `subagent_type`); documentado en code.claude.com/docs/en/hooks (assumed).
- Q: ¿Se lee el transcript del subagente? → A: no: ni cuota ni contenido, solo los eventos (assumed).
- Q: ¿Cuánto se quedan los terminados? → A: hasta el siguiente mensaje de la persona (UserPromptSubmit), como mucho 20 (assumed).
- Q: ¿Agentes internos de Claude Code (agent_type vacío)? → A: se ignoran (assumed).
- Q: (revisor) ¿El PreToolUse de Agent deja de marcar «trabajando»? → A: no, sigue igual; solo SubagentStart/Stop no tocan el estado (assumed).
- Q: (revisor) ¿Sin subagent_type? ¿Pendientes que nunca emparejan? → A: cuenta como general-purpose; los pendientes caducan a los 10 min (assumed).
- Q: (revisor) ¿Unidades y formato? → A: segundos epoch; «45 s», «1 min 20 s»; terminado muestra la duración (assumed).

### Detalle del subagente (add-subagent-detail, 10 nov 2026)

- (add-subagents-view, 10 nov) «Events only» y «Pairing by order» quedan sustituidas: Pau pidió el
  9 nov ver lo que hace el subagente como terminal y borrar el emparejamiento (assumed en el cómo).
- La ruta vive en `$ATRIL_HOME/subagents/<session>.json` y no sale de main (assumed).
- Refresco por sondeo de 1 s solo con el modal abierto (assumed); techo: relee el archivo entero,
  pasar a leer la cola cuando un registro pese varios MB.
- 500 líneas como mucho en el modal (assumed): un subagente largo enseña su final.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| `fs.watch` por archivo de subagente y empujar líneas | Un vigilante por modal, que hay que cerrar bien, para ganar menos de 1 s de latencia. |
| Localizar el archivo por `~/.claude/projects/<ruta codificada>/*/subagents/` | Una regla interna más (la codificación de la ruta) y un glob por sesiones. |
| xterm.js en el modal | Sin entrada no aporta nada y añade otro terminal vivo con su tamaño. |
| Mantener el emparejamiento por orden para la descripción | Se intercambia con dos del mismo tipo a la vez; el meta da la de verdad. |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Dónde está el archivo del subagente? → A: el hook lo deriva en SubagentStart de `transcript_path` (campo documentado de todo hook): `<transcript_path sin .jsonl>/subagents/agent-<agent_id>.jsonl`, comprobado en disco con Claude Code de hoy; se guarda en main y nunca sale a la ventana (assumed). Si cambia el formato, el modal sale vacío y la lista sigue igual.
- Q: ¿Se borra el emparejamiento por orden? → A: sí, como pide la propuesta: la descripción sale de `agent-<id>.meta.json`; sin meta, solo el tipo (assumed). Si el meta deja de existir, se pierden las descripciones, no la lista.
- Q: ¿Terminal de verdad (xterm) o texto con aspecto de terminal? → A: texto monoespaciado de solo lectura con el estilo de Claude Code; xterm no aporta nada sin entrada (assumed).
- Q: ¿En vivo cómo? → A: la ventana pide el registro cada segundo mientras el modal está abierto y el subagente trabaja; main relee el archivo (assumed). Techo: archivos de varios MB; leer solo la cola si pesa.
- Q: ¿Qué se pinta? → A: el encargo (`> ` y sus 3 primeras líneas), texto del asistente con `⏺`, `⏺ Herramienta(arg)`, `⎿` con las 3 primeras líneas del resultado y «… +N líneas», y «✻ Pensando…» sin su contenido; como mucho las 500 últimas líneas (assumed).
- Q: (fase 5) ¿Cómo se construye? → A: ruta guardada por el hook + lectura bajo demanda en main + sondeo desde el modal (assumed). Perdieron: un `fs.watch` por archivo de subagente (más estado y fugas por cada modal para ganar menos de 1 s) y buscar el archivo por la ruta del trabajo codificada en `~/.claude/projects` (depende de otra regla interna más y falla con trabajos en sitio).

- Q: (revisor de spec) Varias holguras del contrato → A, todas (assumed):
  - Una entrada antigua sin `transcript` conserva la `description` guardada.
  - Un meta sin `description` de texto cuenta como meta ausente.
  - Un meta que aún no existe se vuelve a leer en el siguiente cambio del archivo de entradas. Como muy tarde, en SubagentStop.
  - El tope de 500 cuenta elementos `SubagentLine`, no filas pintadas.
  - N es el número de líneas ocultas.
  - El encargo es el primer `user` con contenido de texto (una cadena o su primer bloque `text`).
  - Una herramienta sin argumento de texto se pinta `Name`.
  - `is_error` no se distingue.
  - Al llegar `endedAt` se pide el registro una última vez.
  - Si la entrada desaparece, el modal se cierra.
  - Un subagente recién lanzado sin archivo dice lo mismo que uno sin registro.
  - Las líneas de continuación no llevan prefijo y van sangradas.

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
  single string `/libretto:libretto-flow <trimmed text>`, or `/libretto:libretto-attacca <trimmed text>`
  when it is automatic (W58); a text holding `$(…)`, `;`, both kinds of quote, a newline, or starting
  with `--` shall arrive byte for byte, as that one argument, and run nothing.
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

### Repos in Ajustes (move-repos-to-settings, 9 nov 2026)

- **W43** While Trabajo is shown, the sidebar shall show «＋ Nuevo trabajo», which opens the
  «Nuevo trabajo» dialog, and shall not show a Repos section.
  Proof: src/renderer/sidebar.test.ts sidebar offers new work and no repos

### Flow documents (add-flow-documents, 9 nov 2026)

- **W44** When Claude calls `AskUserQuestion`, the hook shall set the workspace to `needs-you`
  with «Te pregunta: <its first question>» as the text, and when that call returns (PostToolUse)
  it shall set `working`.
  Proof: src/main/activity.test.ts a question from claude means it needs you

### Large branches (add-split-large-branch, 9 nov 2026)

- **W45** When a PostToolUse for Edit, Write, MultiEdit or Bash ends and the workspace's branch
  has more than 400 × k changed lines against its base, with k higher than any k already claimed
  in that session, the hook shall claim k and print one `additionalContext` naming the exact total
  and asking Claude to offer a split into chained MRs at its next stop; otherwise — at or below
  400, k not higher than one claimed, another tool, or no workspace record for the session — it
  shall print nothing.
  (One proof holds all: it runs `sizeNotice` over a real repo through 300 lines, 500, 500 again,
  1300, 1400, Read at 2000, an unknown session, PreToolUse, and a second session jumping from
  nothing to 1300 and back to 500, and checks each result.)
  Proof: src/main/activity.test.ts a large branch asks claude to offer a split
- **W46** The hook's count shall equal F18's total for the same tree, and the renderer's warning
  threshold shall be the hook's.
  Proof: src/main/activity.test.ts the hook counts like the change list

### Language (add-language, 9 nov 2026)

- **W47** The `language` in `ui.json` shall survive a restart when it is `system`, `es` or `en`,
  and shall read as `system` when missing or anything else.
  Proof: src/main/i18n.test.ts the language choice survives a restart
- **W48** When the language resolves to English — chosen, or Sistema on a Mac whose first
  preferred language does not start with `es` — main shall build the menu, the notification texts
  and its own messages in English, keeping any `{detail}` as it came.
  Proof: src/main/i18n.test.ts main speaks the chosen language

### Create repos (add-create-repo, 9 nov 2026)

- **W49** If the repo name is empty, longer than 100 characters, has a character other than
  letters, digits, `.`, `-` or `_`, or is `.` or `..`, then Atril shall answer «Nombre de repo no
  válido» and send no request; a name the forge refuses anyway shall come back as its `{detail}`.
  Proof: src/main/forge/create.test.ts an invalid name sends nothing
- **W50** When a repo is created, Atril shall send the forge's create request for the person's
  account with the name, description, visibility (private unless public was confirmed) and a
  README, and answer with the web link and the forge's own path for the repo; a refusal shall
  answer «{forge} no ha creado el repo: {detail}». A public request without `confirmPublic`
  shall be refused in main with «Un repo público necesita tu confirmación.» and send nothing, and
  no request to a forge shall follow a redirect.
  Proof: src/main/forge/create.test.ts creates a private repo with a readme
- **W51** When cloning is asked, Atril shall refuse before cloning if `<folder>/<path>` exists;
  otherwise clone the SSH URL there and register it (with the suggested id when the derived one is
  taken); if the clone fails it shall register nothing and answer with the `git clone` command to
  run by hand; no command Atril runs, nor its environment, shall contain the token or any
  variable from the person's shell beyond PATH, HOME, USER, LANG, SSH_AUTH_SOCK and TMPDIR.
  (One proof per path: success, failed clone, existing folder; the token check runs on all.)
  Proof: src/main/forge/create.test.ts clones over ssh and registers the repo
  Proof: src/main/forge/create.test.ts a failed clone registers nothing
  Proof: src/main/forge/create.test.ts an existing folder is not overwritten
- **W52** Main shall open in the browser only a link it returned from a create or that is
  in its latest MR listing — a link from an earlier listing no longer counts — and clone only into
  the folder its own picker returned last; anything else from the window shall be ignored.
  Proof: src/main/forge/guards.test.ts only links and folders main handed out are accepted

### MR scores (add-mr-scores, 9 nov 2026)

- **W53** When the runner is given `input`, it shall write it to the child's stdin and close it; when
  given `timeoutMs`, it shall kill the child after that time and resolve with code 124.
  Proof: src/main/run.test.ts input reaches stdin and a timeout kills

### Command palette (add-command-palette, 9 nov 2026)

- **W54** When the person presses ⌘K (the menu item «Buscar…») and no other dialog is open, Atril shall
  open the palette with the search box focused, over whatever screen is shown; with a dialog open it
  shall do nothing.
  Proof: src/main/i18n.test.ts main speaks the chosen language
  Proof: src/renderer/palette/palette.test.ts command k opens the palette and runs an item
- **W55** The palette shall list the five screens, every workspace («{branch} · {repo}»), every MR of
  the latest listing («{title} · {project}»), every Jira task already loaded («{key} {title}») and the
  actions Nuevo trabajo, Nueva tarea, Actualizar MR, Marcar avisos leídos and Tutorial; typing shall
  keep only the items whose text contains every typed word, ignoring case and accents; the list shall
  show at most 50 after filtering (the first 50 with an empty box).
  (The proof asserts the five screens and one item of each other kind with an empty box, a two-word
  query matching across accents and case, and 60 tasks cut to 50.)
  Proof: src/renderer/palette/palette.test.ts the palette filters by every word
- **W56** ↓ and ↑ shall move the highlight, wrapping at both ends; Enter shall run the highlighted item
  and close the palette; Escape shall close it and give focus back to where it was.
  Proof: src/renderer/palette/palette.test.ts the palette moves with the keyboard
- **W57** Running an item shall do what its own control does: a screen opens it, a workspace selects
  it on Trabajo, an MR opens its MR view (switching to MR), a task does what Empezar does in Tareas,
  and each action runs its button's handler.
  Proof: src/renderer/palette/palette.test.ts each kind of item goes where it says

### Automatic or manual mode (add-auto-mode, 9 nov 2026)

- **W58** Where the start request carries `auto: true` (Empezar's dialog, Nueva tarea, or Nuevo trabajo
  with text), Atril shall start the agent with the single argument
  `/libretto:libretto-attacca <key or trimmed text>` instead of `/libretto:libretto-flow …`, store
  `auto: true` in the workspace record (a new field; `mode` stays `in-place | worktree`) and carry it
  in `WorkspaceView`; without it, or with any value but `true`, nothing changes.
  Proof: src/main/agent.test.ts automatic mode starts attacca and is recorded
- **W59** While the marker `$ATRIL_HOME/auto/<session>` exists, the hook shall answer a PreToolUse for
  Bash whose command matches `/\bgit\b[^;&|\n]*?\spush\b|\bgh\b[^;&|\n]*?\spr\s+create\b|\bglab\b[^;&|\n]*?\smr\s+create\b/`
  by printing exactly `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask",
  "permissionDecisionReason":"Modo automático: confirma antes de subir"}}`; for any other command or
  tool, or without the marker, it shall print nothing. Ceiling: a push inside a script the command
  calls is not seen; a `push` word after `git` in the same segment (a commit message) only adds a
  question; whether a person's own
  bypass mode or allow rule overrides «ask» is the host's (unverified).
  Proof: src/main/agent.test.ts the hook asks before an automatic push
- **W60** An automatic workspace's marker shall be written with its record, before its tmux session
  starts, and deleted when the workspace is removed or its session fails to start.
  Proof: src/main/agent.test.ts the automatic marker lives as long as the workspace
- **W61** Empezar's dialog, Nueva tarea and Nuevo trabajo once it has text shall offer Manual (default)
  and Automático with the line «Automático: sin parar en spec y plan; antes de subir te pregunta»; Nuevo trabajo
  without text offers none; Empezar's one click (I20) is always Manual; an automatic workspace's row
  shows «Auto».
  Proof: src/renderer/inbox/mode.test.ts the start dialogs offer manual or automatic

### Subagentes (add-subagents-view, 10 nov 2026)

- **W62** On SubagentStart with a non-empty `agent_type` and `agent_id`, the hook shall add
  `{ id: agent_id, type, startedAt, transcript? }` (epoch seconds) to `entries` in
  `$ATRIL_HOME/subagents/<session>.json`, where `transcript` is the payload's `transcript_path` without
  its `.jsonl` ending plus `/subagents/agent-<agent_id>.jsonl`, present only when `transcript_path` is a
  string ending in `.jsonl`; a PreToolUse shall never write that file.
  Proof: src/main/agent.test.ts a subagent start records its transcript
- **W63** On SubagentStop with that `agent_id` the hook shall set `endedAt`; SubagentStart and
  SubagentStop with an empty `agent_type`, or an unknown `agent_id` on stop, shall change nothing; neither
  event shall write the state file or an activity line.
  Proof: src/main/agent.test.ts subagent events never change the agent state
- **W64** On UserPromptSubmit the hook shall drop every finished entry; the file shall keep at
  most 20 entries, dropping the oldest finished entry and never a running one (more than 20 running is
  kept as is).
  Proof: src/main/agent.test.ts the subagent list stays bounded
- **W65** Atril shall install SubagentStart and SubagentStop hooks with the same command as the other
  hook events; main shall answer `atril:subagents:get(workspaceId)` and send
  `atril:subagents:changed(workspaceId, entries)`, both with entries shaped by W67 (`[]` without a
  file), the push whenever the file's content changes, an `endedAt` flip included; removing a workspace
  deletes its file.
  Proof: src/main/subagents.test.ts the subagent list reaches the window
- **W66** A workspace row shall show «{n} subagentes» («1 subagente») while n > 0 of its entries have
  no `endedAt`, and nothing otherwise.
  Proof: src/renderer/subagents.test.ts the row counts running subagents

### Detalle del subagente (add-subagent-detail, 10 nov 2026)

- **W67** Main shall send each entry to the window without `transcript`, with `description` taken from
  the meta file beside its transcript (`agent-<id>.meta.json`, field `description`,
  whitespace collapsed, cut to 120 characters); an entry with no `transcript` shall keep a stored string
  `description`; an entry with a `transcript` whose meta file is missing, not JSON or has no string
  `description` shall carry none, and that meta shall be read again on the next change of the entries
  file.
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
  `thinking` line with no text per thinking block; the prompt is the first `user` line whose content is a
  string or holds a `text` block; a `tool_use` with no string among those keys gives `Name` alone; «N» is
  the number of hidden lines; it shall skip any other line type and any line that is not JSON, and
  keep only the last 500 parsed lines. One fixture carries a case per clause (ceiling: a clause with no
  case is unproven).
  Proof: src/main/subagents.test.ts the log reads like Claude Code
