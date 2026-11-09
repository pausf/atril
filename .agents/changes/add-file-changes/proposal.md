Tracker: none
Targets: flow-status
Durable decisions: the ones in Prior decisions below

# add-file-changes

## The ask, verbatim

Pau, 9 nov 2026:

> tamoen molaria un seccion en flujo de libreto donde se pueda ver lo cambios de fichero ue se va haciendo sbes? ponlo en fase 1 para verlo

## The reading

Not a bug; new work. A «Cambios» section in the Libretto panel lists the files the workspace has
changed against its base commit (committed and uncommitted, as `git diff --numstat <base>` plus
untracked files), each with its status and +/− line counts, updated live while the agent works.
Clicking a file opens its diff, read-only, in the same large modal as the flow documents. Sketched
in `bocetos/fase1-nucleo.html`.

Pau, after the sketch: «los cambios se deberia ver en el momento de contruir no? y que se pueda
abrir en modal y ver los cambios» → the section shows from the Construir stage on, and
«Construir» itself becomes a button (like Spec and Plan) that opens the changes modal.

## Decision log

### Session 2026-11-09
- Q: (Pau) «los cambios se deberia ver en el momento de contruir no? y que se pueda abrir en modal y ver los cambios» → A: la lista sale desde Construir; «Construir» es un botón que abre el modal de cambios; boceto en `fase1-nucleo.html?diff=`.
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → the rest taken with the recommended option, marked (assumed).
- Q: ¿Contra qué se comparan los cambios? → A: contra el commit base del trabajo (el de W5), incluyendo lo commiteado, lo no commiteado y los archivos nuevos sin seguimiento que git no ignora (assumed).
- Q: ¿Cómo se actualiza en vivo? → A: la ventana vuelve a pedir la lista cada 3 s mientras el panel muestra Construir o después, y al cambiar la etapa; `git diff --numstat` es barato (assumed).
- Q: ¿Se puede pedir el diff de cualquier ruta? → A: no: main solo da el diff de un archivo que está en la lista de cambios de ese trabajo (assumed).
- Q: ¿Y un diff enorme o binario? → A: se corta en 1 MB con un aviso; un binario dice «Archivo binario» (assumed).

- Q: (spec-reviewer) ¿Renombrados, T y U? → A: `--no-renames`: un renombrado es D + A; T y U cuentan como M; rutas leídas con `-z` (assumed).
- Q: (spec-reviewer) ¿«Total» es líneas o archivos? → A: líneas añadidas + borradas («512 líneas»); el botón dice «ver N archivos» (assumed).
- Q: (spec-reviewer) ¿Desde qué etapa? → A: Construir, Terminado y Aterrizado; antes, Construir no es botón y no hay sección (assumed).
- Q: (spec-reviewer) ¿El modal se actualiza solo? → A: no: es una instantánea con su hora y un botón «Actualizar»; la lista del panel sí se refresca cada 3 s, sin pedir otra vez mientras una petición sigue en marcha (assumed).
- Q: (spec-reviewer) ¿Binario sin seguimiento? → A: un byte cero en los primeros 8000 bytes, la regla de git; cuenta 0 y 0 (assumed).

## Outcomes

- From the **Construir** stage on, the Libretto panel shows **Cambios**: every file the workspace
  changed against its base — committed, uncommitted and new — with its status (A, M, D) and its
  +/− lines, plus the total; it refreshes while Claude works.
- **Construir** becomes a button («Construir · ver N archivos») and each file in the list is a
  button; both open a read-only **diff modal**: the files on the left, the selected file's diff
  in green and red with line numbers, the counts in the status bar.

## Scope boundaries

