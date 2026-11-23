# skills-toggle

Tracker: none
Targets: skills
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> «ok, lo que tu veas sigue desarrollando y aplicando esto» (Pau, 20 nov 2026, tras el listado de Skills; la cola de Skills: listado → encender y apagar → editor → plugins → uso)

## Decision log

### Session 2026-11-20
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

## Outcomes

Desde la pantalla Skills la persona apaga, enciende o deja «solo el nombre» de una skill o comando, y apaga o enciende un plugin entero, sin abrir un JSON. Atril escribe solo la clave que cambia, en el archivo personal que de verdad decide, avisa la primera vez, nunca pisa un archivo que no entiende y nunca toca el `settings.json` que se sube al repo.

## Scope

**In:** `src/main/skills/` (escribir una clave: `write.ts` nuevo; `read.ts`/`state.ts` para saber qué archivo fija cada clave), los IPC `atril:skills:set` y `atril:skills:reveal` en `src/main/index.ts` y `src/preload/{api,index}.ts`, `src/main/ui.ts`, su tipo y `src/main/ui.test.ts` (`skillsWriteOk`, delta en `spec-workspaces.md`), `src/renderer/mockApi.ts`, `src/renderer/skills/` (detalle, barra de plugin, diálogo), `src/preload/i18n-en.ts`, estilos con tokens, `src/renderer/App.tsx` y `Skills.tsx` (vista de foto `skills-estado`, solo dev), los tests, `bocetos/novedades.html`, `bocetos/fase1-nucleo.html`, la foto.
**Out (nombrado):** escribir en el `settings.json` del repo; editar el texto de una skill (skills-editor); instalar o quitar plugins (skills-plugins); cuánto se usa cada una (skills-usage); `managed-settings`; deshacer con ⌘Z; cambiar varias a la vez.

## Constraints

- Nunca se reescribe el archivo entero desde la mezcla: se lee ese archivo, se cambia una clave y se guarda; el resto de claves y su orden siguen igual; 2 espacios y salto de línea final.
- Escritura atómica: `<archivo>.tmp` y `rename`. Carpeta `.claude/` creada si no existe.
- Ninguna llamada a Claude. Los tests usan `ATRIL_CLAUDE_DIR` y repos temporales; nunca el `~/.claude` real.
- Textos por `t()` con entrada inglesa; colores por tokens; errores con `Problem`.

## Prior decisions

- (2026-11-20, skills-toggle) Atril escribe el estado de una skill en el archivo personal que gana (usuario para personales y plugins, `settings.local.json` del repo para las de proyecto) y nunca en el `settings.json` del repo.
- (2026-11-20, skills-toggle) Si un archivo que gana más ya fija la clave, Atril no ofrece el cambio y dice qué archivo la fija.
- (2026-11-20, skills-toggle) Un archivo de ajustes que no es JSON no se escribe nunca; se dice y se ofrece abrirlo.

## Task breakdown

- Main: saber qué archivo fija cada clave y escribir una clave con sus guardas.
- Pantalla: «Estado» en el detalle, interruptor en la barra del plugin, «Lo fija …».
- El diálogo de la primera vez y el error; foto y bocetos.

## Verification criteria

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

## Approach

### Summary
Main gana `setSkill()` en `src/main/skills/write.ts`: decide el archivo, comprueba guardas, lee ese archivo solo, cambia una clave, guarda atómico y devuelve `listSkills()`. `read.ts` devuelve también, por archivo, sus claves para calcular `lockedBy`. El detalle y la barra del plugin llaman a `atril.skills.set` tras el diálogo de la primera vez.

### Technical context
Electron + TS + React 19, vitest (`skills.test.ts` en node con carpetas temporales y `ATRIL_CLAUDE_DIR`; `skills.test.tsx` con jsdom y `mockApi`). `readAll` ya devuelve `settings` en orden de mezcla (usuario, repo, repo local); `resolve()` en `state.ts` aplica K3/K4. `ui.ts` guarda el estado de Atril (`patchUi`). Radio: unos 8 archivos.

