# Workspaces

Governs: src/main/** src/preload/** src/renderer/** resources/** electron-builder.config.cjs build/** eslint.config.mjs .githooks/** !src/main/jira/** !src/renderer/inbox/** !src/main/flow/** !src/renderer/flow/** !src/main/credentials/** !src/renderer/settings/** !src/main/forge/mrs.ts !src/main/forge/page.ts !src/main/forge/merge.ts !src/renderer/mr/** !src/main/forge/scores.ts !src/main/forge/threads.ts !src/main/forge/lenses.ts !src/main/forge/openmr.ts !src/main/forge/linecomments.ts !src/main/avisos.ts !src/renderer/avisos/** !src/main/skills/** !src/renderer/skills/** !src/main/crash/** !src/renderer/crash/**

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
  shows the agent's pane live, read-only: everything the person says to the agent goes through
  Atril (cards and the composer). «Abrir en Terminal» opens a writable shell instead.
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

### Instalar desde el doctor (add-doctor-install-terminal, 10 nov 2026)

- En el aviso «N herramienta(s) por instalar», cada herramienta con comando tiene **Instalar** al lado
  de Copiar. Al pulsarlo se abre Terminal.app con ese comando ya en marcha y el elemento dice
  «Instalando en Terminal…».
- Al volver a Atril, el doctor comprueba otra vez: lo instalado desaparece de la lista y, si ya no
  falta nada, el aviso entero.

### Paleta Grafito (adopt-grafito, 10 nov 2026)

- Ajustes → Apariencia tiene «Paleta: Original · Grafito» encima de «Claro · Oscuro · Automático».
- Con Grafito, fondos, superficies, líneas y textos son la escala de grises fría de Grafito y el único
  color de acción es su azul apagado (también «te necesita», foco, en marcha y modos); añadido y quitado
  usan su verde y su rojo apagados. Con Original, nada cambia.
- La elección se guarda y se aplica al abrir, como el tema.
- El boceto `fase1-nucleo.html` ofrece la misma elección.

### Tutorial de 24 pasos (expand-tour, 10 nov 2026)

El tutorial recorre 24 pasos que explican toda la app, sin dejar piezas sin contar: la lista y los
textos, en «Pasos» abajo. Los que tienen elemento en pantalla lo iluminan; los que no, salen centrados.

### Respuestas rápidas (quick-replies, 10 nov 2026)

- Una fila «te necesita» enseña la pregunta y, debajo, sus respuestas como botones pequeños; pulsar una se
  la manda al agente sin cambiar de trabajo, y la fila dice «Enviado».
- Al volver el agente a trabajar, los botones desaparecen.

### Modo foco (focus-mode, 10 nov 2026)

- ⌘⇧F deja a la vista solo el trabajo elegido: su terminal y su panel; ⌘⇧F otra vez, o «Salir del foco», lo
  devuelve todo.
- Mientras tanto, si otro agente te necesita y Atril está delante, una pastilla te lo dice sin moverte;
  ⌘↩ te lleva y «Volver a …» te trae de vuelta, sin salir del foco.

### Todos los agentes (agents-overview, 10 nov 2026)

- ⌘⇧A (o «Todos») enseña todos los trabajos como tarjetas, ordenadas por quién te necesita; pulsar una
  la abre. Se contesta a un agente desde su tarjeta sin abrirla.

### QA en vivo (add-qa-lab, 10 nov 2026)

- En un trabajo cuyo repo es una app web, Android o iOS, «Probar en vivo» abre un panel de tmux con un Claude de
  QA que arranca la app, la recorre según la spec del cambio y guarda capturas.
- La sección «QA» del panel de Libretto lista esas capturas (las más nuevas primero) y al pulsar una se ve grande.
- «Detener QA» cierra ese panel; nada más se toca.

### Pausar un agente (pause-agent, 10 nov 2026)

- Un agente que trabaja se puede pausar: deja de trabajar, su sesión sigue viva y la fila dice «en pausa».
- «Reanudar» le pide que siga; la fila vuelve a «trabajando» cuando el agente se mueve.

### Coste por trabajo (cost-per-work, 10 nov 2026)

- Cada trabajo enseña cuántos tokens lleva gastados (con sus subagentes) y su coste estimado a precio de API.

### Historial (work-history, 10 nov 2026)

- Lo que terminaste queda a la vista con su etapa, cuánto duró y cuánto costó, aunque ya no esté en marcha.

### Primeros pasos (first-run-setup, 10 nov 2026)

- Alguien que abre Atril por primera vez ve qué falta para empezar, cada cosa con su botón, y los pasos se marcan
  solos según lo va haciendo.

### Empaquetar (package-and-sign, 10 nov 2026)

- `pnpm dist` deja en `dist/` un `.dmg` y un `.zip` arm64 firmados (propio o ad-hoc) con todo lo que la app necesita
  dentro; una página explica cómo construirlo, firmarlo y abrirlo.

### Libretto (libretto-view, 10 nov 2026)

- Desde Atril se encola una idea sin abrir una terminal, se ve la cola y lo que está en curso de cada repo, y una idea
  encolada se empieza con un clic en su propio trabajo, siguiendo Libretto.

### Tarjeta de pregunta (ask-card, 10 nov 2026)

- Cuando un agente pregunta, su fila crece en una tarjeta con la pregunta entera y las respuestas numeradas; no
  choca con la fila de abajo. El panel ya no tiene «Otros cambios»: dice «{n} cambios más en este repo» y «Ver en Libretto».

### Gestionar la cola (queue-manage, 10 nov 2026)

- Una idea en cola se puede corregir, quitar o mandar a Jira sin abrir archivos, y cada idea enseña de qué va.

### Cabecera tranquila (quiet-header, 11 nov 2026)

- La cabecera de un trabajo se lee de un vistazo y Atril no enseña dinero ni tokens.

### Pantalla de QA (qa-screen, 11 nov 2026)

- QA tiene su pantalla: eliges el trabajo y ves qué criterios de su cambio se han visto funcionar en la app, cómo los
  probó el agente, y conviertes un fallo en tarea de Jira o en un encargo al agente con un clic.

### QA: dónde se prueba (qa-targets, 11 nov 2026)

- La tarjeta de QA de un trabajo enseña una pestaña por plataforma que se puede probar (Chrome, Safari, Android, iOS), con el porqué en una línea («Hay un `package.json` con el script `dev`»). La pestaña elegida se recuerda por repo.
- «Probar en vivo» lanza el QA de la pestaña elegida con su motor y, en móvil, con un emulador o simulador reservado para ese trabajo; un segundo trabajo coge otro.
- Cuando algo falta, la tarjeta dice qué pasó, qué no puedes hacer y trae el botón que lo arregla.
- Sin nada detectado: «No sé cómo abrir este proyecto» con «Elegir a mano».

### Errores claros (plain-errors, 11 nov 2026)

- El pie nunca enseña un código HTTP ni un host como frase: dice qué pasa en castellano, trae su botón y el código va en «Ver detalle».
- Una herramienta que no contesta a su `--version` sale como «no responde» a los 5 s, con su botón de instalar, en vez de «Comprobando…» para siempre.
- Conectar Jira con una dirección que no responde dice qué falló (no encuentro la dirección, certificado, no responde) sin «TypeError», y el código va en «Ver detalle».

### PATH del shell (login-path, 11 nov 2026)

- Abierta desde el Dock, Atril encuentra `claude`, `tmux`, `git` y `jira` donde los encuentra tu terminal; el doctor deja de decir que faltan.

### Copia con cambios (dirty-copy, 11 nov 2026)

- Al abrir un trabajo en un repo que trabaja en tu copia, si tiene cambios o ya tiene un trabajo, el diálogo dice qué pasa con cifras y ramas, que no se ha creado nada, y trae «Usar un worktree esta vez»; los ficheros van plegados.

### Abrir y cerrar sin errores crudos (ws-errors, 11 nov 2026)

- Ningún fallo al abrir o cerrar un trabajo enseña stderr en la frase: dice qué paso falló, qué no se ha hecho y trae su botón; la salida de git o tmux va en «Ver detalle».
- Cerrar un trabajo con el agente vivo pide confirmación en la fila.
- El aviso de un cierre rechazado se puede cerrar.

### Modelo y esfuerzo (model-pick, 11 nov 2026)

- Al abrir un trabajo eliges también el esfuerzo; el agente arranca con `--effort` y el trabajo lo recuerda.
- Si la tarea parece un arreglo acotado o un cambio grande, el diálogo sugiere modelo y esfuerzo con su porqué; «Usar» lo aplica.
- El coste por trabajo cuenta la lectura de caché de Fable y el tramo largo de Haiku.

### Volver a abrir (reopen-work, 11 nov 2026)

- Un trabajo parado dice por qué está parado y trae «Volver a abrir»; al pulsarlo, la terminal vuelve con el agente siguiendo su conversación.
- «Seguir con más esfuerzo» hace lo mismo un nivel por encima y lo recuerda.
- Un trabajo parado no enseña «Escribe en la terminal como siempre».

### Archivos de estado dañados (state-files, 11 nov 2026)

- Con un archivo de estado dañado, la barra lateral y Ajustes → Repos dicen cuál y qué no puedes hacer, con «Mostrar en Finder»; no salen los vacíos de «Aquí verás…» ni «Aún no hay ninguno».
- Abrir, cerrar, olvidar y reabrir un trabajo no crean ni borran nada mientras uno de los dos archivos está dañado.
- Sin permiso de escritura en la carpeta de Atril, abrir un trabajo lo dice con su botón y no deja nada a medias.
- El sondeo y la lista de trabajos no sueltan rechazos sin capturar por estos archivos.

### Jira, GitHub y GitLab (net-errors, 11 nov 2026)

- Una sola tabla en main traduce cada estado HTTP y cada causa de red de Jira, GitHub y GitLab a una frase con su arreglo.

### Modelos de Libretto (libretto-models, 11 nov 2026)

- Las revisiones de Libretto que lanzan los agentes de Atril corren en Sonnet: la mitad de precio que Opus, como recomienda el artículo para tareas repetidas.

### Repos rotos (repo-gone, 11 nov 2026)

- Abrir un trabajo en un repo cuya carpeta no está o no es git lo dice con «Abrir Ajustes», sin texto de git.
- Ajustes → Repos marca los repos rotos y deja buscar su carpeta o quitarlos; cualquier repo se puede quitar.
- Con git roto, abrir o cerrar un trabajo dice «git no funciona en este Mac» con «Instalar herramientas de Xcode».

### Terminal que no engancha (term-attach, 11 nov 2026)

- Si la terminal no engancha, el centro lo dice, dice que el agente sigue trabajando y trae «Volver a intentar»; nada queda sin capturar.

### Panel más rápido (fast-panel, 11 nov 2026)

- El estado de los agentes cuesta un proceso de tmux por vuelta y los observadores juntan ráfagas.

### Grafito: te necesita (grafito-you, 11 nov 2026)

- En Grafito, la fila que te necesita es la única en azul.

### Radar de choques (radar, 11 nov 2026)

- Con tres trabajos en el mismo repo, si dos tocan `src/cart.ts`, sus dos filas lo dicen antes de abrir ninguna MR.

### Lecciones para cada agente (lessons-first, 11 nov 2026)

- En un repo con lecciones, cada agente que abre Atril (nuevo, reabierto o de QA no) empieza sabiendo que existen y leyéndolas.

### Dónde se atasca (stuck, 11 nov 2026)

- En Terminados ves cuánto tardó cada trabajo en cada tramo y en cuál se te va el tiempo normalmente.

### QA en la MR (qa-to-mr, 11 nov 2026)

- Quien revisa la MR ve qué criterios se probaron en vivo y con qué resultado, sin salir de GitHub o GitLab.

### Notificaciones (main) (notify-core, 12 nov 2026)

- Main tells you, by the work's name, when an agent asks, ends its turn, stops, keeps waiting, collides with another work, finishes QA; when CI breaks or comes back; when an MR is merged or closed; when Claude's quota reaches 80 %.
- At most one Mac notification every 2 min when grouping is on; nothing on the Mac in quiet hours or, if you ask for it, in focus mode.
- MR notices keep coming with the window closed.

### Terminal de solo lectura (terminal-read-only, 14 nov 2026)

- La terminal de cada trabajo se ve en vivo y se puede seleccionar y copiar, pero ninguna tecla llega al agente.
- Cuando el agente espera, Atril dice qué espera, en castellano, con botones: una pregunta con sus opciones y su porqué; un permiso con lo que quiere ejecutar; un fin de turno con lo que ha dicho; nunca «Claude needs your permission» ni «Claude is waiting for your input».
- Debajo de la terminal, una caja «Escribe al agente» manda cualquier mensaje.
- En Automático no sale ninguna tarjeta: Atril elige la recomendada y dice «Sigue con el plan; no hagas nada que no esté en él.» solo, y en la fila queda «Decidió: {opción}»; solo se para en el push y la MR, en un fallo de verdad o en un permiso que Claude Code no concede solo.
- Un agente que acaba su turno mientras sigue con subagentes o tareas en segundo plano sale como «trabajando», no como «te necesita».

### Escalera de corrección (harness-ladder, 20 nov 2026)

Cuatro errores que ya se pagaron dejan de poder repetirse sin que `pnpm lint` o el commit lo paren, con un mensaje que dice qué usar en su lugar; las lecciones que los cubrían dicen qué regla las sustituye.

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

### Instalar desde el doctor (add-doctor-install-terminal, 10 nov 2026)

**In:** el botón, el handler en main, el texto de estado, volver a comprobar al recuperar el foco.

**Out:** elegir otra terminal; ver la instalación dentro de Atril; detectar el final de la instalación;
instalar varias a la vez con un botón; actualizar herramientas que ya están.

**Never scoped out:** la ventana solo manda el nombre de la herramienta y main ejecuta únicamente el
comando de su lista (W21); un fallo al abrir Terminal se dice en el elemento; el botón se alcanza y
se pulsa con teclado.

### Paleta Grafito (adopt-grafito, 10 nov 2026)

**In:** el campo `palette` en el estado de la interfaz, el selector en Apariencia, los tokens de Grafito
en claro y oscuro, el boceto.
**Out:** tipografía, espaciado, radios e iconos de Grafito; las variantes Salvia, Arcilla y Ciruela;
cambiar la paleta original.
**Never scoped out:** contraste de texto ≥ 4,5:1 en las dos paletas y los dos temas; el selector con
teclado y estado legible (`aria-pressed`).

### Tutorial de 24 pasos (expand-tour, 10 nov 2026)

**In:** los 24 pasos, sus textos y atajos, los `data-tour` que falten, la bienvenida.
**Out:** cambiar cómo funciona el tutorial (foco, posiciones, teclado); vídeos o animaciones; un tutorial
por pantalla.
**Never scoped out:** castellano de España y su inglés en `i18n-en.ts`; manejable con teclado (W25).

### Respuestas rápidas (quick-replies, 10 nov 2026)

**In:** guardar las opciones de la primera pregunta en el estado, los botones de la fila, el envío.
**Out:** respuestas configurables; varias preguntas; botones en el panel, en «Qué me toca» o en la
notificación (ya tiene su campo, N3); modo foco (otro cambio).
**Never scoped out:** el texto de las opciones se pinta como texto; se envía solo al pulsar y al panel de
ese trabajo; teclado; si el trabajo ya no está, «No se pudo enviar: ese trabajo ya no está» (N3).

### Modo foco (focus-mode, 10 nov 2026)

**In:** el estado de foco, el menú y atajo, esconder barra y «Qué me toca», la pastilla, saltar y volver,
suprimir el aviso del Mac con Atril delante.
**Out:** foco por tiempo (pomodoro), silenciar sonidos del sistema, foco en Tareas o MR, recordar el foco.
**Never scoped out:** ningún agente se pierde: la pastilla nombra a todos los que te necesitan (el primero y
«+N»); con Atril detrás el aviso del Mac sigue; teclado para todo.

### Todos los agentes (agents-overview, 10 nov 2026)

**In:** el modo «Todos», las tarjetas, su orden, abrir una, respuestas rápidas en la tarjeta.
**Out:** varias terminales a la vez, arrastrar para reordenar, acciones en lote, filtros.
**Never scoped out:** estados con texto (W22); teclado: las tarjetas son botones y las flechas se mueven
entre ellas; el modo foco (W77) sigue siendo de un trabajo.

### QA en vivo (add-qa-lab, 10 nov 2026)

**In:** detectar el tipo, el botón, el archivo de MCP por sesión, el panel de QA, la lista de capturas.
**Out:** grabar vídeo; ejecutar suites e2e propias del proyecto; elegir AVD o simulador en Ajustes (lo decide
el Claude de QA); comparar capturas entre versiones; instalar Xcode o el SDK de Android.
**Never scoped out:** nada se lanza sin pulsar; la configuración global de Claude no se toca; si falta `node`,
`adb` o `xcrun` para ese tipo, se dice qué falta en vez de lanzar; las capturas se pintan como imagen local.

### Pausar un agente (pause-agent, 10 nov 2026)

**In:** pausar y reanudar uno, el estado «en pausa», el menú, ⌘⇧P, la tarjeta.
**Out:** pausar todos a la vez; pausas programadas; liberar la cuota (la sesión sigue abierta).
**Never scoped out:** solo al pulsar; solo al panel de ese trabajo; teclado; el estado se escribe con texto (W22).

### Coste por trabajo (cost-per-work, 10 nov 2026)

**In:** guardar la ruta del transcript, sumar usage sin duplicados con subagentes, la tabla de precios, mostrarlo.
**Out:** coste real de la suscripción; presupuestos o avisos de gasto; histórico (va con el historial); la cuota
de 5 h por trabajo.
**Never scoped out:** nada sale del Mac; el contenido de los transcripts no se guarda ni se muestra; se lee
como mucho cada 30 s y solo los bytes nuevos.

### Historial (work-history, 10 nov 2026)

**In:** `createdAt` en los registros nuevos, la línea al quitar, la sección «Terminados».
**Out:** reabrir desde el historial; buscar o filtrar; el informe exportable (otra idea); MR enlazada (Atril no la
guarda aún).
**Never scoped out:** escritura atómica (W80); nada de contenido; teclado en la sección.

### Primeros pasos (first-run-setup, 10 nov 2026)

**In:** la tarjeta, sus cinco pasos leídos del estado real, los botones, «Ya lo tengo» recordado.
**Out:** instalar herramientas desde la tarjeta sin el doctor; crear el token por la persona; un asistente modal.
**Never scoped out:** teclado; textos por `t()`; nada se hace sin pulsar.

### Empaquetar (package-and-sign, 10 nov 2026)

**In:** la dependencia (con `electron-winstaller` sin scripts de instalación), la configuración (y sus globales `.cjs` en ESLint), los entitlements, el script, la página de instalación.
**Out:** abrirlo en otro Mac como criterio, notarización, actualizaciones automáticas, x64, Windows/Linux, publicar el `.dmg`.
**Never scoped out:** ningún secreto en el repo (la identidad llega por variable de entorno); los recursos del hook y
Libretto dentro del paquete.

### Libretto (libretto-view, 10 nov 2026)

**In:** la pantalla, el selector de repo, las dos listas, encolar, empezar, ⌘K.
**Out:** `converge`, `retro` (siguiente cambio); editar o borrar ideas (son archivos); `libretto init`; reordenar la
cola (la cola es FIFO y «Empezar» en cualquiera ya reordena).
**Never scoped out:** el commit solo toca el `proposal.md` nuevo, nunca otros cambios del repo; nada se escribe sin
pulsar; textos por `t()`; teclado; una petición vacía no se encola.

### Tarjeta de pregunta (ask-card, 10 nov 2026)

**In:** la tarjeta en Trabajo y en «Todos», la línea a Libretto.
**Out:** responder con la tecla del número; preguntas multiSelect (siguen sin botones, W76).
**Never scoped out:** teclado; contraste del texto sobre el tinte; textos por `t()`; colores como tokens.

### Gestionar la cola (queue-manage, 10 nov 2026)

**In:** editar, borrar con confirmación, pasar a Jira, la descripción de las ideas, el nuevo diseño de la pantalla.
**Out:** que la IA proponga ideas (`agent-suggestions`); editar cambios en curso; elegir proyecto o tipo en Jira.
**Never scoped out:** cada commit toca solo la ruta de esa idea; borrar pide confirmación; el token de Jira no sale de
main; si Jira falla no se borra nada; teclado; textos por `t()`.

### Cabecera tranquila (quiet-header, 11 nov 2026)

**In:** la cabecera en Uno y en Todos, quitar el coste de las cuatro vistas.
**Out:** borrar el cálculo de coste; cambiar el menú o el atajo del foco.
**Never scoped out:** teclado y nombre accesible del botón de icono; textos por `t()`; tokens de color.

### Pantalla de QA (qa-screen, 11 nov 2026)

**In:** la pantalla y su entrada en la barra y ⌘K, el informe por criterio, «Ver cómo», «Probar este», «Reprobar
todo», «Marcar como bug», quitar QA del panel.
**Out:** elegir plataforma, MCP de Apple, emulador del SDK, Safari, la detección mejorada y los errores con su arreglo
(`qa-targets`); vídeo; revisión antes/después.
**Never scoped out:** el informe es texto no fiable (validado, nunca HTML); nada se manda a Jira ni al agente sin
pulsar; el token de Jira no sale de main; teclado; textos por `t()`; estados con palabra, no solo color.

### QA: dónde se prueba (qa-targets, 11 nov 2026)

Dentro: detección por carpeta raíz y subcarpetas a 2 niveles; `.atril/qa.json`; «Elegir a mano»; pestañas; motor por plataforma; reserva de dispositivo; errores con arreglo en el lanzamiento de QA.

Fuera: crear emuladores por nuestra cuenta (solo se abre la Terminal con el comando, la persona lo lanza); dispositivos físicos; descargar Xcode; el resto de errores de Atril (otro cambio); varios QA del mismo trabajo a la vez (sigue siendo uno, W84).

Nunca fuera: validar `.atril/qa.json` (lo escribe el repo, no Atril); la ventana nunca manda un comando, solo el nombre de un arreglo; escritura atómica del archivo de elecciones.

### Errores claros (plain-errors, 11 nov 2026)

**In:** `src/main/usage.ts`, `src/renderer/components/Footer.tsx`, `src/main/doctor.ts`, `src/main/credentials/check.ts` y donde Ajustes pinta su error (`Connection.tsx`, `Ajustes.tsx`), los tipos de `src/preload/api.ts`, la IPC `atril:usage:fix`.

**Out:** los errores de «Quitar», la terminal que no engancha y los trabajos parados (hallazgos 7, 8, 10, 11, 31): van en el siguiente cambio, con la fila del trabajo. Reintentos automáticos nuevos (W37 ya espacia los de la cuota). Los errores de Forges (GitHub/GitLab): ya dicen la causa.

### PATH del shell (login-path, 11 nov 2026)

**In:** `src/main/login-path.ts` (nuevo), su llamada al arrancar en `src/main/index.ts`. **Out:** leer otras variables del shell (W51 limita el entorno de los comandos a PATH, HOME, USER, LANG, SSH_AUTH_SOCK y TMPDIR; aquí solo cambia PATH).

### Copia con cambios (dirty-copy, 11 nov 2026)

**In:** `openWorktree` (errores de W7 y W8, opción `worktree`), IPC `atril:ws:open`, `OwnTaskDialog.tsx`, tipos. **Out:** el resto de errores de abrir y cerrar trabajos: van en el barrido de errores que sale de la auditoría y la prueba de romper la app.

### Abrir y cerrar sin errores crudos (ws-errors, 11 nov 2026)

**In:** `openWorktree` y `removeWorkspace` (`src/main/workspaces.ts`), una función `forgetWorkspace`, IPC `atril:ws:terminal` y `atril:ws:forget`, `Problem.tsx` (botón de cerrar opcional), `WorkspaceList.tsx`, `OwnTaskDialog.tsx`, `StartDialog.tsx`, tipos e i18n.

**Out:** «Volver a abrir» un trabajo parado (hallazgo 8, siguiente cambio); Jira, MR, Libretto y Ajustes (siguen en la auditoría); renombrar «Quitar».

### Modelo y esfuerzo (model-pick, 11 nov 2026)

**In:** `agent.ts` (`--effort`), `workspaces.ts` (campo `effort` del registro), IPC de abrir y de Empezar (Jira), `OwnTaskDialog.tsx` y `StartDialog.tsx`, un `suggest.ts` en el renderer, `prices.ts` y `cost.ts`. **Out:** reintentar con más esfuerzo (va con «Volver a abrir», siguiente cambio); modelos de los subagentes de Libretto (cambio aparte); medir modelos con tareas reales.

### Volver a abrir (reopen-work, 11 nov 2026)

**In:** `src/main/pty.ts` (W149), `reopenWorkspace` en `src/main/workspaces.ts`, `agentArgv({ resume: true })` en `agent.ts`, IPC `atril:ws:reopen`, la vista parada de `Workspace.tsx`. **Out:** relanzar todos los parados de golpe; subagentes cortados (hallazgo 12); reiniciar un agente vivo.

### Archivos de estado dañados (state-files, 11 nov 2026)

**In:** `src/main/state.ts` (nuevo), `readRecords` y la lectura de `repos.json` (`src/main/workspaces.ts`, `src/main/repos.ts`), el sondeo de `src/main/status.ts`, IPC `atril:state:reveal`, la barra lateral (`WorkspaceList`/`Sidebar`), Ajustes → Repos, el diálogo de nuevo trabajo. **Out:** `ui.json`, `qa-targets.json` (ya toleran basura), reparar el archivo automáticamente.

### Jira, GitHub y GitLab (net-errors, 11 nov 2026)

**In:** `src/main/net-problem.ts`. **Out:** quién la pinta (inbox, mr, settings).

### Modelos de Libretto (libretto-models, 11 nov 2026)

**In:** `scripts/bundle-libretto.mjs`, una función `pinModels` en `scripts/libretto-models.mjs` con su test, y la copia `resources/libretto/agents/*.md` reescrita con esa función. **Out:** cambiar Libretto en su propio repo; elegir modelo por tarea en tiempo de ejecución; medir modelos con tareas reales.

### Repos rotos (repo-gone, 11 nov 2026)

**In:** `src/main/repos.ts` (salud del repo, quitar, cambiar carpeta), `src/main/workspaces.ts` (comprobaciones al abrir y cerrar), IPC nuevas, `src/renderer/settings/Repos.tsx`, `Problem.tsx` (`fixLabel`), i18n. **Out:** clonar de nuevo un repo perdido; detectar que una carpeta movida es la misma por su remoto.

### Terminal que no engancha (term-attach, 11 nov 2026)

**In:** `src/main/pty.ts` (`attach` devuelve el resultado), `src/main/index.ts` (`atril:term:attach`), `src/preload/{api,index}.ts`, `src/renderer/components/Terminal.tsx`, i18n. **Out:** abrir la sesión en Terminal.app; reparar node-pty.

### Panel más rápido (fast-panel, 11 nov 2026)

**In:** src/main/status.ts, src/main/tmux.ts, src/main/activity.ts, src/main/workspaces.ts. **Out:** sondeos de MR y Jira.

### Grafito: te necesita (grafito-you, 11 nov 2026)

**In:** un token nuevo `--working` en las cuatro paletas de `src/renderer/styles.css`, usado solo por la etiqueta «trabajando». **Out:** la paleta Original.

### Radar de choques (radar, 11 nov 2026)

**In:** `src/main/radar.ts` (nuevo), IPC `atril:radar:get`, `src/main/flow/quiet.ts` (tope a 12), `src/renderer/components/WorkspaceList.tsx`, un `useRadar` en la ventana, i18n. **Out:** resolver el choque; avisar entre repos distintos; cola de merge.

### Lecciones para cada agente (lessons-first, 11 nov 2026)

**In:** `src/main/agent.ts` (`agentArgv({ lessons })`), `src/main/workspaces.ts` (abrir y reabrir), `src/main/jira/start.ts` (`proposeStart`). **Out:** el agente de QA; escribir lecciones; resumirlas.

### Dónde se atasca (stuck, 11 nov 2026)

**In:** `src/main/history.ts` (`historyEntry` gana `steps`), una función pura que los calcula, la pantalla de Terminados, i18n. **Out:** tiempos de trabajos abiertos; tiempos de la MR en la forja; gráficas.

### QA en la MR (qa-to-mr, 11 nov 2026)

**In:** `atril:qa:mrFor(id)` y una función en main que arma el texto y lo publica por la API de la forja que ya usa Atril (`src/main/forge/threads.ts` o la que publique comentarios generales), IPC `atril:qa:publish(id)`, el botón en `src/renderer/qa/QaScreen.tsx`, i18n. **Out:** subir capturas; editar un comentario anterior; publicar sin pulsar.

### Notificaciones (main) (notify-core, 12 nov 2026)

**In:** `src/main/status.ts`, `src/main/avisos.ts`'s settings, `src/main/focus.ts`, new `src/main/notify.ts`, new `src/main/mrpoll.ts`, new `src/main/forge/outcome.ts`, `src/main/usage.ts`, `src/main/radar.ts`, `src/main/qa-report.ts`, `src/main/index.ts` wiring and IPC, `src/preload/**`, `resources/claude-hook.mjs`. **Out:** see `proposal.md` (summary on return, Dock badge, reviewer comments, 95 % quota, radar without a window).

### Terminal de solo lectura (terminal-read-only, 14 nov 2026)

**In:** `src/renderer/components/Terminal.tsx`, `src/main/pty.ts` (attach), `resources/claude-hook.mjs` y `resources/summarise.mjs` (el `kind`, permisos, preguntas completas), `src/main/status.ts` (estado y respuestas), la tarjeta que sustituye a `QuickReplies.tsx` en la fila, en el resumen de agentes y encima de la terminal, el compositor, IPC y preload, textos.

**Out (nombrado):** el Agent SDK (cambio siguiente); detectar tareas de shell en segundo plano (solo subagentes); ⌘D/⌘⇧D (se quitan); la selección múltiple contestada con botones; «Permitir siempre»; cambiar Libretto; las terminales de QA (siguen como hoy, también de solo lectura) más allá de no aceptar teclado.

**Never scoped out:** la tarjeta y el compositor se manejan con teclado (números 1–4 contestan con la tarjeta enfocada, ⌘↩ envía el compositor); el texto del agente se pinta como texto, nunca como HTML; un fallo al mandar sigue la regla de errores; nada llama a Claude por su cuenta.

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

### Instalar desde el doctor (add-doctor-install-terminal, 10 nov 2026)

- Sin dependencias nuevas; `osascript` viene con macOS.
- El comando va dentro de una cadena AppleScript: comillas y barras invertidas escapadas.
- Textos por `t()` con su inglés en `src/preload/i18n-en.ts`.

### Paleta Grafito (adopt-grafito, 10 nov 2026)

- Tokens sobrescritos bajo `[data-palette='grafito']` y `[data-palette='grafito'][data-theme='dark']`,
  con los mismos nombres; `--ed-*` y `--jira*` no se tocan.
- El estado vive donde vive `theme` (`src/main/ui.ts`, `UiState`), con su validación.

### Tutorial de 24 pasos (expand-tour, 10 nov 2026)

Cada afirmación de un texto debe ser cierta en el código: atajo, nombre de botón, comportamiento.
Textos por `t()`.

### QA: dónde se prueba (qa-targets, 11 nov 2026)

- Las plataformas son exactamente `chrome | safari | android | ios`. W83 sigue clasificando una carpeta; esto la llama por cada carpeta.
- Los textos por `t()` con su entrada en `i18n-en.ts`; colores solo tokens.
- `QaResult` de `retest`/`stop` no cambia; el de `launch` añade `problem`.
- Tests con `ATRIL_HOME` temporal y dobles del `Runner`; nunca un emulador real en los tests.

### Errores claros (plain-errors, 11 nov 2026)

- El token OAuth sigue sin salir de main (W18): la frase y el detalle son textos fijos o un número de estado.
- `err.message` de la red nunca llega a la ventana (puede llevar la petición); solo códigos de una lista (`ENOTFOUND`…) y el nombre de la excepción, en el detalle.
- Textos por `t()` con su entrada inglesa; colores por tokens.

### PATH del shell (login-path, 11 nov 2026)

- Ningún texto del shell sale de main ni se registra; solo se queda el valor de PATH.
- El arranque no espera más de 3 s por el shell.

### Copia con cambios (dirty-copy, 11 nov 2026)

- Nada cambia en la copia de la persona cuando se rechaza (W8 sigue).
- Textos por `t()` con inglés; el aviso usa `Problem`.

### Abrir y cerrar sin errores crudos (ws-errors, 11 nov 2026)

- La ventana nunca manda una ruta ni un comando: solo ids que main busca en sus registros.
- La ruta que main pasa a Terminal va entre comillas simples escapadas.
- Nada cambia en disco cuando se rechaza un cierre (W9 y W10 siguen).

### Modelo y esfuerzo (model-pick, 11 nov 2026)

- Solo valores de una lista llegan a la línea de órdenes (W41: nada del texto como bandera).
- Nada llama a Claude para sugerir.

### Volver a abrir (reopen-work, 11 nov 2026)

- La ventana manda el id y, como mucho, `more: true`; main decide el comando.
- Nunca dos sesiones para un trabajo: si la sesión existe, no se relanza.

### Archivos de estado dañados (state-files, 11 nov 2026)

- Nunca se escribe encima de un archivo de estado que no se ha podido leer.
- La ventana pide «mostrar» por nombre (`workspaces` o `repos`), nunca una ruta.

### Jira, GitHub y GitLab (net-errors, 11 nov 2026)

- Ni números de estado ni nombres de excepción en la frase.

### Modelos de Libretto (libretto-models, 11 nov 2026)

- No se toca el contenido de los agentes salvo la línea `model:` del frontmatter.
- La versión de Libretto copiada no cambia (no se re-empaqueta desde otra referencia).

### Repos rotos (repo-gone, 11 nov 2026)

- La ventana manda ids y, para «Buscar la carpeta…», nada: main abre el diálogo nativo.
- Nada borra ni mueve carpetas de la persona.
- Toda escritura de `repos.json` pasa por el lector estricto (W148).

### Terminal que no engancha (term-attach, 11 nov 2026)

- Un fallo deja el mapa de clientes como estaba: nada enganchado a medias.

### Panel más rápido (fast-panel, 11 nov 2026)

- Nada se enseña más de 1 s viejo respecto a hoy.

### Grafito: te necesita (grafito-you, 11 nov 2026)

- W72 sigue: el gris es neutro; contraste de texto ≥ 4,5:1.

### Radar de choques (radar, 11 nov 2026)

- En reposo, el radar no lanza procesos (usa `quietly`).
- La ventana recibe ramas y rutas relativas al repo, nada más.

### Lecciones para cada agente (lessons-first, 11 nov 2026)

- La frase es fija y sale de main (W41: nada de la persona como bandera).
- Un enlace simbólico no cuenta (no se le pide leer algo de fuera del repo).

### Dónde se atasca (stuck, 11 nov 2026)

- Se calcula una sola vez, al cerrar; ningún coste mientras el trabajo está abierto.
- Un trabajo sin cambio de Libretto no tiene tramos: su fila no cambia.

### QA en la MR (qa-to-mr, 11 nov 2026)

- El token no sale de main; la ventana manda solo el id del trabajo.
- Textos del comentario por `t()` en el idioma de la app.
- Los errores siguen W150 (frase por causa, botón, detalle plegado).

### Notificaciones (main) (notify-core, 12 nov 2026)

- No detector runs `claude` or calls Anthropic beyond `usage.ts`'s existing poll.
- Every detector's first observation after Atril starts only sets its baseline (as V2 and the status first pass do).
- Notification texts are built with main's `t()` at the moment of showing (W48).

### Terminal de solo lectura (terminal-read-only, 14 nov 2026)

- Ningún cambio en `resources/libretto/**`.
- Textos por `t()`/`useT()` con su entrada en `src/preload/i18n-en.ts`; colores solo con tokens.
- Los estados de hoy sin `kind` siguen valiendo (se lee como hoy, por prefijo).
- Después de `notify-core`: este cambio se construye sobre su rama, porque los dos tocan el gancho y `status.ts`.

### Escalera de corrección (harness-ladder, 20 nov 2026)

- `pnpm lint` tiene que salir limpio al final de cada casilla.
- Cada regla trae un `message` que dice qué usar en su lugar.

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
  pins libretto-automata `171db90`, plus Atril's `model: sonnet` line on its five reviewers (W151). A pinned copy of
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

### Instalar desde el doctor (add-doctor-install-terminal, 10 nov 2026)

- Terminal.app vía `osascript` (assumed, 10 nov). Techo: una persona con otra terminal ve Terminal.app;
  se añade un ajuste cuando alguien lo pida.
- Solo nombres de la lista cruzan el IPC (assumed, 10 nov): la lista de W21 es la única fuente de
  comandos.
- Volver a comprobar al recuperar el foco, sin seguir la instalación (assumed, 10 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Terminal dentro de Atril con xterm y un pty | Sin pty fuera de tmux, que puede ser lo que falta; `sudo` y los diálogos de macOS van mejor fuera. |
| La ventana manda el comando | Abriría la ejecución de cualquier texto desde el renderer. |
| Sondear el doctor cada 5 s | Más estado para lo que el foco ya resuelve cuando vuelves. |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Qué terminal? → A: Terminal.app vía `osascript` (`activate` + `do script`): viene con macOS y la persona ve y responde lo que pida el instalador (contraseña, licencia de Xcode) (assumed). Si Pau usa otra (iTerm, Ghostty), se añade un ajuste.
- Q: ¿Una terminal dentro de Atril (xterm + pty)? → A: no: un instalador que pide `sudo` o abre un diálogo de macOS va mejor en una terminal de verdad, y Atril no tiene pty fuera de tmux, que puede ser justo lo que falta (assumed).
- Q: ¿Cómo sabe Atril que terminó? → A: no lo sabe: al volver la ventana de Atril al frente (foco), el doctor comprueba otra vez y el aviso se actualiza o desaparece (assumed). Si eso no basta, un sondeo de 5 s mientras haya una instalación lanzada.
- Q: (fase 5) ¿Cómo se construye? → A: un handler `atril:doctor:install(tool)` que solo acepta nombres de la lista y un listener de foco en la ventana (assumed). Perdió: pasar el comando desde la ventana (abriría una puerta para ejecutar cualquier cosa).

- Q: (revisor de spec) Holguras de W70/W71 → A, todas (assumed):
  - Se vuelve a comprobar en cada foco mientras falte algo, se haya pulsado Instalar o no.
  - Tras cada comprobación, la herramienta que sigue faltando vuelve a mostrar «Instalar» y su error se borra.
  - Solo llevan botón las herramientas con comando.
  - Con el pop abierto, la lista se actualiza en sitio y el pop se va con el aviso cuando ya no falta nada.
  - El escapado se prueba con una función exportada, porque ningún comando de la lista lleva `"` ni `\`.

### Paleta Grafito (adopt-grafito, 10 nov 2026)

- Grafito elegido por Pau entre cuatro variantes minimalistas, como paleta adicional (10 nov).
- Original por defecto (assumed, 10 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Sustituir la paleta original | Pau la quiere como tema adicional. |
| Una sola lista de cinco temas (Claro, Oscuro, Auto, Grafito claro, Grafito oscuro) | Mezcla dos ejes; Automático dejaría de valer para Grafito. |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Sustituye a la original? → A: «ponlo como tema mas el original que ya tenemos».
- Q: ¿Cómo se combina con Claro/Oscuro/Automático? → A: son dos elecciones independientes: Paleta
  (Original · Grafito) y Tema (Claro · Oscuro · Automático); Grafito tiene claro y oscuro (assumed).
- Q: ¿Por defecto? → A: Original, para no cambiarle la app a nadie sin pedirlo (assumed).
- Q: ¿Solo color, o también tipografía, densidad y radios? → A: solo la paleta; lo demás, aparte si
  Pau lo pide (assumed).
- Q: ¿«te necesita» en Grafito? → A: en el acento, como en el boceto (assumed).
- Q: ¿El editor (`--ed-*`) y Jira? → A: se quedan igual en las dos paletas (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - W35 se enmienda: los colores solo viven en los cuatro bloques de tokens (dos de Original y dos de
    Grafito), y los de Grafito sobrescriben claves que ya existen. El test no se debilita.
  - El acento también tiene tope de croma, 0,13.
  - Un token `rgba()` se clasifica por su color.
  - «Al momento» significa en el mismo clic, sin esperar a main.
  - Un valor desconocido lo normaliza main al leer `ui.json`.
  - El boceto y la foto no tienen criterio: son dibujo y evidencia.
  - «Paleta», «Original» y «Grafito» pasan por `t()`.

### Tutorial de 24 pasos (expand-tour, 10 nov 2026)

- Pau, 10 nov: «tiene que ser más extenso… dejas muchas cosas en el aire», en castellano de España.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Un tutorial corto por pantalla | Pau pidió uno más extenso; partirlo deja piezas sin ver. |
| Abrir diálogos de verdad durante el tutorial | Toca el motor y puede dejar estado a medias. |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Cuántos pasos? → A: 24, uno por pieza que se usa, en el orden en que se usa: Trabajo, su panel,
  Tareas, MR, Avisos, lo de arriba y abajo, Ajustes (assumed).
- Q: ¿Qué dice cada paso? → A: qué es, cómo se usa y qué pasa al usarlo, en 2–3 frases de castellano de
  España, con sus atajos; cada frase tiene que ser verdad en el código de hoy (assumed).
- Q: ¿Pasos de cosas que no siempre están (subagentes, herramientas, el diálogo de modo, ⌘K)? → A: se
  explican igual: si no hay elemento, el paso sale centrado, como ya hace el tutorial (assumed).
- Q: ¿La bienvenida? → A: «Enséñamelo · 3 min» (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - Cada texto tiene **2 o 3 frases**; una frase acaba en «.», «?» o «!» seguido de espacio o del final.
  - start-mode y palette nunca tienen elemento: el test comprueba que salen centrados, sin foco. Los
    otros seis opcionales se dan en el mock cuando es práctico.
  - El paso 11 ilumina la pestaña Actividad, que siempre está visible.
  - El paso 18, «la nueva comprobación», es la que se hace al volver el foco a Atril.
  - Los `data-tour` en rutas de otras capacidades son solo atributos al servicio del tutorial, que es de
    workspaces; no se escribe spec en esas capacidades.
  - La bienvenida dice «Enséñamelo · 3 min» y entra en W23.
  - El «Out» de add-command-palette sobre un paso de tutorial para ⌘K queda superado por este cambio.
  - Fotos: pasos 7 y 13, en `bocetos/novedades/tutorial-7.png` y `tutorial-13.png`.

- Q: (constructor) Sin elemento, el paso salía en una esquina, no centrado como pide W23 → A: se añade
  `.tip.centred` y una línea en `Tour.tsx`; único cambio al motor, a favor de W23 (assumed). Los textos se
  corrigieron donde la tabla no era verdad: Nueva tarea abre un trabajo (no crea en Jira), el número del
  rail sin color, el registro del subagente «como una terminal», el reinicio semanal de la cuota.

### Respuestas rápidas (quick-replies, 10 nov 2026)

- Solo la primera pregunta (assumed, 10 nov); techo: las demás, en la terminal.
- El número de la opción como tecla (assumed, 10 nov); techo: formato interno de Claude Code.
- Respuestas fijas «Sí, sigue» / «No, espera» (assumed, 10 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Escribir siempre el texto de la opción | En el selector de Claude Code no elige nada. |
| Botones en la notificación del Mac | macOS solo deja un campo de respuesta; ya existe (N3). |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Para qué? → A: para llevar 3 trabajos a la vez sin perder el foco: contestar a un agente desde
  su fila sin abrir su terminal (Pau, 10 nov) (assumed).
- Q: ¿Qué respuestas? → A: si la pregunta es de `AskUserQuestion` (con opciones), sus opciones; si no,
  dos fijas: «Sí, sigue» y «No, espera» (assumed).
- Q: ¿Cómo se envía una opción? → A: tecleando su número (1, 2…) y Enter en el panel del agente, que es
  como se elige en el selector de Claude Code (assumed; formato interno: si cambia, se escribe el texto de
  la opción). Una respuesta fija se escribe literal, como N3.
- Q: ¿Dónde? → A: en la fila del trabajo en «Trabajo en marcha», debajo de «Te pregunta: …»; nada en el
  panel ni en otras pantallas en este cambio (assumed).
- Q: ¿Varias preguntas a la vez (`questions` con más de una)? → A: solo la primera; las demás se contestan
  en la terminal (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **Qué manda la ventana.** Solo `{ option: n }` o `{ fixed: 'yes' | 'no' }`. Main traduce `yes` a «Sí,
    sigue» y `no` a «No, espera». Nunca teclea texto que venga de la ventana.
  - **Qué comprueba main al pulsar.** Relee el estado del trabajo. Si ya no está en needs-you, responde
    «Ese agente ya no está esperando una respuesta.». Si la opción no está entre las guardadas, «Esa
    opción ya no existe.».
  - **Preguntas multiSelect.** No llevan botones de opción ni respuestas fijas; se contestan en la
    terminal. «Other» no se ofrece.
  - **Cuánto duran las opciones.** Se guardan mientras el estado siga en needs-you, también si llega un
    Notification o un Stop, y se borran en cuanto el estado pasa a otro.
  - **Después de enviar.** La fila dice «Enviado» y los botones quedan desactivados hasta que el estado
    cambie.
  - **Dónde van los botones.** Solo en la fila. La línea del Reading que habla del panel y del aviso queda
    superada.
  - **Tutorial.** El paso 4 («Trabajo en marcha») nombra las respuestas rápidas sin pasar de 3 frases.

### Modo foco (focus-mode, 10 nov 2026)

- El foco no se recuerda al reiniciar (assumed, 10 nov).
- Con Atril detrás, el aviso del Mac sale igual (assumed, 10 nov).
- ⌘⇧F y ⌘⌥← como atajos (assumed, 10 nov; libres en el menú).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Ventana aparte por trabajo | Rompe la ventana única y duplica la terminal. |
| Silenciar todos los avisos en foco | Con Atril detrás perderías al agente que te necesita. |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Qué es el modo foco? → A: estás en un trabajo y Atril quita lo demás de la vista: la barra lateral y
  «Qué me toca» se esconden; la terminal y el panel de Libretto de ese trabajo se quedan (assumed).
- Q: ¿Cómo se entra y sale? → A: menú Trabajo → Modo foco, ⌘⇧F, y un botón «Salir del foco» arriba; no se
  recuerda al reiniciar (assumed: el foco es de un momento).
- Q: ¿Y si otro agente te necesita? → A: con Atril delante, en vez del aviso del Mac sale una pastilla
  discreta arriba, «{rama} te necesita», que no te cambia de trabajo; con Atril detrás, el aviso del Mac
  sale como siempre (permite responder, N3) (assumed).
- Q: ¿Cómo saltas y vuelves? → A: ⌘↩ (o pulsar la pastilla) va al que te necesita, sin salir del foco; allí
  «Volver a {rama}» y ⌘⌥← te devuelven al trabajo donde estabas (assumed).
- Q: (fase 5) ¿Cómo? → A: un estado `focus` en la ventana y un aviso a main de si suprimir notificaciones
  (assumed). Perdió: una ventana aparte por trabajo (rompe el modelo de una sola ventana).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **⌘↩ en foco:** salta solo al agente que espera, el más antiguo según N1, sin contar el que tienes
    abierto. En foco nunca abre una tarea; si no espera nadie, la opción del menú está desactivada. N2 se
    enmienda para recogerlo.
  - **«Volver a»:**
    - Recuerda el trabajo en el que estabas al hacer el primer salto, y los saltos siguientes no lo
      cambian.
    - Se olvida al volver, al salir del foco o si ese trabajo se cierra.
    - Cambiar de trabajo a mano (⌘1…9, ⌘K) sigue permitido y no cambia a dónde vuelves.
  - **La pastilla:**
    - Nombra a todos los que esperan ahora, menos el abierto, aunque ya esperaran antes de entrar en el
      foco.
    - Desaparece cuando no queda ninguno.
    - Es parte de W79, en la ventana.
  - **El aviso del Mac:**
    - Un aviso que se calla por estar en el foco ya no sale después: la pastilla lo sustituye. W15 se
      enmienda con esa excepción.
    - Main mira `isFocused()` de la ventana en el momento de avisar. Minimizada, oculta o en otro
      Escritorio cuenta como «no delante».
    - La ventana le dice a main cada vez que el foco cambia y al cargar. Si recarga, el foco vuelve a
      estar apagado.
  - **Cuándo se puede activar:** «Modo foco» solo se activa en Trabajo con un trabajo elegido. Al cambiar
    de trabajo, el foco sigue puesto, ahora sobre el nuevo.
  - **Tutorial:** se nombra en el paso 4.
  - **Textos:** «Modo foco» y «Volver» van por `t()`.

- Q: (revisor de obra) ¿Al ir a Tareas o Ajustes con el foco puesto, se olvida «Volver a»? → A: no: el foco
  queda latente y al volver a Trabajo sigue con su destino; solo se aplica en Trabajo (assumed).

### Todos los agentes (agents-overview, 10 nov 2026)

- Tarjetas, no terminales múltiples (assumed, 10 nov).
- El modo «Todos» no se recuerda al reiniciar (assumed, 10 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Varias terminales xterm a la vez | Peso, tamaño y foco del teclado; para decidir basta la tarjeta. |
| Una pantalla nueva en el rail | Las tarjetas son trabajos: viven en Trabajo. |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Para qué? → A: ver los 3 (o más) agentes a la vez sin entrar en cada uno: qué hace cada uno, en qué
  etapa va y quién te necesita (Pau, 10 nov: «3 tareas a la vez sin perder el foco») (assumed).
- Q: ¿Dónde? → A: un segundo modo de Trabajo, «Todos», con ⌘⇧A y un conmutador «Uno · Todos» en la
  cabecera; en «Todos» el hueco de la terminal muestra una tarjeta por trabajo (assumed). Perdió: varias
  terminales a la vez (pesadas y frágiles con tmux; una tarjeta basta para decidir a cuál entrar).
- Q: ¿Qué lleva cada tarjeta? → A: rama y repo, estado escrito, etapa de Libretto con su checklist «3/7»,
  la última acción con «hace N min», los subagentes trabajando y, si te necesita, sus respuestas rápidas
  (W76) (assumed).
- Q: ¿Orden? → A: primero los que te necesitan (más antiguo primero, como N1), luego trabajando, luego
  parados (assumed).
- Q: ¿Pulsar una tarjeta? → A: la abre en modo «Uno» (assumed).

- Q: ¿⌘⇧A? → A: libre en el menú; «Uno · Todos» en la cabecera de Trabajo; con el modo foco puesto, «Todos»
  sale del foco (assumed: el foco es de un trabajo).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **Orden de las tarjetas:**
    - primero los que te necesitan, del que más lleva esperando al que menos (N1);
    - luego los que trabajan, con la actividad más reciente primero;
    - por último los parados, por nombre de rama;
    - si empatan, por id.
  - **Edad de la actividad:**
    - «ahora» si es de hace menos de un minuto;
    - «hace {n} min» hasta la hora;
    - «hace {n} h» hasta el día;
    - «hace {n} d» a partir de ahí.
    Se refresca cada 30 s, igual que la pestaña Actividad.
  - **Cuando falta un dato:**
    - sin actividad, la tarjeta dice «sin actividad»;
    - sin Libretto, «sin Libretto»;
    - mientras carga el flujo, no sale nada;
    - sin subagentes, tampoco sale nada.
  - **«Todos» y el modo foco.** Entrar en «Todos» quita el foco (W77 se enmienda). Al pulsar una tarjeta
    vuelves a «Uno» sin foco.
  - **Lo demás de Trabajo.** En «Todos» la barra lateral y «Qué me toca» siguen a la vista, y ⌘↩ funciona
    como N2: si abre un trabajo, pasa a «Uno».
  - **⌘⇧A** solo está activo en Trabajo y con al menos un trabajo abierto.
  - **Las respuestas rápidas** van fuera del botón de la tarjeta, así que no hay botones metidos dentro de
    otros botones, y contestar no abre la tarjeta. Con una pregunta multiSelect no hay botones (como W76).
  - **Teclado.** Las flechas mueven el foco entre tarjetas.
  - **Al reiniciar** «Todos» no se recuerda.
  - **Tutorial.** Se cambia el texto del paso 4; siguen siendo 24 pasos.

### QA en vivo (add-qa-lab, 10 nov 2026)

- Playwright MCP para web y mobile-mcp para móvil, versiones fijadas (assumed, 10 nov).
- MCP solo por sesión con `--strict-mcp-config` (assumed, 10 nov).
- Capturas fuera del repo, en ATRIL_HOME (assumed, 10 nov).
- Un QA por trabajo y solo bajo demanda (assumed, 10 nov; CLAUDE.md: cuota bajo demanda).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| `claude mcp add` en la configuración de la persona | Toca su configuración global y afecta a todos sus agentes. |
| Reiniciar el agente del trabajo con los MCP | Pierde su contexto; el QA es un segundo par de ojos. |
| Chrome DevTools MCP para web | Bueno para depurar; Playwright deja las capturas en una carpeta fija sin depender del agente. |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Qué es? → A: un botón «Probar en vivo» por trabajo que abre, al lado de su terminal, un Claude de QA con
  las herramientas para manejar la app de verdad (navegador o emulador), que la arranca en esa rama, recorre lo
  que promete la spec y deja capturas; Atril las enseña en una sección «QA» del panel (assumed).
- Q: ¿Qué herramientas? → A: web: Playwright MCP (`@playwright/mcp`, capturas a `--output-dir`); Android e iOS:
  `mobile-mcp` (`@mobilenext/mobile-mcp`), con el emulador o simulador ya en marcha; versiones fijadas
  (assumed; investigación 10 nov, sin verificar contra los docs oficiales).
- Q: ¿Cómo sin tocar la configuración de la persona? → A: `--mcp-config <archivo de Atril>` y
  `--strict-mcp-config` en esa sesión; nunca `claude mcp add` ni `~/.claude.json` (assumed).
- Q: ¿Qué tipo de proyecto? → A: por archivos, en este orden: Expo, React Native, Flutter, Android nativo, iOS
  nativo, web (`package.json` con `dev`, `start` o `preview`); sin coincidencia, no hay botón (assumed).
- Q: ¿Dónde van las capturas? → A: `$ATRIL_HOME/qa/<workspace>/`, fuera del repo, para no ensuciar git (assumed).
- Q: ¿Cuota y recursos? → A: nada arranca solo; un solo QA por trabajo a la vez; «Detener QA» cierra ese panel;
  arrancar emulador o simulador queda en manos del Claude de QA según su prompt (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **De quién es la sección «QA».** Del panel de Libretto: va en `spec-flow-status.md` como F33. W85 se
    retira.
  - **Comando de arranque por tipo:**
    - web: el script `dev`, si no `start`, si no `preview`, con el gestor del repo (pnpm si hay
      `pnpm-lock.yaml`, yarn si hay `yarn.lock`, si no npm);
    - expo: `npx expo start`;
    - react-native: `npx react-native run-ios` / `run-android`;
    - flutter: `flutter run`;
    - android: `./gradlew installDebug`;
    - ios: `xcodebuild` para el simulador, y el esquema lo elige el Claude de QA.
  - **Herramientas que hacen falta:**
    - siempre `node`;
    - android: `adb` y `emulator`;
    - ios: `xcrun`;
    - expo, react-native y flutter: al menos uno de los dos móviles.
    Si falta algo, la respuesta las nombra todas.
  - **El panel de QA.** Se abre con un comando, dividiendo el panel del trabajo. Su id de tmux se guarda en
    `$ATRIL_HOME/qa/<id>.pane`. «Vive» mientras tmux tenga ese panel; si lo cierras a mano, se nota en la
    siguiente consulta.
  - **adb y emulator** también cuentan si están en la carpeta del SDK de Android (ANDROID_HOME, ANDROID_SDK_ROOT o ~/Library/Android/sdk), no solo en el PATH (añadido al construir).
  - **El emulador o el simulador.** Si no hay ninguno en marcha, lo arranca el Claude de QA según su prompt.
    La decisión 2 queda corregida.
  - **Capturas en móvil.** El prompt pide guardarlas en la carpeta (con la herramienta de mobile-mcp,
    `adb exec-out screencap` o `xcrun simctl io booted screenshot`). Techo: depende de que el agente lo
    haga.
  - **Sin cambio abierto.** El prompt nombra la rama y pide probar lo que cambia respecto a su base.
  - **«Detener QA».** Cierra solo ese panel; el archivo MCP y las capturas se quedan.
  - **Cómo llegan las capturas a la ventana.**
    - La ventana pregunta `qa.status(id)` (tipo, si vive y capturas) cada 3 s mientras se ve la sección,
      como F22.
    - Las capturas llegan como data URL, las 12 más nuevas y de 2 MB como mucho cada una, así que no se
      abre `file://` en la ventana.
  - **Tutorial.** Se menciona sin criterio, cambiando el texto del paso del panel.

### Pausar un agente (pause-agent, 10 nov 2026)

- Esc para pausar, texto literal para reanudar (assumed, 10 nov).
- Solo se pausa lo que trabaja (assumed, 10 nov).

#### Decision log, answers as given (2026-11-10)
- Q: ¿Cómo se pausa? → A: Esc en el panel del agente, que es como Claude Code interrumpe su turno sin cerrar la
  sesión; Atril apunta el trabajo como «en pausa» (assumed). Perdió: congelar el proceso (SIGSTOP), que puede
  cortar su conexión con la API a medias y dejar herramientas colgadas.
- Q: ¿Cómo se reanuda? → A: «Reanudar» escribe «Sigue donde lo dejaste.» y Enter, literal, como N3 (assumed).
- Q: ¿Dónde? → A: en el menú del trabajo (clic derecho y menú Trabajo → Pausar / Reanudar, ⌘⇧P) y en su
  tarjeta de «Todos»; la fila dice «en pausa» (assumed).
- Q: ¿Y si el agente te necesitaba? → A: pausar no cambia una pregunta pendiente: solo se ofrece mientras está
  trabajando (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **Qué es «en pausa».** Una marca aparte, no un cuarto estado. Vive en `$ATRIL_HOME/paused/<session>`
    y sobrevive a un reinicio, porque el Claude de verdad sigue parado.
    - Con la marca puesta, el estado efectivo de ese trabajo es «en pausa». Todo lo que lee el estado lo
      trata como parado: el orden de W81, el editor de F15 y la pastilla del foco.
    - El hook no la cambia: Claude Code no lanza Stop al interrumpirlo.
  - **Qué la quita:** solo un UserPromptSubmit (lo que escribes tú o «Reanudar») o pasar a needs-you. Un
    PreToolUse o PostToolUse que llega tarde no la quita.
  - **A qué panel va el Esc:** al panel del agente cuyo id guarda el registro, nunca a un panel dividido
    con ⌘D.
  - **Si el Esc no sirve.** Techo nombrado: si Claude no se para (una herramienta que lo ignora), la
    marca se quita en cuanto llegue otro estado que no sea `working`.
  - **Errores al reanudar:** si no está en pausa, «Ese agente no está en pausa.»; si el trabajo ya no
    está, el mensaje de N3.
  - **El menú** alterna entre «Pausar» y «Reanudar» con ⌘⇧P, que está libre.
  - **Prueba en la ventana:** fila, tarjeta y menú van en un criterio aparte, W88.
  - **Textos:** «en pausa», «Pausar» y «Reanudar» van por `t()`.

### Coste por trabajo (cost-per-work, 10 nov 2026)

- Transcripts locales como fuente, sin llamadas (assumed, 10 nov).
- Tabla de precios fechada en un archivo (assumed, 10 nov).
- «Estimado a precio de API» (assumed, 10 nov).

#### Decision log, answers as given (2026-11-10)
- Q: ¿De dónde salen los números? → A: de los transcripts locales de Claude Code, sin llamar a nada: cada
  línea `assistant` trae `message.usage` (input, output, cache creation, cache read) y `message.model`. Se
  suman el transcript principal del trabajo y los de sus subagentes (`<transcript sin .jsonl>/subagents/*.jsonl`)
  (assumed).
- Q: ¿Cómo sabe Atril qué transcript es de cada trabajo? → A: el hook guarda en cada evento la ruta de
  `transcript_path` (campo documentado) en `$ATRIL_HOME/transcripts/<session>`; solo la ruta, nunca contenido
  (assumed).
- Q: ¿Duplicados? → A: Claude Code puede escribir varias líneas del mismo mensaje con el mismo `usage`: se
  cuenta una vez por `message.id` (assumed).
- Q: ¿Precio? → A: tabla oficial de la API cacheada el 2026-11-03 (claude-api): Fable 5.2 8/40, Opus 5.5 4/20 (caché
  leída 0,20), Opus 5 5/25, Sonnet 5.5 2/10 (caché leída 0,10), Sonnet 5 2/10, Haiku 5.5 0,10/0,50 $ por millón;
  escritura de caché 1,25× la entrada, lectura de caché la publicada o 0,1× la entrada; un modelo desconocido
  cuenta tokens y no coste (assumed). Techo: los precios cambian; la tabla vive en un archivo con su fecha.
- Q: ¿Qué se dice? → A: «≈ {coste} $ · {tokens} tokens» y la etiqueta «estimado a precio de API» (con
  suscripción no se paga por token) (assumed).
- Q: ¿Dónde? → A: en la tarjeta de «Todos», en el panel de Libretto (una línea bajo «Cambio») y en el título
  de la fila al pasar el ratón (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **Varios transcripts por trabajo.** `transcripts/<session>` guarda una ruta por línea; se añade si es
    nueva. El total suma todas las rutas y sus subagentes, así que lo de un transcript anterior no se pierde
    al reanudar.
  - **Qué toca el hook.** W92 escribe solo ese archivo, en cualquier evento. El «no cambia nada» de W63 se
    refiere al archivo de subagentes. La frase de add-agent-activity «el payload crudo nunca va a disco» sigue
    siendo cierta: solo se guarda una ruta.
  - **`<session>`** es el mismo nombre que en W62.
  - **Líneas sin `message.id`.** Cuentan una vez cada una, porque no hay con qué deduplicarlas.
  - **El modelo.** Coincide si es el id exacto o el id seguido de una fecha (`-AAAAMMDD`).
  - **Precio incompleto.** El coste solo suma los modelos con precio. Si queda alguno sin él, se añade «(sin
    precio para {modelo})».
  - **Formato.**
    - Coste: «0,42 $», o «< 0,01 $» si no llega.
    - Tokens: «850», «12,3 k» o «1,2 M».
    - Si el total es 0 tokens, no se enseña nada.
  - **Lectura.** Main guarda por archivo hasta dónde ha leído y los `message.id` ya vistos, y relee cada
    30 s solo lo añadido. Empuja `atril:cost:changed` cuando el total cambia; la ventana pide
    `atril:cost:get`.
  - **La línea del panel de Libretto** es de flow-status: va en F34.
  - **Decisiones superadas.** El «Out: token or cost per workspace» y «Read the whole transcript» de
    add-agent-activity quedan superados por este cambio.

### Historial (work-history, 10 nov 2026)

- Al quitar, no al aterrizar (assumed, 10 nov).
- 200 en disco, 20 a la vista (assumed, 10 nov).
- Sección plegada en Trabajo (assumed, 10 nov).

#### Decision log, answers as given (2026-11-10)
- Q: ¿Cuándo entra un trabajo en el historial? → A: al quitarlo con éxito (W10/W90): es cuando deja de estar «en
  marcha» (assumed). Lo aterrizado y lo abandonado entran igual; la etapa a la que llegó lo distingue.
- Q: ¿Qué se guarda? → A: una línea en `$ATRIL_HOME/history.jsonl`: rama, repo, clave de Jira si la tenía, modo,
  cambio de Libretto y etapa a la que llegó, abierto (nuevo campo `createdAt` en el registro; los viejos no lo
  tienen) y cerrado, y el coste (W93) en ese momento; nunca contenido de transcripts ni del repo (assumed).
- Q: ¿Dónde se ve? → A: una sección plegable «Terminados» bajo «Trabajo en marcha», plegada por defecto, con los 20
  últimos: rama, repo, etapa («Aterrizado», «Construir»…), «duró {d}» cuando hay `createdAt`, el coste y «hace
  {n} d» (assumed).
- Q: ¿Tamaño? → A: el archivo guarda los 200 últimos; la vista enseña 20 (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **Etapa y cambio.** Main llama a `stageOf` (código de flow-status, solo lectura) **antes** de quitar el
    trabajo. Las etapas son las de siempre: Entrada, Spec, Plan, Construir, Terminado, Aterrizado y «sin
    Libretto».
  - **Orden de las cosas.** Se capturan etapa y coste, se quita el trabajo y, solo si quitarlo sale bien, se
    añade la línea. Si el historial no se puede escribir, el trabajo se quita igual.
  - **Sesiones de revisión.** No entran.
  - **Cuántas se guardan.** Las 200 últimas por orden de escritura, recortando tras añadir. Las escrituras van
    en cola, una a una, con archivo temporal y renombrado como W80.
  - **Formatos:**
    - «duró»: «< 1 min», «{m} min», «{h} h {m} min» o «{d} d {h} h».
    - Antigüedad: «hoy» si es el mismo día de calendario, si no «hace {n} d».
    - Coste: la forma corta de W94, «≈ 0,42 $ · 850 tokens», sin la etiqueta y nada si son 0 tokens.
  - **La sección.** La cabecera cuenta todas las líneas del archivo. Si no hay ninguna, la sección no sale. La
    ventana lo pide al cargar (`atril:history:list`) y main avisa al añadir (`atril:history:changed`).
  - **La MR y el informe** quedan fuera; la frase de la lectura que los nombraba está superada.

### Primeros pasos (first-run-setup, 10 nov 2026)

- Tarjeta en el vacío de Trabajo, no un asistente modal (assumed, 10 nov).
- Jira y forja opcionales (assumed, 10 nov).
- Tutorial primero, tarjeta después (assumed, 10 nov).

#### Decision log, answers as given (2026-11-10)
- Q: ¿Qué ve alguien nuevo? → A: en Trabajo, mientras no haya trabajos, una tarjeta «Primeros pasos» en lugar del
  vacío de hoy, con cinco pasos que se marcan solos leyendo el estado real (assumed):
  1. «Herramientas listas» — el doctor sin problemas (W21); si no, «Instalar» abre su aviso (W70/W71).
  2. «Añade un repo» — al menos un repo registrado; botón a Ajustes → Repos.
  3. «Conecta Jira» (opcional) — token guardado (S5); botón a Ajustes → Conexiones.
  4. «Conecta GitHub o GitLab» (opcional) — una forja guardada; mismo botón.
  5. «Abre tu primer trabajo» — botón «Nuevo trabajo».
- Q: ¿Cuándo desaparece? → A: cuando hay al menos un trabajo, o al pulsar «Ya lo tengo»; recordado en el estado de
  la interfaz (`setupDismissed`) (assumed).
- Q: ¿Y el tutorial? → A: sigue igual (W23): el tutorial explica; la tarjeta deja la app lista. El tutorial va
  primero; la tarjeta aparece al cerrarlo (assumed).
- Q: ¿Opcionales? → A: Jira y forja se marcan «opcional» y no impiden terminar (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **Cuándo sale.** Mientras no haya ningún trabajo en la lista (también los parados; corregido al construir), el historial (W96) esté vacío y no exista
    `setupDismissed`. Quien ya trabajó no la vuelve a ver.
  - **El paso 5** es solo su botón «Nuevo trabajo». Nunca sale marcado, porque la tarjeta se va en cuanto hay
    un trabajo.
  - **El paso 1** está hecho cuando git, tmux y claude no tienen problema; jira es del paso 3, que es opcional.
    Mientras llega el informe del doctor, el paso dice «Comprobando…». Su botón abre la lista del aviso de
    herramientas (W32), donde está «Instalar».
  - **El paso 4** está hecho con cualquier forja guardada, GitHub o GitLab.
  - **El tutorial.** Mientras está abierto, en el primer arranque o desde Ayuda, la tarjeta no se ve; sale al
    cerrarlo. W23 y W24 no cambian.
  - **«Ya lo tengo»** guarda `setupDismissed` en `ui.json`, validado como `tutorialSeen`, y se recuerda al
    reiniciar.
  - **El estado real** sale de llamadas que ya existen y no exponen tokens: `doctor()`, `repos.list()`,
    `settings.jira.status()` y `settings.forge.status(forge)`, todas con su `saved`.
  - **Los botones de Ajustes** usan la navegación que ya usa M35 («Ajustes → Repos»).
  - **La foto** se saca con `ATRIL_SNAPSHOT_VIEW=work`, un `ATRIL_HOME` vacío y `tutorialSeen: true`.

### Empaquetar (package-and-sign, 10 nov 2026)

- arm64 solo (assumed, 11 nov).
- Identidad por `ATRIL_SIGN_IDENTITY`, si no ad-hoc (assumed, 11 nov).
- Sin notarización ni auto-update (assumed, 11 nov; investigación del 10 nov).
- La sesión no construye; Pau sí (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| `electron-builder.yml` + `CSC_NAME` | no expresa «si no, ad-hoc» sin macros; un test no puede ver la caída |
| electron-forge | más piezas (makers, plugins) para el mismo `.dmg` |
| construir aquí para probarlo | CLAUDE.md lo prohíbe |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Con qué? → A: `electron-builder` como dependencia de desarrollo (versión fijada), configuración en
  `electron-builder.config.cjs` (JS, para que la identidad caiga a ad-hoc sin YAML con macros); hace falta una dependencia nueva porque no hay empaquetador (assumed).
- Q: ¿Qué sale? → A: un `.dmg` y un `.zip` para Apple Silicon (arm64); x64 no (assumed).
- Q: ¿Firma? → A: la investigación del 10 nov: certificado propio del Llavero si `ATRIL_SIGN_IDENTITY` está
  definido (p. ej. «Atril Local»), si no firma ad-hoc (`"-"`); `hardenedRuntime: true` con `allow-jit`,
  `allow-unsigned-executable-memory` y `disable-library-validation` en `build/entitlements.mac.plist`; sin
  notarización (sin cuenta de Apple) (assumed).
- Q: ¿Quién lo construye? → A: la persona, con `pnpm dist`; esta sesión no construye (CLAUDE.md: nunca `pnpm build`),
  así que la prueba es la configuración, y la comprobación a mano va escrita (assumed).
- Q: ¿Recursos? → A: `resources/` (Libretto, hook, resumen) va dentro del paquete como `extraResources`; `paths.ts`
  ya distingue empaquetado (assumed; el constructor lo comprueba).
- Q: ¿Instrucciones? → A: `bocetos/instalar.html`: construir, firmar con certificado propio, abrir la primera vez
  («Abrir igualmente» en Privacidad y seguridad desde Sequoia), y la vía de 99 $/año si un día se comparte (assumed).


- Q: ¿Dónde vive la caída a ad-hoc? → A: en el propio `electron-builder.config.cjs`:
  `identity: process.env.ATRIL_SIGN_IDENTITY || '-'`; el test lo carga con y sin la variable (assumed).
- Q: ¿`resources/` plano o en carpeta? → A: plano, `{ from: 'resources', to: '.' }`, como espera `paths.ts`
  (`<resourcesPath>/claude-hook.mjs`, `<resourcesPath>/libretto/`) (assumed).
- Q: ¿node-pty? → A: `asarUnpack` de `node_modules/node-pty/**`, `npmRebuild: true`, y `files` limitado a `out/**` y
  `package.json`; `dist` = `electron-vite build && electron-builder --mac` (assumed).
- Q: ¿Qué demuestra el test? → A: el texto de la configuración, nada más; que el `.dmg` arranque, abra terminales y
  encuentre el hook lo comprueba Pau a mano (entrada «sin probar») (assumed).
- Q: ¿Fijada? → A: versión exacta, sin `^` (`26.18.0`, del 20 oct) (assumed).
- Q: ¿Dueño de los archivos nuevos? → A: workspaces; su `Governs:` añade `electron-builder.config.cjs` y `build/**`
  (assumed).
- Q: ¿Foto y boceto? → A: no hay pantalla nueva: novedades lleva su sección sin foto y el boceto no cambia (assumed).
- Q: ¿Otro Mac? → A: fuera; la página explica «Abrir igualmente» y el certificado propio, sin prometerlo (assumed).

### Libretto (libretto-view, 10 nov 2026)

- Leer del disco, no preguntar a Claude (assumed, 11 nov).
- Encolar sin modelo, con la plantilla de `/libretto-queue` (assumed, 11 nov).
- Empezar = Atril hace el paso 3 de `/libretto-next` y entra en `write-spec` (assumed, 11 nov).
- Pantalla propia «Libretto» (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| lanzar `/libretto-queue` en un Claude | gasta cuota para escribir un archivo con plantilla fija |
| la cola dentro de Trabajo | Trabajo es lo que está en marcha; la cola es por repo y aún no es trabajo |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Dónde? → A: una pantalla nueva «Libretto» en la barra lateral (y en ⌘K), con un selector de repo registrado,
  recordado como el último usado (assumed).
- Q: ¿`/libretto-status` y la cola llaman a Claude? → A: no: Atril lee `.agents/changes/*/proposal.md` del repo con lo
  que ya existe (`changeFolders`, `readChecklist`); cero cuota (assumed).
- Q: ¿Qué es «en cola»? → A: una carpeta cuyo `proposal.md` lleva una línea `Queued: <fecha ISO>`; más antigua
  primero, con su nombre, fecha y la primera línea no vacía de `## Reading` (assumed).
