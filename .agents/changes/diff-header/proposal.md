# diff-header

Tracker: none
Targets: flow-status
Durable decisions: none

## The ask, verbatim

> Sigue automejorándote y todo eso.

Hallazgo 14 de `bocetos/hallazgos.md`: el diff de una casilla enseña la cabecera cruda de git (`diff --git`, `index 20b6a78..e96aa5a 100644`, `---`/`+++`), 4 de las ~11 líneas visibles, cuando el nombre del archivo ya está encima.

## Decision log

### Session 2026-11-11
- Q: ¿También en «Ampliar»? → A: sí: allí el archivo también se nombra encima (assumed).
- Q: ¿Y el corte por la derecha? → A: ya hay desplazamiento horizontal (`overflow: auto`); macOS oculta la barra hasta usarla. No se toca (assumed).

## Outcomes

- El código de una casilla empieza en su primer `@@`: todas las líneas visibles son código.

## Scope boundaries

**In:** `src/renderer/flow/DiffText.tsx`. **Out:** resaltado de sintaxis; ajustar líneas largas.

## Constraints

- El diff sigue siendo texto, nunca marcado (F37).

## Prior decisions

- Ninguna nueva.

## Verification criteria

- **F45** The diff shown for a box's file, small or large, shall leave out git's header lines — `diff --git`, `index`, `new file mode`, `deleted file mode`, `similarity`, `rename from`/`rename to`, `---` and `+++` before the first `@@` — and keep every `@@`, added, removed and context line in order, coloured as added or removed even when it starts with `---` or `+++`; a diff with no hunk (a pure rename, a mode change, a binary file) keeps its informative lines.
  Proof: src/renderer/flow/difftext.test.ts a box diff starts at its first hunk

## Approach

### Summary

`diffLines` descarta las líneas de cabecera hasta el primer `@@` (después, una línea que empieza por `---` es código borrado).

### Technical context

Un archivo y un test nuevo con `renderToStaticMarkup`.

### The approach

Recorre las líneas; mientras no haya salido un `@@`, salta las de cabecera.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Quitarlas en main | el mismo texto lo usan otros (borradores, copia); es una decisión de cómo se ve |

### Risks

| Risk | Mitigation |
|---|---|
| Una línea de código `--- x` borrada | solo se saltan cabeceras antes del primer `@@` |

### Validation and rollback

Test rojo primero; foto del panel. Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] la cabecera fuera, el código intacto · Closes: F45
