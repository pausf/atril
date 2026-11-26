# skills-dense

Tracker: none
Targets: skills
Durable decisions: the four in Prior decisions below

## The ask, verbatim

> The Skills screen is confusing with many skills (Pau has 169: 153 on, 14 off, ~40 from plugins). Today each one is a big card, three per row, ~150 px tall, so the list is ~57 rows of scrolling, and every card repeats «Personal · Activa» badges that the group header and the filter already say. Make it scannable at 150+ items, keeping the minimal grey + one accent style:
> - A dense list instead of cards: one row per skill (name, one-line description, last used, on/off state), ~36 px, so a screen shows 20+ rows. Badges only when they add information (a clash, off, a plugin name).
> - Groups by origin (Personal, Project, each plugin) collapsible with their counts; plugins collapsed by default so a plugin's 40 skills do not drown the personal ones.
> - Sort: most recently used first by default, with name as the alternative.
> - The four tiles act as filters (click «Sin usar en 30 días» shows only those, click again clears).
> - Keyboard: ↑/↓ moves through rows, Enter opens the detail, / focuses search.
> Keep every existing feature (search, Todas/Activas/Apagadas, repo selector, detail, toggle, editor, plugins, usage). Skills criteria use K ids: continue after the last one. Tests first; drive it in the real app with a seeded catalog of 150+ example skills (no real names) before landing; UI texts through t() with Spanish in i18n-es.ts; all in English.

(Pau, 26 Nov 2026.) Not a bug: a change of how something built works. Checked: there is no `i18n-es.ts`; the Spanish text is the key passed to `t()` and the English lives in `src/preload/i18n-en.ts`.

## Decision log

