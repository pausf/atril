# Skills

Governs: src/main/skills/** src/renderer/skills/**

The skills and slash commands the person's Claude Code has at hand, read from their folders and
settings without calling Claude.

## Outcomes

### Skills: listado (skills-list, 20 nov 2026)

La pantalla Skills, en el raíl, enseña todas las skills y comandos que Claude Code carga para cada repo de Atril, de dónde viene cada una, su estado según los ajustes, cuáles no se cargan porque otra con el mismo nombre gana, y el detalle de cada una. No escribe nada ni llama a Claude.

### Skills: encender y apagar (skills-toggle, 23 nov 2026)

Desde la pantalla Skills la persona apaga, enciende o deja «solo el nombre» de una skill o comando, y apaga o enciende un plugin entero, sin abrir un JSON. Atril escribe solo la clave que cambia, en el archivo personal que de verdad decide, avisa la primera vez, nunca pisa un archivo que no entiende y nunca toca el `settings.json` que se sube al repo.

### Skills: editor (skills-editor, 24 nov 2026)

Desde Skills la persona cambia el texto de una skill o comando suyos, o crea una nueva, sin salir de Atril y sin perder lo que había: lo que cambió fuera no se pisa sin preguntar, una cabecera rota se avisa, y salir con cambios pregunta.

## Scope boundaries

## Constraints

### Skills: listado (skills-list, 20 nov 2026)

- Ninguna llamada a Claude; solo lectura de archivos.
- `lstat`/`stat` con topes; un archivo ilegible no tumba la lista.
- Textos por `t()` con entrada inglesa; colores por tokens; errores con `Problem`.
- El cuerpo de una skill se enseña como texto, nunca como HTML.

### Skills: encender y apagar (skills-toggle, 23 nov 2026)

- Nunca se reescribe el archivo entero desde la mezcla: se lee ese archivo, se cambia una clave y se guarda; el resto de claves y su orden siguen igual; 2 espacios y salto de línea final.
- Escritura atómica: `<archivo>.tmp` y `rename`. Carpeta `.claude/` creada si no existe.
- Ninguna llamada a Claude. Los tests usan `ATRIL_CLAUDE_DIR` y repos temporales; nunca el `~/.claude` real.
- Textos por `t()` con entrada inglesa; colores por tokens; errores con `Problem`.

### Skills: editor (skills-editor, 24 nov 2026)

- Escritura atómica (`.tmp` + `rename`) a través de `realpath` cuando existe; carpeta creada al crear.
- Tope de 256 KB al guardar (K9); por encima, no se guarda y se dice.
- Ninguna llamada a Claude. Tests con `ATRIL_CLAUDE_DIR` y repos temporales.
- Textos por `t()` con entrada inglesa; colores por tokens; errores con `Problem`.

## Prior decisions

### Skills: listado (skills-list, 20 nov 2026)

- (2026-11-20, skills-list) Atril lee skills, comandos, plugins y su estado solo de los archivos que documenta Claude Code; nunca llama a Claude para eso.
- (2026-11-20, skills-list) Con el mismo nombre, personal gana a proyecto y una skill a un comando del mismo origen; los plugins no chocan.
- (2026-11-20, skills-list) `skillOverrides` no se aplica a skills de plugin; un plugin se apaga entero con `enabledPlugins`.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Preguntar a `claude` (`/skills`, `claude plugin list`) | gasta cuota o arranca un proceso por pantalla; los archivos son la fuente documentada |
| Librería YAML (`yaml`) | dependencia nueva para ~10 claves planas; si un día hace falta YAML entero, se cambia `frontmatter.ts` |
| Escribir `skillOverrides` ya en este cambio | escribir en los ajustes de Claude Code pide su propia confirmación y su propio contrato |

#### Decision log, answers as given (2026-11-20)
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

### Skills: encender y apagar (skills-toggle, 23 nov 2026)

- (2026-11-20, skills-toggle) Atril escribe el estado de una skill en el archivo personal que gana (usuario para personales y plugins, `settings.local.json` del repo para las de proyecto) y nunca en el `settings.json` del repo.
- (2026-11-20, skills-toggle) Si un archivo que gana más ya fija la clave, Atril no ofrece el cambio y dice qué archivo la fija.
- (2026-11-20, skills-toggle) Un archivo de ajustes que no es JSON no se escribe nunca; se dice y se ofrece abrirlo.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Escribir siempre en `~/.claude/settings.json` | una skill de proyecto apagada ahí se apagaría en todos los repos con ese nombre |
| Escribir en el `settings.json` del repo | es del equipo y se sube; un clic en Atril cambiaría el repo de todos |
| Escribir en el archivo que gana aunque sea del repo | mismo problema; mejor decir «Lo fija …» |
| Reescribir desde la mezcla | perdería claves de los otros archivos o las copiaría donde no van |

#### Decision log, answers as given (2026-11-23)
- Q: ¿Dónde escribe Atril el estado de una skill? → A: en el archivo de la persona que gana en la mezcla de K3 sin tocar nada que se suba al repo: una skill o comando personal en `~/.claude/settings.json` (`ATRIL_CLAUDE_DIR`), uno de proyecto en `<repo>/.claude/settings.local.json`, siempre bajo `skillOverrides[name]` (assumed: `settings.local.json` es personal y gana a `settings.json` del repo; el `settings.json` del repo es de todo el equipo y no se toca).
- Q: ¿Y un plugin? → A: `enabledPlugins["<plugin>"]` en `~/.claude/settings.json`; encendido escribe `true` (no borra la clave) (assumed).
- Q: ¿Y si un archivo que gana más (el `settings.json` o el `settings.local.json` del repo, para una personal o un plugin) ya fija esa clave? → A: no se ofrece el cambio: el control sale desactivado con «Lo fija {archivo}» (ruta relativa al repo) (assumed: escribir donde no tiene efecto engaña).
- Q: ¿Se pregunta antes de escribir? → A: la primera vez que Atril va a escribir en los ajustes de Claude Code, un diálogo «Atril va a cambiar tus ajustes de Claude Code» con el archivo, la clave y el valor, «Cambiar» y «Cancelar», y la casilla «No volver a preguntar»; marcada, se recuerda en el estado de Atril (`ui.json`, `skillsWriteOk: true`) (assumed).
- Q: ¿Qué pasa con un archivo de ajustes ilegible o que no es JSON? → A: no se escribe nunca encima: `Problem` «No he podido cambiar tus ajustes de Claude Code.» con el archivo y «Abrir el archivo» (assumed: K10 lo trata como vacío para leer; escribir sobre él borraría lo que la persona tenga).
- Q: ¿Dónde está el control? → A: en el panel de detalle (K7): «Estado» con cuatro opciones (Activa, Solo el nombre, Solo si la llamas tú, Apagada) para personal y proyecto; en la barra de cada plugin, un interruptor «Activo»; Atril sigue de solo lectura (assumed).
- Q: (spec-reviewer) ¿El plugin sin repo? → A: la llamada lleva el repo elegido en la pantalla (`{ plugin, enabled, repoId? }`) y el bloqueo se calcula con él (assumed).
- Q: (spec-reviewer) ¿Una skill que viene de un plugin? → A: se rechaza: `skillOverrides` no se aplica a skills de plugin (Prior decision de skills-list); el plugin se apaga entero (assumed).
- Q: (spec-reviewer) ¿`skillOverrides` o `enabledPlugins` que ya existen y no son un objeto? → A: se rechaza como un JSON inválido; nunca se pisa (assumed).
- Q: (spec-reviewer) ¿Dos con el mismo nombre (personal y proyecto, o skill y comando)? → A: `skillOverrides` va por nombre, así que el cambio vale para todas las de ese nombre que lee ese archivo; la lista que contesta main lo enseña tal cual y la nota dice «También cambia {n} más con el mismo nombre.» cuando las hay (assumed).
- Q: (spec-reviewer) ¿Cómo sabe la pantalla el archivo? → A: main da a cada elemento que se puede cambiar `writesTo` (ruta absoluta del archivo destino) además de `lockedBy` (assumed).
- Q: (spec-reviewer) ¿«Abrir el archivo»? → A: pasa a «Ver en Finder» con un IPC nuevo `atril:skills:reveal` que recibe el elemento, no una ruta, y enseña su `writesTo` en Finder (o su carpeta si no existe); sale siempre que el elemento tenga `writesTo` (assumed: main nunca abre una ruta que mande el renderer).
- Q: (spec-reviewer) ¿`skillsWriteOk` sobrevive en `ui.json`? → A: sí, con W215 en `spec-workspaces.md` y su test en `src/main/ui.test.ts` (assumed).
- Q: ¿Las sesiones abiertas lo notan? → A: no se promete: tras escribir, una nota «Hecho. Las sesiones nuevas de Claude Code ya lo cargan así.» (assumed: no está comprobado si Claude Code relee los ajustes en caliente).

- Q: (builder) ¿Cómo se fotografía el detalle? → A: vista dev-only `ATRIL_SNAPSHOT_VIEW=skills-estado` que abre la primera skill personal; nombrada en Scope (assumed).

### Skills: editor (skills-editor, 24 nov 2026)

- (2026-11-24, skills-editor) Solo se editan skills y comandos personales y de proyecto; los de plugin y Atril son de solo lectura.
- (2026-11-24, skills-editor) Atril no pisa un archivo que cambió fuera desde que se abrió sin que la persona elija «Guardar el mío encima».
- (2026-11-24, skills-editor) Main solo lee o escribe la `path` de un elemento personal o de proyecto que él mismo lista, dentro de `claudeDir()` o del `.claude` del repo.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Abrir el archivo en el editor del sistema | sale de Atril y no se sabe cuándo termina; Pau quiere todo dentro |
| CodeMirror/Monaco | dependencia grande para markdown con una cabecera |
| Comparar por fecha de modificación | un `touch` o un checkout dan falso conflicto; el contenido es exacto |
| Rechazar una cabecera rota | es el archivo de la persona; puede querer guardarlo a medias |

#### Decision log, answers as given (2026-11-24)
- Q: ¿Qué se puede editar? → A: el archivo entero (cabecera y cuerpo) de las skills y comandos `personal` y `project`; los de plugin y Atril siguen de solo lectura (assumed: los de plugin los pisa la siguiente actualización del plugin; los de Atril vienen con la app).
- Q: ¿Cómo? → A: «Editar» en el detalle (K7) cambia el texto por un área de texto monoespaciada con el archivo tal cual; «Guardar» y «Descartar»; ⌘S guarda (assumed: un editor de código con resaltado es una dependencia nueva para un archivo markdown).
- Q: ¿Y si el archivo cambió en disco desde que se abrió? → A: no se guarda: «Este archivo ha cambiado fuera de Atril.» con «Cargar el de disco» (pierde lo escrito) y «Guardar el mío encima» (assumed: lo compara por contenido, no por fecha).
- Q: ¿Y una cabecera rota? → A: se guarda igual, porque es el archivo de la persona, pero antes se avisa «La cabecera no se entiende: Claude Code puede ignorar esta skill.» con «Guardar igual» y «Seguir editando» (assumed).
- Q: ¿Salir con cambios sin guardar? → A: Escape, «Cerrar», abrir otra tarjeta o cambiar de repo preguntan «Tienes cambios sin guardar. ¿Descartarlos?» (assumed: como M43).
- Q: ¿Crear una nueva? → A: «Nueva skill» en los grupos Personal y Proyecto: un nombre (minúsculas, dígitos y guiones, 1–64, empieza por letra) y «Crear», que escribe `<carpeta>/skills/<nombre>/SKILL.md` con `name` y `description` vacía, y la abre en «Editar»; si ya existe una skill con ese nombre en ese origen, no se crea (assumed).
- Q: ¿Borrar? → A: fuera de este cambio (assumed: un borrado pide papelera y deshacer; va aparte).
- Q: (spec-reviewer) ¿Un enlace simbólico que sale fuera? → A: se escribe a través, como en skills-toggle; lo que se comprueba es que la ruta listada (sin resolver) cae dentro de `claudeDir()` o del `.claude` del repo (assumed).
- Q: (spec-reviewer) ¿Qué es una cabecera rota para avisar? → A: la decide main con el mismo parser de K2: rota, o sin cabecera (`---` en la primera línea); el renderer no parsea (assumed: así no hay dos parsers que se separen y no se mueve `frontmatter.ts`).
- Q: (spec-reviewer) ¿Salir de la pantalla con cambios? → A: el borrador se guarda en memoria por archivo; al volver y abrir esa skill, el editor sale con él y «Tienes cambios sin guardar de antes.» (assumed: no hace falta frenar el raíl ni ⌘K).
- Q: (spec-reviewer) ¿De dónde sale el archivo entero? → A: un IPC `atril:skills:read` lo da; un archivo de más de 256 KB no se abre («Es demasiado grande para editarla aquí.») (assumed).
- Q: (spec-reviewer) ¿Y si cambio `name:` en la cabecera? → A: el elemento se identifica por su `path` (que main comprueba contra la lista), no por el nombre, así que el panel sigue en el mismo archivo con el nombre nuevo (assumed).
- Q: (spec-reviewer) ¿Bloquear el repo mientras guarda? → A: sí, como K18 (assumed).
- Q: (builder) ¿La foto del editor? → A: una vista de foto `skills-editor` en `App.tsx` y `Skills.tsx`, como `skills-estado` (assumed: App.tsx cae fuera del Scope escrito, se añade).
- Q: ¿Cómo sabe main qué archivo? → A: la petición lleva la `path` de un elemento y el `repoId`; main relee la lista y solo acepta una `path` que sea exactamente la de un elemento `personal` o `project` listado (assumed).

## Task breakdown

## Verification criteria

### Skills: listado (skills-list, 20 nov 2026)

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
- **K11** If the reply for a repo arrives after the person has picked another repo, then the screen shall drop it and show only the picked repo's items.
  Proof: src/renderer/skills/skills.test.tsx a late reply for the previous repo is dropped
- **K7** When the person activates a card, a detail panel shall open with `/name`, origin, state, the description, the header fields that are set, the instructions as plain text (markup shown literally) and the path; Escape or «Cerrar» shall close it and return focus to the card.
  Proof: src/renderer/skills/skills.test.tsx a card opens its detail and escape closes it
- **K8** If `atril:skills:list` rejects, then the screen shall show a `Problem` «No he podido leer tus skills.» with «Volver a intentar» and the error in its detail; each of `warnings` shall show as a note under the heading.
  Proof: src/renderer/skills/skills.test.tsx a failed read says why and offers to retry

### Skills: encender y apagar (skills-toggle, 23 nov 2026)

- **K12** Main shall give each `personal`, `project` and `plugin` item `writesTo`, the absolute path of the file K13 writes its key to, and a `lockedBy` naming the settings file (path relative to the repo) that fixes its key when a file later in K3's merge than `writesTo` sets that key (`skillOverrides[name]`, or `enabledPlugins[plugin]` for a plugin item); otherwise no `lockedBy`. `atril` items shall have neither.
  Proof: src/main/skills/skills.test.ts a key fixed by a later file is locked
- **K13** When `atril:skills:set` is called with an item (origin, name, repoId) and a state, main shall set `skillOverrides[name]` to that state in `~/.claude/settings.json` for a `personal` item or in `<repo>/.claude/settings.local.json` for a `project` item (creating the file and `.claude/` when missing); when called with a plugin, a boolean and the repoId the screen has picked, it shall set `enabledPlugins[plugin]` in `~/.claude/settings.json`; every other key of the file, and its order, shall stay as it was, written with 2-space indent and a final newline, through `<file>.tmp` and `rename`; when the file is a symlink it shall write through to its target and leave the link in place; it shall answer the new list (K1–K4). One test holds every clause.
  Proof: src/main/skills/skills.test.ts set writes one key in the file that decides
- **K14** If the file to write is not valid JSON or not an object, or its `skillOverrides`/`enabledPlugins` exists and is not an object, or the item is `atril` or `plugin` origin (a plugin is switched whole), or its `lockedBy` (computed with the call's repoId) is set, or the state is not one of K3's four, then main shall reject (and `atril:skills:reveal` shall reject an `atril` item) naming the file or the reason and leave every file byte-identical.
  Proof: src/main/skills/skills.test.ts set refuses and leaves the files alone
- **K15** When the person opens a `personal` or `project` item's detail (K7), the panel shall show «Estado» with «Activa», «Solo el nombre», «Solo si la llamas tú» and «Apagada» (the current one picked); picking another shall call `atril:skills:set` and, when it answers, show the new state on the card and «Hecho. Las sesiones nuevas de Claude Code ya lo cargan así.», plus «También cambia {n} más con el mismo nombre.» when other personal or project items share the name and read the same file; each plugin bar shall have a switch «Activo» doing the same with `enabledPlugins`; with `lockedBy` the control shall be disabled with «Lo fija {file}»; an `atril` item shall have no control. One test holds every clause.
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
- **K24** While the editor holds text different from `base`, when the person presses Escape, «Cerrar», «Descartar», activates another card or changes repo, the screen shall ask «Tienes cambios sin guardar. ¿Descartarlos?» with «Descartar cambios» and «Seguir editando», and leave the editor only on «Descartar cambios»; with no changes it shall leave without asking; when the person leaves the Skills screen instead, the text shall be kept in memory per `path` and, on opening that item's «Editar» again in the same run, come back with «Tienes cambios sin guardar de antes.». One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx leaving with unsaved changes asks first
- **K25** When the person activates «Nueva skill» in Personal or Proyecto, a dialog shall ask «Nombre» (with the rule «Minúsculas, números y guiones.» shown) and «Crear»; «Crear» shall be disabled while the name does not match K21; on success the new skill's detail shall open in «Editar»; a rejection shall show its reason in the dialog. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx new skill creates and opens it in the editor
