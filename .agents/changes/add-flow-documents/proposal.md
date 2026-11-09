Tracker: none
Targets: flow-status
Durable decisions: the ones in Prior decisions below

# add-flow-documents

## The ask, verbatim

Pau, 9 nov 2026:

> O es la spec o es el plan, si tú le das al libreto y le das encima del spec o del plan, que puedas ver lo que ha escrito la IA, ¿sabes? O si, por ejemplo, el plan lo ves bien y puedas modificarlo antes de que tire al siguiente, cosas de esas, ¿sabes?

## The reading

Not a bug; new work. In the Libretto panel, clicking a stage (spec, plan, checklist) opens what
the agent wrote — the change's `proposal.md` sections (contract, `## Approach`, `## Checklist`)
and any `spec-*.md` beside it — read from that workspace's worktree, which the panel already
watches. Editing is allowed while the agent waits for the person (needs-you), which is when
Libretto stops before code: the person changes the document, saves, and the agent reads the
saved file when it continues. While the agent is working the document is read-only, so the
two never write the same file at once.

## Decision log

### Session 2026-11-09
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
- Q: (Pau) «no me sterminal de convencer no cabe todo en el la parte de la terminal, yo pensaba mas como un modal» → A: un modal grande (94 % del ancho, 88 % del alto), oscuro, por encima de la app: título de la etapa, el cambio, pestañas por archivo y Cerrar; dentro el mismo editor (esquema, números de línea, colores, barra de estado, ⌘S); Esc o Cerrar salen y, con cambios sin guardar, preguntan antes. La terminal no se toca.

## Outcomes

- In the Libretto panel, **Spec**, **Plan** and the **Checklist** are buttons once their stage is
  reached; each opens a **large modal over the app** with the change's files as tabs and an
  editor — line numbers, markdown colours, an outline of the sections — at that section,
  following the file live. The terminal stays as it is underneath.
- While the agent waits for the person or has stopped, the person types straight into the
  editor; **⌘S** (or Guardar in the status bar) saves; a tab with unsaved changes shows a dot.
  While the agent works the editor is read-only and says so. The saved file is what Libretto
  reads from disk at its next step; nothing else tells the agent.

## Scope boundaries

**In:** the document view, live reading, editing and saving `proposal.md` and `spec-*.md` of the
workspace's current change. **Out:** other changes' folders, the capability specs under
`.agents/specs/`, creating or deleting files, telling the agent what changed (the person replies
in the terminal), rich-text editing, a diff of the person's edit.

**Never scoped out:** main refuses a save while the agent is working, for any name that is not
`proposal.md` or `spec-<name>.md` directly in the current change folder, and when the file changed
on disk since it was read — and writes atomically, so a crash never leaves half a file; the file's
text is never rendered as HTML; the view is keyboard-operable (Escape closes, the buttons are
native).

## Constraints

