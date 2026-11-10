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

## Outcomes

- En una MR a revisar, un clic abre a Claude revisándola con Libretto, en su propio worktree de review-project.
- En una MR tuya, un clic deja un trabajo en su rama con Libretto retomando el cambio en curso.
- Si ya hay trabajo, te lleva a él; si falta el repo, te dice dónde añadirlo; si hay un error, lo ves en la MR.

## Scope boundaries

**In:** los tres estados del botón en la vista de la MR, la elección del repo, la sesión de revisión, el trabajo
en rama existente, «Ir al trabajo», los errores en la vista.
**Out:** clonar repos; MRs de forks sin remote que las nombre; elegir el comando; automático.
**Never scoped out:** la copia de la persona no se toca; la URL validada como un elemento del argv; nada sin pulsar.

## Prior decisions

- Revisar con review-project en su propio worktree; seguir con libretto-flow sin argumento (assumed, 10 nov).
- Repo por cualquier remote, como review-project (assumed, 10 nov).
- En sitio, solo revisar (assumed, 10 nov).
- Lista y rama de la MR desde la última lista de main (assumed, 10 nov).

## Verification criteria

- **M33** When the window asks `atril:mr:workFor(url)` for an MR in main's latest listing, main shall answer
  `{ kind: 'existing', workspaceId }` when a workspace record has that MR's branch in a matching repo,
  `{ kind: 'review' }` for an MR from Me toca revisar or Sigo, `{ kind: 'continue' }` for one from Mías, or
  `{ kind: 'none', reason }` with «Añade el repo de {proyecto} en Ajustes» when no registered repo has a remote
  naming the project and «Varios repos registrados son de {proyecto}» when several do. One test holds a case per
  clause.
  Proof: src/main/forge/openmr.test.ts an mr knows how it opens in atril
- **M34** When the person opens an MR as review, main shall start a review session in the matching repo's folder,
  touching no git ref, with `/libretto:libretto-review` and the validated URL as separate argv elements; as
  continue, it shall open a workspace on the MR's branch fetched from `origin` (W89) and start
  `/libretto:libretto-flow` with no argument, refusing an in-place repo with «Este repo trabaja en tu copia:
  cambia de rama a mano»; a URL that is not https, holds a NUL or starts with «-» shall start nothing. One test
  holds a case per clause.
  Proof: src/main/forge/openmr.test.ts an mr opens through libretto's own path
- **M35** The MR view shall show «Revisar en Atril», «Seguir en Atril», «Ir al trabajo» or the `none` reason with a
  link to Ajustes → Repos, as M33 answers; pressing a button shall end on Trabajo with that workspace selected, or
  show the error in the view.
  Proof: src/renderer/mr/openmr.test.ts the mr view opens or finds its workspace

## Approach

`workFor` lee la última lista (url → list, branch, project, forge) y los repos con `git remote -v`. La sesión de
revisión es un registro de trabajo `mode: 'review'` cuyo `path` es la raíz del repo: no se crea rama ni worktree,
y quitarlo solo cierra la sesión de tmux. «Seguir» usa `openWorktree` con `existing: true` (W89): `git fetch
origin <rama>`, luego `git worktree add <ruta> <rama>` si la rama local existe o `git worktree add --track -b
<rama> <ruta> origin/<rama>` si no. Perdió: un worktree de Atril para revisar (lo duplica review-project).

## Checklist

- [ ] main: workFor, the review session and the continue workspace (with W89, W90) · Closes: M33, M34, W89, W90
- [ ] the MR view's states, the jump and the errors; tutorial «Tus MR» text (no criterion); sketch; photo · waits on box 1 · Closes: M35
