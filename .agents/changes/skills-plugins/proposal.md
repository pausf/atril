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

- Q: (spec-reviewer) ¿Con qué ámbito actualiza o quita un plugin instalado? → A: lo dice la CLI: `installed` de K27 trae `scope` y `projectPath`; la barra usa la instalación `user`, o la `local` cuyo `projectPath` es el repo elegido; si solo hay otras (`project`, `managed`, `local` de otro repo), no hay botones y sale «Instalado en otro ámbito: se gestiona fuera de Atril.» (assumed: no se lee `installed_plugins.json` para esto).
- Q: (spec-reviewer) ¿Cómo distingue la pantalla los fallos? → A: main no rechaza: contesta `{ list }`/`{ catalog }` o `{ error, code }` con `code` `invalid`, `missing`, `timeout`, `busy` o `failed`; con `missing`, el `Problem` es «No encuentro Claude Code en este Mac.» con el arreglo del doctor para `claude` (`atril:doctor:install`) y sin «Hacerlo en Terminal» (assumed).
- Q: (spec-reviewer) ¿Terminal con ámbito `user` y sin repo? → A: sin `cd`; con repo, con `cd`; contesta `{ ok: true }` o `{ error }`, como `inTerminal` (assumed).
- Q: (spec-reviewer) ¿Dos operaciones a la vez en main? → A: main también lo impide: una segunda K28/K29 mientras corre otra contesta `{ error, code: 'busy' }` sin ejecutar nada (assumed: como `refine.ts`).
- Q: (builder) ¿Archivos fuera del Scope? → A: `bocetos/qa-final.html` (el paso «Plugins desde Atril contra la CLI real», pedido por el encargo) y `src/renderer/App.tsx` (una línea: la vista de foto `skills-plugins`); entran en Scope (assumed).
- Q: (builder) ¿K27 bloquea con `busy`? → A: solo mientras corre una K28/K29; una lectura de catálogo no bloquea a otra, porque la pantalla y el diálogo lo piden a la vez (la foto lo destapó); un test lo cubre (assumed).

## Outcomes

Desde Skills la persona ve qué plugins ofrecen sus marketplaces, instala uno para ella en todos los repos o solo en uno, lo actualiza o lo quita, y añade un marketplace nuevo, sin abrir la terminal ni gastar cuota; lo que pida aceptar un comando de terceros se hace en Terminal, a la vista.

## Scope

**In:** `src/main/skills/plugins.ts` nuevo (catálogo y operaciones por `Runner`), los IPC `atril:skills:catalog`, `atril:skills:plugin`, `atril:skills:marketplace` y `atril:skills:plugin-terminal` en `src/main/index.ts` y `src/preload/{api,index}.ts`, `src/renderer/mockApi.ts`, `src/renderer/skills/` (diálogo «Añadir plugin», botones de la barra de plugin), `src/preload/i18n-en.ts`, estilos con tokens, los tests, `bocetos/novedades.html`, `bocetos/fase1-nucleo.html`, `bocetos/qa-final.html`, `src/renderer/App.tsx` (solo la vista de foto `skills-plugins`), la foto.
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

