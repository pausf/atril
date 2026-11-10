# first-run-setup

Tracker: none
Targets: workspaces
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> sigue creando funcionalidades. Tenemos que hacer el mejor gestor de IA, o sea, de orquestador y revisor de MRs, etcétera, porque lo queremos poner para que la gente le sea útil.

## Reading

Primer arranque para alguien nuevo: una lista de puesta en marcha (herramientas, conectar Jira y forja, añadir un repo, primer trabajo) que se marca sola y desaparece al completarse. Sin esto, un desconocido abre Atril vacío.

## Decision log

### Session 2026-11-10
- Q: ¿Qué ve alguien nuevo? → A: en Trabajo, mientras no haya trabajos, una tarjeta «Primeros pasos» en lugar del
  vacío de hoy, con cinco pasos que se marcan solos leyendo el estado real (assumed):
  1. «Herramientas listas» — el doctor sin problemas (W21); si no, «Instalar» abre su aviso (W70/W71).
  2. «Añade un repo» — al menos un repo registrado; botón a Ajustes → Repos.
  3. «Conecta Jira» (opcional) — token guardado (S5); botón a Ajustes → Conexiones.
  4. «Conecta GitHub o GitLab» (opcional) — una forja guardada; mismo botón.
  5. «Abre tu primer trabajo» — botón «Nuevo trabajo».
- Q: ¿Cuándo desaparece? → A: cuando hay al menos un trabajo, o al pulsar «Ya lo tengo»; recordado en el estado de
  la interfaz (`setupDismissed`) (assumed).
- Q: ¿Y el tutorial? → A: sigue igual (W23): el tutorial explica; la tarjeta deja la app lista. El tutorial va
  primero; la tarjeta aparece al cerrarlo (assumed).
- Q: ¿Opcionales? → A: Jira y forja se marcan «opcional» y no impiden terminar (assumed).

## Outcomes

- Alguien que abre Atril por primera vez ve qué falta para empezar, cada cosa con su botón, y los pasos se marcan
  solos según lo va haciendo.

## Scope boundaries

**In:** la tarjeta, sus cinco pasos leídos del estado real, los botones, «Ya lo tengo» recordado.
**Out:** instalar herramientas desde la tarjeta sin el doctor; crear el token por la persona; un asistente modal.
**Never scoped out:** teclado; textos por `t()`; nada se hace sin pulsar.

## Prior decisions

- Tarjeta en el vacío de Trabajo, no un asistente modal (assumed, 10 nov).
- Jira y forja opcionales (assumed, 10 nov).
- Tutorial primero, tarjeta después (assumed, 10 nov).

## Verification criteria

- **W97** While Trabajo has no workspace and `setupDismissed` is not set, it shall show «Primeros pasos» with the
  five steps of the Decision log, each marked done from the live state — no doctor problem, at least one repo, a
  saved Jira token, a saved forge, a workspace — the third and fourth marked «opcional», each undone step with a
  button that goes where it is done; «Ya lo tengo» shall set `setupDismissed` and hide it; the card shall not show
  while the tutorial runs. One test holds a case per clause.
  Proof: src/renderer/setup.test.ts a new person sees what is left to start

## Checklist

- [ ] the card, its live steps, buttons and dismiss; tutorial order; sketch; photo; novedades · Closes: W97
