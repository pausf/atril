# repo-gone

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> busca todos lo posibles fallos es decir intentar cargarte la aplicacion para arreglar lo que fall

Hallazgos 7, 8, 9 y 29 de `bocetos/romper.md`: un repo cuya carpeta se movió o ya no es git suelta «fatal: cannot change to…» o «fatal: not a git repository…» al abrir un trabajo; en Ajustes esos repos parecen sanos y no se pueden quitar; con git roto (sin herramientas de Xcode) cualquier fallo se achaca al nombre de la rama.

## Decision log

### Session 2026-11-11
- Q: (revisión en frío) ¿Qué va primero, el nombre de la rama o la salud del repo? → A: el nombre (W6), salvo que git esté roto (W156); después la salud, antes de cualquier git que escriba (assumed).
- Q: (revisión en frío) ¿Qué salud tiene un repo con git roto? → A: `ok`: solo «not a git repository» en el stderr da `not-git`; git roto se dice al usarlo (W156) (assumed).
- Q: (revisión en frío) ¿Dónde funcionan «Abrir Ajustes» e «Instalar herramientas de Xcode»? → A: en la fila del trabajo, los diálogos de nuevo trabajo y Empezar, la barra de reabrir y la barra lateral; `WorkFix` gana `'settings'` y `'git'` (assumed).
- Q: ¿Cómo se sabe que git está roto y no que el nombre es malo? → A: (comprobado) un nombre inválido sale con código 128 y «is not a valid branch name» en stderr; git ausente da 127 y la nota de Xcode, código 1 con «xcode-select». Solo el primero culpa al nombre (assumed).
- Q: ¿Qué botones tiene un repo roto en Ajustes? → A: «Buscar la carpeta…» (elige otra carpeta y la guarda con el mismo id si es un repo git) y «Quitar el repo» (lo borra de `repos.json`, nunca toca la carpeta; se niega si hay un trabajo abierto de ese repo) (assumed).
- Q: ¿«Quitar el repo» también para repos sanos? → A: sí, en todas las filas: hoy no hay forma de quitar un repo desde la app (assumed).
- Q: (al construir) ¿Y si `check-ref-format` falla sin «is not a valid branch name» ni git roto? → A: «git no ha podido comprobar el nombre {branch}.» con su salida plegada y «Abrir en Terminal»; nunca culpa al nombre (assumed).
- Q: (al construir) ¿`lstat` o `existsSync` para `missing`? → A: `existsSync`, que sigue enlaces: un enlace a una carpeta que ya no está cuenta como perdida (assumed).

## Outcomes

- Abrir un trabajo en un repo cuya carpeta no está o no es git lo dice con «Abrir Ajustes», sin texto de git.
- Ajustes → Repos marca los repos rotos y deja buscar su carpeta o quitarlos; cualquier repo se puede quitar.
- Con git roto, abrir o cerrar un trabajo dice «git no funciona en este Mac» con «Instalar herramientas de Xcode».

## Scope boundaries

**In:** `src/main/repos.ts` (salud del repo, quitar, cambiar carpeta), `src/main/workspaces.ts` (comprobaciones al abrir y cerrar), IPC nuevas, `src/renderer/settings/Repos.tsx`, `Problem.tsx` (`fixLabel`), i18n. **Out:** clonar de nuevo un repo perdido; detectar que una carpeta movida es la misma por su remoto.

## Constraints

- La ventana manda ids y, para «Buscar la carpeta…», nada: main abre el diálogo nativo.
- Nada borra ni mueve carpetas de la persona.
- Toda escritura de `repos.json` pasa por el lector estricto (W148).

## Prior decisions

- Un repo roto se ve como roto y se arregla desde Ajustes; git roto se dice como tal, nunca como un nombre de rama malo.

## Verification criteria

- **W154** The repo list shall give each repo `health`: `missing` when its folder does not exist, `not-git` when `git -C <path> rev-parse --git-dir` fails with «not a git repository» in its stderr, `ok` otherwise (git itself failing leaves `ok`: W156 says it when git is used).
  Proof: src/main/repos.test.ts each repo says whether its folder is there and is git
- **W6** (amended) If a branch name fails `git check-ref-format --branch` with «is not a valid branch name» in its stderr, then Atril shall refuse with ««{branch}» no es un nombre de rama válido» before running any other command.
  Proof: src/main/workspaces.test.ts refuses an invalid branch name
