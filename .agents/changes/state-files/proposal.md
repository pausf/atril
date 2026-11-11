# state-files

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> busca todos lo posibles fallos es decir intentar cargarte la aplicacion para arreglar lo que fall

Hallazgos 11, 12, 13, 15 y 16 de `bocetos/romper.md`: con `workspaces.json` o `repos.json` dañados la lista sale vacía sin aviso, main acumula rechazos sin capturar, abrir un trabajo crea rama, worktree y sesión antes de fallar con «SyntaxError» crudo, y con la carpeta de Atril de solo lectura sale «EACCES» crudo.

## Decision log

### Session 2026-11-11
- Q: (revisión en frío) ¿Quién lee los archivos? → A: un módulo nuevo `src/main/state.ts` con un lector estricto para los dos; `workspaces.ts` y `repos.ts` dejan sus lectores propios. Toda escritura de cualquiera de los dos archivos lee antes con él, así que ninguna escribe encima de uno dañado (assumed).
- Q: (revisión en frío) ¿Un archivo que existe pero no se puede leer (permisos, carpeta)? → A: cuenta como dañado, con su código en el detalle (assumed).
- Q: (revisión en frío) orden con `reopen-work` → A: esta rama sale de `reopen-work` aterrizado; `reopenWorkspace` pasa por el mismo lector.
- Q: ¿Qué arreglo se ofrece para un archivo dañado? → A: «Mostrar en Finder» (el archivo seleccionado); Atril no lo reescribe ni lo borra por su cuenta, y no inventa una copia que no tiene (assumed).
- Q: ¿Qué cuenta como «forma equivocada»? → A: `workspaces` o `repos` que no sea una lista, o una entrada sin `id`, `path` (y `branch`, `session` para trabajos) de texto (assumed).
- Q: ¿Y `ui.json` dañado (hallazgo 14)? → A: fuera: solo repite el tutorial, nada se pierde (assumed).

## Outcomes

- Con un archivo de estado dañado, la barra lateral y Ajustes → Repos dicen cuál y qué no puedes hacer, con «Mostrar en Finder»; no salen los vacíos de «Aquí verás…» ni «Aún no hay ninguno».
- Abrir, cerrar, olvidar y reabrir un trabajo no crean ni borran nada mientras uno de los dos archivos está dañado.
- Sin permiso de escritura en la carpeta de Atril, abrir un trabajo lo dice con su botón y no deja nada a medias.
- El sondeo y la lista de trabajos no sueltan rechazos sin capturar por estos archivos.

## Scope boundaries

**In:** `src/main/state.ts` (nuevo), `readRecords` y la lectura de `repos.json` (`src/main/workspaces.ts`, `src/main/repos.ts`), el sondeo de `src/main/status.ts`, IPC `atril:state:reveal`, la barra lateral (`WorkspaceList`/`Sidebar`), Ajustes → Repos, el diálogo de nuevo trabajo. **Out:** `ui.json`, `qa-targets.json` (ya toleran basura), reparar el archivo automáticamente.

## Constraints

- Nunca se escribe encima de un archivo de estado que no se ha podido leer.
- La ventana pide «mostrar» por nombre (`workspaces` o `repos`), nunca una ruta.

## Prior decisions

- Un archivo de estado dañado bloquea los cambios de estado, no la app: se ve qué pasa y cómo llegar al archivo, y nada se sobrescribe.

## Verification criteria

- **W144** If `workspaces.json` exists but cannot be read, is not JSON, its `workspaces` is not an array, or an entry lacks a string `id`, `path`, `branch` or `session`, then every path that writes it — opening, closing, forgetting, reopening, pausing and any other — shall create, delete or write nothing and answer «No puedo leer workspaces.json: está dañado. No abro ni cierro trabajos hasta que se arregle.» with the error (code or parse message) as `detail` and `fix: 'reveal'`; a missing file still reads as empty.
  Proof: src/main/state.test.ts a damaged workspaces list blocks every change and writes nothing
