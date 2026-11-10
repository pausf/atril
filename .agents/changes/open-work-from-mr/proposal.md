# open-work-from-mr

Tracker: none
Targets: mr
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> sigue creando funcionalidades. Tenemos que hacer el mejor gestor de IA, o sea, de orquestador y revisor de MRs, etcétera, porque lo queremos poner para que la gente le sea útil.

## Reading

Abrir un trabajo desde una MR (de la lista del 9 nov): en una MR a revisar o propia, «Abrir en Atril» crea el trabajo en su rama y lanza a Claude con la MR como contexto, para revisarla o seguirla.

## Decision log

### Session 2026-11-10
- Q: ¿Qué hace? → A: en la vista de una MR, «Abrir en Atril» crea un trabajo en la rama de la MR, en el repo
  registrado cuyo `origin` es el proyecto de la MR (la misma regla que M28), y lanza Claude con Libretto
  (assumed).
- Q: ¿Con qué comando? → A: una MR a revisar (Me toca revisar o Sigo) arranca con
  `/libretto:libretto-review <url>`, el skill de Libretto para revisar MRs en un worktree; una tuya (Mías)
  con `/libretto:libretto-flow <url>`, para seguir su flujo (assumed: Libretto es la llave; ninguno inventa
  un flujo nuevo).
- Q: ¿Y si ya hay un trabajo en esa rama? → A: el botón dice «Ir al trabajo» y lo abre, no crea otro (assumed).
- Q: ¿Y si ningún repo registrado es de ese proyecto? → A: el botón no sale y la vista dice «Añade el repo de
  {proyecto} en Ajustes» con enlace (assumed).
- Q: ¿Modo? → A: siempre manual: revisar o continuar una MR no salta la parada (assumed).

## Outcomes

- Desde una MR, un clic deja un trabajo en su rama con Claude ya leyéndola por el flujo de Libretto adecuado.
- Si ya existe, te lleva a él; si falta el repo, te dice dónde añadirlo.

## Scope boundaries

**In:** el botón en la vista de la MR, la elección del repo, crear el trabajo en la rama existente (traída de
`origin`), el comando según la lista, «Ir al trabajo».
**Out:** clonar repos que no están registrados; MRs de forks (la rama no está en `origin`); elegir otro comando.
**Never scoped out:** la rama y la URL viajan como un elemento del argv (W40/W41); nada se lanza sin pulsar; la
rama de la persona no se toca (worktree, o se rechaza si el repo está en modo en sitio con cambios).

## Prior decisions

- review-project para revisar, libretto-flow para lo tuyo (assumed, 10 nov).
- Mismo emparejamiento repo↔proyecto que M28 (assumed, 10 nov).
- Siempre en modo manual (assumed, 10 nov).

## Verification criteria

- **M33** When the person presses «Abrir en Atril» on an MR whose project matches exactly one registered repo
  (M28's `origin` rule) and no workspace exists on its source branch, main shall fetch that branch from `origin`,
  open a workspace on it and start Claude with `/libretto:libretto-review <url>` for an MR from Me toca revisar
  or Sigo, or `/libretto:libretto-flow <url>` for one from Mías, as one argv element, in manual mode; with a
  workspace already on that branch it shall answer that workspace instead; with no matching repo it shall answer
  `{ error }` and start nothing. One test holds a case per clause.
  Proof: src/main/forge/openmr.test.ts an mr opens as a workspace on its branch
- **M34** The MR view shall show «Abrir en Atril» when a matching repo exists and no workspace is on the branch,
  «Ir al trabajo» when one is, and «Añade el repo de {proyecto} en Ajustes» (a link to Repos) when none matches;
  pressing either button shall end on Trabajo with that workspace selected.
  Proof: src/renderer/mr/openmr.test.ts the mr view opens or finds its workspace

## Checklist

- [ ] main: match, fetch, open, the command per list, the existing case · Closes: M33
- [ ] the MR view's three states and the jump to Trabajo; tutorial step 15/16 text; sketch; photo · waits on box 1 · Closes: M34
