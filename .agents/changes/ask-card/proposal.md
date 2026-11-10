# ask-card

Tracker: none
Targets: workspaces
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> e sto mas visual lo del apreguntas no? ahora mismo el diseño choca mucho con el agente de abajo

> no entiendo la pestaña de otros cambios

## Reading

La pregunta de un agente y sus respuestas, como una tarjeta pegada a su fila en lugar de botones sueltos; y «Otros
cambios» del panel, que no se entiende, cambiado por un enlace a la pantalla Libretto.

## Decision log

### Session 2026-11-11
- Q: ¿Cómo se ve? → A: la fila y la pregunta forman una sola tarjeta: la fila pierde las esquinas de abajo y
  su borde toma el color «te necesita»; debajo, pegada, la pregunta entera (sin cortar) y una respuesta por fila
  con su número (1, 2, 3…), como el selector de Claude Code; fondo tintado muy suave con `--you`. El boceto 10
  ya lo enseña (assumed).
- Q: ¿La línea de actividad cortada de la fila? → A: mientras está la tarjeta no se repite: la pregunta va entera
  dentro (assumed).
- Q: ¿En «Todos»? → A: igual, dentro de su tarjeta (assumed).
- Q: ¿Teclado? → A: los números son solo dibujo; las respuestas siguen siendo botones con Tab/Enter (assumed).
- Q: ¿«Otros cambios»? → A: es el resto de carpetas de `.agents/changes/` sin contexto y sin acción. Se quita la
  sección; en su lugar una línea «{n} cambios más en este repo → Libretto» que abre la pantalla Libretto con ese
  repo elegido (assumed).

## Outcomes

- Cuando un agente pregunta, su fila crece en una tarjeta con la pregunta entera y las respuestas numeradas; no
  choca con la fila de abajo. El panel ya no tiene «Otros cambios»: dice cuántos hay y lleva a Libretto.

## Scope boundaries

**In:** la tarjeta en Trabajo y en «Todos», la línea a Libretto.
**Out:** responder con la tecla del número; preguntas multiSelect (siguen sin botones, W76).
**Never scoped out:** teclado; contraste del texto sobre el tinte; textos por `t()`; colores como tokens.

## Prior decisions

- Pregunta y respuestas dentro de la tarjeta de la fila (assumed, 11 nov).
- «Otros cambios» se sustituye por un enlace a Libretto (assumed, 11 nov).

## Verification criteria

- **W76** (amended) While a workspace is needs-you and its question is not multiSelect, its row shall be joined by
  a card holding the question's full text (its latest activity line, uncut) and its stored options as numbered
  buttons — «1», «2»… then the label — or «Sí, sigue» and «No, espera» when it has none, and the row shall not repeat
  the cut activity line; pressing one, by mouse or keyboard, shall send it (W75) and show «Enviado» — disabling the
  buttons until the state changes — or show the error and keep the buttons live; the card shall go when the state
  leaves needs-you. One test holds a case per clause.
  Proof: src/renderer/quickreplies.test.ts a waiting row answers with one press
- **W105** The question card's text and button labels shall keep a contrast of at least 4.5:1 over the card's tinted
  background in both themes and both palettes.
  Proof: src/renderer/quickreplies.test.ts the question card reads in every theme

## Approach

### Summary
`QuickReplies` pasa a pintar la tarjeta (pregunta + opciones numeradas); `WorkspaceList` y `AgentsOverview` le pasan
el texto de la actividad y marcan la fila; `FlowPanel` cambia la sección por la línea.

### Technical context
React 19, vitest + Testing Library. Archivos: `src/renderer/components/{QuickReplies,WorkspaceList,AgentsOverview}.tsx`,
`src/renderer/flow/FlowPanel.tsx`, `src/renderer/App.tsx` (abrir Libretto con un repo), `src/renderer/styles.css`,
`src/preload/i18n-en.ts`, tests `quickreplies.test.ts`, `flow/panel.test.ts`. Tokens de tema en `styles.css`
(`:root`, `[data-theme='dark']` y la paleta Grafito).

### The approach
- `QuickReplies` recibe `question?: string`; envuelve todo en `.ask` con `<p class="ask-q">` y botones
  `.ask-opt` con `<kbd aria-hidden>` del número. La fila lleva la clase `asks` para las esquinas y el borde.
- W105: el test lee los tokens de `styles.css` por tema/paleta y calcula el contraste de `--text` sobre la mezcla
  `--you` 7 % + `--card` (mismo cálculo que `color-mix` en sRGB); si `color-mix` en oklch no es reproducible en el
  test, el tinte se define como token propio `--ask-bg` por tema y el test lee ese.
- `FlowPanel` recibe `onOpenLibretto(repoId)`; App pone `librettoRepo` y cambia a la pantalla Libretto.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| dejar los chips y separarlos con margen | sigue sin decir de qué fila son |
| pregunta en un modal | rompe el «sin dejar lo que haces» de las respuestas rápidas |
| explicar «Otros cambios» con un subtítulo | sigue sin acción; Libretto ya enseña esos cambios con sentido |

### Risks
| Risk | Mitigation |
|---|---|
| tinte con poco contraste en algún tema | W105 lo mide |
| `color-mix` difícil de calcular en el test | token `--ask-bg` por tema |

### Validation and rollback
Gates de siempre; foto de Trabajo con un agente preguntando (`respuestas.png`) mirada antes de aterrizar. Un revert.

### Complexity deliberately kept
Ninguna.

## Checklist

- [ ] the question card in Trabajo and Todos, its contrast · Closes: W76, W105
- [ ] the Libretto line in place of Otros cambios; sketch; photos; novedades · waits on box 1 · Closes: F35
