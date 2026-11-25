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

### Skills: plugins (skills-plugins, 24 nov 2026)

Desde Skills la persona ve qué plugins ofrecen sus marketplaces, instala uno para ella en todos los repos o solo en uno, lo actualiza o lo quita, y añade un marketplace nuevo, sin abrir la terminal ni gastar cuota; lo que pida aceptar un comando de terceros se hace en Terminal, a la vista.

### Skills: uso (skills-usage, 25 nov 2026)

En Skills la persona ve qué skills y comandos usa de verdad y cuáles llevan 30 días sin usarse, para decidir cuáles apagar, sin gastar cuota: Atril lo cuenta leyendo las sesiones que Claude Code ya guarda en el Mac.

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

### Skills: plugins (skills-plugins, 24 nov 2026)

- Argumentos como array (`execFile`), nunca una cadena de shell; el nombre de plugin y la fuente se validan en main.
- Tope de 120 s por operación; al pasarlo, error «Claude Code no ha contestado a tiempo.».
- Ninguna llamada al modelo. Tests con un `Runner` falso que anota los argumentos; nunca el `claude` real.
- Textos por `t()` con entrada inglesa; colores por tokens; errores con `Problem`.

### Skills: uso (skills-usage, 25 nov 2026)

- Ninguna llamada a Claude; nunca `~/.claude.json`. Solo lectura de `claudeDir()/projects`.
- Lectura por líneas en streaming; una línea se mira con `JSON.parse` solo si contiene `"name":"Skill"` o `<command-name>`.
- Textos por `t()` con entrada inglesa; colores por tokens.
- Tests con `ATRIL_CLAUDE_DIR` temporal y sesiones sembradas.

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

### Skills: plugins (skills-plugins, 24 nov 2026)

- (2026-11-24, skills-plugins) Atril gestiona plugins solo por `claude plugin … --json`, nunca escribiendo sus archivos.
- (2026-11-24, skills-plugins) Atril nunca acepta por la persona el comando de un plugin (`-y`, `--accept-command`); eso se hace en Terminal.
- (2026-11-24, skills-plugins) Ámbitos `user` y `local` solamente; nunca `project`.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Escribir `installed_plugins.json` y clonar a mano | la documentación dice que son registros internos; se rompería en cualquier versión |
| Pasar `-y` para que no falle | aceptaría por la persona un comando de terceros |
| Ámbito `project` | escribe el `settings.json` del repo, que se sube |

#### Decision log, answers as given (2026-11-24)
- Q: ¿Cómo instala Atril un plugin? → A: con la CLI documentada de Claude Code, `claude plugin … --json`, por el `Runner` de `src/main/run.ts`; nunca escribiendo a mano `installed_plugins.json` ni clonando (assumed: la documentación dice que esos archivos son «registros», no una API; `--json` sí es interfaz: un objeto en la última línea de stdout con `outcome`).
- Q: ¿Gasta cuota? → A: no: según la documentación, install/uninstall/update/list y `marketplace add` son operaciones locales, de git y de red; solo `claude plugin eval` usa el modelo, y Atril no lo llama (assumed: la documentación no lo dice con todas las letras para cada comando).
- Q: ¿En qué ámbito? → A: «Para mí, en todos los repos» (`--scope user`, por defecto) o «Solo para mí en {repo}» (`--scope local`, con el repo como directorio de trabajo); nunca `project`, que escribe el `settings.json` que se sube (assumed: misma regla que skills-toggle).
- Q: ¿Y si el plugin pide aceptar un comando (`--accept-command`, `-y`)? → A: Atril nunca pasa `-y` ni `--accept-command`: si la CLI falla por eso, el error ofrece «Hacerlo en Terminal» con el comando exacto, para que la persona lo lea y acepte allí (assumed: aceptar un comando de terceros es una decisión que no se toma con un clic de Atril).
- Q: ¿Qué se puede hacer? → A: ver el catálogo de los marketplaces añadidos con búsqueda e instalar; en cada plugin instalado, «Actualizar» y «Quitar» (con confirmación); añadir un marketplace por su fuente (`owner/repo` o URL) (assumed).
- Q: ¿Qué queda fuera? → A: quitar marketplaces, actualizar marketplaces, auto-actualización, configurar plugins (`configure`), `eval`, ámbito `project` y `managed` (assumed).
- Q: ¿Y si no está `claude`? → A: el `Problem` de siempre «No encuentro Claude Code en este Mac.» con el arreglo del doctor (assumed).
- Q: ¿Varias a la vez? → A: no: una operación de plugins a la vez; los botones quedan desactivados mientras dura y el selector de repo también (K18) (assumed).

