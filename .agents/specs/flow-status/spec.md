# Flow status

Governs: src/main/flow/** src/renderer/flow/**

## Outcomes

- The right panel shows the selected workspace's **stage**, its checklist (closed / total,
  and the first open box), and the file it read them from.
- The stage updates by itself when the agent writes the files, without a manual refresh.
- A workspace with no Libretto change shows "sin Libretto" and nothing invented.

### Flow documents (add-flow-documents, 9 nov 2026)

- In the Libretto panel, **Spec**, **Plan** and the **Checklist** are buttons once their stage is
  reached; each opens a **large modal over the app** with the change's files as tabs and an
  editor — line numbers, markdown colours, an outline of the sections — at that section,
  following the file live. The terminal stays as it is underneath.
- While the agent waits for the person or has stopped, the person types straight into the
  editor; **⌘S** (or Guardar in the status bar) saves; a tab with unsaved changes shows a dot.
  While the agent works the editor is read-only and says so. The saved file is what Libretto
  reads from disk at its next step; nothing else tells the agent.

### File changes (add-file-changes, 9 nov 2026)

- From the **Construir** stage on, the Libretto panel shows **Cambios**: every file the workspace
  changed against its base — committed, uncommitted and new — with its status (A, M, D) and its
  +/− lines, plus the total; it refreshes while Claude works.
- **Construir** becomes a button («Construir · ver N archivos») and each file in the list is a
  button; both open a read-only **diff modal**: the files on the left, the selected file's diff
  in green and red with line numbers, the counts in the status bar.

### Large branches (add-split-large-branch, 9 nov 2026)

- «Cambios» shows the total as a warning past 400 lines, saying Atril asked Claude to propose a split.

### Subagent detail (add-subagent-detail, 10 nov 2026)

Each subagent in the panel can be pressed and opens its log as a read-only terminal, live
while it works.

### Panel without scroll (fit-flow-panel, 10 nov 2026)

- The six stages take a single row: icons joined by a line; the current one carries its name beneath;
  the others say it on hover and to a screen reader. Spec, Plan and Construir still
  open what they open today (F13, F20).
- Checklist, Cambios, Otros cambios and Subagentes fold when their title is pressed, with their count
  in view; Atril remembers how you left them; Otros cambios starts folded.
- Cambios shows at most 8 files; with more, «+N más» opens the diff of the ninth.
- A normal work (3/7, 12 files, 3 subagents) fits in the panel without scroll in a window 900 px tall,
  Pau's (his screenshots: 2880×1768 at 2x).

### Code per box (panel-c, 11 nov 2026)

- While the agent builds, the panel shows which step it is at, which boxes it closed with which code, and the code it is
  writing now, and that code can be seen large in the centre.

### Subagents as branches (subagent-branches, 11 nov 2026)

- It shows which subagents work for the box being built, what each does and for how long, without a separate
  section.

### Faster panel (fast-panel, 11 nov 2026)

- Choosing a work shows its boxes, and opening a box's code, without redoing all the git work each time.
- The agents' state costs one process per round, not two per work.
- At rest, Atril launches far fewer processes.

### Diff without header (diff-header, 11 nov 2026)

- A box's code starts at its first `@@`: every visible line is code.

### Quiet panel (quiet-panel, 11 nov 2026)

- With a work chosen and nothing changing, the panel launches no process; when a file is touched or a commit is made, the next round shows it.

### Panel never blank (flow-empty, 11 nov 2026)

- The panel is never blank: it either says it is reading, or shows the boxes, or says why there are none yet.

### Collision radar (radar, 11 nov 2026)

- Twelve watchers fit at once: the radar and the panel do not evict each other with several works.

## Scope boundaries

**In:** reading `.agents/changes/*/` in a workspace and deriving the stage.

**Out:** writing any Libretto file; running `libretto`; stages the files cannot show.
`review-work` and `present-work` leave nothing on disk that tells them apart from building,
so they are **not** shown as their own stages in this phase — the sketch's eight dots
become the six below. Showing them needs a signal from the agent session (phase 3).

### Flow documents (add-flow-documents, 9 nov 2026)

**In:** the document view, live reading, editing and saving `proposal.md` and `spec-*.md` of the
workspace's current change. **Out:** other changes' folders, the capability specs under
`.agents/specs/`, creating or deleting files, telling the agent what changed (the person replies
in the terminal), rich-text editing, a diff of the person's edit.

**Never scoped out:** main refuses a save while the agent is working, for any name that is not
`proposal.md` or `spec-<name>.md` directly in the current change folder, and when the file changed
on disk since it was read — and writes atomically, so a crash never leaves half a file; the file's
text is never rendered as HTML; the view is keyboard-operable (Escape closes, the buttons are
native).

### File changes (add-file-changes, 9 nov 2026)

**In:** the list, its live refresh, the diff modal. **Out:** staging, reverting or editing files
from Atril, comments on lines (phase 2's MR review), word-level diffs, renames shown as such
(a rename shows as D + A).

**Never scoped out:** main reads only paths that git lists as changed in that workspace; the diff
text is rendered as text, never markup; the modal holds the keyboard like the document modal.

### Large branches (add-split-large-branch, 9 nov 2026)

**In:** the warning. **Out:** anything else in the panel.

### Subagent detail (add-subagent-detail, 10 nov 2026)

**In:** the row as a button, the modal, the refresh, the terminal style. **Out:** writing to the
subagent, stopping it, searching the log, colours per tool.

**Never scoped out:** keyboard (focus, Tab inside, Esc), the content as text.

### Panel without scroll (fit-flow-panel, 10 nov 2026)

**In:** the stages row, the four foldable sections, Cambios' cap, removing the header sentence.

**Out:** the Zen, Partitura, Río, Programa and Esfera designs (they stay in `bocetos/fase2-nucleo.html`); a
setting to pick the design; the Actividad tab; the subagent modal.

**Never scoped out:** each stage keeps its name and its state as accessible text (W22); the sections
fold with the keyboard; nothing that can be opened today stops being openable: at most it is one click away
(unfolding its section).

### Code per box (panel-c, 11 nov 2026)

**In:** steps as six segments with a name above the title, timeline of boxes with their code, the live segment, «Ampliar» to the centre and ⌘⇧E.
**Out:** subagents as branches (`panel-c-subagents`); QA as its own screen (`qa-screen`); the question balloon (`ask-balloon`); editing code; commenting on lines.
**Never scoped out:** the diff as text (never HTML); literal paths to git (F24); the 1 MB cut (F23); keyboard and
accessible names; colour tokens.

### Subagents as branches (subagent-branches, 11 nov 2026)

**In:** the branches under the box, the last action on hover, removing the section.
**Out:** assigning subagents to specific boxes (all hang from the current one); changing F28's modal.
**Never scoped out:** keyboard (each branch is a button); texts through `t()`; tokens; the log as text.

### Faster panel (fast-panel, 11 nov 2026)

**In:** `src/main/flow/boxes.ts`, `src/main/flow/changes.ts`, `src/main/flow/watch.ts` (if the key is needed), `src/main/status.ts`, `src/main/tmux.ts`, `src/main/activity.ts`, `src/main/workspaces.ts` (`listWorkspaces` with the tmux snapshot). **Out:** changing the Mac's antivirus or git; rewriting the panel; MR and Jira polling.

### Diff without header (diff-header, 11 nov 2026)

**In:** `src/renderer/flow/DiffText.tsx`. **Out:** syntax highlighting; wrapping long lines.

### Quiet panel (quiet-panel, 11 nov 2026)

**In:** `src/main/flow/boxes.ts` (the saved answer), one watcher per work in `src/main/flow/` (next to `watch.ts`), closed with `flow.forget`. **Out:** the agents' state (W163 already left it at one call); MR, Jira, activity.

### Panel never blank (flow-empty, 11 nov 2026)

**In:** `src/renderer/flow/FlowPanel.tsx`, i18n. **Out:** opening the spec from here (the document buttons already do).

### Collision radar (radar, 11 nov 2026)

**In:** `src/main/flow/quiet.ts`. **Out:** the rest of the watcher.

## Constraints

- Libretto's layout and checklist rule exactly as `find-work` defines them: the checklist is
  the workspaces spec's `## Checklist` when it holds a box, else `tasks.md`, else `plan.md`; a box
  is a line matching `^\s*[-*]\s+\[( |x|X)\]`; boxes inside a code fence do not count; in
  the workspaces spec only boxes under `## Checklist` count.
