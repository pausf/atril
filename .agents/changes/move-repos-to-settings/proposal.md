Tracker: none
Targets: settings
Durable decisions: the ones in Prior decisions below

# move-repos-to-settings

## The ask, verbatim

Pau, 9 nov 2026:

> el diseño de erepos es raro

## The reading

Not a bug; a design change. Each registered repo fills the Trabajo sidebar with its name and
mode, a reason line, an Auto/Worktree/In-place switch and its own «+ trabajo» form, so a few
repos push the running work out of sight — and repos are configuration, touched once. Proposed
in `bocetos/repos.html`: Repos becomes a card in Ajustes (one row per repo: name, path, a mode
select whose reason is a tooltip, «Añadir repo…»); the sidebar keeps only «Trabajo en marcha»
under one «＋ Nuevo trabajo» that opens the own-task dialog with the text optional (text → the
Libretto flow; no text → plain Claude); with no repos, that dialog points to Ajustes → Repos.

## Decision log

### Session 2026-11-09
- Q: ¿Te vale el boceto `bocetos/repos.html` (repos en Ajustes, «＋ Nuevo trabajo» en la barra)? → A: «ok».
- Q: «No le preguntes, tú sigue» stands → the rest taken with the recommended option, marked (assumed).
- Q: ¿Cómo se llama el diálogo cuando se abre desde Trabajo? → A: «Nuevo trabajo», el mismo diálogo que «Nueva tarea» con el texto opcional (assumed).
- Q: ¿Y sin texto? → A: Claude a secas, sin `/libretto:libretto-flow`, como hacía «+ trabajo»; la rama hay que escribirla (assumed).
- Q: (spec-reviewer) ¿«Auto» guarda el modo detectado? → A: no: Auto quita lo forzado (`setOverride(id, null)`), así la detección sigue mandando (W4) (assumed).
- Q: (spec-reviewer) ¿Qué pasa al pulsar «Ir a Ajustes»? → A: el diálogo se cierra y se ve Ajustes; al volver se abre de nuevo y relee los repos (assumed).
- Q: (spec-reviewer) ¿Qué dice el diálogo sin texto obligatorio? → A: etiqueta «¿Qué hay que hacer? (opcional)»; la fila «Lanza» muestra `claude` sin texto y `/libretto:libretto-flow «tu texto»` con texto (assumed).
- Q: (spec-reviewer) ¿Y el boceto? → A: `bocetos/repos.html` queda como registro de la decisión; `fase1-nucleo.html` se actualiza para verse igual (tarjeta en Ajustes, botón en la barra) (assumed).
- Q: (spec-reviewer) ¿El tutorial? → A: no tiene paso de repos; no cambia (assumed).
- Q: ¿Dónde se ve el motivo del modo? → A: como `title` del desplegable y, en texto, bajo el nombre cuando el modo es in-place, que es el que conviene entender (assumed).

## Outcomes

- Ajustes has a **Repos** card: one row per registered repo with its id and path, and a mode
  select — «Auto · <detected mode>», «Worktree», «In-place» — plus «Añadir repo…».
- The Trabajo sidebar shows **«＋ Nuevo trabajo»** above «Trabajo en marcha» and no repo list.

## Scope boundaries

**In:** the Repos card (list, mode select, add with the id prompt), removing the sidebar's Repos
section and its per-repo «+ trabajo» form, the sidebar button (`spec-workspaces.md`), the
dialog's optional text and the no-repo pointer (`spec-work-inbox.md`). **Out:** removing a repo
(not possible today either), renaming a repo, editing its path.

**Never scoped out:** the card uses only native `<select>`, `<input>` and `<button>` controls, so
it is keyboard-reachable like the other cards (W22) — a ceiling named: no test drives it by
keyboard; add one if a custom control ever replaces a native one. The add flow keeps its
validation (id pattern, not a git folder).

## Constraints

- Same `repos` API as today (`list`, `add`, `addWithId`, `setOverride`); nothing in main changes.
- The card sits between Jira and Apariencia and uses the existing card styles.

## Prior decisions

