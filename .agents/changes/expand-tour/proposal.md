# expand-tour

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> El tutorial que has puesto tiene que ser más extenso, ¿eh? Dejas muchas cosas en el aire. Y por favor, en español de España, no en español argentino. Pero sí, tienes que dejar, pero dejas muchas cosas en el aire.

## Reading

El recorrido (`src/renderer/tour/Tour.tsx`, 11 pasos de una línea) se queda corto: hay que explicar
cada pieza a fondo (subagentes, modo automático, borradores, puntuación, doctor…), siempre en
castellano de España, y llevarlo también al boceto `bocetos/fase1-nucleo.html`.

## Decision log

### Session 2026-11-10
- Q: ¿Cuántos pasos? → A: 24, uno por pieza que se usa, en el orden en que se usa: Trabajo, su panel,
  Tareas, MR, Avisos, lo de arriba y abajo, Ajustes (assumed).
- Q: ¿Qué dice cada paso? → A: qué es, cómo se usa y qué pasa al usarlo, en 2–3 frases de castellano de
  España, con sus atajos; cada frase tiene que ser verdad en el código de hoy (assumed).
- Q: ¿Pasos de cosas que no siempre están (subagentes, herramientas, el diálogo de modo, ⌘K)? → A: se
  explican igual: si no hay elemento, el paso sale centrado, como ya hace el tutorial (assumed).