- Watching: `fs.watch` on the workspace root (non-recursive) to see `.agents/` appear, and
  on `.agents/changes/` once it exists, debounced 500 ms.
- **Base** is the base commit in the workspace record (workspaces spec, Vocabulary).
- **Which change:** with several folders under `.agents/changes/`, the panel shows the one
  modified most recently and lists the others by name.
- **Old layout:** a change with no the workspaces spec gets its stage from its checklist alone
  (Construir or Terminado sin aterrizar), else Entrada.

### Flow documents (add-flow-documents, 9 nov 2026)

- The current change and its folder come from `stageOf` (F12's most recent change).
- The agent state comes from main's status tracker (W14–W16, W26).
- No new dependency.

### File changes (add-file-changes, 9 nov 2026)

- git only, through the runner (W-criteria); no new dependency.
- Reuses the document modal's look (F13–F17) and the workspace's `baseCommit` (W5).

### Large branches (add-split-large-branch, 9 nov 2026)

- Uses the total F20 already shows.

### Subagent detail (add-subagent-detail, 10 nov 2026)

Reuses `useModalKeys` and the `modal`/`dlg edmodal` classes; monospace with the terminal's tokens.

### Panel without scroll (fit-flow-panel, 10 nov 2026)

- Existing `FoldSection` and `useFolded`; stable section ids to remember the state.
- Texts through `t()` with their English; colours only as tokens.
- `a11y.test.ts` already requires each `.stg` to carry done/current/pending as text.

### Faster panel (fast-panel, 11 nov 2026)

- Nothing is shown stale: a new commit, a checklist change or a file touched in the open segment shows on the next round.
- Caches live in main's memory and are emptied when a work is closed.

### Diff without header (diff-header, 11 nov 2026)

- The diff stays text, never markup (F37).

### Quiet panel (quiet-panel, 11 nov 2026)

- Nothing is shown more than 30 s stale even if the watcher fails; with the watcher fine, nothing is shown stale.
- `.git/objects`, `node_modules` and the like wake nothing that did not need waking: notices are filtered by path.

### Panel never blank (flow-empty, 11 nov 2026)

- Texts through `t()`.

### Collision radar (radar, 11 nov 2026)

- Nothing else changes in F46–F47.

## Prior decisions

- **The flow is the spine of every piece of work** — Pau, 9 nov: «tiene que combinar la dos
  cosas, para que sea un flujo en un app».
- **Read-only, from files** — the app never decides the stage; Libretto does, by writing its
  files.

### Flow documents (add-flow-documents, 9 nov 2026)

- **See and correct what the agent wrote** — Pau, 9 nov: «si tú le das al libreto y le das encima
  del spec o del plan, que puedas ver lo que ha escrito la IA … el plan lo ves bien y puedas
  modificarlo antes de que tire al siguiente» → «dale» to: read live, edit only while it waits.
- **Edit only while the agent waits** (assumed): the agent and the person never write one file
  at once; the mtime check catches the rest.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| A markdown library (react-markdown, marked) | a new dependency for five constructs; marked returns HTML that would need sanitising |
| A code editor component (CodeMirror, Monaco) | the right tool for a big editor, but hundreds of KB for markdown colouring; the overlay does it in one file — revisit if Pau wants search, multi-cursor or folding |
| A read view plus an Editar button | Pau: «que sea visualmente mas como un editor para poder editar» |
| Tabs in the centre next to the terminal (sketched, also full width) | Pau: «no cabe todo en … la parte de la terminal, yo pensaba mas como un modal» |
| Editing only the section you read | splicing a section back into the file is where edits get lost; the whole file is honest |
| Locking the file while the person edits | the agent does not know about the lock; the state gate plus the mtime check cover it |
| Edit any time, last writer wins | the agent's next write silently erases the person's correction |

#### Decision log, answers as given (2026-11-09)
- Q: (proposal) see and edit spec and plan from the panel; edit only while the agent waits → A: «dale».
- Q: «No le preguntes, tú sigue» stands → the rest taken with the recommended option, marked (assumed).
- Q: What is seen when each stage is pressed? → A: Spec = `proposal.md` from the top to `## Approach` plus each `spec-*.md`; Plan = `## Approach`; Checklist = `## Checklist`; a stage with nothing written cannot be pressed (assumed).
- Q: What is edited? → A: the whole file of the tab you are looking at (`proposal.md` or a `spec-*.md`), as text; reading is by sections, editing is the file (assumed).
- Q: When can it be edited? → A: with the agent in «te necesita» or stopped; not while working. Main checks it on save, not only the window (assumed).
- Q: And if Claude changes the file while you edit it? → A: nothing is saved and it warns «Claude ha cambiado el archivo mientras editabas: vuelve a abrirlo» (assumed).
- Q: Markdown with a library? → A: no: a minimal reader (headings, lists, boxes, code blocks, bold) that only produces React text, never HTML (assumed).

- Q: (spec-reviewer) the live notice only fires if the stage changes → A: the watcher's key adds the last modification of the change folder, so any write notifies; same 1 s limit as F8 (assumed).
- Q: (spec-reviewer) Which state decides whether it can be saved? → A: one freshly read in main at save time (`agentState`), not the last poll; in the window, Editar is only disabled if the known state is «trabajando» (assumed).
- Q: (spec-reviewer) And a «te necesita» for a permission mid-turn? → A: accepted: it can be edited; what Claude writes afterwards is protected by the mtime check, and the agent rereads the file when Libretto needs it or when you ask in the terminal (assumed).
- Q: (spec-reviewer) What decides whether a stage is a button? → A: the stage of F1–F5: Spec from when the stage is Spec or later, Plan from Plan, Checklist when there is a checklist; sections are cut with the same rules as `stage.ts` (headings `^##\s+…\b`, not counting those inside a code block) (assumed).
- Q: (spec-reviewer) What does each refusal say and what happens to your text? → A: «Claude está escribiendo: no se ha guardado», «Ese archivo no se puede editar desde Atril», «Claude ha cambiado el archivo mientras editabas: copia tu texto y vuelve a abrirlo»; your text stays in the editor (assumed).
- Q: (spec-reviewer) Which change is it saved to? → A: the one that was read: the save carries the change name, validated (`^[a-z0-9-]+$`, existing folder) (assumed).

- Q: (Pau, after the sketch) «lo de espec y plan que sea visualmente mas omo un editor para poder editar etc...» → A: tabs in the central area next to the terminal, an editor with line numbers, markdown colours and a section outline; typed into directly (no Editar button), read-only while Claude works, ⌘S saves, a dot on the tab with unsaved changes; sketch in `fase1-nucleo.html?doc=plan`.
- Q: (Pau) «que se vea mas grande ahora mismo todo se ve minuculo lo de spec y plan» → A: opening a document makes the editor take the full width (the sidebar and the Libretto panel are hidden; «⤡ Salir de pantalla completa» or Esc bring them back), 15 px font.
- Q: (Pau) «si la spec y plan no nos gusta como lo hacemos ya que pasa directamente a construir» → A: it does not go straight: Libretto stops before code with a question; but the hook marked that question as «trabajando» and Atril hid it; fixed in `spec-workspaces.md` (W44).
- Q: (Pau) «no me sterminal de convencer no cabe todo en el la parte de la terminal, yo pensaba mas como un modal» → A: a large modal (94 % of the width, 88 % of the height), dark, over the app: stage title, the change, tabs per file and Cerrar; inside, the same editor (outline, line numbers, colours, status bar, ⌘S); Esc or Cerrar leave and, with unsaved changes, ask first. The terminal is untouched.

### File changes (add-file-changes, 9 nov 2026)

- **See what Claude is changing** — Pau, 9 nov: «molaria un seccion en flujo de libreto donde se
  pueda ver lo cambios de fichero ue se va haciendo» and «se deberia ver en el momento de
  contruir … y que se pueda abrir en modal».
- **Polling, not a file watcher on the whole tree** (assumed): a recursive watcher over a
  worktree with `node_modules` costs more than a 3 s `git diff --numstat`.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| A recursive `fs.watch` on the worktree | fires for `node_modules`, builds and caches; polling git is cheaper and exact |
| Letting the renderer pass any path to diff | main would read whatever the renderer names; the list is the boundary |
| A side-by-side diff | needs twice the width; unified is what `git diff` and review tools show |

#### Decision log, answers as given (2026-11-09)
- Q: (Pau) «los cambios se deberia ver en el momento de contruir no? y que se pueda abrir en modal y ver los cambios» → A: the list appears from Construir; «Construir» is a button that opens the changes modal; sketch in `fase1-nucleo.html?diff=`.
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → the rest taken with the recommended option, marked (assumed).
- Q: What are the changes compared against? → A: against the work's base commit (W5's), including committed, uncommitted and new untracked files that git does not ignore (assumed).
- Q: How does it update live? → A: the window asks for the list again every 3 s while the panel shows Construir or later, and when the stage changes; `git diff --numstat` is cheap (assumed).
- Q: Can the diff of any path be requested? → A: no: main only gives the diff of a file that is in that work's change list (assumed).
- Q: And a huge or binary diff? → A: cut at 1 MB with a notice; a binary says «Archivo binario» (assumed).

