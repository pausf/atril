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

### Detalle del subagente (add-subagent-detail, 10 nov 2026)

Cada subagente del panel se pulsa y abre su registro como una terminal de solo lectura, en vivo
mientras trabaja.

### Panel sin scroll (fit-flow-panel, 10 nov 2026)

- Las seis etapas ocupan una sola fila: iconos unidos por una línea; la actual lleva su nombre debajo;
  las demás lo dicen al pasar el ratón y a un lector de pantalla. Spec, Plan y Construir siguen
  abriendo lo suyo como hoy (F13, F20).
- Checklist, Cambios, Otros cambios y Subagentes se pliegan pulsando su título, con su cuenta a la
  vista; Atril recuerda cómo los dejaste; Otros cambios empieza plegado.
- Cambios enseña como mucho 8 archivos; con más, «+N más» abre el diff del noveno.
- Un trabajo normal (3/7, 12 archivos, 3 subagentes) cabe en el panel sin scroll en una ventana de
  900 px de alto, la de Pau (sus capturas: 2880×1768 a 2x).

## Scope boundaries

**In:** reading `.agents/changes/*/` in a workspace and deriving the stage.

**Out:** writing any Libretto file; running `libretto`; stages the files cannot show.
`review-work` and `present-work` leave nothing on disk that tells them apart from building,
so they are **not** shown as their own stages in this phase — the boceto's eight dots
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

### Detalle del subagente (add-subagent-detail, 10 nov 2026)

**In:** la fila como botón, el modal, el refresco, el estilo terminal. **Out:** escribir al
subagente, pararlo, buscar en el registro, colores por herramienta.

**Never scoped out:** teclado (foco, Tab dentro, Esc), el contenido como texto.

### Panel sin scroll (fit-flow-panel, 10 nov 2026)

**In:** la fila de etapas, las cuatro secciones plegables, el tope de Cambios, quitar la frase de cabecera.

**Out:** los diseños Zen, Partitura, Río, Programa y Esfera (quedan en `bocetos/fase2-nucleo.html`); un
ajuste para elegir diseño; la pestaña Actividad; el modal del subagente.

**Never scoped out:** cada etapa conserva su nombre y su estado como texto accesible (W22); las secciones
se pliegan con teclado; nada que hoy se pueda abrir deja de poderse abrir: como mucho queda a un clic
(desplegar su sección).

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

### Detalle del subagente (add-subagent-detail, 10 nov 2026)

Reutiliza `useModalKeys` y las clases `modal`/`dlg edmodal`; monoespaciado con los tokens de la terminal.

### Panel sin scroll (fit-flow-panel, 10 nov 2026)

- `FoldSection` y `useFolded` existentes; ids de sección estables para recordar el estado.
- Textos por `t()` con su inglés; colores solo como tokens.
- `a11y.test.ts` ya exige que cada `.stg` lleve hecho/ahora/pendiente como texto.

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
- Q: (propuesta) ver y editar spec y plan desde el panel; editar solo mientras el agente espera → A: «dale».
- Q: «No le preguntes, tú sigue» stands → the rest taken with the recommended option, marked (assumed).
- Q: ¿Qué se ve al pulsar cada etapa? → A: Spec = `proposal.md` desde arriba hasta `## Approach` más cada `spec-*.md`; Plan = `## Approach`; Checklist = `## Checklist`; una etapa sin nada escrito no se puede pulsar (assumed).
- Q: ¿Qué se edita? → A: el archivo entero de la pestaña que miras (`proposal.md` o un `spec-*.md`), como texto; leer es por secciones, editar es el archivo (assumed).
- Q: ¿Cuándo se puede editar? → A: con el agente en «te necesita» o parado; trabajando, no. Lo comprueba main al guardar, no solo la ventana (assumed).
- Q: ¿Y si Claude cambia el archivo mientras lo editas? → A: no se guarda nada y se avisa «Claude ha cambiado el archivo mientras editabas: vuelve a abrirlo» (assumed).
- Q: ¿Markdown con librería? → A: no: un lector mínimo (títulos, listas, casillas, bloques de código, negrita) que solo produce texto de React, nunca HTML (assumed).

