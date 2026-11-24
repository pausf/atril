# skills-plugins

Tracker: none
Targets: skills
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> «sigue con esto» (Pau, 24 nov 2026; la cola de Skills: listado → encender y apagar → editor → plugins → uso)

## Decision log

### Session 2026-11-24
- Q: ¿Cómo instala Atril un plugin? → A: con la CLI documentada de Claude Code, `claude plugin … --json`, por el `Runner` de `src/main/run.ts`; nunca escribiendo a mano `installed_plugins.json` ni clonando (assumed: la documentación dice que esos archivos son «registros», no una API; `--json` sí es interfaz: un objeto en la última línea de stdout con `outcome`).
- Q: ¿Gasta cuota? → A: no: según la documentación, install/uninstall/update/list y `marketplace add` son operaciones locales, de git y de red; solo `claude plugin eval` usa el modelo, y Atril no lo llama (assumed: la documentación no lo dice con todas las letras para cada comando).
- Q: ¿En qué ámbito? → A: «Para mí, en todos los repos» (`--scope user`, por defecto) o «Solo para mí en {repo}» (`--scope local`, con el repo como directorio de trabajo); nunca `project`, que escribe el `settings.json` que se sube (assumed: misma regla que skills-toggle).
- Q: ¿Y si el plugin pide aceptar un comando (`--accept-command`, `-y`)? → A: Atril nunca pasa `-y` ni `--accept-command`: si la CLI falla por eso, el error ofrece «Hacerlo en Terminal» con el comando exacto, para que la persona lo lea y acepte allí (assumed: aceptar un comando de terceros es una decisión que no se toma con un clic de Atril).
- Q: ¿Qué se puede hacer? → A: ver el catálogo de los marketplaces añadidos con búsqueda e instalar; en cada plugin instalado, «Actualizar» y «Quitar» (con confirmación); añadir un marketplace por su fuente (`owner/repo` o URL) (assumed).
- Q: ¿Qué queda fuera? → A: quitar marketplaces, actualizar marketplaces, auto-actualización, configurar plugins (`configure`), `eval`, ámbito `project` y `managed` (assumed).
- Q: ¿Y si no está `claude`? → A: el `Problem` de siempre «No encuentro Claude Code en este Mac.» con el arreglo del doctor (assumed).
- Q: ¿Varias a la vez? → A: no: una operación de plugins a la vez; los botones quedan desactivados mientras dura y el selector de repo también (K18) (assumed).

## Outcomes

Desde Skills la persona ve qué plugins ofrecen sus marketplaces, instala uno para ella en todos los repos o solo en uno, lo actualiza o lo quita, y añade un marketplace nuevo, sin abrir la terminal ni gastar cuota; lo que pida aceptar un comando de terceros se hace en Terminal, a la vista.

## Scope

**In:** `src/main/skills/plugins.ts` nuevo (catálogo y operaciones por `Runner`), los IPC `atril:skills:catalog`, `atril:skills:plugin`, `atril:skills:marketplace` y `atril:skills:plugin-terminal` en `src/main/index.ts` y `src/preload/{api,index}.ts`, `src/renderer/mockApi.ts`, `src/renderer/skills/` (diálogo «Añadir plugin», botones de la barra de plugin), `src/preload/i18n-en.ts`, estilos con tokens, los tests, `bocetos/novedades.html`, `bocetos/fase1-nucleo.html`, la foto.
**Out (nombrado):** lo de «¿Qué queda fuera?» del Decision log; escribir archivos de plugins a mano; leer `known_marketplaces.json`.

## Constraints

- Argumentos como array (`execFile`), nunca una cadena de shell; el nombre de plugin y la fuente se validan en main.
- Tope de 120 s por operación; al pasarlo, error «Claude Code no ha contestado a tiempo.».
- Ninguna llamada al modelo. Tests con un `Runner` falso que anota los argumentos; nunca el `claude` real.
- Textos por `t()` con entrada inglesa; colores por tokens; errores con `Problem`.

