# ws-errors

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> ves pues eso es un fallo asi que deberia estar mejor explicado, busca todos lo posibles fallos es decir intentar cargarte la aplicacion para arreglar lo que fall

Auditoría de errores (`bocetos/hallazgos.md`, puntos 1–3) y hallazgos 10, 11 y 31: abrir o cerrar un trabajo suelta el stderr de git o tmux en inglés, «Quitar» mata a un agente vivo sin preguntar y su error no se puede cerrar.

## Decision log

### Session 2026-11-11
- Q: (revisión en frío) ¿Y si git falla después de parar al agente? → A: el registro se queda y la frase dice que el agente ya está parado; no se reordena (assumed: `git worktree remove` sobre una carpeta con el agente vivo sería peor).
- Q: (revisión en frío) ¿Un `git status` que falla ofrece olvidar? → A: solo si la carpeta no existe; si existe, «Abrir en Terminal» (assumed).
- Q: (romper la app, hallazgo 1) ¿Olvidar deja la rama bloqueada por el worktree? → A: `git worktree prune` en el repo, que solo borra entradas cuya carpeta ya no está (assumed).
- Q: ¿Qué botón arregla un fallo de git al abrir o cerrar? → A: «Abrir en Terminal», que abre Terminal en la carpeta con `git status`; la ventana manda el id del repo o del trabajo, nunca una ruta (assumed).
- Q: ¿Y si la carpeta del trabajo ya no es un repo o no existe? → A: «Quitar de la lista igualmente»: cierra su sesión de tmux, borra el registro y sus archivos, no ejecuta git y no escribe historial (assumed).
- Q: ¿Cuándo se confirma «Quitar»? → A: solo con la sesión viva, en la propia fila; un trabajo parado se quita a la primera (assumed).

## Outcomes

- Ningún fallo al abrir o cerrar un trabajo enseña stderr en la frase: dice qué paso falló, qué no se ha hecho y trae su botón; la salida de git o tmux va en «Ver detalle».
- Cerrar un trabajo con el agente vivo pide confirmación en la fila.
- El aviso de un cierre rechazado se puede cerrar.

## Scope boundaries

**In:** `openWorktree` y `removeWorkspace` (`src/main/workspaces.ts`), una función `forgetWorkspace`, IPC `atril:ws:terminal` y `atril:ws:forget`, `Problem.tsx` (botón de cerrar opcional), `WorkspaceList.tsx`, `OwnTaskDialog.tsx`, `StartDialog.tsx`, tipos e i18n.

**Out:** «Volver a abrir» un trabajo parado (hallazgo 8, siguiente cambio); Jira, MR, Libretto y Ajustes (siguen en la auditoría); renombrar «Quitar».

## Constraints

- La ventana nunca manda una ruta ni un comando: solo ids que main busca en sus registros.
- La ruta que main pasa a Terminal va entre comillas simples escapadas.
- Nada cambia en disco cuando se rechaza un cierre (W9 y W10 siguen).

## Prior decisions

- Un fallo de git o tmux nunca sale crudo en la frase: frase por paso, salida plegada y «Abrir en Terminal» en esa carpeta.

## Task breakdown

- Errores de abrir con frase por paso, detalle y arreglo.
- Errores de cerrar, con «Quitar de la lista igualmente».
- La IPC que abre Terminal por id.
- La fila: confirmación, aviso con botón y cierre del aviso; los diálogos pintan `Problem`.

## Verification criteria

- **W131** If a git step or tmux fails while opening a workspace, then Atril shall create no record and answer one sentence per step — reading the repo's state: «No puedo leer el estado de git de {repo}.»; switching the copy: «git no me deja pasar tu copia a {branch}.»; fetching: «No he podido traer {branch} de {remote}.»; adding the worktree when its stderr matches `/already (checked out|used by worktree)/` (git's own wording; Atril runs git with its default English messages): «La rama {branch} ya está abierta en otra carpeta.», otherwise «git no ha podido crear la carpeta del trabajo.»; starting tmux: «tmux no ha podido arrancar el agente.» — with the command's stderr (or the thrown message) as `detail`, never inside the sentence, and `fix: 'terminal'` with the repo id.
  Proof: src/main/workspaces.test.ts a failing step when opening says which and folds its output
- **W10** (amended) If a worktree has uncommitted changes, then Atril shall refuse to remove it and change nothing, answering «{branch} tiene {changes} sin commitear: no lo cierro para no perderlos.» — `{changes}` being «1 cambio» or «{n} cambios» — with up to 20 `git status --porcelain` lines as `detail` and `fix: 'terminal'`; a clean worktree is removed with `git worktree remove` (never a recursive delete) and its agent session ended.
  Proof: src/main/workspaces.test.ts refuses to remove a dirty worktree
- **W132** If closing a workspace is refused before anything runs, then Atril shall change nothing and answer — the in-place copy on another branch: «Tu copia está en {current}, no en {branch}: vuelve a {branch} antes de cerrar.» with `fix: 'terminal'`; the workspace folder missing: «La carpeta de {branch} ya no existe.» with `fix: 'forget'`; `git status` failing on a folder that exists: «No puedo leer el estado de git de {branch}.» with its stderr as `detail` and `fix: 'terminal'`. If a git step fails after the agent's session was ended (`git switch` back, `git worktree remove`), then it shall keep the record and answer «git no ha podido cerrar {branch}; su agente ya está parado.» with its stderr as `detail` and `fix: 'terminal'`. Stderr never appears in a sentence.
  Proof: src/main/workspaces.test.ts close refusals say what and how to get past