- Q: (spec-reviewer) el aviso en vivo solo salta si cambia la etapa → A: la clave del watcher suma la última modificación de la carpeta del cambio, así cualquier escritura avisa; mismo límite de 1 s que F8 (assumed).
- Q: (spec-reviewer) ¿Qué estado decide si se puede guardar? → A: uno recién leído en main al guardar (`agentState`), no el último sondeo; en la ventana, Editar solo se desactiva si el estado conocido es «trabajando» (assumed).
- Q: (spec-reviewer) ¿Y un «te necesita» por un permiso a mitad de turno? → A: se acepta: se puede editar; lo que Claude escriba después lo protege la comprobación de mtime, y el agente relee el archivo cuando Libretto lo necesita o cuando se lo pides en la terminal (assumed).
- Q: (spec-reviewer) ¿Qué decide si una etapa es botón? → A: la etapa de F1–F5: Spec desde que la etapa es Spec o posterior, Plan desde Plan, Checklist cuando hay checklist; las secciones se cortan con las mismas reglas que `stage.ts` (títulos `^##\s+…\b`, sin contar los de dentro de un bloque de código) (assumed).
- Q: (spec-reviewer) ¿Qué dice cada rechazo y qué pasa con tu texto? → A: «Claude está escribiendo: no se ha guardado», «Ese archivo no se puede editar desde Atril», «Claude ha cambiado el archivo mientras editabas: copia tu texto y vuelve a abrirlo»; tu texto se queda en el editor (assumed).
- Q: (spec-reviewer) ¿En qué cambio se guarda? → A: en el que se leyó: el guardado lleva el nombre del cambio, validado (`^[a-z0-9-]+$`, carpeta existente) (assumed).

- Q: (Pau, tras el boceto) «lo de espec y plan que sea visualmente mas omo un editor para poder editar etc...» → A: pestañas en la zona central junto a la terminal, un editor con números de línea, colores de markdown y esquema de secciones; se escribe directamente (sin botón Editar), solo lectura mientras Claude trabaja, ⌘S guarda, punto en la pestaña con cambios sin guardar; boceto en `fase1-nucleo.html?doc=plan`.
- Q: (Pau) «que se vea mas grande ahora mismo todo se ve minuculo lo de spec y plan» → A: al abrir un documento el editor ocupa todo el ancho (se ocultan la barra lateral y el panel de Libretto; «⤡ Salir de pantalla completa» o Esc vuelven), letra de 15 px.
- Q: (Pau) «si la spec y plan no nos gusta como lo hacemos ya que pasa directamente a construir» → A: no pasa directo: Libretto se para antes de código con una pregunta; pero el hook marcaba esa pregunta como «trabajando» y Atril la escondía; se arregla en `spec-workspaces.md` (W44).
- Q: (Pau) «no me sterminal de convencer no cabe todo en el la parte de la terminal, yo pensaba mas como un modal» → A: un modal grande (94 % del ancho, 88 % del alto), oscuro, por encima de la app: título de la etapa, el cambio, pestañas por archivo y Cerrar; dentro el mismo editor (esquema, números de línea, colores, barra de estado, ⌘S); Esc o Cerrar salen y, con cambios sin guardar, preguntan antes. La terminal no se toca.

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

### Large branches (add-split-large-branch, 9 nov 2026)

- **400 lines** (proposal.md).

### Detalle del subagente (add-subagent-detail, 10 nov 2026)

- F27 cambia solo en que cada fila es un botón: va como `(amended)` (assumed).
- Al llegar `endedAt` se pide el registro una última vez; si la entrada desaparece (W64), el modal se cierra; un subagente sin archivo todavía dice «Sin registro de este subagente» igual que uno sin ruta (assumed).
- Sondeo de 1 s solo con el modal abierto y el subagente sin `endedAt` (assumed).

### Panel sin scroll (fit-flow-panel, 10 nov 2026)

- Diseño 0 elegido por Pau entre seis en `bocetos/fase2-nucleo.html` (10 nov).
- Una sola vista, sin ajuste para cambiarla: Pau, «probar en el boceto», y luego eligió el 0 (10 nov).
- 8 archivos como tope de Cambios (assumed, 10 nov): con más, el diff modal ya lista todos.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Diseños 1–5 de `fase2-nucleo.html` | Pau eligió el 0. |
| Un componente `Stepper` aparte | Lo usaría una sola vista; es CSS sobre lo que ya hay. |
| Scroll interno solo en Cambios | Sigue escondiendo cosas; el tope con «+N más» lo dice. |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Qué diseño? → A: «nada queda con el 0 · Acordado es el que me gusta … implementa con ese».
- Q: ¿La frase «Dónde va cada trabajo, leído de sus archivos.»? → A: se va: el panel lo dice por sí
  mismo y son dos líneas (assumed).