- Q: (spec-reviewer) ¿Con qué ámbito actualiza o quita un plugin instalado? → A: lo dice la CLI: `installed` de K27 trae `scope` y `projectPath`; la barra usa la instalación `user`, o la `local` cuyo `projectPath` es el repo elegido; si solo hay otras (`project`, `managed`, `local` de otro repo), no hay botones y sale «Instalado en otro ámbito: se gestiona fuera de Atril.» (assumed: no se lee `installed_plugins.json` para esto).
- Q: (spec-reviewer) ¿Cómo distingue la pantalla los fallos? → A: main no rechaza: contesta `{ list }`/`{ catalog }` o `{ error, code }` con `code` `invalid`, `missing`, `timeout`, `busy` o `failed`; con `missing`, el `Problem` es «No encuentro Claude Code en este Mac.» con el arreglo del doctor para `claude` (`atril:doctor:install`) y sin «Hacerlo en Terminal» (assumed).
- Q: (spec-reviewer) ¿Terminal con ámbito `user` y sin repo? → A: sin `cd`; con repo, con `cd`; contesta `{ ok: true }` o `{ error }`, como `inTerminal` (assumed).
- Q: (spec-reviewer) ¿Dos operaciones a la vez en main? → A: main también lo impide: una segunda K28/K29 mientras corre otra contesta `{ error, code: 'busy' }` sin ejecutar nada (assumed: como `refine.ts`).
- Q: (builder) ¿Archivos fuera del Scope? → A: `bocetos/qa-final.html` (el paso «Plugins desde Atril contra la CLI real», pedido por el encargo) y `src/renderer/App.tsx` (una línea: la vista de foto `skills-plugins`); entran en Scope (assumed).
- Q: (builder) ¿K27 bloquea con `busy`? → A: solo mientras corre una K28/K29; una lectura de catálogo no bloquea a otra, porque la pantalla y el diálogo lo piden a la vez (la foto lo destapó); un test lo cubre (assumed).

### Skills: uso (skills-usage, 25 nov 2026)

- (2026-11-25, skills-usage) El uso sale de las sesiones de Claude Code en `claudeDir()/projects`, nunca de `~/.claude.json` ni de una llamada a Claude; una línea que no se entiende se salta.
- (2026-11-25, skills-usage) Solo se miran 30 días y solo los archivos modificados en ellos; lo contado se guarda en memoria por archivo (`mtime` + tamaño) — ponytail: en memoria, persistir si la primera apertura es lenta.
- (2026-11-25, skills-usage) Una invocación casa con la tarjeta por el nombre que esta enseña sin barra (`name` o `{plugin antes de @}:name`).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Leer `~/.claude.json` | prohibido tocarlo; y no sabemos que guarde fechas |
| Hooks de Claude Code que apunten cada uso | escribe en los ajustes de la persona y solo cuenta desde hoy |
| Persistir el recuento en `ATRIL_HOME` | más código y una caché que invalidar; en memoria basta hasta medir |
| Releer todo cada vez | ~3,5 GB; aun con el filtro de 30 días, la caché ahorra casi todo |