- Q: (spec-reviewer) Renames, T and U? → A: `--no-renames`: a rename is D + A; T and U count as M; paths read with `-z` (assumed).
- Q: (spec-reviewer) Is «Total» lines or files? → A: lines added + deleted («512 líneas»); the button says «ver N archivos» (assumed).
- Q: (spec-reviewer) From which stage? → A: Construir, Terminado and Aterrizado; before that, Construir is not a button and there is no section (assumed).
- Q: (spec-reviewer) Does the modal update by itself? → A: no: it is a snapshot with its time and an «Actualizar» button; the panel's list does refresh every 3 s, without asking again while a request is still in flight (assumed).
- Q: (spec-reviewer) Untracked binary? → A: a zero byte in the first 8000 bytes, git's rule; counts 0 and 0 (assumed).

### Large branches (add-split-large-branch, 9 nov 2026)

- **400 lines** (proposal.md).

### Subagent detail (add-subagent-detail, 10 nov 2026)

- F27 changes only in that each row is a button: it goes as `(amended)` (assumed).
- When `endedAt` arrives the log is requested one last time; if the entry disappears (W64), the modal closes; a subagent with no file yet says «Sin registro de este subagente» just like one with no path (assumed).
- 1 s polling only with the modal open and the subagent without `endedAt` (assumed).

