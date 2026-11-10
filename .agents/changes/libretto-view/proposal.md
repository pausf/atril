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
- Q: ¿Se refresca sola? (ver abajo) → A: al entrar, al cambiar de repo y tras encolar o empezar; botón «Actualizar» (assumed).

### Session 2026-11-11 (revisión en frío)
- Q: `libretto-next` no acepta nombre, pregunta cuál y hace `checkout -b`: ¿cómo se empieza? → A: Atril hace el paso 3
  del comando él mismo: abre el trabajo en `feat/<name>` (es la rama), quita la línea `Queued:` del `proposal.md` de
  ese worktree y la commitea ahí (`docs(queue): start <name>`); y el primer mensaje es el paso 4,
  `/libretto:write-spec <name>`. Igual que `/libretto-next`, sin su pregunta: el clic ya eligió (assumed).
- Q: ¿Qué árbol se lee? → A: el checkout del repo; una idea en cola cuya rama `feat/<name>` ya existe se muestra
  «Empezada · feat/<name>» sin «Empezar» (assumed).
- Q: ¿Repos sin worktree (in-place)? → A: valen; si `openWorktree` devuelve error, sale bajo la idea y no se
  commitea nada (assumed).
- Q: ¿Nombre? → A: de la primera línea del texto: minúsculas, sin acentos, lo no alfanumérico a un guion, sin guiones
  al borde, cortado a 40 contando el sufijo `-N`; si queda vacío, `idea` (assumed).
- Q: ¿Si el commit falla? → A: se borra la carpeta escrita y se enseña el error (assumed).
- Q: ¿Fecha? → A: local (assumed).
- Q: ¿Qué es la línea `Queued:`? → A: `Queued: AAAA-MM-DD` sola en su línea, antes del primer `## `; empate por
  nombre (assumed).
- Q: ¿Qué sale en curso? → A: toda carpeta no en cola, con o sin `proposal.md`; las que tienen todas las casillas
  cerradas dicen «Lista para aterrizar» (assumed).

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
- Empezar = Atril hace el paso 3 de `/libretto-next` y entra en `write-spec` (assumed, 11 nov).
- Pantalla propia «Libretto» (assumed, 11 nov).

## Verification criteria

- **W100** When Atril reads a repo's Libretto state, it shall return as the queue the folders under `.agents/changes/`
  whose `proposal.md` holds a line `Queued: YYYY-MM-DD` before its first `## ` heading, oldest first then by name, each
  with name, date, the first non-blank line under `## Reading`, and `started: true` when a local branch
  `feat/<name>` exists; and every other folder as in flight with name and `readChecklist`'s closed, total and first
  open box (or none); and if the repo has no `.agents/changes/`, then it shall return `{ none: true }`.
  Proof: src/main/libretto.test.ts a repo's queue and work in flight are read from disk
- **W101** When the person queues an idea, Atril shall write `.agents/changes/<name>/proposal.md` with `# <name>`,
  `Tracker: none`, `Queued: <local date>`, `## The ask, verbatim` with every line of the text quoted, and `## Reading`,
  the name taken from the text's first line (lowercase, accents stripped, non-alphanumerics to one dash, no edge
  dashes, at most 40 characters including a `-2`… suffix when taken, `idea` when empty), and commit only that file as
  `docs(queue): capture <name>`, leaving every other change in the repo uncommitted; if the text is blank or the repo
  has no `.agents/changes/`, then it shall write nothing; if the commit fails, then it shall remove the folder and
  return the error.
  Proof: src/main/libretto.test.ts queueing an idea writes and commits only its proposal
- **W102** When the person starts a queued idea, Atril shall open a workspace in that repo on branch `feat/<name>`,
  remove the `Queued:` line from that workspace's `proposal.md` and commit it there as `docs(queue): start <name>`,
  and send `/libretto:write-spec <name>` as the first message; if opening fails, then it shall return the error and
  commit nothing.
  Proof: src/main/libretto.test.ts starting a queued idea opens its work at write-spec
- **W103** The «Libretto» screen shall show, for the picked repo, the queue with «Empezar» per idea (or «Empezada ·
  feat/<name>» when started), the work in flight with «{closed}/{total}» and its first open box or «Lista para
  aterrizar», a text box whose «Encolar» is disabled while blank, an error from queueing or starting under what
  caused it, and «Este repo no usa Libretto» without the text box for `{ none: true }`.
  Proof: src/renderer/libretto.test.ts the Libretto screen shows the queue and queues an idea
- **W104** The «Libretto» screen shall be reachable from the rail and from ⌘K, remember the last picked repo across
  restarts in the interface state, and read the state again on entering, on changing repo, after queueing or starting,
  and on «Actualizar».
  Proof: src/renderer/libretto.test.ts the Libretto screen is reachable and keeps its repo

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
- `startQueued(repoId, name, run)` → `openWorktree({ repoId, branch: 'feat/'+name, agent: 'claude', prompt:
  '/libretto:write-spec '+name }, run, prepare)`: `openWorktree` gana un tercer parámetro `prepare(path)` que corre
  antes de arrancar a Claude; aquí quita `Queued:` y commitea en el worktree. Si `prepare` falla, `openWorktree`
  deshace el worktree (o vuelve la rama en in-place) y borra la rama solo si la creó. Escribir en un Claude que aún
  arranca (`replyToAgent`) se descartó por carrera. `started` sale de `git branch --list 'feat/*'`.
- Un id de repo desconocido devuelve `{ error }` y la pantalla lo enseña como alerta.
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
| Claude no toma `/libretto:write-spec <name>` como el paso 4 | entrada «sin probar» |
| nombre con caracteres raros | slug probado con acentos y símbolos |

### Validation and rollback
Gates de siempre. El test del pathspec se fuerza en rojo quitando el pathspec. Un revert lo quita; nada migra.

### Complexity deliberately kept
Ninguna.

## Checklist

- [x] read, queue and start in main with their IPC · Closes: W100, W101, W102
- [x] the Libretto screen, rail, ⌘K, remembered repo, refresh, tour mention; sketch; photo; novedades; CLAUDE.md «sin probar» · waits on box 1 · Closes: W103, W104
