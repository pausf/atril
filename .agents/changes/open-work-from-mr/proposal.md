# open-work-from-mr

Tracker: none
Targets: mr
Durable decisions: the four in Prior decisions below

## The ask, verbatim

> sigue creando funcionalidades. Tenemos que hacer el mejor gestor de IA, o sea, de orquestador y revisor de MRs, etcétera, porque lo queremos poner para que la gente le sea útil.

## Reading

Abrir un trabajo desde una MR (de la lista del 9 nov): en una MR a revisar o propia, «Abrir en Atril» crea el trabajo en su rama y lanza a Claude con la MR como contexto, para revisarla o seguirla.

## Decision log

### Session 2026-11-10
- Q: ¿Qué hace? → A: desde la vista de una MR, abrirla en Atril por el camino de Libretto que le toca (assumed).
- Q: (revisor de spec) `/libretto-review` prepara su propio worktree y `/libretto-flow` no acepta una URL de MR →
  A: rediseñado para no salirse de Libretto (assumed):
  - **Revisar** (Me toca revisar, Sigo): «Revisar en Atril» abre una *sesión de revisión*: una sesión de tmux en
    la carpeta del repo registrado, sin que Atril toque git, con `/libretto:libretto-review <url>`; el skill
    review-project hace su worktree aislado y lo quita al acabar, como cuando lo lanzas a mano.
  - **Seguir lo tuyo** (Mías): «Seguir en Atril» crea un trabajo en la rama de la MR traída de `origin` y lanza
    `/libretto:libretto-flow` sin argumento: find-work retoma el cambio en curso de esa rama.
- Q: ¿Qué repo? → A: el registrado con algún remote que nombre el proyecto (la regla de review-project, que mira
  todos los remotes); varios → se dice y no se abre nada; ninguno → «Añade el repo de {proyecto} en Ajustes»
  (assumed).
- Q: ¿Ya hay un trabajo? → A: cualquier registro (vivo o no) en esa rama del repo → «Ir al trabajo» (assumed).
- Q: ¿Repo en modo en sitio? → A: «Seguir en Atril» se rechaza con «Este repo trabaja en tu copia: cambia de rama
  a mano» (no se toca la copia de la persona); revisar sí, porque no toca git (assumed).
- Q: ¿De qué lista viene la MR? → A: de la última lista de main (como M27), nunca de la ventana (assumed).
- Q: ¿La URL? → A: se valida (https, sin NUL, sin empezar por «-») y va como un elemento del argv (assumed).
- Q: (fase 5) ¿Dónde? → A: `src/main/forge/openmr.ts` (el `Governs:` de mr lo añade); `openWorktree` gana el
  modo de rama existente y la sesión de revisión (delta de workspaces) (assumed).

- Q: (segundo revisor de spec) Holguras → A, todas (assumed):
  - **Seguir lo tuyo.** `libretto-flow` sin argumento corre find-work. Si hay más de un cambio en curso o
    ninguno, te pregunta cuál seguir: es su propia parada, y la contestas con las respuestas rápidas
    (W76).
  - **Revisar en la copia de la persona.** Atril no toca git. Si review-project decide cambiar de rama,
    lo hace con su restauración garantizada, como cuando lo lanzas a mano.
  - **Forks.** Se trae la rama del remote que coincide con el proyecto, no siempre de `origin`.
  - **Qué guarda una sesión de revisión.** El registro lleva `mode: 'review'` y `branch` igual a la rama
    de la MR.
    - Revisar y seguir no se confunden: «existing» solo cuenta registros del mismo tipo que el botón.
    - Una sesión de revisión no cuenta para W7.
  - **Una MR en dos listas.** Si está en Mías, se sigue. Si no, se revisa.
  - **«Ir al trabajo» con un trabajo muerto.** Lo elige y Trabajo lo enseña «parado», como hoy.
  - **«Revisar con Libretto» (M25).** Se queda: deja borradores sin herramientas. «Revisar en Atril» es
    la revisión completa en una sesión; salen los dos.
  - **Si falla el fetch:** «No se pudo traer la rama: {detalle}».
  - **Quitar una sesión de revisión** borra su registro y cierra su sesión de tmux.
  - **El prompt.** Va como un solo elemento: «/libretto:libretto-review <url>» o «/libretto:libretto-flow»
    sin más.
  - **`Governs:`.** El de workspaces excluye `openmr.ts`.