### Session 2026-11-26
- Q: Where does the Spanish go, given there is no `i18n-es.ts`? → A: as today: the Spanish text is the `t()` key and its English entry goes in `src/preload/i18n-en.ts` (assumed: a second catalog would split one convention in two; wrong only if Pau wants English keys, which is a separate migration).
- Q: Does a row switch the skill on and off itself? → A: no: the row shows the state; changing it stays in the detail (K15) and in the plugin group's switch (assumed: an inline switch puts a settings write one stray click away in a list built for scanning; if wrong, it is one switch per row calling the same `setState`).
- Q: Which marks does a row keep? → A: only what the group and the filter do not already say: «comando», a state other than «Activa», the clash («No se carga: …»), «Claude no la usa sola», «Cabecera ilegible». No origin and no «Activa». The plugin name is already in the row's `/plugin:name` (assumed).
- Q: A collapsed plugin group while searching? → A: while a search or a filter narrows the list, every group with matches opens and every group without matches hides; clearing gives each group back the state it had (assumed: a search that finds a row inside a closed group and hides it reads as «nothing found»).
- Q: The plugin controls (switch, Actualizar, Quitar) once each plugin is its own group? → A: in the group's header, beside the button that folds it; «Añadir plugin» and the plugin notes stay in a «Plugins» line above the plugin groups (assumed: a control inside `<summary>` is not reachable cleanly, so the header is a fold button plus its controls).
- Q: «Recientes» before the usage answers? → A: by name until it answers; also when it fails (assumed: K37 already says nothing about use then).
- Q: Is the fold state remembered across visits? → A: no: per visit, kept across repo picks (assumed: one more `ui.json` key for little gain).
- Q: How do the tiles and the Todas/Activas/Apagadas buttons relate? → A: they are one filter: the «Activas» tile and the «Activas» button are pressed together; «Choques» adds a filter of its own (assumed).
- Q: «20+ rows on a screen»? → A: rows are 36 px, and the tiles become one-line buttons so the header takes less room; checked in the real app at Pau's window size (1440×884) with a seeded catalog of 170 example skills, photo in `bocetos/novedades/skills-densa.png` (assumed: «a screen» means the list once scrolled past the header).
- Q: The seeded catalog? → A: ~~a scratchpad script~~ → `scripts/seed-skills.mjs` after the spec review: it writes a temporary `ATRIL_CLAUDE_DIR` (skills, two plugins, sessions for usage) and `ATRIL_HOME`, example names only (assumed).
- Q: (phase 5) How to build it? → A: rows and fold groups inside the existing screen: `SkillCard` becomes `SkillRow`, a small `SkillGroup` (header button + controls slot + list) replaces `<details>`, one sort and one filter state in `Skills.tsx`, arrows handled on the list, «/» on the window while the screen is mounted. Lost: an ARIA `grid`/`treegrid` with roving tabindex (more keyboard contract than asked, and screen readers announce grids worse for a list of buttons); keeping `<details>` and putting the plugin controls outside the summary (two places for one plugin, and `<details>` cannot be forced open while narrowing without fighting its own toggle) (assumed).
- Q: (spec-reviewer) K6, K15, K24, K33 still say card and bar? → A: amended in this change: «row» for card, «plugin group header» for bar; K6 keeps the Activas/Apagadas empty messages, K42 adds only Choques (assumed).
- Q: (spec-reviewer) Which segmented button is pressed under «Choques» or «Sin usar»? → A: none (assumed: «Todas» pressed would say every item shows).
- Q: (spec-reviewer) What is «narrowed», and what does a header do then? → A: narrowed = the search holds non-blank text or the filter is not «Todas»; the sort never narrows. While narrowed the headers are disabled (the groups are forced open) and the remembered folds do not change (assumed).
- Q: (spec-reviewer) The two numbers on a plugin header? → A: the fold button counts the rows it shows now; «{n} skills» counts all of that plugin's items (assumed).
- Q: (spec-reviewer) Footers while narrowed? → A: «Nueva skill» and the project's empty note show only when not narrowed; the «Plugins» line («Añadir plugin», notes, problems) always shows (assumed: they are actions, not results).
- Q: (spec-reviewer) Sorting shadowed rows and ties? → A: a shadowed row sorts with the rows with no use; equal `last` goes by name (assumed).
- Q: (spec-reviewer) Enter, the editor and leaving the search box? → A: Enter on a row opens its detail; «text field» includes the editor's textarea; ↓ in the search box moves to the first visible row (assumed).
- Q: (spec-reviewer) K44 is a string check? → A: accepted ceiling: jsdom has no layout; the test also checks no other `.skr` rule sets a height, and the real-app photo carries the rest (assumed).
- Q: (spec-reviewer) «20+ rows» has no threshold and its script is not committed? → A: the seed goes to `scripts/seed-skills.mjs` (example names only) so the drive can be repeated; the photo at 1440×884, scrolled into the list, must show at least 20 whole rows, counted in the report (assumed).
- Q: (spec-reviewer) A row in a switched-off plugin? → A: dimmed, with no mark: a row is dimmed when `state` is `off`, `enabled` is false or it is shadowed; the header says «apagado entero» (assumed).
- Q: (spec-reviewer) `i18n-en.ts` is governed by workspaces? → A: as in every skills change: new entries only, covered by the S16/S19 scans; no workspaces delta (assumed).
- Q: Interview? → A: none: CLAUDE.md says to go on without asking and mark the recommended option `(assumed)`; every line above is that.

## Outcomes

With 150+ skills, the Skills screen reads as a list: one 36 px line per skill with its name, its description, when it was last used, and a mark only when there is something to know (off, a clash, a command, a broken header). Groups by origin fold, with their counts. Plugins and Atril start folded, so a plugin's 40 skills do not bury the person's own. Rows are sorted by most recent use, or by name. The four tiles filter. ↑/↓, Enter and / work from the keyboard. Everything the screen did before still works: search, Todas/Activas/Apagadas, repo selector, detail, state, plugin switch, editor, «Nueva skill», plugins, and usage.

## Scope boundaries

**In:** `src/renderer/skills/Skills.tsx`; `src/renderer/skills/SkillCard.tsx` (the card becomes a row; the file keeps `fullName`, `stateLabel`, `originLabel` and `lastUsed`, which the detail uses); `src/renderer/styles.css` (the `.sk*` rules); `src/preload/i18n-en.ts`; `src/renderer/skills/skills.test.tsx`; `bocetos/novedades.html`, `bocetos/novedades/skills-densa.png`, `bocetos/fase1-nucleo.html`; `scripts/seed-skills.mjs` (the seeded example catalog for the real-app drive); the amended K5, K6, K7, K15, K24, K33 and K37, and the new K40–K44 in the skills spec.
**Out (named):** an on/off switch on each row; remembering folds or sort across visits; virtualised rendering (170 rows of plain buttons need none; if a list ever passes ~1000, window it); drag to reorder; bulk actions on several rows; changes in main or the IPC; the detail panel itself.