- Q: ¿Y «en curso»? → A: cualquier otra carpeta de cambio: su nombre y «{closed}/{total}» casillas con la primera
  abierta, o «sin checklist» (assumed).
- Q: ¿Encolar llama a Claude? → A: no: hace lo que `/libretto-queue` en su paso 2–3, sin modelo: nombre desde el texto
  (minúsculas, sin acentos, guiones, máx. 40), `proposal.md` con la plantilla del comando y la petición literal como
  cita, y `git commit` solo de ese archivo con `docs(queue): capture <name>` en la rama actual del repo (assumed).
- Q: ¿Nombre repetido? → A: sufijo `-2`, `-3`… (assumed).
- Q: ¿Repo sin `.agents/changes/`? → A: la pantalla dice «Este repo no usa Libretto» y no ofrece encolar, como
  `/libretto-queue` se niega (assumed). «Iniciar Libretto» es otra idea ★.
- Q: ¿«Empezar»? → A: abre un trabajo nuevo (`openWorktree`) en la rama `feat/<name>` con el primer mensaje
  `/libretto:libretto-next <name>`; el comando quita `Queued:` y sigue el flujo (assumed). Si Libretto intenta otra
  rama dentro del worktree, va a «sin probar».
- Q: ¿Se refresca sola? (ver abajo) → A: al entrar, al cambiar de repo y tras encolar o empezar; botón «Actualizar» (assumed).

