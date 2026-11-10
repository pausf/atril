# quick-replies

Tracker: none
Targets: workspaces
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> sigue creando funcionalidades. Tenemos que hacer el mejor gestor de IA, o sea, de orquestador y revisor de MRs, etcétera, porque lo queremos poner para que la gente le sea útil.

## Reading

Respuestas rápidas al agente (lista del 9 nov): cuando un agente te pregunta, botones con las respuestas típicas («Sí, sigue», «No», «Explícamelo») en la fila, el panel y el aviso.

## Decision log

### Session 2026-11-10
- Q: ¿Para qué? → A: para llevar 3 trabajos a la vez sin perder el foco: contestar a un agente desde
  su fila sin abrir su terminal (Pau, 10 nov) (assumed).
- Q: ¿Qué respuestas? → A: si la pregunta es de `AskUserQuestion` (con opciones), sus opciones; si no,
  dos fijas: «Sí, sigue» y «No, espera» (assumed).
- Q: ¿Cómo se envía una opción? → A: tecleando su número (1, 2…) y Enter en el panel del agente, que es
  como se elige en el selector de Claude Code (assumed; formato interno: si cambia, se escribe el texto de
  la opción). Una respuesta fija se escribe literal, como N3.
- Q: ¿Dónde? → A: en la fila del trabajo en «Trabajo en marcha», debajo de «Te pregunta: …»; nada en el
  panel ni en otras pantallas en este cambio (assumed).
- Q: ¿Varias preguntas a la vez (`questions` con más de una)? → A: solo la primera; las demás se contestan
  en la terminal (assumed).

## Outcomes

- Una fila «te necesita» enseña la pregunta y, debajo, sus respuestas como botones pequeños; pulsar una se
  la manda al agente sin cambiar de trabajo, y la fila dice «Enviado».
- Al volver el agente a trabajar, los botones desaparecen.

## Scope boundaries

**In:** guardar las opciones de la primera pregunta en el estado, los botones de la fila, el envío.
**Out:** respuestas configurables; varias preguntas; botones en el panel, en «Qué me toca» o en la
notificación (ya tiene su campo, N3); modo foco (otro cambio).
**Never scoped out:** el texto de las opciones se pinta como texto; se envía solo al pulsar y al panel de
ese trabajo; teclado; si el trabajo ya no está, «No se pudo enviar: ese trabajo ya no está» (N3).

## Prior decisions

- Solo la primera pregunta (assumed, 10 nov); techo: las demás, en la terminal.
- El número de la opción como tecla (assumed, 10 nov); techo: formato interno de Claude Code.
- Respuestas fijas «Sí, sigue» / «No, espera» (assumed, 10 nov).

## Task breakdown

- Hook: en PreToolUse de AskUserQuestion, guardar hasta 4 etiquetas de opción (cortadas a 40) en el estado.
- Main: `atril:status:answer(id, choice)` que teclea número o texto.
- Ventana: botones en la fila, «Enviado», error.

## Verification criteria

- **W74** When the hook gets a PreToolUse for `AskUserQuestion`, it shall add to the needs-you state the
  labels of the first question's options (at most 4, each cut to 40 characters, whitespace collapsed);
  any other needs-you state shall carry none.
  Proof: src/main/agent.test.ts an asked question keeps its options
- **W75** When the window asks `atril:status:answer(workspaceId, choice)` where choice is an option index,
  main shall type that index plus one, then Enter, into that workspace's pane; where choice is a fixed
  reply, it shall type it as literal text then Enter; it shall refuse an index outside the stored options
  and, for a gone workspace, say «No se pudo enviar: ese trabajo ya no está».
  Proof: src/main/reply.test.ts a quick answer reaches its own pane
- **W76** While a workspace is needs-you, its row shall show its stored options as buttons, or «Sí, sigue»
  and «No, espera» when it has none; pressing one shall send it (W75) and show «Enviado» or the error; the
  buttons shall go when the state leaves needs-you.
  Proof: src/renderer/quickreplies.test.ts a waiting row answers with one press

## Approach

### Summary

El hook ya pasa a needs-you con AskUserQuestion; además guarda las opciones. Main reutiliza el envío de
N3 (`replyToAgent`) con un modo «tecla» para el número. La fila pinta botones.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Escribir siempre el texto de la opción | En el selector de Claude Code no elige nada. |
| Botones en la notificación del Mac | macOS solo deja un campo de respuesta; ya existe (N3). |

### Risks

| Risk | Mitigation |
|---|---|
| El selector de Claude Code cambia | Techo nombrado; el número se manda solo si hay opciones guardadas. |
| Teclear en el panel equivocado | Se envía por id de trabajo al panel de ese trabajo (N3). |

### Validation and rollback

Tests nuevos vistos en rojo. Rollback: un revert; el estado sin `options` se lee como hoy.

### Complexity deliberately kept

Ninguna.

## Checklist

- [ ] hook stores the options and main answers by index or text · Closes: W74, W75
- [ ] the row's quick reply buttons; tutorial step 4 mentions them; sketch; photo · waits on box 1 · Closes: W76