**In:** the list, its live refresh, the diff modal. **Out:** staging, reverting or editing files
from Atril, comments on lines (phase 2's MR review), word-level diffs, renames shown as such
(a rename shows as D + A).

**Never scoped out:** main reads only paths that git lists as changed in that workspace; the diff
text is rendered as text, never markup; the modal holds the keyboard like the document modal.

## Constraints

- git only, through the runner (W-criteria); no new dependency.
- Reuses the document modal's look (F13–F17) and the workspace's `baseCommit` (W5).

## Prior decisions

- **See what Claude is changing** — Pau, 9 nov: «molaria un seccion en flujo de libreto donde se
  pueda ver lo cambios de fichero ue se va haciendo» and «se deberia ver en el momento de
  contruir … y que se pueda abrir en modal».
- **Polling, not a file watcher on the whole tree** (assumed): a recursive watcher over a
  worktree with `node_modules` costs more than a 3 s `git diff --numstat`.

## Task breakdown

- Main: the change list and a single file's diff, both bound to the workspace.
- Renderer: the Cambios section, the Construir button, the diff modal.

## Verification criteria

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
- **F20** While the stage is Construir, Terminado or Aterrizado and the list is not empty, the
  Libretto panel shall show «Cambios» with each file's status and +/− counts, the total of added
  plus removed lines, and Construir as a button reading «ver N archivos»; at earlier stages
  Construir shall not be a button and no «Cambios» section shall appear.
  Proof: src/renderer/flow/changes.test.ts changes show from construir on
- **F21** When the person clicks Construir or a file in Cambios, Atril shall open a read-only modal
  with the changed files listed and the chosen file's diff — a snapshot with its time and an
  «Actualizar» button — its added and removed lines marked as such and rendered as text only;
  Escape shall close it.
  Proof: src/renderer/flow/changes.test.ts a file opens its diff
- **F22** While the stage is Construir or later, Atril shall ask for the list again every 3 seconds,
  skipping a tick while the previous request has not answered.
  Proof: src/renderer/flow/changes.test.ts the list refreshes while claude works

## Approach

### Summary

`src/main/flow/changes.ts` exposes `listChanges(ws)` (numstat + name-status against
`baseCommit`, plus `ls-files --others --exclude-standard`) and `fileDiff(ws, path)` (refuses any
path not in `listChanges`; `git diff <base> -- <path>`, or `git diff --no-index /dev/null <path>`
for a new file; cut at 1 MB). Two IPC handlers (`atril:flow:changes`, `atril:flow:diff`). The
renderer's `FlowPanel` fetches the list when the stage is Construir or later and every 3 s while
mounted there; `DiffModal` reuses the document modal's frame and focus handling.

### Technical context

Files: `src/main/flow/changes.ts` (+test), `src/main/index.ts`, `src/preload/{api,index}.ts`,
`src/renderer/flow/{FlowPanel,DiffModal}.tsx`, `src/renderer/mockApi.ts`, `styles.css`, test
`src/renderer/flow/changes.test.ts`, the sketch. Gates: typecheck, lint, test.

### The approach

- numstat: `git -C <path> diff --no-renames -z --numstat <base>` → added/removed (`-` for binary →
  0/0); name-status: `git diff --no-renames -z --name-status <base>` → A/M/D, T and U as M;
  untracked: each `ls-files -z --others --exclude-standard` path is A with its line count, or 0/0
  when a NUL byte appears in its first 8000 bytes.
- Order: by path, with `.agents/` (Libretto's documents, which have their own buttons) last, so
  Construir opens code first (seen in the real app, 9 nov).
- `fileDiff`: tracked → `git diff --no-renames <base> -- <path>` (exit 0); new untracked →
  `git diff --no-index -- /dev/null <path>`, where exit 1 means "differences" and is success; any
  other exit is an empty diff. Ceiling named: the runner buffers the whole output before the 1 MB
  cut; a streaming read replaces it if a diff ever threatens memory.
- Diff colouring: `+` lines (not `+++`) added, `-` lines (not `---`) removed, `@@` hunk,
  headers dim — each a React text node.
- The modal frame (focus on mount, Tab trap, Escape) is shared with `DocModal` through a small
  `useModalKeys` hook, so both behave the same.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| A recursive `fs.watch` on the worktree | fires for `node_modules`, builds and caches; polling git is cheaper and exact |
| Letting the renderer pass any path to diff | main would read whatever the renderer names; the list is the boundary |
| A side-by-side diff | needs twice the width; unified is what `git diff` and review tools show |

### Risks

| Risk | What catches it |
|---|---|
| A huge untracked file (a dump) | line counting reads it once; the diff is cut at 1 MB (F19) |
| Polling a dead or deleted worktree | git fails, the list shows empty and stays quiet |

### Validation and rollback

F18–F22 seen red before the code. Rollback: one revert.

### Complexity deliberately kept

- `useModalKeys` shared by both modals: one focus behaviour instead of two that drift.

## Checklist

- [x] change list and diff in main, bound to the workspace's listed files · Closes: F18, F19, F23
- [x] the Cambios section, the Construir button, the diff modal and the 3 s refresh · waits on box 1 · Closes: F20, F21, F22