- **K27** When `atril:skills:catalog(repoId?)` is called, main shall run `claude plugin list --available --json` (working directory: the repo's path when `repoId` is known) and answer `{ catalog: { installed, available } }` from the JSON on the last line of stdout, each installed entry with `pluginId`, `scope` and `projectPath` when present, each available entry with `pluginId` (`name@marketplace`), `name`, `marketplace`, `description` and `version` when present.
  Proof: src/main/skills/plugins.test.ts the catalog comes from the cli json
- **K28** When `atril:skills:plugin({ action, plugin, scope, repoId? })` is called, while no other K28/K29 operation runs, with `action` one of `install`, `uninstall`, `update`, `plugin` matching `^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$` and `scope` `user` or `local`, main shall run `claude plugin <action> <plugin> --scope <scope> --json` as an argument array (working directory: the repo's path, required for `local`), never with `-y`, `--yes` or `--accept-command`, and, when the last stdout line's `outcome` is `ok`, answer `{ list }` with the new list (K1). One test holds every clause.
  Proof: src/main/skills/plugins.test.ts plugin actions run the cli with fixed arguments
- **K29** When `atril:skills:marketplace({ source })` is called with a `source` of 1–500 characters, no whitespace and not starting with `-`, main shall run `claude plugin marketplace add <source> --scope user --json` and, on `outcome` `ok`, answer the new catalog as K27 does.
  Proof: src/main/skills/plugins.test.ts adding a marketplace runs the cli
- **K30** If a K27, K28 or K29 request fails validation, `local` comes without a known repo, another operation is running, the CLI is not found (127), passes 120 s, exits non-zero, its last stdout line is not JSON, or its `outcome` is `failed`, then main shall not reject but answer `{ error, code }` with `code` `invalid`, `invalid`, `busy`, `missing`, `timeout`, `failed`, `failed`, `failed` respectively and `error` the CLI's `message` when there is one, else «No encuentro Claude Code en este Mac.», «Claude Code no ha contestado a tiempo.» or the last 300 characters of stderr; `invalid` and `busy` shall run nothing. One test holds every clause.
  Proof: src/main/skills/plugins.test.ts a failed plugin action says why and bad input runs nothing
- **K31** When `atril:skills:plugin-terminal` is called with the same shape as K28 and it passes K28's validation, main shall open Terminal through `inTerminal` (`src/main/doctor.ts`) with `claude plugin <action> <plugin> --scope <scope>` (no `--json`), preceded by `cd '<repo>' && ` when the repo is known, and answer `{ ok: true }` or `{ error }`; failing validation it shall answer `{ error }` and open nothing. One test holds every clause.
  Proof: src/main/skills/plugins.test.ts doing it in terminal runs the same command visibly
- **K32** When the person activates «Añadir plugin» in the Plugins group, a dialog shall load the catalog (K27) and list the not-installed plugins grouped by marketplace with name, description and «Instalar»; a search box «Buscar plugin» filters by name or description; «Instalar» offers «Para mí, en todos los repos» and «Solo para mí en {repo}» (only with a repo); while it runs every plugin button and the repo selector shall be disabled; on success the dialog closes, the list updates and «Instalado. Las sesiones nuevas de Claude Code ya lo cargan.» shows; the dialog also holds «Añadir marketplace» with a field «owner/repo o URL» and «Añadir», which reloads the catalog. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx add plugin installs from the catalog
- **K33** When the Skills screen shows, it shall load the catalog (K27) and give each plugin bar «Actualizar» and «Quitar» acting on its `user` install, or else on its `local` install whose `projectPath` is the picked repo's path; with neither, the bar shall show «Instalado en otro ámbito: se gestiona fuera de Atril.» and no buttons. «Actualizar» shall run K28's `update` with that scope; «Quitar» shall first ask «¿Quitar {plugin}? Sus skills dejan de cargarse.» with «Quitar» and «Cancelar», and only on «Quitar» run `uninstall`; success shows «Hecho.»; `atril` items have neither. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx update and remove a plugin from its bar
- **K34** If a plugin action or marketplace add answers `{ error, code }`, then the screen shall show the `Problem` «No he podido completar la operación del plugin.» with `error` in its detail and «Hacerlo en Terminal» (K31, plugin actions only), except with `code` `missing`, where it shall show «No encuentro Claude Code en este Mac.» with the doctor's fix for `claude` and no Terminal button; if the catalog answers an error, the dialog shall show «No he podido leer los marketplaces.» with «Volver a intentar» (or the `missing` problem). One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx a failed plugin action offers terminal

## Approach

### Summary
`src/main/skills/plugins.ts` envuelve la CLI: `catalog()`, `pluginAction()`, `addMarketplace()` y `pluginTerminal()`, todas con el `Runner` inyectado y validación previa; parsean la última línea de stdout. La pantalla añade un diálogo «Añadir plugin» y botones a la barra de cada plugin; reusa `Problem` e `inTerminal`.

### Technical context
`src/main/run.ts` da `Runner` (`run(cmd, args, { timeoutMs, cwd? })` → `{ code, stdout, stderr }`, 127 si no existe, 124 al pasar el tope); `inTerminal(command, run)` está en `src/main/doctor.ts`; `refine.ts` es el ejemplo de llamar a `claude` por `run`. `read.ts` da `listSkills` y `repoDirOf`. El ámbito instalado sale de `installed` de K27 (CLI), no de los archivos. Radio: unos 9 archivos.

### The approach
- **Parsear:** `stdout.trimEnd().split('\n').pop()` → `JSON.parse`; si falla → K30.
- **Catálogo:** de `available` se quitan los ya en `installed`; se agrupa por la parte tras `@`.
- **Una a la vez:** un `busy` de módulo en `plugins.ts`, como `refine.ts`.
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

- [x] Main: catálogo, acciones, marketplace, terminal, con sus guardas, IPC y preload · Closes: K27, K28, K29, K30, K31
- [x] «Añadir plugin» con catálogo, búsqueda, ámbito y «Añadir marketplace» · waits on box 1 · Closes: K32
- [x] «Actualizar» y «Quitar» en la barra, errores con «Hacerlo en Terminal», textos, foto, bocetos y `qa-final.html` · waits on box 2 · Closes: K33, K34