- Q: ¿La bienvenida? → A: «Enséñamelo · 3 min» (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - Cada texto tiene **2 o 3 frases**; una frase acaba en «.», «?» o «!» seguido de espacio o del final.
  - start-mode y palette nunca tienen elemento: el test comprueba que salen centrados, sin foco. Los
    otros seis opcionales se dan en el mock cuando es práctico.
  - El paso 11 ilumina la pestaña Actividad, que siempre está visible.
  - El paso 18, «la nueva comprobación», es la que se hace al volver el foco a Atril.
  - Los `data-tour` en rutas de otras capacidades son solo atributos al servicio del tutorial, que es de
    workspaces; no se escribe spec en esas capacidades.
  - La bienvenida dice «Enséñamelo · 3 min» y entra en W23.
  - El «Out» de add-command-palette sobre un paso de tutorial para ⌘K queda superado por este cambio.
  - Fotos: pasos 7 y 13, en `bocetos/novedades/tutorial-7.png` y `tutorial-13.png`.

## Outcomes

El tutorial recorre 24 pasos que explican toda la app, sin dejar piezas sin contar: la lista y los
textos, en «Pasos» abajo. Los que tienen elemento en pantalla lo iluminan; los que no, salen centrados.

## Pasos

| # | target | pantalla | título | qué explica |
|---|---|---|---|---|
| 1 | rail | work | Tus pantallas | las cinco pantallas y el número rojo de pendientes |
| 2 | next-up | work | Qué me toca | lo siguiente que te necesita y cómo saltar a ello |
| 3 | new-work | work | Nuevo trabajo | rama en worktree o en tu copia, Claude en tmux, con texto empieza por la spec |
| 4 | workspaces | work | Trabajo en marcha | estados escritos, última acción, subagentes, aviso del Mac y responder desde él, ⌘1…9 |
| 5 | terminal | work | La terminal de tu agente | Claude Code real en tmux, ⌘D y ⌘⇧D, sigue vivo al cerrar Atril |
| 6 | flow | work | El panel de Libretto | leído de .agents, ⌘J y ⌘L, pestañas Libretto y Actividad |
| 7 | stages | work | Las etapas | las seis, aro azul = se puede pulsar, Spec/Plan editables mientras espera, Construir = cambios |
| 8 | flow-checklist | work | Checklist | casillas, la siguiente, «Ver checklist», la parada antes de construir |
| 9 | flow-changes | work | Cambios | archivos y líneas cada 3 s, el diff, el aviso de rama grande |
| 10 | flow-subagents | work | Subagentes | qué se les encargó, cuánto llevan, su terminal en vivo |
| 11 | activity | work | Actividad | lo que hizo el agente contado en frases |
| 12 | tasks | tasks | Tus tareas de Jira | agrupadas por estado, Empezar: rama, In Progress y Libretto; ⌥ para elegir |
| 13 | start-mode | tasks | Manual o automático | qué hace cada modo y cuándo pregunta |
| 14 | new-task | tasks | Nueva tarea | crearla en Jira y empezarla en el acto |
| 15 | mr | mr | Tus MR | tuyas, a revisar y seguidas; hilos y responder |
| 16 | mr-tools | mr | Puntuar y revisar | Puntuar con Sonnet, Revisar con Libretto deja borradores; solo gasta cuota al pulsar |
| 17 | avisos | avisos | Avisos | qué llega y cómo marcar leído |
| 18 | doctor | work | Herramientas que faltan | el aviso, Copiar e Instalar en Terminal, la nueva comprobación |
| 19 | palette | work | Buscar con ⌘K | qué encuentra y cómo moverse |
| 20 | usage | work | Tu cuota de Claude | 5 h y 7 días, cuándo se reinicia |
| 21 | session | work | Tu sesión | quién eres en Jira, ir a Ajustes |
| 22 | connections | settings | Conexiones | Jira, GitHub y GitLab, cifrados en el Llavero, nunca se muestran |
| 23 | repos | settings | Repos | añadir y crear, worktree o tu copia, forzarlo |
| 24 | appearance | settings | Apariencia | paleta Original o Grafito, Claro/Oscuro/Automático, volver al tutorial |

## Scope boundaries

**In:** los 24 pasos, sus textos y atajos, los `data-tour` que falten, la bienvenida.
**Out:** cambiar cómo funciona el tutorial (foco, posiciones, teclado); vídeos o animaciones; un tutorial
por pantalla.
**Never scoped out:** castellano de España y su inglés en `i18n-en.ts`; manejable con teclado (W25).

## Constraints

Cada afirmación de un texto debe ser cierta en el código: atajo, nombre de botón, comportamiento.
Textos por `t()`.

## Prior decisions

- Pau, 10 nov: «tiene que ser más extenso… dejas muchas cosas en el aire», en castellano de España.

## Task breakdown

- Los `data-tour` nuevos en sus elementos.
- Los 24 pasos con sus textos, comprobados contra el código.
- El test de W23 con la lista nueva; el boceto con el mismo recorrido.

## Verification criteria

- **W23** (amended) When Atril launches for the first time, it shall run the tutorial over the 24 steps
  of «Pasos» in that order, after a welcome whose button reads «Enséñamelo · 3 min», each with its title
  and a text of two or three sentences (a sentence ends in «.», «?» or «!» before a space or the end),
  highlighting the
  step's `data-tour` element when it is on screen and showing the step centred when it is not — the
  ones that may be absent being next-up, flow-checklist, flow-changes, flow-subagents, start-mode,
  mr-tools, doctor and palette, of which start-mode and palette never have one; every other target
  shall exist when its step shows. One test holds a case per clause.
  Proof: src/renderer/tutorial.test.ts first launch runs the tutorial over every element

## Approach

### Summary

Solo datos y atributos: `stepsOf` crece a 24 entradas, y los elementos que faltan reciben su `data-tour`.
El motor del tutorial no se toca.

### The approach

- `data-tour` en: NextUpStrip (`next-up`), la fila de etapas (`stages`), las tres `FoldSection` del panel
  (prop `tour`), la pestaña Actividad (`activity`), el botón Nueva tarea (`new-task`), las herramientas de
  la MR seleccionada (`mr-tools`), el chip del doctor (`doctor`), la tarjeta de Jira en Ajustes
  (`connections`) y la sección Repos (`repos`).
- `start-mode` y `palette` no tienen elemento fijo: salen centrados.
- Textos verificados uno a uno contra el componente que describen.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Un tutorial corto por pantalla | Pau pidió uno más extenso; partirlo deja piezas sin ver. |
| Abrir diálogos de verdad durante el tutorial | Toca el motor y puede dejar estado a medias. |

### Risks

| Risk | Mitigation |
|---|---|
| Un texto miente sobre la app | Constraint: cada frase se comprueba contra su componente; el revisor en frío lo lee. |
| 24 pasos cansan | Cada paso ocupa 2 o 3 frases; «Saltar» y las flechas siguen igual. |

### Validation and rollback

El test de W23 se ve en rojo con la lista vieja. Rollback: un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [ ] the new data-tour targets and the 24 steps with checked texts and English · Closes: W23
- [ ] the fase1 sketch's tour with the same 24 steps; photos of steps 7 and 13 (drawing and evidence, no criterion) · waits on box 1
