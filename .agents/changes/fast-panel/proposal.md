# fast-panel

Tracker: none
Targets: flow-status
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> Abre un agente nuevo. Y que ese agente nuevo compruebe la app y mire y vaya apuntando fallos … y tú lo vas solventando.

Hallazgo 9 de `bocetos/hallazgos.md`: con 4 trabajos, las casillas tardan 11 s y el código de una casilla 10–20 s. Medido el 11 nov en la app real (informe en el scratchpad, `perf-*`): cada proceso git cuesta ~125 ms en este Mac (fijo, antivirus probable); `flow.boxes` 4,7–6,3 s (~21 procesos), `flow.boxDiff` 3,9–5,3 s (~15: rehace el plan entero), `ws.list` 0,4–1,25 s (N `tmux has-session`), 11 procesos por segundo en reposo con 4 trabajos.

## Decision log

### Session 2026-11-11
- Q: (revisión en frío) ¿Qué tramos se guardan? → A: solo los cerrados por un commit (con `to`); el tramo abierto y los marcados solo en el árbol de trabajo se listan siempre, con sus cambios sin commitear (assumed).
- Q: (revisión en frío) ¿Qué clave exacta? → A: carpeta, cambio, `baseCommit`, `HEAD`, y del archivo del checklist que se lea (`proposal.md`, `tasks.md` o `plan.md`) su ruta, `mtimeMs` y tamaño; dos ediciones en el mismo milisegundo con el mismo tamaño quedan como riesgo aceptado (assumed).
- Q: (revisión en frío) ¿Cuándo se vacía? → A: al cerrar u olvidar el trabajo (`flow.forget`), y la caché nunca guarda más que los trabajos abiertos (assumed).
- Q: (revisión en frío) `useFlow.ts` → A: fuera: el ahorro está en main (assumed).
- Q: ¿Qué se arregla? → A: las tres causas medidas: el plan de casillas en caché, una sola llamada a tmux por vuelta, y menos sondeo en reposo (assumed).
- Q: ¿Con qué clave la caché del plan? → A: carpeta, `HEAD`, nombre del cambio y fecha de modificación del documento del checklist; los tramos ya cerrados por un commit no cambian nunca (assumed).
- Q: ¿Cuánto se espera para juntar avisos de archivos? → A: 200 ms (assumed).

## Outcomes

- Elegir un trabajo enseña sus casillas, y abrir el código de una casilla, sin rehacer todo el trabajo de git cada vez.
- El estado de los agentes cuesta un proceso por vuelta, no dos por trabajo.
- En reposo, Atril lanza muchos menos procesos.

## Scope boundaries

**In:** `src/main/flow/boxes.ts`, `src/main/flow/changes.ts`, `src/main/flow/watch.ts` (si hace falta la clave), `src/main/status.ts`, `src/main/tmux.ts`, `src/main/activity.ts`, `src/main/workspaces.ts` (`listWorkspaces` con la foto de tmux). **Out:** cambiar el antivirus o el git del Mac; reescribir el panel; los sondeos de MR y Jira.

## Constraints

- Nada se enseña viejo: un commit nuevo, un cambio del checklist o un archivo tocado en el tramo abierto se ven en la siguiente vuelta.
- Las cachés viven en memoria de main y se vacían al cerrar un trabajo.

## Prior decisions

- Spawning es caro en el Mac de la persona (~125 ms): Atril cuenta procesos; lo que no cambia se guarda en memoria con una clave que cambia cuando debe.

## Verification criteria

- **F42** When `boxDiff` is asked for a file of a box closed by a commit and the plan key is unchanged since the last `boxRanges`, the flow shall run exactly two git commands: one reading `HEAD` and the file's diff over that range — no `log`, `show` or listing.
  Proof: src/main/flow/boxes.test.ts a closed box's diff costs two git commands once planned
- **F43** When `boxRanges` is asked again with the plan key unchanged, the flow shall run no `git log`, no `git show` and no listing of a range closed by a commit; the whole branch and every range without a commit are listed again, so an uncommitted edit shows on the next read.
  Proof: src/main/flow/boxes.test.ts a second read with nothing new reuses the closed ranges
  Proof: src/main/flow/boxes.test.ts an uncommitted edit shows on the next read
- **F44** When `HEAD`, the base commit, or the checklist file's path, mtime or size changes, the next `boxRanges` or `boxDiff` shall plan again; closing or forgetting a workspace drops its cached plans.
  Proof: src/main/flow/boxes.test.ts a new commit or checklist edit plans again

## Approach

### Summary

Memoria en main con claves baratas: `git rev-parse HEAD` y `stat` del checklist. Una foto de tmux por segundo compartida. Un `debounce` en los observadores.

### Technical context

`src/main/flow/**` (flow-status), `src/main/{status,tmux,activity,workspaces}.ts` (workspaces). Tests con un `Runner` espía que cuenta procesos. Un delta `spec-workspaces.md` lleva W163 y W164.

### The approach

- `plan()` se guarda en un `Map` por `path+change` con la clave del Decision log y `files: Map<from..to, FileChange[]>` solo para tramos con `to`; `boxRanges` y `boxDiff` leen primero `rev-parse HEAD` y el `stat`. `fileDiff` recibe la lista ya conocida del tramo y no vuelve a llamar a `entries()`.
- `tmux.ts`: `panes(run)` → un `list-panes -a -F '#{session_name} #{pane_id} #{pane_dead}'`, guardado 1 s; `hasSession`, `hasPane` y `paneDead` lo leen.
- `status.ts` y `activity.ts`: `watch` con temporizador de 200 ms.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Un proceso git largo (`git cat-file --batch`) | más código y estado; la caché quita la mayoría sin eso |
| Sondear menos a menudo | lo nuevo tardaría más en verse; la caché no lo retrasa |

### Risks

| Risk | Mitigation |
|---|---|
| Algo se queda viejo | la clave incluye `HEAD` y el `mtime` del checklist; F43 prueba que un commit o una edición vuelven a planear |
| La foto de tmux de 1 s dice «vivo» a un agente que acaba de morir | como mucho 1 s más tarde, igual que hoy con el sondeo de 2 s |

### Validation and rollback

Tests rojos contando procesos; la app real con el arnés de rendimiento (`perf-*` del scratchpad) antes y después. Un revert.

### Complexity deliberately kept

Las cachés con clave: sin ellas, cada proceso cuesta 125 ms en el Mac de la persona.

## Checklist

- [x] el plan de casillas en caché · Closes: F42, F43, F44
- [x] una foto de tmux por vuelta · Closes: W163
- [x] los observadores juntan ráfagas · Closes: W164
