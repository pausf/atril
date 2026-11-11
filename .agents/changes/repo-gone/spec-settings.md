# repo-gone · settings

Targets: settings

## Outcomes

- Ajustes → Repos marca un repo roto y deja buscar su carpeta o quitarlo; cualquier repo se puede quitar.

## Scope boundaries

**In:** `src/renderer/settings/Repos.tsx`. **Out:** clonar de nuevo.

## Constraints

- La ventana manda solo ids; el diálogo de carpeta lo abre main.

## Verification criteria

- **S11** (amended) While Ajustes is shown, the Repos card shall list every registered repo with its id, its path and, when its health is `ok`, a mode select offering «Auto · <detected mode>», «Worktree» and «In-place»; choosing «Worktree» or «In-place» shall store it as the repo's mode (W4), choosing «Auto» shall clear it.
  Proof: src/renderer/settings/repos.test.ts repos card lists and sets the mode
- **S35** Each repo row shall offer «Quitar el repo»; a refusal shows under the row as a problem with «Cerrar aviso».
  Proof: src/renderer/settings/repos.test.ts any repo can be removed and a refusal can be dismissed
- **S36** A repo with health `missing` or `not-git` shall show «Carpeta no encontrada» or «No es un repo de git» instead of its mode select, and «Buscar la carpeta…».
  Proof: src/renderer/settings/repos.test.ts a broken repo can be found again