## Outcomes

- En una MR a revisar, un clic abre a Claude revisándola con Libretto, en su propio worktree de review-project.
- En una MR tuya, un clic deja un trabajo en su rama con Libretto retomando el cambio en curso (o preguntándote cuál, si hay varios o ninguno).
- Si ya hay trabajo, te lleva a él; si falta el repo, te dice dónde añadirlo; si hay un error, lo ves en la MR.

## Scope boundaries

**In:** los tres estados del botón en la vista de la MR, la elección del repo, la sesión de revisión, el trabajo
en rama existente, «Ir al trabajo», los errores en la vista.
**Out:** clonar repos; MRs de forks sin remote que las nombre; elegir el comando; automático.
**Never scoped out:** Atril no toca git en la copia de la persona (review-project, si cambia de rama, restaura como siempre); la URL validada como un elemento del argv; nada sin pulsar.

## Prior decisions

- Revisar con review-project en su propio worktree; seguir con libretto-flow sin argumento (assumed, 10 nov).
- Repo por cualquier remote, como review-project (assumed, 10 nov).
- En sitio, solo revisar (assumed, 10 nov).
- Lista y rama de la MR desde la última lista de main (assumed, 10 nov).

## Verification criteria

- **M33** When the window asks `atril:mr:workFor(url)` for an MR in main's latest listing, main shall answer
  `{ kind: 'continue' }` for an MR in Mías and `{ kind: 'review' }` otherwise (Me toca revisar or Sigo) —
  or `{ kind: 'existing', workspaceId }` when a record of that same kind (review session or workspace) has
  that MR's branch in a matching repo, live or not — or
  `{ kind: 'none', reason }` with «Añade el repo de {proyecto} en Ajustes» when no registered repo has a remote
  naming the project and «Varios repos registrados son de {proyecto}» when several do. One test holds a case per
  clause.
  Proof: src/main/forge/openmr.test.ts an mr knows how it opens in atril
- **M34** When the person opens an MR as review, main shall start a review session (W90) in the matching repo's
  folder with the single prompt element «/libretto:libretto-review <url>»; as continue, it shall open a
  workspace on the MR's branch fetched from the matching remote (W89) and start the single prompt element
  «/libretto:libretto-flow», refusing an in-place repo with «Este repo trabaja en tu copia: cambia de rama a
  mano»; a failed fetch shall answer «No se pudo traer la rama: {detalle}»; a URL that is not https, holds a
  NUL or starts with «-» shall start nothing. One test
  holds a case per clause.
  Proof: src/main/forge/openmr.test.ts an mr opens through libretto's own path
- **M35** The MR view shall show «Revisar en Atril», «Seguir en Atril», «Ir al trabajo» or the `none` reason with a
  link to Ajustes → Repos, as M33 answers, beside M25's «Revisar con Libretto»; pressing a button shall end on
  Trabajo with that workspace selected (a dead one shows as stopped), or show the error in the view. One test
  holds a case per clause.
  Proof: src/renderer/mr/openmr.test.ts the mr view opens or finds its workspace

## Approach

`workFor` lee la última lista (url → list, branch, project, forge) y los repos con `git remote -v`. La sesión de
revisión es un registro de trabajo `mode: 'review'` cuyo `path` es la raíz del repo: no se crea rama ni worktree,
y quitarlo solo cierra la sesión de tmux. «Seguir» usa `openWorktree` con `existing: true` (W89): `git fetch
origin <rama>`, luego `git worktree add <ruta> <rama>` si la rama local existe o `git worktree add --track -b
<rama> <ruta> origin/<rama>` si no. Perdió: un worktree de Atril para revisar (lo duplica review-project).

## Checklist

- [x] main: workFor, the review session and the continue workspace (with W89, W90) · Closes: M33, M34, W89, W90
- [x] the MR view's states, the jump and the errors; tutorial «Tus MR» text (no criterion); sketch; photo · waits on box 1 · Closes: M35