- **W155** If opening a workspace is asked on a repo whose health is `missing` or `not-git`, then Atril shall answer «La carpeta de {repo} ya no existe ({path}).» or «La carpeta de {repo} no es un repo de git ({path}).» with `fix: 'settings'` before any git command that writes or any tmux command.
  Proof: src/main/workspaces.test.ts a missing or non-git repo is refused with its fix
- **W156** If any git command run while opening or closing a workspace exits 127 or has «xcode-select» in its stderr, then Atril shall answer «git no funciona en este Mac.» with that stderr as `detail` and `fix: 'git'` instead of that step's W6, W131 or W132 sentence, having changed nothing that step had not already changed.
  Proof: src/main/workspaces.test.ts a broken git is never blamed on the branch name
- **W159** Wherever a workspace problem shows its fix — the workspace row, the new-work and start dialogs, the reopen bar and the sidebar — `fix: 'settings'` shall show «Abrir Ajustes» and open Ajustes, and `fix: 'git'` shall show «Instalar herramientas de Xcode» and run W70's install for git.
  Proof: src/renderer/newwork.test.ts settings and git fixes do what they say
- **W157** When the person asks to remove a repo by id, Atril shall drop it from `repos.json` and leave its folder, its branches and its remembered Jira mapping untouched (a mapping to a removed id reads as no repo remembered); while a workspace of that repo is in the list it shall refuse with «{repo} tiene trabajos abiertos: ciérralos antes.», and while `workspaces.json` is damaged with W144's sentence; either refusal changes nothing.
  Proof: src/main/repos.test.ts removing a repo forgets it and never touches the folder
- **W158** When the person picks a new folder for a repo by id, Atril shall store the folder's git top level as that repo's path keeping its id and mode; it shall refuse with S13's sentence if the folder is not a git repository, and with «Esa carpeta ya es el repo {id}.» if another repo already has that path; either refusal, or a cancelled picker, changes nothing.
  Proof: src/main/repos.test.ts a repo can be pointed at its new folder

## Approach

### Summary

`listRepos` añade `health`. `openWorktree` lo mira antes de cualquier git. Dos funciones nuevas en `repos.ts` (`removeRepo`, `relocateRepo`) y dos IPC. Ajustes pinta la marca y los botones.

### Technical context

`src/main/{repos,workspaces,index}.ts`, `src/preload/{api,index}.ts`, `src/renderer/settings/Repos.tsx`, `src/renderer/components/Problem.tsx`, i18n. Tests: `repos.test.ts`, `workspaces.test.ts`, `src/renderer/settings/repos.test.ts`.

### The approach

- `health` en `RepoView`; `lstat` y `rev-parse --git-dir`.
- `openWorktree`: tras leer el repo, mira `health` (sin listar todos).
- `check-ref-format`: si falla y el stderr no dice «is not a valid branch name», W156.
- `removeRepo(id)`, `relocateRepo(id, path)`; `atril:repos:remove(id)` y `atril:repos:relocate(id)` (main abre `dialog.showOpenDialog`).
- `WorkFix` gana `'settings'` y `'git'`; `Problem.fixLabel` les da texto y cada sitio que pinta un problema de trabajo los conecta (Ajustes por la navegación; git por `doctor.install('git')`).
- Un `gitBroken(r)` común decide W156 en cada paso de git de `openWorktree` y `removeWorkspace`.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Borrar el repo roto automáticamente | decide por la persona; puede ser un disco desconectado |
| Culpar al nombre salvo que git falte (127) | la nota de Xcode sale con código 1 y seguiría culpando al nombre |

### Risks

| Risk | Mitigation |
|---|---|
| Un disco externo desconectado marca el repo como perdido | solo marca; nada se borra sin pulsar «Quitar el repo» |

### Validation and rollback

Tests rojos primero; la app real con un repo movido, otro sin `.git` y un `git` falso que imprime la nota de Xcode. Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] la salud de cada repo y abrir que la mira · Closes: W154, W155
- [x] git roto nunca culpa al nombre, y los botones de ajustes y git en todas partes · Closes: W6, W156, W159
- [x] quitar un repo y buscar su carpeta, en main y en Ajustes · Closes: W157, W158, S11, S35, S36 (spec-settings.md)
