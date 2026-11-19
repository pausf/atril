# refine-request

Tracker: none
Targets: work-inbox
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> termina la app tal y como está en la fase 1 núcleo (Pau, 12 nov). En `bocetos/fase1-nucleo.html`: «Afinar la petición · opcional» dentro de Nueva tarea, cuatro preguntas fijas y «Que Claude me pregunte» («Usa Claude Haiku, solo cuando lo pulsas»).
> Hallazgo 3 de `bocetos/dogfood-juegos.md`: «No existe "Afinar la petición": escribo una frase vaga y va directa a Libretto… un par de preguntas antes ahorrarían vueltas en la spec.»

## Decision log

### Session 2026-11-16
- Q: ¿Dónde vive? → A: en «Nueva tarea» y «Nuevo trabajo», plegado y opcional, como el boceto; solo se enseña con texto escrito, igual que Modo (assumed).
- Q: ¿Cómo llegan las respuestas al agente? → A: pegadas al texto de la petición tras una línea en blanco, una por línea: las fijas como «Hecho cuando: …», las de Claude como «¿pregunta? respuesta». Las vacías no se mandan (assumed; así Libretto las lee en `The ask, verbatim` sin tocar Libretto).
- Q: ¿Y si el texto con respuestas pasa de 2000 caracteres (el tope de main, W-MAX_TASK)? → A: el diálogo lo dice y deshabilita Empezar; main no cambia (assumed). Si es incorrecto: sube el tope en `workspaces.ts`.
- Q: ¿Qué modelo y cuándo? → A: Haiku, solo al pulsar «Que Claude me pregunte»; nunca automático (regla de cuota de CLAUDE.md) (assumed).
- Q: ¿«Volver a preguntar» borra lo contestado? → A: sustituye las preguntas de Claude y sus respuestas; las cuatro fijas se quedan (assumed).
- Q: (spec-reviewer) ¿Quién gobierna `refine.ts`? → A: `workspaces`, que gobierna `src/main/**`; I35/I36 pasan a W208/W209 en `spec-workspaces.md` (assumed).
- Q: (spec-reviewer) ¿Qué dice el error de Claude? → A: frase fija y el código en `detail` («Ver detalle»), nunca la salida de Claude, como M16 (assumed).
- Q: (spec-reviewer) ¿Respuestas escondidas si se borra el texto? → A: con texto en blanco no se manda nada de afinar (I27 abre Claude a secas); lo contestado se queda en el diálogo y vuelve a verse al escribir (assumed).
- Q: (spec-reviewer) ¿Comparte la cola de puntuaciones? → A: no: Haiku corre a su lado, una pregunta a la vez; esperar a una puntuación de 3 min para unas preguntas no tiene sentido (assumed).
- Q: ¿Enter en un campo de afinar empieza la tarea, como Enter en Rama? → A: no: pasa al campo siguiente; ⌘↩ sigue empezando (assumed; empezar a medio contestar sería un susto).

## Outcomes

Quien crea una tarea puede, si quiere, contestar cuatro preguntas fijas o pedir a Claude Haiku 3–5 preguntas sobre su petición, y lo contestado viaja con la petición al agente. Sin tocarlo, todo es como hoy.

## Scope

**In:** `.agents/changes/refine-request/spec-workspaces.md` (W208, W209); `src/renderer/inbox/OwnTaskDialog.tsx` y un `Refine.tsx` nuevo a su lado; `src/main/refine.ts` nuevo (la llamada a Haiku); el IPC `atril:refine:ask` en `src/main/index.ts` y `src/preload/{api,index}.ts`; `src/renderer/mockApi.ts`; `src/preload/i18n-en.ts`; estilos con tokens; `bocetos/novedades.html` y `bocetos/fase1-nucleo.html`.
**Out (nombrado):** cambiar el tope de 2000 de main; guardar respuestas entre diálogos; afinar desde Jira («Empezar» de una tarea de Jira); que Claude reescriba la petición; preguntas en otro idioma que el de la app.

## Constraints

- Nada de llamadas a Claude sin pulsar el botón (CLAUDE.md, cuota).
- Textos por `t()` con su entrada inglesa; errores con `Problem`.
- La llamada usa el mismo `run` que las puntuaciones (`claude -p … --tools '' --no-session-persistence --json-schema`), con la petición por stdin, nunca en argv.

## Prior decisions

- (2026-11-16, refine-request) Las respuestas de afinar viajan dentro del texto de la petición, no como campo aparte: Libretto las recibe en `The ask, verbatim` sin cambiar nada de Libretto.
- (2026-11-16, refine-request) «Que Claude me pregunte» usa Haiku y solo corre al pulsarlo; ninguna otra acción del diálogo llama a Claude.

## Task breakdown

- Main: `refine.ts` y su IPC (W208, W209 en `spec-workspaces.md`).
- Ventana: la sección plegada con las cuatro fijas, el botón, las preguntas de Claude, el texto final y el tope.
- Textos, app real, bocetos.

## Verification criteria