- The current change and its folder come from `stageOf` (F12's most recent change).
- The agent state comes from main's status tracker (W14–W16, W26).
- No new dependency.

## Prior decisions

- **See and correct what the agent wrote** — Pau, 9 nov: «si tú le das al libreto y le das encima
  del spec o del plan, que puedas ver lo que ha escrito la IA … el plan lo ves bien y puedas
  modificarlo antes de que tire al siguiente» → «dale» to: read live, edit only while it waits.
- **Edit only while the agent waits** (assumed): the agent and the person never write one file
  at once; the mtime check catches the rest.

## Task breakdown

- Main: read the current change's documents; save with the three refusals and an atomic write.
- Renderer: stage buttons, the document view with tabs per file, the minimal markdown reader,
  edit mode.

## Verification criteria

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

## Approach

### Summary

`src/main/flow/document.ts` exposes `readDocs(ws)` → `{ change, files: [{ name, text, mtimeMs }] }`
for the current change, and `saveDoc(ws, state, change, name, text, mtimeMs)` with the three
refusals and a temp-file + rename write. Two IPC handlers wire them (`atril:flow:docs`,
`atril:flow:save`); the second reads the state fresh with `agentState(ws)` just before saving.
The watcher's change key becomes the stage plus the change folder's newest mtime
(`lastModified`, already in `stage.ts`), so it emits on every write, not only on a new stage;
`FlowStage` itself does not change shape. The renderer's `LibrettoFlow`
turns Spec, Plan and Checklist into buttons that open `DocModal` (file tabs, Cerrar) over the
app; inside it `DocEditor` is a `<textarea>` over a coloured `<pre>` (the standard overlay:
same font, same scroll), with a line-number gutter, an outline of `##`/`###` headings and a status
bar; it re-reads on `flow.onChange` while it has no unsaved changes.

### Technical context

TypeScript, Electron, React 19, vitest (+jsdom). Files: `src/main/flow/document.ts` (+test),
`src/main/index.ts` (two handlers), `src/preload/{api,index}.ts`, `src/renderer/flow/{FlowPanel,
DocEditor,highlight}.tsx`, `src/renderer/flow/DocModal.tsx`, `src/renderer/mockApi.ts`, `styles.css`, test
`src/renderer/flow/documents.test.ts`, the sketch `bocetos/fase1-nucleo.html`. Gates: typecheck,
lint, test. No new dependency.

### The approach

- Sections: split on level-2 headings outside code fences (`^##\s+(\S.*)$`): `Spec` = everything
  before `Approach`; `Plan` = the `Approach` section; `Checklist` = the `Checklist` section. Which
  stage is a button comes from the stage (F1–F5), not from the text.
- Name check: `/^(proposal|spec-[a-z0-9-]+)\.md$/` and the resolved path's parent equals the
  change folder.
- Atomic write: `writeFile(.<name>.atril-tmp)` in the same folder, then `rename` (same device, so
  atomic). Ceiling named: a crash between the two leaves the hidden temp file, which only nudges
  F12's "most recent change" until the next save removes it.
- Live: `DocumentView` re-reads docs whenever `flow.onChange` fires for its workspace — which now
  happens on every write thanks to `updatedAt`; while editing it does not replace the person's
  text.
- Wiring: the two handlers live in `src/main/index.ts` (workspaces' territory, as `atril:flow:get`
  already does); their behaviour is flow-status's and proven by F16's test against `saveDoc`.
- Colouring: line-based spans over the raw text — headings, list markers, boxes, fenced code,
  `**bold**`, `` `code` ``, `Proof:` lines — each a React text node; no wrapping, so the gutter
  always matches (horizontal scroll, as in an editor).
- Modal: the same `modal` + focus-trap pattern as the Start dialog, sized 94vw × 88vh; the
  terminal underneath is untouched; Escape with unsaved changes asks «Tienes cambios sin guardar.
  ¿Cerrar y descartarlos?».

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| A markdown library (react-markdown, marked) | a new dependency for five constructs; marked returns HTML that would need sanitising |
| A code editor component (CodeMirror, Monaco) | the right tool for a big editor, but hundreds of KB for markdown colouring; the overlay does it in one file — revisit if Pau wants search, multi-cursor or folding |
| A read view plus an Editar button | Pau: «que sea visualmente mas como un editor para poder editar» |
| Tabs in the centre next to the terminal (sketched, also full width) | Pau: «no cabe todo en … la parte de la terminal, yo pensaba mas como un modal» |
| Editing only the section you read | splicing a section back into the file is where edits get lost; the whole file is honest |
| Locking the file while the person edits | the agent does not know about the lock; the state gate plus the mtime check cover it |
| Edit any time, last writer wins | the agent's next write silently erases the person's correction |

### Risks

| Risk | What catches it |
|---|---|
| The agent starts writing between Editar and Guardar | the fresh state read and the mtime check refuse the save (F16) |
| A needs-you from a mid-turn permission prompt allows an edit the agent never re-reads | accepted: the edit is on disk for Libretto's next read; the person can say so in the terminal |
| A crafted name escapes the folder (`../`, absolute) | the name pattern plus the parent-folder check (F16 proof uses both) |
| A huge file freezes the view | ceiling named: no cap; Libretto documents are a few hundred lines |

### Validation and rollback

F13–F17 seen red before the code; F16 forced red once with each refusal disabled. Rollback: one
revert.

### Complexity deliberately kept

- The mtime round-trip on save: it is what makes "edit while it waits" safe when the agent wakes
  up early.

## Checklist

- [ ] flow documents: main reads and saves the current change's files safely, the panel opens them by stage, live, with edit while the agent waits, the sketch · Closes: F13, F14, F15, F16, F17
