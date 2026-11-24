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
- Q: ¿Cómo sabe main qué archivo? → A: la petición nombra el elemento (`origin`, `kind`, `name`, `repoId`), main relee la lista y usa la `path` de ese elemento; nunca acepta una ruta del renderer y comprueba que la ruta real queda dentro de `claudeDir()` o del `.claude` del repo (assumed: un enlace simbólico que sale fuera se escribe a través, como en skills-toggle, solo si su destino es un archivo que ya existe).

## Outcomes

Desde Skills la persona cambia el texto de una skill o comando suyos, o crea una nueva, sin salir de Atril y sin perder lo que había: lo que cambió fuera no se pisa sin preguntar, una cabecera rota se avisa, y salir con cambios pregunta.

## Scope

**In:** `src/main/skills/` (`edit.ts` nuevo: leer, guardar, crear), los IPC `atril:skills:save` y `atril:skills:create` en `src/main/index.ts` y `src/preload/{api,index}.ts`, `src/renderer/mockApi.ts`, `src/renderer/skills/` (editor en el detalle, diálogo de crear), `src/preload/i18n-en.ts`, estilos con tokens, los tests, `bocetos/novedades.html`, `bocetos/fase1-nucleo.html`, la foto.
**Out (nombrado):** borrar; renombrar; editar archivos de apoyo de una skill (otros archivos en su carpeta); plugins y Atril; resaltado de sintaxis; vista previa del markdown; crear comandos (solo skills).

## Constraints

- Escritura atómica (`.tmp` + `rename`) a través de `realpath` cuando existe; carpeta creada al crear.
- Tope de 256 KB al guardar (K9); por encima, no se guarda y se dice.
- Ninguna llamada a Claude. Tests con `ATRIL_CLAUDE_DIR` y repos temporales.
- Textos por `t()` con entrada inglesa; colores por tokens; errores con `Problem`.

## Prior decisions

- (2026-11-24, skills-editor) Solo se editan skills y comandos personales y de proyecto; los de plugin y Atril son de solo lectura.
- (2026-11-24, skills-editor) Atril no pisa un archivo que cambió fuera desde que se abrió sin que la persona elija «Guardar el mío encima».
- (2026-11-24, skills-editor) Main identifica el archivo por el elemento, nunca por una ruta del renderer, y solo escribe dentro de `claudeDir()` o del `.claude` del repo.

## Task breakdown

- Main: guardar con comparación de contenido y crear, con sus guardas.
- Pantalla: «Editar», guardar, conflicto, cabecera rota, salir con cambios.
- «Nueva skill»; foto y bocetos.

## Verification criteria

- **K19** When `atril:skills:save` is called with an item (`origin` `personal` or `project`, `kind`, `name`, `repoId?`), the text the editor started from (`base`) and the new `text`, and the file on disk still equals `base`, main shall write `text` to that item's `path` (through `realpath`, via `.tmp` and `rename`) and answer the new list; when the file no longer equals `base` and `force` is not set, it shall reject with `{ conflict: true }` and write nothing; with `force` it shall write. One test holds every clause.
  Proof: src/main/skills/skills.test.ts save writes the item's file unless it changed underneath
- **K20** If the save names a `plugin` or `atril` item, an item not in the list, a `text` over 256 KB, or the item's real path falls outside `claudeDir()` and the repo's `.claude`, then main shall reject saying why and leave every file byte-identical.
  Proof: src/main/skills/skills.test.ts save refuses outside its folders and leaves files alone
- **K21** When `atril:skills:create` is called with `origin` (`personal` or `project`), `repoId?` and a `name` matching `^[a-z][a-z0-9-]{0,63}$`, main shall create `<claudeDir() or repo>/.../skills/<name>/SKILL.md` holding `---\nname: <name>\ndescription: \n---\n\n` and answer the new list; if the name does not match, or a skill with that name already exists in that origin, it shall reject and create nothing. One test holds every clause.
  Proof: src/main/skills/skills.test.ts create makes a new skill and refuses a bad or taken name
