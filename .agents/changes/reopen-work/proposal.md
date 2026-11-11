# reopen-work

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> busca todos lo posibles fallos es decir intentar cargarte la aplicacion para arreglar lo que fall
> haz todas

Hallazgo 8 de la vuelta por la app y 3/28 de `bocetos/romper.md`: cuando muere la sesión de tmux (reinicio del Mac, `tmux kill-server`), el trabajo queda «parado» con la terminal negra y sin salida; recrear la rama falla porque ya existe. Y la idea 2 del artículo de modelos: antes de cambiar de modelo, subir el esfuerzo un nivel.

## Decision log

### Session 2026-11-11
- Q: (prueba en la app real) al matar tmux, `term:resize` llega a un cliente muerto, node-pty lanza EBADF y Electron bloquea la app con «A JavaScript error occurred in the main process» → A: se arregla aquí (W149): el cliente muerto se olvida y nada de la terminal lanza.
- Q: (revisión en frío) ¿Y el modo auto? → A: su marca `auto/<sesión>` sobrevive a la sesión muerta (solo `dropFiles` la borra): reabrir no la toca.
- Q: (revisión en frío) ¿Y los trabajos abiertos con un `argv` a medida? → A: `input.argv` solo lo usan los tests; todo trabajo real sale de `agentArgv`, y reabrir usa `agentArgv`.
- Q: (revisión en frío) ¿`--continue` sin conversación? → A: solo se pone si Atril tiene apuntado un transcript del trabajo (`transcripts/<sesión>`); si no, arranca de cero (assumed).
- Q: (revisión en frío) ¿Sesión viva con el agente muerto (W16)? → A: también se reabre: primero se cierra esa sesión (assumed).
- Q: (revisión en frío) orden con `model-pick` → A: esta rama sale de `model-pick` aterrizado; `--continue` va tras `--plugin-dir`, antes de `--model` y `--effort`.
- Q: ¿Cómo se relanza? → A: una sesión de tmux nueva con el mismo id, en la misma carpeta, con `claude --continue` (la última conversación de esa carpeta), el mismo modelo, esfuerzo y modo auto (assumed).
- Q: ¿Qué es «más esfuerzo»? → A: un nivel más que el guardado: por defecto o medio → alto, bajo → medio, alto → muy alto; con muy alto no se ofrece (assumed, del artículo).
- Q: ¿Se ofrece con el agente vivo? → A: no: reiniciar a un agente que trabaja corta lo que hace; solo con la sesión muerta (assumed).

## Outcomes

- Un trabajo parado dice por qué está parado y trae «Volver a abrir»; al pulsarlo, la terminal vuelve con el agente siguiendo su conversación.
- «Seguir con más esfuerzo» hace lo mismo un nivel por encima y lo recuerda.
- Un trabajo parado no enseña «Escribe en la terminal como siempre».

## Scope boundaries

**In:** `src/main/pty.ts` (W149), `reopenWorkspace` en `src/main/workspaces.ts`, `agentArgv({ resume: true })` en `agent.ts`, IPC `atril:ws:reopen`, la vista parada de `Workspace.tsx`. **Out:** relanzar todos los parados de golpe; subagentes cortados (hallazgo 12); reiniciar un agente vivo.

## Constraints

- La ventana manda el id y, como mucho, `more: true`; main decide el comando.
- Nunca dos sesiones para un trabajo: si la sesión existe, no se relanza.

## Prior decisions

- Un trabajo parado se retoma con `claude --continue` en su carpeta; más esfuerzo es un nivel más, nunca otro modelo.

## Verification criteria

- **W141** When reopening a workspace is asked by id while its agent is stopped — no session, or a session whose recorded pane is dead (W16), which is ended first — and its folder exists, Atril shall start a tmux session with the same name in that folder running `agentArgv` with the record's model and effort, plus `--continue` only when a transcript is recorded for it (`transcripts/<session>`), leaving its auto marker as it is, store the new pane id, and answer the workspace as alive; with `more: true` the effort goes one level up (none or `medium` → `high`, `low` → `medium`, `high` → `xhigh`) and is stored.
  Proof: src/main/workspaces.test.ts a stopped work reopens where it was
- **W142** If reopening is asked for an unknown id, a workspace whose agent is not stopped, a folder that no longer exists, or `more: true` at `xhigh`, then Atril shall start nothing and answer — «Ese trabajo ya no existe», «Este trabajo ya está abierto.», «La carpeta de {branch} ya no existe.» with `fix: 'forget'`, «Ya está en el esfuerzo más alto.»; if tmux fails to start, it shall end any half-made session and answer «tmux no ha podido arrancar el agente.» with the message as `detail` and `fix: 'terminal'`.
  Proof: src/main/workspaces.test.ts reopening refuses what it cannot do
- **W143** While the selected workspace's agent is stopped (dead session, or dead pane: the bar then sits above the terminal), the centre shall show «{branch} está parado: su sesión de tmux ya no existe (un reinicio o tmux cerrado).», «Su agente no sigue hasta que lo vuelvas a abrir.», a «Volver a abrir» button and, below `xhigh`, «Seguir con más esfuerzo»; the terminal tip shall not show; both buttons are disabled while a reopen runs, so a second click sends nothing; a refusal shows with `Problem`, its button as in W135.
  Proof: src/renderer/reopen.test.ts a stopped work offers to reopen

- **W149** If the terminal's tmux client has exited or its descriptor is closed, then typing, resizing or detaching that terminal shall do nothing and never throw, and an exited client shall be forgotten so nothing more is sent to it.
  Proof: src/main/pty.test.ts a dead terminal client never throws

## Approach

### Summary

`reopenWorkspace(id, { more })` reutiliza `newSession` y `agentArgv` con `resume`. La vista parada pinta dos botones y llama a la IPC; al volver, la lista se refresca y la terminal se engancha sola porque `alive` pasa a `true`.

### Technical context

`src/main/{workspaces,agent,index}.ts`, `src/preload/{api,index}.ts`, `src/renderer/components/Workspace.tsx`, `src/renderer/App.tsx` (refrescar la lista), i18n. Tests en `workspaces.test.ts` (tmux real) y `reopen.test.ts` nuevo.

### The approach

`agentArgv({ resume: true })` pone `--continue` antes del modelo. `reopenWorkspace` comprueba registro, sesión (`hasSession`), carpeta (`lstat`), calcula el esfuerzo, llama a `newSession`, guarda `paneId` y `effort` con `writeRecords`.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| `claude --resume <id>` con el id de sesión guardado | Atril no guarda el id de la conversación; `--continue` toma la última de esa carpeta, que es la del trabajo |
| Abrir un trabajo nuevo en la misma rama | pierde la conversación y choca con la rama que ya existe |

### Risks

| Risk | Mitigation |
|---|---|
| Otra conversación más reciente en la misma carpeta | la carpeta es del trabajo (worktree); en un repo in-place puede tomar otra: el agente lo dirá en su terminal |

### Validation and rollback

Tests rojos primero; la app real matando el servidor de tmux y pulsando «Volver a abrir» (el claude falso apunta sus argumentos en `claude-calls.log`). Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] la terminal no lanza con tmux muerto · Closes: W149

- [x] reabrir en main (sale de `model-pick` aterrizado), con más esfuerzo y sus rechazos · Closes: W141, W142
- [x] la vista parada con sus dos botones · waits on box 1 · Closes: W143
