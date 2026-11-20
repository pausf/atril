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
- Q: ¿Enlaces simbólicos en `~/.claude/skills`? → A: se siguen (es común enlazar skills), con topes: 300 skills por carpeta y 256 KB por archivo; lo que pasa del tope no se lee y se dice (assumed).

## Outcomes

La pantalla Skills, en el raíl, enseña todas las skills y comandos que Claude Code carga para cada repo de Atril, de dónde viene cada una, su estado según los ajustes, cuáles no se cargan porque otra con el mismo nombre gana, y el detalle de cada una. No escribe nada ni llama a Claude.

## Scope

**In:** `src/main/skills/` nuevo (leer carpetas, cabeceras y ajustes), `src/main/paths.ts` (`claudeDir()`), el IPC `atril:skills:list` en `src/main/index.ts` y `src/preload/{api,index}.ts`, `src/renderer/mockApi.ts`, `src/renderer/skills/` nuevo (pantalla, tarjeta, detalle), `src/renderer/components/Rail.tsx` y `src/renderer/App.tsx` (la pantalla), `src/preload/i18n-en.ts`, estilos con tokens, `bocetos/novedades.html`, `bocetos/fase1-nucleo.html`, la foto; la spec nueva `skills`.
**Out (nombrado):** cambiar el estado (switch, menú, «Apagar todas»); crear, editar, duplicar; instalar plugins y marketplaces; uso, gráficas y «Sin usar en 30 días»; la vista Lista y el donut; skills de empresa (managed), anidadas y de `--add-dir`.

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

- **K1** When the window asks `atril:skills:list(repoId?)`, main shall answer `{ items, warnings }` with one item per skill (`skills/<n>/SKILL.md`) and per command (`commands/<n>.md`) found in: `claudeDir()` (origin `personal`); the `.claude` folder of the repo `repoId` from Atril's repo list (origin `project`, none when `repoId` is absent or unknown); each plugin in `claudeDir()/plugins/installed_plugins.json` by its `installPath` (origin `plugin`, with `plugin` = its `name@marketplace` and `enabled` from K3); and Atril's own Libretto plugin folder (origin `atril`). Each item shall carry `name` (frontmatter `name`, else the folder or file name), `kind` (`skill` | `command`), `origin`, `path`, `description`, `whenToUse`, `argumentHint`, `allowedTools`, `model`, `effort`, `disableModelInvocation`, `userInvocable`, and `body` (the text after the frontmatter).
  Proof: src/main/skills/skills.test.ts lists skills and commands from every origin with their header
- **K2** If a folder is missing, a `SKILL.md` has no valid frontmatter, a file passes 256 KB, a folder holds more than 300 skills, or `installed_plugins.json` is unreadable, then main shall still answer the rest: a bad header lists the item with `broken: true` and its name from the folder; a file over the cap or past the count is not read and one entry in `warnings` names its folder; a missing folder adds nothing.
  Proof: src/main/skills/skills.test.ts a broken header or a huge folder never hides the rest
- **K3** Main shall set each non-plugin item's `state` from `skillOverrides[name]` (`on`, `name-only`, `user-invocable-only`, `off`; absent or unknown = `on`) merged user `settings.json` < repo `.claude/settings.json` < repo `.claude/settings.local.json`, and each plugin item's `state` to `on` with `enabled` from `enabledPlugins["<plugin>"]` in the same merge (absent = `true`).
  Proof: src/main/skills/skills.test.ts state comes from skillOverrides and plugins from enabledPlugins
- **K4** Main shall mark `shadowedBy: 'personal' | 'skill'` on a project item whose `name` a personal item also has, and on a command whose `name` a skill of the same origin has; plugin and Atril items are never shadowed.
  Proof: src/main/skills/skills.test.ts a personal skill wins over the repo's and a skill over a command
- **K5** When the person opens «Skills» from the rail, the screen shall show the heading «Skills» with the number of items, the lead «Las skills y los comandos / que tu Claude Code tiene a mano en cada trabajo. Los lee de sus carpetas, sin gastar cuota.», a repo selector of Atril's repos, the tiles «Activas» (count of `on` and `name-only` items not shadowed, plugin ones only when `enabled`, with «~{n} tokens de contexto», n = characters of name + description + whenToUse of those items ÷ 3.2, rounded), «Apagadas» and «Choques», and the groups «Personal», «Proyecto ({repo})», «Plugins» (one bar per plugin with «{plugin} · {n} skills · activo | apagado entero») and «Atril» (folded, «solo lectura»). Each card shall show `/name` (plugin items `/{plugin name}:name`), its origin, «comando» for commands, its state as «Activa», «Solo el nombre», «Solo si la llamas tú» or «Apagada», the description on one line, and «No se carga: gana la personal» or «No se carga: gana la skill» when shadowed, «Claude no la usa sola» when `disableModelInvocation`, «Cabecera ilegible» when `broken`.
  Proof: src/renderer/skills/skills.test.tsx the screen groups every skill by where it comes from
- **K6** When the person types in «Buscar por nombre o descripción…» or picks «Todas», «Activas» or «Apagadas», the screen shall show only the matching cards; with none it shall say «Nada se llama «{q}».» with «Borrar la búsqueda»; a repo with no project items shall say «{repo} aún no tiene skills propias.».
  Proof: src/renderer/skills/skills.test.tsx search and filter narrow the cards
- **K7** When the person activates a card, a detail panel shall open with `/name`, origin, state, the description, the header fields that are set, the instructions as plain text (markup shown literally) and the path; Escape or «Cerrar» shall close it and return focus to the card.
  Proof: src/renderer/skills/skills.test.tsx a card opens its detail and escape closes it
- **K8** If `atril:skills:list` rejects, then the screen shall show a `Problem` «No he podido leer tus skills.» with «Volver a intentar» and the error in its detail; `warnings` shall show as one note each under the heading.
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
- IPC `atril:skills:list` en `index.ts`, resolviendo `repoId` con `listRepos` y `librettoDir()` de `agent.ts`.
- Renderer: `SkillsScreen.tsx` (resumen, búsqueda, filtro, grupos), `SkillCard.tsx`, `SkillDetail.tsx` (panel lateral, no modal, Escape cierra); el raíl gana «Skills» entre Libretto y QA.

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

- [ ] `claudeDir()`, lectura de las cuatro fuentes con cabeceras y topes, IPC, preload y `mockApi` · Closes: K1, K2
- [ ] Estado desde `skillOverrides` y `enabledPlugins`, y choques · waits on box 1 · Closes: K3, K4
- [ ] Pantalla en el raíl: resumen, grupos, tarjetas, búsqueda, filtro y error · waits on box 2 · Closes: K5, K6, K8
- [ ] Detalle de una skill, textos en inglés, foto con datos sembrados, novedades y boceto · waits on box 3 · Closes: K7
