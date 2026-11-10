# libretto-view

Tracker: none
Targets: workspaces
Durable decisions: the four in Prior decisions below

## The ask, verbatim

> continua al final libretto tiene que estar integrado dentro con todo lo commands etc

## Reading

Los comandos de Libretto que Atril aún no tiene (`queue`, `next`, `status`), en una pantalla «Libretto» por repo:
encolar una idea, ver la cola y lo que está en curso, y empezar una idea encolada. `converge` y `retro` van en el
cambio siguiente.

## Decision log

### Session 2026-11-11
- Q: ¿Dónde? → A: una pantalla nueva «Libretto» en la barra lateral (y en ⌘K), con un selector de repo registrado,
  recordado como el último usado (assumed).
- Q: ¿`/libretto-status` y la cola llaman a Claude? → A: no: Atril lee `.agents/changes/*/proposal.md` del repo con lo
  que ya existe (`changeFolders`, `readChecklist`); cero cuota (assumed).
- Q: ¿Qué es «en cola»? → A: una carpeta cuyo `proposal.md` lleva una línea `Queued: <fecha ISO>`; más antigua
  primero, con su nombre, fecha y la primera línea no vacía de `## Reading` (assumed).
- Q: ¿Y «en curso»? → A: cualquier otra carpeta de cambio: su nombre y «{closed}/{total}» casillas con la primera
  abierta, o «sin checklist» (assumed).
- Q: ¿Encolar llama a Claude? → A: no: hace lo que `/libretto-queue` en su paso 2–3, sin modelo: nombre desde el texto
  (minúsculas, sin acentos, guiones, máx. 40), `proposal.md` con la plantilla del comando y la petición literal como
  cita, y `git commit` solo de ese archivo con `docs(queue): capture <name>` en la rama actual del repo (assumed).
- Q: ¿Nombre repetido? → A: sufijo `-2`, `-3`… (assumed).
- Q: ¿Repo sin `.agents/changes/`? → A: la pantalla dice «Este repo no usa Libretto» y no ofrece encolar, como
  `/libretto-queue` se niega (assumed). «Iniciar Libretto» es otra idea ★.
- Q: ¿«Empezar»? → A: abre un trabajo nuevo (`openWorktree`) en la rama `feat/<name>` con el primer mensaje
  `/libretto:libretto-next <name>`; el comando quita `Queued:` y sigue el flujo (assumed). Si Libretto intenta otra
  rama dentro del worktree, va a «sin probar».
- Q: ¿Se refresca sola? → A: al entrar, al cambiar de repo y tras encolar o empezar; botón «Actualizar» (assumed).

## Outcomes

- Desde Atril se encola una idea sin abrir una terminal, se ve la cola y lo que está en curso de cada repo, y una idea
  encolada se empieza con un clic en su propio trabajo, siguiendo Libretto.

## Scope boundaries

**In:** la pantalla, el selector de repo, las dos listas, encolar, empezar, ⌘K.
**Out:** `converge`, `retro` (siguiente cambio); editar o borrar ideas (son archivos); `libretto init`; reordenar la
cola (la cola es FIFO y «Empezar» en cualquiera ya reordena).
**Never scoped out:** el commit solo toca el `proposal.md` nuevo, nunca otros cambios del repo; nada se escribe sin
pulsar; textos por `t()`; teclado; una petición vacía no se encola.

## Prior decisions

- Leer del disco, no preguntar a Claude (assumed, 11 nov).
- Encolar sin modelo, con la plantilla de `/libretto-queue` (assumed, 11 nov).
- Empezar = trabajo nuevo con `/libretto:libretto-next <name>` (assumed, 11 nov).
- Pantalla propia «Libretto» (assumed, 11 nov).

## Verification criteria

- **W100** When Atril reads a repo's Libretto state, it shall return the folders under `.agents/changes/` whose
  `proposal.md` holds `Queued: <date>` as the queue, oldest date first, each with name, date and the first non-blank
  line under `## Reading`; and every other folder as in flight with name and `readChecklist`'s closed, total and first
  open box (or none); and if the repo has no `.agents/changes/`, then it shall say so instead.
  Proof: src/main/libretto.test.ts a repo's queue and work in flight are read from disk
