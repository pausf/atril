# skills-list

Tracker: none
Targets: skills
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> «termina la app tal y como está en la fase 1 núcleo» (Pau, 12 nov). En `bocetos/fase1-nucleo.html`, la pantalla «Skills»: «Las skills y los comandos / que tu Claude Code tiene a mano en cada trabajo. Los lee de sus carpetas, sin gastar cuota.»
> «sigue con todo y no preguntes» (Pau, 19 nov)

## Decision log

### Session 2026-11-20
- Q: ¿Todo el boceto de Skills en un cambio? → A: no: este es el listado, solo lectura (de dónde viene cada una, su estado, choques, búsqueda y detalle). Apagar (`skills-toggle`), crear y editar (`skills-editor`), plugins (`skills-plugins`) y uso (`skills-usage`) van después (assumed).
- Q: ¿De dónde se leen? → A: lo que documenta Claude Code (code.claude.com/docs/en/skills, plugins/loading): personales en `~/.claude/skills/<n>/SKILL.md` y comandos en `~/.claude/commands/<n>.md`; de cada repo de Atril, `<repo>/.claude/skills` y `.claude/commands`; plugins desde `~/.claude/plugins/installed_plugins.json` (`installPath`), con `skills/<n>/SKILL.md` y `commands/<n>.md` dentro; los de Atril desde su `librettoDir()` (assumed).
- Q: ¿El estado de una skill? → A: `skillOverrides` de los ajustes de Claude Code (`on`, `name-only`, `user-invocable-only`, `off`; sin clave = `on`), mezclado usuario < `.claude/settings.json` del repo < `.claude/settings.local.json` del repo; un plugin está apagado entero si `enabledPlugins["<plugin>@<marketplace>"]` es `false` en la misma mezcla. `skillOverrides` no afecta a skills de plugin (documentado) (assumed).
- Q: ¿Quién gana con el mismo nombre? → A: lo documentado: personal gana a proyecto; dentro del mismo origen, una skill gana a un comando. Los plugins no chocan (van con `plugin:`) (assumed).
- Q: ¿`~/.claude` en tests? → A: `claudeDir()` en `paths.ts` con `envPath('ATRIL_CLAUDE_DIR', …)`, como `ATRIL_HOME` (assumed).
- Q: (spec-reviewer) ¿Dónde va en el raíl? → A: después de Avisos, para que W113 (QA entre Libretto y Avisos) siga cierto; y en ⌘K como Libretto y QA (assumed).
- Q: (spec-reviewer) ¿Y `workspaces`, que gobierna `src/**`? → A: al aterrizar, su `Governs:` gana `!src/main/skills/** !src/renderer/skills/**` a mano (como en mr); `spec-workspaces.md` lo dice (assumed).
- Q: (spec-reviewer) ¿Las de Atril siguen `skillOverrides`? → A: no: Atril carga Libretto con `--plugin-dir`, así que son de plugin: estado `on`, `enabled: true`, se ven como `/libretto:name` (assumed).
- Q: (spec-reviewer) ¿Un comando del repo con el mismo nombre que una personal y que una skill del repo? → A: `shadowedBy` es el primero que gana: personal antes que skill. Un comando personal también lo tapa una skill personal (assumed).
- Q: (spec-reviewer) ¿`skillOverrides` vale para comandos? → A: sí: Claude Code trata los comandos como skills de formato viejo; misma clave por nombre (assumed).
- Q: (spec-reviewer) ¿Qué cuentan las tarjetas de resumen? → A: Activas = estado `on` o `name-only`, sin tapar y con su plugin encendido; Apagadas = estado `off` o plugin apagado; Choques = cuántas están tapadas. `user-invocable-only` no está en ninguna de las dos primeras. Los filtros «Activas» y «Apagadas» usan lo mismo (assumed).
- Q: (spec-reviewer) ¿Qué repo sale al abrir? → A: el primero de la lista de Atril, sin recordar; sin repos, no hay selector ni grupo Proyecto y sale «Añade un repo en Ajustes → Repos para ver sus skills.»; si la lista de repos falla, el grupo Proyecto va vacío con un aviso (assumed).
- Q: (spec-reviewer) ¿Nombre del plugin en `/{plugin}:name`? → A: la parte de `name@marketplace` antes de `@` (assumed).
- Q: (spec-reviewer) ¿Comandos en subcarpetas (`commands/a/b.md`)? → A: fuera de este cambio; se ignoran (assumed).
- Q: (spec-reviewer) ¿Buscar en `whenToUse`? → A: sí: nombre, descripción y `whenToUse`, sin distinguir mayúsculas (assumed).
- Q: ¿Enlaces simbólicos en `~/.claude/skills`? → A: se siguen (es común enlazar skills), con topes: 300 entradas por carpeta (`skills/` y `commands/` cada una) y 256 KB por archivo; lo que pasa del tope no se lee y se dice (assumed).

