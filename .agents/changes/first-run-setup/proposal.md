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

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **Cuándo sale.** Mientras no haya ningún trabajo en la lista (también los parados; corregido al construir), el historial (W96) esté vacío y no exista
    `setupDismissed`. Quien ya trabajó no la vuelve a ver.
  - **El paso 5** es solo su botón «Nuevo trabajo». Nunca sale marcado, porque la tarjeta se va en cuanto hay
    un trabajo.
  - **El paso 1** está hecho cuando git, tmux y claude no tienen problema; jira es del paso 3, que es opcional.
    Mientras llega el informe del doctor, el paso dice «Comprobando…». Su botón abre la lista del aviso de
    herramientas (W32), donde está «Instalar».
  - **El paso 4** está hecho con cualquier forja guardada, GitHub o GitLab.
  - **El tutorial.** Mientras está abierto, en el primer arranque o desde Ayuda, la tarjeta no se ve; sale al
    cerrarlo. W23 y W24 no cambian.
  - **«Ya lo tengo»** guarda `setupDismissed` en `ui.json`, validado como `tutorialSeen`, y se recuerda al
    reiniciar.
  - **El estado real** sale de llamadas que ya existen y no exponen tokens: `doctor()`, `repos.list()`,
    `settings.jira.status()` y `settings.forge.status(forge)`, todas con su `saved`.
  - **Los botones de Ajustes** usan la navegación que ya usa M35 («Ajustes → Repos»).
  - **La foto** se saca con `ATRIL_SNAPSHOT_VIEW=work`, un `ATRIL_HOME` vacío y `tutorialSeen: true`.

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

- **W97** While Trabajo has no workspace record (stopped ones included), the history (W96) is empty, `setupDismissed` is not set and the
  tutorial is not open, it shall show «Primeros pasos» with five steps — 1 git, tmux and claude without a doctor
  problem («Comprobando…» until the report arrives; its button opens W32's list), 2 at least one repo, 3 a saved
  Jira token («opcional»), 4 a saved GitHub or GitLab token («opcional»), 5 «Nuevo trabajo» (a button, never
  marked) — each of 1–4 marked done from the live state, with a button where it is done while undone; «Ya lo
  tengo» shall set `setupDismissed`, kept across restarts. One test holds a case per clause.
  Proof: src/renderer/setup.test.ts a new person sees what is left to start

## Checklist

- [x] the card, its live steps, buttons and dismiss (with setupDismissed in ui.json); tutorial order; sketch; photo; novedades · Closes: W97