- **W101** When the person queues an idea, Atril shall write `.agents/changes/<name>/proposal.md` with `# <name>`,
  `Tracker: none`, `Queued: <today ISO>`, `## The ask, verbatim` with the text quoted line by line, and `## Reading`,
  the name derived from the text (lowercase, accents stripped, non-alphanumerics to single dashes, at most 40 chars,
  `-2`… when taken), and commit only that file as `docs(queue): capture <name>`, leaving any other change in the repo
  uncommitted; if the text is blank or the repo has no `.agents/changes/`, then it shall write nothing.
  Proof: src/main/libretto.test.ts queueing an idea writes and commits only its proposal
- **W102** When the person starts a queued idea, Atril shall open a workspace in that repo on branch `feat/<name>`
  whose first message is `/libretto:libretto-next <name>`.
  Proof: src/main/libretto.test.ts starting a queued idea opens its work with libretto-next
- **W103** The «Libretto» screen shall be reachable from the rail and ⌘K, offer a picker of registered repos, show the
  queue with «Empezar» per idea and the work in flight with its boxes, offer a text box with «Encolar» (disabled while
  blank), and show «Este repo no usa Libretto» without the box for a repo without `.agents/changes/`.
  Proof: src/renderer/libretto.test.ts the Libretto screen shows the queue and queues an idea

## Approach

### Summary
Un módulo `src/main/libretto.ts` (leer, encolar, empezar) con tres IPC `atril:libretto:{state,queue,start}`, y una
pantalla `src/renderer/libretto/Libretto.tsx`.

### Technical context
Electron 45, React 19, vitest. Reutiliza `changeFolders`/`readChecklist` (`src/main/flow/`), `openWorktree`
(`src/main/workspaces.ts`, `prompt`), `readRepos`, `Runner` para git. Pantallas: `Screen` en
`src/renderer/components/Rail.tsx`, render en `App.tsx`, ⌘K en `src/renderer/palette/items.ts`, tutorial
`Tour.tsx`. IPC en `src/main/index.ts`, `src/preload/{index,api}.ts`, inglés en `src/preload/i18n-en.ts`. Sketch
`bocetos/fase1-nucleo.html`, novedades con foto (`ATRIL_SNAPSHOT_VIEW=libretto`).

### The approach
- `librettoState(repoPath)` → `{ none: true } | { queued: Queued[], inFlight: InFlight[] }`.
- `queueIdea(repoPath, text, run)` → `{ name } | { error }`: `git add -- <file>` y
  `git commit -m … -- <file>` (pathspec: no arrastra nada más del índice ni del árbol).
- `startQueued(repoId, name, run)` → `openWorktree({ repoId, branch: 'feat/'+name, agent: 'claude', prompt })`.
- La pantalla guarda el repo elegido en el estado de interfaz existente.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| lanzar `/libretto-queue` en un Claude | gasta cuota para escribir un archivo con plantilla fija |
| la cola dentro de Trabajo | Trabajo es lo que está en marcha; la cola es por repo y aún no es trabajo |

### Risks
| Risk | Mitigation |
|---|---|
| el commit arrastra cambios ajenos ya en el índice | commit con pathspec; el test deja otro archivo en el índice y comprueba que sigue sin commitear |
| `libretto-next` crea otra rama dentro del worktree | entrada «sin probar» |
| nombre con caracteres raros | slug probado con acentos y símbolos |

### Validation and rollback
Gates de siempre. El test del pathspec se fuerza en rojo quitando el pathspec. Un revert lo quita; nada migra.

### Complexity deliberately kept
Ninguna.

## Checklist

- [ ] read, queue and start in main with their IPC · Closes: W100, W101, W102
- [ ] the Libretto screen, rail, ⌘K, tour; sketch; photo; novedades; CLAUDE.md «sin probar» · waits on box 1 · Closes: W103