## Outcomes

La pantalla Skills, en el raíl, enseña todas las skills y comandos que Claude Code carga para cada repo de Atril, de dónde viene cada una, su estado según los ajustes, cuáles no se cargan porque otra con el mismo nombre gana, y el detalle de cada una. No escribe nada ni llama a Claude.

## Scope

**In:** `src/main/skills/` nuevo (leer carpetas, cabeceras y ajustes), `src/main/paths.ts` (`claudeDir()`), `src/main/agent.ts` (exportar `librettoDir`), el ⌘K (`src/renderer/components/` donde viva la paleta), el IPC `atril:skills:list` en `src/main/index.ts` y `src/preload/{api,index}.ts`, `src/renderer/mockApi.ts`, `src/renderer/skills/` nuevo (pantalla, tarjeta, detalle), `src/renderer/components/Rail.tsx` y `src/renderer/App.tsx` (la pantalla), `src/preload/i18n-en.ts`, estilos con tokens, `bocetos/novedades.html`, `bocetos/fase1-nucleo.html`, la foto; la spec nueva `skills` y el `Governs:` de `workspaces` (`spec-workspaces.md`).
**Out (nombrado):** cambiar el estado (switch, menú, «Apagar todas»); crear, editar, duplicar; instalar plugins y marketplaces; uso, gráficas y «Sin usar en 30 días»; la vista Lista y el donut; skills de empresa (managed), anidadas en subcarpetas del proyecto y de `--add-dir`; comandos en subcarpetas de `commands/`; recordar el repo elegido.

## Constraints

- Ninguna llamada a Claude; solo lectura de archivos.
- `lstat`/`stat` con topes; un archivo ilegible no tumba la lista.
- Textos por `t()` con entrada inglesa; colores por tokens; errores con `Problem`.
- El cuerpo de una skill se enseña como texto, nunca como HTML.

## Prior decisions

- (2026-11-20, skills-list) Atril lee skills, comandos, plugins y su estado solo de los archivos que documenta Claude Code; nunca llama a Claude para eso.
- (2026-11-20, skills-list) Con el mismo nombre, personal gana a proyecto y una skill a un comando del mismo origen; los plugins no chocan.
- (2026-11-20, skills-list) `skillOverrides` no se aplica a skills de plugin; un plugin se apaga entero con `enabledPlugins`.

## Task breakdown

- Main: leer las cuatro fuentes, cabeceras, estado y choques.
- Pantalla: raíl, grupos, tarjetas, resumen, búsqueda y filtro.
- Detalle de una skill.
- Textos, foto, bocetos.

