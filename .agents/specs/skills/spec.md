# Skills

Governs: src/main/skills/** src/renderer/skills/**

The skills and slash commands the person's Claude Code has at hand, read from their folders and
settings without calling Claude.

## Outcomes

### Skills: list (skills-list, 20 nov 2026)

The Skills screen, in the rail, shows every skill and command that Claude Code loads for each Atril repo, where each one comes from, its state according to the settings, which ones are not loaded because another with the same name wins, and the detail of each. It writes nothing and does not call Claude.

### Skills: turning on and off (skills-toggle, 23 nov 2026)

From the Skills screen the person turns a skill or command off, on, or to «solo el nombre», and turns a whole plugin off or on, without opening a JSON. Atril writes only the key that changes, in the personal file that really decides, warns the first time, never overwrites a file it does not understand and never touches the `settings.json` that is committed to the repo.

### Skills: editor (skills-editor, 24 nov 2026)

From Skills the person changes the text of their own skill or command, or creates a new one, without leaving Atril and without losing what was there: what changed outside is not overwritten without asking, a broken header is flagged, and leaving with changes asks.

### Skills: plugins (skills-plugins, 24 nov 2026)

From Skills the person sees which plugins their marketplaces offer, installs one for themselves in all repos or only in one, updates or removes it, and adds a new marketplace, without opening the terminal or spending quota; whatever asks to accept a third-party command is done in Terminal, in plain sight.

### Skills: usage (skills-usage, 25 nov 2026)

In Skills the person sees which skills and commands they really use and which have gone 30 days unused, to decide which to turn off, without spending quota: Atril counts it by reading the sessions that Claude Code already stores on the Mac.

### Skills: dense list (skills-dense, 26 nov 2026)

With 150+ skills, the Skills screen reads as a list: one 36 px line per skill with its name, its description, when it was last used, and a mark only when there is something to know (off, a clash, a command, a broken header). Groups by origin fold, with their counts. Plugins and Atril start folded, so a plugin's 40 skills do not bury the person's own. Rows are sorted by most recent use, or by name. The four tiles filter. ↑/↓, Enter and / work from the keyboard. Everything the screen did before still works: search, Todas/Activas/Apagadas, repo selector, detail, state, plugin switch, editor, «Nueva skill», plugins, and usage.

## Scope boundaries

### Skills: dense list (skills-dense, 26 nov 2026)

**In:** `src/renderer/skills/Skills.tsx`; `src/renderer/skills/SkillRow.tsx`, renamed from `SkillCard.tsx` (the card becomes a row; the file keeps `fullName`, `stateLabel`, `originLabel` and `lastUsed`, which the detail uses); `src/renderer/styles.css` (the `.sk*` rules); `src/preload/i18n-es.ts`; `src/renderer/skills/skills.test.tsx`; `bocetos/novedades.html`, `bocetos/novedades/skills-densa.png`, `bocetos/novedades/skills-densa-lista.png`, `bocetos/fase1-nucleo.html`; `scripts/seed-skills.mjs` (the seeded example catalog for the real-app drive); the amended K5, K6, K7, K15, K24, K33 and K37, and the new K40–K44 in the skills spec.
**Out (named):** an on/off switch on each row; remembering folds or sort across visits; virtualised rendering (170 rows of plain buttons need none; if a list ever passes ~1000, window it); drag to reorder; bulk actions on several rows; changes in main or the IPC; the detail panel itself.

## Constraints

### Skills: list (skills-list, 20 nov 2026)

- No call to Claude; only file reads.
- `lstat`/`stat` with caps; an unreadable file does not take the list down.
- Texts through `t()` with an English entry; colors through tokens; errors with `Problem`.
- A skill's body is shown as text, never as HTML.

### Skills: turning on and off (skills-toggle, 23 nov 2026)

- The whole file is never rewritten from the merge: that file is read, one key is changed and it is saved; the other keys and their order stay the same; 2 spaces and a final newline.
- Atomic write: `<file>.tmp` and `rename`. `.claude/` folder created if it does not exist.
- No call to Claude. Tests use `ATRIL_CLAUDE_DIR` and temporary repos; never the real `~/.claude`.
- Texts through `t()` with an English entry; colors through tokens; errors with `Problem`.

### Skills: editor (skills-editor, 24 nov 2026)

- Atomic write (`.tmp` + `rename`) through `realpath` when it exists; folder created on create.
- Cap of 256 KB on save (K9); above it, nothing is saved and it says so.
- No call to Claude. Tests with `ATRIL_CLAUDE_DIR` and temporary repos.
- Texts through `t()` with an English entry; colors through tokens; errors with `Problem`.

### Skills: plugins (skills-plugins, 24 nov 2026)

- Arguments as an array (`execFile`), never a shell string; the plugin name and the source are validated in main.
- Cap of 120 s per operation; past it, the error «Claude Code no ha contestado a tiempo.».
- No call to the model. Tests with a fake `Runner` that records the arguments; never the real `claude`.
- Texts through `t()` with an English entry; colors through tokens; errors with `Problem`.

### Skills: usage (skills-usage, 25 nov 2026)

- No call to Claude; never `~/.claude.json`. Read-only on `claudeDir()/projects`.
- Line-by-line streaming read; a line is looked at with `JSON.parse` only if it contains `"name":"Skill"` or `<command-name>`.
- Texts through `t()` with an English entry; colors through tokens.
- Tests with a temporary `ATRIL_CLAUDE_DIR` and seeded sessions.

### Skills: dense list (skills-dense, 26 nov 2026)

- Renderer only: no new IPC, no change to what main answers, no new dependency.
- Minimal style: grey and the one accent, colours only as tokens; row height 36 px.
- Texts through `t()` with an English entry; the S16/S19 scans stay green.
- Keyboard and screen reader: group headers are buttons with `aria-expanded`; tiles are buttons with `aria-pressed`; rows stay buttons inside a list.
- Test names cited by other criteria are not renamed (lesson mr-page-wide); new test names in double quotes (lesson skills-editor · 8).

## Prior decisions

### Skills: list (skills-list, 20 nov 2026)

- (2026-11-20, skills-list) Atril reads skills, commands, plugins and their state only from the files Claude Code documents; it never calls Claude for that.
- (2026-11-20, skills-list) With the same name, personal wins over project and a skill over a command of the same origin; plugins do not clash.
- (2026-11-20, skills-list) `skillOverrides` does not apply to plugin skills; a plugin is turned off whole with `enabledPlugins`.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Ask `claude` (`/skills`, `claude plugin list`) | spends quota or starts a process per screen; the files are the documented source |
| YAML library (`yaml`) | a new dependency for ~10 flat keys; if full YAML is ever needed, `frontmatter.ts` is changed |
| Write `skillOverrides` already in this change | writing to Claude Code's settings needs its own confirmation and its own contract |

#### Decision log, answers as given (2026-11-20)
- Q: The whole Skills sketch in one change? → A: no: this one is the list, read-only (where each comes from, its state, clashes, search and detail). Turning off (`skills-toggle`), creating and editing (`skills-editor`), plugins (`skills-plugins`) and usage (`skills-usage`) come later (assumed).
- Q: Where are they read from? → A: what Claude Code documents (code.claude.com/docs/en/skills, plugins/loading): personal ones in `~/.claude/skills/<n>/SKILL.md` and commands in `~/.claude/commands/<n>.md`; from each Atril repo, `<repo>/.claude/skills` and `.claude/commands`; plugins from `~/.claude/plugins/installed_plugins.json` (`installPath`), with `skills/<n>/SKILL.md` and `commands/<n>.md` inside; Atril's own from its `librettoDir()` (assumed).
- Q: A skill's state? → A: `skillOverrides` from Claude Code's settings (`on`, `name-only`, `user-invocable-only`, `off`; no key = `on`), merged user < the repo's `.claude/settings.json` < the repo's `.claude/settings.local.json`; a plugin is turned off whole if `enabledPlugins["<plugin>@<marketplace>"]` is `false` in the same merge. `skillOverrides` does not affect plugin skills (documented) (assumed).
- Q: Who wins with the same name? → A: what is documented: personal wins over project; within the same origin, a skill wins over a command. Plugins do not clash (they go with `plugin:`) (assumed).
- Q: `~/.claude` in tests? → A: `claudeDir()` in `paths.ts` with `envPath('ATRIL_CLAUDE_DIR', …)`, like `ATRIL_HOME` (assumed).
- Q: (spec-reviewer) Where does it go in the rail? → A: after Avisos, so that W113 (QA between Libretto and Avisos) stays true; and in ⌘K like Libretto and QA (assumed).
- Q: (spec-reviewer) And `workspaces`, which governs `src/**`? → A: on landing, its `Governs:` gains `!src/main/skills/** !src/renderer/skills/**` by hand (as in mr); `spec-workspaces.md` says so (assumed).
- Q: (spec-reviewer) Do Atril's own follow `skillOverrides`? → A: no: Atril loads Libretto with `--plugin-dir`, so they are plugin ones: state `on`, `enabled: true`, shown as `/libretto:name` (assumed).
- Q: (spec-reviewer) A repo command with the same name as a personal one and as a repo skill? → A: `shadowedBy` is the first that wins: personal before skill. A personal command is also covered by a personal skill (assumed).
- Q: (spec-reviewer) Does `skillOverrides` apply to commands? → A: yes: Claude Code treats commands as old-format skills; same key by name (assumed).
- Q: (spec-reviewer) What do the summary tiles count? → A: Activas = state `on` or `name-only`, not shadowed and with its plugin on; Apagadas = state `off` or plugin off; Choques = how many are shadowed. `user-invocable-only` is in neither of the first two. The «Activas» and «Apagadas» filters use the same (assumed).
- Q: (spec-reviewer) Which repo shows on open? → A: the first in Atril's list, without remembering; with no repos, there is no selector or Proyecto group and it shows «Añade un repo en Ajustes → Repos para ver sus skills.»; if the repo list fails, the Proyecto group is empty with a notice (assumed).
- Q: (spec-reviewer) Plugin name in `/{plugin}:name`? → A: the part of `name@marketplace` before `@` (assumed).
- Q: (spec-reviewer) Commands in subfolders (`commands/a/b.md`)? → A: outside this change; they are ignored (assumed).
- Q: (spec-reviewer) Search in `whenToUse`? → A: yes: name, description and `whenToUse`, case-insensitive (assumed).
- Q: Symbolic links in `~/.claude/skills`? → A: they are followed (linking skills is common), with caps: 300 entries per folder (`skills/` and `commands/` each) and 256 KB per file; whatever passes the cap is not read and it says so (assumed).

### Skills: turning on and off (skills-toggle, 23 nov 2026)

- (2026-11-20, skills-toggle) Atril writes a skill's state in the personal file that wins (user for personal ones and plugins, the repo's `settings.local.json` for project ones) and never in the repo's `settings.json`.
- (2026-11-20, skills-toggle) If a file that wins over it already fixes the key, Atril does not offer the change and says which file fixes it.
- (2026-11-20, skills-toggle) A settings file that is not JSON is never written; it says so and offers to open it.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Always write to `~/.claude/settings.json` | a project skill turned off there would be turned off in every repo with that name |
| Write to the repo's `settings.json` | it belongs to the team and is committed; one click in Atril would change the repo for everyone |
| Write to the file that wins even if it is the repo's | same problem; better to say «Lo fija …» |
| Rewrite from the merge | would lose keys from the other files or copy them where they do not belong |

#### Decision log, answers as given (2026-11-23)
- Q: Where does Atril write a skill's state? → A: in the person's file that wins in K3's merge without touching anything that is committed to the repo: a personal skill or command in `~/.claude/settings.json` (`ATRIL_CLAUDE_DIR`), a project one in `<repo>/.claude/settings.local.json`, always under `skillOverrides[name]` (assumed: `settings.local.json` is personal and wins over the repo's `settings.json`; the repo's `settings.json` belongs to the whole team and is not touched).
- Q: And a plugin? → A: `enabledPlugins["<plugin>"]` in `~/.claude/settings.json`; turning on writes `true` (does not delete the key) (assumed).
- Q: And if a file that wins over it (the repo's `settings.json` or `settings.local.json`, for a personal one or a plugin) already fixes that key? → A: the change is not offered: the control comes out disabled with «Lo fija {archivo}» (path relative to the repo) (assumed: writing where it has no effect misleads).
- Q: Is there a prompt before writing? → A: the first time Atril is about to write to Claude Code's settings, a dialog «Atril va a cambiar tus ajustes de Claude Code» with the file, the key and the value, «Cambiar» and «Cancelar», and the checkbox «No volver a preguntar»; when ticked, it is remembered in Atril's state (`ui.json`, `skillsWriteOk: true`) (assumed).
- Q: What happens with an unreadable settings file or one that is not JSON? → A: it is never overwritten: `Problem` «No he podido cambiar tus ajustes de Claude Code.» with the file and «Abrir el archivo» (assumed: K10 treats it as empty for reading; writing over it would erase whatever the person has).
- Q: Where is the control? → A: in the detail panel (K7): «Estado» with four options (Activa, Solo el nombre, Solo si la llamas tú, Apagada) for personal and project; in each plugin's bar, an «Activo» switch; Atril's own stays read-only (assumed).
- Q: (spec-reviewer) The plugin with no repo? → A: the call carries the repo picked on the screen (`{ plugin, enabled, repoId? }`) and the lock is computed with it (assumed).
- Q: (spec-reviewer) A skill that comes from a plugin? → A: it is rejected: `skillOverrides` does not apply to plugin skills (skills-list Prior decision); the plugin is turned off whole (assumed).
- Q: (spec-reviewer) `skillOverrides` or `enabledPlugins` that already exist and are not an object? → A: rejected like invalid JSON; never overwritten (assumed).
- Q: (spec-reviewer) Two with the same name (personal and project, or skill and command)? → A: `skillOverrides` goes by name, so the change holds for every one of that name that this file reads; the list main answers shows it as is and the note says «También cambia {n} más con el mismo nombre.» when there are any (assumed).
- Q: (spec-reviewer) How does the screen know the file? → A: main gives each changeable item `writesTo` (absolute path of the target file) in addition to `lockedBy` (assumed).
- Q: (spec-reviewer) «Abrir el archivo»? → A: it becomes «Ver en Finder» with a new IPC `atril:skills:reveal` that receives the item, not a path, and shows its `writesTo` in Finder (or its folder if it does not exist); it shows whenever the item has `writesTo` (assumed: main never opens a path the renderer sends).
- Q: (spec-reviewer) Does `skillsWriteOk` survive in `ui.json`? → A: yes, with W215 in `spec-workspaces.md` and its test in `src/main/ui.test.ts` (assumed).
- Q: Do open sessions notice? → A: not promised: after writing, a note «Hecho. Las sesiones nuevas de Claude Code ya lo cargan así.» (assumed: it is not verified whether Claude Code rereads settings live).

- Q: (builder) How is the detail photographed? → A: dev-only view `ATRIL_SNAPSHOT_VIEW=skills-estado` that opens the first personal skill; named in Scope (assumed).

### Skills: editor (skills-editor, 24 nov 2026)

- (2026-11-24, skills-editor) Only personal and project skills and commands are edited; plugin and Atril ones are read-only.
- (2026-11-24, skills-editor) Atril does not overwrite a file that changed outside since it was opened unless the person chooses «Guardar el mío encima».
- (2026-11-24, skills-editor) Main only reads or writes the `path` of a personal or project item that it lists itself, inside `claudeDir()` or the repo's `.claude`.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Open the file in the system editor | it leaves Atril and there is no telling when it ends; Pau wants everything inside |
| CodeMirror/Monaco | a big dependency for markdown with a header |
| Compare by modification date | a `touch` or a checkout gives a false conflict; content is exact |
| Reject a broken header | it is the person's file; they may want to save it half-done |

#### Decision log, answers as given (2026-11-24)
- Q: What can be edited? → A: the whole file (header and body) of `personal` and `project` skills and commands; plugin and Atril ones stay read-only (assumed: plugin ones are overwritten by the plugin's next update; Atril's come with the app).
- Q: How? → A: «Editar» in the detail (K7) swaps the text for a monospaced text area with the file as is; «Guardar» and «Descartar»; ⌘S saves (assumed: a code editor with highlighting is a new dependency for a markdown file).
- Q: And if the file changed on disk since it was opened? → A: it is not saved: «Este archivo ha cambiado fuera de Atril.» with «Cargar el de disco» (loses what was typed) and «Guardar el mío encima» (assumed: it compares by content, not by date).
- Q: And a broken header? → A: it is saved anyway, because it is the person's file, but first it warns «La cabecera no se entiende: Claude Code puede ignorar esta skill.» with «Guardar igual» and «Seguir editando» (assumed).
- Q: Leaving with unsaved changes? → A: Escape, «Cerrar», opening another card or changing repo ask «Tienes cambios sin guardar. ¿Descartarlos?» (assumed: like M43).
- Q: Creating a new one? → A: «Nueva skill» in the Personal and Proyecto groups: a name (lowercase, digits and hyphens, 1–64, starts with a letter) and «Crear», which writes `<carpeta>/skills/<nombre>/SKILL.md` with `name` and an empty `description`, and opens it in «Editar»; if a skill with that name already exists in that origin, it is not created (assumed).
- Q: Deleting? → A: outside this change (assumed: a delete needs trash and undo; it goes separately).
- Q: (spec-reviewer) A symbolic link that points outside? → A: it is written through, as in skills-toggle; what is checked is that the listed path (unresolved) falls inside `claudeDir()` or the repo's `.claude` (assumed).
- Q: (spec-reviewer) What counts as a broken header worth a warning? → A: main decides it with K2's same parser: broken, or no header (`---` on the first line); the renderer does not parse (assumed: that way there are not two parsers that drift apart and `frontmatter.ts` does not move).
- Q: (spec-reviewer) Leaving the screen with changes? → A: the draft is kept in memory per file; on returning and opening that skill, the editor comes up with it and «Tienes cambios sin guardar de antes.» (assumed: there is no need to stop the rail or ⌘K).
- Q: (spec-reviewer) Where does the whole file come from? → A: an IPC `atril:skills:read` gives it; a file over 256 KB is not opened («Es demasiado grande para editarla aquí.») (assumed).
- Q: (spec-reviewer) And if I change `name:` in the header? → A: the item is identified by its `path` (which main checks against the list), not by name, so the panel stays on the same file with the new name (assumed).
- Q: (spec-reviewer) Lock the repo while saving? → A: yes, like K18 (assumed).
- Q: (builder) The editor's photo? → A: a photo view `skills-editor` in `App.tsx` and `Skills.tsx`, like `skills-estado` (assumed: App.tsx falls outside the written Scope, it is added).
- Q: How does main know which file? → A: the request carries an item's `path` and the `repoId`; main rereads the list and only accepts a `path` that is exactly that of a listed `personal` or `project` item (assumed).

### Skills: plugins (skills-plugins, 24 nov 2026)

- (2026-11-24, skills-plugins) Atril manages plugins only through `claude plugin … --json`, never by writing their files.
- (2026-11-24, skills-plugins) Atril never accepts a plugin's command on the person's behalf (`-y`, `--accept-command`); that is done in Terminal.
- (2026-11-24, skills-plugins) `user` and `local` scopes only; never `project`.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Write `installed_plugins.json` and clone by hand | the documentation says they are internal records; it would break in any version |
| Pass `-y` so it does not fail | it would accept a third-party command on the person's behalf |
| `project` scope | it writes the repo's `settings.json`, which is committed |

#### Decision log, answers as given (2026-11-24)
- Q: How does Atril install a plugin? → A: with Claude Code's documented CLI, `claude plugin … --json`, through the `Runner` in `src/main/run.ts`; never by hand-writing `installed_plugins.json` or cloning (assumed: the documentation says those files are «records», not an API; `--json` is an interface: an object on the last line of stdout with `outcome`).
- Q: Does it spend quota? → A: no: according to the documentation, install/uninstall/update/list and `marketplace add` are local, git and network operations; only `claude plugin eval` uses the model, and Atril does not call it (assumed: the documentation does not say it outright for every command).
- Q: In which scope? → A: «Para mí, en todos los repos» (`--scope user`, the default) or «Solo para mí en {repo}» (`--scope local`, with the repo as working directory); never `project`, which writes the `settings.json` that is committed (assumed: same rule as skills-toggle).
- Q: And if the plugin asks to accept a command (`--accept-command`, `-y`)? → A: Atril never passes `-y` or `--accept-command`: if the CLI fails for that, the error offers «Hacerlo en Terminal» with the exact command, so the person reads and accepts it there (assumed: accepting a third-party command is a decision not made with an Atril click).
- Q: What can be done? → A: see the catalog of the added marketplaces with search and install; on each installed plugin, «Actualizar» and «Quitar» (with confirmation); add a marketplace by its source (`owner/repo` or URL) (assumed).
- Q: What is left out? → A: removing marketplaces, updating marketplaces, auto-update, configuring plugins (`configure`), `eval`, `project` and `managed` scope (assumed).
- Q: And if `claude` is missing? → A: the usual `Problem` «No encuentro Claude Code en este Mac.» with the doctor's fix (assumed).
- Q: Several at once? → A: no: one plugin operation at a time; the buttons stay disabled while it lasts and so does the repo selector (K18) (assumed).

- Q: (spec-reviewer) With which scope does it update or remove an installed plugin? → A: the CLI says: K27's `installed` carries `scope` and `projectPath`; the bar uses the `user` install, or the `local` one whose `projectPath` is the picked repo; if there are only others (`project`, `managed`, `local` of another repo), there are no buttons and it shows «Instalado en otro ámbito: se gestiona fuera de Atril.» (assumed: `installed_plugins.json` is not read for this).
- Q: (spec-reviewer) How does the screen tell failures apart? → A: main does not reject: it answers `{ list }`/`{ catalog }` or `{ error, code }` with `code` `invalid`, `missing`, `timeout`, `busy` or `failed`; with `missing`, the `Problem` is «No encuentro Claude Code en este Mac.» with the doctor's fix for `claude` (`atril:doctor:install`) and without «Hacerlo en Terminal» (assumed).
- Q: (spec-reviewer) Terminal with `user` scope and no repo? → A: no `cd`; with a repo, with `cd`; it answers `{ ok: true }` or `{ error }`, like `inTerminal` (assumed).
- Q: (spec-reviewer) Two operations at once in main? → A: main prevents that too: a second K28/K29 while another runs answers `{ error, code: 'busy' }` without running anything (assumed: like `refine.ts`).
- Q: (builder) Files outside Scope? → A: `bocetos/qa-final.html` (the step «Plugins desde Atril contra la CLI real», requested by the brief) and `src/renderer/App.tsx` (one line: the photo view `skills-plugins`); they enter Scope (assumed).
- Q: (builder) Does K27 block with `busy`? → A: only while a K28/K29 runs; a catalog read does not block another, because the screen and the dialog ask for it at once (the photo uncovered it); a test covers it (assumed).

### Skills: usage (skills-usage, 25 nov 2026)

- (2026-11-25, skills-usage) Usage comes from Claude Code's sessions in `claudeDir()/projects`, never from `~/.claude.json` or a call to Claude; a line that is not understood is skipped.
- (2026-11-25, skills-usage) Only 30 days are looked at and only the files modified within them; what was counted is kept in memory per file (`mtime` + size) — ponytail: in memory, persist if the first open is slow.
- (2026-11-25, skills-usage) An invocation matches the card by the name the card shows without the slash (`name` or `{plugin before @}:name`).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Read `~/.claude.json` | touching it is forbidden; and we do not know that it stores dates |
| Claude Code hooks that record each use | writes to the person's settings and only counts from today |
| Persist the count in `ATRIL_HOME` | more code and a cache to invalidate; in memory is enough until measured |
| Reread everything every time | ~3.5 GB; even with the 30-day filter, the cache saves almost everything |

#### Decision log, answers as given (2026-11-25)
- Q: Where does usage come from? → A: from the sessions Claude Code stores in `claudeDir()/projects/*/*.jsonl` (and their `*/<session>/subagents/*.jsonl`): a line with a `tool_use` `"name":"Skill"` counts `input.skill`; a line from the person with `<command-name>/x</command-name>` counts `x` (assumed: Claude Code documents no other usage record; `~/.claude.json` is not touched; the format is not documented, so a line that is not understood is skipped and never breaks the screen).
- Q: How far back? → A: 30 days, and only files modified in those 30 days are opened (assumed: there are ~3.5 GB of sessions; reading everything every time is not viable).
- Q: Does every opening of Skills reread everything? → A: no: main keeps in memory what was counted per file together with its `mtime` and size and only rereads those that changed; one read at a time (assumed: persist it to disk if the first open turns out slow).
- Q: How is an invocation matched to a card? → A: by the name the card shows without the slash: `name` for personal and project, `{plugin before @}:name` for plugin and Atril (assumed: it is what is typed and what `Skill` receives).
- Q: What does it show? → A: on each card, «usada hace {n} días» / «usada hoy» / «sin usar en 30 días»; a tile «Sin usar en 30 días» next to Activas, Apagadas and Choques, which filters; in the detail, «Uso · últimos 14 días» with 14 bars, «{n} veces en 30 días» and «Según las sesiones de Claude Code en este Mac.» (assumed: like the sketch, without the donut).
- Q: «Apagar todas» the unused ones? → A: out (assumed: it is N writes at once and deserves its own change with undo).
- Q: (spec-reviewer) Which cards state usage and which count as «sin usar»? → A: all state it except those that are not loaded (`shadowedBy`), which say nothing; a name with no entry is «sin usar en 30 días»; the tile and the filter count those Claude can use: not `off`, not `shadowedBy` and `enabled` other than `false` (includes «Solo si la llamas tú», which is exactly the one that only counts if you type it) (assumed).
- Q: (spec-reviewer) Two cards with the same name in different repos? → A: they share the count: the sessions do not say which repo a skill with that name came from; per-repo usage is out (assumed).
- Q: (spec-reviewer) Is usage requested again when changing repo? → A: no: once per visit to the screen; usage does not depend on the repo (assumed).
- Q: (spec-reviewer) Scale and date of the bars? → A: proportional to the maximum of those 14 days; with everything at 0, all at the minimum (2 px); the label with short day and month from the locale, e.g. «25 nov: 3» (assumed).
- Q: (spec-reviewer) Empty «sin usar» filter? → A: «No tienes ninguna sin usar.» (assumed).
- Q: (photo) Do Atril's own count as candidates to turn off? → A: no: they come with the app and are not turned off one by one; their card does state usage (assumed).
- Q: And if reading usage fails or is slow? → A: the list never waits for usage; if it fails, the cards say nothing about usage and there is no tile (assumed: usage is an extra, not the screen).

### Skills: dense list (skills-dense, 26 nov 2026)

- (2026-11-26, skills-dense) A row shows its state but does not change it; the detail and the plugin group's switch do (assumed).
- (2026-11-26, skills-dense) While a search or filter narrows the list, groups with matches open and groups without hide; otherwise each group keeps its own fold, plugins and Atril starting folded (assumed).
- (2026-11-26, skills-dense) The tiles and Todas/Activas/Apagadas are one filter; «Choques» is a fourth filter (assumed).
- (2026-11-26, skills-dense) No virtualisation — ponytail: plain rows up to ~1000 items; window the list past that.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| ARIA `grid`/`treegrid` with roving tabindex | more keyboard contract than asked (cells, Home/End, row vs cell focus); a list of buttons is what it is, and it reads better |
| Keep `<details>`, controls outside the summary | a plugin's controls in two places; forcing `open` while narrowing fights the element's own toggle event |
| Virtualised list (react-window or by hand) | a new dependency or a scroll engine for 170 rows that render in a few ms; named in Prior decisions with its ceiling |
| Row as a `<table>` | columns are nice, but a table of buttons announces worse and fights the group headers |

#### Decision log, answers as given (2026-11-26)
- Q: Where does the Spanish go? → A: ~~the Spanish text is the `t()` key, English in `i18n-en.ts`~~ → wrong: that was read off a stale branch. Main had already made English the source (`16d8158`); the keys are English and the Spanish goes in `src/preload/i18n-es.ts`, as the brief said. Fixed when merging main.
- Q: Does a row switch the skill on and off itself? → A: no: the row shows the state; changing it stays in the detail (K15) and in the plugin group's switch (assumed: an inline switch puts a settings write one stray click away in a list built for scanning; if wrong, it is one switch per row calling the same `setState`).
- Q: Which marks does a row keep? → A: only what the group and the filter do not already say: «comando», a state other than «Activa», the clash («No se carga: …»), «Claude no la usa sola», «Cabecera ilegible». No origin and no «Activa». The plugin name is already in the row's `/plugin:name` (assumed).
- Q: A collapsed plugin group while searching? → A: while a search or a filter narrows the list, every group with matches opens and every group without matches hides; clearing gives each group back the state it had (assumed: a search that finds a row inside a closed group and hides it reads as «nothing found»).
- Q: The plugin controls (switch, Actualizar, Quitar) once each plugin is its own group? → A: in the group's header, beside the button that folds it; «Añadir plugin» and the plugin notes stay in a «Plugins» line above the plugin groups (assumed: a control inside `<summary>` is not reachable cleanly, so the header is a fold button plus its controls).
- Q: «Recientes» before the usage answers? → A: by name until it answers; also when it fails (assumed: K37 already says nothing about use then).
- Q: Is the fold state remembered across visits? → A: no: per visit, kept across repo picks (assumed: one more `ui.json` key for little gain).
- Q: How do the tiles and the Todas/Activas/Apagadas buttons relate? → A: they are one filter: the «Activas» tile and the «Activas» button are pressed together; «Choques» adds a filter of its own (assumed).
- Q: «20+ rows on a screen»? → A: rows are 36 px, and the tiles become one-line buttons so the header takes less room; checked in the real app at Pau's window size (1440×884) with a seeded catalog of 170 example skills, photos in `bocetos/novedades/skills-densa.png` and `skills-densa-lista.png` (assumed: «a screen» means the list once scrolled past the header).
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
- Q: (spec-reviewer) `i18n-es.ts` is governed by workspaces? → A: as in every skills change: new entries only, covered by the S16/S19 scans; no workspaces delta (assumed).
- Q: (work-reviewer) The photo shows 15 rows, not 20? → A: the first photo is the top of the screen; a second, `bocetos/novedades/skills-densa-lista.png`, is scrolled past the header and shows 21 whole rows, counted by the drive script. Both are cropped above the bottom quota bar, which shows the real account's numbers (assumed).
- Q: (work-reviewer) 171 or 203? → A: 171 seeded example items plus Atril's own 32 = 203 in the heading; the docs say both (assumed).
- Q: (work-reviewer) The «Resumen» label on the tiles? → A: kept: the tiles and the Todas/Activas/Apagadas buttons share names, and the group label is what tells them apart for a screen reader and for the tests; in scope (assumed).
- Q: Interview? → A: none: CLAUDE.md says to go on without asking and mark the recommended option `(assumed)`; every line above is that.

## Task breakdown

## Verification criteria

### Skills: list (skills-list, 20 nov 2026)

- **K1** When the window asks `atril:skills:list(repoId?)`, main shall answer `{ items, warnings }` with one item per skill (`skills/<n>/SKILL.md`) and per command (`commands/<n>.md`, top level only) found in: `claudeDir()` (origin `personal`); the `.claude` folder of the repo `repoId` from Atril's repo list (origin `project`; none when `repoId` is absent, unknown or the repo list fails, which adds one warning); each plugin in `claudeDir()/plugins/installed_plugins.json` by its `installPath` (origin `plugin`, `plugin` = its `name@marketplace`); and Atril's Libretto folder (origin `atril`, `plugin` = `libretto`). Each item shall carry `name` (frontmatter `name`, else the folder or file name), `kind` (`skill` | `command`), `origin`, `path`, `description`, `whenToUse`, `argumentHint`, `allowedTools`, `model`, `effort`, `disableModelInvocation`, `userInvocable`, and `body` (the text after the frontmatter).
  Proof: src/main/skills/skills.test.ts lists skills and commands from every origin with their header
- **K2** If a folder is missing, then main shall add nothing for it; if a `SKILL.md` or command file has no valid frontmatter, then main shall list it with `broken: true`, its name from the folder or file and the rest of the answer intact.
  Proof: src/main/skills/skills.test.ts a broken header never hides the rest
- **K9** If a file passes 256 KB, or a `skills/` or `commands/` folder holds more than 300 entries, then main shall not read that file or the entries past the 300th, and shall add one warning naming the folder.
  Proof: src/main/skills/skills.test.ts a huge file or folder is cut with a warning
- **K10** If `installed_plugins.json` or any of K3's settings files is unreadable or not JSON, then main shall treat it as empty and add one warning naming the file.
  Proof: src/main/skills/skills.test.ts an unreadable settings or plugins file is a warning
- **K3** Main shall set each `personal` and `project` item's `state` from `skillOverrides[name]` (`on`, `name-only`, `user-invocable-only`, `off`; absent or unknown = `on`), commands included, merged user `settings.json` < repo `.claude/settings.json` < repo `.claude/settings.local.json` (only the user file when there is no repo); each `plugin` item's `state` shall be `on` with `enabled` from `enabledPlugins["<plugin>"]` in the same merge (absent = `true`); each `atril` item shall be `on` and `enabled`.
  Proof: src/main/skills/skills.test.ts state comes from skillOverrides and plugins from enabledPlugins
- **K4** Main shall set `shadowedBy` on a `personal` or `project` item to the first that applies: `'personal'` when it is a project item and a personal item has its `name`; `'skill'` when it is a command and a skill of its origin has its `name`. Plugin and Atril items are never shadowed; a shadowed item keeps its `state`.
  Proof: src/main/skills/skills.test.ts a personal skill wins over the repo's and a skill over a command
- **K5** When the person opens «Skills» from the rail (after Avisos) or from ⌘K, the screen shall show the heading «Skills» with the number of items; the lead «Las skills y los comandos / que tu Claude Code tiene a mano en cada trabajo. Los lee de sus carpetas, sin gastar cuota.»; a repo selector of Atril's repos with the first picked (with none: no selector, no Proyecto group, and «Añade un repo en Ajustes → Repos para ver sus skills.»); the tiles «Activas» (items with `state` `on` or `name-only`, not shadowed, and `enabled` when they have it, with «~{n} tokens de contexto», n = characters of name + description + whenToUse of those items ÷ 3.2, rounded), «Apagadas» (`state` `off`, or `enabled` false) and «Choques» (shadowed items); a line «Plugins» with «Añadir plugin»; and the groups «Personal», «Proyecto ({repo})», one group per plugin and «Atril» («solo lectura»), each with a header button naming it and the number of rows it shows, a plugin's header also showing «{plugin} · {n} skills · activo | apagado entero» and its controls (K15, K33). Each row shall show `/name` (plugin and Atril items `/{plugin before @}:name`), the description on one line, and only these marks when they apply: «comando» for commands, the state when it is not `on` («Solo el nombre», «Solo si la llamas tú» or «Apagada»), «No se carga: gana la personal» or «No se carga: gana la skill» when shadowed, «Claude no la usa sola» when `disableModelInvocation`, «Cabecera ilegible» when `broken`; a row shall not show its origin nor «Activa»; a row shall be dimmed when its `state` is `off`, its `enabled` is false or it is shadowed. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx the screen groups every skill by where it comes from
- **K6** When the person types in «Buscar por nombre o descripción…» (matching name, description or whenToUse, case-insensitive) or picks «Todas», «Activas» or «Apagadas» (K5's definitions), the screen shall show only the matching rows; with a search and none it shall say «Nada se llama «{q}».» with «Borrar la búsqueda»; with no search and none, «No tienes ninguna activa.» or «No tienes ninguna apagada.»; a repo with no project items shall say «{repo} aún no tiene skills propias.» while nothing narrows the list (K40).
  Proof: src/renderer/skills/skills.test.tsx search and filter narrow the cards
- **K11** If the reply for a repo arrives after the person has picked another repo, then the screen shall drop it and show only the picked repo's items.
  Proof: src/renderer/skills/skills.test.tsx a late reply for the previous repo is dropped
- **K7** When the person activates a row, a detail panel shall open with `/name`, origin, state, the description, the header fields that are set, the instructions as plain text (markup shown literally) and the path; Escape or «Cerrar» shall close it and return focus to the row.
  Proof: src/renderer/skills/skills.test.tsx a card opens its detail and escape closes it
- **K8** If `atril:skills:list` rejects, then the screen shall show a `Problem` «No he podido leer tus skills.» with «Volver a intentar» and the error in its detail; each of `warnings` shall show as a note under the heading.
  Proof: src/renderer/skills/skills.test.tsx a failed read says why and offers to retry

### Skills: turning on and off (skills-toggle, 23 nov 2026)

- **K12** Main shall give each `personal`, `project` and `plugin` item `writesTo`, the absolute path of the file K13 writes its key to, and a `lockedBy` naming the settings file (path relative to the repo) that fixes its key when a file later in K3's merge than `writesTo` sets that key (`skillOverrides[name]`, or `enabledPlugins[plugin]` for a plugin item); otherwise no `lockedBy`. `atril` items shall have neither.
  Proof: src/main/skills/skills.test.ts a key fixed by a later file is locked
- **K13** When `atril:skills:set` is called with an item (origin, name, repoId) and a state, main shall set `skillOverrides[name]` to that state in `~/.claude/settings.json` for a `personal` item or in `<repo>/.claude/settings.local.json` for a `project` item (creating the file and `.claude/` when missing); when called with a plugin, a boolean and the repoId the screen has picked, it shall set `enabledPlugins[plugin]` in `~/.claude/settings.json`; every other key of the file, and its order, shall stay as it was, written with 2-space indent and a final newline, through `<file>.tmp` and `rename`; when the file is a symlink it shall write through to its target and leave the link in place; it shall answer the new list (K1–K4). One test holds every clause.
  Proof: src/main/skills/skills.test.ts set writes one key in the file that decides
- **K14** If the file to write is not valid JSON or not an object, or its `skillOverrides`/`enabledPlugins` exists and is not an object, or the item is `atril` or `plugin` origin (a plugin is switched whole), or its `lockedBy` (computed with the call's repoId) is set, or the state is not one of K3's four, then main shall reject (and `atril:skills:reveal` shall reject an `atril` item) naming the file or the reason and leave every file byte-identical.
  Proof: src/main/skills/skills.test.ts set refuses and leaves the files alone
- **K15** When the person opens a `personal` or `project` item's detail (K7), the panel shall show «Estado» with «Activa», «Solo el nombre», «Solo si la llamas tú» and «Apagada» (the current one picked); picking another shall call `atril:skills:set` and, when it answers, show the new state on the row and «Hecho. Las sesiones nuevas de Claude Code ya lo cargan así.», plus «También cambia {n} más con el mismo nombre.» when other personal or project items share the name and read the same file; each plugin group header shall have a switch «Activo» doing the same with `enabledPlugins`, shown whether the group is folded or not; with `lockedBy` the control shall be disabled with «Lo fija {file}»; an `atril` item shall have no control. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx state and plugin switch write through set
- **K18** While a write (K13) is pending, the repo selector shall be disabled, so the answer for one repo never lands under another (K11).
  Proof: src/renderer/skills/skills.test.tsx the repo cannot change while a write is pending
- **K16** While `skillsWriteOk` is not set in Atril's state, when the person changes a state or a plugin switch, the screen shall first show the dialog «Atril va a cambiar tus ajustes de Claude Code» with `writesTo`, the key (`skillOverrides.{name}` or `enabledPlugins.{plugin}`) and the value, «Cambiar», «Cancelar» and «No volver a preguntar»; «Cancelar» or Escape shall write nothing and leave the control as it was; «Cambiar» shall write; with the box ticked it shall also store `skillsWriteOk: true`, after which no dialog shall show. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx the first write asks and can be told not to again
- **K17** If `atril:skills:set` rejects, then the screen shall show the `Problem` «No he podido cambiar tus ajustes de Claude Code.» with «Ver en Finder» (calls `atril:skills:reveal` with the item, which shows `writesTo` in Finder, or its folder when the file does not exist) and the error in its detail, and the control shall show the state it had. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx a failed write says why and keeps the old state

### Skills: editor (skills-editor, 24 nov 2026)

- **K19** When `atril:skills:save` is called with `{ path, repoId?, base, text, force?, allowBroken? }` where `path` is a listed `personal` or `project` item's `path`, main shall answer in this order — if the file no longer equals `base` and `force` is not set, answer `{ conflict: true, disk }` (the file's current text) and write nothing; else if `text`'s header is broken by K2 or missing (first line not `---`) and `allowBroken` is not set, answer `{ brokenHeader: true }` and write nothing; else write `text` to that file (through `realpath`, via `.tmp` and `rename`) and answer `{ list }` with the new list. One test holds every clause.
  Proof: src/main/skills/skills.test.ts save writes the item's file unless it changed underneath
- **K20** If `atril:skills:save` or `atril:skills:read` gets a `path` that is not exactly a listed `personal` or `project` item's `path`, or one not under `claudeDir()` or the repo's `.claude` as listed, or (save) a `text` over 256 KB, or (read) a file over 256 KB, then main shall reject saying why and leave every file byte-identical.
  Proof: src/main/skills/skills.test.ts save refuses outside its folders and leaves files alone
- **K26** When `atril:skills:read` is called with a listed `personal` or `project` item's `path` and `repoId?`, main shall answer the whole file's text, header included.
  Proof: src/main/skills/skills.test.ts read gives the whole file of a listed item
- **K21** When `atril:skills:create` is called with `origin` (`personal` or `project`), `repoId?` and a `name` matching `^[a-z][a-z0-9-]{0,63}$`, main shall create `claudeDir()/skills/<name>/SKILL.md` (personal) or `<repo>/.claude/skills/<name>/SKILL.md` (project) holding `---\nname: <name>\ndescription: \n---\n\n` (`wx`, folders created) and answer the new list; if the name does not match, a skill with that name already exists in that origin or its folder exists, or a `project` create has no known repo, it shall reject and create nothing. One test holds every clause.
  Proof: src/main/skills/skills.test.ts create makes a new skill and refuses a bad or taken name
- **K22** When the person opens a `personal` or `project` item's detail, the panel shall offer «Editar», which reads the file (K26) and shows it in a monospaced text area labelled «Texto de {name}» with «Guardar» (also ⌘S) and «Descartar»; «Guardar» shall call `atril:skills:save` and, on `{ list }`, show the item at the same `path` (with its new name if the header changed it) read-only and «Guardado.»; while saving, the repo selector shall be disabled; a `plugin` or `atril` item shall offer no «Editar»; a read rejection shall show «Es demasiado grande para editarla aquí.» or the error and keep the panel read-only. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx edit and save a skill from its detail
- **K23** When the save answers `{ conflict: true, disk }`, the panel shall say «Este archivo ha cambiado fuera de Atril.» with «Cargar el de disco» (text and `base` become `disk`) and «Guardar el mío encima» (saves again with `force`); when it answers `{ brokenHeader: true }`, it shall ask «La cabecera no se entiende: Claude Code puede ignorar esta skill.» with «Guardar igual» (saves again with `allowBroken`, keeping any `force`) and «Seguir editando»; any rejection shall show the `Problem` «No he podido guardar la skill.» with the error in its detail and keep the text. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx a save that conflicts or has a broken header asks first
- **K24** While the editor holds text different from `base`, when the person presses Escape, «Cerrar», «Descartar», activates another row or changes repo, the screen shall ask «Tienes cambios sin guardar. ¿Descartarlos?» with «Descartar cambios» and «Seguir editando», and leave the editor only on «Descartar cambios»; with no changes it shall leave without asking; when the person leaves the Skills screen instead, the text shall be kept in memory per `path` and, on opening that item's «Editar» again in the same run, come back with «Tienes cambios sin guardar de antes.». One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx leaving with unsaved changes asks first
- **K25** When the person activates «Nueva skill» in Personal or Proyecto, a dialog shall ask «Nombre» (with the rule «Minúsculas, números y guiones.» shown) and «Crear»; «Crear» shall be disabled while the name does not match K21; on success the new skill's detail shall open in «Editar»; a rejection shall show its reason in the dialog. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx new skill creates and opens it in the editor

### Skills: plugins (skills-plugins, 24 nov 2026)

- **K27** When `atril:skills:catalog(repoId?)` is called, main shall run `claude plugin list --available --json` (working directory: the repo's path when `repoId` is known) and answer `{ catalog: { installed, available } }` from the JSON on the last line of stdout, each installed entry with `pluginId`, `scope` and `projectPath` when present, each available entry with `pluginId` (`name@marketplace`), `name`, `marketplace`, `description` and `version` when present.
  Proof: src/main/skills/plugins.test.ts the catalog comes from the cli json
- **K28** When `atril:skills:plugin({ action, plugin, scope, repoId? })` is called, while no other K28/K29 operation runs, with `action` one of `install`, `uninstall`, `update`, `plugin` matching `^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9._-]*$` (no part starts with `-`) and `scope` `user` or `local`, main shall run `claude plugin <action> <plugin> --scope <scope> --json` as an argument array (working directory: the repo's path, required for `local`), never with `-y`, `--yes` or `--accept-command`, and, when the last stdout line's `outcome` is `ok`, answer `{ list }` with the new list (K1). One test holds every clause.
  Proof: src/main/skills/plugins.test.ts plugin actions run the cli with fixed arguments
- **K29** When `atril:skills:marketplace({ source })` is called with a `source` of 1–500 characters, no whitespace and not starting with `-`, main shall run `claude plugin marketplace add <source> --scope user --json` and, on `outcome` `ok`, answer the new catalog as K27 does.
  Proof: src/main/skills/plugins.test.ts adding a marketplace runs the cli
- **K30** If a K27, K28 or K29 request fails validation, `local` comes without a known repo, another operation is running, the CLI is not found (127), passes 120 s, exits non-zero, its last stdout line is not JSON, or (K28/K29) its `outcome` is not `ok`, or (K27) it is `failed`, then main shall not reject but answer `{ error, code }` with `code` `invalid`, `invalid`, `busy`, `missing`, `timeout`, `failed`, `failed`, `failed` respectively and `error` the CLI's `message` when there is one, else «No encuentro Claude Code en este Mac.», «Claude Code no ha contestado a tiempo.» or the last 300 characters of stderr; `invalid` and `busy` shall run nothing. One test holds every clause.
  Proof: src/main/skills/plugins.test.ts a failed plugin action says why and bad input runs nothing
- **K31** When `atril:skills:plugin-terminal` is called with the same shape as K28 and it passes K28's validation, main shall open Terminal through `inTerminal` (`src/main/doctor.ts`) with `claude plugin <action> <plugin> --scope <scope>` (no `--json`), preceded by `cd '<repo>' && ` when the repo is known, and answer `{ ok: true }` or `{ error }`; failing validation it shall answer `{ error }` and open nothing. One test holds every clause.
  Proof: src/main/skills/plugins.test.ts doing it in terminal runs the same command visibly
- **K32** When the person activates «Añadir plugin» in the Plugins group, a dialog shall load the catalog (K27) and list the not-installed plugins grouped by marketplace with name, description and «Instalar»; a search box «Buscar plugin» filters by name or description; «Instalar» offers «Para mí, en todos los repos» and «Solo para mí en {repo}» (only with a repo); while it runs every plugin button and the repo selector shall be disabled; on success the dialog closes, the list updates and «Instalado. Las sesiones nuevas de Claude Code ya lo cargan.» shows; the dialog also holds «Añadir marketplace» with a field «owner/repo o URL» and «Añadir», which reloads the catalog. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx add plugin installs from the catalog
- **K33** When the Skills screen shows, it shall load the catalog (K27) and give each plugin group header «Actualizar» and «Quitar» acting on its `user` install, or else on its `local` install whose `projectPath` is the picked repo's path; with neither, the header shall show «Instalado en otro ámbito: se gestiona fuera de Atril.» and no buttons. «Actualizar» shall run K28's `update` with that scope; «Quitar» shall first ask «¿Quitar {plugin}? Sus skills dejan de cargarse.» with «Quitar» and «Cancelar», and only on «Quitar» run `uninstall`; success shows «Hecho.»; `atril` items have neither. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx update and remove a plugin from its bar
- **K34** If a plugin action or marketplace add answers `{ error, code }`, then the screen shall show the `Problem` «No he podido completar la operación del plugin.» with `error` in its detail and «Hacerlo en Terminal» (K31, plugin actions only), except with `code` `missing`, where it shall show «No encuentro Claude Code en este Mac.» with the doctor's fix for `claude` and no Terminal button; if the catalog answers an error, the dialog shall show «No he podido leer los marketplaces.» with «Volver a intentar» (or the `missing` problem). One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx a failed plugin action offers terminal

### Skills: usage (skills-usage, 25 nov 2026)

- **K35** When `atril:skills:usage` is called, main shall read every `*.jsonl` under `claudeDir()/projects/<dir>/` and `claudeDir()/projects/<dir>/<session>/subagents/` whose `mtime` is within the last 30 days, and answer `{ usage }` mapping each name to `{ last, days }` — `last` the newest ISO `timestamp` seen for it, `days` a 30-number array (index 0 today, local time) of uses per day — counting once per line an assistant line holding a `tool_use` named `Skill` (its `input.skill`) and once per line a user line whose content holds `<command-name>/x</command-name>` (as `x`); lines older than 30 days, unparsable lines and lines without `timestamp` shall count nothing; a file whose `mtime` is older than 30 days shall count nothing even when its lines carry recent timestamps (it is not opened). Day `k` is the number of local calendar days between today and the line's `timestamp`. One test holds every clause.
  Proof: src/main/skills/usage.test.ts "counts Skill tool uses and typed commands per day within 30 days"
- **K36** If a file's `mtime` and size are unchanged since the last `atril:skills:usage`, then main shall not read it again and shall reuse what it counted; a file that changed shall be read again whole and a file that disappeared shall stop counting. One test holds every clause.
  Proof: src/main/skills/usage.test.ts "reuses an unchanged file and rereads a changed one"
- **K39** While one `atril:skills:usage` read runs, a second call shall get the same answer without starting another read; if `claudeDir()/projects` cannot be listed for a reason other than not existing, main shall answer `{ error }` and not reject, and with no `projects` folder it shall answer `{ usage: {} }`. One test holds every clause.
  Proof: src/main/skills/usage.test.ts "shares a running read and answers an error instead of rejecting"
- **K37** When the Skills screen shows and the usage answers, each row not shadowed shall show «usada hoy», «usada hace 1 día», «usada hace {n} días» or (no entry for its name) «sin usar en 30 días», matching the row's name without the slash (K5), and a shadowed row shall say nothing about usage; a fourth tile «Sin usar en 30 días» shall count the items that are not `atril`, not `off`, not shadowed, not `enabled: false` and have no use, with «candidatas a apagar» (or «todas en uso» at 0), and activating it shall filter to those items as a pressed toggle that a second press, «Todas» or another filter undoes, showing «No tienes ninguna sin usar.» when none; the usage shall be asked once per visit to the screen, not again on a repo pick; while it has not answered, or it answered `{ error }`, rows shall say nothing about usage and the tile shall not show. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx "shows when each skill was last used and filters the unused ones"
- **K38** When the detail (K7) opens and the usage has answered, it shall show «Uso · últimos 14 días» with 14 bars (oldest left, height proportional to that day's uses over the 14-day maximum, 2 px when 0, each with an accessible label «{día mes corto}: {n}», e.g. «25 nov: 3»), «{n} veces en 30 días» («1 vez en 30 días» for one, «Sin usar en 30 días.» for none) and «Según las sesiones de Claude Code en este Mac.»; without usage it shall show none of these. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx "the detail shows the last 14 days of use"

### Skills: dense list (skills-dense, 26 nov 2026)

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
