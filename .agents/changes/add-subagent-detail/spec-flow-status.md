# add-subagent-detail · flow-status

Targets: flow-status

## Outcomes

Cada subagente del panel se pulsa y abre su registro como una terminal de solo lectura, en vivo
mientras trabaja.

## Scope boundaries

**In:** la fila como botón, el modal, el refresco, el estilo terminal. **Out:** escribir al
subagente, pararlo, buscar en el registro, colores por herramienta.

**Never scoped out:** teclado (foco, Tab dentro, Esc), el contenido como texto.

## Constraints

Reutiliza `useModalKeys` y las clases `modal`/`dlg edmodal`; monoespaciado con los tokens de la terminal.

## Prior decisions

- F27 cambia solo en que cada fila es un botón: va como `(amended)` (assumed).
- Al llegar `endedAt` se pide el registro una última vez; si la entrada desaparece (W64), el modal se cierra; un subagente sin archivo todavía dice «Sin registro de este subagente» igual que uno sin ruta (assumed).
- Sondeo de 1 s solo con el modal abierto y el subagente sin `endedAt` (assumed).

## Task breakdown

- La fila de F27 como botón.
- El modal: cabecera (descripción o tipo, tipo · estado · duración, Cerrar), cuerpo terminal.

## Verification criteria

- **F27** (amended) While the selected workspace has subagent entries, the flow panel shall show a
  «Subagentes» section, newest `startedAt` first, each as a button labelled with: its description (or
  its type when it has none), its type when a description is shown, and «trabajando · {d}» (now −
  startedAt, refreshed every second while any runs) or «terminado · {d}» (endedAt − startedAt), where
  {d} is «45 s» under a minute and «1 min 20 s» from there.
  Proof: src/renderer/flow/subagents.test.ts subagents show in the panel

- **F28** When a subagent row in the flow panel is pressed, the panel shall open a modal titled with its
  description (or its type), showing its type and «trabajando · {d}» or «terminado · {d}», and its log
  as monospace text: `> ` before the prompt, `⏺ ` before text and tool lines, `⎿ ` before the first
  result line, «✻ Pensando…» for thinking, and «Sin registro de este subagente» when the log is empty; continuation lines of a
  line carry no prefix; while the subagent has no `endedAt` the panel shall ask for the log again every
  second, and once more when `endedAt` arrives, then stop; when the entry leaves the list the modal shall
  close; Escape or «Cerrar» shall close it and return focus to the row. The proof drives the polling with
  fake timers.
  Proof: src/renderer/flow/subagents.test.ts a subagent opens as a terminal