## Verification criteria

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
- **K5** When the person opens «Skills» from the rail (after Avisos) or from ⌘K, the screen shall show the heading «Skills» with the number of items; the lead «Las skills y los comandos / que tu Claude Code tiene a mano en cada trabajo. Los lee de sus carpetas, sin gastar cuota.»; a repo selector of Atril's repos with the first picked (with none: no selector, no Proyecto group, and «Añade un repo en Ajustes → Repos para ver sus skills.»); the tiles «Activas» (items with `state` `on` or `name-only`, not shadowed, and `enabled` when they have it, with «~{n} tokens de contexto», n = characters of name + description + whenToUse of those items ÷ 3.2, rounded), «Apagadas» (`state` `off`, or `enabled` false) and «Choques» (shadowed items); and the groups «Personal», «Proyecto ({repo})», «Plugins» (one bar per plugin with «{plugin} · {n} skills · activo | apagado entero») and «Atril» (folded, «solo lectura»). Each card shall show `/name` (plugin and Atril items `/{plugin before @}:name`), its origin, «comando» for commands, its state as «Activa», «Solo el nombre», «Solo si la llamas tú» or «Apagada», the description on one line, and «No se carga: gana la personal» or «No se carga: gana la skill» when shadowed, «Claude no la usa sola» when `disableModelInvocation`, «Cabecera ilegible» when `broken`. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx the screen groups every skill by where it comes from
- **K6** When the person types in «Buscar por nombre o descripción…» (matching name, description or whenToUse, case-insensitive) or picks «Todas», «Activas» or «Apagadas» (K5's definitions), the screen shall show only the matching cards; with a search and none it shall say «Nada se llama «{q}».» with «Borrar la búsqueda»; with no search and none, «No tienes ninguna activa.» or «No tienes ninguna apagada.»; a repo with no project items shall say «{repo} aún no tiene skills propias.».
  Proof: src/renderer/skills/skills.test.tsx search and filter narrow the cards
- **K7** When the person activates a card, a detail panel shall open with `/name`, origin, state, the description, the header fields that are set, the instructions as plain text (markup shown literally) and the path; Escape or «Cerrar» shall close it and return focus to the card.
  Proof: src/renderer/skills/skills.test.tsx a card opens its detail and escape closes it
- **K8** If `atril:skills:list` rejects, then the screen shall show a `Problem` «No he podido leer tus skills.» with «Volver a intentar» and the error in its detail; each of `warnings` shall show as a note under the heading.
  Proof: src/renderer/skills/skills.test.tsx a failed read says why and offers to retry

## Approach

### Summary
Un módulo de main que lee carpetas y ajustes y devuelve una lista plana con origen, estado y choques ya resueltos; una pantalla que solo la pinta y filtra.

### Technical context
Electron main (Node 24, `fs/promises`), React 19, vitest con jsdom; los tests de main usan `ATRIL_HOME` y `ATRIL_CLAUDE_DIR` temporales con carpetas sembradas. Frontmatter YAML: solo las claves de K1; un parser mínimo de `key: value`, listas `- x` y `[a, b]`, comillas y booleanos de Claude Code (`true/false/yes/no/on/off/1/0`), sin dependencia nueva. Radio: ~6 archivos nuevos, 7 tocados.

### The approach
- `src/main/skills/read.ts`: `readSkills({ claudeDir, repoDir?, librettoDir })` → `{ items, warnings }`. Por origen: `readdir` de `skills/` (entra en enlaces con `stat`), `SKILL.md` con tope; `commands/*.md` igual. Plugins: `installed_plugins.json` (tolerante a forma: busca objetos con `installPath`; nombre = clave `name@market`), lee `skills/` y `commands/` bajo `installPath`.
- `src/main/skills/frontmatter.ts`: separa `---\n…\n---` del cuerpo; sin cierre o con una línea que no se entiende → `broken`.
- `src/main/skills/state.ts`: mezcla los tres `settings*.json` (JSON ilegible = vacío, aviso en `warnings`) y aplica K3; K4 en la misma pasada.
- IPC `atril:skills:list` en `index.ts`, resolviendo `repoId` con `listRepos` (si devuelve `{ problem }`, sin proyecto y un aviso) y `librettoDir()`, exportado desde `agent.ts`.
- `installed_plugins.json`: el test siembra dos formas, `{ "plugins": { "a@m": [{ "installPath": … }] } }` y `{ "a@m": { "installPath": … } }`; la lectura busca, bajo cada clave `x@y`, el primer objeto con `installPath`.
- Renderer: `SkillsScreen.tsx` (resumen, búsqueda, filtro, grupos), `SkillCard.tsx`, `SkillDetail.tsx` (panel lateral, no modal, Escape cierra); el raíl gana «Skills» después de Avisos y ⌘K gana «Skills» como Libretto y QA.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| Preguntar a `claude` (`/skills`, `claude plugin list`) | gasta cuota o arranca un proceso por pantalla; los archivos son la fuente documentada |
| Librería YAML (`yaml`) | dependencia nueva para ~10 claves planas; si un día hace falta YAML entero, se cambia `frontmatter.ts` |
| Escribir `skillOverrides` ya en este cambio | escribir en los ajustes de Claude Code pide su propia confirmación y su propio contrato |

### Risks
| Risk | Mitigation |
|---|---|
| `installed_plugins.json` cambia de forma | lectura tolerante + K2 (ilegible = aviso, el resto sigue); test con dos formas |
| Un enlace a una carpeta enorme | topes de K2 y su test |
| HTML en el cuerpo de una skill | K7 lo pinta como texto; el test siembra `<b>` |

### Validation and rollback
`src/main/skills/skills.test.ts` y `src/renderer/skills/skills.test.tsx`. Forzar rojo K3 cambiando el orden de mezcla. Foto real con `ATRIL_CLAUDE_DIR` sembrado (nunca el `~/.claude` de Pau en la foto). Rollback: un revert.

### Complexity deliberately kept
El parser de frontmatter propio: `ponytail:` con su techo (solo claves planas de K1).

## Checklist

- [x] `claudeDir()`, `librettoDir` exportado, lectura de las cuatro fuentes con cabeceras, topes y avisos, IPC, preload y `mockApi` · Closes: K1, K2, K9, K10
- [ ] Estado desde `skillOverrides` y `enabledPlugins`, y choques · waits on box 1 · Closes: K3, K4
- [ ] Pantalla en el raíl y ⌘K: resumen, grupos, tarjetas, búsqueda, filtro, error, con sus textos en inglés · waits on box 2 · Closes: K5, K6, K8
- [ ] Detalle de una skill con sus textos en inglés, foto con datos sembrados, novedades y boceto · waits on box 3 · Closes: K7
