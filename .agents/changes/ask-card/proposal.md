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

### Session 2026-11-11 (revisión en frío)
- Q: ¿«Entera» desde dónde? → A: la línea de actividad tal como la guarda el hook (ya cortada a 200 en
  `summarise.mjs`); en la tarjeta solo se quita la elipsis de CSS. Nada cambia en main (assumed).
- Q: ¿Dónde se prueba que la fila no repite la línea? → A: en `quickreplies.test.ts`, montando `WorkspaceList`, como
  ya hace hoy ese test (el constructor lo comprueba); al dejar de estar needs-you vuelve la línea en el mismo render
  (assumed).
- Q: ¿Todos? → A: W82 se enmienda aquí: en «Todos» la tarjeta va pegada bajo el botón de la tarjeta, fuera de él, y
  el botón no repite la línea cortada; su prueba sigue en `overview.test.ts` (assumed).
- Q: ¿Contraste de qué? → A: texto de la pregunta y etiquetas activas sobre `--ask-bg`; los números (`aria-hidden`),
  el borde y lo desactivado quedan fuera. El tinte es un token `--ask-bg` por tema y paleta (los cuatro: original
  claro y oscuro, Grafito claro y oscuro), sin `color-mix`, para que el test lea lo mismo que se pinta (assumed).
- Q: ¿Libretto con qué repo? → A: «Ver en Libretto» guarda ese repo como el elegido (W104) y cambia de pantalla; la
  cuenta es `flow.others.length` (assumed).
- Q: ¿Línea o botón? → A: texto «{n} cambios más en este repo» y un botón «Ver en Libretto» (assumed). El plegado
  `flow-others` guardado se ignora (assumed).

## Outcomes

- Cuando un agente pregunta, su fila crece en una tarjeta con la pregunta entera y las respuestas numeradas; no
  choca con la fila de abajo. El panel ya no tiene «Otros cambios»: dice «{n} cambios más en este repo» y «Ver en Libretto».

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
- **W82** (amended) Pressing a card shall open that workspace in «Uno» without focus mode; while a card's workspace
  is needs-you and its question is not multiSelect, W76's question card shall sit joined under the card's button,
  outside it, the button shall not repeat the cut activity line, and answering there shall not open it. One test
  holds a case per clause.
  Proof: src/renderer/overview.test.ts a card opens its workspace or answers in place
- **W105** The question text and the enabled answer labels shall keep a contrast of at least 4.5:1 over `--ask-bg`
  in each of the original light, original dark, Grafito light and Grafito dark token sets.
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
- W105: `--ask-bg` es un token propio en cada uno de los cuatro bloques de tokens; el test lee `styles.css`, saca
  `--text` y `--ask-bg` de cada bloque y calcula el contraste WCAG.
- La fila (`WorkspaceList`) y la tarjeta de «Todos» (`AgentsOverview`) ocultan `ws-act`/su línea mientras hay
  tarjeta y pasan la línea entera como `question`.
- `FlowPanel` recibe `onOpenLibretto(repoId)`; App llama a `setLibrettoRepo(repoId)` y cambia a la pantalla Libretto. La prueba de F35 monta App con el mock o, si no se puede, prueba la llamada en `panel.test.ts` y el cambio de pantalla en `libretto.test.ts`.

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
| el test mide otro color que el pintado | `--ask-bg` es el color pintado, sin mezcla |

### Validation and rollback
Gates de siempre; foto de Trabajo con un agente preguntando (`respuestas.png`) mirada antes de aterrizar. Un revert.

### Complexity deliberately kept
Ninguna.

## Checklist

- [x] the question card in Trabajo and Todos, its contrast · Closes: W76, W82, W105
- [x] the Libretto line in place of Otros cambios; sketch; photos; novedades · waits on box 1 · Closes: F35