### Panel without scroll (fit-flow-panel, 10 nov 2026)

- Design 0 chosen by Pau among six in `bocetos/fase2-nucleo.html` (10 nov).
- A single view, no setting to change it: Pau, «probar en el boceto», and then he chose 0 (10 nov).
- 8 files as Cambios' cap (assumed, 10 nov): with more, the diff modal already lists all.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Designs 1–5 of `fase2-nucleo.html` | Pau chose 0. |
| A separate `Stepper` component | Only one view would use it; it is CSS over what exists. |
| Internal scroll only in Cambios | It still hides things; the cap with «+N más» says so. |

#### Decision log, answers as given (2026-11-10)
- Q: Which design? → A: «nada queda con el 0 · Acordado es el que me gusta … implementa con ese».
- Q: The sentence «Dónde va cada trabajo, leído de sus archivos.»? → A: it goes: the panel says it by itself
  and it is two lines (assumed).
- Q: Count of each folded section? → A: Checklist «3/7», Cambios and Otros cambios their number,
  Subagentes its number of entries (assumed).
- Q: What does «+N más» open? → A: the diff modal at the ninth file, with all of them in its list (assumed).
- Q: (phase 5) How? → A: reuse `FoldSection` (it already remembers its state) and CSS for the stages
  row; no new components except those that come out on their own (assumed). Lost: a generic
  «stepper» component (a single view uses it).

- Q: (spec reviewer) Gaps → A, all (assumed):
  - F20 is amended: Cambios lists per F31 and the total adds up all the files.
  - Construir made a button carries as text «Construir · ver N archivos», instead of its state.
  - The Checklist count is a new string, «{closed}/{total}», and `FoldSection.count` accepts text.
  - Checklist, Cambios and Subagentes start open.
  - «Recordado» is tested by unmounting and mounting again.
  - What is folded stays one click away: open the section.
  - The header sentence disappears (F29).
  - That no scroll is needed cannot be proved by jsdom: it is seen in the photo, and is named as a ceiling.

- Q: (photo) At 900 px Subagentes was cut off → A: Cambios rows on one line, «Leído de» to the
  `title` of «Ver checklist», which becomes a link next to Siguiente; target 900 px, not 1080 (assumed).

### Code per box (panel-c, 11 nov 2026)