- Q: `libretto-next` no acepta nombre, pregunta cuál y hace `checkout -b`: ¿cómo se empieza? → A: Atril hace el paso 3
  del comando él mismo: abre el trabajo en `feat/<name>` (es la rama), quita la línea `Queued:` del `proposal.md` de
  ese worktree y la commitea ahí (`docs(queue): start <name>`); y el primer mensaje es el paso 4,
  `/libretto:write-spec <name>`. Igual que `/libretto-next`, sin su pregunta: el clic ya eligió (assumed).
- Q: ¿Qué árbol se lee? → A: el checkout del repo; una idea en cola cuya rama `feat/<name>` ya existe se muestra
  «Empezada · feat/<name>» sin «Empezar» (assumed).
- Q: ¿Repos sin worktree (in-place)? → A: valen; si `openWorktree` devuelve error, sale bajo la idea y no se
  commitea nada (assumed).
- Q: ¿Nombre? → A: de la primera línea del texto: minúsculas, sin acentos, lo no alfanumérico a un guion, sin guiones
  al borde, cortado a 40 contando el sufijo `-N`; si queda vacío, `idea` (assumed).
- Q: ¿Si el commit falla? → A: se borra la carpeta escrita y se enseña el error (assumed).
- Q: ¿Fecha? → A: local (assumed).
- Q: ¿Qué es la línea `Queued:`? → A: `Queued: AAAA-MM-DD` sola en su línea, antes del primer `## `; empate por
  nombre (assumed).
- Q: ¿Qué sale en curso? → A: toda carpeta no en cola, con o sin `proposal.md`; las que tienen todas las casillas
  cerradas dicen «Lista para aterrizar» (assumed).

### Tarjeta de pregunta (ask-card, 10 nov 2026)