### The approach
- **Archivo destino:** `personal` y plugins → índice 0 (`<claude>/settings.json`); `project` → índice 2 (`<repo>/.claude/settings.local.json`). `lockedBy` = el último archivo de la mezcla con índice mayor que el destino que tiene la clave (`skillOverrides[name]` o `enabledPlugins[plugin]`); con destino 2 nunca hay. `resolve()` recibe las rutas junto a `settings` para nombrarlo.
- **Escritura:** `readFile` del destino; `ENOENT` → `{}`; si `JSON.parse` falla, no es objeto, o la clave existe y no es objeto → rechazo con la ruta. `obj.skillOverrides = { ...obj.skillOverrides, [name]: state }` (lo mismo con `enabledPlugins`): JS conserva el orden de inserción, así que las claves que ya estaban no se mueven. `mkdir -p`, `writeFile(tmp, JSON.stringify(obj, null, 2) + '\n')`, `rename`.
- **IPC:** `atril:skills:set` valida la forma (`{ origin, name, repoId?, state }` o `{ plugin, enabled, repoId? }`) en main, nunca confía en el renderer.
- **Reveal:** `atril:skills:reveal` recibe `{ origin, name, kind, repoId?, plugin? }`, recalcula `writesTo` en main y llama a `shell.showItemInFolder` (o a la carpeta); nunca acepta una ruta.
- **Pantalla:** el detalle añade un `radiogroup` «Estado»; la barra de plugin, un `role=switch` «Activo». El cambio pasa por `ask()`: si `ui.skillsWriteOk`, escribe; si no, abre el diálogo (`aria-modal`, foco en «Cambiar», Escape cancela). Mientras escribe, el control queda `aria-busy`; si falla, `Problem` y vuelve al estado anterior. «Ver en Finder» usa `atril:skills:reveal`.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| Escribir siempre en `~/.claude/settings.json` | una skill de proyecto apagada ahí se apagaría en todos los repos con ese nombre |
| Escribir en el `settings.json` del repo | es del equipo y se sube; un clic en Atril cambiaría el repo de todos |
| Escribir en el archivo que gana aunque sea del repo | mismo problema; mejor decir «Lo fija …» |
| Reescribir desde la mezcla | perdería claves de los otros archivos o las copiaría donde no van |

### Risks
| Risk | Mitigation |
|---|---|
| Pisar ajustes de la persona | solo una clave; JSON inválido → rechazo; K14 compara bytes antes y después |
| Escribir en el `~/.claude` real en tests | `ATRIL_CLAUDE_DIR` temporal en todo test; el lint de HOME ya prohíbe `homedir()` fuera de `paths.ts` |
| Otro programa escribe el archivo a la vez | se lee justo antes de escribir; ventana de milisegundos, aceptada |

### Validation and rollback
K13 y K14 con archivos reales en carpetas temporales; forzar rojo K14 quitando la guarda de JSON inválido. K15–K17 en jsdom. Foto de un detalle con «Estado» y una barra de plugin. Rollback: un revert; los archivos ya escritos por la persona quedan como los dejó.

### Complexity deliberately kept
`lockedBy`: sin él, Atril enseñaría «Apagada» y la skill seguiría cargándose.

## Checklist

- [x] Main: `writesTo`, `lockedBy` y `setSkill` con sus guardas, `atril:skills:reveal`, IPC y preload; `skillsWriteOk` en `ui.ts` · Closes: K12, K13, K14, W215
- [x] «Estado» en el detalle, interruptor «Activo» en la barra de plugin, «Lo fija …» y el error · waits on box 1 · Closes: K15, K17
- [x] El diálogo de la primera vez con «No volver a preguntar» (`skillsWriteOk`), textos en inglés, foto y bocetos · waits on box 2 · Closes: K16