- **W148** If `repos.json` exists but cannot be read, is not JSON, its `repos` is not an array, or an entry lacks a string `id` or `path`, then opening a workspace, adding a repo, changing a repo's mode and every other path that writes it shall create, delete or write nothing and answer «No puedo leer repos.json: está dañado. No puedo usar ni cambiar tus repos hasta que se arregle.» with the error as `detail` and `fix: 'reveal'`; a missing file still reads as empty.
  Proof: src/main/state.test.ts a damaged repos list blocks every change and writes nothing
- **W145** While `workspaces.json` is damaged, the status poll and the workspace list shall not raise unhandled rejections, and the window's workspace list shall show W144's sentence, «Tus agentes siguen en tmux, pero no puedo enseñártelos.» and «Mostrar en Finder» instead of the empty state (W97's empty text stays for an undamaged empty list). A damaged `repos.json` alone leaves the workspace list as it is.
  Proof: src/main/status.test.ts a damaged list does not break the poll
  Proof: src/renderer/statefiles.test.ts a damaged list shows its problem instead of the empty state
- **W146** If the `mkdir` of the worktree's parent folder (before `git worktree add`) fails with `EACCES`, `EPERM` or `EROFS`, then opening shall answer «No puedo escribir en la carpeta de Atril ({home}).» with the code as `detail` and `fix: 'reveal'`, with nothing to undo; if writing the record fails after the session started, it shall end the session, remove the worktree it made and delete the branch it made, and answer the same sentence for those codes, or «No he podido guardar el trabajo.» for any other, with the code as `detail`.
  Proof: src/main/workspaces.test.ts a read-only atril home undoes the open and says so
- **W147** When the window asks to reveal `workspaces` or `repos`, main shall show that file (or Atril's folder if it is missing) in Finder; any other name reveals nothing. A problem with `fix: 'reveal'` shows «Mostrar en Finder» in the workspace row (as W135), the new-work and start dialogs (as W130) and the sidebar.
  Proof: src/main/state.test.ts reveal shows only the state files
  Proof: src/renderer/statefiles.test.ts a damaged list shows its problem instead of the empty state

## Approach

### Summary

Una lectura estricta (`readState`) que lanza `StateError { file, detail }`; los que cambian estado la llaman al principio y traducen el error a la frase con `fix: 'reveal'`. La lista devuelve `{ problem }` en vez de lanzar. `shell.showItemInFolder` por nombre.

### Technical context

`src/main/{workspaces,repos,status,index}.ts`, `src/preload/{api,index}.ts`, `src/renderer/components/{WorkspaceList,Sidebar}.tsx`, `src/renderer/App.tsx`, `src/renderer/settings/Repos.tsx`, i18n. Tests: `workspaces.test.ts`, `status.test.ts`, `statefiles.test.ts` (nuevo).

### The approach

- `src/main/state.ts`: `readState('workspaces' | 'repos')` valida y lanza `StateError { file, detail }`; `readRecords` y los lectores de `repos.ts` pasan por él; `openWorktree`, `removeWorkspace`, `forgetWorkspace`, `reopenWorkspace` leen registros y repos antes de tocar git o tmux.
- `atril:ws:list` devuelve `WorkspaceView[] | { problem }`; `listRepos` igual.
- `status.refresh` captura el error y no notifica.
- `openWorktree` envuelve `mkdir` y `writeRecords` con la misma limpieza que el fallo de tmux.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Copia `.bak` automática y «Restaurar copia» | Atril no tiene hoy copias; inventarlas es otra función con sus propios fallos |
| Tratar el archivo dañado como vacío | es justo lo que pasa hoy: la siguiente escritura borra todos los trabajos |

### Risks

| Risk | Mitigation |
|---|---|
| Cambiar la forma de `ws:list` rompe a quien la llama | tipos de TypeScript y los tests de la ventana que ya la usan |

### Validation and rollback

Tests rojos primero; la app real con `{not json` en cada archivo. Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] lectura estricta en `state.ts` y bloqueo de toda escritura (sale de `reopen-work` aterrizado) · Closes: W144, W148
- [x] el sondeo y la lista sin rechazos, con el aviso en la ventana y en Ajustes · Closes: W145, S33
- [x] la carpeta de solo lectura deshace y avisa; mostrar en Finder por nombre · Closes: W146, W147