## Prior decisions

- (2026-11-24, skills-plugins) Atril gestiona plugins solo por `claude plugin … --json`, nunca escribiendo sus archivos.
- (2026-11-24, skills-plugins) Atril nunca acepta por la persona el comando de un plugin (`-y`, `--accept-command`); eso se hace en Terminal.
- (2026-11-24, skills-plugins) Ámbitos `user` y `local` solamente; nunca `project`.

## Task breakdown

- Main: catálogo, instalar/quitar/actualizar, añadir marketplace, comando para Terminal.
- Pantalla: «Añadir plugin» con catálogo y búsqueda; «Actualizar» y «Quitar» en la barra; «Añadir marketplace».
- Errores, foto y bocetos.

## Verification criteria

- **K27** When `atril:skills:catalog(repoId?)` is called, main shall run `claude plugin list --available --json` (working directory: the repo's path when `repoId` is known) and answer `{ installed, available }` from the JSON on the last line of stdout, each available entry with `pluginId` (`name@marketplace`), `name`, `marketplace`, `description` and `version` when present.
  Proof: src/main/skills/plugins.test.ts the catalog comes from the cli json
- **K28** When `atril:skills:plugin({ action, plugin, scope, repoId? })` is called with `action` one of `install`, `uninstall`, `update`, `plugin` matching `^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$` and `scope` `user` or `local`, main shall run `claude plugin <action> <plugin> --scope <scope> --json` as an argument array (working directory: the repo's path, required for `local`), never with `-y`, `--yes` or `--accept-command`, and, when the last stdout line's `outcome` is `ok`, answer the new list (K1). One test holds every clause.
  Proof: src/main/skills/plugins.test.ts plugin actions run the cli with fixed arguments
- **K29** When `atril:skills:marketplace({ source })` is called with a `source` of 1–500 characters, no whitespace and not starting with `-`, main shall run `claude plugin marketplace add <source> --scope user --json` and, on `outcome` `ok`, answer the new catalog (K27).
  Proof: src/main/skills/plugins.test.ts adding a marketplace runs the cli
- **K30** If a K28 or K29 request fails validation, `local` comes without a known repo, the CLI exits non-zero, its last stdout line is not JSON, its `outcome` is `failed`, it is not found (127) or it passes 120 s, then main shall reject with a message: the CLI's `message` when there is one, «No encuentro Claude Code en este Mac.», «Claude Code no ha contestado a tiempo.», or the last 300 characters of stderr; and a validation failure shall run nothing. One test holds every clause.
  Proof: src/main/skills/plugins.test.ts a failed plugin action says why and bad input runs nothing
- **K31** When `atril:skills:plugin-terminal` is called with the same shape as K28, main shall open Terminal (via `inTerminal`) with `cd <repo> && claude plugin <action> <plugin> --scope <scope>` (no `--json`, quoted for the shell), after the same validation as K28.
  Proof: src/main/skills/plugins.test.ts doing it in terminal runs the same command visibly
- **K32** When the person activates «Añadir plugin» in the Plugins group, a dialog shall load the catalog (K27) and list the not-installed plugins grouped by marketplace with name, description and «Instalar»; a search box «Buscar plugin» filters by name or description; «Instalar» offers «Para mí, en todos los repos» and «Solo para mí en {repo}» (only with a repo); while it runs every plugin button and the repo selector shall be disabled; on success the dialog closes, the list updates and «Instalado. Las sesiones nuevas de Claude Code ya lo cargan.» shows; the dialog also holds «Añadir marketplace» with a field «owner/repo o URL» and «Añadir», which reloads the catalog. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx add plugin installs from the catalog
- **K33** When the person activates «Actualizar» on an installed plugin's bar, the screen shall run K28's `update` with the scope it is installed at; when they activate «Quitar», it shall first ask «¿Quitar {plugin}? Sus skills dejan de cargarse.» with «Quitar» and «Cancelar», and only on «Quitar» run `uninstall`; success shows «Hecho.»; `atril` items have neither.
  Proof: src/renderer/skills/skills.test.tsx update and remove a plugin from its bar
- **K34** If a plugin action or marketplace add rejects, then the screen shall show the `Problem` «No he podido completar la operación del plugin.» with the message in its detail and «Hacerlo en Terminal» (K31, plugin actions only); if the catalog rejects, the dialog shall show «No he podido leer los marketplaces.» with «Volver a intentar».
  Proof: src/renderer/skills/skills.test.tsx a failed plugin action offers terminal

## Approach

### Summary
`src/main/skills/plugins.ts` envuelve la CLI: `catalog()`, `pluginAction()`, `addMarketplace()` y `pluginTerminal()`, todas con el `Runner` inyectado y validación previa; parsean la última línea de stdout. La pantalla añade un diálogo «Añadir plugin» y botones a la barra de cada plugin; reusa `Problem` e `inTerminal`.

### Technical context
`src/main/run.ts` da `Runner` (`run(cmd, args, { timeoutMs, cwd? })` → `{ code, stdout, stderr }`, 127 si no existe) e `inTerminal(command, run)`; `refine.ts` es el ejemplo de llamar a `claude` por `run`. `read.ts` da `listSkills` y `repoDirOf`. El scope instalado de cada plugin sale de `installed_plugins.json` ya leído (K1): si `SkillItem` no lo lleva, se añade `pluginScope` al leer. Radio: unos 9 archivos.

### The approach
- **Parsear:** `stdout.trimEnd().split('\n').pop()` → `JSON.parse`; si falla → K30.
- **Catálogo:** de `available` se quitan los ya en `installed`; se agrupa por la parte tras `@`.
- **Validar:** regex de K28; `source` de K29; `scope` en `user|local`; `local` exige `repoDirOf()`.
- **Terminal:** comillas simples POSIX para `<repo>`; el resto ya está validado por regex.
- **Pantalla:** estado `pluginBusy`; el diálogo `aria-modal` con foco en la búsqueda; toda respuesta tras un cambio de repo se descarta (K11/K18).

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| Escribir `installed_plugins.json` y clonar a mano | la documentación dice que son registros internos; se rompería en cualquier versión |
| Pasar `-y` para que no falle | aceptaría por la persona un comando de terceros |
| Ámbito `project` | escribe el `settings.json` del repo, que se sube |

### Risks
| Risk | Mitigation |
|---|---|
| Inyección por el nombre o la fuente | `execFile` con array y regex en main; K30 prueba que una entrada mala no ejecuta nada |
| La CLI cambia su JSON | solo se leen `outcome`, `message` y los campos de K27; lo demás se ignora; fallo → mensaje y «Hacerlo en Terminal» |
| Versión de Claude Code sin `--json` | la última línea no es JSON → K30 con stderr y «Hacerlo en Terminal» |

### Validation and rollback
K27–K31 con `Runner` falso; forzar rojo K28 añadiendo `-y` a los argumentos. K32–K34 en jsdom. Foto del diálogo «Añadir plugin» con un catálogo sembrado (vista de desarrollo, `Runner` de `claude` falso vía `SHELL`/PATH como dicen CLAUDE.md y las lecciones, nunca el real). Sin probar con la CLI real: va a `bocetos/qa-final.html`. Rollback: un revert.

### Complexity deliberately kept
«Hacerlo en Terminal»: sin él, un plugin que pide aceptar un comando no se podría instalar desde Atril sin aceptar a ciegas.

## Checklist

- [ ] Main: catálogo, acciones, marketplace, terminal, con sus guardas, IPC y preload · Closes: K27, K28, K29, K30, K31
- [ ] «Añadir plugin» con catálogo, búsqueda, ámbito y «Añadir marketplace» · waits on box 1 · Closes: K32
- [ ] «Actualizar» y «Quitar» en la barra, errores con «Hacerlo en Terminal», textos, foto, bocetos y `qa-final.html` · waits on box 2 · Closes: K33, K34