#### Decision log, answers as given (2026-11-25)
- Q: ¿De dónde sale el uso? → A: de las sesiones que Claude Code guarda en `claudeDir()/projects/*/*.jsonl` (y sus `*/<sesión>/subagents/*.jsonl`): una línea con un `tool_use` `"name":"Skill"` cuenta `input.skill`; una línea de la persona con `<command-name>/x</command-name>` cuenta `x` (assumed: Claude Code no documenta otro registro de uso; `~/.claude.json` no se toca; el formato no está documentado, así que una línea que no se entiende se salta y nunca rompe la pantalla).
- Q: ¿Cuánto hacia atrás? → A: 30 días, y solo se abren archivos modificados en esos 30 días (assumed: hay ~3,5 GB de sesiones; leer todo cada vez es inviable).
- Q: ¿Cada vez que se abre Skills relee todo? → A: no: main guarda en memoria lo contado por archivo junto a su `mtime` y tamaño y solo relee los que cambiaron; una lectura a la vez (assumed: persistirlo en disco si la primera apertura resulta lenta).
- Q: ¿Cómo se casa una invocación con una tarjeta? → A: por el nombre que la tarjeta enseña sin la barra: `name` para personal y proyecto, `{plugin antes de @}:name` para plugin y Atril (assumed: es lo que se teclea y lo que el `Skill` recibe).
- Q: ¿Qué enseña? → A: en cada tarjeta, «usada hace {n} días» / «usada hoy» / «sin usar en 30 días»; un recuadro «Sin usar en 30 días» junto a Activas, Apagadas y Choques, que filtra; en el detalle, «Uso · últimos 14 días» con 14 barras, «{n} veces en 30 días» y «Según las sesiones de Claude Code en este Mac.» (assumed: como el boceto, sin el donut).
- Q: ¿«Apagar todas» las sin usar? → A: fuera (assumed: son N escrituras de golpe y merecen su propio cambio con deshacer).
- Q: (spec-reviewer) ¿Qué tarjetas dicen el uso y cuáles cuentan como «sin usar»? → A: dicen el uso todas menos las que no se cargan (`shadowedBy`), que no dicen nada; un nombre sin entrada es «sin usar en 30 días»; el recuadro y el filtro cuentan las que Claude puede usar: no `off`, no `shadowedBy` y `enabled` distinto de `false` (incluye «Solo si la llamas tú», que es justo la que solo cuenta si la tecleas) (assumed).
- Q: (spec-reviewer) ¿Dos tarjetas con el mismo nombre en repos distintos? → A: comparten el recuento: las sesiones no dicen de qué repo venía una skill con ese nombre; uso por repo está fuera (assumed).
- Q: (spec-reviewer) ¿Se vuelve a pedir el uso al cambiar de repo? → A: no: una vez por visita a la pantalla; el uso no depende del repo (assumed).
- Q: (spec-reviewer) ¿Escala y fecha de las barras? → A: proporcionales al máximo de esos 14 días; con todo a 0, todas al mínimo (2 px); la etiqueta con día y mes cortos de la configuración regional, p. ej. «25 nov: 3» (assumed).
- Q: (spec-reviewer) ¿Filtro «sin usar» vacío? → A: «No tienes ninguna sin usar.» (assumed).
- Q: (foto) ¿Las de Atril cuentan como candidatas a apagar? → A: no: vienen con la app y no se apagan una a una; su tarjeta sí dice el uso (assumed).
- Q: ¿Y si leer el uso falla o tarda? → A: la lista nunca espera al uso; si falla, las tarjetas no dicen nada del uso y no hay recuadro (assumed: el uso es un añadido, no la pantalla).

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
- **K33** When the Skills screen shows, it shall load the catalog (K27) and give each plugin bar «Actualizar» and «Quitar» acting on its `user` install, or else on its `local` install whose `projectPath` is the picked repo's path; with neither, the bar shall show «Instalado en otro ámbito: se gestiona fuera de Atril.» and no buttons. «Actualizar» shall run K28's `update` with that scope; «Quitar» shall first ask «¿Quitar {plugin}? Sus skills dejan de cargarse.» with «Quitar» and «Cancelar», and only on «Quitar» run `uninstall`; success shows «Hecho.»; `atril` items have neither. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx update and remove a plugin from its bar
- **K34** If a plugin action or marketplace add answers `{ error, code }`, then the screen shall show the `Problem` «No he podido completar la operación del plugin.» with `error` in its detail and «Hacerlo en Terminal» (K31, plugin actions only), except with `code` `missing`, where it shall show «No encuentro Claude Code en este Mac.» with the doctor's fix for `claude` and no Terminal button; if the catalog answers an error, the dialog shall show «No he podido leer los marketplaces.» with «Volver a intentar» (or the `missing` problem). One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx a failed plugin action offers terminal