- Segments by commits that mark boxes (assumed, 11 nov).
- Ampliar replaces the terminal in the centre, it does not open a window (assumed, 11 nov).
- Same 3 s poll (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| one segment per commit (like T3 Code per turn) | it does not say which box each code closes: what Libretto brings |
| read which files each box touches from the plan text | the plan does not always say; commits do |
| a separate window for the large code | another window to manage; the centre is already there |

#### Decision log, answers as given (2026-11-11)
- Q: Which code belongs to which box? → A: the commits that mark boxes (`- [ ]` → `- [x]` in the checklist of
  `proposal.md`) cut the branch into segments: the code of a closed box is the diff between the commit that closed the
  previous one (or the base) and its own; that of the current box, the diff between the last commit that closed a box (or
  the base) and the working tree, uncommitted included. Never `.agents/` (assumed).
- Q: Several boxes in one commit? → A: they share a segment; each shows the same code (assumed).
- Q: Live how? → A: the same 3 s poll that «Cambios» (F22) uses today, for the current segment (assumed).
- Q: Steps? → A: six joined circles; done ones with ✓, the current one a ring that fills with closed boxes/total,
  pending ones with their number; name on hover; Spec and Plan are buttons (F13); below «{Etapa} · {c} de {t}
  casillas» (or only the stage without a checklist) and the «Spec» and «Plan» buttons of F32 (assumed).
- Q: What is removed? → A: the stages row of F29, the Checklist and Cambios sections (F20, F30, F31) and the modal of F21
  as main entry: «ver archivos» becomes «Ampliar». The large-branch warning (F25) stays as a line under
  the steps (assumed).
- Q: How many boxes in view? → A: all closed ones folded on their line (pressing opens its code), the current one
  open with its code, and of the pending ones the first 3 and «+{n} más» (assumed).
- Q: Ampliar? → A: «⤢ Ampliar» above each code and ⌘⇧D (menu Trabajo → Ampliar código) put that code in the
  centre, in place of the terminal, with its files on top (like F21's modal: list, diff, text only) and «Volver al
  terminal ⌘⇧D»; the panel keeps the steps. Escape also goes back (assumed).

- Q: Where do the steps go? → A: Pau: «me quedo con lo 6 tramos con nombre», above «WEB-3535 ◌ trabajando», in the
  centre (the C of `bocetos/pasos-arriba.html`); the panel starts with the boxes. Replaces the circles with a ring.
- Q: ⌘⇧D? → A: it is already «Dividir abajo»; expanding is ⌘⇧E (Trabajo → Ampliar código), free (assumed).
- Q: Ampliar in Todos, in focus or outside Trabajo? → A: only in Trabajo with «Uno» and a work selected; in focus
  too (assumed).
- Q: What identifies a box across commits? → A: its text; the index is the order in the current checklist. A
  box whose text changes counts as new from that commit (assumed).
- Q: A box marked without a commit? → A: it shows closed and shares the current segment (the uncommitted) (assumed).
- Q: No commits, no checklist, `tasks.md` or Aterrizado? → A: with no checklist there is no timeline (the segments
  are there, with their stage); `tasks.md` is read like the proposal (`readChecklist`); at Aterrizado there is no folder:
  no timeline (assumed).
- Q: A file outside the segment? → A: empty string, like `fileDiff` (assumed).
- Q: F21, F22, F26, F31? → A: F21: its modal becomes the large view (amended in F39); F22: the 3 s heartbeat
  asks for the timeline (amended in F38); F26: «Checklist» stops being something that opens (Spec and Plan remain); F31:
  with no «Cambios» section, it is withdrawn with F20 (assumed).
- Q: F25's total? → A: the timeline also returns the branch's total lines (as `listChanges` does today)
  (assumed).
- Q: Terminal on expand? → A: it is hidden, not unmounted; on return, focus goes back to the terminal; Escape in the
  large view does not reach xterm (assumed).

### Subagents as branches (subagent-branches, 11 nov 2026)

- All live subagents hang from the current box (assumed, 11 nov).
- Last action only on hover or focus (assumed, 11 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| assign each subagent to its box | the hook does not know which box it works for |
| last action always visible | polling each subagent's log every second, for nothing |

#### Decision log, answers as given (2026-11-11)
- Q: Where? → A: under the current box of the timeline (F38), before its code; one branch per subagent
  with its description (or its type), its type, a dot that pulses while it works or «✓» when done, and its duration; the
  «Subagentes» section disappears (assumed).
- Q: Its last action? → A: on hover or on arriving by keyboard, the description is swapped for the last
  line of its log (F28), requested at that moment; with no log, the description stays (assumed).
- Q: Pressing? → A: opens F28's modal, as today (assumed).
- Q: No current box (no checklist or all closed)? → A: the branches hang from the «Cambio: …» line (assumed).

- Q: And QA, which also folds? → A: QA stays foldable until it has its screen (`qa-screen`); F30 speaks only
  of QA (assumed).
- Q: No Libretto change? → A: the branches hang from a «Subagentes» line at the top of the panel (assumed).
- Q: Accessible? → A: each branch carries in its accessible name «trabajando · {d}» or «terminado · {d}» (assumed).
- Q: «Once»? → A: one request each time the pointer or focus enters; if it arrives after leaving, it is
  ignored (assumed).
- Q: Which line? → A: the last non-empty line of F28's log without its prefix (`⏺ `, `⎿ `, `> `); if it is a
  thinking one, «Pensando…»; if the log is empty, the description (assumed).
- Q: Who owns what? → A: `FlowPanel` stays owner of the entries, the 1 s clock and the modal; it passes them to
  `Boxes`, which paints `Branches` inside the current box; `Subagents.tsx` keeps the modal and `duration()`
  and stops painting the section; the test «subagents show in the panel» is rewritten like F27's (assumed).

### Faster panel (fast-panel, 11 nov 2026)

- Spawning is expensive on the person's Mac (~125 ms): Atril counts processes; what does not change is kept in memory with a key that changes when it should.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| One long git process (`git cat-file --batch`) | more code and state; the cache removes most without it |
| Polling less often | new things would take longer to show; the cache does not delay them |

#### Decision log, answers as given (2026-11-11)
- Q: (cold review) Which segments are saved? → A: only those closed by a commit (with `to`); the open segment and those marked only in the working tree are always listed, with their uncommitted changes (assumed).
- Q: (cold review) Exactly which key? → A: folder, change, `baseCommit`, `HEAD`, and of the checklist file that is read (`proposal.md`, `tasks.md` or `plan.md`) its path, `mtimeMs` and size; two edits in the same millisecond with the same size remain an accepted risk (assumed).
- Q: (cold review) When is it emptied? → A: on closing or forgetting the work (`flow.forget`), and the cache never holds more than the open works (assumed).
- Q: (cold review) `useFlow.ts` → A: out: the saving is in main (assumed).
- Q: What is fixed? → A: the three measured causes: the box plan cached, a single tmux call per round, and less polling at rest (assumed).
- Q: With which key the plan cache? → A: folder, `HEAD`, change name and the checklist document's modification date; segments already closed by a commit never change (assumed).
- Q: How long to wait to batch file notices? → A: 200 ms (assumed).

### Diff without header (diff-header, 11 nov 2026)

- None new.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Removing them in main | the same text is used by others (drafts, copy); it is a decision about how it looks |

#### Decision log, answers as given (2026-11-11)
- Q: Also in «Ampliar»? → A: yes: there the file is also named above (assumed).
- Q: And the cut on the right? → A: there is already horizontal scroll (`overflow: auto`); macOS hides the bar until used. Not touched (assumed).

### Quiet panel (quiet-panel, 11 nov 2026)

- On the person's Mac each process is expensive: the panel only asks git when a file or a ref changed, or 30 s have passed.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Compare `git status --porcelain` every round | it is one process per round: exactly what is to be removed |
| Polling less (every 10 s) | new things would take longer to show; the watcher sees it at once |

#### Decision log, answers as given (2026-11-11)
- Q: (cold review) Which notices count? → A: a single rule for every work: any path of the work counts except those containing `/node_modules/` or inside a git folder; inside a git folder only `HEAD`, `index`, `packed-refs`, `refs/**` and `logs/**` count. For a worktree its folder, its git folder (`worktrees/<nombre>`) and the common one are watched; in your copy, the folder and its `.git` already inside (assumed).
- Q: (cold review) And if `git diff` itself rewrites `index`? → A: the version is read before computing and saved with the answer: its own rewrite costs at most one more computation, after which git leaves `index` alone (assumed).
- Q: (cold review) How many watchers? → A: they open when a work's boxes are requested, at most 4 at once; the fifth closes the one unused for longest. They close on closing or forgetting the work (assumed).
- Q: (cold review) The output of a build (`dist/`, `.next/`)? → A: it counts as a change; accepted risk: during that time the panel computes as today (assumed).
- Q: How is it known that nothing changed without launching git? → A: a file watcher (FSEvents, recursive `fs.watch`) over the work's folder and over the git folder of its branch (`HEAD`, `refs`, `logs`); any notice marks the work as changed (assumed).
- Q: And if the watcher misses a notice? → A: at most 30 s later it is computed again anyway (assumed).

### Panel never blank (flow-empty, 11 nov 2026)

- None new.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| An animated skeleton | more code for the same thing: one sentence is enough |

#### Decision log, answers as given (2026-11-11)
- Q: (while building) the flow's `null` is also an answer (review work) → A: `useFlow` gives `undefined` while waiting; only that shows «Leyendo…» (assumed).
- Q: What does the panel say with no boxes? → A: which step it is at and when the boxes appear; without a button, because there is nothing to fix (assumed).

## Task breakdown

- Checklist reader with Libretto's rule.
- Stage derivation.
- Watcher with debounce, pushing changes to the renderer.

## Verification criteria

Stages, in order: **Entrada · Spec · Plan · Construir · Terminado sin aterrizar ·
Aterrizado**.

- **F1** Where a change's the workspaces spec has no `## Verification criteria` heading, Atril
  shall show the stage Entrada.
  Proof: src/main/flow/stage.test.ts proposal without criteria is entrada
- **F2** Where it has `## Verification criteria` and no `## Approach`, Atril shall show Spec.
  Proof: src/main/flow/stage.test.ts criteria without approach is spec
- **F3** Where it has `## Approach` and its checklist holds no box, Atril shall show Plan.
  Proof: src/main/flow/stage.test.ts approach without boxes is plan
- **F4** Where its checklist holds at least one open box, Atril shall show Construir with
  closed / total and the first open box.
  Proof: src/main/flow/stage.test.ts open boxes is construir with counts
- **F5** Where every box is closed and the change folder still exists, Atril shall show
  Terminado sin aterrizar.
  Proof: src/main/flow/stage.test.ts all boxes closed is finished not landed
- **F6** Where the workspace has `.agents/`, no change folder, and commits ahead of its base
  commit, Atril shall show Aterrizado.
  Proof: src/main/flow/stage.test.ts no folder with commits ahead is landed
- **F7** The checklist reader shall ignore boxes inside a code fence, and in the workspaces spec
  boxes outside `## Checklist`.
  Proof: src/main/flow/checklist.test.ts fenced and out of section boxes do not count
- **F8** When a change's files change on disk, Atril shall update the stage within one
  second.
  Proof: src/main/flow/watch.test.ts file change updates the stage
- **F9** If a workspace has no `.agents/` directory, then Atril shall show "sin Libretto".
  Proof: src/main/flow/stage.test.ts no changes folder is sin libretto
- **F10** Where the workspace has `.agents/` but no change folder and no commits ahead of its
  base commit, Atril shall show Entrada.
  Proof: src/main/flow/stage.test.ts fresh workspace with agents dir is entrada
- **F11** When `.agents/` appears in a workspace that showed "sin Libretto", Atril shall show
  its stage within one second.
  Proof: src/main/flow/watch.test.ts agents dir appearing leaves sin libretto
- **F12** Where several change folders exist, Atril shall show the most recently modified one
  and list the others.
  Proof: src/main/flow/stage.test.ts several changes shows the latest and lists the rest

### Flow documents (add-flow-documents, 9 nov 2026)

- **F13** When the person clicks the Spec or Plan step (F29), Atril shall open a modal over the app with
  the current change's `proposal.md` (and, for Spec, one more file tab per `spec-*.md`), with the cursor at that
  part's heading — Spec: the first level-2 heading; Plan: `## Approach`, found outside code fences as in F1–F7 — and
  each shall be a button only from its stage on: Spec from Spec, Plan from Plan; Escape or Cerrar shall close it,
  asking first when there are unsaved changes.
  Proof: src/renderer/flow/documents.test.ts stage opens what the agent wrote
- **F14** While a document is open with no unsaved changes, it shall show the file's new
  text within one second of the agent changing it, even when the stage does not change.
  Proof: src/main/flow/document.test.ts an edit inside a stage still notifies
  Proof: src/renderer/flow/documents.test.ts document view follows the file live
- **F15** While the agent's known state is working, the editor shall be read-only and its status
  bar shall say «solo lectura · Claude está escribiendo»; otherwise the person shall type into it,
  its file tab shall show a dot while there are unsaved changes, and ⌘S or Guardar shall save the whole
  file; if the save is refused, the person's text shall stay in the editor with the reason shown
  above it.
  Proof: src/renderer/flow/documents.test.ts edit only while the agent waits
- **F16** If a save arrives while the agent's state read at that moment is working («Claude está
  escribiendo: no se ha guardado»), or names a change that is not a folder under
  `.agents/changes/` or a file other than `proposal.md` or `spec-<name>.md` directly in it («Ese
  archivo no se puede editar desde Atril»), or the file's mtime differs from the one it was read
  with («Claude ha cambiado el archivo mientras editabas: copia tu texto y vuelve a abrirlo»), then
  Atril shall write nothing and return that message; otherwise it shall replace the file atomically.
  Proof: src/main/flow/document.test.ts save refuses unless it is safe
- **F17** The editor's colouring shall build headings, list markers, boxes, code and bold as
  React text nodes, so markup in the file (`<script>`, `<img onerror>`) shows as literal characters.
  Proof: src/renderer/flow/documents.test.ts markdown renders as text only

### File changes (add-file-changes, 9 nov 2026)

- **F18** The change list shall contain every file that differs from the workspace's base commit
  — committed, uncommitted, and untracked-but-not-ignored — each with its status (A, M or D; a
  rename as D of the old path and A of the new) and its added and removed line counts (0 and 0
  for a binary file, tracked or untracked).
  Proof: src/main/flow/changes.test.ts lists committed, uncommitted and untracked changes
- **F19** If the diff is asked for a path that is not in that workspace's change list, then Atril
  shall return no text without running any git command for that path.
  Proof: src/main/flow/changes.test.ts diff only for a listed file
- **F23** If a file's diff is longer than 1 MB (UTF-8 bytes), then Atril shall cut it at the last
  line break before 1 MB and end it with the line «Diff recortado a 1 MB».
  Proof: src/main/flow/changes.test.ts a huge diff is cut at 1 MB
- **F24** Atril shall pass every listed name to git as a literal path (no glob or `:(` magic), and
  shall count an untracked symbolic link as one line without opening its target.
  Proof: src/main/flow/changes.test.ts names are literal and links are not followed
- **F20** The Libretto panel shall show no «Cambios» section, no list of the branch's files and no «ver N
  archivos» button.
  Proof: src/renderer/flow/changes.test.ts the panel shows no list of changes
- **F21** A box's code shall be seen only in the panel (F38) and large in the centre (F39); no diff modal
  shall open from the panel.
  Proof: src/renderer/flow/boxes.test.ts the code can be seen large in the centre
- **F22** While the stage is Construir or later, Atril shall ask for the boxes (F36) every 3 seconds,
  skipping a tick while the previous request has not answered, and keep a slower answer for the same workspace, box
  and file instead of dropping it.
  Proof: src/renderer/flow/boxes.test.ts the live diff shows even when it answers slower than the 3 s poll
### Large branches (add-split-large-branch, 9 nov 2026)

- **F25** While the branch totals more than the hook's threshold (400) and the person has not chosen «Dejarla así» for that threshold, the top of the Libretto panel shall show a warning element (class `fbig`) reading «⚠ N líneas: rama grande (más de 400).» with «Separar en MRs encadenadas», which sends the agent «Separa esta rama en MRs encadenadas.» through the composer's path (W204), and «Dejarla así», which stores `bigDismissed[workspaceId] = k` in `ui.json` and hides the warning until the branch passes the next threshold.
  Proof: src/renderer/flow/changes.test.ts a large branch offers to split it from the warning
### Automatic or manual mode (add-auto-mode, 9 nov 2026)

- **F26** In an automatic workspace, Spec and Plan shall open read-only whatever the agent's state (an
  exception to F15; the large code view already is), with the status bar «solo lectura · modo automático» in place
  of F15's.
  Proof: src/renderer/flow/documents.test.ts automatic documents are read-only
### Subagents (add-subagents-view, 10 nov 2026)

- **F27** While the selected workspace has subagent entries, the panel shall show them as branches under
  the current box of the timeline (F38) — or under the «Cambio» line when there is no current box, or under a «Subagentes» line at the top of the panel when there is no change — newest
  `startedAt` first, each a button labelled with its description (or its type), its type when a description is
  shown, a live dot while it runs or «✓» when it ended, and «{d}» (F27's durations, refreshed every second while
  any runs), its accessible name ending in «trabajando · {d}» or «terminado · {d}»; no «Subagentes» section shall show. One test holds a case per clause.
  Proof: src/renderer/flow/subagents.test.ts subagents hang from the current box
### Subagent detail (add-subagent-detail, 10 nov 2026)

- **F28** When a subagent branch (F27) is pressed, the panel shall open a modal titled with its
  description (or its type), showing its type and «trabajando · {d}» or «terminado · {d}», and its log
  as monospace text: `> ` before the prompt, `⏺ ` before text and tool lines, `⎿ ` before the first
  result line, «✻ Pensando…» for thinking, and «Sin registro de este subagente» when the log is empty; continuation
  lines of a line carry no prefix; while the subagent has no `endedAt` the panel shall ask for the log again every
  second, and once more when `endedAt` arrives, then stop; when the entry leaves the list the modal shall
  close; Escape or «Cerrar» shall close it and return focus to the branch. The proof drives the polling with
  fake timers.
  Proof: src/renderer/flow/subagents.test.ts a subagent opens as a terminal
### Panel without scroll (fit-flow-panel, 10 nov 2026)

- **F29** While the selected workspace has a Libretto change, the centre of Trabajo shall show, above the
  workspace's repo and title, six segments named Entrada, Spec, Plan, Construir, Revisar and Aterrizar — done ones
  full, the current one filled closed/total of its checklist with «{closed}/{total}» after its name, pending ones
  empty — where Spec and Plan are buttons as F13 makes them; and while F25's total applies, its warning line at the
  top of the panel. The Libretto panel shall not show the stages.
  Proof: src/renderer/flow/panel.test.ts the steps show as six named segments above the work
- **F30** The Libretto panel shall have no foldable sections.
  Proof: src/renderer/flow/subagents.test.ts the panel has no foldable sections
- **F31** The Libretto panel shall show no list of the branch's files and no «+{n} más» files button.
  Proof: src/renderer/flow/changes.test.ts the panel shows no list of changes
### Documents in view (show-doc-buttons, 10 nov 2026)

- **F32** The Spec and Plan steps (F29) shall be buttons named «Spec» and «Plan» with a document icon, each
  only from the stage F13 makes it a button on, opening the same document; the panel's «Cambio» line shall carry no
  document buttons.
  Proof: src/renderer/flow/panel.test.ts the documents read as buttons next to the change
### Live QA (add-qa-lab, 10 nov 2026)

- **F33** The Libretto panel shall show no QA section; QA lives in its own screen (W113).
  Proof: src/renderer/flow/qa.test.ts the panel shows no qa section
### Cost per work (cost-per-work, 10 nov 2026)

- **F34** The Libretto panel shall show no text with «$», «≈» or «tokens» for the selected workspace.
  Proof: src/renderer/flow/cost.test.ts the panel shows no cost
### Question card (ask-card, 10 nov 2026)

- **F35** While the flow state's `others` is not empty, the panel shall show «{n} cambios más en este repo» (n its
  length; «1 cambio más en este repo» for one) with a button «Ver en Libretto» that stores that workspace's repo as the Libretto repo (W104) and opens the
  Libretto screen, and no list of their names; with `others` empty, it shall show neither.
  Proof: src/renderer/flow/panel.test.ts other changes lead to Libretto