- Q: ¿Cuenta de cada sección plegada? → A: Checklist «3/7», Cambios y Otros cambios su número,
  Subagentes su número de entradas (assumed).
- Q: ¿Qué abre «+N más»? → A: el modal del diff en el noveno archivo, con todos en su lista (assumed).
- Q: (fase 5) ¿Cómo? → A: reutilizar `FoldSection` (ya recuerda su estado) y CSS para la fila de
  etapas; sin componentes nuevos salvo los que salgan solos (assumed). Perdió: un componente de
  «stepper» genérico (una sola vista lo usa).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - F20 se enmienda: Cambios lista según F31 y el total suma todos los archivos.
  - Construir hecho botón lleva como texto «Construir · ver N archivos», en lugar de su estado.
  - La cuenta del Checklist es una cadena nueva, «{closed}/{total}», y `FoldSection.count` acepta texto.
  - Checklist, Cambios y Subagentes empiezan abiertos.
  - «Recordado» se prueba desmontando y volviendo a montar.
  - Lo plegado queda a un clic: abrir la sección.
  - La frase de cabecera desaparece (F29).
  - Que no haga falta scroll no lo puede probar jsdom: se ve en la foto, y está nombrado como techo.

- Q: (foto) A 900 px Subagentes quedaba cortado → A: filas de Cambios en una línea, «Leído de» al
  `title` de «Ver checklist», que pasa a enlace junto a Siguiente; objetivo 900 px, no 1080 (assumed).

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

- **F13** When the person clicks Spec, Plan or Checklist in the Libretto panel, Atril shall open
  a modal over the app with the current change's `proposal.md` (and, for Spec, one more file tab per
  `spec-*.md`), with the cursor at that part's heading — Spec: the first level-2 heading; Plan:
  `## Approach`; Checklist: `## Checklist`, found outside code fences as in F1–F7 — and each shall
  be a button only from its stage on: Spec from Spec, Plan from Plan, Checklist once a checklist
  exists; Escape or Cerrar shall close it, asking first when there are unsaved changes.
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
- **F20** While the stage is Construir, Terminado or Aterrizado and the list is not empty, the
  Libretto panel shall show «Cambios» with its files' status and +/− counts as F31 lists them, the
  total of added plus removed lines over every file, and Construir as a button reading «ver N
  archivos»; at earlier stages Construir shall not be a button and no «Cambios» section shall appear.
  Proof: src/renderer/flow/changes.test.ts changes show from construir on
- **F21** When the person clicks Construir or a file in Cambios, Atril shall open a read-only modal
  with the changed files listed and the chosen file's diff — a snapshot with its time and an
  «Actualizar» button — its added and removed lines marked as such and rendered as text only;
  Escape shall close it.
  Proof: src/renderer/flow/changes.test.ts a file opens its diff
- **F22** While the stage is Construir or later, Atril shall ask for the list again every 3 seconds,
  skipping a tick while the previous request has not answered.
  Proof: src/renderer/flow/changes.test.ts the list refreshes while claude works

### Large branches (add-split-large-branch, 9 nov 2026)

- **F25** While the change list totals more than the hook's threshold (400), «Cambios» shall show,
  in place of the plain total, a warning element (class `fbig`) reading «⚠ N líneas: rama grande
  (más de 400). Atril le ha pedido a Claude que te proponga separarla en MRs más pequeñas.»
  Proof: src/renderer/flow/changes.test.ts a large branch warns in cambios

### Automatic or manual mode (add-auto-mode, 9 nov 2026)

- **F26** In an automatic workspace, Spec, Plan and Checklist shall open read-only whatever the
  agent's state (an exception to F15; the diff modals already are), with the status bar «solo lectura ·
  modo automático» in place of F15's.
  Proof: src/renderer/flow/documents.test.ts automatic documents are read-only

### Subagentes (add-subagents-view, 10 nov 2026)

