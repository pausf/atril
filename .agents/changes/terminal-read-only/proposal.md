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

## Outcomes

- La terminal de cada trabajo se ve en vivo y se puede seleccionar y copiar, pero ninguna tecla llega al agente.
- Cuando el agente espera, Atril dice qué espera, en castellano, con botones: una pregunta con sus opciones y su porqué; un permiso con lo que quiere ejecutar; un fin de turno con lo que ha dicho; nunca «Claude needs your permission» ni «Claude is waiting for your input».
- Debajo de la terminal, una caja «Escribe al agente» manda cualquier mensaje.
- En Automático no sale ninguna tarjeta: Atril elige la recomendada y dice «Sigue con el plan; no hagas nada que no esté en él.» solo, y en la fila queda «Decidió: {opción}»; solo se para en el push y la MR, en un fallo de verdad o en un permiso que Claude Code no concede solo.
- Un agente que acaba su turno mientras sigue con subagentes o tareas en segundo plano sale como «trabajando», no como «te necesita».

## Scope boundaries

**In:** `src/renderer/components/Terminal.tsx`, `src/main/pty.ts` (attach), `resources/claude-hook.mjs` y `resources/summarise.mjs` (el `kind`, permisos, preguntas completas), `src/main/status.ts` (estado y respuestas), la tarjeta que sustituye a `QuickReplies.tsx` en la fila, en el resumen de agentes y encima de la terminal, el compositor, IPC y preload, textos.

**Out (nombrado):** el Agent SDK (cambio siguiente); la selección múltiple contestada con botones; «Permitir siempre»; cambiar Libretto; las terminales de QA (siguen como hoy, también de solo lectura) más allá de no aceptar teclado.

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

- **W196** The Trabajo terminal shall attach to the agent's tmux session as a read-only client (`tmux attach -r`) and send no keystroke, paste or mouse input to it; selecting text and ⌘C still copy. Main shall ignore `atril:term:input`.
  Proof: src/main/pty.test.ts the terminal client is read only
  Proof: src/renderer/components/terminal.test.tsx typing in the terminal sends nothing
- **W197** When the hook writes `needs-you`, it shall also write `kind`: `question` for a `PreToolUse` of `AskUserQuestion`, `permission` for a `Notification` with `notification_type` `permission_prompt` or a message starting «Claude needs your permission», `idle` for `idle_prompt` or «waiting for your input», and `turn-end` for `Stop`.
  Proof: src/main/agent.test.ts the hook says what kind of wait it is
- **W198** For a `question`, the hook shall store every question of the call in order as `{ question, header, options: [{ label, description }], multiSelect }`, labels and descriptions kept whole (no 40-character cut), and for a `permission` the tool name and a one-line summary of its input (the command for `Bash`, the path for `Edit`/`Write`).
  Proof: src/main/agent.test.ts the hook keeps every question and what a permission is for
- **W199** While a session is in `needs-you` with `kind` `turn-end`, if its subagents file holds an entry without `endedAt` or its transcript tail shows a background shell started and not finished, Atril shall show it as `working` with the activity «Esperando a una tarea en segundo plano» and not notify.
  Proof: src/main/status.test.ts a turn end with background work still running is working
- **W200** For a `question`, the card shall show the question, its header, each option as a button with its number, label and description, and the option whose label ends «(Recommended)» marked «Recomendada» without that suffix; pressing one shall answer W75's `{ option }`; with several questions the card shows the next one after each answer; for `multiSelect` it shows the options without buttons and «Contesta por escrito abajo».
  Proof: src/renderer/components/agentcard.test.tsx a question card answers with its options
- **W201** For a `permission`, the card shall read «Quiere ejecutar {summary}» (or «Quiere usar {tool}») with «Permitir» (sends `1`) and «Denegar» (sends Escape).
  Proof: src/renderer/components/agentcard.test.tsx a permission card allows or denies
  Proof: src/main/status.test.ts allow and deny send their keys
- **W202** For a `turn-end`, the card shall show «Ha terminado: {last text}» with «Sigue» (sends «Sigue con el plan; no hagas nada que no esté en él.») and focus the composer; for `idle`, the row keeps the card it had (W195) and adds «Lleva un rato esperándote».
  Proof: src/renderer/components/agentcard.test.tsx a turn end offers to continue
- **W203** No row, card, notification or Avisos text shall contain the hook's English messages «Claude needs your permission» or «Claude is waiting for your input».
  Proof: src/main/status.test.ts claude's english wait messages never reach the person
- **W204** Under the terminal, the composer «Escribe al agente» shall send its trimmed text to the pane as a bracketed paste followed by Enter with ⌘↩ or «Enviar», clear itself on success, keep the text and show the error (Problem) on failure, and send nothing when empty or when the workspace is stopped.
  Proof: src/renderer/components/composer.test.tsx the composer sends to the agent

- **W205** While a workspace is in Automático, when it enters `needs-you` with `kind` `question`, Atril shall answer the option marked «(Recommended)» (else the first) by itself, without a card or a notification, and show «Decidió: {label}» in the row's activity; a `multiSelect` question shall be answered by typing its recommended labels, else stop as Manual does.
  Proof: src/main/status.test.ts automatic answers its own questions with the recommended option
- **W206** While a workspace is in Automático, when it enters `needs-you` with `kind` `turn-end` or `idle` and W199 does not hold, Atril shall send «Sigue con el plan; no hagas nada que no esté en él.» by itself, at most 3 times in a row without a hook event of `working` between them; the fourth time, or when the last text asks to push or open the MR (W59) or says a gate failed twice, it shall show the card and notify as Manual does.
  Proof: src/main/status.test.ts automatic keeps going on its own and stops where it must
- **W207** While a workspace is in Automático, a `permission` wait shall show its card and notify as Manual does.
  Proof: src/main/status.test.ts automatic never grants a permission by itself

- **W208** While the branch is over the size threshold (F25), the warning shall carry «Separar en MRs encadenadas», which sends the agent «Separa esta rama en MRs encadenadas.» through the same path as the composer, and «Dejarla así», which hides the warning for that branch until it grows past the next threshold; the text shall no longer say that Claude was asked.
  Proof: src/renderer/flow/changes.test.ts a large branch offers to split it from the warning

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

- [ ] Terminal de solo lectura: `attach -r`, sin `onData`, main ignora `atril:term:input` · Closes: W196
- [ ] Gancho: `kind`, preguntas completas, resumen del permiso · Closes: W197, W198
- [ ] `status`: trabajo en segundo plano, acciones `allow`/`deny`/`continue`, sin textos en inglés · waits on box 2 · Closes: W199, W201, W203
- [ ] `AgentCard` en la fila, el resumen y encima de la terminal · waits on box 3 · Closes: W200, W202
- [ ] Compositor «Escribe al agente» · waits on box 1 · Closes: W204
- [ ] Automático sigue solo: recomendada, «Sigue con el plan; no hagas nada que no esté en él.» con tope, paradas de W59 y permisos · waits on box 3 · Closes: W205, W206, W207
- [ ] Aviso de rama grande con sus dos botones · waits on box 5 · Closes: W208
- [ ] Textos en inglés, S16/S19; app real; `bocetos/novedades.html` y `bocetos/fase1-nucleo.html` · waits on boxes 1–5
