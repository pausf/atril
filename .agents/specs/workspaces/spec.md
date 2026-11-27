# Workspaces

Governs: src/main/** src/preload/** src/renderer/** resources/** electron-builder.config.cjs build/** eslint.config.mjs .githooks/** .claude/** scripts/cdp-drive.mjs CLAUDE.md !src/main/jira/** !src/renderer/inbox/** !src/main/flow/** !src/renderer/flow/** !src/main/credentials/** !src/renderer/settings/** !src/main/forge/mrs.ts !src/main/forge/page.ts !src/main/forge/merge.ts !src/renderer/mr/** !src/main/forge/scores.ts !src/main/forge/threads.ts !src/main/forge/lenses.ts !src/main/forge/openmr.ts !src/main/forge/linecomments.ts !src/main/avisos.ts !src/renderer/avisos/** !src/main/skills/** !src/renderer/skills/** !src/main/crash/** !src/renderer/crash/**

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

### Subagents (add-subagents-view, 10 nov 2026)

- The flow panel shows the workspace's subagents: what each was asked (its description, or its type
  when none is known), its type, and «trabajando · 1 min 20 s» or «terminado · 45 s».
- The workspace row shows «2 subagentes» while any is running.
- SubagentStart and SubagentStop never change the workspace's own state (working / needs-you); the
  Agent call itself and the subagent's tool calls still count as working, as today.

### Subagent detail (add-subagent-detail, 10 nov 2026)

- Clicking a subagent in the panel opens a modal that looks like a terminal and shows what that Claude has done and is
  doing, read from its local file, without spending quota.
- While the subagent works, the modal refreshes itself every second; when it finishes, it stays still.
- Each subagent's description comes from its `meta.json`, so two subagents of the same type
  launched at once can no longer swap labels.
- The hook no longer keeps the `pending` queue nor reads the `Agent` PreToolUse for subagents.

### Install from the doctor (add-doctor-install-terminal, 10 nov 2026)

- In the «N herramienta(s) por instalar» notice, each tool with a command has **Instalar** next to
  Copiar. Pressing it opens Terminal.app with that command already running and the item says
  «Instalando en Terminal…».
- On returning to Atril, the doctor checks again: what was installed disappears from the list and, if nothing
  is missing any more, the whole notice goes.

### Grafito palette (adopt-grafito, 10 nov 2026)

- Ajustes → Apariencia has «Paleta: Original · Grafito» above «Claro · Oscuro · Automático».
- With Grafito, backgrounds, surfaces, lines and text are Grafito's cool grey scale and the only
  action colour is its muted blue (also «te necesita», focus, running and modes); added and removed
  use its muted green and red. With Original, nothing changes.
- The choice is saved and applied on launch, like the theme.
- The `fase1-nucleo.html` sketch offers the same choice.

### 24-step tutorial (expand-tour, 10 nov 2026)

The tutorial walks through 24 steps that explain the whole app, leaving no piece unexplained: the list and the
texts are under «Pasos» below. Those with an on-screen element highlight it; the rest appear centred.

### Quick replies (quick-replies, 10 nov 2026)

- A «te necesita» row shows the question and, below it, its answers as small buttons; pressing one sends it
  to the agent without switching work, and the row says «Enviado».
- When the agent goes back to work, the buttons disappear.

### Focus mode (focus-mode, 10 nov 2026)

- ⌘⇧F leaves in view only the chosen work: its terminal and its panel; ⌘⇧F again, or «Salir del foco», brings
  everything back.
- Meanwhile, if another agent needs you and Atril is in front, a pill tells you without moving you;
  ⌘↩ takes you there and «Volver a …» brings you back, without leaving focus.

### All agents (agents-overview, 10 nov 2026)

- ⌘⇧A (or «Todos») shows all the works as cards, ordered by who needs you; clicking one
  opens it. You answer an agent from its card without opening it.

### Live QA (add-qa-lab, 10 nov 2026)

- In a work whose repo is a web, Android or iOS app, «Probar en vivo» opens a tmux pane with a QA Claude that
  starts the app, walks through it following the change's spec and saves screenshots.
- The «QA» section of the Libretto panel lists those screenshots (newest first) and clicking one shows it large.
- «Detener QA» closes that pane; nothing else is touched.

### Pause an agent (pause-agent, 10 nov 2026)

- A working agent can be paused: it stops working, its session stays alive and the row says «en pausa».
- «Reanudar» asks it to continue; the row goes back to «trabajando» when the agent moves.

### Cost per work (cost-per-work, 10 nov 2026)

- Each work shows how many tokens it has spent (with its subagents) and its estimated cost at API prices.

### History (work-history, 10 nov 2026)

- What you finished stays in view with its stage, how long it took and how much it cost, even if it is no longer running.

### First steps (first-run-setup, 10 nov 2026)

- Someone opening Atril for the first time sees what is missing to get started, each item with its button, and the steps tick
  themselves off as they go.

### Packaging (package-and-sign, 10 nov 2026)

- `pnpm dist` leaves in `dist/` a signed arm64 `.dmg` and `.zip` (own identity or ad-hoc) with everything the app needs
  inside; a page explains how to build, sign and open it.

### Libretto (libretto-view, 10 nov 2026)

- From Atril you queue an idea without opening a terminal, see the queue and what each repo has in progress, and a
  queued idea is started with one click in its own work, following Libretto.

### Question card (ask-card, 10 nov 2026)

- When an agent asks, its row grows into a card with the whole question and numbered answers; it does not
  collide with the row below. The panel no longer has «Otros cambios»: it says «{n} cambios más en este repo» and «Ver en Libretto».

### Manage the queue (queue-manage, 10 nov 2026)

- A queued idea can be corrected, removed or sent to Jira without opening files, and each idea shows what it is about.

### Quiet header (quiet-header, 11 nov 2026)

- A work's header reads at a glance and Atril shows no money or tokens.

### QA screen (qa-screen, 11 nov 2026)

- QA has its own screen: you pick the work and see which criteria of its change were seen working in the app, how the
  agent tested them, and you turn a failure into a Jira task or an assignment to the agent with one click.

### QA: where it is tested (qa-targets, 11 nov 2026)

- A work's QA card shows one tab per platform that can be tested (Chrome, Safari, Android, iOS), with the reason in one line («Hay un `package.json` con el script `dev`»). The chosen tab is remembered per repo.
- «Probar en vivo» launches the chosen tab's QA with its engine and, on mobile, with an emulator or simulator reserved for that work; a second work gets another.
- When something is missing, the card says what happened, what you cannot do because of it, and brings the button that fixes it.
- With nothing detected: «No sé cómo abrir este proyecto» with «Elegir a mano».

### Clear errors (plain-errors, 11 nov 2026)

- The footer never shows an HTTP code or a host as a sentence: it says what is happening in plain Spanish, brings its button and the code goes in «Ver detalle».
- A tool that does not answer its `--version` shows as «no responde» after 5 s, with its install button, instead of «Comprobando…» forever.
- Connecting Jira with an address that does not respond says what failed (address not found, certificate, no response) without «TypeError», and the code goes in «Ver detalle».

### Shell PATH (login-path, 11 nov 2026)

- Opened from the Dock, Atril finds `claude`, `tmux`, `git` and `jira` where your terminal finds them; the doctor stops saying they are missing.

### Copy with changes (dirty-copy, 11 nov 2026)

- When opening a work in a repo that works in your copy, if it has changes or already has a work, the dialog says what is happening with figures and branches, that nothing has been created, and brings «Usar un worktree esta vez»; the files are folded.

### Open and close without raw errors (ws-errors, 11 nov 2026)

- No failure when opening or closing a work shows stderr in the sentence: it says which step failed, what has not been done and brings its button; git or tmux output goes in «Ver detalle».
- Closing a work with a live agent asks for confirmation in the row.
- The notice of a rejected close can be dismissed.

### Model and effort (model-pick, 11 nov 2026)

- When opening a work you also choose the effort; the agent starts with `--effort` and the work remembers it.
- If the task looks like a bounded fix or a big change, the dialog suggests model and effort with its reason; «Usar» applies it.
- Cost per work counts Fable's cache read and Haiku's long tier.

### Reopen (reopen-work, 11 nov 2026)

- A stopped work says why it is stopped and brings «Volver a abrir»; pressing it, the terminal comes back with the agent continuing its conversation.
- «Seguir con más esfuerzo» does the same one level higher and remembers it.
- A stopped work does not show «Escribe en la terminal como siempre».

### Damaged state files (state-files, 11 nov 2026)

- With a damaged state file, the sidebar and Ajustes → Repos say which one and what you cannot do, with «Mostrar en Finder»; the «Aquí verás…» and «Aún no hay ninguno» empty states do not appear.
- Opening, closing, forgetting and reopening a work neither create nor delete anything while one of the two files is damaged.
- Without write permission on Atril's folder, opening a work says so with its button and leaves nothing half-done.
- The poll and the work list do not leak unhandled rejections over these files.

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

- A single table in main translates every HTTP status and every network cause of Jira, GitHub and GitLab into a sentence with its fix.

### Libretto models (libretto-models, 11 nov 2026)

- The Libretto reviews that Atril's agents launch run on Sonnet: half the price of Opus, as the article recommends for repeated tasks.

### Broken repos (repo-gone, 11 nov 2026)

- Opening a work in a repo whose folder is missing or is not git says so with «Abrir Ajustes», without git text.
- Ajustes → Repos flags broken repos and lets you find their folder or remove them; any repo can be removed.
- With git broken, opening or closing a work says «git no funciona en este Mac» with «Instalar herramientas de Xcode».

### Terminal that does not attach (term-attach, 11 nov 2026)

- If the terminal does not attach, the centre says so, says the agent keeps working and brings «Volver a intentar»; nothing goes uncaught.

### Faster panel (fast-panel, 11 nov 2026)

- Agent state costs one tmux process per cycle and the watchers coalesce bursts.

### Grafito: needs you (grafito-you, 11 nov 2026)

- In Grafito, the row that needs you is the only one in blue.

### Clash radar (radar, 11 nov 2026)

- With three works in the same repo, if two touch `src/cart.ts`, their two rows say so before any MR is opened.

### Lessons for every agent (lessons-first, 11 nov 2026)

- In a repo with lessons, every agent that Atril opens (new, reopened or not QA) starts knowing they exist and reading them.

### Where it gets stuck (stuck, 11 nov 2026)

- In Terminados you see how long each work took in each stage and in which one your time usually goes.

### QA on the MR (qa-to-mr, 11 nov 2026)

- Whoever reviews the MR sees which criteria were tested live and with what result, without leaving GitHub or GitLab.

### Notifications (main) (notify-core, 12 nov 2026)

- Main tells you, by the work's name, when an agent asks, ends its turn, stops, keeps waiting, collides with another work, finishes QA; when CI breaks or comes back; when an MR is merged or closed; when Claude's quota reaches 80 %.
- At most one Mac notification every 2 min when grouping is on; nothing on the Mac in quiet hours or, if you ask for it, in focus mode.
- MR notices keep coming with the window closed.

### Read-only terminal (terminal-read-only, 14 nov 2026)

- Each work's terminal is shown live and can be selected and copied, but no key reaches the agent.
- When the agent waits, Atril says what it waits for, in Spanish, with buttons: a question with its options and its reason; a permission with what it wants to run; an end of turn with what it said; never «Claude needs your permission» nor «Claude is waiting for your input».
- Below the terminal, an «Escribe al agente» box sends any message.
- In Automático no card appears: Atril picks the recommended one and says «Sigue con el plan; no hagas nada que no esté en él.» by itself, and the row keeps «Decidió: {opción}»; it stops only at the push and the MR, at a real failure or at a permission Claude Code does not grant by itself.
- An agent that ends its turn while it continues with subagents or background tasks shows as «trabajando», not «te necesita».

### Correction ladder (harness-ladder, 20 nov 2026)

Four mistakes that were already paid for can no longer repeat without `pnpm lint` or the commit stopping them, with a message that says what to use instead; the lessons that covered them say which rule replaces them.

### Enforced rules (enforce-written-rules, 26 nov 2026)

- A push whose commits carry a work identifier is refused by `.githooks/pre-push` on the contributor's machine that has the list; on any other machine the hook does nothing.
- A Claude Code session in this repo cannot run `pnpm build`: the tool call is denied with one line saying why.
- `CLAUDE.md` is a short brief: what landed last, what comes next, what is untested with real data, and the working rules that no hook enforces; the two enforced rules are one-line pointers.

### Fewer go-on cards (fewer-go-on-cards, 26 nov 2026)

- An agent whose change still has open boxes and that stops without asking anything keeps going by itself: no card, no notice, the row stays «trabajando». After 5 stops in a row blocked this way, it shows today's «Ha terminado su turno · Sigue» card.
- An agent that ends its turn with a question in prose shows a question card with that question and no buttons (the composer answers), notifies as `ask`, and Automático leaves it to the person.
- An agent that stops with no open boxes and no question reads «terminado»: no card, not in «Siguiente», one `done` notice; Automático presses nothing.
- One turn end gives at most one notice.
- An agent that stops while one of its own background shells still runs reads «trabajando» with the activity «Esperando a una shell en segundo plano»: no card, no notice, no block (issue #5).

### QA pictures in the MR (add-pr-qa-pictures, 26 nov 2026)

- A reviewer opening the work's PR on GitHub or GitLab sees, in its description, one block per criterion: Pasa/Falla/Sin probar, the criterion text, its screenshot, and a «Before» screenshot where one exists.
- Before anything is sent, the person sees in Atril exactly which pictures will go and which are blocked and why; nothing leaves without their press.
- A picture whose text shows a host name, an address, a home path, a token, an e-mail, or this Mac's name or user, never reaches the forge; neither does any PNG metadata or original file name.
- Publishing again replaces Atril's block in the description and leaves the rest of the description byte for byte.
- With no shots, «Publicar en la MR» does exactly what it does today, with no sheet; with every picture blocked, the sheet says why and «Publicar sin imágenes» does what it does today.
- No Claude process starts at any point of this.

### Repo harness (repo-harness, 26 nov 2026)

In Settings → Repos, each healthy repo row has a «Harness» button. Opening it shows, with no Claude call, ten items in three groups (Context, Verification, Guardrails). Each is either found (with a short detail such as `CLAUDE.md · 142 lines`) or missing, with one line on why it matters; a missing item that has a docs page offers one button that opens it. Nothing in the repo is written, and nothing is fixed for the person.

### CDP isolation (fix-cdp-isolation, 26 nov 2026)

- A dev Atril started with `ATRIL_CDP_PORT` either owns that port's debugger, proved by its own token, or exits non-zero with one line on stderr before its `whenReady` startup runs (no loginPath, no handlers, no window, no tools, no forge or agent work). It never starts on a port another process holds.
- A driver cannot read anything from an Atril it did not launch: it proves the page carries the token it handed to the launch before reading, and otherwise disconnects and throws.
- A packaged app ignores all of it.

### Work vs main (#11, #10, #8) (work-vs-main, 26 nov 2026)

- «New work» in a repo whose checkout sits on an old branch creates a branch whose first commit is `origin`'s current default branch, not the checkout's HEAD; the person's checkout is not moved.
- A work that later merges or rebases onto a newer `origin/main` reports a size, a panel total and clashes counted only from where it left `origin/main`.
- A work whose PR has been merged reads «Merged», shows no «needs you» card, drops out of every clash, and can be removed as before.
- Two open works of one repo that define the same new criterion id say so on their rows.

### A merged work is finished (finished-means-finished, 27 nov 2026)

- A work whose record is `merged` reads `done` in main whatever its state file says, so `status.list` and every `onChange` carry `done`.
- «Up next» shows no chip for a merged work.
- A merged work gets no idle reminder, Automático sends it nothing, and the merge itself raises no «finished» notice.
- The «All agents» card and the work header of a merged work say «Merged», as its row does, with no «Go on».

### Card answer lands (card-answer-lands, 27 nov 2026)

- A tall question or permission card above the terminal scrolls inside itself; the terminal below keeps at least 180 px.
- Whatever size the window asks for, main never attaches or resizes an agent's tmux client below 10 rows.
- A card answer reads «Sent» only once the agent's hook state moved on or its pane changed after the keys; until then the card reads «Sending…» with its buttons disabled.
- If neither happened 4 s after the keys, the card says the answer did not reach the agent and offers «Try again», which sends the same choice again.

### Ignored files never decide the mode (#2) (ignored-files-not-dirty, 27 nov 2026)

- Registering a repo that holds a git-ignored file (`caso-1-stripe.gif` under `caso-*`, `web/config.local`, a `.env`) reads `worktree` with the «no signal» reason, never naming a file.
- A repo whose `node_modules`/`vendor` weigh over 2 GB still reads `in-place` (W3), also when ignored files sit beside them.
- A person who wants in-place for a repo with an ignored `.env` still chooses it (W4).

### Add a repo by its path (#1) (add-repo-by-path, 27 nov 2026)

In Ajustes → Repos the person can type or paste a folder's path (a leading `~` meaning their home), press «Add this path» or Enter, and get the repo registered exactly as if the picker had returned that folder. A path that cannot be added says what happened, that nothing was added, and offers one button that fixes it, with the technical detail folded; nothing is written to `repos.json` on a refusal. The picker stays.

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

### Subagents (add-subagents-view, 10 nov 2026)

**In:** the two hook events, the description from the Agent tool, the list per workspace, the row
count. **Out:** reading a subagent's transcript or output (superseded by add-subagent-detail), stopping a subagent from Atril, subagents of
subagents shown as a tree, history past the next prompt.

**Never scoped out:** the hook payload is read once and only the listed fields leave it (as today).

### Subagent detail (add-subagent-detail, 10 nov 2026)

**In:** the file path in the entry (main only), the description from the meta, the subagent's log
as lines, the terminal modal and its refresh.

**Out:** writing to the subagent or stopping it; seeing the reasoning (`thinking`) inside; subagents of
subagents; logs of subagents from before this change (they have no path: the modal says there is no
log); colours per tool; searching inside the log.

**Never scoped out:** the window never sends a path: it asks by work id and subagent id and main
only reads the path the hook saved; the content is painted as text, never as HTML; the modal
is keyboard-operable (focus on open, Tab inside, Esc closes and returns focus to the row).

### Install from the doctor (add-doctor-install-terminal, 10 nov 2026)

**In:** the button, the handler in main, the status text, re-checking on regaining focus.

**Out:** choosing another terminal; watching the install inside Atril; detecting the end of the install;
installing several at once with one button; updating tools that are already there.

**Never scoped out:** the window only sends the tool's name and main runs only the
command from its list (W21); a failure to open Terminal is said on the item; the button is reached and
pressed by keyboard.

### Grafito palette (adopt-grafito, 10 nov 2026)

**In:** the `palette` field in the interface state, the selector in Apariencia, Grafito's tokens
in light and dark, the sketch.
**Out:** Grafito's typography, spacing, radii and icons; the Salvia, Arcilla and Ciruela variants;
changing the original palette.
**Never scoped out:** text contrast ≥ 4.5:1 in both palettes and both themes; the selector with
keyboard and readable state (`aria-pressed`).

### 24-step tutorial (expand-tour, 10 nov 2026)

**In:** the 24 steps, their texts and shortcuts, the missing `data-tour`s, the welcome.
**Out:** changing how the tutorial works (focus, positions, keyboard); videos or animations; a tutorial
per screen.
**Never scoped out:** English as the key and its Spain-Spanish entry in `i18n-es.ts`; keyboard-operable (W25).

### Quick replies (quick-replies, 10 nov 2026)

**In:** saving the first question's options in the state, the row's buttons, the sending.
**Out:** configurable answers; several questions; buttons in the panel, in «Qué me toca» or in the
notification (it already has its field, N3); focus mode (another change).
**Never scoped out:** the options' text is painted as text; it is sent only on press and to that
work's panel; keyboard; if the work is gone, «No se pudo enviar: ese trabajo ya no está» (N3).

### Focus mode (focus-mode, 10 nov 2026)

**In:** the focus state, the menu and shortcut, hiding the bar and «Qué me toca», the pill, jumping and returning,
suppressing the Mac notice with Atril in front.
**Out:** timed focus (pomodoro), silencing system sounds, focus in Tareas or MR, remembering the focus.
**Never scoped out:** no agent is lost: the pill names all who need you (the first one and
«+N»); with Atril behind, the Mac notice still comes; keyboard for everything.

### All agents (agents-overview, 10 nov 2026)

**In:** the «Todos» mode, the cards, their order, opening one, quick replies on the card.
**Out:** several terminals at once, drag to reorder, batch actions, filters.
**Never scoped out:** states with text (W22); keyboard: the cards are buttons and the arrows move
between them; focus mode (W77) remains single-work.

### Live QA (add-qa-lab, 10 nov 2026)

**In:** detecting the type, the button, the per-session MCP file, the QA panel, the screenshot list.
**Out:** recording video; running the project's own e2e suites; choosing AVD or simulator in Ajustes (the
QA Claude decides); comparing screenshots across versions; installing Xcode or the Android SDK.
**Never scoped out:** nothing launches without a press; Claude's global configuration is not touched; if `node`,
`adb` or `xcrun` is missing for that type, what is missing is said instead of launching; screenshots are painted as a local image.

### Pause an agent (pause-agent, 10 nov 2026)

**In:** pausing and resuming one, the «en pausa» state, the menu, ⌘⇧P, the card.
**Out:** pausing all at once; scheduled pauses; freeing quota (the session stays open).
**Never scoped out:** only on press; only to that work's panel; keyboard; the state is written as text (W22).

### Cost per work (cost-per-work, 10 nov 2026)

**In:** saving the transcript path, summing usage without duplicates with subagents, the price table, showing it.
**Out:** the subscription's real cost; budgets or spend alerts; history (goes with the history); the 5 h quota
per work.
**Never scoped out:** nothing leaves the Mac; transcript content is neither stored nor shown; it is read
at most every 30 s and only the new bytes.

### History (work-history, 10 nov 2026)

**In:** `createdAt` in new records, the line on removal, the «Terminados» section.
**Out:** reopening from history; searching or filtering; the exportable report (another idea); linked MR (Atril does not
store it yet).
**Never scoped out:** atomic write (W80); no content; keyboard in the section.

### First steps (first-run-setup, 10 nov 2026)

**In:** the card, its five steps read from real state, the buttons, «Ya lo tengo» remembered.
**Out:** installing tools from the card without the doctor; creating the token for the person; a modal wizard.
**Never scoped out:** keyboard; texts through `t()`; nothing is done without a press.

### Packaging (package-and-sign, 10 nov 2026)

**In:** the dependency (with `electron-winstaller` without install scripts), the configuration (and its `.cjs` globals in ESLint), the entitlements, the script, the install page.
**Out:** opening it on another Mac as a criterion, notarisation, automatic updates, x64, Windows/Linux, publishing the `.dmg`.
**Never scoped out:** no secret in the repo (the identity arrives through an environment variable); the hook's and
Libretto's resources inside the package.

### Libretto (libretto-view, 10 nov 2026)

**In:** the screen, the repo selector, the two lists, queueing, starting, ⌘K.
**Out:** `converge`, `retro` (next change); editing or deleting ideas (they are files); `libretto init`; reordering the
queue (the queue is FIFO and «Empezar» on any one already reorders).
**Never scoped out:** the commit touches only the new `proposal.md`, never other changes in the repo; nothing is written without a
press; texts through `t()`; keyboard; an empty request is not queued.

### Question card (ask-card, 10 nov 2026)

**In:** the card in Trabajo and in «Todos», the line to Libretto.
**Out:** answering with the number key; multiSelect questions (still without buttons, W76).
**Never scoped out:** keyboard; text contrast over the tint; texts through `t()`; colours as tokens.

### Manage the queue (queue-manage, 10 nov 2026)

**In:** editing, deleting with confirmation, sending to Jira, the ideas' description, the screen's new design.
**Out:** AI proposing ideas (`agent-suggestions`); editing changes in progress; choosing project or type in Jira.
**Never scoped out:** each commit touches only that idea's path; deleting asks for confirmation; the Jira token does not leave
main; if Jira fails nothing is deleted; keyboard; texts through `t()`.

### Quiet header (quiet-header, 11 nov 2026)

**In:** the header in Uno and in Todos, removing cost from the four views.
**Out:** deleting the cost calculation; changing the focus menu or shortcut.
**Never scoped out:** keyboard and accessible name of the icon button; texts through `t()`; colour tokens.

### QA screen (qa-screen, 11 nov 2026)

**In:** the screen and its entry in the bar and ⌘K, the per-criterion report, «Ver cómo», «Probar este», «Reprobar
todo», «Marcar como bug», removing QA from the panel.
**Out:** choosing platform, Apple's MCP, SDK emulator, Safari, improved detection and errors with their fix
(`qa-targets`); video; before/after review.
**Never scoped out:** the report is untrusted text (validated, never HTML); nothing is sent to Jira or the agent without a
press; the Jira token does not leave main; keyboard; texts through `t()`; states with a word, not only colour.

### QA: where it is tested (qa-targets, 11 nov 2026)

Inside: detection by root folder and subfolders 2 levels deep; `.atril/qa.json`; «Elegir a mano»; tabs; engine per platform; device reservation; errors with a fix at QA launch.

Outside: creating emulators on our own (only Terminal is opened with the command, the person launches it); physical devices; downloading Xcode; the rest of Atril's errors (another change); several QAs of the same work at once (still one, W84).

Never outside: validating `.atril/qa.json` (the repo writes it, not Atril); the window never sends a command, only the name of a fix; atomic write of the choices file.

### Clear errors (plain-errors, 11 nov 2026)

**In:** `src/main/usage.ts`, `src/renderer/components/Footer.tsx`, `src/main/doctor.ts`, `src/main/credentials/check.ts` and where Ajustes paints its error (`Connection.tsx`, `Ajustes.tsx`), the types in `src/preload/api.ts`, the IPC `atril:usage:fix`.

**Out:** the errors of «Quitar», the terminal that does not attach and stopped works (findings 7, 8, 10, 11, 31): they go in the next change, with the work's row. New automatic retries (W37 already spaces the quota's). Forge errors (GitHub/GitLab): they already say the cause.

### Shell PATH (login-path, 11 nov 2026)

**In:** `src/main/login-path.ts` (new), its call at startup in `src/main/index.ts`. **Out:** reading other shell variables (W51 limits the commands' environment to PATH, HOME, USER, LANG, SSH_AUTH_SOCK and TMPDIR; here only PATH changes).

### Copy with changes (dirty-copy, 11 nov 2026)

**In:** `openWorktree` (errors of W7 and W8, `worktree` option), IPC `atril:ws:open`, `OwnTaskDialog.tsx`, types. **Out:** the rest of the open and close errors: they go in the error sweep that comes out of the audit and the break-the-app test.

### Open and close without raw errors (ws-errors, 11 nov 2026)

**In:** `openWorktree` and `removeWorkspace` (`src/main/workspaces.ts`), a `forgetWorkspace` function, IPC `atril:ws:terminal` and `atril:ws:forget`, `Problem.tsx` (optional close button), `WorkspaceList.tsx`, `OwnTaskDialog.tsx`, `StartDialog.tsx`, types and i18n.

**Out:** «Volver a abrir» for a stopped work (finding 8, next change); Jira, MR, Libretto and Ajustes (still in the audit); renaming «Quitar».

### Model and effort (model-pick, 11 nov 2026)

**In:** `agent.ts` (`--effort`), `workspaces.ts` (the record's `effort` field), IPC for open and for Empezar (Jira), `OwnTaskDialog.tsx` and `StartDialog.tsx`, a `suggest.ts` in the renderer, `prices.ts` and `cost.ts`. **Out:** retrying with more effort (goes with «Volver a abrir», next change); models of Libretto's subagents (separate change); measuring models with real tasks.

### Reopen (reopen-work, 11 nov 2026)

**In:** `src/main/pty.ts` (W149), `reopenWorkspace` in `src/main/workspaces.ts`, `agentArgv({ resume: true })` in `agent.ts`, IPC `atril:ws:reopen`, the stopped view of `Workspace.tsx`. **Out:** relaunching all stopped ones at once; cut-off subagents (finding 12); restarting a live agent.

### Damaged state files (state-files, 11 nov 2026)

**In:** `src/main/state.ts` (new), `readRecords` and the reading of `repos.json` (`src/main/workspaces.ts`, `src/main/repos.ts`), the poll in `src/main/status.ts`, IPC `atril:state:reveal`, the sidebar (`WorkspaceList`/`Sidebar`), Ajustes → Repos, the new-work dialog. **Out:** `ui.json`, `qa-targets.json` (they already tolerate garbage), repairing the file automatically.

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

**In:** `src/main/net-problem.ts`. **Out:** who paints it (inbox, mr, settings).

### Libretto models (libretto-models, 11 nov 2026)

**In:** `scripts/bundle-libretto.mjs`, a `pinModels` function in `scripts/libretto-models.mjs` with its test, and the `resources/libretto/agents/*.md` copy rewritten with that function. **Out:** changing Libretto in its own repo; choosing the model per task at run time; measuring models with real tasks.

### Broken repos (repo-gone, 11 nov 2026)

**In:** `src/main/repos.ts` (repo health, remove, change folder), `src/main/workspaces.ts` (checks on open and close), new IPC, `src/renderer/settings/Repos.tsx`, `Problem.tsx` (`fixLabel`), i18n. **Out:** cloning a lost repo again; detecting that a moved folder is the same one by its remote.

### Terminal that does not attach (term-attach, 11 nov 2026)

**In:** `src/main/pty.ts` (`attach` returns the result), `src/main/index.ts` (`atril:term:attach`), `src/preload/{api,index}.ts`, `src/renderer/components/Terminal.tsx`, i18n. **Out:** opening the session in Terminal.app; repairing node-pty.

### Faster panel (fast-panel, 11 nov 2026)

**In:** src/main/status.ts, src/main/tmux.ts, src/main/activity.ts, src/main/workspaces.ts. **Out:** MR and Jira polls.

### Grafito: needs you (grafito-you, 11 nov 2026)

**In:** a new `--working` token in the four palettes of `src/renderer/styles.css`, used only by the «trabajando» label. **Out:** the Original palette.

### Clash radar (radar, 11 nov 2026)

**In:** `src/main/radar.ts` (new), IPC `atril:radar:get`, `src/main/flow/quiet.ts` (cap at 12), `src/renderer/components/WorkspaceList.tsx`, a `useRadar` in the window, i18n. **Out:** resolving the clash; warning across different repos; merge queue.

### Lessons for every agent (lessons-first, 11 nov 2026)

**In:** `src/main/agent.ts` (`agentArgv({ lessons })`), `src/main/workspaces.ts` (open and reopen), `src/main/jira/start.ts` (`proposeStart`). **Out:** the QA agent; writing lessons; summarising them.

### Where it gets stuck (stuck, 11 nov 2026)

**In:** `src/main/history.ts` (`historyEntry` gains `steps`), a pure function that computes them, the Terminados screen, i18n. **Out:** times of open works; MR times on the forge; charts.

### QA on the MR (qa-to-mr, 11 nov 2026)

**In:** `atril:qa:mrFor(id)` and a function in main that builds the text and publishes it through the forge API Atril already uses (`src/main/forge/threads.ts` or whichever posts general comments), IPC `atril:qa:publish(id)`, the button in `src/renderer/qa/QaScreen.tsx`, i18n. **Out:** uploading screenshots; editing a previous comment; publishing without a press.

### Notifications (main) (notify-core, 12 nov 2026)

**In:** `src/main/status.ts`, `src/main/avisos.ts`'s settings, `src/main/focus.ts`, new `src/main/notify.ts`, new `src/main/mrpoll.ts`, new `src/main/forge/outcome.ts`, `src/main/usage.ts`, `src/main/radar.ts`, `src/main/qa-report.ts`, `src/main/index.ts` wiring and IPC, `src/preload/**`, `resources/claude-hook.mjs`. **Out:** see `proposal.md` (summary on return, Dock badge, reviewer comments, 95 % quota, radar without a window).

### Read-only terminal (terminal-read-only, 14 nov 2026)

**In:** `src/renderer/components/Terminal.tsx`, `src/main/pty.ts` (attach), `resources/claude-hook.mjs` and `resources/summarise.mjs` (the `kind`, permissions, full questions), `src/main/status.ts` (state and answers), the card that replaces `QuickReplies.tsx` in the row, in the agents summary and above the terminal, the composer, IPC and preload, texts.

**Out (named):** the Agent SDK (next change); detecting background shell tasks (subagents only); ⌘D/⌘⇧D (removed); multi-select answered with buttons; «Permitir siempre»; changing Libretto; the QA terminals (stay as today, also read-only) beyond not accepting keyboard.

**Never scoped out:** the card and the composer are keyboard-operable (numbers 1–4 answer with the card focused, ⌘↩ sends the composer); the agent's text is painted as text, never as HTML; a failure to send follows the errors rule; nothing calls Claude on its own.

### Enforced rules (enforce-written-rules, 26 nov 2026)

**In:** `.githooks/pre-push` (new); `.claude/settings.json` and its guard script under `.claude/` (new); `CLAUDE.md` rewritten in English; `src/main/harness.test.ts` (new cases); `.agents/lessons.md` (one entry naming the written rules these hooks replace); the `Governs:` line of `workspaces` gains `.claude/** CLAUDE.md` (edited in the landing commit, since `land.py` does not touch it).

**Out (named):**
- Scanning the diff of every commit in a push: only the tip tree of each pushed ref is scanned. Brought back by an identifier that was added and removed inside one push.
- Other ways to build (`pnpm dist`, `pnpm exec electron-vite build`, `npx …`): the ask names `pnpm build` and `pnpm run build`. Brought back by a session that runs one.
- Preventing `git push --no-verify`: that is the person's own escape hatch.
- A CI copy of the scan (the list must not leave the machine).
- Guard false negatives: `pnpm -C dir build`, `pnpm --filter x build`, `(pnpm build)`, `$(pnpm build)`, `env X=1 pnpm build`, `sh -c "pnpm build"`. Brought back by a session that gets one through; this repo is not a monorepo.
- Guard false denies: `echo "a; pnpm build"` and a multi-line commit message with a line starting `pnpm build`. Costs one rephrased command.
- Evals, changes to Libretto skills, any change to `pre-commit`.

**Never scoped out here:** the list is read, never copied, logged or written anywhere by the hook; a scan error refuses the push; the guard's reason is one line a person can act on.

### Fewer go-on cards (fewer-go-on-cards, 26 nov 2026)

**In:** `resources/claude-hook.mjs` and a new `resources/keepgoing.mjs` (box count, prose question, block decision); `src/main/status.ts` (`done` state, dedupe); `src/main/index.ts` (V11 expiry skips `done`); `src/preload/api.ts` (`AgentState` gains `done`); renderer pieces keyed by `AgentState` (`StateLabel`, `Icon`, `agents.ts` order, `styles.css`, `AgentCard` for a question without options); `src/renderer/flow/DocModal.tsx` (F51, in `spec-flow-status.md`); V11 amended in `spec-avisos.md`; read and left as they are: `src/main/flow/document.ts` (`done` is not `working`, so saving is allowed) and `AgentsOverview.tsx` (no card or pause button for `done`); `src/preload/i18n-en.ts` («terminado»); tests; `bocetos/` per CLAUDE.md.

**Out:**
- A background shell started before the transcript tail the hook reads (64 KB), or one stopped without a `<task-notification>`: read as not running / still running respectively (Prior decisions).
- Automático's 3-press limit (W206) — unchanged; it now only meets turn ends from W218's fallback.
- A phrase list for «I am done» (decision log).
- Checklists in `tasks.md`/`plan.md`.
- Any Claude call to classify a stop: rules only.
- The hook command line in `src/main/agent.ts`: unchanged.

### QA pictures in the MR (add-pr-qa-pictures, 26 nov 2026)

In:
- `src/main/qa-report.ts`: the optional `view` on a step (W240).
- `src/main/qa.ts`: the QA prompt asks for `view` (W240).
- New `src/main/qa-pictures.ts`: picking, PNG rebuild, OCR, leak check (W241–W245, W252).
- New `src/main/forge/qa-hosting.ts`: GitHub orphan-branch writes, GitLab uploads, description read and write (W246–W248). It lives under `src/main/forge/` but is not in `mr`'s `Governs:` list, so `workspaces` governs it.
- `src/main/qa-publish.ts`: prepare and send, the views ledger, the fallback (W249, W250).
- `src/main/paths.ts`: one exported `userHome()` (the lint rule allows `homedir()` only there).
- `src/main/index.ts`, `src/preload/api.ts`, `src/preload/index.ts`, `src/renderer/mockApi.ts`: the `qa.preparePublish` / `qa.publish(id, token)` channels.
- `src/renderer/qa/QaScreen.tsx` and its CSS: the preview sheet (W251).
- `src/preload/i18n-en.ts`: every new string.
- `src/main/index.ts`: the dev-only `ATRIL_FAKE_QA_FORGE=1` in-memory forge (MR 41 for every work, writes to `$ATRIL_HOME/fake-mr.md`) for the real-app drive; OCR and the checks stay real.
- `bocetos/novedades.html`, `bocetos/fase1-nucleo.html` and a photo (outside git since 26 Nov).

Out (named so nobody adds them):
- Atril opening the PR itself, or editing the PR without the press.
- Any Claude call, including to describe pictures or detect «real data».
- Capturing a base-branch picture on demand (needs a QA run on the base branch).
- Blurring or redacting a blocked picture: it is blocked whole.
- JPEG or other formats: only PNG goes.
- Deleting old pictures from `atril-qa` or GitLab uploads.
- Pictures from more than the last shot of each criterion.

### Repo harness (repo-harness, 26 nov 2026)

**In:**
- `src/main/repoharness.ts` (detector, doc list) and `src/main/repoharness.test.ts`.
- IPC `atril:harness:get` and `atril:harness:doc` in `src/main/index.ts`; `src/preload/{api,index}.ts`; `src/renderer/mockApi.ts`.
- `src/renderer/harness/HarnessCard.tsx` and its test; one mount line and a toggle in `src/renderer/settings/Repos.tsx`.
- Texts through `t()` with Spanish in `src/preload/i18n-es.ts`.
- A dev-only snapshot view for the photo; `bocetos/novedades.html`, `bocetos/fase1-nucleo.html` and the photo (local files).
- The ten items:
  - Context: `memory` (`CLAUDE.md` or `AGENTS.md` at the root), `skills` (`.claude/skills/*/SKILL.md`).
  - Verification: `lint`, `typecheck`, `test` (scripts), `precommit` (hook file), `ci` (workflow files).
  - Guardrails: `hooks` and `permissions` (in `.claude/settings.json`), `prepush` (hook file).

**Out (named):**
- Any write, fix, install or scaffold; any Claude call; any git call made by the detector (the `get` handler reuses `repoHealth`, which the Repos list already runs, to decide missing or not-git).
- `.claude/settings.local.json` and user-level settings.
- Makefile, `pyproject.toml` and other task runners.
- Hook managers whose config is not a hook file (`.pre-commit-config.yaml`, `lefthook.yml`).
- Judging whether a lint script or CLAUDE.md is any good, or a score.
- A repo-wide summary screen, a badge elsewhere, caching, a watcher.
- Repos whose folder is missing or not git (their row already says so).

### CDP isolation (fix-cdp-isolation, 26 nov 2026)

In:
- `src/main/cdp.ts` (new): config, token in URLs, verification of its own target, the guard with retries.
- `src/main/index.ts`: replaces the bare `appendSwitch` line, runs the gate first in `whenReady`, and loads the real window through the token.
- `scripts/cdp-drive.mjs` (new): the one way a session attaches over CDP (`attachVerified`).
- `CLAUDE.md` «Photos» line shows the launch with `ATRIL_CDP_PORT` and `ATRIL_LAUNCH_TOKEN` and the `attachVerified` call, within W235's cap; a lessons entry; the `Governs:` hand edit.

Out, named so it is not added quietly:
- The `ATRIL_SNAPSHOT` photo: taken in-process with `capturePage` of its own window, it cannot attach to another Atril. Unchanged; with `ATRIL_CDP_PORT` also set, the gate applies like to any dev start.
- Launching Electron from the helper, picking a free port, `lsof` checks: the gate makes a wrong port fatal, so choosing one is no longer a safety matter.
- A `window` global, authenticating the DevTools endpoint, anything outside dev builds.

Never scoped out: the gate and the driver check are a trust boundary (what a driver may read); an error line never carries the token.

### Work vs main (#11, #10, #8) (work-vs-main, 26 nov 2026)

**In:** `src/main/workspaces.ts` (base choice, `workBase`, merged marks); `src/main/radar.ts` (base, merged, ids);
`src/main/index.ts` (boxes/boxdiff base, merged notices); `resources/branchsize.mjs` (size base);
`src/preload/api.ts` (`baseRef`, `merged`, `RadarHit.ids`); `src/renderer/agents.ts` (`stateOf`);
`src/renderer/components/WorkspaceList.tsx` (row); `src/renderer/mockApi.ts` if a fixture needs it;
`src/preload/i18n-es.ts` (new texts); tests beside each.

**Out:**
- Showing the base in the «New work» dialog (#11's alternative): the base is now right, so there is nothing to choose.
- Renumbering ids on landing (`scripts/land.py`) and telling the agent about reserved ids: Atril never types into an agent on its own.
- A Mac notice for shared ids (W182 stays files only).
- Asking the forge for a work's PR state: the notice and git already carry it.
- Closed (not merged) PRs: unchanged.
- Re-basing records made before this change: they keep `baseCommit` and no `baseRef`.
- `stageOf`, history, QA prompts: keep `baseCommit`.

### A merged work is finished (finished-means-finished, 27 nov 2026)

**In:** `src/main/status.ts` (`agentState`, the poll's done notice); `src/renderer/components/StateLabel.tsx`
(a `merged` prop), `AgentsOverview.tsx`, `Workspace.tsx`, `WorkspaceList.tsx` (pass it); tests beside each.

**Out:**
- Guessing «finished» from a turn end's words (see the decision log).
- Changing how a merge is detected (W306, W307), or asking the forge on a timer.
- Rewriting stale state files on disk: main reads past them.
- `closed` (not merged) PRs: unchanged.
- A new label text: «Merged» is reused.
- Expiring the work's stored notices on merge (V11, `avisos`).
- The header's reopen panel for a dead merged work.

### Card answer lands (card-answer-lands, 27 nov 2026)

**In:** `src/renderer/styles.css` (`.term-ask`, `.xterm-host`); `src/main/pty.ts` (the row floor); `src/main/tmux.ts`
(read a pane's text); `src/main/status.ts` (`answerLanded`, wrapping `answerAgent`); `src/main/index.ts` (the
`atril:status:answer` handler); `src/renderer/components/AgentCard.tsx` («Sending…»); `src/preload/i18n-es.ts`; `CLAUDE.md` (W339 under «Untested with real data»);
tests beside each.

**Out:**
- Recognising Claude Code's prompt by its text.
- Automático and the numbered Mac reply waiting for the answer to land.
- A column floor.
- The row's card and the «All agents» card layout (they are not above a terminal).
- Resizing an already-squeezed tmux window back up: the next fit after this change sends ≥ 10 rows anyway.

### Ignored files never decide the mode (#2) (ignored-files-not-dirty, 27 nov 2026)

In: `detectMode` in `src/main/repos.ts`; W1 and W2 amended and W400, W401 added (W1 said «none of the three signals»; the ignored-file signal was one of them, so two remain); the now-unused «{path} is not versioned» text and its Spanish entry removed; the W2 test replaced.

Out, named:
- Untracked, not-ignored files as a signal (never read today; not added).
- Copying ignored files (`.env`) into a new worktree: a different feature, not asked.
- W8's refusal on uncommitted changes in an in-place checkout: correct as it is.
- Any heuristic that tells «config» from «media» among ignored files.

### Add a repo by its path (#1) (add-repo-by-path, 27 nov 2026)

**In:** `addRepoByPath` and the path expansion in `src/main/repos.ts`; the handler `atril:repos:addPath` in `src/main/index.ts`; `repos.addPath` and the `PathProblem` type in `src/preload/{api,index}.ts`; the field, the button and the problem in `src/renderer/settings/Repos.tsx`; `repos.addPath` in `src/renderer/mockApi.ts`; the Spanish entries in `src/preload/i18n-es.ts`; the tests; this change's criteria.
**Out (named):** drag-and-drop; `~name` expansion; changing the picker's own error line (S13); changing «Find the folder…» (relocate); relative paths resolved against some working directory; autocompletion of the path; the `bocetos/` pages and a photo of them; a tour step.

**Never scoped out:** the path crosses the IPC boundary as an untrusted value (a non-string, empty text and a NUL byte are refused in main, before any git or file write); a refusal changes nothing on disk; the field is a native `<input>` with a label and the button a native `<button>`, so both are keyboard-reachable.

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

### Subagents (add-subagents-view, 10 nov 2026)

- The hook stays one script; the new events install alongside the existing ones in `agent.ts`' `HOOK_EVENTS`.
- Descriptions are text from Claude: shown as text, cut at 120 characters.

### Subagent detail (add-subagent-detail, 10 nov 2026)

- The format of the transcript and the meta is internal to Claude Code, undocumented: every field is
  checked by type and what does not fit is skipped, without breaking.
- No new dependencies; the modal reuses `useModalKeys` and the `modal`/`dlg` classes.
- Texts through `t()`, the key being the English text, with their Spanish in `src/preload/i18n-es.ts`; colours only as tokens.
- The hook still reads the payload once and takes from it only the listed fields.

### Install from the doctor (add-doctor-install-terminal, 10 nov 2026)

- No new dependencies; `osascript` ships with macOS.
- The command goes inside an AppleScript string: quotes and backslashes escaped.
- Texts through `t()`, the key being the English text, with their Spanish in `src/preload/i18n-es.ts`.

### Grafito palette (adopt-grafito, 10 nov 2026)

- Tokens overridden under `[data-palette='grafito']` and `[data-palette='grafito'][data-theme='dark']`,
  with the same names; `--ed-*` and `--jira*` are not touched.
- The state lives where `theme` lives (`src/main/ui.ts`, `UiState`), with its validation.

### 24-step tutorial (expand-tour, 10 nov 2026)

Every claim in a text must be true in the code: shortcut, button name, behaviour.
Texts through `t()`.

### QA: where it is tested (qa-targets, 11 nov 2026)

- The platforms are exactly `chrome | safari | android | ios`. W83 still classifies a folder; this calls it for each folder.
- Texts through `t()`, the key being the English text, with their Spanish entry in `i18n-es.ts`; colours only tokens.
- `QaResult` of `retest`/`stop` does not change; that of `launch` adds `problem`.
- Tests with a temporary `ATRIL_HOME` and `Runner` doubles; never a real emulator in the tests.

### Clear errors (plain-errors, 11 nov 2026)

- The OAuth token still does not leave main (W18): the sentence and the detail are fixed texts or a status number.
- The network's `err.message` never reaches the window (it may carry the request); only codes from a list (`ENOTFOUND`…) and the exception's name, in the detail.
- Texts through `t()` with their English entry; colours through tokens.

### Shell PATH (login-path, 11 nov 2026)

- No shell text leaves main or is logged; only the PATH value is kept.
- Startup waits no more than 3 s for the shell.

### Copy with changes (dirty-copy, 11 nov 2026)

- Nothing changes in the person's copy when it is rejected (W8 still holds).
- Texts through `t()` with English; the notice uses `Problem`.

### Opening and closing without raw errors (ws-errors, 11 nov 2026)

- The window never sends a path or a command: only ids that main looks up in its registries.
- The path main passes to Terminal goes inside escaped single quotes.
- Nothing changes on disk when a close is rejected (W9 and W10 still hold).

### Model and effort (model-pick, 11 nov 2026)

- Only values from a list reach the command line (W41: no text as a flag).
- Nothing calls Claude to make suggestions.

### Reopening (reopen-work, 11 nov 2026)

- The window sends the id and, at most, `more: true`; main decides the command.
- Never two sessions for one work: if the session exists, it is not relaunched.

### Damaged state files (state-files, 11 nov 2026)

- A state file that could not be read is never written over.
- The window asks to «show» by name (`workspaces` or `repos`), never a path.

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

- Neither status numbers nor exception names in the sentence.

### Libretto models (libretto-models, 11 nov 2026)

- The content of the agents is not touched except the `model:` line of the frontmatter.
- The copied Libretto version does not change (it is not re-packaged from another reference).

### Broken repos (repo-gone, 11 nov 2026)

- The window sends ids and, for «Buscar la carpeta…», nothing: main opens the native dialog.
- Nothing deletes or moves the person's folders.
- Every write of `repos.json` goes through the strict reader (W148).

### Terminal that does not attach (term-attach, 11 nov 2026)

- A failure leaves the client map as it was: nothing half-attached.

### Faster panel (fast-panel, 11 nov 2026)

- Nothing is shown more than 1 s stale relative to today.

### Grafito: needs you (grafito-you, 11 nov 2026)

- W72 still holds: the grey is neutral; text contrast ≥ 4.5:1.

### Clash radar (radar, 11 nov 2026)

- At rest, the radar launches no processes (it uses `quietly`).
- The window receives branches and repo-relative paths, nothing else.

### Lessons for every agent (lessons-first, 11 nov 2026)

- The sentence is fixed and comes from main (W41: nothing from the person as a flag).
- A symbolic link does not count (the agent is not asked to read something outside the repo).

### Where it gets stuck (stuck, 11 nov 2026)

- Computed only once, on close; no cost while the work is open.
- A work with no Libretto change has no segments: its row does not change.

### QA on the MR (qa-to-mr, 11 nov 2026)

- The token never leaves main; the window sends only the work's id.
- Comment texts go through `t()` in the app's language.
- Errors follow W150 (one sentence per cause, a button, folded detail).

### Notifications (main) (notify-core, 12 nov 2026)

- No detector runs `claude` or calls Anthropic beyond `usage.ts`'s existing poll.
- Every detector's first observation after Atril starts only sets its baseline (as V2 and the status first pass do).
- Notification texts are built with main's `t()` at the moment of showing (W48).

### Read-only terminal (terminal-read-only, 14 nov 2026)

- No change in `resources/libretto/**`.
- Texts through `t()`/`useT()`, the key being the English text, with their Spanish entry in `src/preload/i18n-es.ts`; colours only as tokens.
- Today's states without `kind` still hold (read as today, by prefix).
- After `notify-core`: this change is built on its branch, because both touch the hook and `status.ts`.

### Correction ladder (harness-ladder, 20 nov 2026)

- `pnpm lint` has to come out clean at the end of every box.
- Each rule carries a `message` saying what to use instead.

### Enforced rules (enforce-written-rules, 26 nov 2026)

- POSIX `sh`, git as the only dependency of the pre-push hook; no dependency added to the repo.
- The list lives at `$HOME/.config/atril/work-identifiers.txt`. Tests point `HOME` at a temp folder and never read the real list.
- `pnpm run prepare` already sets `core.hooksPath` to `.githooks` (W213); the new hook must be executable in git.
- The existing `pre-commit` and its test stay as they are.
- The guard is a `.sh` file with its JavaScript inline (`node -e`), so `eslint .` has nothing new to lint; `node` is already a requirement of the repo.

### Fewer go-on cards (fewer-go-on-cards, 26 nov 2026)

- No Claude calls from Atril; the hook decides from its payload, the transcript tail it already reads, and files in the repo.
- The hook command stays `ELECTRON_RUN_AS_NODE=1 <execPath> claude-hook.mjs <Event>`; it must never throw at Claude (existing outer `try`).
- Claude Code's Stop hook contract: stdout `{"decision":"block","reason":"…"}` with exit 0 makes Claude continue with `reason` as its instruction; the payload carries `stop_hook_active: true` when the stop follows a continuation caused by a stop hook, and `cwd`.
- The state file is rewritten whole on every event (atomic rename); any field that must survive (`turn`, `blocks`) is carried from `prev` by the hook.
- Text for Claude (the block reason) is English and never shown; `// i18n-ignore` is not needed in `resources/*.mjs` (not scanned), but «terminado» goes through `t()`.

### QA pictures in the MR (add-pr-qa-pictures, 26 nov 2026)

- Tokens stay in main; every forge request uses `forgeApi` with `redirect: 'error'` and a timeout, as `create.ts` does.
- Errors follow W150: what happened, what it stops, one fixing button; codes only in «Ver detalle».
- Every string through `t()` with its English entry; colours only as tokens.
- Lint: no `homedir()` outside `paths.ts`; renderer and main talk only through preload; `window.atril` only in `mockApi()`.
- Tests use a temporary `ATRIL_HOME`, a fake `fetch` and a fake runner; OCR is injected so tests never run `osascript`.
- macOS only (Atril is a Mac app); `osascript` and Vision ship with macOS.
- The description section is in the app's language, like W170's comment.

### Repo harness (repo-harness, 26 nov 2026)

- The detector is deterministic file reading only: no `child_process`, no network. The only process is `repoHealth`'s `git rev-parse` in the `get` handler, the one the Repos list already runs; the only network is the browser open for a doc.
- Repo files are untrusted: lstat every segment, never read through a link that leaves the repo, cap each file read at 1 MB, never throw on bad JSON.
- The window sends a repo id or an item id, never a path or a URL.
- Texts via `t()` (S16, S19 scan them); colours only as tokens; a tick or a gap is never conveyed by colour alone.
- Tests use a temp folder repo and the temp `ATRIL_HOME`; never a real repo of the person.
- The lint rule keeps renderer and main apart: they talk through preload.

### CDP isolation (fix-cdp-isolation, 26 nov 2026)

- Electron cannot report that Chromium failed to bind `remote-debugging-port`: it only logs. Detection has to be by asking the port.
- `src/main` and `src/renderer` cannot import each other (W210); `src/main` takes no `homedir()` (W212). Dev-only stderr lines are English and need no UI text.
- Tests run with no Electron: logic is plain functions over injected `fetch`, `sleep`, `err` and `exit`, or over a real `node:http` server on port 0.
- Module-level code that runs before `whenReady` (secret store, crash hooks) still runs; they do no network or agent work before their gates.
- `pnpm build` is never run (W233).

### Work vs main (#11, #10, #8) (work-vs-main, 26 nov 2026)

- Every git call through the `Runner`; the fetch with a 15 s timeout so a dead network cannot hang «New work».
- W167/F46: a quiet work spawns nothing: the merge-base is computed inside the work's `quietly` cache (its watcher sees `refs/` of the common dir, so a fetch invalidates it).
- W46: the hook's count equals the panel's total for the same tree, so both use the same base.
- `src/main/flow/**` belongs to flow-status and does not change: the base is resolved before calling it.
- Texts through `t()` with the English key; Spanish in `src/preload/i18n-es.ts`.
- Reading `.agents/changes/*/*.md` of a worktree: `lstat`, no links followed, files over 1 MB skipped.

### A merged work is finished (finished-means-finished, 27 nov 2026)

- W313 already holds in the window; main must agree with it, so the two never disagree on one work.
- No new process per poll: `merged` is on the record `listWorkspaces` already reads.
- Texts through `t()`; no new key.

### Card answer lands (card-answer-lands, 27 nov 2026)

- tmux's window follows the attached read-only client's size; nothing else resizes it from Atril.
- `answerAgent` stays as it is: W75's proofs, Automático and N3 rely on its immediate answer.
- No new process per poll; the extra `capture-pane` calls happen only during a card answer (at most 9).
- Texts through `t()` with Spanish entries; colours untouched.
- An IPC handler never throws (W149).

### Ignored files never decide the mode (#2) (ignored-files-not-dirty, 27 nov 2026)

- Same `Runner` seam and `git ls-files` call stay: W3 still needs the ignored folders for its size count.
- Texts through `t()`; a removed text leaves no orphan in `src/preload/i18n-es.ts` (checked by `rg` for the key in `src`).
- No new dependency.

### Add a repo by its path (#1) (add-repo-by-path, 27 nov 2026)

- Main reads the home only through `userHome()` (`paths.ts`); `pnpm lint` forbids `homedir()` elsewhere (W210/W212).
- The window and main talk through preload only; the window sends the typed text and nothing else (W158's rule: it never decides what is a folder).
- Texts go through `t()`/`useT()`, the key is the English text, its Spanish entry lives in `src/preload/i18n-es.ts` (S16/S19 scan for it).
- Errors follow the rule in CLAUDE.md: what happened, what Atril can't do because of it, one button that fixes it, the code only under «Show detail» (`Problem`).
- No new dependency, no Claude call; tests use a temp `ATRIL_HOME` and a temp `HOME`, never the person's repos.
- `repos.json` is written only through `registerRepo` (atomic, W148 refuses to overwrite a damaged file).

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
- Q: If you close Atril (or it hangs) with agents working, what happens to them? → A: They stay alive (tmux)
- Q: For the Claude quota meter, may Atril read your OAuth token from the Keychain and ask api.anthropic.com how much you have used? → A: Yes, like the statusline
- Q: A new worktree does not bring the files git ignores; what does Atril do when creating one? → A: «No más preguntas», and afterwards: «worktree si pero en alguno proyecto es imposibole por que son muyc complejos de hacer asi que tiene que saber cuando puee o no»
- Q: What does Atril do when a repo cannot go in a worktree? → A: it detects it with review-project's three signals (unversioned files the build needs, dependencies too heavy, «el usuario lo dijo») and works in-place switching branch, with guaranteed restore; it says the mode and why (assumed, from the previous answer). If false: changes W1–W4 and W7–W9.
- Q: Where do the worktrees live? → A: `~/.atril/wt/<repo>/<branch>` (assumed). If false: only the path changes.
- Q: Who is the app for? → A: one person, their Mac, their CLIs already configured; no server or account (assumed). If false: all synchronisation remains to be designed; the team view comes later.
- Q: How does Atril know an agent needs you? → A: in Claude, with hooks Atril passes through `claude --settings` that write the session's state; in Codex, in this phase only «trabajando/parado» (assumed). Codex's `notify` could not be verified: the CLI is broken on this machine (`codex --help` → ENOENT).
- Q: How is a Jira ticket's repo known? → A: it is asked the first time per project and component and remembered (assumed). If false: changes I4.
- Q: How should it look? → A: «el diseño que sea mas abierto y mas visual, aparte añade tutorial al principio señalando cada elemento ye xplicando como funciona todo»
- Q: How do we draw each agent's split panes (⌘D)? → A: tmux draws them. Discarded: «Tarjetas separadas (control mode)» — a parser for the -CC protocol, per-pane resize and focus, much more code; «Una sesión por panel» — tmux stops knowing the panes belong to the same work and the layout moves to Atril, changing the spec's vocabulary.
- Q: The reviewer found gaps that would break the code; how do we proceed? → A: Fix them, then box 1
- Q: (W10) What happens when removing a worktree with uncommitted work? → A: it is never deleted, even when confirmed; Atril says to commit or discard first (assumed, by the rule «nothing is deleted with uncommitted work»). If false: changes W10.
- Q: (build, box 1) tmux and jira do not accept `--version` → A: each tool with its own command: `tmux -V`, `jira version`, `--version` for the rest (spec correction: the contract was wrong, observed when rendering)
- Q: (build, box 2) your two repos came out in-place because of ignored folders (`out/`, `.atl/`, `.claude/`, `bin/`) → A: only ignored files count, never folders (spec correction, observed in the real repos); the repo id is the lowercase basename with hyphens
- Q: Does Libretto come inside the app? → A: «Libreto estará puesto directamente en la aplicación, ¿no? Es decir, la gente no se tendrá que bajar el libreto oficial, sino que ya estará oficialmente metido dentro del sistema.»
- Q: «Para que sea más usable y todo esto, ¿qué mejorarías?» → proposals 1 (without Claude's trust question in every worktree) and 6 (the doctor as a chip) to phase 1, the rest to another change → A: «si»
- Q: Codex? → A: «no pongas codex»
- Q: «Pero Claude tiene que cargar las propias skills que se le vayan metiendo también, aparte del libreto. ¿Eso lo hace?» → A: yes, observed in box 4 (`(user)` and `(libretto)` at once); it becomes criterion W33 and skipping the user's is forbidden
- Q: Own tokens instead of gh/glab/jira? → A: «Pensaba poner los tokens, o sea, los tokens de GitLab, GitHub y de Jira, no utilizar los GH y cosas de estas» → hybrid proposal → A: «Yo lo haría. Yo lo haría, vale, híbrido, pero si no encuentra nada de token ni nada, una sección de ajustes donde pongan el token … pero ocultos, ¿sabes? O sea, cuando una vez que lo ponen, que ya no se puede visualizar.» (replaces the decision «Jira only through the CLI» for what Atril reads; Libretto's agent keeps using the `jira` CLI)
- Q: GitLab and GitHub in phase 1? → A: «Y hacemos solo la fase 1 núcleo»
- Q: «Cuando se crea una nueva tarea, que se pueda elegir qué modelo utilizar … Cuando haces empezar … utiliza este modelo» → A: Model selector in Start and New work: Default · Opus · Sonnet · Haiku (no Fable, because of cost); the model is saved in the workspace record
- Q: the code folder `src/main/secrets/` clashes with your global rule `Read/Edit(**/secrets/**)` → A: «si» to renaming it `src/main/credentials/` (the rule stays intact; Pau ran the `mv`)
- Q: branch name → A: «Las ramas del proyecto suelen ser el nombre de la tarea. Por ejemplo, pf-4870 … suele ser referenciado con la tarea del Jira» (in the repos: the key in capitals, and a letter B/C… for a second attempt)
- Q: A better name than Atril? (proposed Batuta, Podio, Concertino, Ensayo) → A: «atril»
- Q: «Haría que cogiera el icono del Tira o del GitHub o del GitLab … para mostrar como arriba como una sesión … saber que soy yo el que está en esa sesión de atril» → A: session chip at the top with the Jira avatar and name in phase 1; GitHub and GitLab are added in phase 2
- Q: «no obtiene ninguna tarjeta de Jira» — 0 tasks in open sprints, 24 open assigned (WEB, SHOP, APP) → A: «Todas, por estado»: To start, In progress, and Code Review/Testing/Ready to Deploy folded
- Q: «quiero también efecto oscuro y efecto plano y que uno sea automático del sistema» → A: Light, Dark and Automatic (follows the system) theme, selectable in Settings; Automatic by default
- Q: the Jira list covers the works in progress → A: «Jira en su propia pantalla»
- Q: keep asking? → A: «de crear tareas y hacer cosas para mejorar este proyecto, que no se apague el ordenador, y tú sigue trabajando, ¿vale? No le preguntes, tú sigue.» (from here on, decisions are marked `(assumed)`)
- Q: What does Start do with a task that is already «En curso»? → A: it does not move it in Jira and says so («ya está en curso») (assumed, box 12). If false: I8 would always attempt the transition.
- Q: When is a Jira project's repo remembered? → A: only when the work opens successfully (assumed, box 12). If false: a failure to open would also remember it.
- Q: Does the footer show the 5 h reset? → A: only the 7-day one, rounded to the minute (assumed, box 8).
- Q: How does Atril avoid Claude's trust question? → A: Claude Code 2.1.319 has no flag for that; Atril writes `projects[<path>].hasTrustDialogAccepted` into `~/.claude.json` atomically, with retry and a per-start copy, only in folders Atril creates (assumed, box 14). Verified: without the key the question appears, with it not.
- Q: Does the Jira avatar carry the token? → A: only if the image is on the same domain as Jira; Atlassian's avatar CDN is public (assumed, box 14).
- Q: the footer showed «api.anthropic.com respondió 429» (bug observed 9 nov: Atril and the statusline query the same API) → A: keep the last good value with its age and space out retries (assumed, W37)
- Q: Is a copy of `~/.claude.json` kept before writing the trust? → A: no; it may contain other secrets (MCP server keys). The atomic write with retry protects it, and an unreadable file is never written (assumed, cold review 9 nov). If false: a copy returns, but outside `~/.atril` and encrypted.

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
- Q: How does the hook read the JSON without node or jq on the PATH? → A: with Atril's own Electron as Node (`ELECTRON_RUN_AS_NODE=1 <execPath> claude-hook.mjs`), verified 9 nov (assumed).
- Q: Where is the activity shown? → A: «Libretto | Actividad» tabs in the right panel, and the last line in each work's row (assumed).
- Q: What is stored? → A: only one summary line per event (≤ 200 characters), never the payload: for Edit/Write only the path, for the prompt only the first 80 characters; the last 200 lines per session (assumed).
- Q: (spec-reviewer) What does the body of the Mac notification carry and where does it come from? → A: with Notification, the agent's message; with Stop, the «Claude dice: …»; the hook writes that text into the same state file (`{state, at, text}`) that triggers the notification, so there is no ordering between two files (assumed).
- Q: (spec-reviewer) Do tool events change the state? → A: yes: PreToolUse and PostToolUse set `working` (approving a permission makes the agent go back to working) (assumed). Extends W26.
- Q: (spec-reviewer) What line does UserPromptSubmit leave? → A: «Le has escrito: <primeros 80 caracteres>» (assumed, A8).
- Q: (spec-reviewer) What is a «failed» Bash? → A: an exit code other than 0, an error or an interruption in the tool's response, whichever comes (assumed).
- Q: (work-reviewer) this branch's `.gitignore` (`.DS_Store`, `caso-*`, `flujo-mr*`) is not covered by the contract → A: it comes from another request from Pau, making the repo private («Cambian el nombre. Ponlo en privado y que se llame Atril»); the old concept's files carry work data and must never be pushed.
- Q: (work-reviewer) can a subagent's description carry prompt-like text? → A: yes; same 80-character limit as the prompt (assumed).

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
- Q: What goes into «Qué me toca»? → A: agents in «te necesita» (oldest first), then tasks from the board's first column (or «Por empezar» with no board); MRs arrive with phase 2 (assumed).
- Q: How do you reply from the notification? → A: a macOS notification with reply (`hasReply`); the text is typed into the agent's panel with `tmux send-keys -l` and Enter, only in that panel (assumed).
- Q: (spec-reviewer) Which tasks go into the list? → A: only those that do not already have an open work; if the board cannot be read (I18), those of the «Por empezar» group (assumed).
- Q: (spec-reviewer) Where does ⌘↩ work? → A: only with Work or Tasks in view and with something in the list; otherwise the menu item is disabled (assumed).
- Q: (spec-reviewer) Does replying in the notification count as clicking it (W38)? → A: no: replying does not bring Atril to the front or change screen; only clicking the notification does (assumed).
- Q: (spec-reviewer) And if the work no longer exists when replying? → A: nothing is sent and a notification says «No se pudo enviar: ese trabajo ya no está» (assumed).
- Q: (work-reviewer) ⌘↩ on a task the window had not yet loaded did nothing → A: it opens Tasks, which reloads Jira on mounting (assumed, N2).

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
- Q: How much is «large»? → A: more than 400 changed lines (added + deleted) against the work's base, `chained-pr`'s threshold; and again at 800, 1200… (assumed).
- Q: What counts? → A: the same as «Cambios» (F18): committed, uncommitted and new untracked that git does not ignore; a binary counts 0 (assumed).
- Q: When is it checked? → A: after every Edit, Write, MultiEdit or Bash (PostToolUse); other tools do not change files (assumed).
- Q: What is Claude told? → A: an `additionalContext` in Spanish: the size, the threshold, and that at its next natural stop it should ask with AskUserQuestion whether to split into chained MRs (`chained-pr` if present) or carry on; that it must not split without asking (assumed).
- Q: And if Atril cannot find the work? → A: the hook says nothing; it never bothers Claude (assumed).

- Q: (spec-reviewer) A jump from 0 to 900? → A: a single note; the thresholds up to the one reached are marked as notified; only a higher threshold notifies again (assumed).
- Q: (spec-reviewer) Is the number exact? → A: yes, F18's total, without cutting the count short (assumed).
- Q: (spec-reviewer) Two hooks at once? → A: each threshold is claimed by creating a file exclusively (`wx`); at most one note per threshold (assumed).
- Q: (spec-reviewer) Does the notice promise a question that will no longer come? → A: the text says what already happened: «Atril le ha pedido a Claude que te proponga separarla» (assumed).

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
- Q: What appears in the palette? → A: screens, works (by branch and repo), MRs from the last load (title and project), Jira tasks (key and title) and actions: New work, New task, Refresh MRs, Mark notifications read, Tutorial (assumed).
- Q: How does it filter? → A: every word typed must appear in the item's text, ignoring case and accents; at most 50 results (assumed).
- Q: How is it opened? → A: ⌘K as a menu accelerator, like ⌘↩, so the terminal does not swallow it (assumed).
- Q: (spec-reviewer) workspaces lists ⌘K under «out of scope» → A: this change takes it out of there when integrated (assumed).
- Q: (spec-reviewer) ⌘K with another dialog open? → A: it does nothing (assumed).
- Q: (spec-reviewer) Does a task from the palette start by itself if the repo is remembered? → A: it does the same as pressing Start in Tasks (I20/I21): it is your action, as there (assumed).

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
- Q: What does automatic launch? → A: `/libretto:libretto-attacca`, Libretto's mode without stops: same phases, nothing to maintain in Atril (assumed).
- Q: attacca pushes and opens the MR by itself; do we leave it? → A: no: in automatic Atril asks for confirmation before `git push`, `gh pr create` and `glab mr create`, with Claude Code's permission («ask» from the hook); I told Pau when queuing it (assumed).
- Q: New work without text? → A: no mode: it is plain Claude (assumed).
- Q: Default? → A: Manual, as today (assumed).
- Q: (reviewer) Start's direct click (I20)? → A: always Manual; ⌥-click opens the dialog with the choice (assumed).
- Q: (reviewer) The `mode` field? → A: it already exists (in-place/worktree): new field `auto` (assumed).
- Q: (work reviewer) The regex did not see `bash -c "git push"`, `/usr/bin/git push`, `--no-pager`… → A: any `git … push` in one segment; a «push» in a commit message only adds a question (assumed).
- Q: (reviewer) F15 versus F26? → A: F26 is the exception and its text wins; only the document editor (assumed).

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
- Q: Where do they come from? → A: from Claude Code's `SubagentStart`/`SubagentStop` hooks (`agent_id`, `agent_type`) and from the `Agent` tool's PreToolUse (`description`, `subagent_type`); documented at code.claude.com/docs/en/hooks (assumed).
- Q: Is the subagent's transcript read? → A: no: neither quota nor content, only the events (assumed).
- Q: How long do finished ones stay? → A: until the person's next message (UserPromptSubmit), at most 20 (assumed).
- Q: Claude Code's internal agents (empty agent_type)? → A: ignored (assumed).
- Q: (reviewer) Does Agent's PreToolUse stop marking «working»? → A: no, it stays the same; only SubagentStart/Stop do not touch the state (assumed).
- Q: (reviewer) No subagent_type? Pending ones that never pair? → A: counts as general-purpose; pending ones expire after 10 min (assumed).
- Q: (reviewer) Units and format? → A: epoch seconds; «45 s», «1 min 20 s»; a finished one shows the duration (assumed).

### Subagent detail (add-subagent-detail, 10 nov 2026)

- (add-subagents-view, 10 nov) «Events only» and «Pairing by order» are superseded: Pau asked on
  9 nov to see what the subagent does as a terminal and to delete the pairing (assumed in the how).
- The path lives in `$ATRIL_HOME/subagents/<session>.json` and does not leave main (assumed).
- 1 s polling refresh only with the modal open (assumed); ceiling: it rereads the whole file,
  switch to reading the tail when a log weighs several MB.
- At most 500 lines in the modal (assumed): a long subagent shows its end.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| `fs.watch` per subagent file and pushing lines | One watcher per modal, which has to be closed properly, to gain less than 1 s of latency. |
| Locating the file via `~/.claude/projects/<encoded path>/*/subagents/` | One more internal rule (the path encoding) and a glob over sessions. |
| xterm.js in the modal | Without input it adds nothing and brings another live terminal with its own size. |
| Keeping the pairing by order for the description | It gets swapped with two of the same type at once; the meta gives the real one. |

#### Decision log, answers as given (2026-11-10)
- Q: Where is the subagent's file? → A: the hook derives it at SubagentStart from `transcript_path` (a documented field of every hook): `<transcript_path without .jsonl>/subagents/agent-<agent_id>.jsonl`, checked on disk with today's Claude Code; it is stored in main and never reaches the window (assumed). If the format changes, the modal comes out empty and the list stays the same.
- Q: Is the pairing by order deleted? → A: yes, as the proposal asks: the description comes from `agent-<id>.meta.json`; without a meta, only the type (assumed). If the meta stops existing, the descriptions are lost, not the list.
- Q: A real terminal (xterm) or text that looks like a terminal? → A: read-only monospaced text in Claude Code's style; xterm adds nothing without input (assumed).
- Q: How live? → A: the window asks for the log every second while the modal is open and the subagent is working; main rereads the file (assumed). Ceiling: files of several MB; read only the tail if it weighs.
- Q: What is drawn? → A: the assignment (`> ` and its first 3 lines), assistant text with `⏺`, `⏺ Tool(arg)`, `⎿` with the first 3 lines of the result and «… +N líneas», and «✻ Pensando…» without its content; at most the last 500 lines (assumed).
- Q: (phase 5) How is it built? → A: path saved by the hook + on-demand read in main + polling from the modal (assumed). Lost: one `fs.watch` per subagent file (more state and leaks per modal to gain less than 1 s) and finding the file by the work's path encoded in `~/.claude/projects` (depends on one more internal rule and fails with in-place works).

- Q: (spec reviewer) Several slacks in the contract → A, all (assumed):
  - An old entry without `transcript` keeps the stored `description`.
  - A meta without a text `description` counts as an absent meta.
  - A meta that does not exist yet is reread at the next change of the entries file. At the latest, at SubagentStop.
  - The cap of 500 counts `SubagentLine` items, not drawn rows.
  - N is the number of hidden lines.
  - The assignment is the first `user` with text content (a string or its first `text` block).
  - A tool without a text argument is drawn `Name`.
  - `is_error` is not distinguished.
  - When `endedAt` arrives, the log is requested one last time.
  - If the entry disappears, the modal closes.
  - A freshly launched subagent without a file says the same as one without a log.
  - Continuation lines carry no prefix and are indented.

### Installing from the doctor (add-doctor-install-terminal, 10 nov 2026)

- Terminal.app via `osascript` (assumed, 10 nov). Ceiling: a person with another terminal sees Terminal.app;
  a setting is added when someone asks for it.
- Only names from the list cross the IPC (assumed, 10 nov): W21's list is the only source of
  commands.
- Recheck on regaining focus, without following the installation (assumed, 10 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Terminal inside Atril with xterm and a pty | No pty outside tmux, which may be what is missing; `sudo` and macOS dialogs work better outside. |
| The window sends the command | It would open the execution of any text from the renderer. |
| Polling the doctor every 5 s | More state for what focus already solves when you come back. |

#### Decision log, answers as given (2026-11-10)
- Q: Which terminal? → A: Terminal.app via `osascript` (`activate` + `do script`): it ships with macOS and the person sees and answers whatever the installer asks (password, Xcode licence) (assumed). If Pau uses another (iTerm, Ghostty), a setting is added.
- Q: A terminal inside Atril (xterm + pty)? → A: no: an installer that asks for `sudo` or opens a macOS dialog works better in a real terminal, and Atril has no pty outside tmux, which may be exactly what is missing (assumed).
- Q: How does Atril know it finished? → A: it does not: when Atril's window comes back to the front (focus), the doctor checks again and the notice updates or disappears (assumed). If that is not enough, a 5 s poll while an installation is launched.
- Q: (phase 5) How is it built? → A: an `atril:doctor:install(tool)` handler that only accepts names from the list and a focus listener on the window (assumed). Lost: passing the command from the window (it would open a door to run anything).

- Q: (spec reviewer) Slacks in W70/W71 → A, all (assumed):
  - It is rechecked on every focus while anything is missing, whether Install was pressed or not.
  - After each check, the tool that is still missing shows «Instalar» again and its error is cleared.
  - Only tools with a command carry a button.
  - With the pop open, the list updates in place and the pop leaves with the notice when nothing is missing any more.
  - The escaping is tested with an exported function, because no command in the list carries `"` or `\`.

### Grafito palette (adopt-grafito, 10 nov 2026)

- Grafito chosen by Pau among four minimalist variants, as an additional palette (10 nov).
- Original by default (assumed, 10 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Replacing the original palette | Pau wants it as an additional theme. |
| A single list of five themes (Light, Dark, Auto, Light Grafito, Dark Grafito) | It mixes two axes; Automatic would stop making sense for Grafito. |

#### Decision log, answers as given (2026-11-10)
- Q: Does it replace the original? → A: «ponlo como tema mas el original que ya tenemos».
- Q: How does it combine with Light/Dark/Automatic? → A: they are two independent choices: Palette
  (Original · Grafito) and Theme (Light · Dark · Automatic); Grafito has light and dark (assumed).
- Q: Default? → A: Original, so as not to change anyone's app without being asked (assumed).
- Q: Colour only, or also typography, density and radii? → A: only the palette; the rest, separately if
  Pau asks (assumed).
- Q: «te necesita» in Grafito? → A: in the accent, as in the sketch (assumed).
- Q: The editor (`--ed-*`) and Jira? → A: they stay the same in both palettes (assumed).

- Q: (spec reviewer) Slacks → A, all (assumed):
  - W35 is amended: colours live only in the four token blocks (two for Original and two for
    Grafito), and Grafito's override keys that already exist. The test is not weakened.
  - The accent also has a chroma cap, 0.13.
  - An `rgba()` token is classified by its colour.
  - «Al momento» means on the same click, without waiting for main.
  - An unknown value is normalised by main when reading `ui.json`.
  - The sketch and the photo have no criterion: they are drawing and evidence.
  - «Paleta», «Original» and «Grafito» go through `t()`.

### 24-step tutorial (expand-tour, 10 nov 2026)

- Pau, 10 nov: «tiene que ser más extenso… dejas muchas cosas en el aire», in Spain Spanish.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| A short tutorial per screen | Pau asked for a longer one; splitting it leaves pieces unseen. |
| Opening real dialogs during the tutorial | It touches the engine and may leave state half-done. |

#### Decision log, answers as given (2026-11-10)
- Q: How many steps? → A: 24, one per piece that is used, in the order it is used: Work, its panel,
  Tasks, MR, Notifications, the top and bottom, Settings (assumed).
- Q: What does each step say? → A: what it is, how it is used and what happens when used, in 2–3 sentences of
  Spain Spanish, with its shortcuts; every sentence has to be true in today's code (assumed).
- Q: Steps for things that are not always there (subagents, tools, the mode dialog, ⌘K)? → A: they are
  explained all the same: if there is no element, the step comes out centred, as the tutorial already does (assumed).
- Q: The welcome? → A: «Enséñamelo · 3 min» (assumed).

- Q: (spec reviewer) Slacks → A, all (assumed):
  - Each text has **2 or 3 sentences**; a sentence ends in «.», «?» or «!» followed by a space or the end.
  - start-mode and palette never have an element: the test checks they come out centred, without focus. The
    other six optional ones are given in the mock when practical.
  - Step 11 lights up the Activity tab, which is always visible.
  - Step 18, «the new check», is the one done when focus returns to Atril.
  - The `data-tour` attributes on routes of other capabilities are only attributes serving the tutorial, which belongs to
    workspaces; no spec is written in those capabilities.
  - The welcome says «Enséñamelo · 3 min» and goes into W23.
  - The «Out» of add-command-palette about a tutorial step for ⌘K is superseded by this change.
  - Photos: steps 7 and 13, in `bocetos/novedades/tutorial-7.png` and `tutorial-13.png`.

- Q: (builder) Without an element the step came out in a corner, not centred as W23 asks → A: `.tip.centred` and a line in
  `Tour.tsx` are added; the only change to the engine, in favour of W23 (assumed). The texts
  were corrected where the table was not true: New task opens a work (it does not create in Jira), the number of the
  rail without colour, the subagent log «como una terminal», the quota's weekly reset.

### Quick replies (quick-replies, 10 nov 2026)

- Only the first question (assumed, 10 nov); ceiling: the others, in the terminal.
- The option's number as a key (assumed, 10 nov); ceiling: Claude Code's internal format.
- Fixed replies «Sí, sigue» / «No, espera» (assumed, 10 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Always typing the option's text | In Claude Code's selector it chooses nothing. |
| Buttons in the Mac notification | macOS only allows a reply field; it already exists (N3). |

#### Decision log, answers as given (2026-11-10)
- Q: What for? → A: to run 3 works at once without losing focus: answer an agent from
  its row without opening its terminal (Pau, 10 nov) (assumed).
- Q: Which replies? → A: if the question is from `AskUserQuestion` (with options), its options; if not,
  two fixed ones: «Sí, sigue» and «No, espera» (assumed).
- Q: How is an option sent? → A: by typing its number (1, 2…) and Enter in the agent's panel, which is
  how it is chosen in Claude Code's selector (assumed; internal format: if it changes, the text of
  the option is typed). A fixed reply is typed literally, like N3.
- Q: Where? → A: in the work's row in «Trabajo en marcha», under «Te pregunta: …»; nothing in the
  panel or other screens in this change (assumed).
- Q: Several questions at once (`questions` with more than one)? → A: only the first; the others are answered
  in the terminal (assumed).

- Q: (spec reviewer) Slacks → A, all (assumed):
  - **What the window sends.** Only `{ option: n }` or `{ fixed: 'yes' | 'no' }`. Main translates `yes` to «Sí,
    sigue» and `no` to «No, espera». It never types text that comes from the window.
  - **What main checks on press.** It rereads the work's state. If it is no longer in needs-you, it answers
    «Ese agente ya no está esperando una respuesta.». If the option is not among the stored ones, «Esa
    opción ya no existe.».
  - **multiSelect questions.** They carry no option buttons or fixed replies; they are answered in the
    terminal. «Other» is not offered.
  - **How long the options last.** They are stored while the state stays needs-you, also if a
    Notification or a Stop arrives, and are deleted as soon as the state changes to another.
  - **After sending.** The row says «Enviado» and the buttons stay disabled until the state
    changes.
  - **Where the buttons go.** Only in the row. The Reading line that speaks of the panel and the notification is
    superseded.
  - **Tutorial.** Step 4 («Trabajo en marcha») names the quick replies without exceeding 3 sentences.

### Focus mode (focus-mode, 10 nov 2026)

- Focus is not remembered across restarts (assumed, 10 nov).
- With Atril in the background, the Mac notification still appears (assumed, 10 nov).
- ⌘⇧F and ⌘⌥← as shortcuts (assumed, 10 nov; free in the menu).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| A separate window per work | It breaks the single window and duplicates the terminal. |
| Silencing all notifications in focus | With Atril in the background you would lose the agent that needs you. |

#### Decision log, answers as given (2026-11-10)
- Q: What is focus mode? → A: you are in a work and Atril removes everything else from view: the sidebar and
  «Qué me toca» are hidden; that work's terminal and Libretto panel stay (assumed).
- Q: How do you enter and leave? → A: menu Work → Focus mode, ⌘⇧F, and a «Salir del foco» button at the top; it is not
  remembered across restarts (assumed: focus is for a moment).
- Q: And if another agent needs you? → A: with Atril in front, instead of the Mac notification a discreet
  pill appears at the top, «{rama} te necesita», which does not switch your work; with Atril in the background, the Mac notification
  appears as always (allows replying, N3) (assumed).
- Q: How do you jump and come back? → A: ⌘↩ (or clicking the pill) goes to the one that needs you, without leaving focus; there
  «Volver a {rama}» and ⌘⌥← take you back to the work where you were (assumed).
- Q: (phase 5) How? → A: a `focus` state in the window and a notice to main about whether to suppress notifications
  (assumed). Lost: a separate window per work (it breaks the single-window model).

- Q: (spec reviewer) Slacks → A, all (assumed):
  - **⌘↩ in focus:** jumps only to the agent that is waiting, the oldest by N1, not counting the one you have
    open. In focus it never opens a task; if nobody is waiting, the menu option is disabled. N2 is
    amended to cover it.
  - **«Volver a»:**
    - It remembers the work you were in at the first jump, and later jumps do not
      change it.
    - It is forgotten on returning, on leaving focus or if that work is closed.
    - Switching work by hand (⌘1…9, ⌘K) is still allowed and does not change where you return to.
  - **The pill:**
    - It names everyone who is waiting now, except the open one, even if they were already waiting before entering
      focus.
    - It disappears when none is left.
    - It is part of W79, in the window.
  - **The Mac notification:**
    - A notification that is silenced because of focus no longer appears afterwards: the pill replaces it. W15 is
      amended with that exception.
    - Main looks at the window's `isFocused()` at the moment of notifying. Minimised, hidden or on another
      Desktop counts as «not in front».
    - The window tells main every time focus changes and on load. If it reloads, focus goes back to
      off.
  - **When it can be activated:** «Modo foco» is only active in Work with a work chosen. On switching
    work, focus stays on, now over the new one.
  - **Tutorial:** it is named in step 4.
  - **Texts:** «Modo foco» and «Volver» go through `t()`.

- Q: (work reviewer) On going to Tasks or Settings with focus on, is «Volver a» forgotten? → A: no: focus
  stays latent and on returning to Work it continues with its destination; it only applies in Work (assumed).

### All agents (agents-overview, 10 nov 2026)

- Cards, not multiple terminals (assumed, 10 nov).
- The «Todos» mode is not remembered across restarts (assumed, 10 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Several xterm terminals at once | Weight, size and keyboard focus; a card is enough to decide. |
| A new screen in the rail | Cards are works: they live in Work. |

#### Decision log, answers as given (2026-11-10)
- Q: What for? → A: to see the 3 (or more) agents at once without entering each one: what each does, what
  stage it is at and who needs you (Pau, 10 nov: «3 tareas a la vez sin perder el foco») (assumed).
- Q: Where? → A: a second mode of Work, «Todos», with ⌘⇧A and a «Uno · Todos» switch in the
  header; in «Todos» the terminal's slot shows one card per work (assumed). Lost: several
  terminals at once (heavy and fragile with tmux; a card is enough to decide which to enter).
- Q: What does each card carry? → A: branch and repo, written state, Libretto stage with its checklist «3/7»,
  the last action with «hace N min», the subagents working and, if it needs you, its quick replies
  (W76) (assumed).
- Q: Order? → A: first those that need you (oldest first, like N1), then working, then
  stopped (assumed).
- Q: Clicking a card? → A: it opens it in «Uno» mode (assumed).

- Q: ⌘⇧A? → A: free in the menu; «Uno · Todos» in Work's header; with focus mode on, «Todos»
  leaves focus (assumed: focus belongs to one work).

- Q: (spec reviewer) Slacks → A, all (assumed):
  - **Card order:**
    - first those that need you, from the one that has waited longest to the one that has waited least (N1);
    - then those working, with the most recent activity first;
    - lastly the stopped ones, by branch name;
    - on a tie, by id.
  - **Age of the activity:**
    - «ahora» if it is less than a minute old;
    - «hace {n} min» up to the hour;
    - «hace {n} h» up to the day;
    - «hace {n} d» from there on.
    It refreshes every 30 s, like the Activity tab.
  - **When a datum is missing:**
    - without activity, the card says «sin actividad»;
    - without Libretto, «sin Libretto»;
    - while the flow loads, nothing appears;
    - without subagents, nothing appears either.
  - **«Todos» and focus mode.** Entering «Todos» removes focus (W77 is amended). On clicking a card
    you return to «Uno» without focus.
  - **The rest of Work.** In «Todos» the sidebar and «Qué me toca» stay in view, and ⌘↩ works
    like N2: if it opens a work, it switches to «Uno».
  - **⌘⇧A** is only active in Work and with at least one open work.
  - **The quick replies** go outside the card's button, so there are no buttons nested inside
    other buttons, and answering does not open the card. With a multiSelect question there are no buttons (as W76).
  - **Keyboard.** The arrows move focus between cards.
  - **On restart** «Todos» is not remembered.
  - **Tutorial.** Step 4's text changes; there are still 24 steps.

### Live QA (add-qa-lab, 10 nov 2026)

- Playwright MCP for web and mobile-mcp for mobile, versions pinned (assumed, 10 nov).
- MCP only per session with `--strict-mcp-config` (assumed, 10 nov).
- Screenshots outside the repo, in ATRIL_HOME (assumed, 10 nov).
- One QA per work and only on demand (assumed, 10 nov; CLAUDE.md: quota on demand).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| `claude mcp add` in the person's configuration | It touches their global configuration and affects all their agents. |
| Restarting the work's agent with the MCPs | It loses its context; QA is a second pair of eyes. |
| Chrome DevTools MCP for web | Good for debugging; Playwright leaves the screenshots in a fixed folder without depending on the agent. |

#### Decision log, answers as given (2026-11-10)
- Q: What is it? → A: a «Probar en vivo» button per work that opens, next to its terminal, a QA Claude with
  the tools to drive the real app (browser or emulator), which starts it on that branch, goes through
  what the spec promises and leaves screenshots; Atril shows them in a «QA» section of the panel (assumed).
- Q: Which tools? → A: web: Playwright MCP (`@playwright/mcp`, screenshots to `--output-dir`); Android and iOS:
  `mobile-mcp` (`@mobilenext/mobile-mcp`), with the emulator or simulator already running; versions pinned
  (assumed; research 10 nov, not verified against the official docs).
- Q: How without touching the person's configuration? → A: `--mcp-config <Atril file>` and
  `--strict-mcp-config` in that session; never `claude mcp add` or `~/.claude.json` (assumed).
- Q: What kind of project? → A: by files, in this order: Expo, React Native, Flutter, native Android, native iOS,
  web (`package.json` with `dev`, `start` or `preview`); with no match, there is no button (assumed).
- Q: Where do the screenshots go? → A: `$ATRIL_HOME/qa/<workspace>/`, outside the repo, so as not to dirty git (assumed).
- Q: Quota and resources? → A: nothing starts by itself; only one QA per work at a time; «Detener QA» closes that panel;
  starting the emulator or simulator is left to the QA Claude according to its prompt (assumed).

- Q: (spec reviewer) Slacks → A, all (assumed):
  - **Whose the «QA» section is.** The Libretto panel's: it goes in `spec-flow-status.md` as F33. W85 is
    withdrawn.
  - **Start command by type:**
    - web: the `dev` script, otherwise `start`, otherwise `preview`, with the repo's manager (pnpm if there is
      `pnpm-lock.yaml`, yarn if there is `yarn.lock`, otherwise npm);
    - expo: `npx expo start`;
    - react-native: `npx react-native run-ios` / `run-android`;
    - flutter: `flutter run`;
    - android: `./gradlew installDebug`;
    - ios: `xcodebuild` for the simulator, and the scheme is chosen by the QA Claude.
  - **Tools that are needed:**
    - always `node`;
    - android: `adb` and `emulator`;
    - ios: `xcrun`;
    - expo, react-native and flutter: at least one of the two mobile ones.
    If something is missing, the response names them all.
  - **The QA panel.** It is opened with a command, splitting the work's panel. Its tmux id is saved in
    `$ATRIL_HOME/qa/<id>.pane`. It «lives» as long as tmux has that panel; if you close it by hand, it is noticed on the
    next query.
  - **adb and emulator** also count if they are in the Android SDK folder (ANDROID_HOME, ANDROID_SDK_ROOT or ~/Library/Android/sdk), not only on the PATH (added when building).
  - **The emulator or the simulator.** If none is running, the QA Claude starts it according to its prompt.
    Decision 2 is corrected.
  - **Screenshots on mobile.** The prompt asks to save them in the folder (with mobile-mcp's tool,
    `adb exec-out screencap` or `xcrun simctl io booted screenshot`). Ceiling: it depends on the agent
    doing it.
  - **No open change.** The prompt names the branch and asks to test what changes with respect to its base.
  - **«Detener QA».** It closes only that panel; the MCP file and the screenshots stay.
  - **How screenshots reach the window.**
    - The window asks `qa.status(id)` (type, whether it lives and screenshots) every 3 s while the section is visible,
      like F22.
    - Screenshots arrive as a data URL, the 12 newest and at most 2 MB each, so no
      `file://` is opened in the window.
  - **Tutorial.** It is mentioned without a criterion, by changing the text of the panel step.

### Pausing an agent (pause-agent, 10 nov 2026)

- Esc to pause, literal text to resume (assumed, 10 nov).
- Only what is working can be paused (assumed, 10 nov).

#### Decision log, answers as given (2026-11-10)
- Q: How is it paused? → A: Esc in the agent's panel, which is how Claude Code interrupts its turn without closing the
  session; Atril marks the work as «en pausa» (assumed). Lost: freezing the process (SIGSTOP), which may
  cut its connection to the API halfway and leave tools hanging.
- Q: How is it resumed? → A: «Reanudar» types «Sigue donde lo dejaste.» and Enter, literally, like N3 (assumed).
- Q: Where? → A: in the work's menu (right click and menu Work → Pause / Resume, ⌘⇧P) and in its
  «Todos» card; the row says «en pausa» (assumed).
- Q: And if the agent needed you? → A: pausing does not change a pending question: it is only offered while it is
  working (assumed).

- Q: (spec reviewer) Slacks → A, all (assumed):
  - **What «en pausa» is.** A separate mark, not a fourth state. It lives in `$ATRIL_HOME/paused/<session>`
    and survives a restart, because the real Claude stays stopped.
    - With the mark set, that work's effective state is «en pausa». Everything that reads the state
      treats it as stopped: W81's order, F15's editor and the focus pill.
    - The hook does not change it: Claude Code does not fire Stop when interrupted.
  - **What removes it:** only a UserPromptSubmit (what you type or «Reanudar») or moving to needs-you. A
    PreToolUse or PostToolUse that arrives late does not remove it.
  - **Which panel Esc goes to:** the agent's panel whose id the record stores, never a panel split
    with ⌘D.
  - **If Esc does not work.** Named ceiling: if Claude does not stop (a tool that ignores it), the
    mark is removed as soon as another state that is not `working` arrives.
  - **Errors on resuming:** if it is not paused, «Ese agente no está en pausa.»; if the work is no longer
    there, N3's message.
  - **The menu** toggles between «Pausar» and «Reanudar» with ⌘⇧P, which is free.
  - **Test in the window:** row, card and menu go in a separate criterion, W88.
  - **Texts:** «en pausa», «Pausar» and «Reanudar» go through `t()`.

### Cost per work (cost-per-work, 10 nov 2026)

- Local transcripts as the source, no calls (assumed, 10 nov).
- Price table dated in a file (assumed, 10 nov).
- «Estimado a precio de API» (assumed, 10 nov).

#### Decision log, answers as given (2026-11-10)
- Q: Where do the numbers come from? → A: from Claude Code's local transcripts, without calling anything: each
  `assistant` line carries `message.usage` (input, output, cache creation, cache read) and `message.model`. The work's
  main transcript and those of its subagents (`<transcript without .jsonl>/subagents/*.jsonl`) are added up
  (assumed).
- Q: How does Atril know which transcript belongs to each work? → A: the hook stores in each event the path of
  `transcript_path` (documented field) in `$ATRIL_HOME/transcripts/<session>`; only the path, never content
  (assumed).
- Q: Duplicates? → A: Claude Code may write several lines of the same message with the same `usage`: it is
  counted once per `message.id` (assumed).
- Q: Price? → A: official API table cached on 2026-11-03 (claude-api): Fable 5.2 8/40, Opus 5.5 4/20 (cache
  read 0.20), Opus 5 5/25, Sonnet 5.5 2/10 (cache read 0.10), Sonnet 5 2/10, Haiku 5.5 0.10/0.50 $ per million;
  cache write 1.25× the input, cache read the published one or 0.1× the input; an unknown model
  counts tokens and not cost (assumed). Ceiling: prices change; the table lives in a file with its date.
- Q: What is said? → A: «≈ {coste} $ · {tokens} tokens» and the label «estimado a precio de API» (with a
  subscription you do not pay per token) (assumed).
- Q: Where? → A: in the «Todos» card, in the Libretto panel (a line under «Cambio») and in the row's
  title on hover (assumed).

- Q: (spec reviewer) Slacks → A, all (assumed):
  - **Several transcripts per work.** `transcripts/<session>` stores one path per line; it is added if
    new. The total adds all the paths and their subagents, so what belongs to an earlier transcript is not lost
    on resuming.
  - **What the hook touches.** W92 writes only that file, on any event. W63's «changes nothing» refers
    to the subagents file. add-agent-activity's sentence «the raw payload never goes to disk» is still
    true: only a path is stored.
  - **`<session>`** is the same name as in W62.
  - **Lines without `message.id`.** Each counts once, because there is nothing to deduplicate them with.
  - **The model.** It matches if it is the exact id or the id followed by a date (`-AAAAMMDD`).
  - **Incomplete price.** Cost only adds the models with a price. If any is left without one, «(sin
    precio para {modelo})» is added.
  - **Format.**
    - Cost: «0,42 $», or «< 0,01 $» if it falls short.
    - Tokens: «850», «12,3 k» or «1,2 M».
    - If the total is 0 tokens, nothing is shown.
  - **Reading.** Main stores per file how far it has read and the `message.id`s already seen, and rereads every
    30 s only what was added. It pushes `atril:cost:changed` when the total changes; the window asks
    `atril:cost:get`.
  - **The Libretto panel's line** belongs to flow-status: it goes in F34.
  - **Superseded decisions.** add-agent-activity's «Out: token or cost per workspace» and «Read the whole transcript»
    are superseded by this change.

### History (work-history, 10 nov 2026)

- On removal, not on landing (assumed, 10 nov).
- 200 on disk, 20 in view (assumed, 10 nov).
- Folded section in Work (assumed, 10 nov).

#### Decision log, answers as given (2026-11-10)
- Q: When does a work enter the history? → A: on removing it successfully (W10/W90): it is when it stops being «en
  marcha» (assumed). Landed and abandoned ones enter alike; the stage it reached tells them apart.
- Q: What is stored? → A: one line in `$ATRIL_HOME/history.jsonl`: branch, repo, Jira key if it had one, mode,
  Libretto change and stage reached, opened (new `createdAt` field in the record; old ones do not
  have it) and closed, and the cost (W93) at that moment; never content from transcripts or the repo (assumed).
- Q: Where is it seen? → A: a foldable section «Terminados» under «Trabajo en marcha», folded by default, with the last 20:
  branch, repo, stage («Aterrizado», «Construir»…), «duró {d}» when there is `createdAt`, the cost and «hace
  {n} d» (assumed).
- Q: Size? → A: the file stores the last 200; the view shows 20 (assumed).

- Q: (spec reviewer) Slacks → A, all (assumed):
  - **Stage and change.** Main calls `stageOf` (flow-status code, read-only) **before** removing the
    work. The stages are the usual ones: Entrada, Spec, Plan, Construir, Terminado, Aterrizado and «sin
    Libretto».
  - **Order of things.** Stage and cost are captured, the work is removed and, only if removing it goes well, the line is
    added. If the history cannot be written, the work is removed anyway.
  - **Review sessions.** They do not enter.
  - **How many are stored.** The last 200 by write order, trimming after adding. Writes are
    queued, one by one, with a temp file and rename like W80.
  - **Formats:**
    - «duró»: «< 1 min», «{m} min», «{h} h {m} min» or «{d} d {h} h».
    - Age: «hoy» if it is the same calendar day, otherwise «hace {n} d».
    - Cost: W94's short form, «≈ 0,42 $ · 850 tokens», without the label and nothing if it is 0 tokens.
  - **The section.** The header counts all the lines of the file. If there are none, the section does not appear. The
    window asks for it on load (`atril:history:list`) and main notifies on adding (`atril:history:changed`).
  - **The MR and the report** are out; the sentence of the reading that named them is superseded.

### First steps (first-run-setup, 10 nov 2026)

- A card in the empty Work view, not a modal wizard (assumed, 10 nov).
- Jira and forge are optional (assumed, 10 nov).
- Tutorial first, card afterwards (assumed, 10 nov).

#### Decision log, answers as given (2026-11-10)
- Q: What does a newcomer see? → A: in Work, while there are no workspaces, a «Primeros pasos» card in place of the
  current empty state, with five steps that tick themselves by reading the real state (assumed):
  1. «Herramientas listas» — the doctor reports no problems (W21); otherwise «Instalar» opens its notice (W70/W71).
  2. «Añade un repo» — at least one repo registered; button to Ajustes → Repos.
  3. «Conecta Jira» (optional) — token saved (S5); button to Ajustes → Conexiones.
  4. «Conecta GitHub o GitLab» (optional) — a forge saved; same button.
  5. «Abre tu primer trabajo» — button «Nuevo trabajo».
- Q: When does it go away? → A: when there is at least one workspace, or when «Ya lo tengo» is pressed; remembered in
  the UI state (`setupDismissed`) (assumed).
- Q: And the tutorial? → A: unchanged (W23): the tutorial explains; the card leaves the app ready. The tutorial goes
  first; the card appears when it is closed (assumed).
- Q: Optional steps? → A: Jira and forge are marked «opcional» and do not prevent finishing (assumed).

- Q: (spec reviewer) Gaps → A, all (assumed):
  - **When it shows.** While there is no workspace in the list (stopped ones count too; corrected at build time), the history (W96) is empty and
    `setupDismissed` does not exist. Someone who has already worked never sees it again.
  - **Step 5** is just its «Nuevo trabajo» button. It is never shown ticked, because the card goes away as soon as there is
    a workspace.
  - **Step 1** is done when git, tmux and claude have no problem; jira belongs to step 3, which is optional.
    While the doctor's report is on its way, the step says «Comprobando…». Its button opens the list of the tools
    notice (W32), where «Instalar» is.
  - **Step 4** is done with any saved forge, GitHub or GitLab.
  - **The tutorial.** While it is open, on first launch or from Help, the card is not shown; it appears when the
    tutorial is closed. W23 and W24 do not change.
  - **«Ya lo tengo»** saves `setupDismissed` in `ui.json`, validated like `tutorialSeen`, and is remembered across
    restarts.
  - **The real state** comes from calls that already exist and expose no tokens: `doctor()`, `repos.list()`,
    `settings.jira.status()` and `settings.forge.status(forge)`, all with their `saved`.
  - **The Ajustes buttons** use the navigation M35 already uses («Ajustes → Repos»).
  - **The photo** is taken with `ATRIL_SNAPSHOT_VIEW=work`, an empty `ATRIL_HOME` and `tutorialSeen: true`.

### Packaging (package-and-sign, 10 nov 2026)

- arm64 only (assumed, 11 nov).
- Identity from `ATRIL_SIGN_IDENTITY`, otherwise ad-hoc (assumed, 11 nov).
- No notarisation and no auto-update (assumed, 11 nov; research of 10 nov).
- The session does not build; Pau does (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| `electron-builder.yml` + `CSC_NAME` | cannot express «otherwise ad-hoc» without macros; a test cannot see the fallback |
| electron-forge | more pieces (makers, plugins) for the same `.dmg` |
| building here to test it | CLAUDE.md forbids it |

#### Decision log, answers as given (2026-11-10)
- Q: With what? → A: `electron-builder` as a development dependency (pinned version), configuration in
  `electron-builder.config.cjs` (JS, so that the identity falls back to ad-hoc without YAML macros); a new dependency is needed because there is no packager (assumed).
- Q: What comes out? → A: a `.dmg` and a `.zip` for Apple Silicon (arm64); not x64 (assumed).
- Q: Signing? → A: the research of 10 nov: the person's own Keychain certificate if `ATRIL_SIGN_IDENTITY` is
  set (e.g. «Atril Local»), otherwise an ad-hoc signature (`"-"`); `hardenedRuntime: true` with `allow-jit`,
  `allow-unsigned-executable-memory` and `disable-library-validation` in `build/entitlements.mac.plist`; no
  notarisation (no Apple account) (assumed).
- Q: Who builds it? → A: the person, with `pnpm dist`; this session does not build (CLAUDE.md: never `pnpm build`),
  so the proof is the configuration, and the manual check is written down (assumed).
- Q: Resources? → A: `resources/` (Libretto, hook, summary) goes inside the package as `extraResources`; `paths.ts`
  already tells packaged from unpackaged (assumed; the builder checks it).
- Q: Instructions? → A: `bocetos/instalar.html`: build, sign with your own certificate, open it the first time
  («Abrir igualmente» in Privacidad y seguridad since Sequoia), and the 99 $/year route if it is ever shared (assumed).


- Q: Where does the ad-hoc fallback live? → A: in `electron-builder.config.cjs` itself:
  `identity: process.env.ATRIL_SIGN_IDENTITY || '-'`; the test loads it with and without the variable (assumed).
- Q: `resources/` flat or in a folder? → A: flat, `{ from: 'resources', to: '.' }`, as `paths.ts` expects
  (`<resourcesPath>/claude-hook.mjs`, `<resourcesPath>/libretto/`) (assumed).
- Q: node-pty? → A: `asarUnpack` of `node_modules/node-pty/**`, `npmRebuild: true`, and `files` limited to `out/**` and
  `package.json`; `dist` = `electron-vite build && electron-builder --mac` (assumed).
- Q: What does the test prove? → A: the text of the configuration, nothing more; that the `.dmg` starts, opens terminals and
  finds the hook is checked by Pau by hand (a «sin probar» entry) (assumed).
- Q: Pinned? → A: exact version, no `^` (`26.18.0`, from 20 Oct) (assumed).
- Q: Owner of the new files? → A: workspaces; its `Governs:` adds `electron-builder.config.cjs` and `build/**`
  (assumed).
- Q: Photo and sketch? → A: there is no new screen: novedades gets its section without a photo and the sketch does not change (assumed).
- Q: Another Mac? → A: out of scope; the page explains «Abrir igualmente» and the own certificate, without promising it (assumed).

### Libretto (libretto-view, 10 nov 2026)

- Read from disk, do not ask Claude (assumed, 11 nov).
- Queue without a model, with the `/libretto-queue` template (assumed, 11 nov).
- Start = Atril does step 3 of `/libretto-next` and enters `write-spec` (assumed, 11 nov).
- Its own «Libretto» screen (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| launching `/libretto-queue` in a Claude | spends quota to write a file with a fixed template |
| the queue inside Work | Work is what is running; the queue is per repo and is not work yet |

#### Decision log, answers as given (2026-11-10)
- Q: Where? → A: a new «Libretto» screen in the sidebar (and in ⌘K), with a selector of registered repos,
  remembered as the last one used (assumed).
- Q: Do `/libretto-status` and the queue call Claude? → A: no: Atril reads the repo's `.agents/changes/*/proposal.md` with what
  already exists (`changeFolders`, `readChecklist`); zero quota (assumed).
- Q: What is «queued»? → A: a folder whose `proposal.md` carries a line `Queued: <ISO date>`; oldest
  first, with its name, date and the first non-empty line of `## Reading` (assumed).
- Q: And «in progress»? → A: any other change folder: its name and «{closed}/{total}» boxes with the first
  open one, or «sin checklist» (assumed).
- Q: Does queueing call Claude? → A: no: it does what `/libretto-queue` does in its steps 2–3, without a model: name from the text
  (lower case, no accents, hyphens, max 40), `proposal.md` with the command's template and the literal request as a
  quote, and a `git commit` of only that file with `docs(queue): capture <name>` on the repo's current branch (assumed).
- Q: Repeated name? → A: suffix `-2`, `-3`… (assumed).
- Q: Repo without `.agents/changes/`? → A: the screen says «Este repo no usa Libretto» and does not offer to queue, just as
  `/libretto-queue` refuses (assumed). «Iniciar Libretto» is another ★ idea.
- Q: «Empezar»? → A: opens a new workspace (`openWorktree`) on branch `feat/<name>` with the first message
  `/libretto:libretto-next <name>`; the command removes `Queued:` and follows the flow (assumed). If Libretto tries another
  branch inside the worktree, it goes to «sin probar».
- Q: Does it refresh itself? (see below) → A: on entering, on changing repo and after queueing or starting; «Actualizar» button (assumed).

- Q: `libretto-next` does not accept a name, asks which one and does `checkout -b`: how is a start made? → A: Atril does step 3
  of the command itself: it opens the workspace on `feat/<name>` (that is the branch), removes the `Queued:` line from the `proposal.md` of
  that worktree and commits it there (`docs(queue): start <name>`); and the first message is step 4,
  `/libretto:write-spec <name>`. Just like `/libretto-next`, without its question: the click already chose (assumed).
- Q: Which tree is read? → A: the repo's checkout; a queued idea whose branch `feat/<name>` already exists is shown
  «Empezada · feat/<name>» without «Empezar» (assumed).
- Q: Repos without a worktree (in-place)? → A: they work; if `openWorktree` returns an error, it is shown under the idea and nothing is
  committed (assumed).
- Q: Name? → A: from the first line of the text: lower case, no accents, anything non-alphanumeric to a hyphen, no hyphens
  at the edges, cut to 40 counting the `-N` suffix; if it ends up empty, `idea` (assumed).
- Q: If the commit fails? → A: the written folder is deleted and the error is shown (assumed).
- Q: Date? → A: local (assumed).
- Q: What is the `Queued:` line? → A: `Queued: YYYY-MM-DD` alone on its line, before the first `## `; ties broken by
  name (assumed).
- Q: What shows as in progress? → A: every folder that is not queued, with or without `proposal.md`; those with all boxes
  closed say «Lista para aterrizar» (assumed).

### Question card (ask-card, 10 nov 2026)

- Question and answers inside the row's card (assumed, 11 nov).
- «Otros cambios» is replaced by a link to Libretto (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| leave the chips and separate them with a margin | still does not say which row they belong to |
| question in a modal | breaks the «without leaving what you are doing» of quick replies |
| explain «Otros cambios» with a subtitle | still has no action; Libretto already shows those changes meaningfully |

#### Decision log, answers as given (2026-11-10)
- Q: What does it look like? → A: the row and the question form a single card: the row loses its bottom corners and
  its border takes the «needs you» colour; below it, attached, the whole question (uncut) and one answer per row
  with its number (1, 2, 3…), like Claude Code's selector; very softly tinted background with `--you`. Sketch 10
  already shows it (assumed).
- Q: The row's truncated activity line? → A: while the card is there it is not repeated: the question goes whole
  inside (assumed).
- Q: In «Todos»? → A: the same, inside its card (assumed).
- Q: Keyboard? → A: the numbers are drawing only; the answers remain buttons with Tab/Enter (assumed).
- Q: «Otros cambios»? → A: it is the rest of the folders in `.agents/changes/`, without context and without action. The
  section is removed; in its place a line «{n} cambios más en este repo → Libretto» that opens the Libretto screen with that
  repo chosen (assumed).

- Q: «Whole» from where? → A: the activity line as the hook stores it (already cut to 200 in
  `summarise.mjs`); in the card only the CSS ellipsis is removed. Nothing changes in main (assumed).
- Q: Where is it tested that the row does not repeat the line? → A: in `quickreplies.test.ts`, mounting `WorkspaceList`, as
  that test already does today (the builder checks it); when it stops being needs-you the line returns in the same render
  (assumed).
- Q: Todos? → A: W82 is amended here: in «Todos» the card sits right under the card's button, outside it, and
  the button does not repeat the truncated line; its proof stays in `overview.test.ts` (assumed).
- Q: Contrast of what? → A: the question text and active labels over `--ask-bg`; the numbers (`aria-hidden`),
  the border and what is disabled are left out. The tint is a `--ask-bg` token per theme and palette (all four: original
  light and dark, Grafito light and dark), without `color-mix`, so that the test reads the same thing that is painted (assumed).
- Q: Libretto with which repo? → A: «Ver en Libretto» saves that repo as the chosen one (W104) and switches screen; the
  count is `flow.others.length` (assumed).
- Q: Line or button? → A: text «{n} cambios más en este repo» and a button «Ver en Libretto» (assumed). The saved
  `flow-others` fold is ignored (assumed).

### Managing the queue (queue-manage, 10 nov 2026)

- Only queued ideas, not started ones (assumed, 11 nov).
- Moving to Jira = create and delete the idea; Jira rules (assumed, 11 nov).
- Commits with pathspec, like W101 (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| store the Jira key in the proposal and keep the idea | `/libretto-queue`: with a key, the tracker is the source; two copies drift apart |
| delete without confirming | losing an idea with one click |
| open `proposal.md` in the editor | the idea is only its request; editing the whole file invites breaking the template |

#### Decision log, answers as given (2026-11-10)
- Q: What is edited? → A: the literal request of a queued idea: «Editar» swaps the row for a box with that text;
  «Guardar» rewrites `## The ask, verbatim` (quote line by line) and commits only that file as
  `docs(queue): edit <name>`; the name does not change (assumed).
- Q: Delete? → A: «Borrar» asks for confirmation in the row itself («¿Borrar <name>?» Sí / No) and does `git rm -r` of the
  folder and a commit of only that path, `docs(queue): drop <name>` (assumed).
- Q: Only queued? → A: yes; a «Empezada» idea or a change in progress cannot be edited or deleted from here (assumed).
- Q: Move to Jira? → A: «Pasar a Jira» creates an issue of type «Task» (or the project's first non-subtask type) in the
  project of the board chosen in Ajustes (S-board), with summary = first line of the request
  (max 255) and description = the whole request; then it deletes the idea like «Borrar», with
  `docs(queue): <KEY> en Jira, <name>`, because `/libretto-queue` says a key makes the tracker the source of
  truth. The row says «Creada <KEY>» and the task shows up in Tareas (assumed).
- Q: Without Jira connected or without a board? → A: the button does not show; if Jira fails, the error shows in the row and the idea
  stays (assumed).
- Q: The empty text under the idea? → A: `queueIdea` writes the first line of the request in `## Reading`, and the
  reading uses the first line of the request when `## Reading` is empty (ideas already written) (assumed).

- Q: «Queued» for edit/delete/Jira? → A: a `Queued:` line and no `feat/<name>` branch; a started idea is rejected
  (assumed).
- Q: «First line»? → A: the text without the quote's `> ` (assumed). W101 and W100 are amended here, there is no W109.
- Q: A name arriving over IPC? → A: the same `SAFE_NAME` without `..` as `startQueued`; if it is not valid, error and nothing is touched
  (assumed).
- Q: Untracked files in the folder? → A: `git rm -r` and then `rm -rf` of the folder; the commit still carries only
  that path (assumed).
- Q: Credentials and board? → A: main passes `savedJira()` and the saved board (what `JiraSettingsStatus.board` gives)
  to `ideaToJira`; the renderer shows «Pasar a Jira» if `atril:settings:jira` (or the IPC that already gives that state) returns
  `saved` and `board` (assumed).
- Q: Jira creates and the delete fails? → A: `{ key, error }` is returned; the row says «Creada {KEY}» and the error, and stops
  offering «Pasar a Jira» while the screen stays open (assumed). Ceiling: on returning to the screen, the button
  comes back; if it is annoying, write `Tracker: <KEY>` in the idea.
- Q: While waiting? → A: that row's buttons are disabled until the answer (assumed).
- Q: Keyboard? → A: everything is buttons; when asking for confirmation focus goes to «No» (assumed).
- Q: Screen design (Pau: «more organic, seeing the repos»)? → A: that of sketch 10: repo cards with
  their accounts instead of the dropdown, an «Apunta una idea…» line that grows at the top, «En cola N» and «En curso N», the
  date inside the idea's line and the actions in grey always visible; column of 760 px at most
  (assumed).

### Quiet header (quiet-header, 11 nov 2026)

- Cost hidden, calculation kept (assumed, 11 nov).
- Focus also as an icon button in the header (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| a «show cost» setting | Pau said he is not interested; a setting for nobody is code for nobody |
| also delete the calculation | more diff and W95 keeps it; it gets deleted if nobody misses it |

#### Decision log, answers as given (2026-11-11)
- Q: What does the header look like? → A: that of sketch 10: at the top a small «{repo} · {agente}»; below it the branch and, beside it,
  the state as text with its icon (the same as the row's, no pill); on the right, together and centred, «Uno |
  Todos» and a round icon-only button «Modo foco» (title «Modo foco (⌘⇧F)») that does the same as the menu (assumed).
- Q: Cost? → A: out of sight everywhere: row (title), «Todos» card, Libretto panel and
  «Terminados». main's calculation (W93) and the total in the history (W95) stay: they are not seen and do not cost
  a call (assumed). Ceiling: if nobody asks for it within a month, delete W93 and `cost.ts`.

- Q: What state and from where? → A: the same text and icon as the list row (`LABEL[state]` of
  `WorkspaceList`), only in «Uno». In «Todos» the header says «Todos los agentes» and there is no single state (assumed).
- Q: The button in «Todos»? → A: it does not show; in «Uno» it always shows, and with no workspace chosen it is disabled like the menu
  (assumed).
- Q: Name while in focus? → A: always «Modo foco», with `aria-pressed` true while it is active (assumed).
- Q: Cost tests? → A: the cases are renamed to what they test now and the `Proof:` names them; each view is
  tested separately, checking that there is no «$», «≈» or «tokens» (assumed). The renderer's `cost.ts` is deleted if nothing outside
  its tests uses it (assumed).
- Q: Does the history say «Coste: la forma corta de W94»? → A: superseded by amended W96; the total stays in the
  file (W95) without being shown (assumed).

### QA screen (qa-screen, 11 nov 2026)

- QA as its own screen (Pau, 11 nov).
- Report per criterion, option A of `bocetos/qa-propuestas.html` (Pau, 11 nov).
- The QA agent writes `report.json`; main validates it (assumed, 11 nov).
- Bug to Jira or to the agent, always on press (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| parse what the agent says in its terminal | fragile; a file with a shape is checkable |
| our own test runner (generated Playwright tests) | another engine; the QA agent already drives the browser |

#### Decision log, answers as given (2026-11-11)
- Q: Where? → A: a «QA» screen in the bar, between Libretto and Avisos (and in ⌘K); at the top, cards of the live workspaces
  with what W83 detected («App web», «Android», «sin detectar»); Libretto's panel no longer has the QA
  section (assumed).
- Q: Where do the criteria come from? → A: from the `## Verification criteria` of the workspace's change in progress (its ids and
  text, the way F36 finds the change) (assumed).
- Q: Where do the results come from? → A: the QA agent's prompt (W84) also asks it to write
  `$ATRIL_HOME/qa/<id>/report.json` when it finishes each criterion: `{ "criteria": [{ "id", "status":
  "pass"|"fail"|"untested", "note", "steps": [{ "text", "ms"?, "shot"? }] }] }`, `shot` being the name of a screenshot in
  its folder. main reads it every 3 s while the screen is open, like F33 (assumed).
- Q: Trust the file? → A: it is text from a model: main validates it (ids that exist in the change, statuses from the
  list, texts cut to 400, 30 steps at most, `shot` only names from its folder with no `/` or `..`); anything that is not
  valid is ignored, never executed or painted as HTML (assumed).
- Q: «Ver cómo»? → A: a modal with the criterion's steps (text and duration), its screenshots in a strip and the selected one
  large; the step that failed marked (assumed).
- Q: «Probar este» and «Reprobar todo»? → A: if the QA panel is alive, Atril writes into it «Prueba solo el criterio
  {id}: {texto}. Actualiza report.json.» (or «Prueba otra vez todos los criterios…»); if not, it launches QA (W84) with that
  request at the end of the prompt. The criterion goes to «Probando…» until the report changes it (assumed).
- Q: «Marcar como bug»? → A: a pre-filled form (title «QA {rama}: {nota}», the steps, the environment: target,
  branch and commit, and the criterion) with «Crear en Jira» (like W108, into the Ajustes board's project; shows if Jira is
  saved with a board) and «Pasar al agente del trabajo» (writes the bug into the workspace agent's panel, W75-like);
  you edit it before sending (assumed).

- Q: What is a criterion? → A: each line under `## Verification criteria` that starts with a bold id
  (`- **W12**`); id and text up to its `Proof:`. No change, no such section or no ids: «Este trabajo no tiene criterios
  que probar» (assumed).
- Q: Repeated or missing ids in the report? → A: the last entry wins; a criterion that is not there is «Sin probar»
  (assumed).
- Q: Screenshots without a criterion? → A: still visible: «Todas las capturas», the 12 newest, each at most 2 MB,
  as data URLs (today's F33 limits) (assumed).
- Q: When does «Probando…» end? → A: the renderer keeps it; it ends when the report carries an entry for that id
  written after the request (even if it repeats the status), when the QA panel dies, or after 5 min (it returns to the
  previous state) (assumed).
- Q: Writing into a panel that is working? → A: Claude Code queues what is typed while it works; it is written
  anyway (assumed).
- Q: If W84 refuses on launch? → A: the error shows under the button and nobody goes to «Probando…» (assumed).
- Q: Several lines to the agent? → A: they are pasted with `tmux load-buffer` + `paste-buffer -p` (bracketed paste: line
  breaks do not submit) and then Enter (assumed).
- Q: Jira? → A: a function `createIssue(creds, board, summary, description)` is extracted from `ideaToJira`; `ideaToJira`
  uses it and then removes the idea (W108 unchanged); QA only creates (assumed).
- Q: The prompt? → A: `qaPrompt` adds the path of `report.json`, its shape, the list of criteria (id and text) and that it
  rewrites it whole after each criterion (assumed).

### QA: where it is tested (qa-targets, 11 nov 2026)

- (11 nov, Pau) Engines: iOS `xcrun mcpbridge` + mobile-mcp for tapping; Android mobile-mcp with the person's emulator; Chrome with Playwright; Safari with Playwright WebKit (assumed).
- (11 nov, Pau) One device per workspace, reserved while its QA is alive; the reservation expires by itself when its pane is gone.
- (11 nov, Pau) Errors: what happened, what you cannot do, a button with the fix; detail folded.
- (11 nov) Fixes are fixed names that main translates into an action; the window never sends a command or a URL (like W21).
- (11 nov) `.atril/qa.json` rules over what was detected; «Elegir a mano» is added as one more tab.

#### Decision log, answers as given (2026-11-11)
- Q: Engine per platform? → A: iOS with Apple's official MCP `xcrun mcpbridge` (Xcode 26.3+), simctl or mobile-mcp if tapping is needed; Android with the person's SDK emulator through `emulator`/`adb`, via mobile-mcp; web Chrome with Playwright and Safari with WebKit.
- Q: Detection? → A: it says why; several platforms as tabs remembered per repo; monorepos at 2 levels; «Elegir a mano» saved per repo and optional `.atril/qa.json`; «No sé cómo abrir este proyecto» if there is nothing.
- Q: Errors? → A: none loose: what happened, what you cannot do and a button that fixes it; technical detail in «Ver detalle» (`bocetos/errores.html`).
- Q: Several QAs at once? → A: one simulator or emulator per workspace, reserved until it is released, like Simlock.
- Q: Safari with which MCP? → A: Playwright MCP with `--browser webkit`, Safari's engine; there is no official Safari MCP that can be installed without signing anything (assumed: if an official one appears, only `mcpConfig` changes).
- Q: How many tabs does an RN/Expo/Flutter project give? → A: Android and iOS, one per platform that has a folder (`android/`, `ios/`) or, in Expo, both (assumed).
- Q: Which emulator does it reserve? → A: the first one in the person's list that has no other workspace with its QA alive; it never creates one without being asked (assumed).

### Clear errors (plain-errors, 11 nov 2026)

- A read error that the user cannot read as a sentence is a loose error (Pau's rule, 11 nov, `bocetos/errores.html`): what happened, what you cannot do, a button, and the code folded in «Ver detalle». Here it applies to the footer, the doctor and Ajustes.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| The `Problem` box in the footer | takes four lines in a one-line bar; covers the terminal |
| Map the error in the window from the sentence | the sentence is already translated; main knows the cause |

#### Decision log, answers as given (2026-11-11)
- Q: (work review) `boxes.test.ts` changed outside the contract → A: yes, on purpose: it looked for the list of boxes without waiting for it and failed 1 time in 2 in the suite; now it waits with `findByRole`, same check (assumed).
- Q: (cold review) And a 401 after a good read? → A: W37 rules: the last values stay with their age (assumed).
- Q: (cold review) Which Jira errors are «does not respond»? → A: only those thrown by `fetch`; HTTP statuses and a mistyped address keep their sentence; the timeout says «Jira no ha respondido en 10 s.» (assumed).
- Q: What does an error look like in the footer, which is a single line? → A: the sentence and a button on the same line, and «Ver detalle» folded beside it; no big `Problem` box (assumed: if Pau wants the box, it fits above the footer).
- Q: What fixes a keychain or token failure? → A: «Abrir Claude Code», which opens Terminal with `claude` (the person logs in there); everything else, «Volver a comprobar» (assumed).
- Q: How long does the doctor wait? → A: 5 s per tool, as finding 2 proposed (assumed).

### Shell PATH (login-path, 11 nov 2026)

- A Mac app opened from the Finder does not have the shell's PATH (already decided for the hook, which uses Atril's Electron as Node): Atril asks the login shell for it at startup, once, before checking tools.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Fixed folders only | anyone who installs with asdf, nvm or in another folder is left out |
| The `fix-path`/`shell-env` package | a dependency for ten lines |

#### Decision log, answers as given (2026-11-11)
- Q: Why is `claude` missing if it is installed? → A: (checked) it is in `~/.local/bin`; an app opened from the Dock or the Finder inherits `/usr/bin:/bin:/usr/sbin:/sbin` and Atril never extends it.
- Q: Where does the good PATH come from? → A: from the person's interactive login shell (`$SHELL -ilc`), which reads `.zprofile` and `.zshrc`, with a 3 s cap; behind it, `~/.local/bin`, `/opt/homebrew/bin` and `/usr/local/bin` in case the shell does not answer (assumed).

### Copy with changes (dirty-copy, 11 nov 2026)

- A refusal when opening a workspace brings its fix when there is one that does not touch the person's work: here, a worktree for this time.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Stash on the person's behalf | touches their changes without asking |
| Change the repo's mode to worktree | decides for them forever; the repo works in its own copy for a reason (e.g. an unversioned .env) |

#### Decision log, answers as given (2026-11-11)
- Q: What fix does a dirty copy in an in-place repo offer? → A: «Usar un worktree esta vez»: opens the workspace in a separate folder and your copy, with its changes, is not touched; the repo's mode does not change (assumed).
- Q: And the second workspace in an in-place repo (W7)? → A: the same button (assumed).
- Q: What goes in «Ver detalle»? → A: the lines of `git status --porcelain` (up to 20) and why the repo works in your copy (assumed).

### Opening and closing without raw errors (ws-errors, 11 nov 2026)

- A git or tmux failure never shows raw in the sentence: a sentence per step, folded output and «Abrir en Terminal» in that folder.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Send the path from the window | the window cannot be trusted; main already knows the path by id |
| Native `confirm()` | a system dialog for one row; the question in the row covers nothing |

#### Decision log, answers as given (2026-11-11)
- Q: (builder) How does «Usar un worktree esta vez» arrive from Jira's «Empezar»? → A: `StartRequest.worktree`, which `jira/start.ts` passes only if it is `true`; no test of its own for the Jira dialog (assumed).
- Q: (builder) `Problem` without a fix → A: `fix`/`onFix` optional and «Ver detalle» only with detail; «No hay ningún repo» carries no button (assumed).
- Q: (cold review) And if git fails after stopping the agent? → A: the record stays and the sentence says the agent is already stopped; it is not reordered (assumed: `git worktree remove` on a folder with the agent alive would be worse).
- Q: (cold review) Does a failing `git status` offer to forget? → A: only if the folder does not exist; if it exists, «Abrir en Terminal» (assumed).
- Q: (breaking the app, finding 1) Does forgetting leave the branch locked by the worktree? → A: `git worktree prune` in the repo, which only deletes entries whose folder is already gone (assumed).
- Q: Which button fixes a git failure on open or close? → A: «Abrir en Terminal», which opens Terminal in the folder with `git status`; the window sends the repo's or workspace's id, never a path (assumed).
- Q: And if the workspace's folder is no longer a repo or does not exist? → A: «Quitar de la lista igualmente»: closes its tmux session, deletes the record and its files, runs no git and writes no history (assumed).
- Q: When is «Quitar» confirmed? → A: only with the session alive, in the row itself; a stopped workspace is removed on the first click (assumed).

### Model and effort (model-pick, 11 nov 2026)

- Atril suggests model and effort with fixed rules and their reason; it never changes them on the person's behalf.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Ask Claude which model to use | spends quota on every workspace, and the rule is no automatic calls |
| Apply the suggestion by itself | decides for the person; the article says measure before changing |

#### Decision log, answers as given (2026-11-11)
- Q: (builder) `suggest.ts`, `SuggestLine.tsx` and the dialogs live under work-inbox's `Governs:` → A: the criteria stay in workspaces, which already governs the model and the command (W34); the shared line is a window piece (assumed).
- Q: (builder) What does the suggestion look like? → A: «Sugerido: Sonnet · Medio. {porqué} [Usar]», in a grey line (assumed).
- Q: (cold review) What text does the suggestion look at in «Empezar»? → A: the summary and the Jira type (assumed).
- Q: (cold review) An odd effort over IPC? → A: rejected in main like an odd model (assumed).
- Q: Is the suggestion applied by itself? → A: no: it shows under the model with its reason and a «Usar» button; the person decides (assumed, like the MR score of 540: the person decides).
- Q: What does the suggestion come from? → A: fixed rules over the text and the Jira type, without calling Claude (CLAUDE.md: no automatic calls) (assumed).
- Q: Which effort levels? → A: Por defecto, bajo, medio, alto and muy alto (`xhigh`); `max` stays out of the selector (assumed: it is expensive and the article does not recommend it to start with).

### Reopening (reopen-work, 11 nov 2026)

- A stopped workspace is resumed with `claude --continue` in its folder; more effort is one level up, never another model.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| `claude --resume <id>` with the stored session id | Atril does not store the conversation id; `--continue` takes the latest one in that folder, which is the workspace's |
| Open a new workspace on the same branch | loses the conversation and clashes with the branch that already exists |

#### Decision log, answers as given (2026-11-11)
- Q: (test in the real app) when tmux is killed, `term:resize` reaches a dead client, node-pty throws EBADF and Electron blocks the app with «A JavaScript error occurred in the main process» → A: fixed here (W149): the dead client is forgotten and nothing in the terminal throws.
- Q: (cold review) And auto mode? → A: its `auto/<session>` mark survives the dead session (only `dropFiles` deletes it): reopening does not touch it.
- Q: (cold review) And workspaces opened with a custom `argv`? → A: `input.argv` is used only by tests; every real workspace comes from `agentArgv`, and reopening uses `agentArgv`.
- Q: (cold review) `--continue` without a conversation? → A: only added if Atril has a transcript of the workspace noted (`transcripts/<session>`); otherwise it starts from scratch (assumed).
- Q: (cold review) A live session with a dead agent (W16)? → A: it is reopened too: that session is closed first (assumed).
- Q: (cold review) order with `model-pick` → A: this branch comes from landed `model-pick`; `--continue` goes after `--plugin-dir`, before `--model` and `--effort`.
- Q: How is it relaunched? → A: a new tmux session with the same id, in the same folder, with `claude --continue` (the latest conversation in that folder), the same model, effort and auto mode (assumed).
- Q: What is «more effort»? → A: one level above the stored one: default or medium → high, low → medium, high → very high; with very high it is not offered (assumed, from the article).
- Q: Is it offered with the agent alive? → A: no: restarting an agent that is working cuts what it is doing; only with the session dead (assumed).

### Damaged state files (state-files, 11 nov 2026)

- A damaged state file blocks state changes, not the app: what is happening and how to reach the file is shown, and nothing is overwritten.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Automatic `.bak` copy and «Restaurar copia» | Atril has no copies today; inventing them is another feature with its own failures |
| Treat the damaged file as empty | it is exactly what happens today: the next write erases all the workspaces |

#### Decision log, answers as given (2026-11-11)
- Q: (cold review) Who reads the files? → A: a new module `src/main/state.ts` with a strict reader for both; `workspaces.ts` and `repos.ts` drop their own readers. Every write to either file reads first with it, so none writes over a damaged one (assumed).
- Q: (cold review) A file that exists but cannot be read (permissions, a folder)? → A: counts as damaged, with its code in the detail (assumed).
- Q: (cold review) order with `reopen-work` → A: this branch comes from landed `reopen-work`; `reopenWorkspace` goes through the same reader.
- Q: What fix is offered for a damaged file? → A: «Mostrar en Finder» (the file selected); Atril does not rewrite or delete it on its own, and does not invent a copy it does not have (assumed).
- Q: What counts as «wrong shape»? → A: `workspaces` or `repos` that is not a list, or an entry without a text `id`, `path` (and `branch`, `session` for workspaces) (assumed).
- Q: And a damaged `ui.json` (finding 14)? → A: out of scope: it only repeats the tutorial, nothing is lost (assumed).

### Libretto models (libretto-models, 11 nov 2026)

- Atril pins the model of the Libretto subagents that only read and give opinions; a model that Libretto brings rules. The copy in `resources/libretto/` is Libretto `171db90` plus those `model:` lines; nothing else differs.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Edit `resources/libretto` by hand | the next packaging erases it |
| `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` when launching the agent | would also move subagents that edit code |
| Haiku for all reviewers | the article reserves Haiku for what is checked cheaply (searching, reading logs); reviewing is judgement |

#### Decision log, answers as given (2026-11-11)
- Q: (cold review) What is «already has a model»? → A: a frontmatter line that starts with `model:`; an agent in the list with no frontmatter (`---` at the start) is left as is (assumed).
- Q: (cold review) How is the current copy rewritten? → A: by applying `pinModels` to `resources/libretto/agents/*.md` as they are, without re-packaging from the Libretto repo: the copied version remains `171db90`.
- Q: (cold review) And the spec that says the copy is `171db90`? → A: it now says «`171db90` plus Atril's `model:` lines».
- Q: Where is the Libretto subagents' model pinned? → A: when packaging Libretto into Atril (`scripts/bundle-libretto.mjs`), not in the hand copy: the copy is regenerated and would lose the change (assumed).
- Q: Which ones? → A: those that read and give opinions without editing code — `converge-reader`, `review-lens-reliability`, `review-lens-security`, `spec-reviewer`, `work-reviewer` — go to `sonnet`; those that already carry a Libretto model keep it (`review-lens-design: sonnet`, `review-lens-intent` and `review-lens-tests: haiku`); `spec-writer` writes the contract and stays on the session's model (assumed).

### Broken repos (repo-gone, 11 nov 2026)

- A broken repo looks broken and is fixed from Ajustes; broken git is called that, never a bad branch name.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Delete the broken repo automatically | decides for the person; it may be a disconnected disk |
| Blame the name unless git is missing (127) | Xcode's note exits with code 1 and would keep blaming the name |

#### Decision log, answers as given (2026-11-11)
- Q: (cold review) What goes first, the branch name or the repo's health? → A: the name (W6), unless git is broken (W156); then the health, before any git that writes (assumed).
- Q: (cold review) What health does a repo with broken git have? → A: `ok`: only «not a git repository» in stderr gives `not-git`; broken git is reported on use (W156) (assumed).
- Q: (cold review) Where do «Abrir Ajustes» and «Instalar herramientas de Xcode» work? → A: in the workspace row, the new-workspace and Empezar dialogs, the reopen bar and the sidebar; `WorkFix` gains `'settings'` and `'git'` (assumed).
- Q: How do we know git is broken and not that the name is bad? → A: (checked) an invalid name exits with code 128 and «is not a valid branch name» in stderr; missing git gives 127 and Xcode's note, code 1 with «xcode-select». Only the first blames the name (assumed).
- Q: What buttons does a broken repo have in Ajustes? → A: «Buscar la carpeta…» (picks another folder and saves it with the same id if it is a git repo) and «Quitar el repo» (removes it from `repos.json`, never touches the folder; it refuses if a workspace of that repo is open) (assumed).
- Q: «Quitar el repo» for healthy repos too? → A: yes, on every row: today there is no way to remove a repo from the app (assumed).
- Q: (at build time) And if `check-ref-format` fails without «is not a valid branch name» or broken git? → A: «git no ha podido comprobar el nombre {branch}.» with its output folded and «Abrir en Terminal»; it never blames the name (assumed).
- Q: (at build time) `lstat` or `existsSync` for `missing`? → A: `existsSync`, which follows links: a link to a folder that is gone counts as missing (assumed).

### Terminal that will not attach (term-attach, 11 nov 2026)

- None new.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Open `tmux attach` in Terminal.app | another window for something that is usually fixed by retrying; stays as an idea |

#### Decision log, answers as given (2026-11-11)
- Q: (cold review) What does `attach` answer when there is no error? → A: `{ ok: true }` on attaching and `{ ok: false }` for an unknown workspace or one without a session (the stopped view already explains it); never `undefined` (assumed).
- Q: (cold review) And if an error arrives after switching workspace? → A: it is discarded: the effect keeps the id it called with and only paints if it is still mounted with that id (assumed).
- Q: (cold review) Is there an xterm double? → A: no: the test mocks `@xterm/xterm` and `@xterm/addon-fit` with `vi.mock` (assumed).
- Q: What fix does it offer? → A: «Volver a intentar», which attaches again; the agent stays in tmux and the sentence says so (assumed).
- Q: Does node-pty's message go to the detail? → A: yes: it is a node-pty text about the process (`posix_spawnp failed`), with no data about the person (assumed).

### Grafito: needs you (grafito-you, 11 nov 2026)

- In Grafito the accent is for what asks something of the person; what merely works is grey.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| An amber for «needs you» in Grafito | second accent; W72 forbids it and Pau wants one |

#### Decision log, answers as given (2026-11-11)
- Q: (work review) `--run` also paints the unread notice dot, the search selection, the current step and «connected» → A: `--run` stays blue; a new token `--working` only for the «trabajando» label (grey in Grafito, as before in Original).
- Q: What colour changes? → A: «trabajando» goes to the grey of secondary texts (`--sub`) and the only blue accent is left for «needs you»: grey plus one accent, as Pau asked (assumed).

### Clash radar (radar, 11 nov 2026)

- Atril warns about clashes between workspaces of the same repo by file; it decides nothing and touches no branches.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Compare diffs line by line | more expensive; the file already warns in time |
| Warn only when the MR is opened | arrives late: the clash is already made |

#### Decision log, answers as given (2026-11-11)
- Q: (cold review) What base? → A: the `baseCommit` of each workspace's record, also in those that work in your copy (assumed).
- Q: (cold review) Which workspaces take part? → A: every record that is not a review one, live or stopped, both as affected and as «with whom» (assumed).
- Q: (cold review) And past the cap on watchers? → A: the cap rises to 12 (F48 amended); beyond that, the oldest is closed and that workspace recalculates: accepted risk. Radar and panel share each folder's watcher (assumed).
- Q: What counts as a clash? → A: two open workspaces of the same repo (neither a review one) that change the same file relative to their base, with commits or without (assumed).
- Q: Where is it seen? → A: in the row of each affected workspace, a grey line «Choca con {rama} en {archivo}» (and «y N más»), with the whole list on hover; no new colour: grey plus one accent (assumed).
- Q: How much does it cost? → A: each workspace's file list goes through the `quiet-panel` watcher: no changes, zero processes; the cap on watchers rises from 4 to 12 so that radar and panel do not evict each other (assumed).

- Q: (at build time) How are the «{rama}: {archivo}» entries separated in the title? → A: one per line (`\n`) (assumed).
- Q: (at build time) Who polls every 10 s? → A: the sidebar's workspace list, while it is mounted (assumed).
- Q: (at build time) The cap test with 13 watchers takes ~50 s on this Mac (each process is expensive) → A: its limit goes from 60 s to 120 s; the radar ones, to 90 s (assumed).

### Lessons for every agent (lessons-first, 11 nov 2026)

- Atril reminds every agent of the repo's lessons with a fixed sentence; the agent reads the content.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Paste the content in the prompt | goes stale and bloats the context; the agent can read it |
| Put it in the repo's `CLAUDE.md` | writes into the person's repo |

#### Decision log, answers as given (2026-11-11)
- Q: (cold review) And the command that «Empezar» shows? → A: it looks at the file in the chosen repo's folder (the worktree comes from it); with no repo chosen, it does not carry it. The one that is launched looks at the workspace's folder (assumed).
- Q: (cold review) QA and the custom `argv`? → A: the QA agent does not carry it; the custom `argv` is for tests only (assumed).
- Q: (cold review) Links? → A: neither `.agents` nor `lessons.md` may be links (`lstat` of both) (assumed).
- Q: How do the lessons reach the agent? → A: on startup Atril adds `--append-system-prompt` with a fixed sentence asking it to read `.agents/lessons.md` before starting; it does not copy the content (the agent reads it from the repo, always up to date) (assumed).
- Q: Always? → A: only if `.agents/lessons.md` is a regular file inside the workspace's folder (not a link); otherwise nothing changes (assumed).

### Where it gets stuck (stuck, 11 nov 2026)

- The per-stage times come from git when the workspace is closed; Atril does not watch times while you work.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Watch the step live | the watcher only looks at the chosen workspace; the others would be lost |
| Forge (MR) times | another network call and another source; left for later |

#### Decision log, answers as given (2026-11-11)
- Q: (cold review) When is «closing»? → A: the moment `historyEntry` runs, right before the workspace is removed (assumed).
- Q: (cold review) What is «ticking a box»? → A: a commit in which the number of closed boxes given by `parseBoxes` (`src/main/flow/checklist.ts`) goes up compared with the document's previous commit (assumed).
- Q: (cold review) Which commits? → A: the branch's, `git log <baseCommit>..HEAD -- <proposal.md>`, from oldest to newest; a commit where the file no longer exists (landed) is skipped (assumed).
- Q: (cold review) Median and ties? → A: of the 20 most recent, those that have that stage; with an even number, the mean of the two middle ones; tie: the first in the order Spec, Plan, Construir, Cierre; under a minute is written «<1 min». The headline goes inside Terminados, visible when it is expanded (assumed).
- Q: Where do the times come from? → A: from git, once, when the workspace is closed: the commits of the change document (`.agents/changes/<cambio>/proposal.md`) mark when the spec was written, when the checklist appeared and when the last box was ticked; the start is the workspace's creation and the end, its closing (assumed).
- Q: Which stages? → A: Spec (from opening to the spec written), Plan (up to the checklist), Construir (up to the last box), Cierre (up to closing the workspace: review, MR, landing) (assumed).
- Q: (at build time) What does the branch's first commit count against if it raises boxes? → A: against 0; the document at `baseCommit` does not count (assumed).
- Q: (at build time) And if no stage comes out? → A: the line carries no `steps` (assumed).
- Q: (at build time) How is {d} rounded? → A: down, in a single unit (105 min → «1 h»); «Cierre» in English is «Wrap-up» (assumed).
- Q: Where is it seen? → A: in Terminados: each workspace's stages in its row and, at the top, the stage with the highest median of the last 20 (assumed).

### QA in the MR (qa-to-mr, 11 nov 2026)

- QA reaches the MR as a comment the person publishes; never on its own.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Put it in the MR description | the agent writes it when creating the MR; rewriting it tramples its work |
| Upload screenshots | GitHub has no API for images in comments; GitLab does: left for later |

#### Decision log, answers as given (2026-11-11)
- Q: (cold review) Which MR, exactly? → A: one of «Mías» (the person is the author, so it can be commented on) whose branch is the workspace's and whose project resolves to the workspace's repo with the same lookup as `openmr`; with several, the most recently updated; with none, there is no button (assumed).
- Q: (cold review) And if the MR screen was never opened? → A: main requests the MR list itself, reusing the last one if it is under 60 s old (assumed).
- Q: (cold review) Language and criteria without steps? → A: the comment is in the app's language; a failing criterion carries its note, or else its last step, as a quote (`> `); with no target, the first line does not name it (assumed).
- Q: (construction) How does the failure of the W150 comment get fully carried? → A: `threads.reply` also returns `detail` and `fix` when the forge fails (`MrReply` admits them); `threads.test.ts` now requires all three; and `openmr.ts` exports `remoteNaming` so that QA resolves the repo the same way as «Seguir en Atril» (assumed).
- Q: (construction) Comment format? → A: each line is its own paragraph (lines separated by a blank one) so that the `> ` quote does not swallow the next one; the criterion text without its id; the target as its tab («Chrome», «Android · app») (assumed).
- Q: When does it reach the MR? → A: only when the person presses «Publicar en la MR» on the QA screen; Atril does not create the MR (the agent opens it) and does not publish by itself (assumed).
- Q: What is published? → A: a general comment with the target tested and one line per criterion — Pasa, Falla or Sin probar — and, on those that fail, their last step; not the screenshots (GitHub has no API to upload images to a comment): the comment says they are in Atril (assumed).
- Q: How does Atril know which MR it is? → A: the open MR in the MR list whose branch and repo match the workspace's (assumed).

### Notifications (main) (notify-core, 12 nov 2026)

- See `proposal.md` → Prior decisions; all of them apply here.

### Read-only terminal (terminal-read-only, 14 nov 2026)

- **Read-only terminal** (Pau, 12 nov): no input from the person goes through the xterm.
- **Libretto does not change** (assumed): Atril adapts to how Libretto asks, never the other way round.
- **`kind` in the state** (assumed): extends, does not replace, the text prefix of `notify-core`.
- **Keys through tmux as the transport** (assumed). Ceiling: depends on how Claude Code's TUI draws; the Agent SDK replaces it.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Agent SDK now | rewrites tmux, pause, reopen and replies; Pau chose step by step |
| Leave the terminal writable with a warning | Pau: «they should be read-only» |
| `PermissionRequest` hook that decides | blocks the hook waiting for Atril; the keys already work and the SDK will solve it with data |

#### Decision log, answers as given (2026-11-14)
- Q: How is the terminal made read-only? → A: «Paso a paso (Recommended)»: now, with the hooks that exist; the Agent SDK as a separate change afterwards.
- Q: Is Libretto touched? → A: no; Libretto keeps asking with `AskUserQuestion` and ending turns with text; Atril only changes who answers (assumed, «I leave it to you»).
- Q: How do we know what the agent is waiting for? → A: a new `kind` field in the state (`question`, `permission`, `turn-end`, `idle`), besides the text; it replaces «question versus turn end by prefix» from `notify-core` without breaking it: the text keeps its prefix (assumed). If incorrect: it is deduced from the prefix and `notification_type` in main.
- Q: How does Atril answer? → A: as today, with keys to the pane through tmux (`sendKey`, `pressKey`, `pasteText`); the person never types in the terminal (assumed). The Agent SDK will change this to data.
- Q: How is a permission allowed? → A: «Permitir» sends `1` (Yes, once), «Denegar» sends Escape; «Permitir siempre» stays out (assumed: it changes project settings without the person seeing it).
- Q: Several questions in one `AskUserQuestion`? → A: the card shows them one at a time, in Claude Code's order; answering one moves to the next (assumed; checked in the real app with a real Claude).
- Q: Multiple selection? → A: out of this change: the card shows the question and the options and says «Contesta por escrito abajo» (assumed). Ceiling: with the SDK it arrives as data.
- Q: And in Automatic mode? → A: «when it is automatic mode… nothing should show up, that is, people have to keep moving forward, with their decisions and everything» (Pau, 12 nov). Atril answers itself: the recommended option on a question, «Sigue con el plan; no hagas nada que no esté en él.» on a turn end; it only stops at what we already agreed asks (push and MR, W59) and at a real failure (a gate that fails twice, a missing tool) (assumed for the two exceptions; if Pau wants push without asking too, change W59).
- Q: Is a permission granted by itself in Automatic? → A: no; Claude Code's automatic permission mode already decides almost everything, and what it still asks shows as a card: blindly granting what Claude Code itself does not dare is a security risk (assumed).
- Q: What does «Sigue» send? → A: never a bare «yes»: in dogfooding, «Sí, sigue» was taken as approval of the last thing Claude had offered (publishing a comment on PR #11). It sends «Sigue con el plan; no hagas nada que no esté en él.» (assumed).
- Q: Is there still any way to type in the terminal? → A: not inside Atril; «Abrir en Terminal» (already exists) remains for anyone who wants the raw TUI (assumed).

- Q: Are W74–W76 extended or replaced? → A: replaced, marked `(amended)`: W74 stores all the questions uncut, W75 changes its answer shapes (no «Sí, sigue»), W76 becomes the per-kind card (assumed).
- Q: In Automatic is the notice in Avisos also suppressed? → A: yes, for what Atril answers by itself there is no notice of any kind; V3 and W15 are amended (assumed).
- Q: And the ⌘D shell panes? → A: also read-only; ⌘D/⌘⇧D stop doing anything and «Abrir en Terminal» gives the writable shell (assumed).
- Q: ⌘↩? → A: sends the composer only when it has focus; elsewhere N2/W79 rules (assumed).
- Q: Does the idle reminder change the `kind`? → A: no; it sets `idle: true` and keeps the rest (W195 amended) (assumed).
- Q: When does Automatic's cap of 3 reset? → A: after 30 s straight working, not with the instant that follows our own «Sigue» (we saw it in the test) (assumed).
- Q: Does the push stop in Automatic come from the text or from W59's permission? → A: from W59's permission (W207); the text is not read (assumed).
- Q: Multiple selection in Automatic? → A: it stops as in Manual (assumed).
- Q: Who tracks which question is next? → A: main, per session, from 0 on each entry into needs-you; after the last one, Enter to submit (assumed; checked with a real Claude).
- Q: Background shell tasks? → A: out of scope; only subagents, which the hook already records. Ceiling: with the Agent SDK it arrives as data (assumed).
- Q: Where does a permission's tool come from? → A: from that session's last PreToolUse, which the hook remembers (assumed).
- Q: Does W45 still warn Claude? → A: no; the hook claims the threshold without telling it anything and F25 carries the buttons; «Dejarla así» is stored in `ui.json` `bigDismissed[workspaceId] = k` and survives a restart (assumed).

- Box 1 touches outside «In»: `src/main/menu.ts` (out go «Dividir a la derecha/abajo», ⌘D/⌘⇧D, W196) and the tests that mounted the menu with `split` (`src/main/i18n.test.ts` changes the example label to «Pausar»; `src/renderer/flow/boxes.test.ts` checks that ⌘D/⌘⇧D no longer exist; `tutorial`, `pause`, `focus` and `overview` only lose `split`); `src/renderer/tour/Tour.tsx` (the terminal step said «escribe en él» and ⌘D); `src/main/pty.test.ts` loses the calls to `input`, which no longer exists. `splitPane` stays in `tmux.ts`: its tests prove other criteria (W163, the exact destination) (assumed).
- Box 2: «an asked question keeps its options» (W74's old proof) is replaced by the one that names amended W74. The hook no longer writes `options`/`multiSelect`; main still reads them from old states (Constraints). W198 «remember per session» lives in an option of the tmux session (`@atril-tool`), read and written in the same `display` call the hook already made: storing it on disk broke A1's proof («hook appends a short summary, never the payload»: no file under `ATRIL_HOME` with the command). That way a command reaches disk only when a permission is waiting on it, as W198 asks (assumed).
- Box 3: «a quick answer reaches its own pane» (src/main/reply.test.ts, W75's old proof) is removed: amended W75 cites the two in `status.test.ts`, which cover its clauses (own pane, option out of range, a state that no longer waits, odd shapes, a workspace that is gone). N3 («a number answers the option with its key») now expects W75's final Enter after the last question. `QuickReplies.tsx` and its test move to `{ option, question }` and «Sigue» until box 4 replaces them. Outside «In»: `src/main/activity.ts` (W199: the «Esperando a un subagente» line on top and the watcher also looks at `state/`), `src/preload/activity-i18n.ts` (W203 for old lines), `src/renderer/mockApi.ts` and `src/renderer/overview.test.ts` (the new shape) (assumed).
- W75 says «a gone workspace or pane answers W53's sentence», but W53 belongs to the runner: N3's sentence is used («No se pudo enviar: ese trabajo ya no está»), as until now (assumed).
- W203 is fixed at the source: `summarise.mjs` writes «Te pregunta: ¿Puede usar {tool}?», «Te pregunta: ¿Puede seguir?» and «Claude te necesita» in place of Claude Code's English messages; old lines are translated when shown (assumed).
- Box 4: `QuickReplies.tsx` is deleted and with it the IPC `status.quickReplies` (main still uses it for N3); its old W76 proof («a waiting row answers with one press») is removed from `src/renderer/quickreplies.test.ts`, which keeps «the question card reads in every theme»; the row/strip-above-the-terminal one now lives in «a card answers by mouse and by number keys». W82 still says that in «Todos» a multiSelect question carries no card: `AgentCard` has `skipMultiSelect` only for there; `src/renderer/overview.test.ts` changes the group's name and uses `waits`. Outside «In»: `src/renderer/styles.css` (header, «Recomendada», description and the strip) (assumed).
- The proof of W76–W202 was written before `AgentCard.tsx`, but it was not seen red: it was run for the first time with the component already written.
- Box 5: the composer replaces the hint «Escribe en la terminal como siempre» (W143 said the hint does not show with the agent stopped: now the hint does not exist and the composer shows disabled; `src/renderer/reopen.test.ts` checks that instead of the hint). ⌘↩ is the accelerator of the «Siguiente» menu, which Electron handles before the page: `src/renderer/App.tsx` sends the composer when it has focus and otherwise continues with N2/W79 (outside «In»). Main: `composeAgent` in `status.ts` and the IPC `status.compose` (assumed). Its CSS travelled in box 4's commit.
- Box 6: what Automatic answers itself is read as `working` in `createStatus` (that is why there is no card or notice, V3); the answered wait is remembered by its `at` so as not to answer it twice. «Decidió: …» is an activity line that main sets (like W199's) until the agent writes another; with several questions, the labels are joined by « · ». An option without `options` or a call with a question without options stops as Manual. If sending fails, it stops as Manual. The proofs of boxes 3, 5 and 6 were written before the code but run with the code already in place; to see that they bite, the code was broken on purpose (`automatic` disabled: two of three red; the third is a «never» that only falls if Atril grants) and put back (assumed).
- Box 7: `sizeNotice` becomes `claimSize` (returns the claimed `k`) and the hook no longer prints anything; W45's old proof («a large branch asks claude to offer a split», src/main/activity.test.ts) is removed: the new one in `agent.test.ts` runs the real hook and repeats its cases. F25's («a large branch warns at the top of the panel») is replaced by «a large branch offers to split it from the warning». Outside «In»: `src/renderer/flow/FlowPanel.tsx`, `src/main/ui.ts` and `src/preload/api.ts` (`bigDismissed`, which is merged key by key like `folded`; new proof «remembers each branch-size threshold left as it is, per work» in `src/main/ui.test.ts`), `resources/branchsize.mjs`/`.d.mts`, `src/renderer/tour/Tour.tsx` (the checkbox step said Atril had already asked Claude for it) and `src/renderer/styles.css` (assumed).
- Box 8 (real app): with the terminal attached with `attach -r`, tmux 3.7 rejects every `send-keys` to that session («client is read-only»): no answer, pause or Enter got through. The tests did not see it because none attaches a read-only client. Fix in `src/main/tmux.ts` (outside «In»): if `send-keys` fails for that reason, the same bytes go as an unbracketed paste (`paste-buffer -r`), which arrives as typed; `Enter` is `\r` and `Escape` is `\x1b`. New proof with a real `-r` client: «keys reach a pane that a read-only client watches» (src/main/tmux.test.ts). Existing tests still see `send-keys` because they attach no clients (assumed). To be checked with a real Claude that a digit typed this way is taken by the selector.
- Box 8 (real app), two more fixes: the row's card and the one above the terminal did not learn of an answer given in the other (with several questions, the row kept offering the first, which main already rejects): now an answer notifies both and, once all are answered, the card says just «Enviado» (new case in «a question card answers with its options»). And «Decidió: …» did not show until the hook's next write: the activity feed rereads when Automatic decides (assumed).
- Box 8, real app (dev, fake `claude` behind a fake `SHELL`, panes with `cat` to see each key): four rows with a card (question with two questions and reasons, Bash permission, turn end, turn end with `idle`); typing in the terminal did not reach the pane; «1» with the card focused sent `1`+Enter and both cards moved to the second question; the last one sent its number, Enter and the final Enter; ⌘↩ in the composer sent the text and emptied the box; «Permitir» sent `1`; the turn end focused the composer and «Sigue» pasted «Sigue con el plan…»; Automatic answered the recommended one («Decidió: Contarlos como festivos» in the row, no card), pasted «Sigue con el plan…» three times and on the fourth showed the card; a permission in Automatic showed its card. No console errors. Photo: `bocetos/novedades/tarjetas.png`. Not checked (needs a real Claude, no quota was spent): that Claude Code's selector takes the digit + Enter and the final Enter with several questions, and that «Permitir» = `1` on its permission.

### Correction ladder (harness-ladder, 20 nov 2026)

- (2026-11-19, harness-ladder) A lesson that repeats goes up to the highest rung that stops it (design > type or lint > test > text); a new entry in `lessons.md` names the lessons it replaces so that the retro does not count them again.
- (2026-11-19, harness-ladder) The commit hook runs typecheck and lint, not the suite: the suite stays at the gate.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| husky / lefthook | a dependency for a three-line file |
| Move `WARN_AT` and the models to `src/shared` to apply the boundary to tests too | the test that crosses only compares a constant; moving prevents no failure |
| Prove the rules by running `pnpm lint` over fixture files | writes files into the tree; `lintText` does not |

#### Decision log, answers as given (2026-11-20)
- Q: Which lessons go up first? → A: those that repeat and fit in a rule that passes today or passes with few fixes: main↔renderer boundary, hand-written `window.atril` mocks, `homedir()` out of its place and red commits (assumed; report in the queue's `report.md`).
- Q: Do the rules apply in tests too? → A: the boundary does not (seven tests cross it to compare constants; moving them prevents no real failure); the mocks one only in tests (assumed).
- Q: Does the commit hook run the whole suite? → A: no, typecheck and lint: the suite takes more than 10 min under load; the suite stays at the gate (assumed). If incorrect: the hook calls `gate.sh`.
- Q: (spec-reviewer) What counts as importing? → A: `import`/`export … from` declarations, type ones included; dynamic `import()` and `vi.mock` do not (assumed: `no-restricted-imports` does not see them and nobody uses them that way today). A test is a `*.test.ts(x)` file; `test-helpers.ts` is not. `src/preload/**` is outside the rule.
- Q: (spec-reviewer) What counts as assigning `window.atril`? → A: any assignment to a property called `atril` (`window.atril =`, `(window as X).atril =`, `globalThis.atril =`); `vi.stubGlobal`, `Object.assign` and `defineProperty` are out (assumed: nobody uses them for `atril` today).
- Q: (spec-reviewer) What counts as reading HOME? → A: `process.env.HOME` and `process.env['HOME']`; `env['HOME']` on a parameter (`login-path.ts`) and the allowed-variables list in `forge/create.ts` do not, because they do not look for the user's home (assumed).
- Q: (spec-reviewer) How do tests migrate without changing what they test? → A: `mockApi` accepts a third argument `over`, a deep partial of `AtrilApi` that is merged over the full mock; each test passes its stubs from today as they are, never-resolving promises included, and its `expect`s are not touched (assumed).
- Q: (spec-reviewer) `lessons.md` only grows: how are the covered ones marked? → A: one new entry per box, `## 2026-11-19 · harness-ladder · arnés`, that names the lessons the rule replaces (assumed).
- Q: Atomic writes and wrapped `ipcMain`? → A: out of this change: 15 files with `writeFile` and 109 `ipcMain` in `index.ts` call for their own change (assumed).

- Q: (builder) How long does `.githooks/pre-commit` take? → A: 5.3 s and 4.8 s (typecheck + lint, two measurements with `time`), far below the risk's 60 s: it stays as it is.
- Q: (builder) What type does `over` have? → A: a loose deep partial: a function leaf accepts any function and each level admits extra members, because the tests keep their stubs as they are (partial answers and `term.input`, which the API no longer has and `components/terminal.test.tsx` stubs to prove nobody calls it) (assumed).
- Q: (builder) What date do the lessons entries carry? → A: `## 2026-11-20 · harness-ladder · arnés`, the day they are built, not the 19th that the entry above says (assumed).

### Enforced rules (enforce-written-rules, 26 nov 2026)

- (2026-11-26, enforce-written-rules) A rule moves from prose to the highest rung that holds it (harness-ladder, 2026-11-19): the work-identifier scan becomes a pre-push hook, the `pnpm build` ban a PreToolUse guard; CLAUDE.md keeps a one-line pointer to each and never the command.
- (2026-11-26, enforce-written-rules) The tip tree of each pushed ref is what is scanned, not the history: ceiling named in Scope, upgrade is `git log -p`.
- (2026-11-26, enforce-written-rules) Fail closed on a failed scan, fail open on an unreadable guard payload.
- (2026-11-26, enforce-written-rules) The per-branch history in CLAUDE.md goes: git log and `.agents/specs` already hold it. The lesson «a pnpm-lock `integrity` hash can match by chance» is kept as the filter in the hook, not as prose.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Guard as a `.mjs` file | one more JS file under `eslint .`; the globals block `.cjs` needed in package-and-sign would repeat |
| `permissions.deny` rules | generic reason, cannot be run without a live Claude Code, and the ask names a hook |
| Scan every commit's diff (`git log -p remote..local`) | the rule today is a tree scan; the diff scan needs the remote sha to exist locally and handles new branches badly. Comes back if an identifier added and removed inside one push is ever seen |
| Exclude `pnpm-lock.yaml` from the scan altogether | would let a real name in a lock line through; only the `integrity:` lines are noise |
| husky / lefthook for the hook | `harness-ladder` already decided: a dependency for a few lines of shell |
| Parse the Bash command with a full shell parser | the guard's cost would exceed the rule's; the regex names its ceiling |

#### Decision log, answers as given (2026-11-26)
- Q: What does the pre-push scan read: the tree of each pushed commit, or the diff of every commit in the push? → A: the tree of each pushed commit, as CLAUDE.md's `git grep … HEAD` does today (assumed). If wrong: an identifier added and removed again inside one push goes through; scan `git log -p remote..local` as well.
- Q: What does "ignoring the integrity line" cover? → A: only `pnpm-lock.yaml` lines that contain `integrity:`; any other line of the lock file is scanned (assumed). If wrong: a work package name in the lock file would slip through if the whole file were excluded.
- Q: A blank line in the list file: `git grep -f` treats it as an empty pattern that matches every line. → A: blank lines are dropped before scanning; a list with no pattern left behaves like a missing list (assumed).
- Q: The scan itself fails (an invalid pattern in the list). → A: the hook fails closed: refuse the push and say the scan failed (assumed). A guard that says nothing on error is a guard that is off.
- Q: How does the Claude Code guard deny? → A: exit 2 with one line on stderr (assumed): it needs no JSON output and a test asserts it directly.
- Q: Which commands does the guard deny? → A: `pnpm` running the script `build`: `pnpm build`, `pnpm run build`, option flags in between (`pnpm -s build`), at the start of the command or after `;`, `&&`, `||`, `|` or a newline (assumed). Not denied: a command that only mentions it (`git commit -m "never pnpm build"`), `pnpm builder`, other build entry points. If wrong in the first direction a rephrased command costs one retry; the second is named in Scope.
- Q: A payload the guard cannot parse, or a tool that is not Bash. → A: the guard lets it through (assumed): Claude Code always sends JSON, and a guard that breaks the session on a surprise teaches people to remove it.
- Q: How big may CLAUDE.md be after the trim? → A: at most 7000 bytes, tested (assumed; it is 14474 today). Without a number the history grows back one landing at a time.
- Q: Language of CLAUDE.md? → A: English, all of it (the ask says all in English; the repo is public).
- Q: How is the guard written? (fork, phase 5) → A: a `.sh` file that reads the payload with `node -e` (assumed). Rejected: a `.mjs` file (one more JS file inside `eslint .`'s scope, which needs its globals declared as `package-and-sign` found for `.cjs`); `permissions.deny` rules in settings.json (native and zero code, but the reason shown is generic, the ask names a hook, and a deny rule cannot be run without a live Claude Code). If wrong: the guard moves into a `.mjs` with an eslint block, nothing else changes.
- Q: (spec-reviewer) Which `pnpm … build` shapes does the guard deny, exactly? → A: `pnpm` at a command position, then flags that take no argument, optionally `run` and more such flags, then `build` (assumed). `pnpm -C dir build`, `pnpm --filter x build`, `(pnpm build)`, `$(pnpm build)`, `env X=1 pnpm build` and `sh -c "pnpm build"` pass: named in Scope Out. `echo "a; pnpm build"` and a multi-line commit message with a line that starts `pnpm build` are denied: a false deny, also named. If wrong: widen the regex; nothing else changes.
- Q: (spec-reviewer) Is the registration proved? → A: yes, the test asserts the entry under `hooks.PreToolUse` has `matcher: "Bash"` and a hook of `type: "command"`, not only the command text (assumed).
- Q: (spec-reviewer) Does the hook print `path:line` or git's own output? → A: git's own output, `<sha>:path:line:text` (assumed), so the person sees what matched.
- Q: (spec-reviewer) One test or several per criterion? → A: one `it` per criterion holding every clause (assumed).
- Q: (spec-reviewer) A tag object, a sha the clone cannot resolve, a list that exists but cannot be read. → A: each is a failed scan and refuses the push (assumed): W232.
- Q: (spec-reviewer) What makes CLAUDE.md's size test strong enough? → A: it also asserts the three state sections (`## Last landed`, `## Next`, `## Untested with real data`), and that neither `Where we left off` nor the old Spanish title `Dónde lo dejamos` is left (assumed).
- Q: (spec-reviewer) Where do the lessons entry and the `Governs:` line belong? → A: in box 3 and its commit; they close no criterion (assumed). The reason the guard prints says this repo is never built in a session.
- Q: (user, 2026-11-26) The parallel change `fewer-go-on-cards` already takes W217–W224 in `workspaces`. → A: renumber mine to W230 and up.

### Fewer go-on cards (fewer-go-on-cards, 26 nov 2026)

- 2026-11-26 (assumed, decision log): `done` is a fourth agent state, not a `needs-you` kind.
- 2026-11-26 (assumed): no «I'm done» phrase list; open boxes decide.
- 2026-11-26 (assumed): dedupe key is (turn, kind, text) per workspace.
- 2026-11-26 (assumed): keep-going in every mode.
- Ponytail: the prose-question rule looks only at the end of the last assistant text; a rhetorical question at the end reads as a question (it costs one card, never a wrong push). Ceiling: if it misfires often, require the question in the last paragraph outside code fences.
- Ponytail (issue #5): the shell signal reads only the 64 KB tail. Ceiling: a shell started earlier in a long turn is missed and the stop is classified as before (a card, never a lost one); a shell that ends with no `<task-notification>` (Claude Code killed) leaves the row «trabajando» until the next hook event. Upgrade: track starts in the hook's own state.
- Ponytail: the cap is a count of blocks in a row (5), not a progress check; an agent that loops without closing boxes costs 5 extra turns before the card. Upgrade: compare the open-box count between blocks.

### Repo harness (repo-harness, 26 nov 2026)

- (2026-11-26, repo-harness) Read-only and never auto-fixing: Pau's ask. A gap offers at most one button that opens a doc.
- (2026-11-26, repo-harness) The card lives under the Repos row and reads on open (assumed).
- (2026-11-26, repo-harness) Owned by workspaces with W280+ ids; the card sits outside settings' `Governs:` (assumed).
- (2026-11-26, repo-harness) Scripts are read from `package.json` and `composer.json` only. Ceiling: a repo driven by a Makefile reads as gaps; adding Makefile targets is the next step if that proves common (assumed).
- (2026-11-26, repo-harness) Hook files are looked up in `.githooks/`, `.husky/` and `.git/hooks/` (only when `.git` is a folder; a worktree's `.git` is a file and its hooks are shared) — ponytail: three fixed places, no `core.hooksPath` read (assumed).
- (2026-11-26, repo-harness) Doc URLs are a fixed list in main, verified with `curl -I` when built (assumed).
- (2026-11-26, repo-harness) The one edit in `src/renderer/settings/Repos.tsx` (a toggle and a mount line, W286/W287) belongs to workspaces; settings' own Repos criteria are unchanged because nothing existing in the row moves (assumed; found by the cold review).
- (2026-11-26, repo-harness) Detection is one pure function over a root path, run on demand when the card opens, never during `repos:list` (assumed).
- (2026-11-26, repo-harness) Detection returns data only (`id`, `group`, `ok`, `detail`); the why-lines and labels are written in the window through `t()` (assumed).
- (2026-11-26, repo-harness) Detection spawns no process and calls no Claude; the first thing that needs one (effective hooks path, merged settings) is a new change (assumed).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Main classifies `done` from the workspace's folder | Two readers of the boxes; the block must live in the hook (synchronous), so main would duplicate the parser in TS. |
| `done` as a `needs-you` kind | Phase 2 decision: the row would still ask for attention (issue #7). |
| Count blocks in a separate file or tmux option | The state file is already rewritten per event; carrying two fields costs less than a new store. |
| Honour only `stop_hook_active` (never block when true) | Caps at one block per stop chain, so the agent stops again after one extra turn; the ask wants up to 5. |

#### Decision log, answers as given (2026-11-26)
- Q: A finished change (no open boxes, no question): a new agent state «terminado», or still `needs-you` with a card without «Sigue»? → A: «No más preguntas» — taken: a new state `done` (assumed: the row stops asking for attention, which is the issue; if wrong, `done` becomes a `needs-you` kind and the renderer pieces go).
- Q: «or the agent says it is done» with boxes still open? → A: (assumed) no phrase list: open boxes keep the agent going (W217) and the cap (W218) brings back the card; a deterministic phrase list would misread «done with phase 2». If wrong: add a phrase rule before W217.
- Q: What is «the same turn end» for item 4? → A: (assumed) the same prompt turn (no `UserPromptSubmit` in between), same kind and same text. The dev log that showed it was not kept, so the cause is unknown; the rule guards the symptom whatever its source. If wrong: narrow to the same hook `at`.
- Q: Does keep-going apply in Manual too? → A: (assumed) yes, in every mode: the ask names no mode and the cards it removes are Manual's.
- Q: (phase 5) Where is a stop classified? → A: (assumed, «No más preguntas») all in the hook, in a new pure `resources/keepgoing.mjs`; main only reads `state`/`kind`. Lost: main classifying `done` from the workspace path (two readers of the same boxes, and the block must be in the hook anyway); the block in `branchsize.mjs`'s style of side claims (a claim file main acts on cannot block a Stop, which is synchronous).
- Q: Which changes count? → A: (assumed) every `.agents/changes/*/proposal.md` of the agent's repo whose `## Checklist` has an open box; the old `tasks.md`/`plan.md` layouts do not (none in flight here).
- Q: (issue #5, Pau) What signal says a background shell still runs? → A: (assumed, read off this session's own transcript) in the transcript tail, a `tool_result` block whose content starts «Command running in background with ID: <id>» with no later user entry whose content starts «<task-notification>» and holds `<task-id><id></task-id>`. Parsed entries only, never raw text: a transcript quoting those strings (this one does) must not count. Lost: the hook tracking `run_in_background` from PreToolUse/PostToolUse into its own file (a second store, and the end of a shell fires no hook event).
- Q: (why-card) Which box is «the box it is on»? → A: (assumed) the first open box of the first change W217 lists, the next one the agent would take; its text after `[ ]`, clipped to 120.
- Q: (why-card) Does a «Sigue» pressed between two stops break a loop? → A: (assumed) no: the count carries across prompts, because pressing «Sigue» on the same answer again is exactly the loop to show.
- Q: (why-card) «Pausar» on a turn end: Escape too? → A: (assumed) no: the agent is already stopped; only the mark is written, so it reads «en pausa» and Automático leaves it.
- Q: (spec-reviewer) V11, W27, W199, W217's bounds, joined proofs, W223's head, W222's rank, other `AgentState` readers? → A: Pau: «Arreglar y construir». V11 amended in `spec-avisos.md` (entering `done` marks nothing read; leaving `done` for any other state does); W27 bounded by W221 and a missing `turn` never matches; W199 covers `done`; the search stops at the repo root (`.git`), every change of the worktree counts (an Atril workspace is one branch), and the reason drops «mark it»; one proof per clause (W225–W227 split out); W223 asserts q exactly; W224 ranks `done` with `working`; F51 for `DocModal`. Accepted: the double notice is not reproduced, so W221 guards the symptom only.

### QA pictures in the MR (add-pr-qa-pictures, 26 nov 2026)

- W170/W174 stay: the MR is the work's own MR in Mías by repo and branch; the comment text is W170's (2026-11-11).
- Trigger is the press with a preview sheet, not automatic (2026-11-26, assumed; see Decision log).
- Hosting: GitHub orphan branch `atril-qa` via Git Data API; GitLab uploads API (2026-11-26, assumed; reasons in Decision log).
- Privacy is five layers, fail closed, person last (2026-11-26, assumed).
- Before/after comes from Atril's own ledger of published views whose commit is in the target branch (2026-11-26, assumed).
- Ceiling, OCR: Vision reads ordinary UI text; text it cannot read (tiny, rotated, stylised) is not checked by machine — the sheet is the gate for it.
- Ceiling, leak rules: the crash scrubber's rules are best effort (R1); a hit blocks the whole picture, so a false positive costs a picture, never a leak.
- Ceiling, description race: main reads the description again just before writing and refuses if it changed since the sheet was built; an edit landing in the second between that read and the write is lost. No forge offers a conditional write on the PR body.
- «Antes» comes from a recorded PR the forge reports merged into the same target branch, not from git ancestry: GitHub merges here squash (mr spec), and a squashed head is never an ancestor (2026-11-26, stop before code).
- Ceiling, «Antes» lookup: one forge read per candidate PR, newest first, stopping at the first merged one; at most 5 candidates are read per view.
- A prepare token survives a failed send until its 10 min expiry, so «Volver a intentar» resends the same bytes (2026-11-26, stop before code).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Swift OCR helper binary | a build step and code signing for the same Vision call JXA already makes |
| `nativeImage` re-encode | Electron needed in tests; lossy re-compression; the chunk filter is exact |
| One call that prepares and sends | no preview, so the person never sees what leaves |
| GitHub: commit pictures to the work's branch | the ask forbids it; binaries in every clone and in the diff |
| GitHub: user-attachments upload | undocumented, needs a browser session, not a token |
| Pictures as a comment (W170 grown) | the ask names the PR body |
| Redacting the leaking area | needs text boxes and image editing; blocking is simpler and fails safe |

#### Decision log, answers as given (2026-11-26)
- Q: Atril never opens the PR itself (the agent runs `gh pr create`); when do the pictures reach the PR body? → A: «No more questions» — taken: «Publicar en la MR» (W170) grows a preview sheet showing exactly the pictures that will go and the blocked ones with why; on «Send», main writes an Atril section into the PR description, replaced on each re-publish (assumed). If wrong (pictures should land with no press): drop W251's sheet and call publish when the work's MR first appears; privacy then rests on W243 alone.
- Q: where are the pictures hosted? → A: GitHub: an orphan branch `atril-qa` in the same repo, written through the Git Data API, each picture linked by its commit (`/blob/<commit>/qa/<name>.png?raw=true`); GitLab: the project uploads API (assumed). Why: GitHub has no public API to upload a PR attachment (the web's user-attachments endpoint is undocumented and session-bound), and an orphan branch shares no history with the work's branch, so the work's commits and diff never carry a binary; GitLab's uploads API is the native, documented attachment store and puts nothing in any git history. Committing to the work's branch was rejected because the ask forbids it and it would grow every clone. If wrong (no extra branch on GitHub wanted): GitHub falls back to the text comment.
- Q: how is privacy enforced, not hoped? → A: in main, before any byte leaves, five layers (assumed): (1) only validated QA step shots that are real PNGs, size-capped; (2) every PNG rebuilt with critical chunks only and named by its hash, so no metadata or file name leaves; (3) on-device OCR (macOS Vision through `osascript -l JavaScript`, no new dependency, measured 1.6 s per picture on this Mac) whose text is matched against the crash scrubber's rules plus this Mac's host name and user name, failing closed when OCR fails; (4) the section's text goes through the same scrubber; (5) the person sees every picture in the sheet before anything is sent, which is the only gate for real data that has no shape (a person's name). If wrong (a picture with text that OCR cannot read, e.g. tiny or stylised): layer 5 is what catches it.
- Q: what is «the same view on the base branch»? → A: a QA step may name its `view` (a short slug the QA agent writes); after a publish, main records each view's picture URL with the work's head commit; a later work's picture of the same view in the same repo shows as «After» next to the latest recorded «Before» whose commit is already in the PR's target branch (assumed; replaced at the stop: the recorded PR must be merged into the same target branch, see the last entry). If wrong (a baseline captured on demand from the base branch): that needs a QA run on the base branch, i.e. a Claude call, which the ask forbids.
- Q: (phase 5 fork) how is it built? → A: «No more questions» — taken: main owns the whole pipeline in two calls (`qa.preparePublish` → sheet → `qa.publish(id, token)`), OCR by a JXA script run through the existing `Runner`, PNG cleaned by a pure chunk filter (assumed). Rejected: a compiled Swift helper for OCR (a build step and a binary to sign, for the same Vision call); `nativeImage` re-encoding (needs Electron in the tests and re-compresses every picture, while the chunk filter is exact and pure); one IPC call that prepares and sends at once (no preview, so layer 5 would not exist). If wrong: the Swift helper replaces only `ocr()`.
- Q: does the W170 comment stay when pictures go in the description? → A: no: with at least one sendable picture the description section replaces the comment; with none, publish posts the W170 comment exactly as today (assumed).
- Q: (stop before code) the cold reader's ten findings? → A: «Apply fixes, build (Rec.)» (Pau, 26 Nov). Settled with it: prepare writes nothing to a forge but reads it; the sheet shows the cleaned bytes prepare kept, not W113's thumbnails; no shots → the comment posts with no sheet, all blocked → the sheet with «Publicar sin imágenes»; a token survives a failed send until it expires; «Antes» comes from a recorded PR the forge reports merged into the same target branch (squash merges break ancestry, mr spec); the block keeps W170's quoted failing note and drops «Las capturas están en Atril.»; the button is disabled while preparing and pictures are read one at a time; the first leak reason in a fixed order is shown; W114's step answer carries `view`.

| Detect eagerly in `repos:list` and put the result on `RepoView` | Ten file reads per repo on every list load, for something read only when the card opens; also widens a type used everywhere. |
| Ask git for `core.hooksPath` and read merged Claude settings through `claude` | The ask says file reading, no Claude; a spawned process is what W284 forbids and makes tests slower and flaky. Ceiling: a repo with a custom `core.hooksPath` outside the three folders reads as a gap. |
| Main returns the sentences (labels and why-lines) | Main would need `t()` for ten more strings per item and the window could not test them without IPC; data in, words out keeps S16/S19 scanning one place. |
| A settings-capability card with S ids | The ask fixed W280+; putting the card under `src/renderer/harness/` keeps it in workspaces without touching settings' `Governs:`. |

#### Decision log, answers as given (2026-11-26)
Zero questions asked: the repo's autonomy rule says take the recommended option and mark it `(assumed)`. Each answer below names what changes if it is wrong.
- Q: Where does the card live? → A: a «Harness» disclosure under each row of Settings → Repos; it reads the repo when opened, not when the list loads (assumed; if wrong, the card component moves, the detector stays).
- Q: Which capability owns it, given W ids? → A: workspaces. The detector is `src/main/repoharness.ts`, the card `src/renderer/harness/HarnessCard.tsx` (outside `src/renderer/settings/**`, so settings' `Governs:` is untouched), and `Repos.tsx` gets one mount line (assumed; if wrong, the same criteria move to settings with S ids).
- Q: Which items, and what counts as present? → A: ten items, listed in Scope; a script is present when the repo's `package.json` or `composer.json` has it (assumed; Makefile targets and `pyproject` are out, named below).
- Q: What does a gap's one button open? → A: a docs page in the browser from a fixed list in main, only for items that have an obvious page (assumed; items without one show no button).
- Q: What does a ticked item show? → A: its detail only (file name, script name, line count, count); no button (assumed).
- Q: (build, box 1) Main speaks Spanish by default (`lang.ts`), so can a detail like «142 lines» come from main? → A: no; items carry `detail` (a name), `n` (a count) and `big`, and the window composes the sentence through `t()`, with singular and plural as their own keys (assumed; found while writing the first test; W280, W285 and the approach reworded, no criterion dropped).
- Q: (phase 5 fork) How is it built? → A: one pure `detectHarness(root)` in main that reads with `node:fs/promises`, runs only when the card opens, and returns plain data; the window owns every sentence (assumed; the recommended option). Rejected: (B) detect eagerly inside `repos:list` and put the result on `RepoView` — it taxes every list load for ten file reads per repo and nobody asked to see it until they open the card; (C) ask git for `core.hooksPath` and read effective settings through `claude` — the ask says no Claude calls and cheap file reading, and a spawned process is exactly what W284 forbids.

### CDP isolation (fix-cdp-isolation, 26 nov 2026)

- 2026-11-26 (assumed) The answers in the Decision log above, the placement of the guard (before the rest of `whenReady`) being the user's.
- Lessons `add-pr-qa-pictures` · 6, `skills-dense` · real app and `repo-harness` · real app each ended in «check the port with lsof». This change replaces that prose with code; the lessons stay as history.
- 2026-11-26 (assumed) A dev debugger port is trusted only after the instance proves, by a token the launcher chose, that the page behind it is its own; a busy port is fatal, never shared. Any future dev-only endpoint follows the same rule.
- Ceiling: the token proves «this page was loaded by the launch I made», not that nobody else on localhost can attach to the same debugger. Dev-only, loopback; Chromium's own endpoint stays unauthenticated.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Pre-probe the port with `net.createServer().listen` before `appendSwitch` | The switch must be set before `ready`, the probe is asynchronous, and the port can be taken between probe and Chromium's bind. It says nothing about who answers. |
| A `window.__atrilLaunch` global read by the driver | The driver would run JS in a page it has not yet proved is its own: the read the issue forbids. |
| Guard after the real window loads (first plan) | The app would run its startup, about a second of work, on a port it does not own. The user chose to move it before `whenReady`'s setup. |
| Create the real window first and verify it | The renderer would call IPC handlers that do not exist yet; the hidden probe avoids reordering the handlers. |
| `lsof` check in the helper | The careful path that already failed three times. |
| Random port chosen by Atril and reported back | Changes how every drive finds the app; the fatal check gives the same safety with no new protocol. |

#### Decision log, answers as given (2026-11-26)
- Q: where does the per-launch token live, on `window` or elsewhere? → A: in the URL the page loads (`?launch=<token>`), readable from `/json/list` before any page is read; no `window` global (assumed). If wrong: the driver would have to evaluate JS in a page it has not yet proved is its own, which is the bug.
- Q: who makes the token? → A: whoever runs `pnpm dev` (the drive session): it generates 16 to 128 characters of `A-Z a-z 0-9 _ -`, puts them in `ATRIL_LAUNCH_TOKEN` for Electron and gives the same value to `attachVerified`. Atril refuses to open CDP without it (assumed, from the cold review). If wrong: an app that invents its own token cannot be checked by a driver that was not told it. A drive that sets only `ATRIL_CDP_PORT` now dies at start, on purpose.
- Q: both ends compare the token how? → A: both parse the page URL with `URL` and compare the `launch` parameter for exact equality, never a text match (assumed, from the cold review: a token that is a prefix of another would pass a text match).
- Q: (approach fork) token proved from the URL by main and the driver, pre-probe of the port with `net`, or a `window` global read over CDP? → A: token in the URL, self-check by asking the port for a page that carries it (assumed). Lost: pre-probe (races Chromium's bind, and says nothing about which process answers); `window` global (the driver must run JS in a page before knowing it is its own).
- Q: (stop before code, asked by the cold review's finding 6) where does main's guard run: after the window loads (about 1 s after startup) or before the app's startup? → A: «Reordenar el guard antes de whenReady» (user, 2026-11-26): the guard runs before the rest of the startup. Mechanism chosen by the session (assumed): at the very start of the `whenReady` callback a hidden probe window loads `about:blank?launch=<token>`, main asks its own port for it, and only then continues. If wrong: the probe URL form may not survive Chromium; the real-app drive tells, and a `file:` URL replaces it.
- Q: do the criteria need a new capability? → A: no, `workspaces` already governs `src/main/**`; `Governs:` gains `scripts/cdp-drive.mjs` by a hand edit of `.agents/specs/workspaces/spec.md` in the landing commit, because `land.py` does not apply `Governs:` lines (assumed).

### Work vs main (#11, #10, #8) (work-vs-main, 26 nov 2026)

- (2026-11-26, work-vs-main) Base = `origin`'s default branch after a fetch, `--no-track`; fallback to the last fetched ref, then to the local HEAD with no `baseRef` (assumed; if wrong, a dialog line naming the base).
- (2026-11-26, work-vs-main) Size, panel total, boxes and radar measure from `merge-base HEAD <baseRef>`; `stageOf`, history and QA keep `baseCommit` (assumed).
- (2026-11-26, work-vs-main) `merged: true` is sticky in the record, set by a matched `merged` notice or by ancestry after a new work's fetch. Ceiling: a squash-merged PR with forges disconnected is never seen as merged; the person removes it by hand.
- (2026-11-26, work-vs-main) Shared criterion ids are a radar warning, not a renumbering (assumed). A work's ids are those its change documents define and its base does not.
- (2026-11-26, work-vs-main) Ceilings of the merged mark: with `merged` notices muted the forge is not asked about vanished MRs (`avisos.ts`), so only ancestry marks; a fetch that fails marks nothing; a reopened merged work keeps reading «Merged» until removed. The hook falls back to `baseCommit` after its own 5 s timeout while the panel may already have the merge-base: the two can differ for one read.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Thread a `ref` argument through `boxRanges`/`boxDiff` in `src/main/flow/**` | Touches flow-status for a value its functions never need to know: they already take a base. |
| Rewrite `baseCommit` in the record when main moves | A stored base goes stale again at the next merge; the merge-base is always current and cached by the watcher. |
| Poll the forge for each work's PR state | A new request per work per poll and a second path beside the notices that already arrive. |
| Renumber criterion ids in `scripts/land.py` | Fixes only this repo, not Atril's users; and silently rewrites ids other documents cite. |
| Show the base in the «New work» dialog (#11's alternative) | Asks the person to choose what has one right answer. Comes back if a repo needs another base. |

#### Decision log, answers as given (2026-11-26)
- Q: Which base does a new work take? → A: `origin`'s default branch after `git fetch origin`: the target of `refs/remotes/origin/HEAD`, else `origin/main`, else `origin/master` (assumed; a remote not called `origin` falls back to the local HEAD).
- Q: And when the fetch fails (offline)? → A: the default ref as last fetched, with no message; no `origin` or no ref at all → the local HEAD as before (assumed; if Pau wants to see the base, the dialog line in #11 comes back as its own change).
- Q: Does the new branch track `origin/main`? → A: no, `--no-track`: a branch tracking `main` under another name makes `git push` refuse or, worse, aim at `main` (assumed).
- Q: In-place repos too? → A: yes, `git switch --no-track -c <branch> <ref>` (assumed; the copy is already required clean).
- Q: What is the size measured against? → A: `git merge-base HEAD <baseRef>` while the record has `baseRef`, else `baseCommit`; the same base for the hook's size, the panel's total and boxes, and the radar. `stageOf`, history and QA keep `baseCommit` (assumed; they count or show commits, not a size).
- Q: How does Atril learn a PR is merged? → A: two signals, either one: a `merged` notice matched to a work by W187's rule, and, after a new work's fetch, a sibling branch with commits of its own that are all in the default ref. The mark is sticky (`merged: true` in the record) (assumed; squash merges are seen only through the notice).
- Q: What does a merged work look like? → A: «Merged» in place of its state, no agent card, counted as done; «Remove» stays as it is (assumed).
- Q: #8, warn or renumber? → A: warn, in the radar, like files: «Criterion ids W217 and 7 more also in {branch}» (wording from the real-app drive: the id comes first so the sidebar's cut never hides it). `scripts/land.py` renumbering is out: it is this repo's script, not Atril (assumed).

- Q: (phase 5) How is it built? → A: resolve the base in workspaces (one `defaultRef` + `workBase` in `workspaces.ts`) and pass the resolved base into the unchanged flow functions; merged is a record field; ids ride the radar (assumed; rejected: a `base` argument threaded through `src/main/flow/**`, and a separate «merged» poll of the forge).

- Q: (spec-reviewer) Which ids are a work's own? → A: ids defined in its `.agents/changes/*/*.md` that no `- **<id>**` line under `.agents/` defines at the work's base (W303); ids already on main are nobody's to clash on (assumed).
- Q: (spec-reviewer) W166/W168 contradicted? → A: both amended in this change; the hook-equals-panel equality gets W312 through one helper `panelBoxes`/`panelBoxDiff` that index.ts calls; `stateOf` gets W313 (assumed).
- Q: (spec-reviewer) Muted merged notices, reopening a merged work, a failed fetch? → A: ceilings, named in Prior decisions; no extra code (assumed).

### A merged work is finished (finished-means-finished, 27 nov 2026)

- (2026-11-27, finished-means-finished) A `merged` record outranks the hook's state file and the pause mark in main's `agentState`: it reads `done`, alive or not (assumed; if wrong, a dead merged work would read «stopped»).
- (2026-11-27, finished-means-finished) Becoming `done` because of a merge sends no notice (assumed).
- (2026-11-27, finished-means-finished) Ceilings: a dead merged work still offers reopen in its header (read from `alive`); its `ask`/`idle` notices stored before the merge stay unread (V11) (assumed).
- (2026-11-27, finished-means-finished) No «final report» heuristic: W220 already writes `done` for new Stops. Ceiling: a `needs-you` written by a hook older than W220, on a work that is finished but not merged, keeps reading «needs you» until its next Stop or its merge (assumed).
- (2026-11-27, finished-means-finished) A merged work's card and header say «Merged» (W309's text) (assumed).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Filter `merged` in `nextUp`, the idle timer and Automático separately | Three checks that can drift; `agentState` is the one reader they share |
| Rewrite stale state files to `done` when a merge is seen | Two writers of the hook's file (main and the hook); the record already says it |
| Guess «finished» from a turn end's last words | A second W220 from prose; W220 already covers new Stops (see Decision log) |

#### Decision log, answers as given (2026-11-27)
- Q: Where is «merged outranks the hook» decided? → A: in main's `agentState`, the one reader every main consumer (N1, idle reminder, Automático, notices, `status.list`) goes through; `stateOf` in the window already does it (W313) (assumed; if wrong, each consumer would filter `merged` itself).
- Q: A merged work whose tmux session died: `done` or `stopped`? → A: `done`, the same as W313 «whatever its agent's state», and no «stopped» notice for it; the header's reopen panel (`Workspace.tsx`, read from `alive`) stays as it is (assumed; if wrong, a dead merged work would read «stopped»).
- Q: Does the switch from `needs-you` to `done` caused by the merge send a «finished its turn» notice? → A: no: the forge already sent «merged», and the agent did nothing (assumed; if wrong, one extra notice per merged work).
- Q: What does the card say? → A: «Merged», the label the row already shows (W309), on the «All agents» card and the work header too; no new text «finished · PR merged» (assumed; if wrong, a new key and its Spanish entry).
- Q: A turn end whose last text is a final report reads as finished? → A: not built here: the current hook already writes `done` for a Stop with no question and no open box (W220); only state files from older hooks keep `needs-you`, and a merged PR now outranks them. Reading the report's words in main would be a second W220 that guesses from prose (assumed; if wrong, a stale `needs-you` on an unmerged, finished work stays until its next Stop or its merge).
- Q: (phase 5) How is it built? → A: one check at the top of main's `agentState` (`ws.merged` → `done`), the poll skips the done notice for a merged work, and `StateLabel` takes `merged` (assumed; rejected: filtering `merged` in `nextUp`, the idle timer and Automático one by one; rewriting stale state files to `done`).
- Q: (spec-reviewer) W334 joins two promises on one proof? → A: kept joined; the one test asserts both, the reminder on a manual work and the silence on an Automático one (assumed).
- Q: (spec-reviewer) W336's «no Go on» cannot fail (W313 already hides the card)? → A: dropped from W336; W336 is the label only (assumed).
- Q: (spec-reviewer) W335, only the merge switch or every later turn end? → A: the same code: under W332 a merged work's state never changes again, so W335 reads «while merged, no done notice» (assumed).
- Q: (spec-reviewer) The work's unread `ask`/`idle` notices stored before the merge? → A: out: they are V11's (`avisos`), and entering `done` marks nothing read; they stay until read or removed (assumed; if wrong, an `avisos` delta that expires them on merge).
- Q: (spec-reviewer) How does the real-app drive get a merged work? → A: a temp `ATRIL_HOME` seeded with a record `merged: true` and a state file `needs-you` turn-end; no forge (assumed).
- Q: Does merge detection change? → A: no: W306 (notice) and W307 (ancestry after a new work's fetch) as they are (assumed; the ceilings in work-vs-main's prior decisions still hold).

### Card answer lands (card-answer-lands, 27 nov 2026)

- (2026-11-27, card-answer-lands) Main floors the read-only tmux client at 10 rows on attach and resize; columns pass as asked (assumed; if wrong, one constant, or the same clamp on columns).
- (2026-11-27, card-answer-lands) The terminal keeps 180 px and the strip above it scrolls (assumed).
- (2026-11-27, card-answer-lands) «Landed» = the hook's state file moved on, or the pane text changed, within 4 s (every 500 ms) after the keys. Ceiling: a key that changes the pane without leaving the prompt (text left typed in Claude Code's input, a cursor that moved), or a pane that changes on its own (a timer), reads as landed; the upgrade is reading Claude Code's prompt from the pane, which ties Atril to its wording (assumed).
- (2026-11-27, card-answer-lands) While a card answer to a work is landing, main refuses another one to it; the strip keeps 64 px in a window too short for both (assumed).
- (2026-11-27, card-answer-lands) Only the card's answer waits; Automático and N3 keep `answerAgent`'s immediate answer (assumed).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| The window polls `status.wait` after an immediate ok and decides | Two round trips per check, and the pane text is only readable in main |
| Recognise Claude Code's prompt («Do you want to proceed?», the `❯ 1.` selector) in the pane | Ties Atril to Claude Code's wording, which changes between releases |
| Wait inside `answerAgent` itself | Automático's poll and N3 would block 4 s per answer, and W75's proofs would change |
| Only the CSS fix | A window simply shorter than 10 rows (a small screen, a dragged divider) would still squeeze tmux |

#### Decision log, answers as given (2026-11-27)
- Q: What is the row floor? → A: 10 rows, the issue's own example, applied in main to both `attach` and `resize` of the read-only tmux client (assumed; if wrong, one constant).
- Q: A column floor too? → A: no: the issue saw rows go to 1, columns stayed 90 (assumed; if wrong, the same clamp on `cols`).
- Q: How tall does the terminal stay in the window? → A: `.xterm-host` keeps `min-height: 180px` (about ten 12.5 px rows plus padding) and the strip above it scrolls (`min-height: 0; overflow-y: auto`) (assumed; if wrong, one CSS value).
- Q: What does «the agent left the prompt» mean, read by main? → A: after the keys go, the hook's state file moved on (state no longer `needs-you`, or a new `at`), or the pane's visible text (`capture-pane -p`) differs from what it was just before the keys (assumed; if wrong, main would have to recognise Claude Code's prompt text, which changes between releases).
- Q: How many seconds is «a few»? → A: checked every 500 ms for up to 4 s (assumed; if wrong, two constants).
- Q: Which senders wait for that? → A: only the card's answer (`atril:status:answer`); Automático (W205–W207) and the numbered Mac reply (N3) still call `answerAgent` and do not wait (assumed; if wrong, Automático's poll would block 4 s per answer).
- Q: What does the card show while it waits? → A: «Sending…» with its buttons disabled, so a second click cannot send twice (assumed).
- Q: (phase 5) How is «landed» checked? → A: a wrapper `answerLanded` in main around `answerAgent`, used only by the card's IPC handler: snapshot hook `at` and pane text, send, poll both (assumed; rejected: the window polling `status.wait` after an immediate ok; matching Claude Code's prompt text in the pane).
- Q: (spec-reviewer) W340 contradicts W76's «show «Enviado»» on press? → A: W76 is amended here: «Enviado» once main confirms (W339), «Sending…» until then (assumed).
- Q: (spec-reviewer) A pane that changes on its own (a timer, a spinner) reads as landed? → A: yes, reading A kept and named as a ceiling; Claude Code draws nothing moving while it waits at a prompt (assumed; if wrong, the check must compare only the prompt's lines).
- Q: (spec-reviewer) The row's card and the strip's card show one wait; the one not pressed could send again during the 4 s? → A: main refuses a second card answer to a work while one is still landing, with «An answer to that agent is already on its way.»; the `ANSWERED` event (next question in the other card) fires after main's answer, as today (assumed).
- Q: (spec-reviewer) In a window too short for both, which side wins? → A: the terminal keeps 180 px and the strip keeps 64 px (one option, scrolling); what does not fit is cut by `.pane`'s `overflow: hidden`, and main's floor (W338) still holds (assumed).
- Q: (spec-reviewer) Does «Pausar» (W294) go through the wait? → A: no: it is `pauseAgent`, not a card answer; it keeps its immediate answer (assumed).
- Q: (real-app drive) A 3 KB command pushed «Permitir» and the «did not arrive» problem below the strip's fold: is that in scope? → A: yes: the question text scrolls in its own box of 8 lines (`.term-ask .ask-q`), W337 grows that clause; the row's card in the sidebar is still out (assumed).
- Q: (real-app drive) At 800 px the «did not arrive» problem landed under the strip's fold → A: the card scrolls the problem into view when it appears (W340) (assumed).
- Q: «offers to send it again»? → A: the existing error shape (`Problem` with «Try again», W76), which presses the same choice again; the sentence is «The answer did not reach the agent: its prompt is still on screen.» (assumed).

### Ignored files never decide the mode (#2) (ignored-files-not-dirty, 27 nov 2026)

- 2026-11-27 · W2 was a deliberate choice (ignored config files make a worktree lose them). It is reversed here on the issue's authority, **assumed** as the owner's intent from the invocation; what it costs is the `.env` case above, answered by W4's override. Ceiling: a repo whose work needs an ignored file in the checkout and is never overridden gets a worktree that lacks it; the upgrade path is copying a listed set of ignored files into the worktree, a separate change.
- 2026-11-27 · The criterion ids are W400+ because `card-answer-lands` runs in parallel and takes the next free ids (invocation).
- 2026-11-27 · Acted on the fresh reader's findings: W1 amended (signals count), W2's internals clause dropped, W400's reason tied to W1, `NOISE` settled, landing named as phase 8. Left as they are: W400/W401 overlap with W2 (each fails alone in its own test), W401's faked `du` (the real size path is W3's own test).
- 2026-11-27 · Bug order: the proofs are written and seen red before `detectMode` changes.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Filter ignored files by extension (media out, config in) | A guess about names; fails on the next file, and the issue says an ignored file should never decide. |
| `git check-ignore` to tell pattern-ignored from listed-ignored | Both kinds are equally ignored; the distinction is not what separates `.env` from a gif. |
| Ask the person at registration | A new stop in Settings for what the issue calls a bug; W4 already is the person's lever. |

#### Decision log, answers as given (2026-11-27)
- Q: the invocation says "dirty tree", the code has no such check on this path: which rule changes? → A: W2, the ignored-file signal of `detectMode`; W8's porcelain check is correct and stays (assumed). If wrong: nothing else reads ignored files, so only W2 moves.
- Q: drop the ignored-file signal entirely, or narrow it (e.g. skip media extensions)? → A: drop it entirely, as the issue's Expected says; a name-based narrowing is a guess that fails on the next filename (assumed). If wrong: a repo with an ignored `.env` now gets a worktree without it, and the person sets in-place by hand (W4).
- Q: should untracked, not-ignored files count, as the issue's Expected allows? → A: no; `detectMode` never looked at them and the issue's repro does not need it (assumed). If wrong: a new criterion, not a change to these.
- Q: approach fork: delete the ignored-file branch, vs keep it behind a filter (extension or `git check-ignore` on pattern kind), vs ask the person at registration? → A: delete the branch (assumed). The filter loses on the next filename; the prompt adds a stop to a registration flow the issue calls a bug. If wrong: the `.env` case returns as a regression the person feels in a worktree without it.
- Q: the invocation ran through the Libretto flow with no stop before code → A: the document was carried into phase 6; the fresh reader's findings acted on are named below once `review-spec` has run (assumed).

### Add a repo by its path (#1) (add-repo-by-path, 27 nov 2026)

- (2026-11-27, add-repo-by-path) The typed path ends in `registerRepo`: same git top level, same id derivation, same `id-taken` and `invalid-id` answers as the picker. Nothing about registering is duplicated.
- (2026-11-27, add-repo-by-path) Path field, not drag-and-drop (assumed). If wrong: a drop handler sends the dropped path to the same `atril:repos:addPath`; nothing in main changes.
- (2026-11-27, add-repo-by-path) Only `~` and `~/…` expand (assumed). If wrong: `~name` is added in `expandPath` only.
- (2026-11-27, add-repo-by-path) A subfolder registers its git top level; an already registered folder returns the existing repo (assumed). If wrong: refuse in `addRepoByPath` before `registerRepo`.
- (2026-11-27, add-repo-by-path) The picker's S13 line stays as it is (assumed). If wrong: amend S13 and give `settle`'s picker branch the same `Problem`.
- (2026-11-27, add-repo-by-path) `bocetos/` and the tour are untouched (assumed, see the decision log).
- (2026-11-27, add-repo-by-path) The window shows nothing for a failed git install started from the card's fix, as `sharedFix` does elsewhere (assumed). If wrong: show a second `Problem` from `installTool`'s `{ error }`.
- (2026-11-27, add-repo-by-path) Starting an add by one route clears the other route's message; field and button stay visible while the id prompt shows (assumed). If wrong: only `Repos.tsx` changes.
- (2026-11-27, add-repo-by-path) ponytail: one extra `git rev-parse` per typed path (about 125 ms on Pau's Mac) so the refusal can carry git's own stderr, instead of widening `registerRepo`'s answer; ceiling: if a second caller wants git's stderr, move it into `registerRepo`.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Overload `atril:repos:add` with an optional path | The handler's contract is «main opens the picker» (W158); one channel meaning two things hides the trust boundary. |
| Validate and expand in the window, send a «checked» path to `addWithId` | The window must never decide what is a folder, and only main knows the home (`userHome()`); `addWithId` would also skip the id-taken answer for the typed path. |
| Drag-and-drop onto the card | Needs `webUtils.getPathForFile` in preload, a second way across the boundary; the invocation asked for typing or pasting. Kept as a later add on the same IPC. |
| Widen `registerRepo` to return git's stderr and drop the pre-check | Touches the picker's path and `create.ts`, which also call it; one extra `rev-parse` is cheaper than that blast radius (ponytail, ceiling in Prior decisions). |

#### Decision log, answers as given (2026-11-27)
- Q: path field or drag-and-drop onto the card? → A: the path field, as the invocation says «type or paste a path»; drag-and-drop is out (assumed: the issue says «or», and a drop needs `webUtils.getPathForFile` in preload, a second path through the trust boundary; if wrong, a drop handler calls the same `atril:repos:addPath`).
- Q: which `~` forms expand? → A: `~` alone and `~/…`, to the person's own home; `~name/…` is not expanded and is refused as not absolute (assumed: resolving another user's home needs the user database and nobody asked; if wrong, expand it in main only).
- Q: a path inside a repo, not at its root? → A: registers the git top level, exactly as the picker does through `registerRepo` (assumed: one rule for both ways in).
- Q: an already registered folder? → A: no error, the existing repo comes back, as the picker does today (assumed).
- Q: does the picker's own bare «not a git repository» line (S13) become a `Problem` too? → A: no, out of this change; S13 stays as it is (assumed: the invocation scopes the error rules to the new path; if wrong, amend S13 and the picker branch of `settle`).
- Q: whose is the home when a test runs? → A: main reads it through `userHome()` (the one place allowed to, W210/W212); main tests give it their own `HOME` (assumed: lesson «a check that reads the user's home needs the test to own that home»).
- Q: which approach (the fork)? → A: a new `atril:repos:addPath` and `addRepoByPath` in main, ending in `registerRepo` (assumed, the recommended one: it keeps «the window sends text, main decides» and reuses every registering rule; if wrong, nothing user-visible changes, only where the check sits). Rejected: overloading `atril:repos:add` with an optional path (the handler is «main opens the picker», W158, and one channel would then mean two things); validating in the window and sending a «checked» path to `addWithId` (the window must never decide what is a folder, and `~` needs main's home).
- Q: (cold review, run as the author) W440 against W441 for blank text? → A: W441's check runs first and W440 is scoped to what it lets through (acted on).
- Q: (cold review) `detail` when there is no text, or a NUL byte? → A: empty for that first sentence, in both cases (acted on; if wrong, show the text for NUL).
- Q: (cold review) is «There is no folder» also for an unreadable folder? → A: yes, any `stat` failure: the message names the path and Atril cannot add what it cannot examine (acted on, assumed).
- Q: (cold review) what do `StateProblem` and `not-a-git-repo` from `registerRepo` do in W443? → A: come back unchanged with `path`; the card shows the S33 problem for the first (W447) (acted on).
- Q: (cold review) what is `path` for a subfolder? → A: the typed text resolved, never the top level (acted on).
- Q: (cold review) does the field empty after the id prompt? → A: yes, whenever a repo is registered by either route (acted on).
- Q: (cold review) do field and button stay while the id prompt or the picker error shows, and do the two messages coexist? → A: they stay; starting an add by either route clears the other's message (acted on, assumed; if wrong, only the card changes).
- Q: (cold review) the «Choose a folder…» label and a failing git install? → A: the label lives in the card, `fixLabel` is left alone; the install's answer is ignored as `sharedFix` does everywhere (acted on, assumed; if wrong, the card shows a second `Problem`).
- Q: (cold review) which box owns the mock default and the Spanish entries, and what closes box 3? → A: box 1 owns the default and main's keys, box 2 the override and the card's keys; box 3 closes no criterion and passes only on its listed observations (acted on).
- Q: (the stop before code) → A: answered by the invocation (`/libretto-attacca`): the document is written, cold-reviewed, committed and carried into phase 6; the run acted on every finding above and rejected none. The reviewer also noted the box-1 tests already existed, written red while it read; they were written against the contract before its report and adjusted where it asked.
- Q: (while building box 2) the existing test «adding a repo asks for a free id» looked for the only `textbox` in the card, and the new field makes two. → A: its selector now names the id prompt by its label («Ya hay otro repo con ese nombre. Elige otro id.»); the assertions are untouched (S12 stays proved as it was).
- Q: (while building box 2) `settings.test.ts` «saved token cannot be seen again» counts every `input` in Ajustes except `#jira-board`; the Repos card now has one. → A: the path field gets `id="repo-path"` and the test's selector excludes it too (`input:not(#jira-board):not(#repo-path)`); its intent — no credential field is left once the token is saved — and its other assertions are unchanged.
- Q: criterion ids? → A: W440 onward in both specs, the card's too, as the invocation says; no `S` ids (Pau).
- Q: `bocetos/novedades.html`, `bocetos/fase1-nucleo.html` and a photo? → A: not in this change: `bocetos/` is local-only and absent from this worktree (assumed: CLAUDE.md says it lives on Pau's disk; the real-app drive is still done and reported; if wrong, Pau adds the section from the drive's screenshot).
- Q: a tour step (W23) for the new field? → A: none: the field lives inside the Repos card that the `repos` step already points at, and no rail screen or primary control is added (assumed; if wrong, W23's proof lists the target).

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

- **W1** When a repo is registered and no signal (W3) is found, Atril shall set its mode to `worktree`.
  Proof: src/main/repos.test.ts chooses worktree when no signal
- **W2** If the checkout holds git-ignored files, then Atril shall not take any of them as a reason for `in-place`, whatever their names (a config file, a `.env`, a media file); the mode is decided by W3 and W4 alone, and with no other signal it is `worktree`.
  Proof: src/main/repos.test.ts an ignored file never chooses in-place
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
- **W15** When a session enters `needs-you` or `done`, Atril shall add one `ask` or `done` notice (V3) — `done` always for `done` — and show it on the Mac only when `route()` (V10) answers `mac`; no other `ask` or `done` notice for that session until it leaves the state, except W176 and W221; W180's `idle` is a different kind and is allowed.
  Proof: src/main/status.test.ts notifies once per needs-you transition
  Proof: src/main/status.test.ts entering done adds one done notice
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
- **W26** When a Claude hook reports `Stop` for a session, Atril shall set its agent state as W217–W220 and W228 decide (`working`, `needs-you` or `done`; with no checklist and no question, `done`); when it reports `UserPromptSubmit`, to `working`.
  Proof: src/main/status.test.ts stop marks done and prompt submit marks working
- **W27** When a session leaves `needs-you` or `done` and enters either again, Atril shall notify again, except under W221.
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

### Repos in Settings (move-repos-to-settings, 9 nov 2026)

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
### Subagents (add-subagents-view, 10 nov 2026)

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

### Subagent detail (add-subagent-detail, 10 nov 2026)

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

### Install from the doctor (add-doctor-install-terminal, 10 nov 2026)

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

### Grafito palette (adopt-grafito, 10 nov 2026)

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

### Quick replies (quick-replies, 10 nov 2026)

- **W74** When the hook gets a PreToolUse for `AskUserQuestion`, it shall add to the needs-you state every question of the call in order as `{ question, header, options: [{ label, description }], multiSelect }`, labels and descriptions whole with whitespace collapsed; the stored questions shall stay while the state stays needs-you (a later Notification or Stop included) and go when it leaves needs-you.
  Proof: src/main/agent.test.ts the hook keeps every question and what a permission is for
- **W75** When the window asks `atril:status:answer(workspaceId, choice)`, main shall re-read that workspace's state and, while it is needs-you, act by the choice: `{ option: n, question: i }` for a stored question i with option n — type n plus one then Enter, and after the last question of the call also Enter to submit; `{ allow: true }` while `kind` is `permission` — type `1` then Enter; `{ deny: true }` while `kind` is `permission` — press Escape; `{ continue: true }` — paste «Sigue con el plan; no hagas nada que no esté en él.» as a bracketed paste then Enter. Any other shape, a stale question index or option, or a state that is not needs-you, shall type nothing and answer «Ese agente ya no está esperando una respuesta.» or «Esa opción ya no existe.»; a gone workspace or pane answers W53's sentence. Main shall remember per session which question is next, starting at 0 on each entry into needs-you.
  Proof: src/main/status.test.ts each answer shape sends its own keys
  Proof: src/main/status.test.ts allow and deny send their keys
- **W76** While a workspace is needs-you, its row and the strip above its terminal shall show one card by `kind` (W200–W202) instead of today's quick replies; pressing a button, by mouse or with keys 1–4 while the card has focus, shall send it (W75, through W339) and show «Sending…» (W340) until main answers, then «Enviado», disabling the card until the state changes, or show the error and keep it live.
  Proof: src/renderer/components/agentcard.test.tsx the card says sending until the answer lands and offers to send again
### Atomic writes (atomic-records, 10 nov 2026)

- **W80** Atril shall replace `workspaces.json` and `repos.json` by writing a temporary file and renaming it,
  so a reader during a write sees either the old file or the new one, never a partial one.
  Proof: src/main/workspaces.test.ts a reader never sees a half-written workspaces file

### Focus mode (focus-mode, 10 nov 2026)

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

### All agents (agents-overview, 10 nov 2026)

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
### Live QA (add-qa-lab, 10 nov 2026)

- **W83** Atril shall classify a workspace's folder as expo (an `app.json` or `app.config.*` and an `expo`
  dependency), react-native (a `react-native` dependency with `ios/` or `android/`), flutter (`pubspec.yaml`
  with `flutter:`), android (`settings.gradle*` and `app/src/main/AndroidManifest.xml`), ios (an `*.xcodeproj`,
  `*.xcworkspace` or a `Package.swift` declaring `.iOS(`), web (`package.json` with a `dev`, `start` or
  `preview` script), first match in that order, or none, each with its run command (the Decision log's
  table).
  Proof: src/main/qa.test.ts projects are classified by their files
- **W84** When the person presses «Probar en vivo» on a workspace's target, main shall write `$ATRIL_HOME/qa/<id>.mcp.json` with, for chrome, Playwright MCP `--browser chrome`; for safari, Playwright MCP `--browser webkit` (both `--isolated --output-dir $ATRIL_HOME/qa/<id>/`); for android, mobile-mcp; for ios, `xcrun mcpbridge` and mobile-mcp; split the workspace's pane and start `claude` there in the target's folder with `--mcp-config` that file, `--strict-mcp-config` and a prompt naming the platform, the command, the reserved device (W124) on mobile, the change's proposal path and the screenshot folder; the QA pane's tmux id is kept in `$ATRIL_HOME/qa/<id>.pane`; a second press while that pane lives shall be refused; «Detener QA» shall kill only that pane, free its device and keep the MCP file and the screenshots. One test holds a case per clause.
  Proof: src/main/qa.test.ts live qa starts one scoped agent with its tools
### Pause an agent (pause-agent, 10 nov 2026)

- **W86** When the person pauses a working workspace (Trabajo → Pausar, ⌘⇧P, or its card), main shall send
  Escape to that workspace's recorded agent pane and write `$ATRIL_HOME/paused/<session>`; while that mark
  exists the workspace's effective state shall be paused, read as stopped by every consumer of the state; a
  PreToolUse or PostToolUse shall not clear it; pausing shall be refused unless the state is working. One
  test holds a case per clause.
  Proof: src/main/pause.test.ts pausing interrupts only that agent
- **W87** When the person resumes a paused workspace, main shall type «Sigue donde lo dejaste.» then Enter into its agent pane and remove the mark; a UserPromptSubmit or a needs-you or done state shall also remove it, except Claude Code's idle reminder (a Notification with `notification_type` idle_prompt or «waiting for your input»), which keeps it; resuming a workspace that is not paused shall answer «Ese agente no está en pausa.» and a gone one N3's message. One test holds a case per clause.
  Proof: src/main/pause.test.ts resuming asks the agent to go on
- **W88** While a workspace is paused, its row and its card shall read «en pausa», the Trabajo menu item shall
  read «Reanudar» (⌘⇧P) instead of «Pausar», and «Pausar» shall be disabled unless the selected workspace is
  working.
  Proof: src/renderer/pause.test.ts a paused agent reads en pausa and offers resume

### Open an MR in Atril (open-work-from-mr, 10 nov 2026)

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

### Cost per work (cost-per-work, 10 nov 2026)

- **W92** On every hook event whose payload's `transcript_path` is a string ending in `.jsonl`, the hook shall
  add that path as a line to `$ATRIL_HOME/transcripts/<session>` (W62's session name) when it is not there yet,
  and write nothing else from the payload; other events leave the file as it is.
  Proof: src/main/agent.test.ts the hook keeps where the transcript is
- **W93** Main shall total a workspace's usage over its transcript and every `subagents/*.jsonl` beside it, counting each `message.id` once, as input, output, cache-write and cache-read tokens per model, and price each message with the dated table (cache write 1.25× that message's input price; cache read the published price or 0.1× input — Fable 5.2's published 0,20 included), where `claude-haiku-5-5` (or it plus `-YYYYMMDD`) uses 0,50 / 2,50 $ per million and cache read 0,05 for a message whose input, cache write and cache read add up to more than 100 000 tokens, and 0,10 / 0,50 with cache read 0,01 otherwise (exactly 100 000 is the short price); leaving the cost out for a model the table does not name (matching an exact id or the id plus `-YYYYMMDD`); lines that are not JSON or lack usage are skipped, and a line without `message.id` counts once; a later read covers only the bytes appended since the previous one; the table's date is 2026-11-11. One test holds a case per clause.
  Proof: src/main/cost.test.ts usage is totalled once per message and priced by model
  Proof: src/main/cost.test.ts haiku long prompts and fable cache use their prices
- **W94** A workspace's row title and its «Todos» card shall show no text with «$», «≈» or «tokens».
  Proof: src/renderer/cost.test.ts no workspace shows a cost
### History (work-history, 10 nov 2026)

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
### First steps (first-run-setup, 10 nov 2026)

- **W97** While Trabajo has no workspace record (stopped ones included), the history (W96) is empty, `setupDismissed` is not set and the
  tutorial is not open, it shall show «Primeros pasos» with five steps — 1 git, tmux and claude without a doctor
  problem («Comprobando…» until the report arrives; its button opens W32's list), 2 at least one repo, 3 a saved
  Jira token («opcional»), 4 a saved GitHub or GitLab token («opcional»), 5 «Nuevo trabajo» (a button, never
  marked) — each of 1–4 marked done from the live state, with a button where it is done while undone; «Ya lo
  tengo» shall set `setupDismissed`, kept across restarts. One test holds a case per clause.
  Proof: src/renderer/setup.test.ts a new person sees what is left to start

### Packaging (package-and-sign, 10 nov 2026)

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

### Question card (ask-card, 10 nov 2026)

- **W105** The question text and the enabled answer labels shall keep a contrast of at least 4.5:1 over `--ask-bg`
  in each of the original light, original dark, Grafito light and Grafito dark token sets.
  Proof: src/renderer/quickreplies.test.ts the question card reads in every theme

### Manage the queue (queue-manage, 10 nov 2026)

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

### Quiet header (quiet-header, 11 nov 2026)

- **W112** While «Uno» shows a workspace, the work header shall show «{repo} · {agent}» above the branch, beside the
  branch the same state label and icon as its row in the list (no pill), and to the right one group with the
  Uno/Todos switch and an icon button named «Modo foco», titled «Modo foco (⌘⇧F)», `aria-pressed` while focus is on,
  that turns focus on and off as the menu item does (W77), disabled while no workspace is selected; «Todos» shall not
  show that button. One test holds a case per clause.
  Proof: src/renderer/focus.test.ts the work header shows the state and a focus button

### QA screen (qa-screen, 11 nov 2026)

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

### QA: where to test (qa-targets, 11 nov 2026)

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

### Clear errors (plain-errors, 11 nov 2026)

- **W127** If a tool's version command has not finished after 5 s, then the doctor shall kill it and report that tool with the problem «no responde en 5 s» and its install command, and the other tools as they answered; the kill is the runner's `timeoutMs` (SIGKILL, code 124).
  Proof: src/main/doctor.test.ts a hung tool is reported after 5 s

### Shell PATH (login-path, 11 nov 2026)

- **W128** When Atril starts, main shall set its PATH, before the doctor or any agent runs, to the PATH printed by the person's `$SHELL -ilc` between two markers, then `~/.local/bin`, `/opt/homebrew/bin`, `/usr/local/bin` and the PATH it was launched with, each folder once, in that order; if the shell fails, prints no markers or has not answered in 3 s, then the same list without the shell's part.
  Proof: src/main/login-path.test.ts the shell's path comes first and nothing repeats
  Proof: src/main/login-path.test.ts a silent or slow shell still adds the usual folders

### Copy with changes (dirty-copy, 11 nov 2026)

- **W129** When opening is asked with `worktree: true`, Atril shall open that workspace as a worktree even for an `in-place` repo, leave the main checkout's branch and files as they were, and keep the repo's mode.
  Proof: src/main/workspaces.test.ts worktree this time leaves the dirty copy alone
- **W130** When the new-work or the start dialog gets an error with a `fix`, it shall show it as a problem titled with main's sentence, «No he creado el trabajo.» under it, the detail folded and a button by its `fix`: «Usar un worktree esta vez» asks to open the same repo, branch, model, effort, text and mode with `worktree: true`; «Abrir en Terminal» asks main to open Terminal for that repo.
  Proof: src/renderer/newwork.test.ts a dirty copy offers a worktree this time
  Proof: src/renderer/newwork.test.ts a blank dirty retry opens plain claude in a worktree
  Proof: src/renderer/newwork.test.ts a git failure offers terminal for the repo
### Open and close without raw errors (ws-errors, 11 nov 2026)

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

### Model and effort (model-pick, 11 nov 2026)

- **W137** When a workspace opens from «Nuevo trabajo» or «Empezar» with an effort of `low`, `medium`, `high` or `xhigh`, the agent command (and the command «Empezar» shows) shall carry `--effort <level>` before the prompt and the record shall keep `effort`; with `default` or no effort the command has no `--effort` and the record has no `effort` field; any other value is refused in main with ««{effort}» no es un esfuerzo disponible» before anything runs.
  Proof: src/main/agent.test.ts effort reaches the command only from the list
  Proof: src/main/jira/start.test.ts an unknown effort is refused before anything runs
- **W138** The suggestion shall come from the task text in «Nuevo trabajo», or the Jira summary and type in «Empezar», matched case-insensitively: a Jira type Bug, or a word starting with `arregl`, `fallo`, `error`, `bug`, `fix`, `typo`, `corrige` or `errata`, gives `sonnet` with `medium` and «Un arreglo acotado: Sonnet lo hace bien a mitad de precio que Opus.»; else a word starting with `refactor`, `migra`, `arquitectura`, `reescrib` or `rediseñ` gives `opus` with `high` and «Un cambio grande: mejor Opus con más esfuerzo.»; else none. A missing Jira type counts as not Bug. («fixture» counts as a fix: the rule is a hint, not a classifier.)
  Proof: src/renderer/inbox/suggest.test.ts the rules pick model and effort with their reason
- **W139** While a dialog has a suggestion and the chosen model or the chosen effort differs from it, the dialog shall show «Sugerido: {model} · {effort}» with its reason and a «Usar» button that sets both; with no suggestion, or both already equal, nothing shows; the dialog never changes the model or effort by itself.
  Proof: src/renderer/newwork.test.ts a suggestion is shown and used only on click
  Proof: src/renderer/inbox/start.test.ts the start dialog suggests from the jira type

### Reopen (reopen-work, 11 nov 2026)

- **W141** When reopening a workspace is asked by id while its agent is stopped — no session, or a session whose recorded pane is dead (W16), which is ended first — and its folder exists, Atril shall start a tmux session with the same name in that folder running `agentArgv` with the record's model and effort, plus `--continue` only when a transcript is recorded for it (`transcripts/<session>`), leaving its auto marker as it is, store the new pane id, and answer the workspace as alive; with `more: true` the effort goes one level up (none or `medium` → `high`, `low` → `medium`, `high` → `xhigh`) and is stored.
  Proof: src/main/workspaces.test.ts a stopped work reopens where it was
- **W142** If reopening is asked for an unknown id, a workspace whose agent is not stopped, a folder that no longer exists, or `more: true` at `xhigh`, then Atril shall start nothing and answer — «Ese trabajo ya no existe», «Este trabajo ya está abierto.», «La carpeta de {branch} ya no existe.» with `fix: 'forget'`, «Ya está en el esfuerzo más alto.»; if tmux fails to start, it shall end any half-made session and answer «tmux no ha podido arrancar el agente.» with the message as `detail` and `fix: 'terminal'`.
  Proof: src/main/workspaces.test.ts reopening refuses what it cannot do
- **W143** While the selected workspace's agent is stopped (dead session, or dead pane: the bar then sits above the terminal), the centre shall show «{branch} está parado: su sesión de tmux ya no existe (un reinicio o tmux cerrado).», «Su agente no sigue hasta que lo vuelvas a abrir.», a «Volver a abrir» button and, below `xhigh`, «Seguir con más esfuerzo»; the terminal tip shall not show; both buttons are disabled while a reopen runs, so a second click sends nothing; a refusal shows with `Problem`, its button as in W135.
  Proof: src/renderer/reopen.test.ts a stopped work offers to reopen
- **W149** If the terminal's tmux client has exited or its descriptor is closed, then typing, resizing or detaching that terminal shall do nothing and never throw, and an exited client shall be forgotten so nothing more is sent to it.
  Proof: src/main/pty.test.ts a dead terminal client never throws

### Damaged state files (state-files, 11 nov 2026)

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

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

- **W150** When a request to Jira, GitHub or GitLab gets an HTTP error or throws, `net-problem` shall answer one sentence naming the service — 401: «{service} ha rechazado tu token.»; 403: «{service} no te deja ver esto con ese token.»; 404: «{service} no encuentra esa dirección.»; 429: «{service} pide esperar: demasiadas consultas.»; 500–599: «{service} está fallando ahora mismo.»; any other status: «{service} ha contestado algo que no esperaba.»; a thrown `ENOTFOUND` or `EAI_AGAIN`: «No encuentro {service}.»; a certificate code (as S32): «El certificado de {service} no es válido.»; a timeout: «{service} no ha respondido a tiempo.»; a `SyntaxError` (a body that is not JSON): «{service} ha contestado algo que no entiendo.»; anything else: «No llego a {service}: ¿hay conexión?» — with `detail` `HTTP <n>` or the code (from `err.cause.code` when it matches `^[A-Z0-9_]+$`, else the exception's name), and `fix: 'settings'` for 401, 403, 404, a host not found and a certificate code (the person fixes the token or the address), `fix: 'retry'` otherwise. No sentence contains a status number or an exception name.
  Proof: src/main/net-problem.test.ts each status and network cause has its sentence and fix

### Libretto models (libretto-models, 11 nov 2026)

- **W151** When Libretto is bundled, every agent whose file name (without `.md`) is in Atril's list (`converge-reader`, `review-lens-reliability`, `review-lens-security`, `spec-reviewer`, `work-reviewer`) and whose leading `---` frontmatter has no line starting with `model:` shall get `model: sonnet` as the frontmatter's last line; an agent that has one keeps it.
  Proof: scripts/libretto-models.test.ts reviewers get sonnet unless libretto chose
- **W153** Any agent outside the list, or without a leading frontmatter, shall be left byte-for-byte as it was, and running the function a second time shall change nothing.
  Proof: scripts/libretto-models.test.ts other agents and a second run change nothing
- **W152** The committed copy in `resources/libretto/agents/` shall be that function's output over the `171db90` copy: the five listed agents carry `model: sonnet`, `review-lens-design` keeps `sonnet`, `review-lens-intent` and `review-lens-tests` keep `haiku`, and `spec-writer` has no `model:` line — read from the files themselves.
  Proof: src/main/packaging.test.ts bundled reviewers run on sonnet

### Broken repos (repo-gone, 11 nov 2026)

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

### Terminal that will not attach (term-attach, 11 nov 2026)

- **W160** When `atril:term:attach` is asked, main shall answer `{ ok: true }` once the tmux client started, `{ ok: false }` for an unknown or not-alive workspace, and, if starting the client throws, `{ error: «No he podido abrir la terminal de {branch}.», detail }` with the thrown message as `detail`, keeping no client for that workspace; it never rejects.
  Proof: src/main/pty.test.ts a client that cannot start answers an error and keeps nothing
- **W161** When the terminal gets that error for the workspace it is showing, it shall show over the empty terminal a problem titled with the `error` field, «Tu agente sigue en tmux: solo falla esta vista.» under it and the detail folded; an answer for a workspace no longer shown is dropped.
  Proof: src/renderer/terminal.test.ts a terminal that cannot attach says so
- **W162** «Volver a intentar» shall ask to attach again with the terminal's current size; on `{ ok: true }` the problem goes, and on another error it is replaced by the new one.
  Proof: src/renderer/terminal.test.ts retrying hides the problem or shows the new one

### Faster panel (fast-panel, 11 nov 2026)

- **W163** The status poll and `listWorkspaces` shall read tmux through one shared snapshot (`tmux list-panes -a` with session name, pane id and dead flag), taken at most once per second, so a status tick costs one tmux command whatever the number of works; creating, killing or respawning a session drops the snapshot, and decisions that act — sending a reply or keys, pausing, reopening — ask tmux directly instead.
  Proof: src/main/status.test.ts one tmux call per tick whatever the number of works
  Proof: src/main/tmux.test.ts the snapshot is shared for a second and dropped by any session change
- **W164** State-folder events (status) and activity-file events (activity) shall refresh 200 ms after the last event of a burst, and at least once per second while events keep coming.
  Proof: src/main/status.test.ts a burst of hook writes refreshes once
  Proof: src/main/activity.test.ts a burst of activity writes refreshes once

### Grafito: needs you (grafito-you, 11 nov 2026)

- **W165** Where the palette is Grafito, in both themes, the «trabajando» label's `--working` shall be a neutral (OKLCH chroma below 0.03) while `--run` (unread dots, selection, current step) and `--you`/`--you-text` keep the accent, so a working row and a needs-you row never share a colour.
  Proof: src/renderer/theme.test.ts grafito tells needs-you from working

### Collision radar (radar, 11 nov 2026)

- **W166** Main shall answer, for every workspace record that is neither a review nor `merged` (W308), the other such records of the same repo that change at least one of the same files against W303's base (committed or not) or own at least one of the same criterion ids (W310), as `{ id, branch, files, ids }` with repo-relative files sorted; records of different repos never collide, and a record sharing no file and no id gets an empty list.
  Proof: src/main/radar.test.ts two works on one file collide and nothing else does
- **W167** While nothing counted (F46) changed in any workspace, asking the radar again within 30 s of the last computation shall run no process; after that, each workspace computes again at most once per 30 s.
  Proof: src/main/radar.test.ts the radar costs nothing while nothing changes
- **W168** A workspace row whose collisions share files shall show, under its repo line and in the secondary grey, «Clashes with {branch} in {file}» for the first collision with files and its first file, followed by « and {n} more» where n is the total of files across all its collisions minus one, with every «{branch}: {file}» as the line's title; a row without shared files shows no such line. The window asks the radar every 10 s.
  Proof: src/renderer/radar.test.ts a colliding row says with whom and where
  Proof: src/renderer/radar.test.ts a row without collisions shows nothing new
### Lessons for every agent (lessons-first, 11 nov 2026)

- **W169** `agentArgv({ lessons: true })` shall add `--append-system-prompt` with «Este repo guarda en .agents/lessons.md los errores que ya se pagaron aquí. Léelo antes de empezar y no los repitas.» before the prompt, and nothing without it.
  Proof: src/main/agent.test.ts lessons are pointed out only when the repo keeps them
- **W175** When a workspace's agent starts or is reopened, it shall get `lessons: true` exactly when, in the workspace's folder, `.agents` is a real directory and `.agents/lessons.md` a regular file (`lstat`, no links); the command «Empezar» shows applies the same rule to the chosen repo's folder; the QA agent never gets it.
  Proof: src/main/workspaces.test.ts a new or reopened work is told about lessons only with a real file
  Proof: src/main/jira/start.test.ts the shown command points at lessons only when the chosen repo keeps them

### Where it gets stuck (stuck, 11 nov 2026)

- **W172** When a workspace with a Libretto change is closed, its history line shall carry `steps` in seconds from the branch's commits to that change's `proposal.md` (`<baseCommit>..HEAD`, oldest first): `spec` from the record's `createdAt` to the first commit whose file has a `## Verification criteria` section; `plan` from there to the first commit whose file has a box under `## Checklist`; `construir` from there to the last commit that raises the count of closed boxes; `cierre` from the last of those marks that exists to the moment of closing. A step is left out when either of its ends is missing (no `createdAt`, no such commit); a step of 0 is kept; none is ever negative.
  Proof: src/main/history.test.ts a closed work records the time of each step
  Proof: src/main/history.test.ts missing marks leave their steps out
- **W173** Terminados shall show, under each entry with steps, its steps in order as «Spec {d} · Plan {d} · Construir {d} · Cierre {d}» (only those it has), with {d} as «<1 min», «{n} min», «{n} h» or «{n} d»; and at the top of the unfolded list, when at least three of the 20 newest entries have steps, «Donde más tiempo se va: {step} (mediana {d})» for the step with the highest median over the entries that have it (an even count takes the mean of the two middle values; a tie goes to the earlier step).
  Proof: src/renderer/history.test.ts each finished work shows its steps and the slowest one leads

### QA on the MR (qa-to-mr, 11 nov 2026)

- **W170** When «Publicar en la MR» is pressed for a workspace that has its MR (Decision log), main shall post one general comment on that MR: «Pruebas en vivo con Atril · {target}» (or without « · {target}» when there is none), one line per criterion «{Pasa|Falla|Sin probar} · {criterion text}», each failing one followed by a quoted line (`> `) with its note or else its last step, and «Las capturas están en Atril.» — all in the app's language; the screen then shows «Publicado en la MR» with a link to the MR and the button becomes «Publicar de nuevo».
  Proof: src/main/qa-publish.test.ts the qa summary reaches the mr as one comment
- **W174** The QA screen shall ask main (`atril:qa:mrFor(id)`) which MR the workspace has, by the Decision log's rule, listing MRs itself when its last list is older than 60 s.
  Proof: src/main/qa-publish.test.ts the work's own mr is found by repo and branch
- **W171** While the workspace has no MR, the QA screen shall show «Abre la MR para poder publicar aquí la QA.» instead of the button; while a post runs the button is disabled, so a second press sends nothing; if posting fails, it shall show the W150 problem with its button and post nothing more.
  Proof: src/renderer/qa-publish.test.ts without an mr the button is not offered and a failure says why

### Notifications (main) (notify-core, 12 nov 2026)

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

### Read-only terminal (terminal-read-only, 14 nov 2026)

- **W196** The Trabajo terminal shall attach to the agent's tmux session as a read-only client (`tmux attach -r`) and send no keystroke, paste or mouse input to it, including the shell panes an earlier ⌘D left in the session; selecting text and ⌘C still copy. Main shall ignore `atril:term:input`, and ⌘D / ⌘⇧D shall do nothing.
  Proof: src/main/pty.test.ts the terminal client is read only
  Proof: src/renderer/components/terminal.test.tsx typing in the terminal sends nothing
- **W197** When the hook writes `needs-you`, it shall also write `kind`: `question` for a `PreToolUse` of `AskUserQuestion` or a `Stop` under W219, `permission` for a `Notification` with `notification_type` `permission_prompt` or a message starting «Claude needs your permission», and `turn-end` for a `Stop` under W218's fallback; a `Stop` otherwise follows W217 or W220; an idle reminder (`idle_prompt` or «waiting for your input») shall leave `kind` as it was and set `idle: true` (W195). Ceiling: one test walks every event kind, as before this change; the new `Stop` branches have their own proofs below.
  Proof: src/main/agent.test.ts the hook says what kind of wait it is
- **W198** On every PreToolUse the hook shall remember, per session, the tool name and a one-line summary of its input (the command for `Bash`, the path for `Edit`/`Write`/`MultiEdit`, else nothing); when it writes a `permission` wait it shall store that pair as `{ tool, summary }`.
  Proof: src/main/agent.test.ts a permission names the tool it waits for
- **W199** While a session is in `needs-you` with `kind` `turn-end`, or in `done`, and its subagents file holds an entry without `endedAt`, Atril shall show it as `working` with the activity «Esperando a un subagente» and add no notice; on the first poll after the last entry ends, the state counts as entering `needs-you` or `done` (W15). Background shells: W229, W290.
  Proof: src/main/status.test.ts a turn end with a subagent still running is working
  Proof: src/main/status.test.ts a done agent waits for its subagents too
- **W200** For a `question`, the card shall show the next unanswered question, its header and each option as a button with its number, label and description, the option whose label ends «(Recommended)» or «(Recomendado)» marked «Recomendada» without that suffix; for `multiSelect` it shows the options without buttons and «Contesta por escrito abajo».
  Proof: src/renderer/components/agentcard.test.tsx a question card answers with its options
- **W201** For a `permission`, the card shall read «Quiere ejecutar {summary}» (or «Quiere usar {tool}», or «Quiere permiso para seguir» with no tool) with «Permitir» and «Denegar».
  Proof: src/renderer/components/agentcard.test.tsx a permission card allows or denies
- **W202** For a `turn-end` without a W293 reason, the card shall show «Ha terminado: {last text}» with «Sigue» (`{ continue: true }`) and focus the composer; while `idle` is true it adds «Lleva un rato esperándote».
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

### Refine the request (refine-request, 20 nov 2026)

- **W208** When `atril:refine:ask(text)` is called with a string that, trimmed, has 1–2000 characters and no NUL, main shall run `claude -p --model haiku --output-format json --tools "" --no-session-persistence --json-schema <{questions: 1–5 strings}> <instruction>` once — the instruction in English, ending «Write the questions in {lang}.» with the app's language, as `scores.ts` does — with the trimmed request on stdin (never in argv) and a 60 s timeout, outside the scores queue, and answer `{ questions }`: `structured_output.questions`, each trimmed with newlines turned into spaces, empty and repeated ones dropped, each cut to 200 characters, at most 5. Any other argument shall answer `{ error: «No hay petición que afinar.», detail: 'argument', fix: 'retry' }` with no run.
  Proof: src/main/refine.test.ts asks haiku once with the request on stdin and keeps well-formed questions
- **W209** If the run does not give questions, then main shall answer `{ error, detail, fix: 'retry' }`, never rejecting the IPC call and never carrying Claude's output: exit 124 → «Claude no ha contestado a tiempo.», detail `timeout`; exit 127 → «No encuentro Claude Code en este Mac.», detail `claude`; any other non-zero exit → «Claude ha fallado.», detail `exit {code}`; exit 0 with stdout that is not JSON, `is_error: true`, no `structured_output.questions` array, or no question left after W208's cleaning → «Claude no ha devuelto preguntas.», detail `json`, `is_error`, `schema` or `empty`. A call while one runs shall answer «Ya está preguntando.», detail `busy`, with no new run.
  Proof: src/main/refine.test.ts a failed ask says why and runs one at a time

### Correction ladder (harness-ladder, 20 nov 2026)

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

### Skills: turning on and off (skills-toggle, 23 nov 2026)

- **W215** `skillsWriteOk` in `ui.json` shall survive a restart when it is `true`; any other value shall be dropped.
  Proof: src/main/ui.test.ts remembers skills write consent and drops anything but true

### Crash reports (crash-reports, 26 nov 2026)

- **W216** `crashReports` in `ui.json` shall survive a restart when it is `'on'` (anything else reads as off), and `crashLast` when it is `{ at: number, url: string }` or `{ at: number, error: string }`; any other value of either shall be dropped.
  Proof: src/main/ui.test.ts "remembers crash report consent and the last send"

### QA pictures in the MR (add-pr-qa-pictures, 26 nov 2026)

- **W240** When report.json gives a step a `view` matching `^[a-z0-9][a-z0-9-]{0,39}$`, main shall keep it on that step and answer it to the window with the step (amending W114's step shape); any other `view` shall be dropped and the step kept. The QA prompt shall ask the agent to name each screenshot's view with such a slug.
  Proof: src/main/qa-report.test.ts a step keeps only a slug view
- **W241** When the person presses «Publicar en la MR» and at least one criterion has a step with a shot, main shall answer a preview — one row per such criterion with its id, status, view, `send` or `blocked`, the block reason, and for a `send` row the cleaned bytes as a `data:image/png` URL — and a token, reading the pictures one at a time, without any write to a forge (reading the MR and its description is allowed) and without starting any `claude` process; if no criterion has a step with a shot, then it shall answer no rows and no token.
  Proof: src/main/qa-pictures.test.ts prepare previews without touching the forge or claude
  Proof: src/main/qa-publish.test.ts prepare reads the mr and writes nothing
- **W242** The picture of a criterion shall be the last step shot of that criterion; if it is not a PNG (signature), is over 5 MB, or comes after the first 20 pictures, then it shall be `blocked` with the reason «not-png», «too-big» or «too-many».
  Proof: src/main/qa-pictures.test.ts only the last png of each criterion goes, within caps
- **W243** For each remaining picture main shall read its text on-device (Vision through `osascript -l JavaScript`); if any line, the lines joined with nothing, or the lines joined with a space holds what the crash scrubber's rules replace (quotes excepted), the person's home path, this Mac's host name or the user name, then the picture shall be `blocked` with the first reason that applies in the order «token», «email», «host», «path», «machine»; if reading fails or takes over 15 s, then it shall be `blocked` with «unreadable».
  Proof: src/main/qa-pictures.test.ts a picture showing a host, path, token, email or the mac is blocked
- **W244** The bytes sent for a picture shall be its PNG rebuilt with only the IHDR, PLTE, tRNS, IDAT and IEND chunks, named by the first 16 hex characters of their SHA-256 and `.png`.
  Proof: src/main/qa-pictures.test.ts the sent png keeps critical chunks only and a hash name
- **W245** When the person presses «Send» in the sheet, main shall send exactly the pictures the token's preview marked `send`; if any of them changed on disk since, or the token is unknown, then it shall send nothing and answer «Las capturas han cambiado: revísalas otra vez» with the fix «Revisar otra vez» (prepare again). A token shall stay valid after a failed send and shall expire 10 minutes after prepare or on a successful send.
  Proof: src/main/qa-pictures.test.ts send refuses pictures that changed after the preview
- **W246** Where the MR is on GitHub, main shall write the pictures as one commit on the branch `atril-qa` of the MR's repo — with no parent when the branch does not exist, else on its tip — through the Git Data API, and link each as `https://github.com/{owner}/{repo}/blob/{commit}/qa/{name}?raw=true`; it shall never push to or write the work's branch.
  Proof: src/main/forge/qa-hosting.test.ts github pictures land on an orphan atril-qa branch
- **W247** Where the MR is on GitLab, main shall upload each picture with `POST /projects/:id/uploads` and link it by the answered `full_path` on the GitLab site.
  Proof: src/main/forge/qa-hosting.test.ts gitlab pictures go to project uploads
- **W248** After the pictures are hosted, main shall read the MR description again and, if it differs from the one read when preparing, then it shall write nothing and answer «La descripción de la MR ha cambiado: publica otra vez» with the fix «Revisar otra vez»; otherwise it shall write the description with the text between `<!-- atril-qa -->` and `<!-- /atril-qa -->` replaced by the new block (or the block appended after a blank line when there is none, or alone when the description is empty or null), every other byte unchanged; an opening marker with no closing one, or several blocks, shall be replaced from the first opening marker to the last closing marker (or to the end) by one block. The block holds W170's title line, then per criterion its status word, text, a failing criterion's quoted note as W170 has it, and its «Después» picture, plus «Antes» per W249; a criterion without a sendable picture appears as text only; there is no «Las capturas están en Atril.» line.
  Proof: src/main/forge/qa-hosting.test.ts the atril block is replaced and the rest kept
  Proof: src/main/forge/qa-hosting.test.ts a description changed since prepare is not written
- **W249** After a successful send, main shall record in `$ATRIL_HOME/qa-views/<repoId>.json` each sent picture's view, link, the MR URL and the time; a picture with a view shall get as «Antes» the link of the most recently recorded row of that view from another MR that the forge answers as merged into the same target branch as this MR (reading at most 5 candidates, newest first), and none when there is none.
  Proof: src/main/qa-publish.test.ts a view already in the target branch shows as before
- **W250** If no criterion has a step shot, then «Publicar en la MR» shall post the W170 comment unchanged with no sheet; if every picture is `blocked`, then «Publicar sin imágenes» shall post the W170 comment unchanged; in both cases nothing is written to the description, `atril-qa` or uploads.
  Proof: src/main/qa-publish.test.ts without sendable pictures the comment goes as today
- **W251** While main prepares, «Publicar en la MR» shall be disabled and read «Revisando las capturas…». The QA screen shall then show the preview as a sheet: each row with its criterion, the cleaned picture from W241 for a `send` row, «Se envía» or «No se envía: {reason in words}», and the button «Enviar {n} imágenes» («Enviar 1 imagen» for one, «Publicar sin imágenes» when n is 0), reachable by keyboard and closed by Escape without sending; a failed send shall show the W150 problem in the sheet with its own fix button, whose retry sends the same token again, or «Revisar otra vez» (prepare again) for W245/W248's answers.
  Proof: src/renderer/qa-publish.test.ts the sheet shows what goes and what is blocked before sending
- **W252** The criterion texts and failing criteria's quoted notes in the block shall go through the crash scrubber with the person's home before they are written.
  Proof: src/main/forge/qa-hosting.test.ts block text is scrubbed

### Enforced rules (enforce-written-rules, 26 nov 2026)

- **W230** If a commit being pushed has, in its tree, a line that matches (case-insensitively) a pattern of `$HOME/.config/atril/work-identifiers.txt`, then `.githooks/pre-push` shall exit non-zero and print git's own matching lines (`<sha>:path:line:text`), and a real `git push` with `core.hooksPath` set to `.githooks` shall fail. This covers any pushed ref, not only the checked-out one, and a line of `pnpm-lock.yaml` that does not contain `integrity:`.
  Proof: src/main/harness.test.ts the pre-push hook refuses a work identifier
- **W231** While `$HOME/.config/atril/work-identifiers.txt` is missing or has no non-blank line, or when no pushed tree matches it, or when the push only deletes a ref, or when the only matches are `pnpm-lock.yaml` lines that contain `integrity:`, `.githooks/pre-push` shall exit 0.
  Proof: src/main/harness.test.ts the pre-push hook lets clean pushes through
- **W232** If the scan fails (a pattern in the list that is not a valid regular expression, a list that exists but cannot be read, or a pushed sha git cannot scan), then `.githooks/pre-push` shall exit non-zero and say, on one line, that the work-identifier scan failed.
  Proof: src/main/harness.test.ts the pre-push hook refuses when the scan itself fails
- **W233** When Claude Code is about to run a Bash command that runs the pnpm script `build` (`pnpm build`, `pnpm run build`, flags that take no argument between the words such as `pnpm -s build`, at the start of the command or after `;`, `&&`, `||`, `|` or a newline), the PreToolUse hook that `.claude/settings.json` registers (under `hooks.PreToolUse`, matcher `Bash`, type `command`), run as that file names it, shall exit 2 with a one-line reason on stderr that says this repo is never built in a session.
  Proof: src/main/harness.test.ts the build guard denies pnpm build
- **W234** While the Bash command has no `pnpm` at a command position followed by `build` as W233 reads it (`pnpm -s typecheck`, `pnpm test`, `pnpm builder`, `git commit -m "never pnpm build"`), or the tool is not Bash, or the payload is not JSON, the guard shall exit 0 and print nothing.
  Proof: src/main/harness.test.ts the build guard lets everything else through
- **W235** `CLAUDE.md` shall be at most 7000 bytes, shall name `.githooks/pre-push` and `.claude/settings.json`, shall have the sections `## Last landed`, `## Next` and `## Untested with real data`, and shall not contain the scan command (`git grep -niE`), `Where we left off` nor `Dónde lo dejamos`.
  Proof: src/main/harness.test.ts CLAUDE.md stays a short brief that points at the hooks
### Fewer go-on cards (fewer-go-on-cards, 26 nov 2026)

- **W217** When the hook gets `Stop`, W228, W229 and W219 do not hold, the session has no pause mark (W86), fewer than 5 blocks are in a row (W218), and at least one `.agents/changes/*/proposal.md` under the repo root has an open box, then the hook shall print `{"decision":"block","reason":…}` whose reason names every change with open boxes and its count, and write `state: working` with no `kind`. The repo root is the nearest folder at or above the payload's `cwd` that holds `.git` (a file or a folder); without one, nothing is open. An open box is a line matching `^\s*[-*]\s+\[ \]`, outside a ``` fence, between the `## Checklist` heading and the next `## ` heading.
  Proof: src/main/agent.test.ts a stop with open boxes keeps the agent going
  Proof: src/main/agent.test.ts only open boxes under the checklist of the repo count
- **W218** The hook shall keep `blocks` in the state file, carried across events: `UserPromptSubmit` sets it to 0, a `Stop` whose payload has `stop_hook_active: false` counts from 0 (an absent field carries the count), and each block under W217 adds 1.
  Proof: src/main/agent.test.ts a fresh stop or a prompt restarts the count
- **W225** If a `Stop` would block under W217 but 5 blocks are already in a row, or the session has a pause mark, then the hook shall print nothing and write `needs-you` with `kind: turn-end`, as before this change.
  Proof: src/main/agent.test.ts keeping going stops after five blocks in a row
  Proof: src/main/agent.test.ts a paused agent is never kept going
- **W219** When the hook gets `Stop`, W228 and W229 do not hold, and the newest assistant text in the transcript tail, after removing trailing whitespace and the characters `` *_`"'»”) ``, ends with `?`, the hook shall write `needs-you` with `kind: question`, `text` «Te pregunta: <q>» and `questions: [{ question: q, header: '', options: [], multiSelect: false }]`, where q is that text's last non-empty line with whitespace collapsed, the same characters and a leading `*_` trimmed from both ends, and clipped to 200 characters; it shall not block, whatever boxes are open.
  Proof: src/main/agent.test.ts a question in prose is a question wait
- **W223** While a question wait's due question has no options, the card shall show q exactly as its head, no header and no buttons.
  Proof: src/renderer/components/agentcard.test.tsx a question in prose shows without buttons
- **W226** While a workspace is in Automático, a question wait whose due question has no options shall not be answered by Atril, and Atril shall add one `ask` notice for it (W15).
  Proof: src/main/status.test.ts automatic leaves a question in prose to the person
- **W228** If the hook gets `Stop` while its state file says `needs-you` with `kind` `question` or `permission`, then it shall write `needs-you` with `kind: turn-end`, keeping the stored questions, as before this change: no block, no W219, no `done`.
  Proof: src/main/agent.test.ts the hook keeps every question and what a permission is for
- **W229** When the hook gets `Stop`, W228 does not hold, and the transcript tail holds a `tool_result` whose content starts «Command running in background with ID: <id>» with no later user entry whose content starts «<task-notification>» and contains `<task-id><id></task-id>`, then the hook shall print nothing and write `state: working` with `waiting: 'shell'`, before W219, W217, W225 and W220 are considered; text that merely quotes those strings (an assistant text, a tool's output) shall not count.
  Proof: src/main/agent.test.ts a stop while a background shell runs is working
- **W290** While a session's state file says `working` with `waiting: 'shell'`, Atril shall show the activity «Esperando a una shell en segundo plano» on top, as W199 does for a subagent, and add no notice.
  Proof: src/main/status.test.ts a stop behind a background shell shows what it waits for
- **W291** When the hook writes W225's fallback because 5 blocks are already in a row (not because of the pause mark), it shall also write `why: 'cap'` and `box`: the text after `[ ]` of the first open box of the first change W217 lists, whitespace collapsed and clipped to 120 characters.
  Proof: src/main/agent.test.ts the keep-going cap names the box it is on
- **W292** On every `Stop` the hook shall write `said`, the last sentence of the newest assistant text (its last non-empty line, whitespace collapsed, split after `.`, `!`, `?` or `…`, the last non-empty piece, clipped to 200), and keep, carried across every event, `fail` (the text of the newest failed-`Bash` line since the previous `Stop`, A-fail), `lastStop: { said, fail }` and `repeat`: the previous `repeat` plus 1 when this stop's `said` is non-empty and equals `lastStop.said`, or its `fail` is non-empty and equals `lastStop.fail`, else 0; each `Stop` then sets `lastStop` to its own pair and clears `fail`.
  Proof: src/main/agent.test.ts stops that repeat themselves are counted
- **W293** For a `turn-end` wait, main shall pass `why` (`loop` when `repeat` ≥ 1, else `cap` when the file says so, with its `box`) and `said` to the card, and the card shall head, first match: `loop` → «Se repite: parece un bucle» with «Pausar» after «Sigue»; `cap` → «Ha parado 5 veces con casillas abiertas: puede estar atascado» and, with a box, «Va por: {box}»; `said` → «Para porque: “{said}”»; otherwise W202's.
  Proof: src/main/status.test.ts the wait carries why the agent stopped
  Proof: src/renderer/components/agentcard.test.tsx a go-on card says why the agent stopped
- **W294** When the person presses «Pausar» on a `turn-end` card, main shall write the pause mark (W86) without sending Escape, so the state reads `paused`; pausing shall still be refused in any other state but `working`.
  Proof: src/main/pause.test.ts a looping turn end pauses without a key
- **W220** When the hook gets `Stop` and none of W228, W229, W217, W225 or W219 applies, it shall write `state: done` with the turn's text as today and no `kind`, and remove the pause mark as for `needs-you`.
  Proof: src/main/agent.test.ts a stop with nothing left is done
- **W227** Atril shall report a session whose state file says `done` as `done`, with no wait (`waitOf` null) and outside «Siguiente» (N1), and Automático shall send nothing to it.
  Proof: src/main/status.test.ts a done agent is done, not a wait
- **W221** The hook shall keep `turn` in the state file, set to the event's time on `UserPromptSubmit` and carried across every other event. If a session enters `needs-you` or `done` with a `turn` present and equal to, and the same wait kind (or `done`) and text as, the last entry Atril notified for that workspace, then Atril shall add no notice for it; a state without `turn` never matches.
  Proof: src/main/agent.test.ts a prompt starts a turn that every event carries
  Proof: src/main/status.test.ts the same turn end notifies once
- **W222** Wherever an agent's state is shown with `StateLabel`, `done` shall read «terminado» with the `done` icon.
  Proof: src/renderer/components/statelabel.test.tsx a done agent reads terminado
- **W224** «Todos» shall rank `done` equal to `working`, ties by latest activity as for `working` (W81).
  Proof: src/renderer/agents.test.ts done sorts with working

### Repo harness (repo-harness, 26 nov 2026)

- **W280** When the detector reads a repo, it shall report `memory` as found, with `detail` the file name and `n` its line count, when `CLAUDE.md` or `AGENTS.md` is a file at the repo root (`CLAUDE.md` wins when both are), and `skills` as found with its count when `.claude/skills/<name>/SKILL.md` exists for one or more names; otherwise each is a gap. A `CLAUDE.md` over 1 MB shall be found without being read, with `big: true` and no `n`. `skills` shall carry `n` the number of skills, counting at most 300. A `CLAUDE.md` that is a file but cannot be read shall still be the memory file, found with its name and no `n`. A `.claude/skills/<name>` entry that is a link to a folder inside the repo counts like a folder (W284). One test holds every clause.
  Proof: src/main/repoharness.test.ts context items read CLAUDE.md or AGENTS.md and the skills folder
- **W281** When the detector reads a repo, it shall report `lint` found when the `scripts` of its `package.json` or `composer.json` has `lint`, `typecheck` when it has `typecheck`, `type-check` or `tsc`, and `test` when it has `test` whose command is not npm's default placeholder (`echo "Error: no test specified" && exit 1`), each with the script name as detail; a missing file, damaged JSON or a `scripts` that is not an object, or a file over 1 MB, shall read as gaps, never as an error. One test holds every clause.
  Proof: src/main/repoharness.test.ts verification scripts come from package.json and composer.json
- **W282** When the detector reads a repo, it shall report `precommit` or `prepush` found when a regular file named `pre-commit` or `pre-push` (not `*.sample`) is in `.githooks/`, `.husky/` or, only when `.git` is a folder, `.git/hooks/`; and `ci` found, with as detail the first of `.github/workflows`, `.gitlab-ci.yml` and `.circleci/config.yml` that matches, when `.github/workflows/` holds a `.yml` or `.yaml` file, or `.gitlab-ci.yml` or `.circleci/config.yml` is a file. The executable bit is not read: a hook file counts whatever its mode. One test holds every clause.
  Proof: src/main/repoharness.test.ts hook files and CI workflows are found in their fixed places
- **W283** When the detector reads a repo, it shall report `hooks` found when `.claude/settings.json` parses and its `hooks` is an object with at least one event holding a non-empty array, and `permissions` found when its `permissions` has a non-empty `allow`, `deny` or `ask` array; if the file is damaged, missing or over 1 MB, then both shall be gaps (damaged and over-size with the detail `unreadable`), never an error. One test holds every clause.
  Proof: src/main/repoharness.test.ts guardrails read hooks and permissions from claude settings
- **W284** The detector shall write nothing in the repo (the tree is identical before and after, mtimes included), spawn no process, and, for every segment of a path it checks (folders and the last one), treat a symlink whose real target is outside the repo as absent and one that resolves inside the repo as the thing it points to. One test holds every clause.
  Proof: src/main/repoharness.test.ts never writes, never spawns and never follows a link out of the repo
- **W285** When the window asks `atril:harness:get` with a repo id, main shall answer `{ items }` (ten items, each `{ id, group, ok, detail?, n?, big?, doc? }`, language-free data, where `doc: true` is present exactly on the items whose id is in main's docs list) for that registered repo; for an id no repo has it shall answer `{ error: 'unknown' }`, and for a repo whose `repoHealth` is `missing` or not `ok` it shall answer `{ error: 'missing' }`, in both cases reading nothing. When the window asks `atril:harness:doc` with an item id that has a docs page, main shall open that page from its fixed list with `shell.openExternal` and answer true; any other value shall open nothing and answer false. One test holds every clause, calling the exported `harnessGet` and `openDoc` with injected `readRepos`, `health` and `open`.
  Proof: src/main/repoharness.test.ts the get handler answers by repo id and the doc handler opens only listed pages
- **W286** When the person presses «Harness» on a repo row, the card shall read that repo and show «Harness · N of 10», the three groups, and for each item a tick or a gap written as text («Found» / «Missing», not colour alone), its name, its detail when found and one line on why it matters; each gap whose item has `doc: true` shall show one button «How to set it up» that asks main to open it; no found item shall show a button; each row owns its own card, so several can be open, and closing then opening a card reads again. One test holds every clause.
  Proof: src/renderer/harness/harness.test.tsx the Harness card lists found and missing items and offers a doc for each gap
- **W287** While a repo row's `health` is `missing` or `not-git`, the row shall show no «Harness» button.
  Proof: src/renderer/harness/harness.test.tsx a broken repo row has no Harness button
- **W288** When an item carries a count or a size, the card shall write its detail in words: «{file} · {n} lines» (singular «1 line»), «{file} · over 1 MB» when `big`, «{n} skills» (singular «1 skill»), and «Could not read the file» when the detail is `unreadable`.
  Proof: src/renderer/harness/harness.test.tsx the Harness card writes counts, singular, size and unreadable files in words
- **W289** While a read of the card is outstanding and a newer read of the same card begins (another repo id), the card shall drop the older read's reply when it arrives.
  Proof: src/renderer/harness/harness.test.tsx the Harness card ignores the reply of an older read of the same card
- **W295** If the read rejects or answers `{ error }`, then the card shall show a `Problem` saying what happened, that nothing was changed and a «Check again» button that reads again, with the technical text only under «Show detail».
  Proof: src/renderer/harness/harness.test.tsx the Harness card shows a Problem when the read fails or answers an error

### CDP isolation (fix-cdp-isolation, 26 nov 2026)

- **W320** While the app is not packaged, `ATRIL_CDP_PORT` is a whole number from 1024 to 65535 and `ATRIL_LAUNCH_TOKEN` is 16 to 128 characters of `A-Z a-z 0-9 _ -`, `cdpConfig` shall answer `{ port, token }`.
  Proof: src/main/cdp.test.ts enables only in dev with a port and a token
- **W321** While the app is packaged, or `ATRIL_CDP_PORT` is unset or empty, `cdpConfig` shall answer nothing, whatever `ATRIL_LAUNCH_TOKEN` holds.
  Proof: src/main/cdp.test.ts answers nothing when packaged or without a port
- **W322** If `ATRIL_CDP_PORT` is set and not empty in a dev start and is not a whole number from 1024 to 65535, or `ATRIL_LAUNCH_TOKEN` is missing or not as W320 says, then `cdpConfig` shall answer an error that names the variable at fault and never contains the token.
  Proof: src/main/cdp.test.ts refuses a bad port or token without echoing the token
- **W323** When given a URL and a token, `withLaunch` shall answer that URL with the query parameter `launch` set to the token, keeping any other parameter, and shall answer the same value for a `file:` URL.
  Proof: src/main/cdp.test.ts sets the launch parameter and keeps the rest
- **W324** When `/json/list` on `127.0.0.1:<port>` returns a page target whose `url`, parsed with `URL`, has the parameter `launch` equal to the token, `verifyOwnTarget(port, token)` shall answer true, whatever other targets it lists.
  Proof: src/main/cdp.test.ts finds its own page on a real server
- **W325** If that list has no page with that exact parameter (another Atril's pages, a page whose token only starts with ours, a non-JSON body, an error status, or nothing answering), then `verifyOwnTarget` shall answer false.
  Proof: src/main/cdp.test.ts refuses a port another Atril holds
- **W326** When `guardCdp` is given a `verify`, an attempt count, a delay and a `sleep`, it shall ask until `verify` answers true or the attempts are spent, printing nothing and not exiting on a true; if every attempt answers false, then it shall print one line on stderr naming the port and never the token, and call `exit(1)`.
  Proof: src/main/cdp.test.ts retries then exits on a port another Atril holds
- **W327** When CDP is enabled, the first statement in `src/main/index.ts`'s `app.whenReady().then(async () => {` callback shall be `await cdpGate(`, so that the guard passes before `loginPath`, any handler or any window.
  Proof: src/main/cdp.test.ts index runs the cdp gate before any other startup
- **W328** If no page of any context of the browser has the parameter `launch` equal to the token, then `attachVerified(connect, port, token)` shall close the connection and throw an error that names the port, without calling `content`, `evaluate`, `title`, `screenshot` or any read other than `url()` on any page.
  Proof: scripts/cdp-drive.test.ts refuses a browser that is not ours without reading it
- **W329** While the browser also holds pages of another Atril, `attachVerified` shall never return or read them and shall return the one page carrying the token; if two pages carry it, then it shall close the connection and throw.
  Proof: scripts/cdp-drive.test.ts ignores the pages of another Atril
- **W330** The query name `scripts/cdp-drive.mjs` looks for shall equal `LAUNCH_QUERY` of `src/main/cdp.ts` (the script repeats it, because a `.mjs` cannot import the `.ts`), so that a rename in one breaks a test, not a drive.
  Proof: scripts/cdp-drive.test.ts uses the query name main writes
- **W331** While the app has not yet created its first real window, closing the hidden probe of W327's gate shall not quit the app: `window-all-closed` quits only once `createWindow` has run. (Found by the real-app drive of box 1: destroying the probe, the only window, quit the app before the real window existed.)
  Proof: src/main/cdp.test.ts index keeps running when the probe closes before the first real window

### Work vs main (#11, #10, #8) (work-vs-main, 26 nov 2026)

- **W300** When a new work (not `existing`, not a review) opens in a worktree of a repo that has a remote named `origin`, main shall run `git fetch origin` with a 15 s timeout and create the branch with `--no-track` from `origin`'s default ref — the target of `refs/remotes/origin/HEAD`, else `refs/remotes/origin/main`, else `refs/remotes/origin/master` — recording that commit as `baseCommit` and the ref's short name (`origin/main`) as `baseRef`; the person's checkout keeps its branch and HEAD.
  Proof: src/main/workspaces.test.ts a new work branches from origin's default branch, not the local checkout
- **W301** When a new work opens in place (W7), main shall do W300's fetch and switch the person's copy with `git switch --no-track -c <branch> <ref>` from the same default ref, recording the same `baseCommit` and `baseRef`; a branch that already exists locally is switched to as it is, with its HEAD as `baseCommit` and no `baseRef`.
  Proof: src/main/workspaces.test.ts an in-place new work starts from origin's default branch
- **W302** If W300's or W301's fetch fails or times out, then main shall branch from the default ref as last fetched; if the repo has no `origin` remote or none of the three refs resolves, then it shall branch from the local HEAD as before this change and record no `baseRef`.
  Proof: src/main/workspaces.test.ts without a reachable origin a new work uses the last fetched default branch or the local HEAD
- **W303** `workBase(record)` shall answer `git merge-base HEAD <baseRef>` run in the work's folder while the record has `baseRef` and that command answers a commit, and `baseCommit` otherwise; while nothing counted (F46) changes in the work, asking again shall run no process.
  Proof: src/main/workspaces.test.ts workBase answers where the work left its base ref and spawns nothing while quiet
- **W304** While a record has `baseRef`, the branch size the hook claims (W45) shall be counted against the same base as W303.
  Proof: src/main/agent.test.ts the branch size counts from where the work left origin's default branch
- **W305** The radar (W166) shall list each work's files against W303's base, so a work that merged a newer `origin/main` clashes only on files it changed itself.
  Proof: src/main/radar.test.ts a work that merged origin's default branch clashes only on its own files
- **W312** The panel's boxes and total (`atril:flow:boxes`) and a box's diff (`atril:flow:boxdiff`) shall be computed against W303's base, through `panelBoxes` and `panelBoxDiff`, so the panel's total equals the hook's count (W46) for a work with `baseRef`.
  Proof: src/main/workspaces.test.ts the panel's total counts from the same base as the hook
- **W306** When a `merged` notice is added and W187's rule matches it to a work, main shall set `merged: true` on that work's record; a `closed` notice or a notice with no match changes no record.
  Proof: src/main/workspaces.test.ts a merged notice marks its work merged and nothing else
- **W307** When W300's or W301's fetch succeeds, main shall set `merged: true` on every other non-review record of that repo whose branch (`refs/heads/<branch>` in the repo) has at least one commit after its `baseCommit` and is an ancestor of the default ref; a branch with no commits of its own, with a commit not in the default ref, or missing, stays as it is; a failed fetch marks nothing.
  Proof: src/main/workspaces.test.ts a new work's fetch marks siblings whose branch already landed
- **W308** The radar shall leave every `merged` record out on both sides: it gets an empty list and appears in nobody's.
  Proof: src/main/radar.test.ts a merged work is out of the clash check
- **W309** While a work's record is `merged`, its row shall show «Merged» in place of its agent state and no agent card even while its agent waits for the person; «Remove» behaves as before (W136).
  Proof: src/renderer/radar.test.ts a merged work reads Merged with no agent card
- **W313** `stateOf` shall answer `done` for a `merged` work whatever its agent's state.
  Proof: src/renderer/agents.test.ts a merged work counts as done
- **W310** Each radar hit shall carry `ids`: the ids both works own, where a work owns an id defined by a line starting `- **<capital letters><digits>**` that does not carry the amended marker, in one of its `.agents/changes/*/*.md`, and that no such line anywhere under `.agents/` defines in the work's base commit (W303); sorted by `localeCompare` with `numeric: true`; files are read with `lstat`, links are not followed and files over 1 MB are skipped.
  Proof: src/main/radar.test.ts two works defining the same new criterion ids clash on those ids
- **W311** When a row's hits share ids, the row shall show, under the file line, «Criterion id {id} also in {branch}» for the first hit with ids and its first id, or «Criterion ids {id} and {n} more also in {branch}» where n is that hit's ids minus one, the id before the branch so a cut line keeps it, with every «{branch}: {id}» of every hit as the line's title.
  Proof: src/renderer/radar.test.ts a row with shared criterion ids says which and with whom

### A merged work is finished (finished-means-finished, 27 nov 2026)

- **W332** `agentState` shall answer `done` for a work whose record is `merged`, whatever its state file, its pause mark or its tmux session say.
  Proof: src/main/status.test.ts a merged work is done in main whatever its state file says
- **W333** While a work's record is `merged`, «Up next» (N1) shall hold no `agent` item for it, even when its state file says `needs-you`.
  Proof: src/main/status.test.ts a merged work adds no up-next chip
- **W334** While a work's record is `merged`, the status poll shall send it no idle reminder (W180) and Automático (W205–W207) shall send nothing to its pane, even when its state file says `needs-you`. Ceiling: one test asserts both clauses, the reminder on a manual work and the silence on an Automático one.
  Proof: src/main/status.test.ts a merged work gets no reminder and no automatic answer
- **W335** While a work's record is `merged`, the status poll shall send no «done» notice for it, including on the poll where its record became `merged`.
  Proof: src/main/status.test.ts a merge sends no finished notice
- **W336** While a work's record is `merged`, the «All agents» card and the work header shall show «Merged» in place of its agent state.
  Proof: src/renderer/overview.test.ts a merged work's card and header read Merged

### Card answer lands (card-answer-lands, 27 nov 2026)

- **W337** The strip above the terminal (`.term-ask`) shall shrink down to `min-height: 64px` and scroll with `overflow-y: auto`, and the terminal (`.xterm-host`) shall keep `min-height: 180px`; inside the strip, the card's question text (`.term-ask .ask-q`) shall scroll on its own past `max-height: 8lh`, so its buttons and a problem stay in view under it. Ceiling: the proof reads the rules from `styles.css`; the layout they produce is watched in the real-app drive (box 5).
  Proof: src/renderer/quickreplies.test.ts a tall card scrolls inside itself and the terminal keeps its height
- **W338** Main shall attach and resize an agent's read-only tmux client with at least 10 rows, whatever rows the window asks for; columns pass unchanged.
  Proof: src/main/pty.test.ts the tmux client never goes under ten rows
- **W339** When the window answers a card (`atril:status:answer`) and `answerAgent` (W75) sent the keys, main shall answer `{ ok: true }` only once, within 4 s, the work's hook state file is no longer `needs-you` or carries a new `at`, or its pane's visible text differs from the text read just before the keys; if neither happens, main shall answer «The answer did not reach the agent: its prompt is still on screen.». A refusal from `answerAgent` passes through unchanged. If a card answer to the same work is still landing, main shall send nothing and answer «An answer to that agent is already on its way.».
  Proof: src/main/status.test.ts a card answer counts only once the agent leaves the prompt
- **W340** While a card answer is on its way, the card shall show «Sending…» and disable its buttons and number keys; when main says the answer did not arrive, the card shall show that sentence with «Try again», scrolled into view within its strip, and «Try again» shall send the same choice again.
  Proof: src/renderer/components/agentcard.test.tsx the card says sending until the answer lands and offers to send again

### Ignored files never decide the mode (#2) (ignored-files-not-dirty, 27 nov 2026)

- **W400** When a repo whose root holds a file matched by a `.gitignore` pattern (`caso-1-stripe.gif` under `caso-*`) is registered, Atril shall set its mode to `worktree` with W1's «no signal» reason (in the Spanish locale the tests run in, «ninguna señal: cada trabajo en su propio worktree»), naming no file.
  Proof: src/main/repos.test.ts a media file ignored by pattern leaves the repo in worktree
- **W401** While an ignored file sits beside `node_modules` or `vendor` directories that together exceed 2 GB, Atril shall set `in-place` and name the dependencies (W3), not the file.
  Proof: src/main/repos.test.ts heavy dependencies still win beside an ignored file

### Add a repo by its path (#1) (add-repo-by-path, 27 nov 2026)

- **W440** When main is asked to add a repo by text that W441's first check lets through (a string, not blank, no NUL byte), it shall trim the text, expand a leading `~` alone or `~/` to the person's home, and refuse any text that is still not an absolute path (a relative path and `~name/…` included) with «{text} is not a full path: start it with / or ~/.», `fix: 'pick'` and the text as `detail`, before running git or writing anything. One test holds every clause.
  Proof: src/main/repos.test.ts a typed path is trimmed, ~ expanded and anything not absolute refused
- **W441** This check runs first, before W440's. If the text is not a string, is empty after trimming or holds a NUL byte, then main shall refuse with «Type the path of a folder first.» and `detail: ''`; if the resolved path does not exist or cannot be examined (any `stat` failure, a path through a file and an unreadable parent included), with «There is no folder at {path}.»; if it is a file, with «{path} is a file, not a folder.»; each answer shall be `{ error: 'bad-path', what, detail, fix: 'pick' }` with the resolved path as `detail` (except the first, whose `detail` is empty), shall run no git command and shall leave `repos.json` as it was. One test holds every clause.
  Proof: src/main/repos.test.ts a typed path that is not a folder is refused before git and writes nothing
- **W442** If `git -C <path> rev-parse --show-toplevel` fails with «not a git repository» in its stderr, then main shall refuse with «{path} is not a git repository.» and `fix: 'pick'`; if it exits 127 or has «xcode-select» in its stderr, with «git does not work on this Mac.» and `fix: 'git'`; for any other failure, with «git could not read {path}.» and `fix: 'pick'`; each with git's stderr as `detail`, and none shall write `repos.json`. One test holds every clause.
  Proof: src/main/repos.test.ts a typed folder git cannot read is refused with its own fix and writes nothing
- **W443** When the typed path is a folder inside a git repository, main shall register that repository's top level through `registerRepo` and answer its result unchanged with `path` added, `path` being the typed text resolved (`path.resolve` of the expanded text — for a subfolder the subfolder, never the top level); an already registered top level shall come back as that repo with nothing written, a taken or invalid id as `registerRepo`'s own `id-taken` or `invalid-id`, and any other answer of `registerRepo` (`not-a-git-repo`, a `StateProblem` for a damaged `repos.json`) as it is. One test holds every clause except the damaged file, which W447 proves from the window.
  Proof: src/main/repos.test.ts a typed path registers the git top level like the picker does