- **F27** While the selected workspace has subagent entries, the flow panel shall show a
  «Subagentes» section, newest `startedAt` first, each as a button labelled with: its description (or
  its type when it has none), its type when a description is shown, and «trabajando · {d}» (now −
  startedAt, refreshed every second while any runs) or «terminado · {d}» (endedAt − startedAt), where
  {d} is «45 s» under a minute and «1 min 20 s» from there.
  Proof: src/renderer/flow/subagents.test.ts subagents show in the panel

### Detalle del subagente (add-subagent-detail, 10 nov 2026)

- **F28** When a subagent row in the flow panel is pressed, the panel shall open a modal titled with its
  description (or its type), showing its type and «trabajando · {d}» or «terminado · {d}», and its log
  as monospace text: `> ` before the prompt, `⏺ ` before text and tool lines, `⎿ ` before the first
  result line, «✻ Pensando…» for thinking, and «Sin registro de este subagente» when the log is empty; continuation lines of a
  line carry no prefix; while the subagent has no `endedAt` the panel shall ask for the log again every
  second, and once more when `endedAt` arrives, then stop; when the entry leaves the list the modal shall
  close; Escape or «Cerrar» shall close it and return focus to the row. The proof drives the polling with
  fake timers.
  Proof: src/renderer/flow/subagents.test.ts a subagent opens as a terminal

### Panel sin scroll (fit-flow-panel, 10 nov 2026)

- **F29** The Libretto panel shall show its six stages in one row, each with its icon and, as its text,
  its name and its state («hecho», «ahora» or «pendiente»), where only the current stage's name is
  visible and the others' text is visually hidden — except Construir while F20 makes it a button, whose
  text is «Construir · ver {n} archivos»; the stages F13 and F20 make buttons stay buttons with the same
  actions; no lead sentence shall sit above the stages. Ceiling: the single row is layout, seen on the
  photo, not in jsdom.
  Proof: src/renderer/flow/panel.test.ts stages sit in one row and keep their names
- **F30** Checklist, Cambios and Subagentes shall each be a section whose title is a button with
  `aria-expanded` that folds and unfolds it, showing its count while folded — Checklist «{closed}/{total}», Cambios
  its number, Subagentes its number of entries — and keeping its folded state per section when the panel is mounted
  again; all three shall start open. One test holds a case per clause.
  Proof: src/renderer/flow/panel.test.ts the panel sections fold and remember
- **F31** While the change list holds more than 8 files, «Cambios» shall list the first 8 in list order
  and a «+{n} más» button that opens F21's modal on the ninth file; the line total (F20, F25) shall
  still add up every file.
  Proof: src/renderer/flow/changes.test.ts cambios shows eight and opens the rest

### Documentos a la vista (show-doc-buttons, 10 nov 2026)

- **F32** Beside the change's name, the Libretto panel shall show a «Spec» and a «Plan» button,
  named «Abrir Spec» and «Abrir Plan», each only from the stage F13 makes it a button on, opening the
  same document as that stage; the stages that are buttons shall wear the action colour on their ring.
  Proof: src/renderer/flow/panel.test.ts the documents read as buttons next to the change

### QA en vivo (add-qa-lab, 10 nov 2026)

- **F33** While the selected workspace is classified (W83), the Libretto panel shall show a «QA» section
  with «Probar en vivo», or «Detener QA» while its QA pane lives, and its screenshots newest first —
  asked from main as `qa.status(id)` every 3 seconds while the section shows, received as data URLs (the
  12 newest, each at most 2 MB) — each opening large on press; for an unclassified workspace no section
  shall show. One test holds a case per clause.
  Proof: src/renderer/flow/qa.test.ts the qa section shows the button and the screenshots

### Coste por trabajo (cost-per-work, 10 nov 2026)

- **F34** The Libretto panel shall show no text with «$», «≈» or «tokens» for the selected workspace.
  Proof: src/renderer/flow/cost.test.ts the panel shows no cost
### Tarjeta de pregunta (ask-card, 10 nov 2026)

- **F35** While the flow state's `others` is not empty, the panel shall show «{n} cambios más en este repo» (n its
  length; «1 cambio más en este repo» for one) with a button «Ver en Libretto» that stores that workspace's repo as the Libretto repo (W104) and opens the
  Libretto screen, and no list of their names; with `others` empty, it shall show neither.
  Proof: src/renderer/flow/panel.test.ts other changes lead to Libretto
