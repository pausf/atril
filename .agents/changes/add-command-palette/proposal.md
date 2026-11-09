Tracker: none
Targets: workspaces
Durable decisions: the ones in Prior decisions below

# add-command-palette

## The ask, verbatim

Pau, 9 nov 2026:

> sigue con todo haz mejoras, nuevas features

(⌘K was planned as phase 3 when the usability batch was agreed: «⌘K is phase 3», add-next-up.)

## The reading

Not a bug; new work. With five screens, many workspaces, MRs and tasks, getting somewhere takes
several clicks. A command palette on ⌘K lists everything you can go to or do, filtered as you type.

## Decision log

### Session 2026-11-09
- Q: «sigue con todo haz mejoras, nuevas features» — Pau → decisions taken with the recommended option, marked (assumed).
- Q: ¿Qué sale en la paleta? → A: pantallas, trabajos (por rama y repo), MRs de la última carga (título y proyecto), tareas de Jira (clave y título) y acciones: Nuevo trabajo, Nueva tarea, Actualizar MR, Marcar avisos leídos, Tutorial (assumed).
- Q: ¿Cómo filtra? → A: cada palabra escrita debe aparecer en el texto del elemento, sin distinguir mayúsculas ni tildes; como mucho 50 resultados (assumed).
- Q: ¿Cómo se abre? → A: ⌘K como acelerador del menú, igual que ⌘↩, así la terminal no se lo come (assumed).
- Q: (spec-reviewer) workspaces tiene ⌘K en «fuera de alcance» → A: este cambio lo saca de ahí al integrarse (assumed).
- Q: (spec-reviewer) ¿⌘K con otro diálogo abierto? → A: no hace nada (assumed).
- Q: (spec-reviewer) ¿Una tarea desde la paleta arranca sola si el repo está recordado? → A: hace lo mismo que pulsar Empezar en Tareas (I20/I21): es tu acción, como allí (assumed).

## Outcomes

- **⌘K** opens a palette over any screen: a search box and a list; typing filters it; ↑/↓ move,
  Enter runs the highlighted item, Escape closes.
- Items take you somewhere (a screen, a workspace, an MR view, a task's Start) or do something
  (new work, new task, refresh MRs, mark notices read, tutorial).

## Scope boundaries

**In:** the palette, its items, filtering, the keyboard, the menu accelerator. **Out:** recent or
ranked items, custom commands, running shell commands, searching inside files or MR comments, a
tutorial step for the palette. This change removes ⌘K from the workspaces spec's «Out» list.

**Never scoped out:** fully keyboard-operable with a visible highlight; MR titles, task titles and
branch names shown as text; the palette never posts anything, and a task item does exactly what
Tareas' Empezar does (I20/I21).

## Constraints

- Uses data the app already holds: workspaces, the app-wide MR listing (M9), the Jira inbox, the
  notices; no new request when it opens.
- ⌘K is a menu accelerator (like N2's ⌘↩); every text through `t()` (S16).

## Prior decisions

- **⌘K, phase 3** — agreed in the usability batch (add-next-up).

## Task breakdown

- `src/renderer/palette/{Palette.tsx,items.ts}`: items from app state, the filter, the keyboard.
- `src/main/menu.ts`: the ⌘K item sending `{ kind: 'palette' }`.

## Verification criteria

- **W54** When the person presses ⌘K (the menu item «Buscar…») and no other dialog is open, Atril shall
  open the palette with the search box focused, over whatever screen is shown; with a dialog open it
  shall do nothing.
  Proof: src/main/i18n.test.ts main speaks the chosen language
  Proof: src/renderer/palette/palette.test.ts command k opens the palette and runs an item
- **W55** The palette shall list the five screens, every workspace («{branch} · {repo}»), every MR of
  the latest listing («{title} · {project}»), every Jira task already loaded («{key} {title}») and the
  actions Nuevo trabajo, Nueva tarea, Actualizar MR, Marcar avisos leídos and Tutorial; typing shall
  keep only the items whose text contains every typed word, ignoring case and accents; the list shall
  show at most 50 after filtering (the first 50 with an empty box).
  (The proof asserts the five screens and one item of each other kind with an empty box, a two-word
  query matching across accents and case, and 60 tasks cut to 50.)
  Proof: src/renderer/palette/palette.test.ts the palette filters by every word
- **W56** ↓ and ↑ shall move the highlight, wrapping at both ends; Enter shall run the highlighted item
  and close the palette; Escape shall close it and give focus back to where it was.
  Proof: src/renderer/palette/palette.test.ts the palette moves with the keyboard
- **W57** Running an item shall do what its own control does: a screen opens it, a workspace selects
  it on Trabajo, an MR opens its MR view (switching to MR), a task does what Empezar does in Tareas,
  and each action runs its button's handler.
  Proof: src/renderer/palette/palette.test.ts each kind of item goes where it says

## Approach

### Summary

The menu gains «Buscar…» with ⌘K sending `{ kind: 'palette' }` through the existing
`atril:menu:action` channel. App holds `paletteOpen` and builds items from its state
(`items.ts` returns `{ id, kind, label, run }`). `Palette.tsx` is a modal with an input and a
listbox (`role="listbox"`, `aria-activedescendant`), using `useModalKeys` for Escape and focus.

### Technical context

Files: `src/main/menu.ts` (+ its labels in the catalog), `src/preload/api.ts` (`MenuAction`),
`src/renderer/palette/{Palette.tsx,items.ts}` (+ `palette.test.ts`), `src/renderer/App.tsx`,
`src/renderer/mr/MrScreen.tsx` (open by url, exists), `styles.css`, catalog, `bocetos/novedades.html`.
Gates: typecheck, lint, test.

### The approach

- Normalise for matching: lower case, NFD without combining marks.
- The list keeps the item order: screens, actions, workspaces, MRs, tasks.
- The menu label is «Buscar…» (Spanish key, English «Search…»), so W48's menu test keeps covering it.
- Handlers all live in App already: `setScreen`, `setSelected`, the new-work/new-task dialog state,
  `beginStart` (Tareas' Empezar), the app-wide MR hook's `refresh`, the avisos hook's `markRead('all')`,
  `setTourOpen(true)`, and `openUrl` + screen 'mr' for an MR.
- ⌘K as a menu accelerator reaches main before xterm; xterm has no ⌘K binding of its own.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| A fuzzy-matching library | every-word containment is enough for names and branches |
| A keydown listener in the window for ⌘K | xterm would swallow it while the terminal has focus |

### Risks

| Risk | What catches it |
|---|---|
| Too many items with many tasks | the 50 cap after filtering |

### Validation and rollback

W54–W57 seen red first. Rollback: one revert.

### Complexity deliberately kept

None.

## Checklist

- [x] ⌘K in the menu, the palette with its items, filter, keyboard and actions, the tutorial line · Closes: W54, W55, W56, W57