- **Repos are configuration** — Pau, 9 nov: «el diseño de erepos es raro» → «ok» to the sketch:
  repos live in Ajustes; the Trabajo sidebar is for the work that is running.

## Task breakdown

- Move the repo list into `src/renderer/settings/Repos.tsx` as a card with a mode select.
- Sidebar: drop the Repos section, add «＋ Nuevo trabajo».
- Dialog: optional text when opened from Trabajo; the no-repo pointer to Ajustes.

## Verification criteria

- **S11** While Ajustes is shown, the Repos card shall list every registered repo with its id,
  its path and a mode select offering «Auto · <detected mode>», «Worktree» and «In-place»;
  choosing «Worktree» or «In-place» shall store it as the repo's mode (W4), choosing «Auto» shall
  clear it, and the select shall show the choice; a repo detected as in-place shall show the
  reason under its path.
  Proof: src/renderer/settings/repos.test.ts repos card lists and sets the mode
- **S12** When the person adds a repo from the card and its id is taken, the card shall ask for
  another id and register it with the one given.
  Proof: src/renderer/settings/repos.test.ts adding a repo asks for a free id
- **S13** If the folder the person picks is not a git repository, then the card shall say «Esa
  carpeta no es un repositorio git.» and register nothing.
  Proof: src/renderer/settings/repos.test.ts a folder that is not git is refused

## Approach

### Summary

`components/Repos.tsx` moves to `settings/Repos.tsx` and is rendered as a card in Ajustes; its
per-repo segmented switch becomes one `<select>` and its «+ trabajo» form is deleted. The
Sidebar gets a «＋ Nuevo trabajo» button that asks App to open `OwnTaskDialog` with
`textOptional`. With no text the dialog calls `workspaces.open` without the fifth argument.

### Technical context

React renderer only. Files: `src/renderer/settings/{Repos,Ajustes}.tsx`,
`src/renderer/components/{Sidebar,Repos}.tsx` (the second deleted), `src/renderer/App.tsx`,
`src/renderer/inbox/OwnTaskDialog.tsx`, `styles.css`; tests
`src/renderer/settings/repos.test.ts` (new), `src/renderer/sidebar.test.ts`,
`src/renderer/inbox/owntask.test.ts`; the sketch `bocetos/fase1-nucleo.html`. Gates:
typecheck, lint, test.

### The approach

- The select's value is the override or `auto`; its options read «Auto · <repo.mode>»,
  «Worktree», «In-place»; `title` holds `repo.reason`; an in-place row also shows the reason as
  text under the path.
- The id prompt and its errors move with the component unchanged.
- `OwnTaskDialog({ textOptional, onOpenSettings })`: title «Nuevo trabajo» when `textOptional`;
  `ready` drops the text condition then; submit passes the text only when it is not blank. The
  label gains «(opcional)» and the «Lanza» row shows `claude` while the text is blank.
- App keeps `dialog: 'task' | 'work' | null`; Sidebar loses `onCreate` (and App its `create`) and
  gains `onNewWork`; «Ir a Ajustes» closes the dialog and sets the screen to Ajustes.
- The sketch `fase1-nucleo.html` gets the Repos card in its Ajustes view and the sidebar button,
  as in `bocetos/repos.html`, which stays as the record of the decision.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Keep repos in the sidebar, compacted | still config mixed with daily work; Pau's «raro» was about the place, the sketch was approved |
| A separate Repos screen in the rail | a fourth screen for something touched once |
| Keep «+ trabajo» per repo in Ajustes | starting work belongs where the work is, not in settings |

### Risks

| Risk | What catches it |
|---|---|
| A person with no repos cannot find where to add one | the dialog's «Ir a Ajustes» (I25) |
| W28 loses its proof when Repos goes | the proof is re-pointed and seen red against a non-folding section first |

### Validation and rollback

S11, S12, W43, I27 and the amended I25 seen red before the code. Rollback: one revert.

### Complexity deliberately kept

None.

## Checklist

- [ ] repos as a card in Ajustes, «＋ Nuevo trabajo» in the sidebar with the optional text, the no-repo pointer, the sketch · Closes: S11, S12, S13, W43, W28, I23, I27, I25
