# pause-agent

Tracker: none
Targets: workspaces
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> sigue creando funcionalidades. Tenemos que hacer el mejor gestor de IA, o sea, de orquestador y revisor de MRs, etcétera, porque lo queremos poner para que la gente le sea útil.

## Reading

Pausar un agente (lista del 9 nov): parar a Claude sin cerrar su sesión y reanudarlo después, desde la fila o el panel.

## Decision log

### Session 2026-11-10
- Q: ¿Cómo se pausa? → A: Esc en el panel del agente, que es como Claude Code interrumpe su turno sin cerrar la
  sesión; Atril apunta el trabajo como «en pausa» (assumed). Perdió: congelar el proceso (SIGSTOP), que puede
  cortar su conexión con la API a medias y dejar herramientas colgadas.
- Q: ¿Cómo se reanuda? → A: «Reanudar» escribe «Sigue donde lo dejaste.» y Enter, literal, como N3 (assumed).
- Q: ¿Dónde? → A: en el menú del trabajo (clic derecho y menú Trabajo → Pausar / Reanudar, ⌘⇧P) y en su
  tarjeta de «Todos»; la fila dice «en pausa» (assumed).
- Q: ¿Y si el agente te necesitaba? → A: pausar no cambia una pregunta pendiente: solo se ofrece mientras está
  trabajando (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **Qué es «en pausa».** Una marca aparte, no un cuarto estado. Vive en `$ATRIL_HOME/paused/<session>`
    y sobrevive a un reinicio, porque el Claude de verdad sigue parado.
    - Con la marca puesta, el estado efectivo de ese trabajo es «en pausa». Todo lo que lee el estado lo
      trata como parado: el orden de W81, el editor de F15 y la pastilla del foco.
    - El hook no la cambia: Claude Code no lanza Stop al interrumpirlo.
  - **Qué la quita:** solo un UserPromptSubmit (lo que escribes tú o «Reanudar») o pasar a needs-you. Un
    PreToolUse o PostToolUse que llega tarde no la quita.
  - **A qué panel va el Esc:** al panel del agente cuyo id guarda el registro, nunca a un panel dividido
    con ⌘D.
  - **Si el Esc no sirve.** Techo nombrado: si Claude no se para (una herramienta que lo ignora), la
    marca se quita en cuanto llegue otro estado que no sea `working`.
  - **Errores al reanudar:** si no está en pausa, «Ese agente no está en pausa.»; si el trabajo ya no
    está, el mensaje de N3.
  - **El menú** alterna entre «Pausar» y «Reanudar» con ⌘⇧P, que está libre.
  - **Prueba en la ventana:** fila, tarjeta y menú van en un criterio aparte, W88.
  - **Textos:** «en pausa», «Pausar» y «Reanudar» van por `t()`.

## Outcomes

- Un agente que trabaja se puede pausar: deja de trabajar, su sesión sigue viva y la fila dice «en pausa».
- «Reanudar» le pide que siga; la fila vuelve a «trabajando» cuando el agente se mueve.

## Scope boundaries

**In:** pausar y reanudar uno, el estado «en pausa», el menú, ⌘⇧P, la tarjeta.
**Out:** pausar todos a la vez; pausas programadas; liberar la cuota (la sesión sigue abierta).
**Never scoped out:** solo al pulsar; solo al panel de ese trabajo; teclado; el estado se escribe con texto (W22).

## Prior decisions

- Esc para pausar, texto literal para reanudar (assumed, 10 nov).
- Solo se pausa lo que trabaja (assumed, 10 nov).

## Verification criteria

- **W86** When the person pauses a working workspace (Trabajo → Pausar, ⌘⇧P, or its card), main shall send
  Escape to that workspace's recorded agent pane and write `$ATRIL_HOME/paused/<session>`; while that mark
  exists the workspace's effective state shall be paused, read as stopped by every consumer of the state; a
  PreToolUse or PostToolUse shall not clear it; pausing shall be refused unless the state is working. One
  test holds a case per clause.
  Proof: src/main/pause.test.ts pausing interrupts only that agent
- **W87** When the person resumes a paused workspace, main shall type «Sigue donde lo dejaste.» then Enter into
  its agent pane and remove the mark; a UserPromptSubmit or a needs-you state shall also remove it, except
  Claude Code's idle reminder (a Notification with `notification_type` idle_prompt or «waiting for your
  input»), which keeps it; resuming
  a workspace that is not paused shall answer «Ese agente no está en pausa.» and a gone one N3's message. One
  test holds a case per clause.
  Proof: src/main/pause.test.ts resuming asks the agent to go on

- **W88** While a workspace is paused, its row and its card shall read «en pausa», the Trabajo menu item shall
  read «Reanudar» (⌘⇧P) instead of «Pausar», and «Pausar» shall be disabled unless the selected workspace is
  working.
  Proof: src/renderer/pause.test.ts a paused agent reads en pausa and offers resume

## Approach

Una marca en archivo junto a los estados, leída por el mismo camino que ya lleva los estados a la ventana
(`agentState` → `AgentState` efectivo `paused`). Esc con `sendKey` al panel del registro; reanudar con el
envío literal de N3. Perdió: un cuarto estado escrito por el hook (Claude Code no avisa al interrumpirlo).

## Checklist

- [x] pause and resume in main with the paused mark · Closes: W86, W87
- [x] menu, ⌘⇧P, row and card; sketch; photo · waits on box 1 · Closes: W88
