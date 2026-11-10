# Workspaces

Governs: src/main/** src/preload/** src/renderer/** resources/** electron-builder.config.cjs build/** !src/main/jira/** !src/renderer/inbox/** !src/main/flow/** !src/renderer/flow/** !src/main/credentials/** !src/renderer/settings/** !src/main/forge/mrs.ts !src/renderer/mr/** !src/main/forge/scores.ts !src/main/forge/threads.ts !src/main/forge/lenses.ts !src/main/forge/openmr.ts !src/main/forge/linecomments.ts !src/main/avisos.ts !src/renderer/avisos/**

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
  other until the session leaves that state, except where W78 suppresses it.
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
- **W34** Where the person picks a model in Start or in "Nuevo trabajo", Atril shall launch
  Claude with `--model <alias>` (`opus`, `sonnet`, `haiku`; no flag for "Por defecto"), store it
  in the workspace record, and show it on the workspace row. Fable is not offered.
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
  Proof: src/main/doctor.test.ts install opens the terminal with the listed command only
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

- **W74** When the hook gets a PreToolUse for `AskUserQuestion`, it shall add to the needs-you state the
  labels of the first question's options (at most 4, each cut to 40 characters, whitespace collapsed);
  a multiSelect question shall store none; the stored options shall stay while the state stays needs-you
  (a later Notification or Stop included) and go when it leaves needs-you. One test holds a case per clause.
  Proof: src/main/agent.test.ts an asked question keeps its options
- **W75** When the window asks `atril:status:answer(workspaceId, choice)` with choice `{ option: n }` or
  `{ fixed: 'yes' | 'no' }`, main shall re-read that workspace's state and, while it is needs-you, type
  n plus one then Enter for an option among the stored ones, or «Sí, sigue» / «No, espera» as literal
  text then Enter for a fixed reply, into that workspace's pane; otherwise it shall type nothing and answer
  «Ese agente ya no está esperando una respuesta.», «Esa opción ya no existe.» or, for a gone workspace,
  N3's message. Any other choice shape shall be refused. One test holds a case per clause.
  Proof: src/main/reply.test.ts a quick answer reaches its own pane
- **W76** While a workspace is needs-you and its question is not multiSelect, its row shall be joined by
  a card holding the question's full text (its latest activity line, uncut) and its stored options as numbered
  buttons — «1», «2»… then the label — or «Sí, sigue» and «No, espera» when it has none, and the row shall not repeat
  the cut activity line; pressing one, by mouse or keyboard, shall send it (W75) and show «Enviado» — disabling the
  buttons until the state changes — or show the error and keep the buttons live; the card shall go when the state
  leaves needs-you. One test holds a case per clause.
  Proof: src/renderer/quickreplies.test.ts a waiting row answers with one press
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
- **W78** While focus is on and the Atril window is focused (`isFocused()` at that moment; minimised,
  hidden or on another Space is not focused), main shall show no macOS notification for a workspace
  entering needs-you, and that entry shall not be notified later; otherwise notifications behave as W15.
  One test holds the four combinations of focus on/off and window focused/not.
  Proof: src/main/focus.test.ts focus swaps the notification for the pill only in front
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
- **W84** When the person presses «Probar en vivo» on a classified workspace, main shall write
  `$ATRIL_HOME/qa/<id>.mcp.json` with Playwright MCP (web, `--output-dir $ATRIL_HOME/qa/<id>/`) or mobile-mcp
  (the rest), split the workspace's pane and start `claude` there with `--mcp-config` that file,
  `--strict-mcp-config` and a prompt naming the kind, its run command, the change's proposal path and the
  screenshot folder; if a tool the kind needs (`node`; plus `adb` for android, `xcrun` for ios, both for expo,
  react-native and flutter: at least one of adb or xcrun) is missing it shall start nothing and answer every
  missing one; the QA pane is started by splitting the workspace's pane with that command and its tmux id
  kept in `$ATRIL_HOME/qa/<id>.pane`; a second press while that pane lives shall be refused; «Detener QA»
  shall kill only that pane and keep the MCP file and the screenshots. One test holds a case per clause.
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
- **W93** Main shall total a workspace's usage over its transcript and every `subagents/*.jsonl` beside it,
  counting each `message.id` once, as input, output, cache-write and cache-read tokens per model, and price them
  with the dated table (cache write 1.25× input; cache read the published price or 0.1× input), leaving the cost
  out for a model the table does not name (matching an exact id or the id plus `-YYYYMMDD`); lines that are not
  JSON or lack usage are skipped, and a line without `message.id` counts once; a later read covers only the bytes
  appended since the previous one. One test holds a case per clause.
  Proof: src/main/cost.test.ts usage is totalled once per message and priced by model
- **W94** A workspace's card and its row's title shall show «≈ {coste} $ · {tokens} tokens» with «estimado a
  precio de API» — cost as «≈ 0,42 $», or «< 0,01 $» without «≈» under a cent, tokens as «850», «12,3 k» or «1,2 M», plus «(sin precio para
  {modelo})» when a model is unpriced — updated when main pushes a change, and nothing when the total is 0
  tokens or there is no transcript. One test holds a case per clause.
  Proof: src/renderer/cost.test.ts each workspace shows its estimated cost

### Historial (work-history, 10 nov 2026)

- **W95** Atril shall record `createdAt` (epoch seconds) on every new workspace record, and when a workspace is
  removed successfully it shall append to `$ATRIL_HOME/history.jsonl` its branch, repo, Jira key, mode, Libretto
  change and stage at that moment, `createdAt` when present, `closedAt`, and its W93 total, keeping only the
  200 newest lines, written atomically and one write at a time; stage and change shall be read before the
  removal, the line appended only after it succeeds, a failed removal appending nothing and a failed append not
  failing the removal; review sessions shall append nothing. One test holds a case per clause.
  Proof: src/main/history.test.ts a removed workspace leaves one history line
- **W96** While history has lines, Trabajo shall show a «Terminados» section, folded by default (W28), its count
  the number of lines, with the 20 newest, each with its branch, repo, stage, «duró» as «< 1 min» / «{m} min» /
  «{h} h {m} min» / «{d} d {h} h» when `createdAt` is known, W94's short cost «≈ {coste} $ · {tokens} tokens»
  when non-zero, and «hoy» or «hace {n} d» by calendar day; it shall update when main pushes a new line. One test
  holds a case per clause.
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

- **W100** When Atril reads a repo's Libretto state, it shall return as the queue the folders under `.agents/changes/`
  whose `proposal.md` holds a line `Queued: YYYY-MM-DD` before its first `## ` heading, oldest first then by name, each
  with name, date, the first non-blank line under `## Reading`, and `started: true` when a local branch
  `feat/<name>` exists; and every other folder as in flight with name and `readChecklist`'s closed, total and first
  open box (or none); and if the repo has no `.agents/changes/`, then it shall return `{ none: true }`.
  Proof: src/main/libretto.test.ts a repo's queue and work in flight are read from disk
- **W101** When the person queues an idea, Atril shall write `.agents/changes/<name>/proposal.md` with `# <name>`,
  `Tracker: none`, `Queued: <local date>`, `## The ask, verbatim` with every line of the text quoted, and `## Reading`,
  the name taken from the text's first line (lowercase, accents stripped, non-alphanumerics to one dash, no edge
  dashes, at most 40 characters including a `-2`… suffix when taken, `idea` when empty), and commit only that file as
  `docs(queue): capture <name>`, leaving every other change in the repo uncommitted; if the text is blank or the repo
  has no `.agents/changes/`, then it shall write nothing; if the commit fails, then it shall remove the folder and
  return the error.
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