### Code per box (panel-c, 11 nov 2026)

- **F36** Main shall split a workspace's commits since its base by the commits that turn checklist boxes of its
  current change (proposal or `tasks.md`, as `readChecklist` finds it) from `[ ]` to `[x]`, returning per box its
  index in the current checklist, text, state (closed, current = the first open box, pending) and, for closed and
  current boxes, the files changed in its range with +/− counts and the closing commit's short id — closed: from the
  previous closing commit (or the base) to its own; current: from the last closing commit (or the base) to the working
  tree, uncommitted changes included — and the branch's total added plus removed lines; a box is matched across
  commits by its text; a box marked but not committed shows closed with the current range; boxes closed in one
  commit share its range; paths under `.agents/` are left out; with no change folder or no checklist it shall return
  no boxes. One test holds a case per clause.
  Proof: src/main/flow/boxes.test.ts each box gets the code that closed it
- **F37** When the window asks the diff of a box's file, main shall answer the diff of that file over that box's
  range as text, with F23's cut and F24's literal paths, and an empty string for a file outside the range.
  Proof: src/main/flow/boxes.test.ts a box's file diff covers only its range
- **F38** While the stage is Construir or later and there is a checklist, the panel shall show it as a timeline:
  closed boxes folded, each a button that opens its files and diff; the current box open with its files and the
  diff of its first file; the first 3 pending boxes greyed and «+{n} más» for the rest; the timeline asked again every
  3 seconds while it shows, skipping a tick while one is pending.
  Proof: src/renderer/flow/boxes.test.ts the checklist shows each box with its code
