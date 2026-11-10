# agents-overview

Tracker: none
Targets: workspaces
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> sigue creando funcionalidades. Tenemos que hacer el mejor gestor de IA, o sea, de orquestador y revisor de MRs, etcétera, porque lo queremos poner para que la gente le sea útil.

## Reading

Vista de orquestador: todos los agentes de un vistazo (estado, etapa de Libretto, subagentes, última acción, tiempo) con acciones rápidas; hoy hay que ir trabajo por trabajo.

## Decision log

### Session 2026-11-10
- Q: ¿Para qué? → A: ver los 3 (o más) agentes a la vez sin entrar en cada uno: qué hace cada uno, en qué
  etapa va y quién te necesita (Pau, 10 nov: «3 tareas a la vez sin perder el foco») (assumed).
- Q: ¿Dónde? → A: un segundo modo de Trabajo, «Todos», con ⌘⇧A y un conmutador «Uno · Todos» en la
  cabecera; en «Todos» el hueco de la terminal muestra una tarjeta por trabajo (assumed). Perdió: varias
  terminales a la vez (pesadas y frágiles con tmux; una tarjeta basta para decidir a cuál entrar).
- Q: ¿Qué lleva cada tarjeta? → A: rama y repo, estado escrito, etapa de Libretto con su checklist «3/7»,
  la última acción con «hace N min», los subagentes trabajando y, si te necesita, sus respuestas rápidas
  (W76) (assumed).
- Q: ¿Orden? → A: primero los que te necesitan (más antiguo primero, como N1), luego trabajando, luego
  parados (assumed).
- Q: ¿Pulsar una tarjeta? → A: la abre en modo «Uno» (assumed).

- Q: ¿⌘⇧A? → A: libre en el menú; «Uno · Todos» en la cabecera de Trabajo; con el modo foco puesto, «Todos»
  sale del foco (assumed: el foco es de un trabajo).

## Outcomes

- ⌘⇧A (o «Todos») enseña todos los trabajos como tarjetas, ordenadas por quién te necesita; pulsar una
  la abre. Se contesta a un agente desde su tarjeta sin abrirla.

## Scope boundaries

**In:** el modo «Todos», las tarjetas, su orden, abrir una, respuestas rápidas en la tarjeta.
**Out:** varias terminales a la vez, arrastrar para reordenar, acciones en lote, filtros.
**Never scoped out:** estados con texto (W22); teclado: las tarjetas son botones y las flechas se mueven
entre ellas; el modo foco (W77) sigue siendo de un trabajo.

## Prior decisions

- Tarjetas, no terminales múltiples (assumed, 10 nov).
- El modo «Todos» no se recuerda al reiniciar (assumed, 10 nov).

## Task breakdown

- Conmutador y ⌘⇧A; estado del modo en la ventana.
- Tarjeta con estado, etapa/checklist (flow.get), última acción (activity.latest), subagentes, QuickReplies.
- Orden y apertura.

## Verification criteria

- **W81** When the person picks «Todos» (or ⌘⇧A) on Trabajo, the workspace area shall show one card per
  workspace with its branch, repo, written state, Libretto stage and checklist «{closed}/{total}» when it
  has one, last activity with «hace {n} min», and the count of running subagents, ordered needs-you
  (longest waiting first), then working, then stopped; «Uno» (or ⌘⇧A again) shall return to the terminal.
  Proof: src/renderer/overview.test.ts all agents show as ordered cards
- **W82** Pressing a card shall open that workspace in «Uno»; while a card's workspace is needs-you it
  shall carry the quick replies of W76, and answering there shall not open it.
  Proof: src/renderer/overview.test.ts a card opens its workspace or answers in place

## Approach

### Summary

Un componente `AgentsOverview` que pinta tarjetas con los datos que la ventana ya recibe (estados,
actividad, subagentes) y pide `flow.get` por trabajo; el modo vive en `App` junto a `focus`.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Varias terminales xterm a la vez | Peso, tamaño y foco del teclado; para decidir basta la tarjeta. |
| Una pantalla nueva en el rail | Las tarjetas son trabajos: viven en Trabajo. |

### Risks

| Risk | Mitigation |
|---|---|
| Muchas llamadas a flow.get | Una por tarjeta al entrar y al cambiar su flujo (onChange ya existe). |

### Validation and rollback

Tests vistos en rojo. Rollback: un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [ ] the Todos mode with ordered cards · Closes: W81
- [ ] opening a card and answering in place; tutorial mention; sketch; photo · waits on box 1 · Closes: W82