- **I30** (amends what I22 and I27 call «the text»: from here it is the composed text below) While the text of «Nueva tarea» or «Nuevo trabajo» is not blank, the dialog shall show a folded `<details>` «Afinar la petición · opcional»; opened, it shall hold four fields — «¿Qué tiene que pasar cuando esté hecho?», «¿Qué no entra?», «¿Dónde se toca? (pantalla, archivos)», «Un ejemplo». The composed text shall be the request as typed, then — only if any answer (fixed or Claude's, I31) is filled — a blank line and one line per filled answer: the fixed ones first, in that order, as «Hecho cuando: …», «No entra: …», «Dónde: …», «Ejemplo: …», then Claude's (I31). Every answer shall be trimmed with inner newlines turned into spaces; blank ones add nothing. While the text is blank the section shall be hidden and nothing of it sent (I27 opens plain Claude), its answers kept in the dialog. Empezar shall send the composed text, and the «Lanza» line shall show the template with the composed text in place of «tu texto» whenever the text is not blank. The `<details>` summary shall add «1 respuesta añadida» or «{n} respuestas añadidas», n counting fixed and Claude's filled answers, and nothing at 0.
  Proof: src/renderer/inbox/refine.test.tsx the fixed questions add their answers to the request
- **I31** When the person presses «Que Claude me pregunte» with text written, the dialog shall call `refine.ask(text)` once, show «Pensando…» with the button disabled while it waits, then one field per returned question under «Claude pregunta, sobre tu petición»; each filled one shall add «{pregunta} {respuesta}» after the fixed lines, cleaned as I30. Claude's questions stay when the request is edited. The button shall then read «Volver a preguntar», and pressing it shall replace Claude's questions and their answers, keeping the fixed ones. With blank text the button shall not exist (I30), and no other action of the dialog shall call `refine.ask`.
  Proof: src/renderer/inbox/refine.test.tsx claude asks only when pressed and its answers join the request
- **I32** If `refine.ask` answers an error, then the section shall show a `Problem` with that sentence, its `detail` folded, «Puedes empezar igual: afinar es opcional.» and «Volver a intentar», which asks again; Empezar shall stay usable.
  Proof: src/renderer/inbox/refine.test.tsx a failed ask says why and leaves the dialog usable
- **I33** While the request with its answers is longer than 2000 characters, Empezar shall be disabled and the dialog shall say «Con las respuestas pasa de 2000 caracteres: acorta algo.».
  Proof: src/renderer/inbox/refine.test.tsx a request too long with its answers cannot start
- **I34** When Enter is pressed in a field of the section, focus shall move to the next field of the section (from the last, to «Que Claude me pregunte»), and nothing shall start; ⌘↩ shall still start (I22).
  Proof: src/renderer/inbox/refine.test.tsx enter moves through the questions
## Approach

### Summary
Un `Refine.tsx` controlado por `OwnTaskDialog` (el diálogo guarda las respuestas y compone el texto final con una función pura `withAnswers(text, fixed, asked)`), y un `refine.ts` en main que copia el patrón de `scores.ts` para llamar a Haiku.

### Technical context
React 19 + Testing Library + vitest; main con `run` de `src/main/run.ts` inyectable (los tests lo sustituyen). Puertas: typecheck, lint, suite. Radio: 2 archivos nuevos de código, 2 de test, 5 tocados.

### The approach
- `withAnswers` vive en `Refine.tsx` y se exporta; `OwnTaskDialog` lo usa para `args` y para la línea «Lanza» (que hoy pinta «tu texto»: sigue pintando la plantilla con el texto real compuesto).
- `refine.ts`: `createRefiner({ run })` con un flag en curso; `ask(text)` valida, arma args, `run('claude', args, { input: text, timeoutMs: 60_000, secret: true })`, lee `structured_output.questions` del JSON (como scores lee el suyo), limpia y devuelve.
- La sección es un `<details>`; I34 con un `onKeyDown` propio que, solo para Enter sin ⌘, hace `preventDefault` + `stopPropagation` y mueve el foco; ⌘↩ sigue subiendo al diálogo.
- `createRefiner` no usa la cola de `scores.ts`: corre al lado, con su propio «una a la vez».

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| Mandar las respuestas como campo aparte a main y que main las pegue | main tendría que conocer el formato; el texto compuesto en el diálogo es lo que la persona ve en «Lanza» |
| Subir el tope de 2000 en main | toca `workspaces` y su criterio; el caso es raro y el aviso basta |
| Sonnet para las preguntas | el boceto dice Haiku; preguntas cortas no necesitan más |

### Risks
| Risk | Mitigation |
|---|---|
| Haiku devuelve texto fuera del esquema | `--json-schema` + limpieza en W208; «Claude no ha devuelto preguntas.» si no queda nada (W209) |
| Enter en un campo empieza la tarea | I34 y su test |

### Validation and rollback
Tests nuevos en `refine.test.tsx` y `refine.test.ts`. El de W208 tiene que ver el texto en `input` y no en argv: forzarlo en rojo pasando el texto en argv. Rollback: un revert.

### Complexity deliberately kept
Ninguna.

## Checklist

- [x] `src/main/refine.ts` con su IPC `atril:refine:ask`, preload y `mockApi.ts` · Closes: W208, W209
- [x] `Refine.tsx`: sección plegada, cuatro fijas, texto compuesto en Empezar y «Lanza», tope de 2000 y Enter · Closes: I30, I33, I34
- [x] «Que Claude me pregunte», sus preguntas y su error · waits on boxes 1, 2 · Closes: I31, I32
- [x] Textos en inglés, S16/S19; app real; `bocetos/novedades.html` y `bocetos/fase1-nucleo.html` · waits on boxes 1–3
