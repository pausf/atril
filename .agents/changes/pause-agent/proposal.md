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
  Escape to that workspace's pane and record it as paused, and its row and card shall read «en pausa»; pausing
  shall be offered only while the state is working.
  Proof: src/main/pause.test.ts pausing interrupts only that agent
- **W87** When the person resumes a paused workspace, main shall type «Sigue donde lo dejaste.» then Enter into
  its pane and clear the pause; the pause shall also clear by itself when the hook reports a new state.
  Proof: src/main/pause.test.ts resuming asks the agent to go on

## Checklist

- [ ] pause and resume in main with the paused mark · Closes: W86, W87
- [ ] menu, ⌘⇧P, row and card; sketch; photo · waits on box 1
