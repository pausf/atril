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

- F27 sigue igual salvo que cada fila es ahora un botón (assumed).
- Sondeo de 1 s solo con el modal abierto y el subagente sin `endedAt` (assumed).

## Task breakdown

- La fila de F27 como botón.
- El modal: cabecera (descripción o tipo, tipo · estado · duración, Cerrar), cuerpo terminal.

## Verification criteria

- **F28** When a subagent row in the flow panel is pressed, the panel shall open a modal titled with its
  description (or its type), showing its type and «trabajando · {d}» or «terminado · {d}», and its log
  as monospace text: `> ` before the prompt, `⏺ ` before text and tool lines, `⎿ ` before the first
  result line, «✻ Pensando…» for thinking, and «Sin registro de este subagente» when the log is empty;
  while the subagent has no `endedAt` the panel shall ask for the log again every second; Escape or
  «Cerrar» shall close it and return focus to the row.
  Proof: src/renderer/flow/subagents.test.ts a subagent opens as a terminal