- **F39** When the person presses «⤢ Ampliar» on a box's code, the centre shall show that box's files and the chosen
  file's diff as text in place of the terminal, which stays mounted but hidden, with «Volver al terminal ⌘⇧E»;
  pressing it shall bring the terminal back with its focus.
  Proof: src/renderer/flow/boxes.test.ts the code can be seen large in the centre
- **F40** Trabajo → Ampliar código (⌘⇧E) shall open the current box's code as F39 and, pressed again, close it;
  Escape in the large view shall close it and not reach the terminal; the menu item shall be disabled unless Trabajo
  shows «Uno» with a workspace selected.
  Proof: src/renderer/flow/boxes.test.ts the large code opens and closes from the menu and the keyboard

### Subagents as branches (subagent-branches, 11 nov 2026)

- **F41** Each time the pointer enters a branch or the branch takes focus (both together counting as one entry), the panel shall ask that subagent's log
  once and show its last non-empty line without its F28 prefix (`⏺ `, `⎿ `, `> `), or «Pensando…» for a thinking
  line, in place of the description until the pointer leaves or focus moves; an answer arriving after that is
  ignored; an empty log keeps the description.
  Proof: src/renderer/flow/subagents.test.ts a branch shows what its subagent did last

### Faster panel (fast-panel, 11 nov 2026)