- Pregunta y respuestas dentro de la tarjeta de la fila (assumed, 11 nov).
- «Otros cambios» se sustituye por un enlace a Libretto (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| dejar los chips y separarlos con margen | sigue sin decir de qué fila son |
| pregunta en un modal | rompe el «sin dejar lo que haces» de las respuestas rápidas |
| explicar «Otros cambios» con un subtítulo | sigue sin acción; Libretto ya enseña esos cambios con sentido |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Cómo se ve? → A: la fila y la pregunta forman una sola tarjeta: la fila pierde las esquinas de abajo y
  su borde toma el color «te necesita»; debajo, pegada, la pregunta entera (sin cortar) y una respuesta por fila
  con su número (1, 2, 3…), como el selector de Claude Code; fondo tintado muy suave con `--you`. El boceto 10
  ya lo enseña (assumed).
- Q: ¿La línea de actividad cortada de la fila? → A: mientras está la tarjeta no se repite: la pregunta va entera
  dentro (assumed).
- Q: ¿En «Todos»? → A: igual, dentro de su tarjeta (assumed).
- Q: ¿Teclado? → A: los números son solo dibujo; las respuestas siguen siendo botones con Tab/Enter (assumed).
- Q: ¿«Otros cambios»? → A: es el resto de carpetas de `.agents/changes/` sin contexto y sin acción. Se quita la
  sección; en su lugar una línea «{n} cambios más en este repo → Libretto» que abre la pantalla Libretto con ese
  repo elegido (assumed).

- Q: ¿«Entera» desde dónde? → A: la línea de actividad tal como la guarda el hook (ya cortada a 200 en
  `summarise.mjs`); en la tarjeta solo se quita la elipsis de CSS. Nada cambia en main (assumed).
- Q: ¿Dónde se prueba que la fila no repite la línea? → A: en `quickreplies.test.ts`, montando `WorkspaceList`, como
  ya hace hoy ese test (el constructor lo comprueba); al dejar de estar needs-you vuelve la línea en el mismo render
  (assumed).
- Q: ¿Todos? → A: W82 se enmienda aquí: en «Todos» la tarjeta va pegada bajo el botón de la tarjeta, fuera de él, y
  el botón no repite la línea cortada; su prueba sigue en `overview.test.ts` (assumed).
- Q: ¿Contraste de qué? → A: texto de la pregunta y etiquetas activas sobre `--ask-bg`; los números (`aria-hidden`),
  el borde y lo desactivado quedan fuera. El tinte es un token `--ask-bg` por tema y paleta (los cuatro: original
  claro y oscuro, Grafito claro y oscuro), sin `color-mix`, para que el test lea lo mismo que se pinta (assumed).
- Q: ¿Libretto con qué repo? → A: «Ver en Libretto» guarda ese repo como el elegido (W104) y cambia de pantalla; la
  cuenta es `flow.others.length` (assumed).
- Q: ¿Línea o botón? → A: texto «{n} cambios más en este repo» y un botón «Ver en Libretto» (assumed). El plegado
  `flow-others` guardado se ignora (assumed).

### Gestionar la cola (queue-manage, 10 nov 2026)

- Solo ideas en cola, no empezadas (assumed, 11 nov).
- Pasar a Jira = crear y borrar la idea; Jira manda (assumed, 11 nov).
- Commits con pathspec, como W101 (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| guardar la clave de Jira en el proposal y dejar la idea | `/libretto-queue`: con clave, el tracker es la fuente; dos copias se desvían |
| borrar sin confirmar | perder una idea por un clic |
| abrir el `proposal.md` en el editor | la idea es solo su petición; editar el archivo entero invita a romper la plantilla |

#### Decision log, answers as given (2026-11-10)
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

### Cabecera tranquila (quiet-header, 11 nov 2026)

- Coste oculto, cálculo conservado (assumed, 11 nov).
- Foco también como botón de icono en la cabecera (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| un ajuste «enseñar coste» | Pau dijo que no le interesa; un ajuste para nadie es código para nadie |
| borrar también el cálculo | más diff y W95 lo guarda; se borra si nadie lo echa de menos |

#### Decision log, answers as given (2026-11-11)
- Q: ¿Cómo queda la cabecera? → A: la del boceto 10: arriba pequeño «{repo} · {agente}»; debajo la rama y, a su lado,
  el estado como texto con su icono (el mismo de la fila, sin pastilla); a la derecha, juntos y centrados, «Uno |
  Todos» y un botón redondo solo con icono «Modo foco» (título «Modo foco (⌘⇧F)») que hace lo mismo que el menú (assumed).
- Q: ¿Coste? → A: fuera de la vista en todas partes: fila (título), tarjeta de «Todos», panel de Libretto y
  «Terminados». El cálculo de main (W93) y el total en el historial (W95) se quedan: no se ven y no cuestan una
  llamada (assumed). Ceiling: si nadie lo pide en un mes, borrar W93 y `cost.ts`.

- Q: ¿Qué estado y de dónde? → A: el mismo texto e icono que la fila de la lista (`LABEL[state]` de
  `WorkspaceList`), solo en «Uno». En «Todos» la cabecera dice «Todos los agentes» y no hay estado único (assumed).
- Q: ¿El botón en «Todos»? → A: no sale; en «Uno» sale siempre, y sin trabajo elegido está desactivado como el menú
  (assumed).
- Q: ¿Nombre al estar en foco? → A: siempre «Modo foco», con `aria-pressed` verdadero mientras está activo (assumed).
- Q: ¿Tests de coste? → A: los casos se renombran a lo que prueban ahora y el `Proof:` los nombra; cada vista se
  prueba aparte, buscando que no haya «$», «≈» ni «tokens» (assumed). `cost.ts` del renderer se borra si nada fuera de
  sus tests lo usa (assumed).
- Q: ¿El historial dice «Coste: la forma corta de W94»? → A: queda superado por W96 enmendado; el total sigue en el
  archivo (W95) sin enseñarse (assumed).

### Pantalla de QA (qa-screen, 11 nov 2026)

- QA como pantalla propia (Pau, 11 nov).
- Informe por criterio, la A de `bocetos/qa-propuestas.html` (Pau, 11 nov).
- El agente de QA escribe `report.json`; main lo valida (assumed, 11 nov).
- Bug a Jira o al agente, siempre al pulsar (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| parsear lo que dice el agente en su terminal | frágil; un archivo con forma es comprobable |
| un test runner propio (Playwright tests generados) | otro motor; el agente de QA ya maneja el navegador |

#### Decision log, answers as given (2026-11-11)
- Q: ¿Dónde? → A: una pantalla «QA» en la barra, entre Libretto y Avisos (y en ⌘K); arriba, tarjetas de los trabajos
  vivos con lo que detectó W83 («App web», «Android», «sin detectar»); el panel de Libretto deja de tener la sección
  QA (assumed).
- Q: ¿De dónde salen los criterios? → A: del `## Verification criteria` del cambio en curso del trabajo (sus ids y
  su texto, como F36 encuentra el cambio) (assumed).
- Q: ¿De dónde salen los resultados? → A: el prompt del agente de QA (W84) le pide, además, escribir
  `$ATRIL_HOME/qa/<id>/report.json` al terminar cada criterio: `{ "criteria": [{ "id", "status":
  "pass"|"fail"|"untested", "note", "steps": [{ "text", "ms"?, "shot"? }] }] }`, `shot` el nombre de una captura de
  su carpeta. Main lo lee cada 3 s mientras la pantalla está abierta, como F33 (assumed).
- Q: ¿Fiarse del archivo? → A: es texto de un modelo: main lo valida (ids que existen en el cambio, estados de la
  lista, textos cortados a 400, 30 pasos como mucho, `shot` solo nombres de su carpeta sin `/` ni `..`); lo que no
  valga se ignora, nunca se ejecuta ni se pinta como HTML (assumed).
- Q: ¿«Ver cómo»? → A: un modal con los pasos del criterio (texto y duración), sus capturas en una tira y la elegida
  en grande; el paso que falló marcado (assumed).
- Q: ¿«Probar este» y «Reprobar todo»? → A: si el panel de QA está vivo, Atril escribe en él «Prueba solo el criterio
  {id}: {texto}. Actualiza report.json.» (o «Prueba otra vez todos los criterios…»); si no, lanza QA (W84) con esa
  petición al final del prompt. El criterio pasa a «Probando…» hasta que el informe lo cambie (assumed).
- Q: ¿«Marcar como bug»? → A: un formulario ya relleno (título «QA {rama}: {nota}», los pasos, el entorno: tipo,
  rama y commit, y el criterio) con «Crear en Jira» (como W108, al proyecto del tablero de Ajustes; sale si Jira está
  guardado con tablero) y «Pasar al agente del trabajo» (escribe el bug en el panel del agente del trabajo, W75-like);
  lo editas antes de mandarlo (assumed).

- Q: ¿Qué es un criterio? → A: cada línea bajo `## Verification criteria` que empieza por un id en negrita
  (`- **W12**`); id y texto hasta su `Proof:`. Sin cambio, sin esa sección o sin ids: «Este trabajo no tiene criterios
  que probar» (assumed).
- Q: ¿Ids repetidos o ausentes en el informe? → A: gana la última entrada; un criterio que no está, «Sin probar»
  (assumed).
- Q: ¿Las capturas sin criterio? → A: siguen visibles: «Todas las capturas», las 12 más nuevas, cada una de 2 MB como
  mucho, como data URLs (los límites del F33 de hoy) (assumed).
- Q: ¿Cuándo termina «Probando…»? → A: lo lleva el renderer; termina cuando el informe trae una entrada de ese id
  escrita después de la petición (aunque repita el estado), cuando el panel de QA muere, o a los 5 min (vuelve al
  estado anterior) (assumed).
- Q: ¿Escribir en un panel que está trabajando? → A: Claude Code encola lo que se escribe mientras trabaja; se escribe
  igual (assumed).
- Q: ¿Si W84 se niega al lanzar? → A: el error sale bajo el botón y nadie pasa a «Probando…» (assumed).
- Q: ¿Varias líneas al agente? → A: se pegan con `tmux load-buffer` + `paste-buffer -p` (pegado entre corchetes: los
  saltos no envían) y luego Enter (assumed).
- Q: ¿Jira? → A: se saca de `ideaToJira` una función `createIssue(creds, board, summary, description)`; `ideaToJira`
  la usa y luego quita la idea (W108 igual); QA solo crea (assumed).
- Q: ¿El prompt? → A: `qaPrompt` añade la ruta de `report.json`, su forma, la lista de criterios (id y texto) y que lo
  reescriba entero tras cada criterio (assumed).

### QA: dónde se prueba (qa-targets, 11 nov 2026)

- (11 nov, Pau) Motores: iOS `xcrun mcpbridge` + mobile-mcp para tocar; Android mobile-mcp con el emulador de la persona; Chrome con Playwright; Safari con Playwright WebKit (assumed).
- (11 nov, Pau) Un dispositivo por trabajo, reservado mientras su QA vive; la reserva caduca sola cuando su pane ya no está.
- (11 nov, Pau) Errores: qué pasó, qué no puedes hacer, un botón con el arreglo; detalle plegado.
- (11 nov) Los arreglos son nombres fijos que main traduce en una acción; la ventana nunca manda un comando ni una URL (como W21).
- (11 nov) `.atril/qa.json` manda sobre lo detectado; «Elegir a mano» se suma como una pestaña más.

#### Decision log, answers as given (2026-11-11)
- Q: ¿Motor por plataforma? → A: iOS con el MCP oficial de Apple `xcrun mcpbridge` (Xcode 26.3+), simctl o mobile-mcp si hace falta tocar; Android con el emulador del SDK de la persona por `emulator`/`adb`, vía mobile-mcp; web Chrome con Playwright y Safari con WebKit.
- Q: ¿Detección? → A: dice por qué; varias plataformas como pestañas recordadas por repo; monorepos a 2 niveles; «Elegir a mano» guardado por repo y opcional `.atril/qa.json`; «No sé cómo abrir este proyecto» si no hay nada.
- Q: ¿Errores? → A: ninguno suelto: qué pasó, qué no puedes hacer y un botón que lo arregla; lo técnico en «Ver detalle» (`bocetos/errores.html`).
- Q: ¿Varias QA a la vez? → A: un simulador o emulador por trabajo, reservado hasta que se libera, como Simlock.
- Q: ¿Safari con qué MCP? → A: Playwright MCP con `--browser webkit`, el motor de Safari; no hay un MCP oficial de Safari que se pueda instalar sin firmar nada (assumed: si aparece uno oficial, cambia solo `mcpConfig`).
- Q: ¿Un proyecto RN/Expo/Flutter cuántas pestañas da? → A: Android e iOS, una por plataforma que tenga carpeta (`android/`, `ios/`) o, en Expo, ambas (assumed).
- Q: ¿Qué emulador reserva? → A: el primero de la lista de la persona que no tenga otro trabajo con su QA vivo; nunca crea uno sin que lo pida (assumed).

### Errores claros (plain-errors, 11 nov 2026)

- Un error de lectura que el usuario no puede leer como frase es un error suelto (regla de Pau, 11 nov, `bocetos/errores.html`): qué pasó, qué no puedes hacer, un botón, y el código plegado en «Ver detalle». Aquí se aplica al pie, al doctor y a Ajustes.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| La caja `Problem` en el pie | ocupa cuatro líneas en una barra de una; tapa la terminal |
| Mapear el error en la ventana a partir de la frase | la frase ya viene traducida; main sabe la causa |

#### Decision log, answers as given (2026-11-11)
- Q: (revisión del trabajo) `boxes.test.ts` cambió fuera del contrato → A: sí, a propósito: buscaba la lista de casillas sin esperarla y falló 1 de cada 2 veces en la suite; ahora la espera con `findByRole`, misma comprobación (assumed).
- Q: (revisión en frío) ¿Y un 401 después de una lectura buena? → A: W37 manda: se quedan los últimos valores con su antigüedad (assumed).
- Q: (revisión en frío) ¿Qué errores de Jira son «no responde»? → A: solo los que lanza `fetch`; los estados HTTP y la dirección mal escrita conservan su frase; el tiempo agotado dice «Jira no ha respondido en 10 s.» (assumed).
- Q: ¿Cómo se ve un error en el pie, que es una sola línea? → A: la frase y un botón en la misma línea, y «Ver detalle» plegado al lado; sin la caja grande de `Problem` (assumed: si Pau quiere la caja, cabe encima del pie).
- Q: ¿Qué arregla un fallo del llavero o del token? → A: «Abrir Claude Code», que abre Terminal con `claude` (la persona inicia sesión ahí); el resto, «Volver a comprobar» (assumed).
- Q: ¿Cuánto espera el doctor? → A: 5 s por herramienta, como proponía el hallazgo 2 (assumed).

### PATH del shell (login-path, 11 nov 2026)

- Una app de Mac abierta desde el Finder no tiene el PATH del shell (ya decidido para el hook, que usa el Electron de Atril como Node): Atril lo pide al shell de login al arrancar, una vez, antes de comprobar herramientas.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Solo carpetas fijas | quien instala con asdf, nvm o en otra carpeta se queda fuera |
| El paquete `fix-path`/`shell-env` | una dependencia para diez líneas |

#### Decision log, answers as given (2026-11-11)
- Q: ¿Por qué falta `claude` si está instalado? → A: (comprobado) está en `~/.local/bin`; una app abierta desde el Dock o el Finder hereda `/usr/bin:/bin:/usr/sbin:/sbin` y Atril nunca lo amplía.
- Q: ¿De dónde sale el PATH bueno? → A: del shell de login e interactivo de la persona (`$SHELL -ilc`), que lee `.zprofile` y `.zshrc`, con 3 s de tope; detrás, `~/.local/bin`, `/opt/homebrew/bin` y `/usr/local/bin` por si el shell no contesta (assumed).

### Copia con cambios (dirty-copy, 11 nov 2026)

- Un rechazo al abrir un trabajo trae su arreglo cuando existe uno que no toca lo de la persona: aquí, un worktree para esta vez.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Hacer stash por la persona | toca sus cambios sin preguntar |
| Cambiar el modo del repo a worktree | decide por ella para siempre; el repo trabaja en su copia por algo (p. ej. un .env sin versionar) |

#### Decision log, answers as given (2026-11-11)
- Q: ¿Qué arreglo ofrece una copia sucia en un repo in-place? → A: «Usar un worktree esta vez»: abre el trabajo en una carpeta aparte y tu copia, con sus cambios, no se toca; el modo del repo no cambia (assumed).
- Q: ¿Y el segundo trabajo en un repo in-place (W7)? → A: el mismo botón (assumed).
- Q: ¿Qué va en «Ver detalle»? → A: las líneas de `git status --porcelain` (hasta 20) y por qué el repo trabaja en tu copia (assumed).

### Abrir y cerrar sin errores crudos (ws-errors, 11 nov 2026)

- Un fallo de git o tmux nunca sale crudo en la frase: frase por paso, salida plegada y «Abrir en Terminal» en esa carpeta.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Mandar la ruta desde la ventana | la ventana no es de fiar; main ya sabe la ruta por id |
| `confirm()` nativo | un diálogo del sistema para una fila; la pregunta en la fila no tapa nada |

#### Decision log, answers as given (2026-11-11)
- Q: (constructor) ¿Cómo llega «Usar un worktree esta vez» desde «Empezar» de Jira? → A: `StartRequest.worktree`, que `jira/start.ts` pasa solo si es `true`; sin test propio del diálogo de Jira (assumed).
- Q: (constructor) `Problem` sin arreglo → A: `fix`/`onFix` opcionales y «Ver detalle» solo con detalle; «No hay ningún repo» no trae botón (assumed).
- Q: (revisión en frío) ¿Y si git falla después de parar al agente? → A: el registro se queda y la frase dice que el agente ya está parado; no se reordena (assumed: `git worktree remove` sobre una carpeta con el agente vivo sería peor).
- Q: (revisión en frío) ¿Un `git status` que falla ofrece olvidar? → A: solo si la carpeta no existe; si existe, «Abrir en Terminal» (assumed).
- Q: (romper la app, hallazgo 1) ¿Olvidar deja la rama bloqueada por el worktree? → A: `git worktree prune` en el repo, que solo borra entradas cuya carpeta ya no está (assumed).
- Q: ¿Qué botón arregla un fallo de git al abrir o cerrar? → A: «Abrir en Terminal», que abre Terminal en la carpeta con `git status`; la ventana manda el id del repo o del trabajo, nunca una ruta (assumed).
- Q: ¿Y si la carpeta del trabajo ya no es un repo o no existe? → A: «Quitar de la lista igualmente»: cierra su sesión de tmux, borra el registro y sus archivos, no ejecuta git y no escribe historial (assumed).
- Q: ¿Cuándo se confirma «Quitar»? → A: solo con la sesión viva, en la propia fila; un trabajo parado se quita a la primera (assumed).

### Modelo y esfuerzo (model-pick, 11 nov 2026)

- Atril sugiere modelo y esfuerzo con reglas fijas y su porqué; nunca los cambia por la persona.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Preguntar a Claude qué modelo usar | gasta cuota en cada trabajo, y la regla es nada de llamadas automáticas |
| Aplicar la sugerencia sola | decide por la persona; el artículo dice medir antes de cambiar |

#### Decision log, answers as given (2026-11-11)
- Q: (constructor) `suggest.ts`, `SuggestLine.tsx` y los diálogos viven bajo el `Governs:` de work-inbox → A: los criterios se quedan en workspaces, que ya gobierna el modelo y el comando (W34); la línea compartida es una pieza de la ventana (assumed).
- Q: (constructor) ¿Cómo se ve la sugerencia? → A: «Sugerido: Sonnet · Medio. {porqué} [Usar]», en una línea gris (assumed).
- Q: (revisión en frío) ¿Qué texto mira la sugerencia en «Empezar»? → A: el resumen y el tipo de Jira (assumed).
- Q: (revisión en frío) ¿Un esfuerzo raro por IPC? → A: se rechaza en main como un modelo raro (assumed).
- Q: ¿La sugerencia se aplica sola? → A: no: sale debajo del modelo con su porqué y un botón «Usar»; la persona decide (assumed, como la nota de MR de 540: la persona decide).
- Q: ¿De qué sale la sugerencia? → A: de reglas fijas sobre el texto y el tipo de Jira, sin llamar a Claude (CLAUDE.md: nada de llamadas automáticas) (assumed).
- Q: ¿Qué niveles de esfuerzo? → A: Por defecto, bajo, medio, alto y muy alto (`xhigh`); `max` se queda fuera del selector (assumed: es caro y el artículo no lo recomienda para empezar).

### Volver a abrir (reopen-work, 11 nov 2026)

- Un trabajo parado se retoma con `claude --continue` en su carpeta; más esfuerzo es un nivel más, nunca otro modelo.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| `claude --resume <id>` con el id de sesión guardado | Atril no guarda el id de la conversación; `--continue` toma la última de esa carpeta, que es la del trabajo |
| Abrir un trabajo nuevo en la misma rama | pierde la conversación y choca con la rama que ya existe |

#### Decision log, answers as given (2026-11-11)
- Q: (prueba en la app real) al matar tmux, `term:resize` llega a un cliente muerto, node-pty lanza EBADF y Electron bloquea la app con «A JavaScript error occurred in the main process» → A: se arregla aquí (W149): el cliente muerto se olvida y nada de la terminal lanza.
- Q: (revisión en frío) ¿Y el modo auto? → A: su marca `auto/<sesión>` sobrevive a la sesión muerta (solo `dropFiles` la borra): reabrir no la toca.
- Q: (revisión en frío) ¿Y los trabajos abiertos con un `argv` a medida? → A: `input.argv` solo lo usan los tests; todo trabajo real sale de `agentArgv`, y reabrir usa `agentArgv`.
- Q: (revisión en frío) ¿`--continue` sin conversación? → A: solo se pone si Atril tiene apuntado un transcript del trabajo (`transcripts/<sesión>`); si no, arranca de cero (assumed).
- Q: (revisión en frío) ¿Sesión viva con el agente muerto (W16)? → A: también se reabre: primero se cierra esa sesión (assumed).
- Q: (revisión en frío) orden con `model-pick` → A: esta rama sale de `model-pick` aterrizado; `--continue` va tras `--plugin-dir`, antes de `--model` y `--effort`.
- Q: ¿Cómo se relanza? → A: una sesión de tmux nueva con el mismo id, en la misma carpeta, con `claude --continue` (la última conversación de esa carpeta), el mismo modelo, esfuerzo y modo auto (assumed).
- Q: ¿Qué es «más esfuerzo»? → A: un nivel más que el guardado: por defecto o medio → alto, bajo → medio, alto → muy alto; con muy alto no se ofrece (assumed, del artículo).
- Q: ¿Se ofrece con el agente vivo? → A: no: reiniciar a un agente que trabaja corta lo que hace; solo con la sesión muerta (assumed).

### Archivos de estado dañados (state-files, 11 nov 2026)

- Un archivo de estado dañado bloquea los cambios de estado, no la app: se ve qué pasa y cómo llegar al archivo, y nada se sobrescribe.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Copia `.bak` automática y «Restaurar copia» | Atril no tiene hoy copias; inventarlas es otra función con sus propios fallos |
| Tratar el archivo dañado como vacío | es justo lo que pasa hoy: la siguiente escritura borra todos los trabajos |

#### Decision log, answers as given (2026-11-11)
- Q: (revisión en frío) ¿Quién lee los archivos? → A: un módulo nuevo `src/main/state.ts` con un lector estricto para los dos; `workspaces.ts` y `repos.ts` dejan sus lectores propios. Toda escritura de cualquiera de los dos archivos lee antes con él, así que ninguna escribe encima de uno dañado (assumed).
- Q: (revisión en frío) ¿Un archivo que existe pero no se puede leer (permisos, carpeta)? → A: cuenta como dañado, con su código en el detalle (assumed).
- Q: (revisión en frío) orden con `reopen-work` → A: esta rama sale de `reopen-work` aterrizado; `reopenWorkspace` pasa por el mismo lector.
- Q: ¿Qué arreglo se ofrece para un archivo dañado? → A: «Mostrar en Finder» (el archivo seleccionado); Atril no lo reescribe ni lo borra por su cuenta, y no inventa una copia que no tiene (assumed).
- Q: ¿Qué cuenta como «forma equivocada»? → A: `workspaces` o `repos` que no sea una lista, o una entrada sin `id`, `path` (y `branch`, `session` para trabajos) de texto (assumed).
- Q: ¿Y `ui.json` dañado (hallazgo 14)? → A: fuera: solo repite el tutorial, nada se pierde (assumed).

### Modelos de Libretto (libretto-models, 11 nov 2026)

- Atril fija el modelo de los subagentes de Libretto que solo leen y opinan; un modelo que trae Libretto manda. La copia en `resources/libretto/` es Libretto `171db90` más esas líneas `model:`; nada más difiere.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Editar `resources/libretto` a mano | el siguiente empaquetado lo borra |
| `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` al lanzar el agente | también movería subagentes que editan código |
| Haiku para todos los revisores | el artículo reserva Haiku para lo que se comprueba barato (buscar, leer logs); revisar es juicio |

#### Decision log, answers as given (2026-11-11)
- Q: (revisión en frío) ¿Qué es «ya tiene modelo»? → A: una línea del frontmatter que empieza por `model:`; un agente de la lista sin frontmatter (`---` al principio) se deja igual (assumed).
- Q: (revisión en frío) ¿Cómo se reescribe la copia actual? → A: aplicando `pinModels` a `resources/libretto/agents/*.md` tal como están, sin re-empaquetar desde el repo de Libretto: la versión copiada sigue siendo `171db90`.
- Q: (revisión en frío) ¿Y la spec que dice que la copia es `171db90`? → A: pasa a decir «`171db90` más las líneas `model:` de Atril».
- Q: ¿Dónde se fija el modelo de los subagentes de Libretto? → A: al empaquetar Libretto dentro de Atril (`scripts/bundle-libretto.mjs`), no en la copia a mano: la copia se regenera y perdería el cambio (assumed).
- Q: ¿Cuáles? → A: los que leen y opinan sin editar código — `converge-reader`, `review-lens-reliability`, `review-lens-security`, `spec-reviewer`, `work-reviewer` — pasan a `sonnet`; los que ya traen modelo de Libretto lo conservan (`review-lens-design: sonnet`, `review-lens-intent` y `review-lens-tests: haiku`); `spec-writer` escribe el contrato y se queda en el modelo de la sesión (assumed).

### Repos rotos (repo-gone, 11 nov 2026)

- Un repo roto se ve como roto y se arregla desde Ajustes; git roto se dice como tal, nunca como un nombre de rama malo.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Borrar el repo roto automáticamente | decide por la persona; puede ser un disco desconectado |
| Culpar al nombre salvo que git falte (127) | la nota de Xcode sale con código 1 y seguiría culpando al nombre |

#### Decision log, answers as given (2026-11-11)
- Q: (revisión en frío) ¿Qué va primero, el nombre de la rama o la salud del repo? → A: el nombre (W6), salvo que git esté roto (W156); después la salud, antes de cualquier git que escriba (assumed).
- Q: (revisión en frío) ¿Qué salud tiene un repo con git roto? → A: `ok`: solo «not a git repository» en el stderr da `not-git`; git roto se dice al usarlo (W156) (assumed).
- Q: (revisión en frío) ¿Dónde funcionan «Abrir Ajustes» e «Instalar herramientas de Xcode»? → A: en la fila del trabajo, los diálogos de nuevo trabajo y Empezar, la barra de reabrir y la barra lateral; `WorkFix` gana `'settings'` y `'git'` (assumed).
- Q: ¿Cómo se sabe que git está roto y no que el nombre es malo? → A: (comprobado) un nombre inválido sale con código 128 y «is not a valid branch name» en stderr; git ausente da 127 y la nota de Xcode, código 1 con «xcode-select». Solo el primero culpa al nombre (assumed).
- Q: ¿Qué botones tiene un repo roto en Ajustes? → A: «Buscar la carpeta…» (elige otra carpeta y la guarda con el mismo id si es un repo git) y «Quitar el repo» (lo borra de `repos.json`, nunca toca la carpeta; se niega si hay un trabajo abierto de ese repo) (assumed).
- Q: ¿«Quitar el repo» también para repos sanos? → A: sí, en todas las filas: hoy no hay forma de quitar un repo desde la app (assumed).
- Q: (al construir) ¿Y si `check-ref-format` falla sin «is not a valid branch name» ni git roto? → A: «git no ha podido comprobar el nombre {branch}.» con su salida plegada y «Abrir en Terminal»; nunca culpa al nombre (assumed).
- Q: (al construir) ¿`lstat` o `existsSync` para `missing`? → A: `existsSync`, que sigue enlaces: un enlace a una carpeta que ya no está cuenta como perdida (assumed).

### Terminal que no engancha (term-attach, 11 nov 2026)

- Ninguna nueva.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Abrir `tmux attach` en Terminal.app | otra ventana para algo que suele arreglarse reintentando; queda como idea |

#### Decision log, answers as given (2026-11-11)
- Q: (revisión en frío) ¿Qué contesta `attach` cuando no hay error? → A: `{ ok: true }` al enganchar y `{ ok: false }` para un trabajo desconocido o sin sesión (la vista de parado ya lo explica); nunca `undefined` (assumed).
- Q: (revisión en frío) ¿Y si llega un error tras cambiar de trabajo? → A: se descarta: el efecto guarda el id con el que llamó y solo pinta si sigue montado con ese id (assumed).
- Q: (revisión en frío) ¿Hay doble de xterm? → A: no: el test simula `@xterm/xterm` y `@xterm/addon-fit` con `vi.mock` (assumed).
- Q: ¿Qué arreglo ofrece? → A: «Volver a intentar», que engancha otra vez; el agente sigue en tmux y la frase lo dice (assumed).
- Q: ¿El mensaje de node-pty va al detalle? → A: sí: es un texto de node-pty sobre el proceso (`posix_spawnp failed`), sin datos de la persona (assumed).

### Grafito: te necesita (grafito-you, 11 nov 2026)

- En Grafito el acento es para lo que pide a la persona; lo que solo trabaja va en gris.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Un ámbar para «te necesita» en Grafito | segundo acento; W72 lo prohíbe y Pau quiere uno |

#### Decision log, answers as given (2026-11-11)
- Q: (revisión del trabajo) `--run` también pinta el punto de aviso sin leer, la selección del buscador, el paso actual y «conectado» → A: `--run` sigue azul; un token nuevo `--working` solo para la etiqueta «trabajando» (gris en Grafito, igual que antes en Original).
- Q: ¿Qué color cambia? → A: «trabajando» pasa al gris de los textos secundarios (`--sub`) y el único acento azul queda para «te necesita»: gris más un acento, como pidió Pau (assumed).

### Radar de choques (radar, 11 nov 2026)

- Atril avisa de choques entre trabajos del mismo repo por archivo; no decide nada ni toca ramas.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Comparar diffs línea a línea | más caro; el archivo ya avisa a tiempo |
| Avisar solo al abrir la MR | llega tarde: el choque ya está hecho |

#### Decision log, answers as given (2026-11-11)
- Q: (revisión en frío) ¿Qué base? → A: la `baseCommit` del registro de cada trabajo, también en los que trabajan en tu copia (assumed).
- Q: (revisión en frío) ¿Qué trabajos entran? → A: todo registro que no sea de revisión, vivo o parado, como afectado y como «con quién» (assumed).
- Q: (revisión en frío) ¿Y pasado el tope de vigilantes? → A: el tope sube a 12 (F48 enmendado); más allá, el más antiguo se cierra y ese trabajo recalcula: riesgo aceptado. Radar y panel comparten el vigilante de cada carpeta (assumed).
- Q: ¿Qué cuenta como choque? → A: dos trabajos abiertos del mismo repo (ninguno de revisión) que cambian el mismo archivo respecto a su base, con commits o sin ellos (assumed).
- Q: ¿Dónde se ve? → A: en la fila de cada trabajo afectado, una línea gris «Choca con {rama} en {archivo}» (y «y N más»), con la lista entera al pasar el ratón; sin color nuevo: gris más un acento (assumed).
- Q: ¿Cuánto cuesta? → A: la lista de archivos de cada trabajo pasa por el vigilante de `quiet-panel`: sin cambios, cero procesos; el tope de vigilantes sube de 4 a 12 para que el radar y el panel no se expulsen (assumed).

- Q: (al construir) ¿Cómo se separan los «{rama}: {archivo}» del título? → A: uno por línea (`\n`) (assumed).
- Q: (al construir) ¿Quién pregunta cada 10 s? → A: la lista de trabajos de la barra lateral, mientras está montada (assumed).
- Q: (al construir) El test de tope con 13 vigilantes tarda ~50 s en este Mac (cada proceso es caro) → A: su límite pasa de 60 s a 120 s; los del radar, a 90 s (assumed).

### Lecciones para cada agente (lessons-first, 11 nov 2026)

- Atril recuerda a cada agente las lecciones del repo con una frase fija; el contenido lo lee el agente.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Pegar el contenido en el prompt | se queda viejo y engorda el contexto; el agente puede leerlo |
| Ponerlo en el `CLAUDE.md` del repo | escribe en el repo de la persona |

#### Decision log, answers as given (2026-11-11)
- Q: (revisión en frío) ¿Y el comando que enseña «Empezar»? → A: mira el archivo en la carpeta del repo elegido (el worktree sale de ella); sin repo elegido, no lo lleva. El que se lanza mira la carpeta del trabajo (assumed).
- Q: (revisión en frío) ¿QA y el `argv` a medida? → A: el agente de QA no lo lleva; el `argv` a medida es solo de tests (assumed).
- Q: (revisión en frío) ¿Enlaces? → A: ni `.agents` ni `lessons.md` pueden ser enlaces (`lstat` de los dos) (assumed).
- Q: ¿Cómo llegan las lecciones al agente? → A: Atril añade al arrancar `--append-system-prompt` con una frase fija que le pide leer `.agents/lessons.md` antes de empezar; no copia el contenido (el agente lo lee del repo, siempre al día) (assumed).
- Q: ¿Siempre? → A: solo si `.agents/lessons.md` es un archivo normal dentro de la carpeta del trabajo (no un enlace); si no, nada cambia (assumed).

### Dónde se atasca (stuck, 11 nov 2026)

- Los tiempos por tramo salen de git al cerrar el trabajo; Atril no vigila tiempos mientras trabajas.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Vigilar el paso en vivo | el vigilante solo mira el trabajo elegido; los demás se perderían |
| Tiempos de la forja (MR) | otra llamada de red y otra fuente; queda para después |

#### Decision log, answers as given (2026-11-11)
- Q: (revisión en frío) ¿Cuándo es «cerrar»? → A: el momento en que `historyEntry` corre, justo antes de quitar el trabajo (assumed).
- Q: (revisión en frío) ¿Qué es «marcar una casilla»? → A: un commit en el que sube el número de casillas cerradas que da `parseBoxes` (`src/main/flow/checklist.ts`) respecto al commit anterior del documento (assumed).
- Q: (revisión en frío) ¿Qué commits? → A: los de la rama, `git log <baseCommit>..HEAD -- <proposal.md>`, del más antiguo al más nuevo; un commit donde el archivo ya no existe (aterrizado) se salta (assumed).
- Q: (revisión en frío) ¿Mediana y empates? → A: de los 20 más recientes, los que tengan ese tramo; con número par, la media de los dos centrales; empate: el primero en orden Spec, Plan, Construir, Cierre; menos de un minuto se escribe «<1 min». El titular va dentro de Terminados, visible al desplegarlo (assumed).
- Q: ¿De dónde salen los tiempos? → A: de git, una vez, al cerrar el trabajo: los commits del documento del cambio (`.agents/changes/<cambio>/proposal.md`) marcan cuándo se escribió la spec, cuándo apareció el checklist y cuándo se marcó la última casilla; el principio es la creación del trabajo y el final, su cierre (assumed).
- Q: ¿Qué tramos? → A: Spec (de abrir a la spec escrita), Plan (hasta el checklist), Construir (hasta la última casilla), Cierre (hasta cerrar el trabajo: revisar, MR, aterrizar) (assumed).
- Q: (al construir) ¿Contra qué cuenta el primer commit de la rama si sube casillas? → A: contra 0; el documento en `baseCommit` no cuenta (assumed).
- Q: (al construir) ¿Y si no sale ningún tramo? → A: la línea no lleva `steps` (assumed).
- Q: (al construir) ¿Cómo se redondea {d}? → A: hacia abajo, en una sola unidad (105 min → «1 h»); «Cierre» en inglés es «Wrap-up» (assumed).
- Q: ¿Dónde se ve? → A: en Terminados: los tramos de cada trabajo en su fila y, arriba, el tramo con la mediana más alta de los últimos 20 (assumed).

### QA en la MR (qa-to-mr, 11 nov 2026)

- La QA llega a la MR como un comentario que la persona publica; nunca sola.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Ponerlo en la descripción de la MR | la escribe el agente al crearla; reescribirla pisa lo suyo |
| Subir capturas | GitHub no tiene API para imágenes en comentarios; GitLab sí: queda para después |

#### Decision log, answers as given (2026-11-11)
- Q: (revisión en frío) ¿Qué MR, exactamente? → A: una de «Mías» (la persona es la autora, así se puede comentar) cuya rama es la del trabajo y cuyo proyecto resuelve al repo del trabajo con la misma búsqueda que `openmr`; con varias, la actualizada más tarde; sin ninguna, no hay botón (assumed).
- Q: (revisión en frío) ¿Y si nunca se abrió la pantalla MR? → A: main pide la lista de MRs él mismo, reutilizando la última si tiene menos de 60 s (assumed).
- Q: (revisión en frío) ¿Idioma y criterios sin pasos? → A: el comentario va en el idioma de la app; un criterio que falla lleva su nota, o si no su último paso, como cita (`> `); sin objetivo, la primera línea no lo nombra (assumed).
- Q: (construcción) ¿Cómo lleva el fallo del comentario W150 completo? → A: `threads.reply` devuelve también `detail` y `fix` cuando la forja falla (`MrReply` los admite); `threads.test.ts` exige ahora los tres; y `openmr.ts` exporta `remoteNaming` para que la QA resuelva el repo igual que «Seguir en Atril» (assumed).
- Q: (construcción) ¿Formato del comentario? → A: cada línea es su propio párrafo (líneas separadas por una en blanco) para que la cita `> ` no se trague la siguiente; el texto del criterio sin su id; el objetivo como su pestaña («Chrome», «Android · app») (assumed).
- Q: ¿Cuándo llega a la MR? → A: solo cuando la persona pulsa «Publicar en la MR» en la pantalla QA; Atril no crea la MR (la abre el agente) ni publica solo (assumed).
- Q: ¿Qué se publica? → A: un comentario general con el objetivo probado y una línea por criterio — Pasa, Falla o Sin probar — y, en los que fallan, su último paso; las capturas no (GitHub no tiene API para subir imágenes a un comentario): el comentario dice que están en Atril (assumed).
- Q: ¿Cómo sabe Atril cuál es la MR? → A: la MR abierta de la lista de MRs cuya rama y repo coinciden con los del trabajo (assumed).

### Notificaciones (main) (notify-core, 12 nov 2026)

- See `proposal.md` → Prior decisions; all of them apply here.

### Terminal de solo lectura (terminal-read-only, 14 nov 2026)

- **Terminal de solo lectura** (Pau, 12 nov): ninguna entrada de la persona pasa por el xterm.
- **Libretto no cambia** (assumed): Atril se adapta a cómo pregunta Libretto, nunca al revés.
- **`kind` en el estado** (assumed): amplía, no sustituye, el prefijo del texto de `notify-core`.
- **Teclas por tmux como transporte** (assumed). Techo: depende del dibujo de la TUI de Claude Code; el Agent SDK lo sustituye.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Agent SDK ya | reescribe tmux, pausa, reabrir y respuestas; Pau eligió paso a paso |
| Dejar la terminal escribible con un aviso | Pau: «deberían ser solo lectura» |
| Hook `PermissionRequest` que decide él | bloquea el gancho esperando a Atril; las teclas ya funcionan y el SDK lo resolverá con datos |

#### Decision log, answers as given (2026-11-14)
- Q: ¿Cómo se hace la terminal de solo lectura? → A: «Paso a paso (Recommended)»: ya, con los ganchos que hay; el Agent SDK como cambio aparte después.
- Q: ¿Se toca Libretto? → A: no; Libretto sigue preguntando con `AskUserQuestion` y terminando turnos con texto; Atril solo cambia quién contesta (assumed, «te dejo a tu elección»).
- Q: ¿Cómo se sabe qué espera el agente? → A: un campo nuevo `kind` en el estado (`question`, `permission`, `turn-end`, `idle`), además del texto; sustituye a «pregunta frente a fin de turno por prefijo» de `notify-core` sin romperlo: el texto sigue con su prefijo (assumed). Si es incorrecto: se deduce del prefijo y de `notification_type` en main.
- Q: ¿Cómo contesta Atril? → A: como hoy, con teclas al panel por tmux (`sendKey`, `pressKey`, `pasteText`); la persona nunca teclea en la terminal (assumed). El Agent SDK lo cambiará por datos.
- Q: ¿Permitir un permiso cómo? → A: «Permitir» manda `1` (Sí, una vez), «Denegar» manda Escape; «Permitir siempre» queda fuera (assumed: cambia ajustes del proyecto sin que la persona lo vea).
- Q: ¿Varias preguntas en un `AskUserQuestion`? → A: la tarjeta las enseña de una en una, en el orden de Claude Code; contestar una pasa a la siguiente (assumed; se comprueba en la app real con Claude de verdad).
- Q: ¿Selección múltiple? → A: fuera de este cambio: la tarjeta enseña la pregunta y las opciones y dice «Contesta por escrito abajo» (assumed). Techo: con el SDK llega como dato.
- Q: ¿Y en modo Automático? → A: «cuando es modo automático… no tiene que salir nada, o sea, tiene que seguir hacia adelante la gente, con sus decisiones y todo» (Pau, 12 nov). Atril contesta él mismo: la opción recomendada en una pregunta, «Sigue con el plan; no hagas nada que no esté en él.» en un fin de turno; solo se para en lo que ya acordamos que pregunta (push y MR, W59) y en un fallo de verdad (una puerta que falla dos veces, una herramienta que falta) (assumed para las dos excepciones; si Pau quiere también el push sin preguntar, cambia W59).
- Q: ¿Un permiso en Automático se concede solo? → A: no; el modo automático de permisos de Claude Code ya decide casi todo, y lo que aun así pregunte sale como tarjeta: conceder a ciegas lo que el propio Claude Code no se atreve es un riesgo de seguridad (assumed).
- Q: ¿Qué manda «Sigue»? → A: nunca un «sí» suelto: en el dogfood, «Sí, sigue» se tomó como aprobación de lo último que Claude había ofrecido (publicar un comentario en la PR #11). Manda «Sigue con el plan; no hagas nada que no esté en él.» (assumed).
- Q: ¿Queda alguna forma de escribir en la terminal? → A: no dentro de Atril; «Abrir en Terminal» (ya existe) sigue para quien quiera la TUI cruda (assumed).

- Q: ¿W74–W76 se amplían o se sustituyen? → A: se sustituyen, marcados `(amended)`: W74 guarda todas las preguntas sin recortar, W75 cambia sus formas de respuesta (sin «Sí, sigue»), W76 pasa a la tarjeta por tipo (assumed).
- Q: ¿En Automático se suprime también el aviso en Avisos? → A: sí, en lo que Atril contesta solo no hay aviso de ningún tipo; V3 y W15 se enmiendan (assumed).
- Q: ¿Y los paneles de shell de ⌘D? → A: también de solo lectura; ⌘D/⌘⇧D dejan de hacer nada y «Abrir en Terminal» da la shell escribible (assumed).
- Q: ¿⌘↩? → A: envía el compositor solo cuando tiene el foco; en lo demás manda N2/W79 (assumed).
- Q: ¿El recordatorio de inactividad cambia el `kind`? → A: no; pone `idle: true` y conserva el resto (W195 enmendado) (assumed).
- Q: ¿Cuándo se reinicia el tope de 3 de Automático? → A: tras 30 s seguidos trabajando, no con el instante que sigue a nuestro propio «Sigue» (lo vimos en la prueba) (assumed).
- Q: ¿La parada del push en Automático sale del texto o del permiso de W59? → A: del permiso de W59 (W207); no se lee el texto (assumed).
- Q: ¿Selección múltiple en Automático? → A: se para como en Manual (assumed).
- Q: ¿Quién lleva qué pregunta toca? → A: main, por sesión, desde 0 en cada entrada en needs-you; tras la última, Enter para enviar (assumed; se comprueba con Claude real).
- Q: ¿Tareas de shell en segundo plano? → A: fuera; solo subagentes, que el gancho ya registra. Techo: con el Agent SDK llega como dato (assumed).
- Q: ¿De dónde sale la herramienta de un permiso? → A: del último PreToolUse de esa sesión, que el gancho recuerda (assumed).
- Q: ¿W45 sigue avisando a Claude? → A: no; el gancho reclama el umbral sin decirle nada y F25 lleva los botones; «Dejarla así» se guarda en `ui.json` `bigDismissed[workspaceId] = k` y sobrevive al reinicio (assumed).

- Box 1 toca fuera de «In»: `src/main/menu.ts` (fuera «Dividir a la derecha/abajo», ⌘D/⌘⇧D, W196) y los tests que montaban el menú con `split` (`src/main/i18n.test.ts` cambia la etiqueta de ejemplo a «Pausar»; `src/renderer/flow/boxes.test.ts` comprueba que ⌘D/⌘⇧D ya no existen; `tutorial`, `pause`, `focus` y `overview` solo pierden `split`); `src/renderer/tour/Tour.tsx` (el paso de la terminal decía «escribe en él» y ⌘D); `src/main/pty.test.ts` pierde las llamadas a `input`, que ya no existe. `splitPane` sigue en `tmux.ts`: sus tests prueban otros criterios (W163, el destino exacto) (assumed).
- Box 2: «an asked question keeps its options» (la prueba vieja de W74) se sustituye por la que nombra W74 enmendado. El gancho ya no escribe `options`/`multiSelect`; main los sigue leyendo en estados viejos (Constraints). W198 «recordar por sesión» vive en una opción de la sesión de tmux (`@atril-tool`), leída y escrita en la misma llamada `display` que el gancho ya hacía: guardarla en disco rompía la prueba de A1 («hook appends a short summary, never the payload»: ningún archivo bajo `ATRIL_HOME` con el comando). Así un comando solo llega a disco cuando un permiso espera por él, como pide W198 (assumed).
- Box 3: «a quick answer reaches its own pane» (src/main/reply.test.ts, la prueba vieja de W75) se quita: W75 enmendado cita las dos de `status.test.ts`, que cubren sus cláusulas (pantalla propia, opción fuera de rango, estado que ya no espera, formas raras, trabajo que ya no está). N3 («a number answers the option with its key») ahora espera el Enter final de W75 tras la última pregunta. `QuickReplies.tsx` y su test pasan a `{ option, question }` y «Sigue» hasta que box 4 los sustituya. Fuera de «In»: `src/main/activity.ts` (W199: la línea «Esperando a un subagente» encima y el vigilante también mira `state/`), `src/preload/activity-i18n.ts` (W203 para líneas viejas), `src/renderer/mockApi.ts` y `src/renderer/overview.test.ts` (la forma nueva) (assumed).
- W75 dice «a gone workspace or pane answers W53's sentence», pero W53 es del runner: se usa la de N3 («No se pudo enviar: ese trabajo ya no está»), como hasta ahora (assumed).
- W203 se arregla en origen: `summarise.mjs` escribe «Te pregunta: ¿Puede usar {tool}?», «Te pregunta: ¿Puede seguir?» y «Claude te necesita» en lugar de los mensajes en inglés de Claude Code; las líneas viejas se traducen al enseñarlas (assumed).
- Box 4: `QuickReplies.tsx` se borra y con él la IPC `status.quickReplies` (main la sigue usando para N3); su prueba vieja de W76 («a waiting row answers with one press») se quita de `src/renderer/quickreplies.test.ts`, que se queda con «the question card reads in every theme»; la del fila/tira encima de la terminal vive ahora en «a card answers by mouse and by number keys». W82 sigue diciendo que en «Todos» una pregunta multiSelect no lleva tarjeta: `AgentCard` tiene `skipMultiSelect` solo para ahí; `src/renderer/overview.test.ts` cambia el nombre del grupo y usa `waits`. Fuera de «In»: `src/renderer/styles.css` (cabecera, «Recomendada», descripción y la tira) (assumed).
- La prueba de W76–W202 se escribió antes que `AgentCard.tsx`, pero no se vio en rojo: se corrió por primera vez con el componente ya escrito.
- Box 5: el compositor sustituye la pista «Escribe en la terminal como siempre» (W143 decía que la pista no sale con el agente parado: ahora la pista no existe y el compositor sale desactivado; `src/renderer/reopen.test.ts` comprueba eso en lugar de la pista). ⌘↩ es el acelerador del menú «Siguiente», que Electron atiende antes que la página: `src/renderer/App.tsx` envía el compositor cuando tiene el foco y si no sigue con N2/W79 (fuera de «In»). Main: `composeAgent` en `status.ts` y la IPC `status.compose` (assumed). Su CSS viajó en el commit de box 4.
- Box 6: lo que Automático contesta él mismo se lee como `working` en `createStatus` (por eso no hay tarjeta ni aviso, V3); la espera contestada se recuerda por su `at` para no contestarla dos veces. «Decidió: …» es una línea de actividad que pone main (como la de W199) hasta que el agente escribe otra; con varias preguntas, las etiquetas van unidas por « · ». Una opción sin `options` o una llamada con una pregunta sin opciones se para como Manual. Si mandar falla, se para como Manual. Las pruebas de box 3, 5 y 6 se escribieron antes que el código pero se corrieron con el código ya puesto; para ver que muerden, se rompió el código a propósito (`automatic` desactivado: dos de tres en rojo; la tercera es un «nunca» que solo cae si Atril concede) y se devolvió (assumed).
- Box 7: `sizeNotice` pasa a `claimSize` (devuelve el `k` reclamado) y el gancho ya no imprime nada; la prueba vieja de W45 («a large branch asks claude to offer a split», src/main/activity.test.ts) se quita: la nueva de `agent.test.ts` corre el gancho de verdad y repite sus casos. La de F25 («a large branch warns at the top of the panel») la sustituye «a large branch offers to split it from the warning». Fuera de «In»: `src/renderer/flow/FlowPanel.tsx`, `src/main/ui.ts` y `src/preload/api.ts` (`bigDismissed`, que se mezcla clave a clave como `folded`; prueba nueva «remembers each branch-size threshold left as it is, per work» en `src/main/ui.test.ts`), `resources/branchsize.mjs`/`.d.mts`, `src/renderer/tour/Tour.tsx` (el paso de las casillas decía que Atril ya se lo había pedido a Claude) y `src/renderer/styles.css` (assumed).
- Box 8 (app real): con la terminal enganchada con `attach -r`, tmux 3.7 rechaza todo `send-keys` a esa sesión («client is read-only»): ninguna respuesta, pausa ni Enter llegaba. Los tests no lo veían porque ninguno engancha un cliente de solo lectura. Arreglo en `src/main/tmux.ts` (fuera de «In»): si `send-keys` falla por eso, los mismos bytes van como pegado sin corchetes (`paste-buffer -r`), que llega como tecleado; `Enter` es `\r` y `Escape` es `\x1b`. Prueba nueva con un cliente `-r` de verdad: «keys reach a pane that a read-only client watches» (src/main/tmux.test.ts). Las pruebas existentes siguen viendo `send-keys` porque no enganchan clientes (assumed). Se comprueba con Claude real que un dígito tecleado así lo toma el selector.
- Box 8 (app real), dos arreglos más: la tarjeta de la fila y la de encima de la terminal no se enteraban de una respuesta dada en la otra (con varias preguntas, la fila seguía ofreciendo la primera, que main ya rechaza): ahora una respuesta avisa a las dos y, contestadas todas, la tarjeta dice solo «Enviado» (caso nuevo en «a question card answers with its options»). Y «Decidió: …» no salía hasta la siguiente escritura del gancho: el feed de actividad relee cuando Automático decide (assumed).
- Box 8, app real (dev, `claude` falso detrás de un `SHELL` falso, paneles con `cat` para ver cada tecla): cuatro filas con tarjeta (pregunta con dos preguntas y porqués, permiso de Bash, fin de turno, fin de turno con `idle`); teclear en la terminal no llegó al panel; «1» con la tarjeta enfocada mandó `1`+Enter y las dos tarjetas pasaron a la segunda pregunta; la última mandó su número, Enter y el Enter final; ⌘↩ en el compositor mandó el texto y vació la caja; «Permitir» mandó `1`; el fin de turno enfocó el compositor y «Sigue» pegó «Sigue con el plan…»; Automático contestó la recomendada («Decidió: Contarlos como festivos» en la fila, sin tarjeta), pegó «Sigue con el plan…» tres veces y a la cuarta enseñó la tarjeta; un permiso en Automático enseñó su tarjeta. Sin errores de consola. Foto: `bocetos/novedades/tarjetas.png`. Sin comprobar (necesita Claude real, no se gastó cuota): que el selector de Claude Code tome el dígito + Enter y el Enter final con varias preguntas, y que «Permitir» = `1` en su permiso.

### Escalera de corrección (harness-ladder, 20 nov 2026)

- (2026-11-19, harness-ladder) Una lección que se repite sube al peldaño más alto que la pare (diseño > tipo o lint > test > texto); una entrada nueva en `lessons.md` nombra las lecciones sustituidas para que la retro no las vuelva a contar.
- (2026-11-19, harness-ladder) El hook de commit corre typecheck y lint, no la suite: la suite sigue en la puerta.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| husky / lefthook | una dependencia para un archivo de tres líneas |
| Mover `WARN_AT` y los modelos a `src/shared` para aplicar la frontera también a tests | el test que cruza solo compara una constante; mover no evita ningún fallo |
| Probar las reglas corriendo `pnpm lint` sobre archivos fixture | escribe archivos en el árbol; `lintText` no |

#### Decision log, answers as given (2026-11-20)
- Q: ¿Qué lecciones suben primero? → A: las que se repiten y caben en una regla que hoy pasa o pasa con pocos arreglos: frontera main↔renderer, mocks de `window.atril` a mano, `homedir()` fuera de su sitio y commits en rojo (assumed; informe en `report.md` de la cola).
- Q: ¿Las reglas valen también en tests? → A: la frontera no (siete tests la cruzan para comparar constantes; moverlas no evita ningún fallo real); la de mocks solo en tests (assumed).
- Q: ¿El hook de commit corre la suite entera? → A: no, typecheck y lint: la suite tarda más de 10 min bajo carga; la suite sigue en la puerta (assumed). Si es incorrecto: el hook llama a `gate.sh`.
- Q: (spec-reviewer) ¿Qué cuenta como importar? → A: declaraciones `import`/`export … from`, de tipos incluidas; `import()` dinámico y `vi.mock` no (assumed: `no-restricted-imports` no los ve y hoy nadie los usa así). Test es un archivo `*.test.ts(x)`; `test-helpers.ts` no lo es. `src/preload/**` queda fuera de la regla.
- Q: (spec-reviewer) ¿Qué cuenta como asignar `window.atril`? → A: cualquier asignación a una propiedad llamada `atril` (`window.atril =`, `(window as X).atril =`, `globalThis.atril =`); `vi.stubGlobal`, `Object.assign` y `defineProperty` quedan fuera (assumed: nadie los usa para `atril` hoy).
- Q: (spec-reviewer) ¿Qué cuenta como leer HOME? → A: `process.env.HOME` y `process.env['HOME']`; `env['HOME']` sobre un parámetro (`login-path.ts`) y la lista de variables permitidas de `forge/create.ts` no, porque no buscan la casa del usuario (assumed).
- Q: (spec-reviewer) ¿Cómo migran los tests sin cambiar lo que prueban? → A: `mockApi` acepta un tercer argumento `over`, un parcial profundo de `AtrilApi` que se mezcla sobre el mock completo; cada test pasa sus stubs de hoy tal cual, promesas que no resuelven incluidas, y sus `expect` no se tocan (assumed).
- Q: (spec-reviewer) `lessons.md` solo crece: ¿cómo se marcan las cubiertas? → A: una entrada nueva por casilla, `## 2026-11-19 · harness-ladder · arnés`, que nombra las lecciones que la regla sustituye (assumed).
- Q: ¿Escrituras atómicas e `ipcMain` envuelto? → A: fuera de este cambio: 15 archivos con `writeFile` y 109 `ipcMain` en `index.ts` piden su propio cambio (assumed).

- Q: (builder) ¿Cuánto tarda `.githooks/pre-commit`? → A: 5,3 s y 4,8 s (typecheck + lint, dos medidas con `time`), muy por debajo de los 60 s del riesgo: se queda como está.
- Q: (builder) ¿Qué tipo tiene `over`? → A: parcial profundo laxo: una hoja función acepta cualquier función y cada nivel admite miembros de más, porque los tests guardan sus stubs tal cual (respuestas parciales y `term.input`, que la API ya no tiene y `components/terminal.test.tsx` stub-ea para probar que nadie lo llama) (assumed).
- Q: (builder) ¿Con qué fecha van las entradas de lecciones? → A: `## 2026-11-20 · harness-ladder · arnés`, el día en que se construyen, no el 19 que dice la entrada de arriba (assumed).

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
- **W6** If a branch name fails `git check-ref-format --branch` with «is not a valid branch name» in its stderr, then Atril shall refuse with ««{branch}» no es un nombre de rama válido» before running any other command.
  Proof: src/main/workspaces.test.ts refuses an invalid branch name
- **W7** While an `in-place` repo has an open workspace, Atril shall refuse to open a second one in that repo with «{repo} trabaja en tu copia y ya tiene un trabajo abierto ({branch}).» and `fix: 'worktree'`.
  Proof: src/main/workspaces.test.ts refuses a second in-place workspace
- **W8** If the main checkout has uncommitted changes, then opening an `in-place` workspace shall refuse and change nothing, answering «Tu copia de {repo} tiene {n} cambios sin commitear en {branch}: no puedo pasarla a {new} sin mezclarlos.», with the first 20 lines of `git status --porcelain` and «Trabaja en tu copia: {reason}» as `detail`, and `fix: 'worktree'`.
  Proof: src/main/workspaces.test.ts in-place refuses a dirty checkout
- **W9** When an `in-place` workspace is closed, Atril shall check out the previous branch
  from its workspace record; if the branch has uncommitted changes, it shall refuse instead.
  Proof: src/main/workspaces.test.ts in-place close restores the previous branch
- **W10** If a worktree has uncommitted changes, then Atril shall refuse to remove it and change nothing, answering «{branch} tiene {changes} sin commitear: no lo cierro para no perderlos.» — `{changes}` being «1 cambio» or «{n} cambios» — with up to 20 `git status --porcelain` lines as `detail` and `fix: 'terminal'`; a clean worktree is removed with `git worktree remove` (never a recursive delete) and its agent session ended.
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
- **W15** When a session enters `needs-you`, Atril shall add one `ask` or `done` notice (V3) and show it on the Mac only when `route()` (V10) answers `mac`; no other `ask` or `done` notice for that session until it leaves the state, except W176; W180's `idle` is a different kind and is allowed.
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
- **W20** If the usage cannot be read and there is no earlier good read, then the footer shall show one sentence per cause — no Claude Code session in the keychain or credentials unreadable, token rejected (401), too many requests (429), no network or no answer, any other status or an unreadable body — that names neither `api.anthropic.com` nor a status code; a button «Abrir Claude Code» for the keychain and token causes, which opens Terminal running `claude`, and «Volver a comprobar» for the rest, which reads the usage again; and the technical reason (the status code, or the failing step) only inside a folded «Ver detalle»; if opening Terminal fails, the footer shall show that reason in place of the sentence. After a good read, W37 holds for every cause: the last values stay with their age. The footer test asserts the text outside the `<details>` element, one case per cause in the main test.
  Proof: src/main/usage.test.ts each failure says what happened with its fix and detail apart
  Proof: src/renderer/footer.test.ts usage error shows its fix and folds the detail
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
- **W23** When Atril launches for the first time, it shall run the tutorial over the 24 steps
  of «Pasos» in that order, after a welcome whose button reads «Enséñamelo · 3 min», each with its title
  and a text of two or three sentences (a sentence ends in «.», «?» or «!» before a space or the end),
  highlighting the
  step's `data-tour` element when it is on screen and showing the step centred when it is not — the
  ones that may be absent being next-up, flow-checklist, flow-changes, flow-subagents, start-mode,
  mr-tools, doctor and palette, of which start-mode and palette never have one; every other target
  shall exist when its step shows. One test holds a case per clause.
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
- **W34** Where the person picks a model in Start or in "Nuevo trabajo", Atril shall launch Claude with `--model <alias>` (`opus`, `sonnet`, `haiku`; no flag for "Por defecto"), store it in the workspace record, and show it on the workspace row; the effort picker beside it offers Por defecto, Bajo, Medio, Alto and Muy alto (`low`, `medium`, `high`, `xhigh`). Fable is not offered.
  Proof: src/main/agent.test.ts chosen model reaches claude and the record
- **W35** Atril shall offer three themes in Ajustes — Claro, Oscuro and Automático (default,
  follows macOS); the choice persists across restarts, Automático switches live when the system
  appearance changes, and every theme keeps text contrast at 4.5:1 or more; colours shall live only in
  the token blocks — `:root`, `[data-theme='dark']` and their two `[data-palette='grafito']` overrides,
  whose keys all exist in the base blocks.
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
  item — the workspace for an agent, the Start for a task, or Tareas when that task is not loaded yet;
  otherwise the menu item is disabled; while focus mode is on, W79 governs ⌘↩ instead.
  Proof: src/renderer/nextup.test.ts command enter opens the next item
- **N3** When the person replies to an `ask`, `done` or `idle` Mac notification, Atril shall type the reply into that workspace's agent pane as literal text followed by Enter, without bringing Atril to the front — except that, while the session's state file holds `options` (W74) and the trimmed reply is an integer from 1 to the number of options, Atril shall answer it as W75's `{ option: n - 1 }`; with `options` the reply placeholder shall read «Responde con 1–{n}». It shall send nothing for an empty reply, and if the workspace or its pane no longer exists it shall send nothing and show «{work}: no se pudo enviar, ese trabajo ya no está». (Bug 5.)
  Proof: src/main/reply.test.ts reply reaches only its own pane as literal text
  Proof: src/main/reply.test.ts a number answers the option with its key
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

- **W45** When a PostToolUse for Edit, Write, MultiEdit or Bash ends and the workspace's branch has more than 400 × k changed lines against its base, with k higher than any k already claimed in that session, the hook shall claim k and print nothing to Claude; F25 offers the split to the person.
  Proof: src/main/agent.test.ts a big branch is claimed without asking claude
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
  and Automático as two selectable cards in one radio group, each radio named by its title and described
  by its own line — Manual «Se para con la spec y el plan escritos y te pregunta», Automático «Sin parar
  en spec y plan; antes de subir te pregunta»; Nuevo trabajo without text offers none; Empezar's one
  click (I20) is always Manual; an automatic workspace's row shows «Auto».
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

### Instalar desde el doctor (add-doctor-install-terminal, 10 nov 2026)

- **W70** When the window asks `atril:doctor:install(tool)` with a tool in W21's list, main shall run
  `osascript` with two `-e` scripts — `tell application "Terminal" to activate` and
  `tell application "Terminal" to do script "<that tool's install command>"`, with `"` and `\` escaped —
  and answer `{ ok: true }`; if the tool is not in the list it shall run nothing and answer `{ error }`;
  if `osascript` exits non-zero it shall answer `{ error }` with its first stderr line. One test holds a
  case per clause: a listed tool, a forged name (`tmux; rm -rf /`), a non-zero exit, and the escaping
  through the exported quoting function.
  Proof: src/main/doctor.test.ts opens the terminal with the listed command only
- **W71** When the person presses «Instalar» on a tool with an install command, Atril shall ask main to
  install that tool by name and show «Instalando en Terminal…» on it, or the error main answered; while
  any tool is missing, each time the Atril window regains focus it shall run the doctor again, show the
  chip (and an open list) only for what is still missing, and put back «Instalar» without state on each
  tool still missing. One test holds a case for the running text, the error, and the recheck counted
  before and after a `focus` event.
  Proof: src/renderer/doctor.test.ts install runs in the terminal and rechecks on focus

### Paleta Grafito (adopt-grafito, 10 nov 2026)

- **W72** Where the palette is Grafito, every colour token in both themes other than `--ed-*`,
  `--jira`, `--jira-2` and `--on-jira` shall be a neutral (OKLCH chroma below 0.03), the accent hue
  (255 ± 15), or the muted added/removed green (150 ± 20) and red (25 ± 20), each of those three with
  chroma at most 0.13 (an `rgba()` token judged by its colour); and every text pair `theme.test.ts`
  checks shall keep at least 4.5:1 in the Grafito palette in both themes. One test holds both.
  Proof: src/renderer/theme.test.ts the grafito palette has one accent and keeps contrast
- **W73** Ajustes → Apariencia shall offer «Original» and «Grafito» as a pressed-state group named
  «Paleta»; choosing one shall set `data-palette` on the document (`original` or `grafito`) in the same
  click and keep it across restarts; main shall read an unknown stored value as Original, the default.
  One test holds a case per clause.
  Proof: src/renderer/theme.test.ts the palette is chosen in appearance and remembered

### Respuestas rápidas (quick-replies, 10 nov 2026)

- **W74** When the hook gets a PreToolUse for `AskUserQuestion`, it shall add to the needs-you state every question of the call in order as `{ question, header, options: [{ label, description }], multiSelect }`, labels and descriptions whole with whitespace collapsed; the stored questions shall stay while the state stays needs-you (a later Notification or Stop included) and go when it leaves needs-you.
  Proof: src/main/agent.test.ts the hook keeps every question and what a permission is for
- **W75** When the window asks `atril:status:answer(workspaceId, choice)`, main shall re-read that workspace's state and, while it is needs-you, act by the choice: `{ option: n, question: i }` for a stored question i with option n — type n plus one then Enter, and after the last question of the call also Enter to submit; `{ allow: true }` while `kind` is `permission` — type `1` then Enter; `{ deny: true }` while `kind` is `permission` — press Escape; `{ continue: true }` — paste «Sigue con el plan; no hagas nada que no esté en él.» as a bracketed paste then Enter. Any other shape, a stale question index or option, or a state that is not needs-you, shall type nothing and answer «Ese agente ya no está esperando una respuesta.» or «Esa opción ya no existe.»; a gone workspace or pane answers W53's sentence. Main shall remember per session which question is next, starting at 0 on each entry into needs-you.
  Proof: src/main/status.test.ts each answer shape sends its own keys
  Proof: src/main/status.test.ts allow and deny send their keys
- **W76** While a workspace is needs-you, its row and the strip above its terminal shall show one card by `kind` (W200–W202) instead of today's quick replies; pressing a button, by mouse or with keys 1–4 while the card has focus, shall send it (W75) and show «Enviado», disabling the card until the state changes, or show the error and keep it live.
  Proof: src/renderer/components/agentcard.test.tsx a card answers by mouse and by number keys
### Escritura atómica (atomic-records, 10 nov 2026)

- **W80** Atril shall replace `workspaces.json` and `repos.json` by writing a temporary file and renaming it,
  so a reader during a write sees either the old file or the new one, never a partial one.
  Proof: src/main/workspaces.test.ts a reader never sees a half-written workspaces file

### Modo foco (focus-mode, 10 nov 2026)

- **W77** When the person chooses Trabajo → Modo foco (⌘⇧F) with a workspace selected, the
  Trabajo screen shall hide the sidebar and «Qué me toca» and keep that workspace's terminal and Libretto
  panel, showing «Salir del foco»; choosing it again, pressing «Salir del foco» or entering «Todos» (W81)
  shall restore them; the menu item shall be disabled unless Trabajo is shown with a workspace selected;
  switching workspace keeps focus on the new one; focus shall not be stored across restarts. One test holds
  a case per clause.
  Proof: src/renderer/focus.test.ts focus keeps only the chosen workspace
- **W78** While the setting «Respetar el modo foco» is on, focus mode is on and the Atril window is focused (`isFocused()` at that moment; minimised, hidden or on another Space is not focused), main shall show no Mac notification of any type, keeping the notice in Avisos, and that notice shall not reach the Mac later; while the setting is off, focus mode shall not quiet anything. One test holds the eight combinations of setting on/off, focus on/off and window focused/not, through `route()`, for an `ask`, a `stopped` and a `ci`.
  Proof: src/main/focus.test.ts focus quiets every type only in front
- **W79** While focus is on, the window shall show «{rama} te necesita» (plus «+{n}») for every needs-you
  workspace other than the selected one, without changing the selection, and hide it when there is none;
  ⌘↩ or pressing it shall select the oldest waiting one (N1 order) and keep focus on, with ⌘↩ disabled
  when none waits; «Volver a {rama}» or ⌘⌥← shall then select the workspace selected at the first jump,
  which later jumps or manual switches do not change and which is forgotten on return, on leaving focus or
  when that workspace is removed. One test holds a case per clause.
  Proof: src/renderer/focus.test.ts jump to the waiting agent and back

### Todos los agentes (agents-overview, 10 nov 2026)

- **W81** When the person picks «Todos» (or ⌘⇧A) on Trabajo, the workspace area shall show one card per
  workspace with its branch, repo, written state, Libretto stage and checklist «{closed}/{total}» when it
  has one (else «sin Libretto»), last activity aged «ahora» / «hace {n} min» / «hace {n} h» / «hace {n} d»
  refreshed every 30 s (else «sin actividad»), and the count of running subagents when any, ordered
  needs-you (N1, longest waiting first), then working (latest activity first), then stopped (by branch),
  ties by id; arrow keys shall move between cards; «Uno» (or ⌘⇧A again) shall return to the terminal;
  ⌘⇧A shall be enabled only on Trabajo with a workspace; entering «Todos» shall turn focus mode off; the
  mode shall not be stored across restarts. One test holds a case per clause.
  Proof: src/renderer/overview.test.ts all agents show as ordered cards
- **W82** Pressing a card shall open that workspace in «Uno» without focus mode; while a card's workspace
  is needs-you and its question is not multiSelect, W76's question card shall sit joined under the card's button,
  outside it, the button shall not repeat the cut activity line, and answering there shall not open it. One test
  holds a case per clause.
  Proof: src/renderer/overview.test.ts a card opens its workspace or answers in place
### QA en vivo (add-qa-lab, 10 nov 2026)

- **W83** Atril shall classify a workspace's folder as expo (an `app.json` or `app.config.*` and an `expo`
  dependency), react-native (a `react-native` dependency with `ios/` or `android/`), flutter (`pubspec.yaml`
  with `flutter:`), android (`settings.gradle*` and `app/src/main/AndroidManifest.xml`), ios (an `*.xcodeproj`,
  `*.xcworkspace` or a `Package.swift` declaring `.iOS(`), web (`package.json` with a `dev`, `start` or
  `preview` script), first match in that order, or none, each with its run command (the Decision log's
  table).
  Proof: src/main/qa.test.ts projects are classified by their files
- **W84** When the person presses «Probar en vivo» on a workspace's target, main shall write `$ATRIL_HOME/qa/<id>.mcp.json` with, for chrome, Playwright MCP `--browser chrome`; for safari, Playwright MCP `--browser webkit` (both `--isolated --output-dir $ATRIL_HOME/qa/<id>/`); for android, mobile-mcp; for ios, `xcrun mcpbridge` and mobile-mcp; split the workspace's pane and start `claude` there in the target's folder with `--mcp-config` that file, `--strict-mcp-config` and a prompt naming the platform, the command, the reserved device (W124) on mobile, the change's proposal path and the screenshot folder; the QA pane's tmux id is kept in `$ATRIL_HOME/qa/<id>.pane`; a second press while that pane lives shall be refused; «Detener QA» shall kill only that pane, free its device and keep the MCP file and the screenshots. One test holds a case per clause.
  Proof: src/main/qa.test.ts live qa starts one scoped agent with its tools
### Pausar un agente (pause-agent, 10 nov 2026)

- **W86** When the person pauses a working workspace (Trabajo → Pausar, ⌘⇧P, or its card), main shall send
  Escape to that workspace's recorded agent pane and write `$ATRIL_HOME/paused/<session>`; while that mark
  exists the workspace's effective state shall be paused, read as stopped by every consumer of the state; a
  PreToolUse or PostToolUse shall not clear it; pausing shall be refused unless the state is working. One
  test holds a case per clause.
  Proof: src/main/pause.test.ts pausing interrupts only that agent
- **W87** When the person resumes a paused workspace, main shall type «Sigue donde lo dejaste.» then Enter into
  its agent pane and remove the mark; a UserPromptSubmit or a needs-you state shall also remove it, except
  Claude Code's idle reminder (a Notification with `notification_type` idle_prompt or «waiting for your
  input»), which keeps it; resuming
  a workspace that is not paused shall answer «Ese agente no está en pausa.» and a gone one N3's message. One
  test holds a case per clause.
  Proof: src/main/pause.test.ts resuming asks the agent to go on
- **W88** While a workspace is paused, its row and its card shall read «en pausa», the Trabajo menu item shall
  read «Reanudar» (⌘⇧P) instead of «Pausar», and «Pausar» shall be disabled unless the selected workspace is
  working.
  Proof: src/renderer/pause.test.ts a paused agent reads en pausa and offers resume

### Abrir una MR en Atril (open-work-from-mr, 10 nov 2026)

- **W89** When a workspace is opened with `existing: true` and a remote on a branch that exists there, Atril
  shall run `git fetch <remote> <branch>` and add the worktree on the local branch if it exists, or on a new local
  branch tracking `<remote>/<branch>` if not, recording as `baseCommit` the merge-base of the fetched commit with the first of `<remote>/HEAD`, `<remote>/main`,
  `<remote>/master`, `main`, `master` that exists (else the fetched commit), so Cambios shows the whole MR; it shall refuse in-place repos
  and branches missing on that remote. One test holds a case per clause.
  Proof: src/main/workspaces.test.ts a workspace opens on an existing remote branch
- **W90** A review session shall be a workspace record with `mode: 'review'`, `branch` the MR's branch and path the
  repo's root: opening it runs no git command that changes a ref, the index or the working tree; it does not count
  for W7; removing it deletes its record and ends its tmux session without any git command.
  Proof: src/main/workspaces.test.ts a review session never touches git
- **W91** The Libretto panel's stage, documents, Cambios, diff, saves and QA shall treat a review session as having
  no workspace of their own (its folder is the person's copy), answering as for an unknown workspace.
  Proof: src/main/workspaces.test.ts a review session has no libretto panel of its own

### Coste por trabajo (cost-per-work, 10 nov 2026)

- **W92** On every hook event whose payload's `transcript_path` is a string ending in `.jsonl`, the hook shall
  add that path as a line to `$ATRIL_HOME/transcripts/<session>` (W62's session name) when it is not there yet,
  and write nothing else from the payload; other events leave the file as it is.
  Proof: src/main/agent.test.ts the hook keeps where the transcript is
- **W93** Main shall total a workspace's usage over its transcript and every `subagents/*.jsonl` beside it, counting each `message.id` once, as input, output, cache-write and cache-read tokens per model, and price each message with the dated table (cache write 1.25× that message's input price; cache read the published price or 0.1× input — Fable 5.2's published 0,20 included), where `claude-haiku-5-5` (or it plus `-YYYYMMDD`) uses 0,50 / 2,50 $ per million and cache read 0,05 for a message whose input, cache write and cache read add up to more than 100 000 tokens, and 0,10 / 0,50 with cache read 0,01 otherwise (exactly 100 000 is the short price); leaving the cost out for a model the table does not name (matching an exact id or the id plus `-YYYYMMDD`); lines that are not JSON or lack usage are skipped, and a line without `message.id` counts once; a later read covers only the bytes appended since the previous one; the table's date is 2026-11-11. One test holds a case per clause.
  Proof: src/main/cost.test.ts usage is totalled once per message and priced by model
  Proof: src/main/cost.test.ts haiku long prompts and fable cache use their prices
- **W94** A workspace's row title and its «Todos» card shall show no text with «$», «≈» or «tokens».
  Proof: src/renderer/cost.test.ts no workspace shows a cost
### Historial (work-history, 10 nov 2026)

- **W95** Atril shall record `createdAt` (epoch seconds) on every new workspace record, and when a workspace is
  removed successfully it shall append to `$ATRIL_HOME/history.jsonl` its branch, repo, Jira key, mode, Libretto
  change and stage at that moment, `createdAt` when present, `closedAt`, and its W93 total, keeping only the
  200 newest lines, written atomically and one write at a time; stage and change shall be read before the
  removal, the line appended only after it succeeds, a failed removal appending nothing and a failed append not
  failing the removal; review sessions shall append nothing. One test holds a case per clause.
  Proof: src/main/history.test.ts a removed workspace leaves one history line
- **W96** While history has lines, Trabajo shall show a «Terminados» section, folded by default (W28),
  its count the number of lines, with the 20 newest, each with its branch, repo, stage, «duró» as «< 1 min» /
  «{m} min» / «{h} h {m} min» / «{d} d {h} h» when `createdAt` is known, no text with «$», «≈» or «tokens», and «hoy»
  or «hace {n} d» by calendar day; it shall update when main pushes a new line. One test holds a case per clause.
  Proof: src/renderer/history.test.ts finished works show in their own section
### Primeros pasos (first-run-setup, 10 nov 2026)

- **W97** While Trabajo has no workspace record (stopped ones included), the history (W96) is empty, `setupDismissed` is not set and the
  tutorial is not open, it shall show «Primeros pasos» with five steps — 1 git, tmux and claude without a doctor
  problem («Comprobando…» until the report arrives; its button opens W32's list), 2 at least one repo, 3 a saved
  Jira token («opcional»), 4 a saved GitHub or GitLab token («opcional»), 5 «Nuevo trabajo» (a button, never
  marked) — each of 1–4 marked done from the live state, with a button where it is done while undone; «Ya lo
  tengo» shall set `setupDismissed`, kept across restarts. One test holds a case per clause.
  Proof: src/renderer/setup.test.ts a new person sees what is left to start

### Empaquetar (package-and-sign, 10 nov 2026)

- **W98** The repository shall hold an `electron-builder.config.cjs` asking for `dmg` and `zip` for `arm64` with
  `appId`, `productName: Atril`, the icon `build/icon.icns`, `extraResources` copying `resources` flat into the
  resources dir, `asarUnpack` covering `node-pty`, `hardenedRuntime: true`, `entitlements` and
  `entitlementsInherit` at `build/entitlements.mac.plist` (holding `allow-jit`, `allow-unsigned-executable-memory`
  and `disable-library-validation`), `notarize: false`, and `identity` equal to `ATRIL_SIGN_IDENTITY` when set and
  `"-"` when not; `package.json` shall pin `electron-builder` to an exact version and its `dist` script shall run
  `electron-vite build` then `electron-builder`. One test holds a case per clause; it proves the config text, never
  a built app.
  Proof: src/main/packaging.test.ts the packaging config asks for a signed arm64 app
- **W99** When packaged, `resourcesDir()` shall return `process.resourcesPath`, and in dev the repo's `resources/`;
  and every file the main process joins onto `resourcesDir()` (`claude-hook.mjs`, `libretto/`), and every
  local module the hook imports (`summarise.mjs`, `branchsize.mjs`), shall exist in `resources/`, so the flat copy of W98 places it where it is looked for.
  Proof: src/main/paths.test.ts resources resolve packaged and in dev

### Libretto (libretto-view, 10 nov 2026)

- **W100** When Atril reads a repo's Libretto state, it shall return as the queue the folders under
  `.agents/changes/` whose `proposal.md` holds a line `Queued: YYYY-MM-DD` before its first `## ` heading, oldest
  first then by name, each with name, date, the first non-blank line under `## Reading` — or, when that section is
  empty, the first line of `## The ask, verbatim` without its `> ` — its whole request without the `> ` as `ask`, and `started: true` when a local branch
  `feat/<name>` exists; and every other folder as in flight with name and `readChecklist`'s closed, total and first
  open box (or none); and if the repo has no `.agents/changes/`, then it shall return `{ none: true }`.
  Proof: src/main/libretto.test.ts a repo's queue and work in flight are read from disk
- **W101** When the person queues an idea, Atril shall write `.agents/changes/<name>/proposal.md` with
  `# <name>`, `Tracker: none`, `Queued: <local date>`, `## The ask, verbatim` with every line of the text quoted, and
  `## Reading` holding the text's first line, the name taken from that line (lowercase, accents stripped,
  non-alphanumerics to one dash, no edge dashes, at most 40 characters including a `-2`… suffix when taken, `idea`
  when empty), and commit only that file as `docs(queue): capture <name>`, leaving every other change in the repo
  uncommitted; if the text is blank or the repo has no `.agents/changes/`, then it shall write nothing; if the commit
  fails, then it shall remove the folder and return the error.
  Proof: src/main/libretto.test.ts queueing an idea writes and commits only its proposal
- **W102** When the person starts a queued idea, Atril shall open a workspace in that repo on branch `feat/<name>`,
  remove the `Queued:` line from that workspace's `proposal.md` and commit it there as `docs(queue): start <name>`,
  and send `/libretto:write-spec <name>` as the first message; if opening fails, then it shall return the error and
  commit nothing.
  Proof: src/main/libretto.test.ts starting a queued idea opens its work at write-spec
- **W103** The «Libretto» screen shall show, for the picked repo, the queue with «Empezar» per idea (or «Empezada ·
  feat/<name>» when started), the work in flight with «{closed}/{total}» and its first open box or «Lista para
  aterrizar», a text box whose «Encolar» is disabled while blank, an error from queueing or starting under what
  caused it, and «Este repo no usa Libretto» without the text box for `{ none: true }`.
  Proof: src/renderer/libretto.test.ts the Libretto screen shows the queue and queues an idea
- **W104** The «Libretto» screen shall be reachable from the rail and from ⌘K, remember the last picked repo across
  restarts in the interface state, and read the state again on entering, on changing repo, after queueing or starting,
  and on «Actualizar».
  Proof: src/renderer/libretto.test.ts the Libretto screen is reachable and keeps its repo

### Tarjeta de pregunta (ask-card, 10 nov 2026)

- **W105** The question text and the enabled answer labels shall keep a contrast of at least 4.5:1 over `--ask-bg`
  in each of the original light, original dark, Grafito light and Grafito dark token sets.
  Proof: src/renderer/quickreplies.test.ts the question card reads in every theme

### Gestionar la cola (queue-manage, 10 nov 2026)

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

### Cabecera tranquila (quiet-header, 11 nov 2026)

- **W112** While «Uno» shows a workspace, the work header shall show «{repo} · {agent}» above the branch, beside the
  branch the same state label and icon as its row in the list (no pill), and to the right one group with the
  Uno/Todos switch and an icon button named «Modo foco», titled «Modo foco (⌘⇧F)», `aria-pressed` while focus is on,
  that turns focus on and off as the menu item does (W77), disabled while no workspace is selected; «Todos» shall not
  show that button. One test holds a case per clause.
  Proof: src/renderer/focus.test.ts the work header shows the state and a focus button

### Pantalla de QA (qa-screen, 11 nov 2026)

- **W113** Atril shall show a «QA» screen in the rail between Libretto and Avisos and in ⌘K, with a card per live workspace naming its chosen target («Chrome», «Safari», «Android», «iOS») or «sin detectar», the picked one pressed; for the picked workspace, its current change's criteria (each `- **ID**` line under `## Verification criteria`, id and text), each with «Pasa», «Falla» or «Sin probar» from the report (last entry per id; absent → «Sin probar») and a summary «{p} pasan · {f} fallan · {u} sin probar»; «Este trabajo no tiene criterios que probar» when there are none; «Todas las capturas», the 12 newest of its QA folder, each at most 2 MB, as data URLs; W123's tabs and W126's lines; and «Probar en vivo» or «Detener QA» as W84. One test holds a case per clause.
  Proof: src/renderer/qa-screen.test.ts the QA screen reports each criterion
- **W114** Main shall read `$ATRIL_HOME/qa/<id>/report.json` and answer only entries whose id is a criterion of the
  workspace's change, whose status is pass, fail or untested, with `note` and step texts cut to 400 characters, at
  most 30 steps, and `shot` kept only when it is a bare file name present in the workspace's QA folder, with the
  file's modification time; a missing, unreadable or malformed file shall answer no entries. One test holds a case per
  clause.
  Proof: src/main/qa-report.test.ts the qa report is read as untrusted data
- **W119** The QA prompt (W84) shall name the report's path and shape, list the change's criteria (id and text), and
  ask the agent to rewrite the whole file after each criterion.
  Proof: src/main/qa-report.test.ts the qa prompt asks for a report per criterion
- **W115** When the person presses «Ver cómo» on a criterion with steps, Atril shall open a modal with its steps (text
  and duration when known), the failing step marked when the status is fail, and its screenshots as data URLs (W113's
  limits) in a strip, the chosen one large; Escape or «Cerrar» closes it and returns focus.
  Proof: src/renderer/qa-screen.test.ts a criterion shows how it was tested
- **W116** When the person presses «Probar este» or «Reprobar todo», main shall type into the live QA pane «Prueba
  solo el criterio {id}: {texto}. Actualiza report.json.» or «Prueba otra vez todos los criterios y actualiza
  report.json.» then Enter, or, with no QA pane, launch QA (W84) with that request appended to its prompt; if W84
  refuses, its error shall show under the button and nothing shall read «Probando…»; otherwise the criterion (or all)
  shall read «Probando…» until the report brings an entry for it written after the request, the QA pane dies, or 5
  minutes pass (then its previous status). One test holds a case per clause.
  Proof: src/main/qa-report.test.ts testing one criterion asks the qa agent for just that
- **W117** When the person presses «Marcar como bug» on a failed criterion, Atril shall open a form prefilled with a
  title «QA {branch}: {note}», the steps, the environment (target platform and folder, branch, head commit) and the criterion, all editable.
  Proof: src/renderer/qa-screen.test.ts a failed criterion becomes a bug
- **W118** In that form, «Crear en Jira» (only while Jira is saved with a board) shall create one issue with the
  title and the rest as description through the same creation W108 uses, and show «Creada {KEY}»; «Pasar al agente
  del trabajo» shall paste the form into the workspace's agent pane as one bracketed paste, then Enter; either error
  shall show in the form and keep it open. One test holds a case per clause.
  Proof: src/main/qa-report.test.ts a bug goes to jira or to the agent once

### QA: dónde se prueba (qa-targets, 11 nov 2026)

- **W120** Main shall list a workspace's QA targets by running W83 on its folder and on every subfolder up to two levels deep (skipping `node_modules`, `Pods`, `build`, `dist`, `vendor` and names starting with `.`, at most 200 folders read), never descending into a folder that classified (its `android/` and `ios/` belong to it), turning each classified folder into targets: web → `chrome` and `safari`; android → `android`; ios → `ios`; expo → `android` and `ios`; react-native and flutter → `android` if it has `android/`, `ios` if it has `ios/`; each with its folder relative to the repo (`''` for the root), W83's command, and a one-line reason naming the file that decided it (e.g. «Hay un package.json con el script dev»); root first, then by folder path; two targets with the same platform and folder count once.
  Proof: src/main/qa-targets.test.ts targets come from the root and two levels down with their reason
- **W121** Where the repo holds `.atril/qa.json` with `{"targets":[{"platform","dir","command"}]}`, main shall use its valid entries instead of the detected ones (platform one of the four, `dir` relative with no `..` segment and an existing folder, `command` a string of at most 200 characters), each with the reason «Lo dice .atril/qa.json»; if the file exists and no entry is valid, then main shall use the detected targets and add the line «.atril/qa.json no se entiende: uso lo que detecto».
  Proof: src/main/qa-targets.test.ts qa.json replaces detection only with valid entries
- **W122** When the person saves «Elegir a mano» (platform, folder, command), main shall add that target to the repo's entry in `$ATRIL_HOME/qa-targets.json` (temporary file and rename) with the reason «Lo elegiste a mano», listed after the detected ones or the `.atril/qa.json` ones, and «Quitar» on it shall remove it; a target with an unknown platform, a `dir` with `..` or a missing folder, or an empty command shall be refused with a sentence saying which.
  Proof: src/main/qa-targets.test.ts manual targets are kept per repo and validated
- **W123** While a workspace has a target, its QA card shall show the chosen target's reason under the target, W121's line when there is one, and «Quitar» beside the reason of a manual target; while it has more than one, it shall show one tab per target («Chrome», «Safari», «Android», «iOS», with the folder after a «·» when it is not the root); pressing a tab shall save it as the repo's chosen target in `qa-targets.json`, a later card of that repo shall open on it, and «Probar en vivo» shall launch that target.
  Proof: src/renderer/qa-screen.test.ts targets show as tabs remembered per repo
- **W124** When QA launches on android or ios, main shall reserve the first of the person's devices (android: `emulator -list-avds`; ios: available iPhone simulators from `xcrun simctl list devices available -j`) not held in `$ATRIL_HOME/qa/devices.json` by another workspace whose QA pane lives, write `{device: workspaceId}` there, and name that device in the prompt (`emulator -avd <name>` or `xcrun simctl boot <udid>`); a hold whose pane no longer lives counts as free; when two workspaces launch at once with one free device, one shall get it and the other shall answer W125's «every device held».
  Proof: src/main/qa.test.ts each live qa gets its own device
- **W125** If QA cannot launch, then main shall answer the first problem in this order, with what happened, what the person cannot do, one fix and the technical detail (every missing tool named there), and start nothing: no target → «Elegir a mano» (handled by the window alone); no `node` → «Instalar Node» (Terminal with `brew install node`); android with no `adb` or `emulator` → «Instalar Android Studio» (`https://developer.android.com/studio`); android with no AVD → «Crear un Pixel 8» (Terminal with `sdkmanager "system-images;android-35;google_apis;arm64-v8a" && avdmanager create avd -n Pixel_8 -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_8`); ios with no `xcrun` or no `mcpbridge` (`xcrun --find mcpbridge` fails) → «Actualizar Xcode» (`macappstore://apps.apple.com/app/id497799835`); ios with no available iPhone simulator → «Abrir Xcode» (`open -a Xcode`); every device held → «Ver el otro QA» (opens the workspace holding the first device of the list). A missing Chrome or Playwright WebKit is not a launch problem: the agent meets it. The window shall send only the fix's name and the workspace id, and main shall refuse a name it does not know (`pick-manual` included). One test holds a case per problem.
  Proof: src/main/qa.test.ts every launch problem comes with its fix
- **W126** When launch answers a problem, the QA card shall show its what and cannot in words, a button with the fix and «Ver detalle» folded with the technical detail, with no raw error elsewhere; a workspace with no target shall read «No sé cómo abrir este proyecto», the line «Busqué package.json con dev, start o preview, app.json de Expo, pubspec.yaml, settings.gradle, .xcodeproj o Package.swift, en la raíz y dos niveles», and «Elegir a mano».
  Proof: src/renderer/qa-screen.test.ts a launch problem shows its fix and detail folded

### Errores claros (plain-errors, 11 nov 2026)

- **W127** If a tool's version command has not finished after 5 s, then the doctor shall kill it and report that tool with the problem «no responde en 5 s» and its install command, and the other tools as they answered; the kill is the runner's `timeoutMs` (SIGKILL, code 124).
  Proof: src/main/doctor.test.ts a hung tool is reported after 5 s

### PATH del shell (login-path, 11 nov 2026)

- **W128** When Atril starts, main shall set its PATH, before the doctor or any agent runs, to the PATH printed by the person's `$SHELL -ilc` between two markers, then `~/.local/bin`, `/opt/homebrew/bin`, `/usr/local/bin` and the PATH it was launched with, each folder once, in that order; if the shell fails, prints no markers or has not answered in 3 s, then the same list without the shell's part.
  Proof: src/main/login-path.test.ts the shell's path comes first and nothing repeats
  Proof: src/main/login-path.test.ts a silent or slow shell still adds the usual folders

### Copia con cambios (dirty-copy, 11 nov 2026)

- **W129** When opening is asked with `worktree: true`, Atril shall open that workspace as a worktree even for an `in-place` repo, leave the main checkout's branch and files as they were, and keep the repo's mode.
  Proof: src/main/workspaces.test.ts worktree this time leaves the dirty copy alone
- **W130** When the new-work or the start dialog gets an error with a `fix`, it shall show it as a problem titled with main's sentence, «No he creado el trabajo.» under it, the detail folded and a button by its `fix`: «Usar un worktree esta vez» asks to open the same repo, branch, model, effort, text and mode with `worktree: true`; «Abrir en Terminal» asks main to open Terminal for that repo.
  Proof: src/renderer/newwork.test.ts a dirty copy offers a worktree this time
  Proof: src/renderer/newwork.test.ts a blank dirty retry opens plain claude in a worktree
  Proof: src/renderer/newwork.test.ts a git failure offers terminal for the repo
### Abrir y cerrar sin errores crudos (ws-errors, 11 nov 2026)

- **W131** If a git step or tmux fails while opening a workspace, then Atril shall create no record and answer one sentence per step — reading the repo's state: «No puedo leer el estado de git de {repo}.»; switching the copy: «git no me deja pasar tu copia a {branch}.»; fetching: «No he podido traer {branch} de {remote}.»; adding the worktree when its stderr matches `/already (checked out|used by worktree)/` (git's own wording; Atril runs git with its default English messages): «La rama {branch} ya está abierta en otra carpeta.», otherwise «git no ha podido crear la carpeta del trabajo.»; starting tmux: «tmux no ha podido arrancar el agente.» — with the command's stderr (or the thrown message) as `detail`, never inside the sentence, and `fix: 'terminal'` with the repo id.
  Proof: src/main/workspaces.test.ts a failing step when opening says which and folds its output
- **W132** If closing a workspace is refused before anything runs, then Atril shall change nothing and answer — the in-place copy on another branch: «Tu copia está en {current}, no en {branch}: vuelve a {branch} antes de cerrar.» with `fix: 'terminal'`; the workspace folder missing: «La carpeta de {branch} ya no existe.» with `fix: 'forget'`; `git status` failing on a folder that exists: «No puedo leer el estado de git de {branch}.» with its stderr as `detail` and `fix: 'terminal'`. If a git step fails after the agent's session was ended (`git switch` back, `git worktree remove`), then it shall keep the record and answer «git no ha podido cerrar {branch}; su agente ya está parado.» with its stderr as `detail` and `fix: 'terminal'`. Stderr never appears in a sentence.
  Proof: src/main/workspaces.test.ts close refusals say what and how to get past
- **W133** When forgetting a workspace is asked by id, Atril shall end its tmux session, drop its record and Atril's own files for it by session name (as W60, W65 and W92) — never the work's folder —, run no git command other than `git worktree prune` in the repo for a worktree record, and write no history line; an unknown id answers «Ese trabajo ya no existe».
  Proof: src/main/workspaces.test.ts forgetting a broken work runs no git
- **W134** When the window asks to open Terminal for a repo id or a workspace id, main shall look the folder up in its own records and open Terminal there running `git status`, with the folder single-quoted (a `'` inside becomes `'\''`), so a path with `'`, `"` or `\` reaches `cd` whole; an id it does not know answers an error and opens nothing.
  Proof: src/main/workspaces.test.ts terminal opens only a known folder, quoted
- **W135** When a close is refused, the workspace row shall show it as a problem whose title is main's sentence, with «{branch} sigue en la lista.» under it, the button «Abrir en Terminal» or «Quitar de la lista igualmente» by its `fix`, the detail folded, and a «Cerrar aviso» button that hides it.
  Proof: src/renderer/closework.test.ts a refused close shows its fix and can be dismissed
- **W136** While a workspace's session is alive (its `alive` field from the workspace list), «Quitar» shall first ask in its row «¿Cerrar {branch}? Su agente se para y el trabajo pasa a Terminados.» with «Cerrar» and «Cancelar», and close only on «Cerrar»; a stopped workspace closes on the first click.
  Proof: src/renderer/closework.test.ts closing a live agent asks first

### Modelo y esfuerzo (model-pick, 11 nov 2026)

- **W137** When a workspace opens from «Nuevo trabajo» or «Empezar» with an effort of `low`, `medium`, `high` or `xhigh`, the agent command (and the command «Empezar» shows) shall carry `--effort <level>` before the prompt and the record shall keep `effort`; with `default` or no effort the command has no `--effort` and the record has no `effort` field; any other value is refused in main with ««{effort}» no es un esfuerzo disponible» before anything runs.
  Proof: src/main/agent.test.ts effort reaches the command only from the list
  Proof: src/main/jira/start.test.ts an unknown effort is refused before anything runs
- **W138** The suggestion shall come from the task text in «Nuevo trabajo», or the Jira summary and type in «Empezar», matched case-insensitively: a Jira type Bug, or a word starting with `arregl`, `fallo`, `error`, `bug`, `fix`, `typo`, `corrige` or `errata`, gives `sonnet` with `medium` and «Un arreglo acotado: Sonnet lo hace bien a mitad de precio que Opus.»; else a word starting with `refactor`, `migra`, `arquitectura`, `reescrib` or `rediseñ` gives `opus` with `high` and «Un cambio grande: mejor Opus con más esfuerzo.»; else none. A missing Jira type counts as not Bug. («fixture» counts as a fix: the rule is a hint, not a classifier.)
  Proof: src/renderer/inbox/suggest.test.ts the rules pick model and effort with their reason
- **W139** While a dialog has a suggestion and the chosen model or the chosen effort differs from it, the dialog shall show «Sugerido: {model} · {effort}» with its reason and a «Usar» button that sets both; with no suggestion, or both already equal, nothing shows; the dialog never changes the model or effort by itself.
  Proof: src/renderer/newwork.test.ts a suggestion is shown and used only on click
  Proof: src/renderer/inbox/start.test.ts the start dialog suggests from the jira type

### Volver a abrir (reopen-work, 11 nov 2026)

- **W141** When reopening a workspace is asked by id while its agent is stopped — no session, or a session whose recorded pane is dead (W16), which is ended first — and its folder exists, Atril shall start a tmux session with the same name in that folder running `agentArgv` with the record's model and effort, plus `--continue` only when a transcript is recorded for it (`transcripts/<session>`), leaving its auto marker as it is, store the new pane id, and answer the workspace as alive; with `more: true` the effort goes one level up (none or `medium` → `high`, `low` → `medium`, `high` → `xhigh`) and is stored.
  Proof: src/main/workspaces.test.ts a stopped work reopens where it was
- **W142** If reopening is asked for an unknown id, a workspace whose agent is not stopped, a folder that no longer exists, or `more: true` at `xhigh`, then Atril shall start nothing and answer — «Ese trabajo ya no existe», «Este trabajo ya está abierto.», «La carpeta de {branch} ya no existe.» with `fix: 'forget'`, «Ya está en el esfuerzo más alto.»; if tmux fails to start, it shall end any half-made session and answer «tmux no ha podido arrancar el agente.» with the message as `detail` and `fix: 'terminal'`.
  Proof: src/main/workspaces.test.ts reopening refuses what it cannot do
- **W143** While the selected workspace's agent is stopped (dead session, or dead pane: the bar then sits above the terminal), the centre shall show «{branch} está parado: su sesión de tmux ya no existe (un reinicio o tmux cerrado).», «Su agente no sigue hasta que lo vuelvas a abrir.», a «Volver a abrir» button and, below `xhigh`, «Seguir con más esfuerzo»; the terminal tip shall not show; both buttons are disabled while a reopen runs, so a second click sends nothing; a refusal shows with `Problem`, its button as in W135.
  Proof: src/renderer/reopen.test.ts a stopped work offers to reopen
- **W149** If the terminal's tmux client has exited or its descriptor is closed, then typing, resizing or detaching that terminal shall do nothing and never throw, and an exited client shall be forgotten so nothing more is sent to it.
  Proof: src/main/pty.test.ts a dead terminal client never throws

### Archivos de estado dañados (state-files, 11 nov 2026)

- **W144** If `workspaces.json` exists but cannot be read, is not JSON, its `workspaces` is not an array, or an entry lacks a string `id`, `path`, `branch` or `session`, then every path that writes it — opening, closing, forgetting, reopening, pausing and any other — shall create, delete or write nothing and answer «No puedo leer workspaces.json: está dañado. No abro ni cierro trabajos hasta que se arregle.» with the error (code or parse message) as `detail` and `fix: 'reveal'`; a missing file still reads as empty.
  Proof: src/main/state.test.ts a damaged workspaces list blocks every change and writes nothing
- **W148** If `repos.json` exists but cannot be read, is not JSON, its `repos` is not an array, or an entry lacks a string `id` or `path`, then opening a workspace, adding a repo, changing a repo's mode and every other path that writes it shall create, delete or write nothing and answer «No puedo leer repos.json: está dañado. No puedo usar ni cambiar tus repos hasta que se arregle.» with the error as `detail` and `fix: 'reveal'`; a missing file still reads as empty.
  Proof: src/main/state.test.ts a damaged repos list blocks every change and writes nothing
- **W145** While `workspaces.json` is damaged, the status poll and the workspace list shall not raise unhandled rejections, and the window's workspace list shall show W144's sentence, «Tus agentes siguen en tmux, pero no puedo enseñártelos.» and «Mostrar en Finder» instead of the empty state (W97's empty text stays for an undamaged empty list). A damaged `repos.json` alone leaves the workspace list as it is.
  Proof: src/main/status.test.ts a damaged list does not break the poll
  Proof: src/renderer/statefiles.test.ts a damaged list shows its problem instead of the empty state
- **W146** If the `mkdir` of the worktree's parent folder (before `git worktree add`) fails with `EACCES`, `EPERM` or `EROFS`, then opening shall answer «No puedo escribir en la carpeta de Atril ({home}).» with the code as `detail` and `fix: 'reveal'`, with nothing to undo; if writing the record fails after the session started, it shall end the session, remove the worktree it made and delete the branch it made, and answer the same sentence for those codes, or «No he podido guardar el trabajo.» for any other, with the code as `detail`.
  Proof: src/main/workspaces.test.ts a read-only atril home undoes the open and says so
- **W147** When the window asks to reveal `workspaces` or `repos`, main shall show that file (or Atril's folder if it is missing) in Finder; any other name reveals nothing. A problem with `fix: 'reveal'` shows «Mostrar en Finder» in the workspace row (as W135), the new-work and start dialogs (as W130) and the sidebar.
  Proof: src/main/state.test.ts reveal shows only the state files
  Proof: src/renderer/statefiles.test.ts a damaged list shows its problem instead of the empty state

### Jira, GitHub y GitLab (net-errors, 11 nov 2026)

- **W150** When a request to Jira, GitHub or GitLab gets an HTTP error or throws, `net-problem` shall answer one sentence naming the service — 401: «{service} ha rechazado tu token.»; 403: «{service} no te deja ver esto con ese token.»; 404: «{service} no encuentra esa dirección.»; 429: «{service} pide esperar: demasiadas consultas.»; 500–599: «{service} está fallando ahora mismo.»; any other status: «{service} ha contestado algo que no esperaba.»; a thrown `ENOTFOUND` or `EAI_AGAIN`: «No encuentro {service}.»; a certificate code (as S32): «El certificado de {service} no es válido.»; a timeout: «{service} no ha respondido a tiempo.»; a `SyntaxError` (a body that is not JSON): «{service} ha contestado algo que no entiendo.»; anything else: «No llego a {service}: ¿hay conexión?» — with `detail` `HTTP <n>` or the code (from `err.cause.code` when it matches `^[A-Z0-9_]+$`, else the exception's name), and `fix: 'settings'` for 401, 403, 404, a host not found and a certificate code (the person fixes the token or the address), `fix: 'retry'` otherwise. No sentence contains a status number or an exception name.
  Proof: src/main/net-problem.test.ts each status and network cause has its sentence and fix

### Modelos de Libretto (libretto-models, 11 nov 2026)

- **W151** When Libretto is bundled, every agent whose file name (without `.md`) is in Atril's list (`converge-reader`, `review-lens-reliability`, `review-lens-security`, `spec-reviewer`, `work-reviewer`) and whose leading `---` frontmatter has no line starting with `model:` shall get `model: sonnet` as the frontmatter's last line; an agent that has one keeps it.
  Proof: scripts/libretto-models.test.ts reviewers get sonnet unless libretto chose
- **W153** Any agent outside the list, or without a leading frontmatter, shall be left byte-for-byte as it was, and running the function a second time shall change nothing.
  Proof: scripts/libretto-models.test.ts other agents and a second run change nothing
- **W152** The committed copy in `resources/libretto/agents/` shall be that function's output over the `171db90` copy: the five listed agents carry `model: sonnet`, `review-lens-design` keeps `sonnet`, `review-lens-intent` and `review-lens-tests` keep `haiku`, and `spec-writer` has no `model:` line — read from the files themselves.
  Proof: src/main/packaging.test.ts bundled reviewers run on sonnet

### Repos rotos (repo-gone, 11 nov 2026)

- **W154** The repo list shall give each repo `health`: `missing` when its folder does not exist, `not-git` when `git -C <path> rev-parse --git-dir` fails with «not a git repository» in its stderr, `ok` otherwise (git itself failing leaves `ok`: W156 says it when git is used).
  Proof: src/main/repos.test.ts each repo says whether its folder is there and is git
- **W155** If opening a workspace is asked on a repo whose health is `missing` or `not-git`, then Atril shall answer «La carpeta de {repo} ya no existe ({path}).» or «La carpeta de {repo} no es un repo de git ({path}).» with `fix: 'settings'` before any git command that writes or any tmux command.
  Proof: src/main/workspaces.test.ts a missing or non-git repo is refused with its fix
- **W156** If any git command run while opening or closing a workspace exits 127 or has «xcode-select» in its stderr, then Atril shall answer «git no funciona en este Mac.» with that stderr as `detail` and `fix: 'git'` instead of that step's W6, W131 or W132 sentence, having changed nothing that step had not already changed.
  Proof: src/main/workspaces.test.ts a broken git is never blamed on the branch name
- **W159** Wherever a workspace problem shows its fix — the workspace row, the new-work and start dialogs, the reopen bar and the sidebar — `fix: 'settings'` shall show «Abrir Ajustes» and open Ajustes, and `fix: 'git'` shall show «Instalar herramientas de Xcode» and run W70's install for git.
  Proof: src/renderer/newwork.test.ts settings and git fixes do what they say
- **W157** When the person asks to remove a repo by id, Atril shall drop it from `repos.json` and leave its folder, its branches and its remembered Jira mapping untouched (a mapping to a removed id reads as no repo remembered); while a workspace of that repo is in the list it shall refuse with «{repo} tiene trabajos abiertos: ciérralos antes.», and while `workspaces.json` is damaged with W144's sentence; either refusal changes nothing.
  Proof: src/main/repos.test.ts removing a repo forgets it and never touches the folder
- **W158** When the person picks a new folder for a repo by id, Atril shall store the folder's git top level as that repo's path keeping its id and mode; it shall refuse with S13's sentence if the folder is not a git repository, and with «Esa carpeta ya es el repo {id}.» if another repo already has that path; either refusal, or a cancelled picker, changes nothing.
  Proof: src/main/repos.test.ts a repo can be pointed at its new folder

### Terminal que no engancha (term-attach, 11 nov 2026)

- **W160** When `atril:term:attach` is asked, main shall answer `{ ok: true }` once the tmux client started, `{ ok: false }` for an unknown or not-alive workspace, and, if starting the client throws, `{ error: «No he podido abrir la terminal de {branch}.», detail }` with the thrown message as `detail`, keeping no client for that workspace; it never rejects.
  Proof: src/main/pty.test.ts a client that cannot start answers an error and keeps nothing
- **W161** When the terminal gets that error for the workspace it is showing, it shall show over the empty terminal a problem titled with the `error` field, «Tu agente sigue en tmux: solo falla esta vista.» under it and the detail folded; an answer for a workspace no longer shown is dropped.
  Proof: src/renderer/terminal.test.ts a terminal that cannot attach says so
- **W162** «Volver a intentar» shall ask to attach again with the terminal's current size; on `{ ok: true }` the problem goes, and on another error it is replaced by the new one.
  Proof: src/renderer/terminal.test.ts retrying hides the problem or shows the new one

### Panel más rápido (fast-panel, 11 nov 2026)

- **W163** The status poll and `listWorkspaces` shall read tmux through one shared snapshot (`tmux list-panes -a` with session name, pane id and dead flag), taken at most once per second, so a status tick costs one tmux command whatever the number of works; creating, killing or respawning a session drops the snapshot, and decisions that act — sending a reply or keys, pausing, reopening — ask tmux directly instead.
  Proof: src/main/status.test.ts one tmux call per tick whatever the number of works
  Proof: src/main/tmux.test.ts the snapshot is shared for a second and dropped by any session change
- **W164** State-folder events (status) and activity-file events (activity) shall refresh 200 ms after the last event of a burst, and at least once per second while events keep coming.
  Proof: src/main/status.test.ts a burst of hook writes refreshes once
  Proof: src/main/activity.test.ts a burst of activity writes refreshes once

### Grafito: te necesita (grafito-you, 11 nov 2026)

- **W165** Where the palette is Grafito, in both themes, the «trabajando» label's `--working` shall be a neutral (OKLCH chroma below 0.03) while `--run` (unread dots, selection, current step) and `--you`/`--you-text` keep the accent, so a working row and a needs-you row never share a colour.
  Proof: src/renderer/theme.test.ts grafito tells needs-you from working

### Radar de choques (radar, 11 nov 2026)

- **W166** Main shall answer, for every workspace record that is not a review, the other non-review records of the same repo that change at least one of the same files against their own `baseCommit` (committed or not), as `{ id, branch, files }` with repo-relative files sorted; records of different repos never collide, and a record sharing no file gets an empty list.
  Proof: src/main/radar.test.ts two works on one file collide and nothing else does
- **W167** While nothing counted (F46) changed in any workspace, asking the radar again within 30 s of the last computation shall run no process; after that, each workspace computes again at most once per 30 s.
  Proof: src/main/radar.test.ts the radar costs nothing while nothing changes
- **W168** A workspace row with collisions shall show, under its repo line and in the secondary grey, «Choca con {branch} en {file}» for its first collision's first file, followed by « y {n} más» where n is the total of files across all its collisions minus one, with every «{branch}: {file}» as the line's title; a row without collisions shows no such line. The window asks the radar every 10 s.
  Proof: src/renderer/radar.test.ts a colliding row says with whom and where
  Proof: src/renderer/radar.test.ts a row without collisions shows nothing new

### Lecciones para cada agente (lessons-first, 11 nov 2026)

- **W169** `agentArgv({ lessons: true })` shall add `--append-system-prompt` with «Este repo guarda en .agents/lessons.md los errores que ya se pagaron aquí. Léelo antes de empezar y no los repitas.» before the prompt, and nothing without it.
  Proof: src/main/agent.test.ts lessons are pointed out only when the repo keeps them
- **W175** When a workspace's agent starts or is reopened, it shall get `lessons: true` exactly when, in the workspace's folder, `.agents` is a real directory and `.agents/lessons.md` a regular file (`lstat`, no links); the command «Empezar» shows applies the same rule to the chosen repo's folder; the QA agent never gets it.
  Proof: src/main/workspaces.test.ts a new or reopened work is told about lessons only with a real file
  Proof: src/main/jira/start.test.ts the shown command points at lessons only when the chosen repo keeps them

### Dónde se atasca (stuck, 11 nov 2026)

- **W172** When a workspace with a Libretto change is closed, its history line shall carry `steps` in seconds from the branch's commits to that change's `proposal.md` (`<baseCommit>..HEAD`, oldest first): `spec` from the record's `createdAt` to the first commit whose file has a `## Verification criteria` section; `plan` from there to the first commit whose file has a box under `## Checklist`; `construir` from there to the last commit that raises the count of closed boxes; `cierre` from the last of those marks that exists to the moment of closing. A step is left out when either of its ends is missing (no `createdAt`, no such commit); a step of 0 is kept; none is ever negative.
  Proof: src/main/history.test.ts a closed work records the time of each step
  Proof: src/main/history.test.ts missing marks leave their steps out
- **W173** Terminados shall show, under each entry with steps, its steps in order as «Spec {d} · Plan {d} · Construir {d} · Cierre {d}» (only those it has), with {d} as «<1 min», «{n} min», «{n} h» or «{n} d»; and at the top of the unfolded list, when at least three of the 20 newest entries have steps, «Donde más tiempo se va: {step} (mediana {d})» for the step with the highest median over the entries that have it (an even count takes the mean of the two middle values; a tie goes to the earlier step).
  Proof: src/renderer/history.test.ts each finished work shows its steps and the slowest one leads

### QA en la MR (qa-to-mr, 11 nov 2026)

- **W170** When «Publicar en la MR» is pressed for a workspace that has its MR (Decision log), main shall post one general comment on that MR: «Pruebas en vivo con Atril · {target}» (or without « · {target}» when there is none), one line per criterion «{Pasa|Falla|Sin probar} · {criterion text}», each failing one followed by a quoted line (`> `) with its note or else its last step, and «Las capturas están en Atril.» — all in the app's language; the screen then shows «Publicado en la MR» with a link to the MR and the button becomes «Publicar de nuevo».
  Proof: src/main/qa-publish.test.ts the qa summary reaches the mr as one comment
- **W174** The QA screen shall ask main (`atril:qa:mrFor(id)`) which MR the workspace has, by the Decision log's rule, listing MRs itself when its last list is older than 60 s.
  Proof: src/main/qa-publish.test.ts the work's own mr is found by repo and branch
- **W171** While the workspace has no MR, the QA screen shall show «Abre la MR para poder publicar aquí la QA.» instead of the button; while a post runs the button is disabled, so a second press sends nothing; if posting fails, it shall show the W150 problem with its button and post nothing more.
  Proof: src/renderer/qa-publish.test.ts without an mr the button is not offered and a failure says why

### Notificaciones (main) (notify-core, 12 nov 2026)

- **W176** While a session stays in `needs-you`, when its state file's text changes from one starting «Claude dice: » to one starting «Te pregunta: », Atril shall add one new `ask` notice with the new text, once per such change. (Bug 3.)
  Proof: src/main/status.test.ts a question after an end of turn notifies again
- **W177** Main shall build each Mac notification as: for `ask` «{work} te pregunta» with the question after «Te pregunta: » as body (else «Claude te necesita»); `done` «{work} ha terminado su turno» with the hook text; `stopped` «{work} se ha parado» / «Su terminal se ha cerrado.»; `idle` «{work} te espera» / «Desde hace {m} min. Solo te lo recuerdo una vez.»; `qa` «QA terminada en {work}» / W181's count; `radar` «Dos trabajos tocan lo mismo» / W182's sentence; `review` «Te piden revisión», `comment` «Comentario nuevo en tu MR», `ci` «La CI falla en tu MR», `cipass` «La CI vuelve a pasar», `merged` «MR fusionada», `closed` «MR cerrada», `gone` «Ya no está abierta», `following` «MR nueva en lo que sigues», `opened` «Has abierto una MR», each with the MR title as body; `quota` W183's text. `{work}` is the record's `jiraKey`, else its branch; a work's notification carries its repo's name as subtitle; none is titled «Atril». (Bug 7.)
  Proof: src/main/notify.test.ts every type is titled by what it is about
- **W178** When a workspace's agent state goes from `working`, `needs-you` or `paused` to `stopped` after the first pass, Atril shall add one `stopped` notice for it; a workspace Atril is closing (between «Cerrar» and its record's removal) shall not count.
  Proof: src/main/status.test.ts an agent that stops is a notice
  Proof: src/main/status.test.ts closing a work from Atril is not a stop
- **W179** If two or more workspaces stop in the same refresh pass, then the Mac shall get one notification «{n} trabajos se han parado» with their names as body («A, B y C»), while Avisos keeps one `stopped` notice per workspace.
  Proof: src/main/status.test.ts several stops in one pass are one Mac notice
- **W180** When a workspace has been in `needs-you` for `idleMinutes` (V7) by main's clock since main saw it enter, Atril shall add one `idle` notice for it, once per entry; changing `idleMinutes` applies to waits in progress; a workspace that left `needs-you` before then gets none. The clock is main's memory: a workspace already in `needs-you` when Atril starts counts from that start.
  Proof: src/main/status.test.ts a long wait reminds you once
- **W181** When, after `launchQa` for a workspace, its `report.json`, modified after that launch, first holds every criterion of its change with status `pass` or `fail`, Atril shall add one `qa` notice with body «{p} pasan, {f} fallan.» (singular «1 pasa», «1 falla»); a later report change in the same run adds none; the next `launchQa` arms it again; a change with no criteria adds none; restarting Atril disarms it.
  Proof: src/main/qa-report.test.ts a finished QA run is one notice
- **W182** When a radar answer (W166) shows two workspaces sharing a file that the previous answer did not show them sharing, Atril shall add one `radar` notice per pair with body «{a} y {b} tocan {file}» for the first new file in sort order, plus « y {n} más» when there are more new ones; the first answer after start only sets the baseline; a file already shared never notifies again while it stays shared.
  Proof: src/main/radar.test.ts a new shared file is one notice per pair
- **W183** When a usage reading shows the five-hour or the seven-day window at 80 % or more and the previous reading of that window (same `resetsAt`) was below 80 %, Atril shall add one `quota` notice titled «Cuota de Claude al 80 %» with body «5 h al {pct} % · se reinicia a las {HH:MM}» or «7 días al {pct} % · se reinicia el {día}»; at most one per window per `resetsAt`; the first reading after start only sets the baseline; a reading with an error adds nothing.
  Proof: src/main/usage.test.ts the quota crossing 80 percent is one notice
- **W184** When an URL leaves Mías (V1), main shall ask its forge once — GitHub `GET /repos/{owner}/{repo}/pulls/{n}`, GitLab `GET /projects/{id}/merge_requests/{iid}` with `{id}` the URL's project path, encoded — and answer `merged` (GitHub `merged: true`, GitLab `state: merged`), `closed` (otherwise closed) or nothing (open, error, timeout of 10 s, no token); at most 10 such requests per listing, the rest answering nothing.
  Proof: src/main/forge/outcome.test.ts a vanished MR is merged, closed or unknown
- **W185** Main shall list MRs every 5 min when the latest listing (`lastMrs`, written by the window's listings and by main's) is older than 5 min or there is none, whether or not a window exists, feeding Avisos as the window's listings do; with no forge connected it shall not list. (Bug 10.)
  Proof: src/main/mrpoll.test.ts main lists when nobody has for five minutes
- **W186** A `ci` Mac notification shall carry the action «Arreglar con Claude»; choosing it shall bring Atril to the front on that MR's view and start M30's fix there, whose result and errors show as M30 says; clicking the notification opens the MR view.
  Proof: src/main/notify.test.ts ci offers to fix it with Claude
- **W187** A `merged` or `closed` Mac notification whose MR branch matches a non-review workspace of the same repo shall carry the action «Cerrar su trabajo»; choosing it shall bring Atril to the front with that workspace's close confirmation (W136) open; without a match it carries no action; clicking opens the MR in its forge.
  Proof: src/main/notify.test.ts a merged MR offers to close its work
- **W188** A `stopped` Mac notification for one workspace shall carry the action «Reabrir», which reopens it as W141 says (`reopenWorkspace`), a refusal (W142) showing as a Mac notification with its sentence; clicking opens its workspace.
  Proof: src/main/notify.test.ts a stopped agent offers to reopen
- **W189** While «Agrupar» is on, when a Mac notification is due less than 120 s after the last one shown, main shall hold it; 120 s after that last one, a single held notice shall show as itself and two or more as one notification «{n} agentes te necesitan» (all from workspaces) or «{n} avisos nuevos» (otherwise), body the first three names or titles; W179's notification counts as one slot and, if held, its notices join the group one by one; at release each held notice is routed again (V10) and only those still `mac` show; with none left, nothing shows. The joined «A, B y C» list ends with « y {k} más»; clicking it opens Avisos. While «Agrupar» is off, each shows at once.
  Proof: src/main/notify.test.ts grouping lets one notice through every two minutes
- **W190** While quiet hours are on, `inQuiet(now, quiet)` shall be true when `now`'s weekday is in `days`, or when its local time is in `[from, to)` — wrapping past midnight when `from` > `to`, empty when `from` = `to`. Cases: Tue 20:00 and Wed 08:59 with 19:00–09:00 are quiet, Wed 09:00 is not, Sat 12:00 with `sat` is quiet.
  Proof: src/main/avisos.test.ts quiet hours wrap midnight and cover whole days
- **W191** Main shall keep a reference to each shown Mac notification until it is clicked, replied to, acted on or closed, never more than the 50 newest; the «no se pudo enviar» notification shall be held the same way. (Bug 6.)
  Proof: src/main/notify.test.ts shown notifications stay referenced and bounded
- **W192** Main shall answer notification permission as `blocked` when `defaults export com.apple.ncprefs -` holds an `apps` entry whose `bundle-id` is Atril's and whose `flags` lacks bit 25 (`0x2000000`), `allowed` when it has it, and `unknown` when there is no entry or the command or its XML fails; «Abrir Ajustes del Sistema» shall open `x-apple.systempreferences:com.apple.Notifications-Settings.extension`. (Bug 9.)
  Proof: src/main/notify.test.ts permission reads macOS notification flags
- **W193** When the person asks for a test notification of a type, main shall show that type's example (S42's texts) on the Mac regardless of its setting, focus, quiet hours and grouping, add nothing to Avisos, and answer `blocked` when W192 says so.
  Proof: src/main/notify.test.ts a test notice skips every rule and the feed
- **W194** When the person clicks a Mac notification, main shall bring the window to the front and open what V6 says for its type (for `ask`, `done`, `idle` the Trabajo screen with that workspace, as W38), and mark its notice read (V12); a click within 1 s of a reply is ignored (N3).
  Proof: src/main/notify.test.ts a click opens what the notice is about
- **W195** When Claude Code's idle reminder fires (a `Notification` with `notification_type` `idle_prompt` or «waiting for your input») while the session's state file says `needs-you`, the hook shall keep that file's `text`, `kind`, `questions`, `permission` and `at` as they were and set `idle: true`.
  Proof: src/main/agent.test.ts the idle reminder keeps the question

### Terminal de solo lectura (terminal-read-only, 14 nov 2026)

- **W196** The Trabajo terminal shall attach to the agent's tmux session as a read-only client (`tmux attach -r`) and send no keystroke, paste or mouse input to it, including the shell panes an earlier ⌘D left in the session; selecting text and ⌘C still copy. Main shall ignore `atril:term:input`, and ⌘D / ⌘⇧D shall do nothing.
  Proof: src/main/pty.test.ts the terminal client is read only
  Proof: src/renderer/components/terminal.test.tsx typing in the terminal sends nothing
- **W197** When the hook writes `needs-you`, it shall also write `kind`: `question` for a `PreToolUse` of `AskUserQuestion`, `permission` for a `Notification` with `notification_type` `permission_prompt` or a message starting «Claude needs your permission», and `turn-end` for `Stop`; an idle reminder (`idle_prompt` or «waiting for your input») shall leave `kind` as it was and set `idle: true` (W195 amended below).
  Proof: src/main/agent.test.ts the hook says what kind of wait it is
- **W198** On every PreToolUse the hook shall remember, per session, the tool name and a one-line summary of its input (the command for `Bash`, the path for `Edit`/`Write`/`MultiEdit`, else nothing); when it writes a `permission` wait it shall store that pair as `{ tool, summary }`.
  Proof: src/main/agent.test.ts a permission names the tool it waits for
- **W199** While a session is in `needs-you` with `kind` `turn-end` and its subagents file holds an entry without `endedAt`, Atril shall show it as `working` with the activity «Esperando a un subagente» and add no notice; on the first poll after the last entry ends, the state counts as entering `needs-you` (W15). Background shells are out of this change (Scope).
  Proof: src/main/status.test.ts a turn end with a subagent still running is working
- **W200** For a `question`, the card shall show the next unanswered question, its header and each option as a button with its number, label and description, the option whose label ends «(Recommended)» or «(Recomendado)» marked «Recomendada» without that suffix; for `multiSelect` it shows the options without buttons and «Contesta por escrito abajo».
  Proof: src/renderer/components/agentcard.test.tsx a question card answers with its options
- **W201** For a `permission`, the card shall read «Quiere ejecutar {summary}» (or «Quiere usar {tool}», or «Quiere permiso para seguir» with no tool) with «Permitir» and «Denegar».
  Proof: src/renderer/components/agentcard.test.tsx a permission card allows or denies
- **W202** For a `turn-end`, the card shall show «Ha terminado: {last text}» with «Sigue» (`{ continue: true }`) and focus the composer; while `idle` is true it adds «Lleva un rato esperándote».
  Proof: src/renderer/components/agentcard.test.tsx a turn end offers to continue
- **W203** No row, card, notification or Avisos text shall contain the hook's English messages «Claude needs your permission» or «Claude is waiting for your input».
  Proof: src/main/status.test.ts claude's english wait messages never reach the person
- **W204** Under the terminal, the composer «Escribe al agente» shall send its trimmed text to the pane as a bracketed paste followed by Enter with «Enviar», or ⌘↩ while the composer has focus (elsewhere N2 and W79 keep ⌘↩), clear itself on success, keep the text and show the error (Problem) on failure, and send nothing when empty or when the workspace is stopped.
  Proof: src/renderer/components/composer.test.tsx the composer sends to the agent
- **W205** While a workspace is in Automático, when it enters `needs-you` with `kind` `question` and no question of the call is `multiSelect`, Atril shall answer every question with the option marked recommended (else the first), by itself, adding no notice and showing no card, and show «Decidió: {label}» in the row's activity; a call with a `multiSelect` question stops as Manual does.
  Proof: src/main/status.test.ts automatic answers its own questions with the recommended option
- **W206** While a workspace is in Automático, when it enters `needs-you` with `kind` `turn-end` and W199 does not hold, Atril shall send `{ continue: true }` by itself, adding no notice, at most 3 times in a row; the count restarts only after the agent has been `working` for 30 s without a break; the fourth time it shows the card and notifies as Manual does.
  Proof: src/main/status.test.ts automatic keeps going on its own and stops where it must
- **W207** While a workspace is in Automático, a `permission` wait — including W59's push question — shall show its card and notify as Manual does.
  Proof: src/main/status.test.ts automatic never grants a permission by itself

### Afinar la petición (refine-request, 20 nov 2026)

- **W208** When `atril:refine:ask(text)` is called with a string that, trimmed, has 1–2000 characters and no NUL, main shall run `claude -p --model haiku --output-format json --tools "" --no-session-persistence --json-schema <{questions: 1–5 strings}> <instruction>` once — the instruction in English, ending «Write the questions in {lang}.» with the app's language, as `scores.ts` does — with the trimmed request on stdin (never in argv) and a 60 s timeout, outside the scores queue, and answer `{ questions }`: `structured_output.questions`, each trimmed with newlines turned into spaces, empty and repeated ones dropped, each cut to 200 characters, at most 5. Any other argument shall answer `{ error: «No hay petición que afinar.», detail: 'argument', fix: 'retry' }` with no run.
  Proof: src/main/refine.test.ts asks haiku once with the request on stdin and keeps well-formed questions
- **W209** If the run does not give questions, then main shall answer `{ error, detail, fix: 'retry' }`, never rejecting the IPC call and never carrying Claude's output: exit 124 → «Claude no ha contestado a tiempo.», detail `timeout`; exit 127 → «No encuentro Claude Code en este Mac.», detail `claude`; any other non-zero exit → «Claude ha fallado.», detail `exit {code}`; exit 0 with stdout that is not JSON, `is_error: true`, no `structured_output.questions` array, or no question left after W208's cleaning → «Claude no ha devuelto preguntas.», detail `json`, `is_error`, `schema` or `empty`. A call while one runs shall answer «Ya está preguntando.», detail `busy`, with no new run.
  Proof: src/main/refine.test.ts a failed ask says why and runs one at a time

### Escalera de corrección (harness-ladder, 20 nov 2026)

- **W210** If a file under `src/renderer/**` that is not `*.test.ts(x)` has an `import` or `export … from` declaration (type-only included) whose path resolves under `src/main/`, or one under `src/main/**` whose path resolves under `src/renderer/`, then `pnpm lint` shall fail with «renderer y main solo hablan por preload».
  Proof: src/main/harness.test.ts lint refuses an import across main and renderer
- **W211** If any file other than `src/renderer/mockApi.ts` assigns to a member named `atril` (`window.atril`, `(window as X).atril`, `globalThis.atril`), then `pnpm lint` shall fail with «usa mockApi() de src/renderer/mockApi.ts».
  Proof: src/main/harness.test.ts lint refuses a hand-made window.atril
- **W212** If a file under `src/main/**` that is not `*.test.ts` and not `paths.ts`, `trust.ts` or `qa.ts` calls `homedir()`, or reads `process.env.HOME` or `process.env['HOME']`, then `pnpm lint` shall fail with «las rutas de casa salen de paths.ts (ATRIL_HOME en tests)».
  Proof: src/main/harness.test.ts lint refuses homedir outside paths
- **W213** When the `prepare` script of `package.json` runs in a git repository, that repository's `core.hooksPath` shall be `.githooks`.
  Proof: src/main/harness.test.ts prepare points git at the hooks
- **W214** If `pnpm -s typecheck` fails, or if `pnpm -s lint` fails, then `.githooks/pre-commit` shall exit non-zero.
  Proof: src/main/harness.test.ts the pre-commit hook stops a red commit

### Skills: encender y apagar (skills-toggle, 23 nov 2026)

- **W215** `skillsWriteOk` in `ui.json` shall survive a restart when it is `true`; any other value shall be dropped.
  Proof: src/main/ui.test.ts remembers skills write consent and drops anything but true
