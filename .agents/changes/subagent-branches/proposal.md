# subagent-branches

Tracker: none
Targets: flow-status
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> que hacemos con los sybagente que habias puesto en la derecha?

> puedes poner de los sugagente la 2 en panel derecho html?

## Reading

Los subagentes dejan de ser una sección aparte del panel y cuelgan, como ramas, de la casilla en curso (la 2 de
`bocetos/subagentes.html`), con su encargo y, al pasar el ratón, lo último que han hecho.

## Decision log

### Session 2026-11-11
- Q: ¿Dónde? → A: bajo la casilla en curso de la línea de tiempo (F38), antes de su código; una rama por subagente
  con su descripción (o su tipo), su tipo, un punto que late mientras trabaja o «✓» al terminar, y su duración; la
  sección «Subagentes» desaparece (assumed).
- Q: ¿Lo último que hizo? → A: al pasar el ratón o al llegar con el teclado, la descripción se cambia por la última
  línea de su registro (F28), pedida en ese momento; sin registro, se queda la descripción (assumed).
- Q: ¿Pulsar? → A: abre el modal de F28, igual que hoy (assumed).
- Q: ¿Sin casilla en curso (sin checklist o todo cerrado)? → A: las ramas cuelgan de la línea «Cambio: …» (assumed).

## Outcomes

- Se ve qué subagentes trabajan para la casilla que se está construyendo, qué hace cada uno y cuánto llevan, sin una
  sección aparte.

## Scope boundaries

**In:** las ramas bajo la casilla, la última acción al pasar el ratón, quitar la sección.
**Out:** asignar subagentes a casillas concretas (todos cuelgan de la en curso); cambiar el modal de F28.
**Never scoped out:** teclado (cada rama es un botón); textos por `t()`; tokens; el registro como texto.

## Prior decisions

- Todos los subagentes vivos cuelgan de la casilla en curso (assumed, 11 nov).
- Última acción solo al pasar el ratón o con el foco (assumed, 11 nov).

## Verification criteria

- **F27** (amended) While the selected workspace has subagent entries, the panel shall show them as branches under
  the current box of the timeline (F38) — or under the «Cambio» line when there is no current box — newest
  `startedAt` first, each a button labelled with its description (or its type), its type when a description is
  shown, a live dot while it runs or «✓» when it ended, and «{d}» (F27's durations, refreshed every second while
  any runs); no «Subagentes» section shall show. One test holds a case per clause.
  Proof: src/renderer/flow/subagents.test.ts subagents hang from the current box
- **F41** When the pointer rests on a branch or the branch takes focus, the panel shall ask that subagent's log once
  and show its last line in place of the description until the pointer leaves or focus moves; an empty log keeps
  the description.
  Proof: src/renderer/flow/subagents.test.ts a branch shows what its subagent did last
- **F30** (amended) The Libretto panel shall have no foldable sections.
  Proof: src/renderer/flow/panel.test.ts the panel sections fold and remember

## Approach

### Summary
`src/renderer/flow/Boxes.tsx` pinta las ramas bajo la casilla en curso con un componente `Branches.tsx`; el
`FlowPanel` deja de pintar la sección de subagentes. La última línea sale de `window.atril.subagents.log` (F28).

### Technical context
React 19, vitest. Datos: `subagents.get` (F27) y `subagents.log` (F28) ya existen. Referencia visual:
`bocetos/fase1-nucleo.html` (`.br`, `.s`, `.act`) y `bocetos/subagentes.html` (la 2).

### The approach
- `Branches` recibe las entradas y el id del trabajo; cada rama es un `<button>` que abre el modal de F28.
- `onMouseEnter`/`onFocus` piden el registro una vez y guardan su última línea; `onMouseLeave`/`onBlur` vuelven a la
  descripción.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| asignar cada subagente a su casilla | el hook no sabe para qué casilla trabaja |
| última acción siempre visible | sondear el registro de cada subagente cada segundo, para nada |

### Risks
| Risk | Mitigation |
|---|---|
| estilos globales pisan las ramas (como `.seg`/`.bar` en panel-c) | clases propias `.sbr-*`; la app real con Playwright antes de aterrizar |

### Validation and rollback
Gates; la app real manejada con Playwright con subagentes sembrados. Un revert.

### Complexity deliberately kept
Ninguna.

## Checklist

- [ ] the branches under the current box, the last action on hover and focus, the section removed; real-app drive; photo; novedades · Closes: F27, F41, F30