## Constraints

- Renderer only: no new IPC, no change to what main answers, no new dependency.
- Minimal style: grey and the one accent, colours only as tokens; row height 36 px.
- Texts through `t()` with an English entry; the S16/S19 scans stay green.
- Keyboard and screen reader: group headers are buttons with `aria-expanded`; tiles are buttons with `aria-pressed`; rows stay buttons inside a list.
- Test names cited by other criteria are not renamed (lesson mr-page-wide); new test names in double quotes (lesson skills-editor · 8).

## Prior decisions

- (2026-11-26, skills-dense) A row shows its state but does not change it; the detail and the plugin group's switch do (assumed).
- (2026-11-26, skills-dense) While a search or filter narrows the list, groups with matches open and groups without hide; otherwise each group keeps its own fold, plugins and Atril starting folded (assumed).
- (2026-11-26, skills-dense) The tiles and Todas/Activas/Apagadas are one filter; «Choques» is a fourth filter (assumed).
- (2026-11-26, skills-dense) No virtualisation — ponytail: plain rows up to ~1000 items; window the list past that.

## Task breakdown

- Row instead of card: content, marks, one line, 36 px.
- Groups: Personal, Proyecto, one per plugin (header with its controls), Atril; fold buttons with counts; defaults; narrowed behaviour.
- Sort control: Recientes / Nombre.
- Tiles as filter buttons, sharing state with the segmented filter; «Choques» filter.
- Keyboard: ↑/↓ between rows, / to search.
- Real-app drive with a seeded catalog of 170 skills; photo; novedades and the sketch.

## Verification criteria

