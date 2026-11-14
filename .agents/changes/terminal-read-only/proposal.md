# terminal-read-only

Tracker: none
Targets: workspaces
Durable decisions: the ones in Prior decisions below (terminal de solo lectura, tarjetas por tipo de espera, campo `kind` en el estado, compositor único)

## The ask, verbatim

> Los terminales deberían ser solo lectura, no escritura. Todo lo que tengas que escribir, las preguntas que te tiene que decir, se controlan por el orquestador, no se controla por la terminal. No sé si me entiendes. Mira cómo lo hace Orca o 3T Code.

> ¿Qué harías sin que afectara a libreto? — Te dejo a tu elección.

## Decision log

### Session 2026-11-12
- Q: ¿Cómo se hace la terminal de solo lectura? → A: «Paso a paso (Recommended)»: ya, con los ganchos que hay; el Agent SDK como cambio aparte después.
- Q: ¿Se toca Libretto? → A: no; Libretto sigue preguntando con `AskUserQuestion` y terminando turnos con texto; Atril solo cambia quién contesta (assumed, «te dejo a tu elección»).
- Q: ¿Cómo se sabe qué espera el agente? → A: un campo nuevo `kind` en el estado (`question`, `permission`, `turn-end`, `idle`), además del texto; sustituye a «pregunta frente a fin de turno por prefijo» de `notify-core` sin romperlo: el texto sigue con su prefijo (assumed). Si es incorrecto: se deduce del prefijo y de `notification_type` en main.
- Q: ¿Cómo contesta Atril? → A: como hoy, con teclas al panel por tmux (`sendKey`, `pressKey`, `pasteText`); la persona nunca teclea en la terminal (assumed). El Agent SDK lo cambiará por datos.
- Q: ¿Permitir un permiso cómo? → A: «Permitir» manda `1` (Sí, una vez), «Denegar» manda Escape; «Permitir siempre» queda fuera (assumed: cambia ajustes del proyecto sin que la persona lo vea).
- Q: ¿Varias preguntas en un `AskUserQuestion`? → A: la tarjeta las enseña de una en una, en el orden de Claude Code; contestar una pasa a la siguiente (assumed; se comprueba en la app real con Claude de verdad).
- Q: ¿Selección múltiple? → A: fuera de este cambio: la tarjeta enseña la pregunta y las opciones y dice «Contesta por escrito abajo» (assumed). Techo: con el SDK llega como dato.
- Q: ¿Y en modo Automático? → A: «cuando es modo automático… no tiene que salir nada, o sea, tiene que seguir hacia adelante la gente, con sus decisiones y todo» (Pau, 12 nov). Atril contesta él mismo: la opción recomendada en una pregunta, «Sigue con el plan; no hagas nada que no esté en él.» en un fin de turno; solo se para en lo que ya acordamos que pregunta (push y MR, W59) y en un fallo de verdad (una puerta que falla dos veces, una herramienta que falta) (assumed para las dos excepciones; si Pau quiere también el push sin preguntar, cambia W59).
- Q: ¿Un permiso en Automático se concede solo? → A: no; el modo automático de permisos de Claude Code ya decide casi todo, y lo que aun así pregunte sale como tarjeta: conceder a ciegas lo que el propio Claude Code no se atreve es un riesgo de seguridad (assumed).
- Q: ¿Qué manda «Sigue»? → A: nunca un «sí» suelto: en el dogfood, «Sí, sigue» se tomó como aprobación de lo último que Claude había ofrecido (publicar un comentario en la PR #11). Manda «Sigue con el plan; no hagas nada que no esté en él.» (assumed).
- Q: ¿Queda alguna forma de escribir en la terminal? → A: no dentro de Atril; «Abrir en Terminal» (ya existe) sigue para quien quiera la TUI cruda (assumed).

### Session 2026-11-13 (revisión en frío)
- Q: ¿W74–W76 se amplían o se sustituyen? → A: se sustituyen, marcados `(amended)`: W74 guarda todas las preguntas sin recortar, W75 cambia sus formas de respuesta (sin «Sí, sigue»), W76 pasa a la tarjeta por tipo (assumed).
- Q: ¿En Automático se suprime también el aviso en Avisos? → A: sí, en lo que Atril contesta solo no hay aviso de ningún tipo; V3 y W15 se enmiendan (assumed).
- Q: ¿Y los paneles de shell de ⌘D? → A: también de solo lectura; ⌘D/⌘⇧D dejan de hacer nada y «Abrir en Terminal» da la shell escribible (assumed).
- Q: ¿⌘↩? → A: envía el compositor solo cuando tiene el foco; en lo demás manda N2/W79 (assumed).
- Q: ¿El recordatorio de inactividad cambia el `kind`? → A: no; pone `idle: true` y conserva el resto (W195 enmendado) (assumed).
- Q: ¿Cuándo se reinicia el tope de 3 de Automático? → A: tras 30 s seguidos trabajando, no con el instante que sigue a nuestro propio «Sigue» (lo vimos en la prueba) (assumed).
- Q: ¿La parada del push en Automático sale del texto o del permiso de W59? → A: del permiso de W59 (W207); no se lee el texto (assumed).
- Q: ¿Selección múltiple en Automático? → A: se para como en Manual (assumed).
- Q: ¿Quién lleva qué pregunta toca? → A: main, por sesión, desde 0 en cada entrada en needs-you; tras la última, Enter para enviar (assumed; se comprueba con Claude real).
- Q: ¿Tareas de shell en segundo plano? → A: fuera; solo subagentes, que el gancho ya registra. Techo: con el Agent SDK llega como dato (assumed).
- Q: ¿De dónde sale la herramienta de un permiso? → A: del último PreToolUse de esa sesión, que el gancho recuerda (assumed).
- Q: ¿W45 sigue avisando a Claude? → A: no; el gancho reclama el umbral sin decirle nada y F25 lleva los botones; «Dejarla así» se guarda en `ui.json` `bigDismissed[workspaceId] = k` y sobrevive al reinicio (assumed).

### Session 2026-11-14 (construcción)
- Box 1 toca fuera de «In»: `src/main/menu.ts` (fuera «Dividir a la derecha/abajo», ⌘D/⌘⇧D, W196) y los tests que montaban el menú con `split` (`src/main/i18n.test.ts` cambia la etiqueta de ejemplo a «Pausar»; `src/renderer/flow/boxes.test.ts` comprueba que ⌘D/⌘⇧D ya no existen; `tutorial`, `pause`, `focus` y `overview` solo pierden `split`); `src/renderer/tour/Tour.tsx` (el paso de la terminal decía «escribe en él» y ⌘D); `src/main/pty.test.ts` pierde las llamadas a `input`, que ya no existe. `splitPane` sigue en `tmux.ts`: sus tests prueban otros criterios (W163, el destino exacto) (assumed).
- Box 2: «an asked question keeps its options» (la prueba vieja de W74) se sustituye por la que nombra W74 enmendado. El gancho ya no escribe `options`/`multiSelect`; main los sigue leyendo en estados viejos (Constraints). W198 «recordar por sesión» vive en una opción de la sesión de tmux (`@atril-tool`), leída y escrita en la misma llamada `display` que el gancho ya hacía: guardarla en disco rompía la prueba de A1 («hook appends a short summary, never the payload»: ningún archivo bajo `ATRIL_HOME` con el comando). Así un comando solo llega a disco cuando un permiso espera por él, como pide W198 (assumed).
- Box 3: «a quick answer reaches its own pane» (src/main/reply.test.ts, la prueba vieja de W75) se quita: W75 enmendado cita las dos de `status.test.ts`, que cubren sus cláusulas (pantalla propia, opción fuera de rango, estado que ya no espera, formas raras, trabajo que ya no está). N3 («a number answers the option with its key») ahora espera el Enter final de W75 tras la última pregunta. `QuickReplies.tsx` y su test pasan a `{ option, question }` y «Sigue» hasta que box 4 los sustituya. Fuera de «In»: `src/main/activity.ts` (W199: la línea «Esperando a un subagente» encima y el vigilante también mira `state/`), `src/preload/activity-i18n.ts` (W203 para líneas viejas), `src/renderer/mockApi.ts` y `src/renderer/overview.test.ts` (la forma nueva) (assumed).
- W75 dice «a gone workspace or pane answers W53's sentence», pero W53 es del runner: se usa la de N3 («No se pudo enviar: ese trabajo ya no está»), como hasta ahora (assumed).
- W203 se arregla en origen: `summarise.mjs` escribe «Te pregunta: ¿Puede usar {tool}?», «Te pregunta: ¿Puede seguir?» y «Claude te necesita» en lugar de los mensajes en inglés de Claude Code; las líneas viejas se traducen al enseñarlas (assumed).

## Outcomes

- La terminal de cada trabajo se ve en vivo y se puede seleccionar y copiar, pero ninguna tecla llega al agente.
- Cuando el agente espera, Atril dice qué espera, en castellano, con botones: una pregunta con sus opciones y su porqué; un permiso con lo que quiere ejecutar; un fin de turno con lo que ha dicho; nunca «Claude needs your permission» ni «Claude is waiting for your input».
- Debajo de la terminal, una caja «Escribe al agente» manda cualquier mensaje.
- En Automático no sale ninguna tarjeta: Atril elige la recomendada y dice «Sigue con el plan; no hagas nada que no esté en él.» solo, y en la fila queda «Decidió: {opción}»; solo se para en el push y la MR, en un fallo de verdad o en un permiso que Claude Code no concede solo.
- Un agente que acaba su turno mientras sigue con subagentes o tareas en segundo plano sale como «trabajando», no como «te necesita».

## Scope boundaries

**In:** `src/renderer/components/Terminal.tsx`, `src/main/pty.ts` (attach), `resources/claude-hook.mjs` y `resources/summarise.mjs` (el `kind`, permisos, preguntas completas), `src/main/status.ts` (estado y respuestas), la tarjeta que sustituye a `QuickReplies.tsx` en la fila, en el resumen de agentes y encima de la terminal, el compositor, IPC y preload, textos.

**Out (nombrado):** el Agent SDK (cambio siguiente); detectar tareas de shell en segundo plano (solo subagentes); ⌘D/⌘⇧D (se quitan); la selección múltiple contestada con botones; «Permitir siempre»; cambiar Libretto; las terminales de QA (siguen como hoy, también de solo lectura) más allá de no aceptar teclado.

**Never scoped out:** la tarjeta y el compositor se manejan con teclado (números 1–4 contestan con la tarjeta enfocada, ⌘↩ envía el compositor); el texto del agente se pinta como texto, nunca como HTML; un fallo al mandar sigue la regla de errores; nada llama a Claude por su cuenta.

## Constraints

- Ningún cambio en `resources/libretto/**`.
- Textos por `t()`/`useT()` con su entrada en `src/preload/i18n-en.ts`; colores solo con tokens.
- Los estados de hoy sin `kind` siguen valiendo (se lee como hoy, por prefijo).
- Después de `notify-core`: este cambio se construye sobre su rama, porque los dos tocan el gancho y `status.ts`.

## Prior decisions

- **Terminal de solo lectura** (Pau, 12 nov): ninguna entrada de la persona pasa por el xterm.
- **Libretto no cambia** (assumed): Atril se adapta a cómo pregunta Libretto, nunca al revés.
- **`kind` en el estado** (assumed): amplía, no sustituye, el prefijo del texto de `notify-core`.
- **Teclas por tmux como transporte** (assumed). Techo: depende del dibujo de la TUI de Claude Code; el Agent SDK lo sustituye.

## Task breakdown

- Terminal de solo lectura (attach `-r`, xterm sin entrada).
- Gancho: `kind`, permiso con herramienta y orden, todas las preguntas con descripción, espera inactiva sin cambiar nada.
- Fin de turno con trabajo en segundo plano.
- La tarjeta por tipo, en la fila, el resumen y encima de la terminal.
- El compositor.
- Textos, app real, bocetos.

## Verification criteria

Deltas for other capabilities: `spec-avisos.md` (V3) and `spec-flow-status.md` (F25). The prose of workspaces line 35 («accepts typing as a real terminal does») becomes: «The centre column shows the agent's pane live, read-only: everything the person says to the agent goes through Atril (cards and the composer).» The next paragraph (⌘D / ⌘⇧D split into a shell pane) is removed: «Abrir en Terminal» opens a writable shell instead.

- **W196** The Trabajo terminal shall attach to the agent's tmux session as a read-only client (`tmux attach -r`) and send no keystroke, paste or mouse input to it, including the shell panes an earlier ⌘D left in the session; selecting text and ⌘C still copy. Main shall ignore `atril:term:input`, and ⌘D / ⌘⇧D shall do nothing.
  Proof: src/main/pty.test.ts the terminal client is read only
  Proof: src/renderer/components/terminal.test.tsx typing in the terminal sends nothing
- **W197** When the hook writes `needs-you`, it shall also write `kind`: `question` for a `PreToolUse` of `AskUserQuestion`, `permission` for a `Notification` with `notification_type` `permission_prompt` or a message starting «Claude needs your permission», and `turn-end` for `Stop`; an idle reminder (`idle_prompt` or «waiting for your input») shall leave `kind` as it was and set `idle: true` (W195 amended below).
  Proof: src/main/agent.test.ts the hook says what kind of wait it is
- **W74** (amended) When the hook gets a PreToolUse for `AskUserQuestion`, it shall add to the needs-you state every question of the call in order as `{ question, header, options: [{ label, description }], multiSelect }`, labels and descriptions whole with whitespace collapsed; the stored questions shall stay while the state stays needs-you (a later Notification or Stop included) and go when it leaves needs-you.
  Proof: src/main/agent.test.ts the hook keeps every question and what a permission is for
- **W198** On every PreToolUse the hook shall remember, per session, the tool name and a one-line summary of its input (the command for `Bash`, the path for `Edit`/`Write`/`MultiEdit`, else nothing); when it writes a `permission` wait it shall store that pair as `{ tool, summary }`.
  Proof: src/main/agent.test.ts a permission names the tool it waits for
- **W195** (amended) When Claude Code's idle reminder fires (a `Notification` with `notification_type` `idle_prompt` or «waiting for your input») while the session's state file says `needs-you`, the hook shall keep that file's `text`, `kind`, `questions`, `permission` and `at` as they were and set `idle: true`.
  Proof: src/main/agent.test.ts the idle reminder keeps the question
- **W199** While a session is in `needs-you` with `kind` `turn-end` and its subagents file holds an entry without `endedAt`, Atril shall show it as `working` with the activity «Esperando a un subagente» and add no notice; on the first poll after the last entry ends, the state counts as entering `needs-you` (W15). Background shells are out of this change (Scope).
  Proof: src/main/status.test.ts a turn end with a subagent still running is working
- **W75** (amended) When the window asks `atril:status:answer(workspaceId, choice)`, main shall re-read that workspace's state and, while it is needs-you, act by the choice: `{ option: n, question: i }` for a stored question i with option n — type n plus one then Enter, and after the last question of the call also Enter to submit; `{ allow: true }` while `kind` is `permission` — type `1` then Enter; `{ deny: true }` while `kind` is `permission` — press Escape; `{ continue: true }` — paste «Sigue con el plan; no hagas nada que no esté en él.» as a bracketed paste then Enter. Any other shape, a stale question index or option, or a state that is not needs-you, shall type nothing and answer «Ese agente ya no está esperando una respuesta.» or «Esa opción ya no existe.»; a gone workspace or pane answers W53's sentence. Main shall remember per session which question is next, starting at 0 on each entry into needs-you.
  Proof: src/main/status.test.ts each answer shape sends its own keys
  Proof: src/main/status.test.ts allow and deny send their keys
- **W76** (amended) While a workspace is needs-you, its row and the strip above its terminal shall show one card by `kind` (W200–W202) instead of today's quick replies; pressing a button, by mouse or with keys 1–4 while the card has focus, shall send it (W75) and show «Enviado», disabling the card until the state changes, or show the error and keep it live.
  Proof: src/renderer/components/agentcard.test.tsx a card answers by mouse and by number keys
- **W200** For a `question`, the card shall show the next unanswered question, its header and each option as a button with its number, label and description, the option whose label ends «(Recommended)» or «(Recomendado)» marked «Recomendada» without that suffix; for `multiSelect` it shows the options without buttons and «Contesta por escrito abajo».
  Proof: src/renderer/components/agentcard.test.tsx a question card answers with its options
- **W201** For a `permission`, the card shall read «Quiere ejecutar {summary}» (or «Quiere usar {tool}», or «Quiere permiso para seguir» with no tool) with «Permitir» and «Denegar».
  Proof: src/renderer/components/agentcard.test.tsx a permission card allows or denies
- **W202** For a `turn-end`, the card shall show «Ha terminado: {last text}» with «Sigue» (`{ continue: true }`) and focus the composer; while `idle` is true it adds «Lleva un rato esperándote».
  Proof: src/renderer/components/agentcard.test.tsx a turn end offers to continue
- **W203** No row, card, notification or Avisos text shall contain the hook's English messages «Claude needs your permission» or «Claude is waiting for your input».
  Proof: src/main/status.test.ts claude's english wait messages never reach the person
- **W204** Under the terminal, the composer «Escribe al agente» shall send its trimmed text to the pane as a bracketed paste followed by Enter with «Enviar», or ⌘↩ while the composer has focus (elsewhere N2 and W79 keep ⌘↩), clear itself on success, keep the text and show the error (Problem) on failure, and send nothing when empty or when the workspace is stopped.
  Proof: src/renderer/components/composer.test.tsx the composer sends to the agent
- **W205** While a workspace is in Automático, when it enters `needs-you` with `kind` `question` and no question of the call is `multiSelect`, Atril shall answer every question with the option marked recommended (else the first), by itself, adding no notice and showing no card, and show «Decidió: {label}» in the row's activity; a call with a `multiSelect` question stops as Manual does.
  Proof: src/main/status.test.ts automatic answers its own questions with the recommended option
- **W206** While a workspace is in Automático, when it enters `needs-you` with `kind` `turn-end` and W199 does not hold, Atril shall send `{ continue: true }` by itself, adding no notice, at most 3 times in a row; the count restarts only after the agent has been `working` for 30 s without a break; the fourth time it shows the card and notifies as Manual does.
  Proof: src/main/status.test.ts automatic keeps going on its own and stops where it must
- **W207** While a workspace is in Automático, a `permission` wait — including W59's push question — shall show its card and notify as Manual does.
  Proof: src/main/status.test.ts automatic never grants a permission by itself
- **W45** (amended) When a PostToolUse for Edit, Write, MultiEdit or Bash ends and the workspace's branch has more than 400 × k changed lines against its base, with k higher than any k already claimed in that session, the hook shall claim k and print nothing to Claude; F25 offers the split to the person.
  Proof: src/main/agent.test.ts a big branch is claimed without asking claude

## Approach

### Summary
Tres capas. **Gancho**: añade `kind`, las preguntas completas y el resumen del permiso al estado. **Main**: `pty.attach` con `-r`, `status` usa `kind` (y el trabajo en segundo plano) y añade `allow`/`deny` y `compose` a las respuestas. **Ventana**: `AgentCard.tsx` sustituye a `QuickReplies.tsx` en la fila, el resumen y encima de la terminal; `Composer.tsx` bajo la terminal; `Terminal.tsx` sin `onData`.

### Technical context
- Entrada hoy: `Terminal.tsx:43` `onData` → `atril:term:input` → `pty.ts:40` (cliente tmux completo). Teclas desde main: `tmux.ts` `sendText`/`sendKey`/`pressKey`/`pasteText`.
- Gancho: `resources/claude-hook.mjs` (eventos en `agent.ts:10`, estado :184–189, `quickReplies` :121–138), `resources/summarise.mjs` (:16, :77–86).
- Respuestas: `status.ts` `answerAgent` :96–109, `quickReplies` :81–85; `QuickReplies.tsx`, montado en `WorkspaceList.tsx:98` y `AgentsOverview.tsx:108`.
- Subagentes: `$ATRIL_HOME/subagents/<session>.json` (entradas sin `endedAt` siguen vivas).
- Specs: prosa de `workspaces` l. 35 («accepts typing as a real terminal does») cambia; W74–W76 se amplían.

### The approach
1. `tmux attach -r` y fuera `onData`: la ventana no puede escribir aunque quiera.
2. El gancho escribe `kind` y los datos completos; main lee `kind` y, si falta, el prefijo de hoy.
3. Una sola tarjeta por tipo de espera; cada botón llama a `status.answer` con una acción (`option`, `allow`, `deny`, `continue`) que main traduce a teclas.
4. El compositor usa `pasteText` (pegado entre corchetes, conserva saltos de línea).

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| Agent SDK ya | reescribe tmux, pausa, reabrir y respuestas; Pau eligió paso a paso |
| Dejar la terminal escribible con un aviso | Pau: «deberían ser solo lectura» |
| Hook `PermissionRequest` que decide él | bloquea el gancho esperando a Atril; las teclas ya funcionan y el SDK lo resolverá con datos |

### Risks
| Risk | Mitigation |
|---|---|
| La TUI cambia el orden de las opciones del permiso | «Permitir» = `1` es la primera opción desde siempre; la prueba en la app real lo comprueba con Claude de verdad |
| Varias preguntas: la TUI espera un «Enviar respuestas» final | se prueba en la app real; si hace falta, el último botón manda también Enter |
| Detectar tareas en segundo plano en el transcript | si no se entiende la cola, se queda en `needs-you` como hoy (falla hacia lo de hoy) |

### Validation and rollback
Tests en rojo primero; la app real con `claude` falso para tarjetas y teclas, y una sola sesión con Claude real para el permiso y la pregunta múltiple (cuesta poca cuota). Rollback: un revert.

### Complexity deliberately kept
Ninguna.

## Checklist

- [x] Terminal de solo lectura: `attach -r`, sin `onData`, main ignora `atril:term:input` · Closes: W196
- [x] Gancho: `kind`, preguntas completas, resumen del permiso · Closes: W197, W74, W198, W195
- [x] `status`: trabajo en segundo plano, acciones `allow`/`deny`/`continue`, sin textos en inglés · waits on box 2 · Closes: W199, W75, W203
- [ ] `AgentCard` en la fila, el resumen y encima de la terminal · waits on box 3 · Closes: W76, W200, W201, W202
- [ ] Compositor «Escribe al agente» · waits on box 1 · Closes: W204
- [ ] Automático sigue solo: recomendada, «Sigue con el plan; no hagas nada que no esté en él.» con tope, paradas de W59 y permisos · waits on box 3 · Closes: W205, W206, W207, V3
- [ ] Aviso de rama grande con sus dos botones; el gancho deja de avisar a Claude · waits on box 5 · Closes: F25, W45
- [ ] Textos en inglés, S16/S19; app real; `bocetos/novedades.html` y `bocetos/fase1-nucleo.html` · waits on boxes 1–5
