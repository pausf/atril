# skills-editor

Tracker: none
Targets: skills
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> «sigue con esto» (Pau, 24 nov 2026, tras encender y apagar; la cola de Skills: listado → encender y apagar → editor → plugins → uso)

## Decision log

### Session 2026-11-24
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
- Q: ¿Cómo sabe main qué archivo? → A: la petición lleva la `path` de un elemento y el `repoId`; main relee la lista y solo acepta una `path` que sea exactamente la de un elemento `personal` o `project` listado (assumed).

## Outcomes

Desde Skills la persona cambia el texto de una skill o comando suyos, o crea una nueva, sin salir de Atril y sin perder lo que había: lo que cambió fuera no se pisa sin preguntar, una cabecera rota se avisa, y salir con cambios pregunta.

## Scope

**In:** `src/main/skills/` (`edit.ts` nuevo: leer, guardar, crear), los IPC `atril:skills:read`, `atril:skills:save` y `atril:skills:create` en `src/main/index.ts` y `src/preload/{api,index}.ts`, `src/renderer/mockApi.ts`, `src/renderer/skills/` (editor en el detalle, diálogo de crear), `src/preload/i18n-en.ts`, estilos con tokens, los tests, `bocetos/novedades.html`, `bocetos/fase1-nucleo.html`, la foto.
**Out (nombrado):** borrar; renombrar; editar archivos de apoyo de una skill (otros archivos en su carpeta); plugins y Atril; resaltado de sintaxis; vista previa del markdown; crear comandos (solo skills).

## Constraints

- Escritura atómica (`.tmp` + `rename`) a través de `realpath` cuando existe; carpeta creada al crear.
- Tope de 256 KB al guardar (K9); por encima, no se guarda y se dice.
- Ninguna llamada a Claude. Tests con `ATRIL_CLAUDE_DIR` y repos temporales.
- Textos por `t()` con entrada inglesa; colores por tokens; errores con `Problem`.

## Prior decisions

- (2026-11-24, skills-editor) Solo se editan skills y comandos personales y de proyecto; los de plugin y Atril son de solo lectura.
- (2026-11-24, skills-editor) Atril no pisa un archivo que cambió fuera desde que se abrió sin que la persona elija «Guardar el mío encima».
- (2026-11-24, skills-editor) Main solo lee o escribe la `path` de un elemento personal o de proyecto que él mismo lista, dentro de `claudeDir()` o del `.claude` del repo.

## Task breakdown

- Main: guardar con comparación de contenido y crear, con sus guardas.
- Pantalla: «Editar», guardar, conflicto, cabecera rota, salir con cambios.
- «Nueva skill»; foto y bocetos.

## Verification criteria

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

## Approach

### Summary
`src/main/skills/edit.ts` con `saveSkill()` y `createSkill()`: localizan el elemento con `listSkills()`, comprueban guardas y escriben como `write.ts` (atómico, `realpath`). El detalle (`SkillDetail.tsx`) gana un modo edición con `base` y `text` en estado; el conflicto y la cabecera rota son avisos dentro del panel; «Nueva skill» es un diálogo pequeño.

### Technical context
Electron + TS + React 19, vitest (node con carpetas temporales y `ATRIL_CLAUDE_DIR`; jsdom con `mockApi`). `read.ts` ya da `path` y lee con tope 256 KB; `frontmatter.ts` parsea cabeceras (K2); solo lo usa main (la cabecera rota la decide `saveSkill`). `write.ts` tiene el patrón de escritura. Radio: unos 9 archivos.

### The approach
- **Localizar:** `listSkills(repoId)` → el elemento `personal`/`project` cuya `path` es exactamente la pedida; si no hay, rechazo. Además la `path` debe empezar por `claudeDir()` + separador o por `<repo>/.claude` + separador (sin resolver enlaces); se escribe a través de `realpath`, como skills-toggle.
- **Leer:** `readFile` tras localizar; > 256 KB → rechazo.
- **Guardar:** `readFile(real)`; si `!== base` y no `force` → devuelve `{ conflict: true, disk }`; si la cabecera de `text` está rota o falta y no `allowBroken` → `{ brokenHeader: true }` (devolver, no lanzar: un error por IPC llega solo como mensaje); si no, escribe y devuelve `{ list }`. `Buffer.byteLength(text) > 256 KB` → rechazo.
- **Crear:** regex; `project` sin repo conocido → rechazo; carpeta `claudeDir()/skills/<name>` o `<repo>/.claude/skills/<name>`; si existe la carpeta o un elemento con ese nombre en ese origen → rechazo; `mkdir` y `writeFile` con `flag: 'wx'`.
- **Pantalla:** `editing: { path, base, text } | null` en `SkillDetail`; un `Map<path, text>` de módulo guarda borradores al desmontar (K24); `dirty = text !== base`; `guard(next)` pregunta si `dirty` y si no ejecuta `next`, usado por Escape, «Cerrar», «Descartar», otra tarjeta y el selector de repo (este último vive en `Skills.tsx`: el detalle avisa hacia arriba con `onDirty`).

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| Abrir el archivo en el editor del sistema | sale de Atril y no se sabe cuándo termina; Pau quiere todo dentro |
| CodeMirror/Monaco | dependencia grande para markdown con una cabecera |
| Comparar por fecha de modificación | un `touch` o un checkout dan falso conflicto; el contenido es exacto |
| Rechazar una cabecera rota | es el archivo de la persona; puede querer guardarlo a medias |

### Risks
| Risk | Mitigation |
|---|---|
| Pisar un cambio hecho fuera | K19 compara con `base`; conflicto explícito |
| Escribir fuera de las carpetas de Claude | K20 comprueba la ruta real contra las raíces |
| Perder lo escrito al salir | K24 pregunta en cada salida |

### Validation and rollback
K19–K21 con archivos reales; forzar rojo K19 quitando la comparación con `base`. K22–K25 en jsdom. Foto del editor abierto. Rollback: un revert.

### Complexity deliberately kept
`base` en cada guardado: sin él, guardar pisaría en silencio lo que otro editor cambió.

## Checklist

- [ ] Main: `readSkillFile`, `saveSkill` y `createSkill` con sus guardas, IPC y preload · Closes: K19, K20, K21, K26
- [ ] «Editar» en el detalle, guardar, conflicto, cabecera rota y salir con cambios · waits on box 1 · Closes: K22, K23, K24
- [ ] «Nueva skill», textos en inglés, foto y bocetos · waits on box 2 · Closes: K25
