# dirty-copy

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> ves pues eso es un fallo asi que deberia estar mejor explicado, busca todos lo posibles fallos es decir intentar cargarte la aplicacion para arreglar lo que fall

(Sobre «Nuevo trabajo» en `taller-libro`: «La copia principal tiene cambios sin commitear: haz commit o descártalos antes», sin decir qué ficheros ni dar salida.)

## Decision log

### Session 2026-11-11
- Q: ¿Qué arreglo ofrece una copia sucia en un repo in-place? → A: «Usar un worktree esta vez»: abre el trabajo en una carpeta aparte y tu copia, con sus cambios, no se toca; el modo del repo no cambia (assumed).
- Q: ¿Y el segundo trabajo en un repo in-place (W7)? → A: el mismo botón (assumed).
- Q: ¿Qué va en «Ver detalle»? → A: las líneas de `git status --porcelain` (hasta 20) y por qué el repo trabaja en tu copia (assumed).

## Outcomes

- Al abrir un trabajo en un repo que trabaja en tu copia, si tiene cambios o ya tiene un trabajo, el diálogo dice qué pasa con cifras y ramas, que no se ha creado nada, y trae «Usar un worktree esta vez»; los ficheros van plegados.

## Scope boundaries

**In:** `openWorktree` (errores de W7 y W8, opción `worktree`), IPC `atril:ws:open`, `OwnTaskDialog.tsx`, tipos. **Out:** el resto de errores de abrir y cerrar trabajos: van en el barrido de errores que sale de la auditoría y la prueba de romper la app.

## Constraints

- Nada cambia en la copia de la persona cuando se rechaza (W8 sigue).
- Textos por `t()` con inglés; el aviso usa `Problem`.

## Prior decisions

- Un rechazo al abrir un trabajo trae su arreglo cuando existe uno que no toca lo de la persona: aquí, un worktree para esta vez.

## Task breakdown

- Error con frase, detalle y arreglo en main; la opción `worktree`; el diálogo lo pinta con `Problem` y reintenta.

## Verification criteria

- **W8** (amended) If the main checkout has uncommitted changes, then opening an `in-place` workspace shall refuse and change nothing, answering «Tu copia de {repo} tiene {n} cambios sin commitear en {branch}: no puedo pasarla a {new} sin mezclarlos.», with the first 20 lines of `git status --porcelain` and «Trabaja en tu copia: {reason}» as `detail`, and `fix: 'worktree'`.
  Proof: src/main/workspaces.test.ts in-place refuses a dirty checkout
- **W7** (amended) While an `in-place` repo has an open workspace, Atril shall refuse to open a second one in that repo with «{repo} trabaja en tu copia y ya tiene un trabajo abierto ({branch}).» and `fix: 'worktree'`.
  Proof: src/main/workspaces.test.ts refuses a second in-place workspace
- **W129** When opening is asked with `worktree: true`, Atril shall open that workspace as a worktree even for an `in-place` repo, leave the main checkout's branch and files as they were, and keep the repo's mode.
  Proof: src/main/workspaces.test.ts worktree this time leaves the dirty copy alone
- **W130** When the open dialog gets an error with `fix: 'worktree'`, it shall show it as a problem with «No he creado el trabajo.», the button «Usar un worktree esta vez» and the detail folded; the button shall ask to open the same repo, branch, model, text and mode with `worktree: true`.
  Proof: src/renderer/newwork.test.ts a dirty copy offers a worktree this time
  Proof: src/renderer/newwork.test.ts a blank dirty retry opens plain claude in a worktree

## Approach

### Summary

`openWorktree` gana `worktree?: boolean`, que fuerza `inPlace = false`. Los dos rechazos devuelven `{ error, detail?, fix: 'worktree' }`. El diálogo pinta `Problem` cuando hay `fix` y reintenta con `worktree: true`.

### Technical context

`src/main/workspaces.ts`, `src/main/index.ts` (IPC), `src/preload/api.ts` e `index.ts`, `src/renderer/inbox/OwnTaskDialog.tsx`, i18n. Tests: `workspaces.test.ts` (tmux, lento), `newwork.test.ts` nuevo (jsdom).

### The approach

`WorkspaceResult` error: `{ error: string; detail?: string; fix?: 'worktree' }`. `open(repoId, branch, agent, model?, task?, auto?, worktree?)`.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Hacer stash por la persona | toca sus cambios sin preguntar |
| Cambiar el modo del repo a worktree | decide por ella para siempre; el repo trabaja en su copia por algo (p. ej. un .env sin versionar) |

### Risks

| Risk | Mitigation |
|---|---|
| El worktree no tiene el fichero sin versionar que hizo elegir in-place | el detalle dice por qué el repo trabaja en tu copia; la persona decide al pulsar |

### Validation and rollback

Tests rojos primero; la app real con un repo in-place sucio. Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] los dos rechazos con frase, detalle y arreglo, y la opción worktree · Closes: W7, W8, W129
- [x] el diálogo con Problem y el reintento · waits on box 1 · Closes: W130
