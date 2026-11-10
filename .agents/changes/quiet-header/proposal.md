# quiet-header

Tracker: none
Targets: workspaces
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> el diseño de esto (shop-web · WEB-3535 · Uno · Todos · Modo foco ⌘⇧F · trabajando) es raro , ≈ 4,87 $ · 2,1 M tokens · estimado a precio de API esto no me interesa

## Reading

Una cabecera de trabajo más tranquila (estado junto a la rama, un solo grupo de controles a la derecha) y ningún
coste a la vista en Atril.

## Decision log

### Session 2026-11-11
- Q: ¿Cómo queda la cabecera? → A: la del boceto 10: arriba pequeño «{repo} · {agente}»; debajo la rama y, a su lado,
  el estado como texto con su icono (el mismo de la fila, sin pastilla); a la derecha, juntos y centrados, «Uno |
  Todos» y un botón redondo solo con icono «Modo foco» (título «Modo foco (⌘⇧F)») que hace lo mismo que el menú (assumed).
- Q: ¿Coste? → A: fuera de la vista en todas partes: fila (título), tarjeta de «Todos», panel de Libretto y
  «Terminados». El cálculo de main (W93) y el total en el historial (W95) se quedan: no se ven y no cuestan una
  llamada (assumed). Ceiling: si nadie lo pide en un mes, borrar W93 y `cost.ts`.

### Session 2026-11-11 (revisión en frío)
- Q: ¿Qué estado y de dónde? → A: el mismo texto e icono que la fila de la lista (`LABEL[state]` de
  `WorkspaceList`), solo en «Uno». En «Todos» la cabecera dice «Todos los agentes» y no hay estado único (assumed).
- Q: ¿El botón en «Todos»? → A: no sale; en «Uno» sale siempre, y sin trabajo elegido está desactivado como el menú
  (assumed).
- Q: ¿Nombre al estar en foco? → A: siempre «Modo foco», con `aria-pressed` verdadero mientras está activo (assumed).
- Q: ¿Tests de coste? → A: los casos se renombran a lo que prueban ahora y el `Proof:` los nombra; cada vista se
  prueba aparte, buscando que no haya «$», «≈» ni «tokens» (assumed). `cost.ts` del renderer se borra si nada fuera de
  sus tests lo usa (assumed).
- Q: ¿El historial dice «Coste: la forma corta de W94»? → A: queda superado por W96 enmendado; el total sigue en el
  archivo (W95) sin enseñarse (assumed).

## Outcomes

- La cabecera de un trabajo se lee de un vistazo y Atril no enseña dinero ni tokens.

## Scope boundaries

**In:** la cabecera en Uno y en Todos, quitar el coste de las cuatro vistas.
**Out:** borrar el cálculo de coste; cambiar el menú o el atajo del foco.
**Never scoped out:** teclado y nombre accesible del botón de icono; textos por `t()`; tokens de color.

## Prior decisions

- Coste oculto, cálculo conservado (assumed, 11 nov).
- Foco también como botón de icono en la cabecera (assumed, 11 nov).

## Verification criteria

- **W112** While «Uno» shows a workspace, the work header shall show «{repo} · {agent}» above the branch, beside the
  branch the same state label and icon as its row in the list (no pill), and to the right one group with the
  Uno/Todos switch and an icon button named «Modo foco», titled «Modo foco (⌘⇧F)», `aria-pressed` while focus is on,
  that turns focus on and off as the menu item does (W77), disabled while no workspace is selected; «Todos» shall not
  show that button. One test holds a case per clause.
  Proof: src/renderer/focus.test.ts the work header shows the state and a focus button
- **W94** (amended) A workspace's row title and its «Todos» card shall show no text with «$», «≈» or «tokens».
  Proof: src/renderer/cost.test.ts no workspace shows a cost
- **W96** (amended) While history has lines, Trabajo shall show a «Terminados» section, folded by default (W28),
  its count the number of lines, with the 20 newest, each with its branch, repo, stage, «duró» as «< 1 min» /
  «{m} min» / «{h} h {m} min» / «{d} d {h} h» when `createdAt` is known, no text with «$», «≈» or «tokens», and «hoy»
  or «hace {n} d» by calendar day; it shall update when main pushes a new line. One test holds a case per clause.
  Proof: src/renderer/history.test.ts finished works show in their own section

## Approach

### Summary
`Workspace.tsx` y `AgentsOverview.tsx` (cabecera), `ViewSwitch` junto al nuevo botón; quitar `costText`/`useCosts`
de `WorkspaceList`, `AgentsOverview`, `FlowPanel` y `History`; CSS de la cabecera.

### Technical context
React 19, vitest. El estado de cada trabajo ya llega a App (`states`); el foco lo lleva App (W77, `focusOn`).
`src/renderer/cost.ts` se queda si main o tests lo usan; si queda sin uso en el renderer, se borra.

### The approach
- `Workspace` recibe `state` (de `states[selected]`) y un nodo `tools` (switch + botón de foco) desde App; el botón
  llama al mismo manejador que el menú. `AgentsOverview` sigue con su cabecera y solo el switch.
- Se borran del renderer las llamadas de coste; los tests de coste pasan a probar que no hay texto de coste.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| un ajuste «enseñar coste» | Pau dijo que no le interesa; un ajuste para nadie es código para nadie |
| borrar también el cálculo | más diff y W95 lo guarda; se borra si nadie lo echa de menos |

### Risks
| Risk | Mitigation |
|---|---|
| quedar un sitio con coste | W94/F34/W96 enmendados prueban la ausencia en cada vista |

### Validation and rollback
Gates y la app real con Playwright (cabecera, pulsar foco y volver). Un revert.

### Complexity deliberately kept
Ninguna.

## Checklist

- [x] the header with state and focus button; no cost in row, Todos, panel and Terminados; real-app drive; photo; novedades · Closes: W112, W94, W96, F34