- **F42** When `boxDiff` is asked for a file of a box closed by a commit and the plan key is unchanged since the last `boxRanges`, the flow shall run exactly two git commands: one reading `HEAD` and the file's diff over that range — no `log`, `show` or listing.
  Proof: src/main/flow/boxes.test.ts a closed box's diff costs two git commands once planned
- **F43** When `boxRanges` is asked again with the plan key unchanged, the flow shall run no `git log`, no `git show` and no listing of a range closed by a commit; the whole branch and every range without a commit are listed again, so an uncommitted edit shows on the next read.
  Proof: src/main/flow/boxes.test.ts a second read with nothing new reuses the closed ranges
  Proof: src/main/flow/boxes.test.ts an uncommitted edit shows on the next read
- **F44** When `HEAD`, the base commit, or the checklist file's path, mtime or size changes, the next `boxRanges` or `boxDiff` shall plan again; closing or forgetting a workspace drops its cached plans.
  Proof: src/main/flow/boxes.test.ts a new commit or checklist edit plans again

### Diff without header (diff-header, 11 nov 2026)

- **F45** The diff shown for a box's file, small or large, shall leave out git's header lines — `diff --git`, `index`, `new file mode`, `deleted file mode`, `similarity`, `rename from`/`rename to`, `---` and `+++` before the first `@@` — and keep every `@@`, added, removed and context line in order, coloured as added or removed even when it starts with `---` or `+++`; a diff with no hunk (a pure rename, a mode change, a binary file) keeps its informative lines.
  Proof: src/renderer/flow/difftext.test.ts a box diff starts at its first hunk

### Quiet panel (quiet-panel, 11 nov 2026)

- **F46** While no counted path (see the Decision log's rule) of the workspace has changed since the version read at the start of the last `boxRanges` answer for the same folder, base and change, and that answer is under 30 s old by the module's clock, `boxRanges` shall return that answer running no process.
  Proof: src/main/flow/quiet.test.ts nothing changed costs no process
  Proof: src/main/flow/quiet.test.ts an answer older than thirty seconds is computed again
- **F47** When a file of the workspace is written or a commit is made, a `boxRanges` asked one second later or more shall compute again and show it.
  Proof: src/main/flow/quiet.test.ts an edit or a commit is seen on the next read
- **F48** At most twelve workspaces shall have a watcher open; opening a thirteenth closes the least recently asked; closing or forgetting a workspace shall close its watcher and drop its saved answer.
  Proof: src/main/flow/quiet.test.ts watchers are bounded and close with their work
### Panel never blank (flow-empty, 11 nov 2026)

- **F49** While a workspace is selected and its flow has not answered yet, the Libretto tab shall show «Leyendo el flujo de este trabajo…».
  Proof: src/renderer/flow/flowempty.test.ts the panel says it is reading
- **F50** While the stage is `entrada`, `spec` or `plan`, or it is `construir` with no boxes, the Libretto tab shall show, under the change line, «Aún no hay casillas: salen cuando el plan tenga su checklist.»; at `entrada` with no change it shall say «Este trabajo aún no tiene cambio de Libretto: lo crea el primer paso.»; and when main answers no flow at all (a review session) and there are no subagents, «Este trabajo no sigue el flujo de Libretto.».
  Proof: src/renderer/flow/flowempty.test.ts before the checklist the panel says why there are no boxes
