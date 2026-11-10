# fix-ci-with-claude

Tracker: none
Targets: mr
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> Estado de la CI en la fila de la MR, y «Arreglar CI con Claude». (lista de mejoras dada a Pau el 9 nov; Pau, 10 nov: «sigue hacia adelante y ves haciendo automejoras»)

## Reading

La CI ya sale en cada fila (M4). Falta la acción: cuando la CI de una MR falla y su trabajo vive en Atril,
un botón le pide a ese agente que mire qué ha fallado y lo arregle.

## Decision log

### Session 2026-11-10
- Q: ¿Dónde va el botón? → A: en la vista de la MR, junto a su estado de CI, y solo con CI «Falla» (assumed).
- Q: ¿A qué agente? → A: al mismo que M28 elige para «Mandar al agente»: el único trabajo vivo en la rama
  de la MR con `origin` en su proyecto; si hay cero o varios, el botón no sale (assumed).
- Q: ¿Qué le dice? → A: una línea escrita en su terminal, como responder: «La CI de {url} falla. Mira qué
  ha fallado con {gh pr checks|glab ci view}, arréglalo y avísame antes de subir nada.» (assumed).
- Q: ¿Cuota? → A: no llama a Claude por su cuenta: escribe en un agente que ya está abierto, solo al pulsar (assumed).
- Q: (fase 5) ¿Cómo? → A: reutilizar `agentFor` de lenses y el `send` que ya escribe en el panel (assumed).
  Perdió: abrir un trabajo nuevo desde la MR (es la mejora «Abrir un trabajo desde una MR», aparte).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **De dónde sale la CI.** Main la lee de la última lista de MR, como M27; no se fía de la ventana.
  - **Los errores, uno por caso:**
    - «La CI de esta MR ya no falla.»
    - «No hay un único trabajo de esta MR abierto en Atril.»
    - «No se pudo enviar: ese trabajo ya no está.» (el texto de N3)
  - **`ciAgent`** tiene su propio criterio, M32. La vista lo pregunta al abrir la MR.
  - **Doble clic.** Un segundo clic mientras el primero sigue en curso se rechaza, como en M27.
  - **Dónde vive el código.** En `lenses.ts`, que ya está en el `Governs:` de mr, junto a `agentFor`.
  - **Textos.** Todos por `t()`.

## Outcomes

- En una MR con CI «Falla» y su trabajo vivo en Atril, «Arreglar CI con Claude» escribe la petición en la
  terminal de ese agente y dice «Enviado a {rama}».
- Sin trabajo único en Atril, el botón no aparece.

## Scope boundaries

**In:** la consulta de si hay agente, la acción, el botón y su estado.
**Out:** abrir un trabajo nuevo; leer los logs de la CI desde Atril; reintentar la CI; subir cambios.
**Never scoped out:** el texto se escribe literal (sin teclas especiales), como W-respuestas; nada se envía
sin pulsar; el botón se usa con teclado.

## Prior decisions

- Mismo agente que M28 (assumed, 10 nov).
- Solo bajo demanda: CLAUDE.md, «Nada de llamadas automáticas a Claude».

## Task breakdown

- Main: `ciAgent(url)` → rama o nada; `fixCi(url)` → escribe la línea y responde.
- Ventana: el botón en la vista de la MR, su estado y error.

## Verification criteria

- **M30** When the window asks `atril:mr:fixCi(url)` for an MR whose CI is «Falla» and M28 finds exactly
  one workspace for it, main shall type into that workspace's pane, as literal text followed by Enter, «La
  CI de {url} falla. Mira qué ha fallado con {gh pr checks|glab ci view}, arréglalo y avísame antes de subir
  nada.» (gh for GitHub, glab for GitLab) and answer `{ sent: branch }`, judging the CI from main's latest
  MR listing; otherwise it shall type nothing and answer `{ error }` with «La CI de esta MR ya no falla.»,
  «No hay un único trabajo de esta MR abierto en Atril.» or «No se pudo enviar: ese trabajo ya no está.»;
  a second call for the same MR while one is in flight shall be refused. One test holds a case per clause
  (GitHub, GitLab, two agents, CI not failing, gone, double call).
  Proof: src/main/forge/fixci.test.ts fix ci types into the one agent of the mr
- **M31** While an MR's CI is «Falla» and main reports an agent for it, the MR view shall show «Arreglar CI
  con Claude» beside the CI state; pressing it shall show «Enviado a {rama}» or the error; with no agent, or
  any other CI state, no button shall show. One test holds the visibility, the sent text and the error.
  Proof: src/renderer/mr/fixci.test.ts the fix ci button shows only with a failing ci and an agent
- **M32** When the MR view opens, the window shall ask `atril:mr:ciAgent(url)`, and main shall answer the
  branch of the one workspace M28 finds when main's latest listing has that MR's CI as «Falla», and `null`
  otherwise.
  Proof: src/main/forge/fixci.test.ts ci agent names the branch only for a failing ci

## Approach

### Summary

Dos llamadas nuevas a main sobre piezas que ya existen (`agentFor`, `send`) y un botón en la vista de la MR.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Abrir un trabajo nuevo para arreglar la CI | Es otra mejora de la lista; aquí solo con agente ya abierto. |
| Leer el log de la CI y pasárselo a Claude | Más permisos y texto; el agente ya sabe usar gh/glab. |

### Risks

| Risk | Mitigation |
|---|---|
| Escribir en el panel equivocado | M28 exige un único trabajo vivo en la rama y el proyecto; el test lo prueba con dos. |
| Teclas especiales en el texto | Se envía literal, como las respuestas (send-keys -l). |

### Validation and rollback

Tests nuevos vistos en rojo primero. Rollback: un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [ ] main: ciAgent and fixCi over agentFor and send · Closes: M30, M32
- [ ] the MR view button with its state; sketch; photo · waits on box 1 · Closes: M31