- **W133** When forgetting a workspace is asked by id, Atril shall end its tmux session, drop its record and Atril's own files for it by session name (as W60, W65 and W92) — never the work's folder —, run no git command other than `git worktree prune` in the repo for a worktree record, and write no history line; an unknown id answers «Ese trabajo ya no existe».
  Proof: src/main/workspaces.test.ts forgetting a broken work runs no git
- **W134** When the window asks to open Terminal for a repo id or a workspace id, main shall look the folder up in its own records and open Terminal there running `git status`, with the folder single-quoted (a `'` inside becomes `'\''`), so a path with `'`, `"` or `\` reaches `cd` whole; an id it does not know answers an error and opens nothing.
  Proof: src/main/workspaces.test.ts terminal opens only a known folder, quoted
- **W135** When a close is refused, the workspace row shall show it as a problem whose title is main's sentence, with «{branch} sigue en la lista.» under it, the button «Abrir en Terminal» or «Quitar de la lista igualmente» by its `fix`, the detail folded, and a «Cerrar aviso» button that hides it.
  Proof: src/renderer/closework.test.ts a refused close shows its fix and can be dismissed
- **W130** (amended) When the new-work or the start dialog gets an error with a `fix`, it shall show it as a problem titled with main's sentence, «No he creado el trabajo.» under it, the detail folded and a button by its `fix`: «Usar un worktree esta vez» asks to open the same repo, branch, model, text and mode with `worktree: true`; «Abrir en Terminal» asks main to open Terminal for that repo.
  Proof: src/renderer/newwork.test.ts a dirty copy offers a worktree this time
  Proof: src/renderer/newwork.test.ts a blank dirty retry opens plain claude in a worktree
  Proof: src/renderer/newwork.test.ts a git failure offers terminal for the repo
- **W136** While a workspace's session is alive (its `alive` field from the workspace list), «Quitar» shall first ask in its row «¿Cerrar {branch}? Su agente se para y el trabajo pasa a Terminados.» with «Cerrar» and «Cancelar», and close only on «Cerrar»; a stopped workspace closes on the first click.
  Proof: src/renderer/closework.test.ts closing a live agent asks first

## Approach

### Summary

Main devuelve `{ error, detail?, fix?: 'worktree' | 'terminal' | 'forget' }` en abrir y cerrar. Dos IPC nuevas por id. `Problem` gana `onClose`. La fila y los dos diálogos pintan `Problem`.

### Technical context

`src/main/workspaces.ts`, `src/main/tmux.ts` (sin cambios: su `throw` se captura en `openWorktree`), `src/main/doctor.ts` (`inTerminal`), `src/main/index.ts`, `src/preload/{api,index}.ts`, `src/renderer/components/{Problem,WorkspaceList}.tsx`, `src/renderer/inbox/{OwnTaskDialog,StartDialog}.tsx`, `src/renderer/App.tsx` (`remove` devuelve el resultado entero), i18n. Tests: `workspaces.test.ts` (tmux real, lento) y `closework.test.ts` nuevo (jsdom).

### The approach

- `RemoveResult` = `{ ok: true } | { error, detail?, fix? }`; `onRemove` devuelve ese objeto.
- `openWorktree` envuelve `newSession` y cada `run` de git con su frase; el fallo de tmux deshace la carpeta y la rama que acaba de crear (como `prepare`).
- `terminalAt(target: { repoId } | { id })` → `inTerminal(\`cd '<path>' && git status\`, run)`.
- `forgetWorkspace(id)`: `killSession`, `writeRecords` sin él, `dropFiles`.
- `WorkspaceList`: estado `confirming` por id; con `alive` el primer clic pone la pregunta; `refusal` guarda el objeto y `Problem` con `onClose`.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Mandar la ruta desde la ventana | la ventana no es de fiar; main ya sabe la ruta por id |
| `confirm()` nativo | un diálogo del sistema para una fila; la pregunta en la fila no tapa nada |

### Risks

| Risk | Mitigation |
|---|---|
| Deshacer tras un fallo de tmux borra algo de la persona | solo lo que este mismo intento creó (`madeBranch`, la carpeta del worktree), como ya hace `prepare` |
| Una ruta con comillas rompe el comando de Terminal | W134 y su test con `'` en la ruta |

### Validation and rollback

Tests rojos primero. App real: cerrar con cambios, con la carpeta borrada y con el agente vivo. Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] abrir: frase por paso, detalle y arreglo; tmux deshace lo creado · Closes: W131
- [x] cerrar: rechazos con frase y arreglo, y olvidar un trabajo roto · Closes: W10, W132, W133
- [x] Terminal por id, con la ruta entre comillas · Closes: W134
- [x] la fila y los diálogos: Problem, cerrar aviso y confirmación · waits on boxes 1–3 · Closes: W130, W135, W136