- **K5** (amended) When the person opens «Skills» from the rail (after Avisos) or from ⌘K, the screen shall show the heading «Skills» with the number of items; the lead «Las skills y los comandos / que tu Claude Code tiene a mano en cada trabajo. Los lee de sus carpetas, sin gastar cuota.»; a repo selector of Atril's repos with the first picked (with none: no selector, no Proyecto group, and «Añade un repo en Ajustes → Repos para ver sus skills.»); the tiles «Activas» (items with `state` `on` or `name-only`, not shadowed, and `enabled` when they have it, with «~{n} tokens de contexto», n = characters of name + description + whenToUse of those items ÷ 3.2, rounded), «Apagadas» (`state` `off`, or `enabled` false) and «Choques» (shadowed items); a line «Plugins» with «Añadir plugin»; and the groups «Personal», «Proyecto ({repo})», one group per plugin and «Atril» («solo lectura»), each with a header button naming it and the number of rows it shows, a plugin's header also showing «{plugin} · {n} skills · activo | apagado entero» and its controls (K15, K33). Each row shall show `/name` (plugin and Atril items `/{plugin before @}:name`), the description on one line, and only these marks when they apply: «comando» for commands, the state when it is not `on` («Solo el nombre», «Solo si la llamas tú» or «Apagada»), «No se carga: gana la personal» or «No se carga: gana la skill» when shadowed, «Claude no la usa sola» when `disableModelInvocation`, «Cabecera ilegible» when `broken`; a row shall not show its origin nor «Activa»; a row shall be dimmed when its `state` is `off`, its `enabled` is false or it is shadowed. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx the screen groups every skill by where it comes from
- **K6** (amended) When the person types in «Buscar por nombre o descripción…» (matching name, description or whenToUse, case-insensitive) or picks «Todas», «Activas» or «Apagadas» (K5's definitions), the screen shall show only the matching rows; with a search and none it shall say «Nada se llama «{q}».» with «Borrar la búsqueda»; with no search and none, «No tienes ninguna activa.» or «No tienes ninguna apagada.»; a repo with no project items shall say «{repo} aún no tiene skills propias.» while nothing narrows the list (K40).
  Proof: src/renderer/skills/skills.test.tsx search and filter narrow the cards
- **K7** (amended) When the person activates a row, a detail panel shall open with `/name`, origin, state, the description, the header fields that are set, the instructions as plain text (markup shown literally) and the path; Escape or «Cerrar» shall close it and return focus to the row.
  Proof: src/renderer/skills/skills.test.tsx a card opens its detail and escape closes it
- **K37** (amended) When the Skills screen shows and the usage answers, each row not shadowed shall show «usada hoy», «usada hace 1 día», «usada hace {n} días» or (no entry for its name) «sin usar en 30 días», matching the row's name without the slash (K5), and a shadowed row shall say nothing about usage; a fourth tile «Sin usar en 30 días» shall count the items that are not `atril`, not `off`, not shadowed, not `enabled: false` and have no use, with «candidatas a apagar» (or «todas en uso» at 0), and activating it shall filter to those items as a pressed toggle that a second press, «Todas» or another filter undoes, showing «No tienes ninguna sin usar.» when none; the usage shall be asked once per visit to the screen, not again on a repo pick; while it has not answered, or it answered `{ error }`, rows shall say nothing about usage and the tile shall not show. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx "shows when each skill was last used and filters the unused ones"
- **K15** (amended) When the person opens a `personal` or `project` item's detail (K7), the panel shall show «Estado» with «Activa», «Solo el nombre», «Solo si la llamas tú» and «Apagada» (the current one picked); picking another shall call `atril:skills:set` and, when it answers, show the new state on the row and «Hecho. Las sesiones nuevas de Claude Code ya lo cargan así.», plus «También cambia {n} más con el mismo nombre.» when other personal or project items share the name and read the same file; each plugin group header shall have a switch «Activo» doing the same with `enabledPlugins`, shown whether the group is folded or not; with `lockedBy` the control shall be disabled with «Lo fija {file}»; an `atril` item shall have no control. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx state and plugin switch write through set
- **K24** (amended) While the editor holds text different from `base`, when the person presses Escape, «Cerrar», «Descartar», activates another row or changes repo, the screen shall ask «Tienes cambios sin guardar. ¿Descartarlos?» with «Descartar cambios» and «Seguir editando», and leave the editor only on «Descartar cambios»; with no changes it shall leave without asking; when the person leaves the Skills screen instead, the text shall be kept in memory per `path` and, on opening that item's «Editar» again in the same run, come back with «Tienes cambios sin guardar de antes.». One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx leaving with unsaved changes asks first
- **K33** (amended) When the Skills screen shows, it shall load the catalog (K27) and give each plugin group header «Actualizar» and «Quitar» acting on its `user` install, or else on its `local` install whose `projectPath` is the picked repo's path; with neither, the header shall show «Instalado en otro ámbito: se gestiona fuera de Atril.» and no buttons. «Actualizar» shall run K28's `update` with that scope; «Quitar» shall first ask «¿Quitar {plugin}? Sus skills dejan de cargarse.» with «Quitar» and «Cancelar», and only on «Quitar» run `uninstall`; success shows «Hecho.»; `atril` items have neither. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx update and remove a plugin from its bar
- **K40** The Skills screen shall show «Personal» and «Proyecto» unfolded and every plugin group and «Atril» folded when it opens; activating a group's header button shall fold or unfold it (`aria-expanded`), and that fold shall hold across repo picks for the visit; each header button shall count the rows its group shows now. While the list is narrowed — the search holds non-blank text or the filter is not «Todas»; the sort never narrows — every group with matching rows shall show unfolded, every group without one shall not show, the header buttons shall be disabled, and «Nueva skill» and the project's empty note shall not show; the «Plugins» line shall always show. When the search and filter are cleared each group shall return to the fold it had. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx "groups fold, plugins start folded, a search opens what matches"
- **K41** The Skills screen shall offer «Orden» with «Recientes» (pressed when the screen opens) and «Nombre»; with «Recientes» and the usage answered, rows inside each group shall go by their `last` use, newest first, then the rows with no use (shadowed rows count as no use) by displayed name, equal `last` by displayed name; with «Nombre», or before the usage answers, or when it answered `{ error }`, by displayed name, case-insensitive. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx "rows go by most recent use, or by name"
- **K42** When the person activates the «Activas», «Apagadas» or «Choques» tile, the screen shall show only those items (K5's definitions) with that tile pressed, and activating it again or «Todas» shall show every item; the «Activas» and «Apagadas» tiles and buttons shall be pressed together, and under «Choques» or «Sin usar en 30 días» no segmented button shall be pressed; with «Choques» and none it shall say «No tienes ningún choque.». One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx "the tiles filter and a second press clears"
- **K43** When focus is on a row, ↓ and ↑ shall move it to the next and previous visible row across groups, staying put at either end, and Enter shall open its detail (K7); ↓ in the search box shall move focus to the first visible row; when the person presses «/» while focus is not in a text field (an input or a textarea, the editor's included), a select or an open dialog, the search box shall take focus and no «/» shall be typed; inside a text field «/» shall type as usual. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx "arrows move between rows and slash goes to search"
- **K44** Each row shall be one line 36 px high: the `.skr` rule in `styles.css` sets `height: 36px` and no other `.skr` rule sets a height, and the description does not wrap (`white-space: nowrap` with `text-overflow: ellipsis`).
  Proof: src/renderer/skills/skills.test.tsx "a row is one 36 px line"

## Approach

### Summary

Reshape the Skills screen in the renderer only. Each card becomes a one-line row in a plain list. Each origin becomes a `SkillGroup` with a header button that folds it. The tiles become buttons that share the existing `filter` state. A `sort` state orders the rows inside each group. One keydown handler on the list moves focus with the arrows, and one window handler sends «/» to the search box. Main, IPC, the detail and the dialogs stay as they are.

### Technical context

Electron + React 19 + TypeScript, vitest with jsdom and Testing Library (`src/renderer/skills/skills.test.tsx`, 18 tests, its mock in `src/renderer/mockApi.ts`). The gates are `pnpm -s typecheck`, `pnpm -s lint` (also run by the pre-commit hook) and `pnpm -s test`. Blast radius is five files: `Skills.tsx`, `SkillCard.tsx` (renamed to `SkillRow.tsx`, imported by `SkillDetail.tsx` for `fullName`/`stateLabel`/`originLabel`/`lastUsed`), `styles.css` (the `.sk*` block around lines 4926–5050 and 5277), `i18n-en.ts`, and the test. Docs: `bocetos/novedades.html`, `bocetos/fase1-nucleo.html` and one PNG.

### The approach

- **Row** (`SkillRow.tsx`): `<li><button class="skr">` holding `<b>` name (fixed ~34ch column, ellipsis), description (flex, ellipsis), marks (K5's list only), and last used (right, muted, K37). `.off` dims it as the card did. Its `aria-describedby` points at the marks and the use, so a screen reader still hears them.
- **Group** (`SkillGroup` in `Skills.tsx`): a `<section aria-label>` holding a header `<div class="skgh">` with `<button aria-expanded>` («▸/▾ name · count»), an optional `controls` node (the plugin switch, «Actualizar», «Quitar», «Lo fija», the scope note) and, when open, the `<ul class="skrows">` plus any footer («Nueva skill», the empty project note). Groups are keyed `personal`, `project`, `plugin:<id>` and `atril`. A `folded: Record<string, boolean>` state starts with plugin and Atril folded, holds for the visit, and is not reset on a repo pick. Open = `narrowed ? hasMatches : !folded[key]`. While narrowed, a group without matches renders nothing, with one exception: the project group's «aún no tiene skills propias» note shows only when not narrowed, as today.
- **Plugins line**: `<div class="skpl">` holding «Plugins», «Añadir plugin», `pluginNote` and `pluginFail`, above the plugin groups. The header text becomes «{plugin} · {n} skills · {state}» (K5).
- **Filter**: `Filter` gains `'clash'`. The four tiles are `<button class="skct" aria-pressed>` with `onClick={() => setFilter(f => f === x ? 'all' : x)}`, and the segmented buttons set the same state. Empty text for `clash`: «No tienes ningún choque.» The tiles become one line (number, label, small text inline) so the header is shorter.
- **Sort**: `sort: 'recent' | 'name'`, a segmented «Orden» group next to the filter. `byName` uses `localeCompare` with `sensitivity: 'base'` on `fullName`. `byRecent` sorts on `useOf(i)?.last` descending, then by name; when `usage` is null it is `byName`. It is applied in `of(origin)` and per plugin.
- **Keys**: `onKeyDown` on the screen's list container: ArrowDown/ArrowUp with `e.target.matches('.skr')` collects `container.querySelectorAll('button.skr')` in DOM order, focuses the neighbour, calls `preventDefault`, and stays put at the ends. A `useEffect` adds a `keydown` listener on `window`: if `e.key === '/'` and `e.target` is not `input, textarea, select, [contenteditable]`, and nothing matches `[role=dialog][aria-modal=true]` in the document (the detail is an `<aside>`, not a dialog: «/» there goes to search unless focus is in its editor's textarea), then `preventDefault()` and `search.current?.focus()`. It is removed on unmount.
- **CSS**: `.skrows` is a list with no gap and a 1px `--line` between rows. `.skr` is a grid `minmax(0,34ch) minmax(0,1fr) auto auto` with `height: 36px`, `white-space: nowrap` and `text-overflow: ellipsis` on the text cells. It uses existing tokens only (`--line`, `--hover`, `--sub`, `--card`, the accent for focus).

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| ARIA `grid`/`treegrid` with roving tabindex | more keyboard contract than asked (cells, Home/End, row vs cell focus); a list of buttons is what it is, and it reads better |
| Keep `<details>`, controls outside the summary | a plugin's controls in two places; forcing `open` while narrowing fights the element's own toggle event |
| Virtualised list (react-window or by hand) | a new dependency or a scroll engine for 170 rows that render in a few ms; named in Prior decisions with its ceiling |
| Row as a `<table>` | columns are nice, but a table of buttons announces worse and fights the group headers |

### Risks

| Risk | What catches it |
|---|---|
| Existing tests find cards by the old roles/labels (`group` with a plugin name, `details` `open`) and break for the wrong reason | the 18 tests run before and after; any edit to an existing test changes only the query, never the assertion, and is listed in the report |
| A plugin group folded by default hides the switch and «Actualizar» that K15/K33's tests click | the header (and its controls) shows while folded; only the rows fold |
| «/» stealing a keystroke from the editor or a dialog | K43's test types «/» in the search box and in the editor textarea; the guard checks `e.target` and open dialogs |
| Snapshot views (`skills-estado`, `skills-uso`, `skills-editor`) open a personal item that sits in an unfolded group: still fine; a plugin item would not be visible | they pick personal items only, unchanged |
| 36 px only holds if nothing wraps | K44's CSS test, plus the real-app photo at 1440×884 |

### Validation and rollback

New tests: K40–K44 plus the amended K5/K37 assertions, written first and seen red. The ones that could pass for the wrong reason: K40's narrowed-opens clause (a plugin row present in the DOM but inside a closed group) asserts visibility through `aria-expanded` and the row's presence, and is forced red by not opening when narrowed. K43's arrow clause asserts `document.activeElement` and is forced red without `preventDefault`/focus. K44 reads `styles.css` text and is forced red by changing 36 to 40. Then a real-app drive: Playwright over CDP against the dev app with a seeded `ATRIL_CLAUDE_DIR` (170 skills, 2 plugins, sessions), at 1440×884, scrolling, folding, filtering and pressing keys, with a photo. Rollback: one revert, nothing migrates.

### Complexity deliberately kept

`SkillGroup` exists because four kinds of group share fold, count and narrowed behaviour, and the plugin one also carries controls. Inlining it four times is how K40 would drift between groups.

## Checklist

- [x] Rows and fold groups replace the cards: `SkillRow`, `SkillGroup` with plugin controls in the header, the «Plugins» line, 36 px CSS, existing tests' queries moved to rows (assertions changed only where an amended criterion says so) · Closes: K5, K6, K7, K15, K24, K33, K37, K40, K44
- [x] Sort «Recientes» / «Nombre» inside each group · waits on box 1 · Closes: K41
- [x] Tiles as filter buttons sharing state with Todas/Activas/Apagadas, plus «Choques» · waits on box 1 · Closes: K42
- [x] ↑/↓ between rows and «/» to search · waits on box 1 · Closes: K43
- [x] Real-app drive at 1440×884 with a seeded catalog of 171 example skills (`scripts/seed-skills.mjs`), at least 20 whole rows counted on the photo, photo `bocetos/novedades/skills-densa.png`, `bocetos/novedades.html` section and history, `bocetos/fase1-nucleo.html` · waits on boxes 1–4 · Closes: the outcome «20+ rows on a screen»