### Skills: uso (skills-usage, 25 nov 2026)

- **K35** When `atril:skills:usage` is called, main shall read every `*.jsonl` under `claudeDir()/projects/<dir>/` and `claudeDir()/projects/<dir>/<session>/subagents/` whose `mtime` is within the last 30 days, and answer `{ usage }` mapping each name to `{ last, days }` — `last` the newest ISO `timestamp` seen for it, `days` a 30-number array (index 0 today, local time) of uses per day — counting once per line an assistant line holding a `tool_use` named `Skill` (its `input.skill`) and once per line a user line whose content holds `<command-name>/x</command-name>` (as `x`); lines older than 30 days, unparsable lines and lines without `timestamp` shall count nothing; a file whose `mtime` is older than 30 days shall count nothing even when its lines carry recent timestamps (it is not opened). Day `k` is the number of local calendar days between today and the line's `timestamp`. One test holds every clause.
  Proof: src/main/skills/usage.test.ts "counts Skill tool uses and typed commands per day within 30 days"
- **K36** If a file's `mtime` and size are unchanged since the last `atril:skills:usage`, then main shall not read it again and shall reuse what it counted; a file that changed shall be read again whole and a file that disappeared shall stop counting. One test holds every clause.
  Proof: src/main/skills/usage.test.ts "reuses an unchanged file and rereads a changed one"
- **K39** While one `atril:skills:usage` read runs, a second call shall get the same answer without starting another read; if `claudeDir()/projects` cannot be listed for a reason other than not existing, main shall answer `{ error }` and not reject, and with no `projects` folder it shall answer `{ usage: {} }`. One test holds every clause.
  Proof: src/main/skills/usage.test.ts "shares a running read and answers an error instead of rejecting"
- **K37** When the Skills screen shows and the usage answers, each card not shadowed shall show «usada hoy», «usada hace 1 día», «usada hace {n} días» or (no entry for its name) «sin usar en 30 días», matching the card's name without the slash (K5), and a shadowed card shall say nothing about usage; a fourth tile «Sin usar en 30 días» shall count the items that are not `atril`, not `off`, not shadowed, not `enabled: false` and have no use, with «candidatas a apagar» (or «todas en uso» at 0), and activating it shall filter to those items as a pressed toggle that a second press, «Todas» or another filter undoes, showing «No tienes ninguna sin usar.» when none; the usage shall be asked once per visit to the screen, not again on a repo pick; while it has not answered, or it answered `{ error }`, cards shall say nothing about usage and the tile shall not show. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx "shows when each skill was last used and filters the unused ones"
- **K38** When the detail (K7) opens and the usage has answered, it shall show «Uso · últimos 14 días» with 14 bars (oldest left, height proportional to that day's uses over the 14-day maximum, 2 px when 0, each with an accessible label «{día mes corto}: {n}», e.g. «25 nov: 3»), «{n} veces en 30 días» («1 vez en 30 días» for one, «Sin usar en 30 días.» for none) and «Según las sesiones de Claude Code en este Mac.»; without usage it shall show none of these. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx "the detail shows the last 14 days of use"