- **K22** When the person opens a `personal` or `project` item's detail, the panel shall offer «Editar», which shows the whole file in a monospaced text area labelled «Texto de {name}» with «Guardar» (also ⌘S) and «Descartar»; «Guardar» shall call `atril:skills:save` and, on success, show the new text read-only and «Guardado.»; a `plugin` or `atril` item shall offer no «Editar». One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx edit and save a skill from its detail
- **K23** If the save answers a conflict, then the panel shall say «Este archivo ha cambiado fuera de Atril.» with «Cargar el de disco» (replaces the text with the current file) and «Guardar el mío encima» (saves with `force`); if the text's header does not parse (K2), then before saving it shall ask «La cabecera no se entiende: Claude Code puede ignorar esta skill.» with «Guardar igual» and «Seguir editando»; any other rejection shall show the `Problem` «No he podido guardar la skill.» with the error in its detail and keep the text. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx a save that conflicts or has a broken header asks first
- **K24** While the editor holds text different from `base`, when the person presses Escape, «Cerrar», «Descartar», activates another card or changes repo, the screen shall ask «Tienes cambios sin guardar. ¿Descartarlos?» and only on «Descartar» leave the editor; with no changes it shall leave without asking.
  Proof: src/renderer/skills/skills.test.tsx leaving with unsaved changes asks first
- **K25** When the person activates «Nueva skill» in Personal or Proyecto, a dialog shall ask «Nombre» (with the rule «Minúsculas, números y guiones.» shown) and «Crear»; «Crear» shall be disabled while the name does not match K21; on success the new skill's detail shall open in «Editar»; a rejection shall show its reason in the dialog.
  Proof: src/renderer/skills/skills.test.tsx new skill creates and opens it in the editor

## Approach

### Summary
`src/main/skills/edit.ts` con `saveSkill()` y `createSkill()`: localizan el elemento con `listSkills()`, comprueban guardas y escriben como `write.ts` (atómico, `realpath`). El detalle (`SkillDetail.tsx`) gana un modo edición con `base` y `text` en estado; el conflicto y la cabecera rota son avisos dentro del panel; «Nueva skill» es un diálogo pequeño.

### Technical context
Electron + TS + React 19, vitest (node con carpetas temporales y `ATRIL_CLAUDE_DIR`; jsdom con `mockApi`). `read.ts` ya da `path` y lee con tope 256 KB; `frontmatter.ts` parsea cabeceras (K2) y se reutiliza en el renderer para el aviso (es puro, sin `node:`); si importa algo de node, se mueve la función pura a `src/preload/` o se duplica la comprobación mínima. `write.ts` tiene el patrón de escritura. Radio: unos 9 archivos.

### The approach
- **Localizar:** `listSkills(repoId)` → el elemento con mismo `origin`, `kind` y `name`; si no hay, rechazo. `real = await realpath(item.path)`; `roots = [realpath(claudeDir())]` más `realpath(<repo>/.claude)` si hay repo; `real` debe empezar por una raíz + separador, salvo que `item.path` (sin resolver) esté dentro y `real` sea un archivo existente (enlace de dotfiles), igual que skills-toggle.
- **Guardar:** `readFile(real)`; si `!== base` y no `force` → `throw Object.assign(new Error(...), { conflict: true })`; por IPC el renderer recibe el mensaje, así que main rechaza con un mensaje que empieza por `CONFLICT:` y el preload lo traduce a `{ conflict: true }` (o el handler devuelve `{ ok: false, conflict: true }` en lugar de lanzar: se elige devolver, que no depende del texto del error). `Buffer.byteLength(text) > 256 KB` → rechazo.
- **Crear:** regex; carpeta `claudeDir()/skills/<name>` o `<repo>/.claude/skills/<name>`; si existe la carpeta o un elemento con ese nombre en ese origen → rechazo; `mkdir` y `writeFile` con `flag: 'wx'`.
- **Pantalla:** `editing: { base, text } | null` en `SkillDetail`; `dirty = text !== base`; `guard(next)` pregunta si `dirty` y si no ejecuta `next`, usado por Escape, «Cerrar», «Descartar», otra tarjeta y el selector de repo (este último vive en `Skills.tsx`: el detalle avisa hacia arriba con `onDirty`).

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

- [ ] Main: `saveSkill` y `createSkill` con sus guardas, IPC y preload · Closes: K19, K20, K21
- [ ] «Editar» en el detalle, guardar, conflicto, cabecera rota y salir con cambios · waits on box 1 · Closes: K22, K23, K24
- [ ] «Nueva skill», textos en inglés, foto y bocetos · waits on box 2 · Closes: K25
