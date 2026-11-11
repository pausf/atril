# panel-c

Tracker: none
Targets: flow-status
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> fijate en t3 code , la barra lateral derecha tambien muestra el codigo que v cambiando el life... hazme propuestas dela barra derecha que sea organica visual t facil interaccion y funcional

> me quedo conla c PERO QUE SE PUEDA HACER EN GRANDE LO DEL CODIGO PARA VER

> VALE ME GUSTA, ACTUALIZA FASE1 NUCLEO Y ACTUALIZA LA APP

## Reading

El panel de Libretto pasa a ser la propuesta C de `bocetos/panel-derecho.html`: pasos con anillo (la 2 de
`bocetos/pasos.html`), el checklist como línea de tiempo donde cada casilla abre el código que la cerró y la casilla
en curso enseña el código en vivo, y «Ampliar» (⌘⇧E) lleva ese código al centro en grande. Subagentes y QA van en
`panel-c-subagents`.

## Decision log

### Session 2026-11-11
- Q: ¿Qué código es de qué casilla? → A: los commits que marcan casillas (`- [ ]` → `- [x]` en el checklist del
  `proposal.md`) cortan la rama en tramos: el código de una casilla cerrada es el diff entre el commit que cerró la
  anterior (o la base) y el suyo; el de la casilla en curso, el diff entre el último commit que cerró una casilla (o
  la base) y el árbol de trabajo, con lo no commiteado. Nunca `.agents/` (assumed).
- Q: ¿Varias casillas en un commit? → A: comparten tramo; cada una enseña el mismo código (assumed).
- Q: ¿Vivo cómo? → A: el mismo sondeo de 3 s que hoy usa «Cambios» (F22) para el tramo en curso (assumed).
- Q: ¿Pasos? → A: seis círculos unidos; hechos con ✓, el actual un anillo que se llena con casillas cerradas/total,
  pendientes con su número; nombre al pasar el ratón; Spec y Plan son botones (F13); debajo «{Etapa} · {c} de {t}
  casillas» (o solo la etapa sin checklist) y los botones «Spec» y «Plan» de F32 (assumed).
- Q: ¿Qué se quita? → A: la fila de etapas de F29, las secciones Checklist y Cambios (F20, F30, F31) y el modal de F21
  como entrada principal: «ver archivos» pasa a ser «Ampliar». El aviso de rama grande (F25) queda como una línea bajo
  los pasos (assumed).
- Q: ¿Cuántas casillas a la vista? → A: todas las cerradas plegadas en su línea (pulsar abre su código), la en curso
  abierta con su código, y de las pendientes las 3 primeras y «+{n} más» (assumed).
- Q: ¿Ampliar? → A: «⤢ Ampliar» encima de cada código y ⌘⇧D (menú Trabajo → Ampliar código) ponen ese código en el
  centro, en lugar del terminal, con sus archivos arriba (como el modal de F21: lista, diff, solo texto) y «Volver al
  terminal ⌘⇧D»; el panel sigue con los pasos. Escape también vuelve (assumed).

### Session 2026-11-11 (revisión en frío y elecciones de Pau)
- Q: ¿Dónde van los pasos? → A: Pau: «me quedo con lo 6 tramos con nombre», encima de «WEB-3535 ◌ trabajando», en el
  centro (la C de `bocetos/pasos-arriba.html`); el panel empieza por las casillas. Sustituye a los círculos con anillo.
- Q: ¿⌘⇧D? → A: ya es «Dividir abajo»; ampliar es ⌘⇧E (Trabajo → Ampliar código), libre (assumed).
- Q: ¿Ampliar en Todos, en foco o fuera de Trabajo? → A: solo en Trabajo con «Uno» y un trabajo elegido; en foco
  también (assumed).
- Q: ¿Qué identifica una casilla entre commits? → A: su texto; el índice es el orden en el checklist actual. Una
  casilla que cambia de texto cuenta como nueva desde ese commit (assumed).
- Q: ¿Casilla marcada sin commit? → A: se ve cerrada y comparte el tramo en curso (lo no commiteado) (assumed).
- Q: ¿Sin commits, sin checklist, `tasks.md` o Aterrizado? → A: sin checklist no hay línea de tiempo (los tramos sí,
  con su etapa); `tasks.md` se lee igual que el proposal (`readChecklist`); en Aterrizado no hay carpeta: no hay línea
  de tiempo (assumed).
- Q: ¿Archivo fuera del tramo? → A: cadena vacía, como `fileDiff` (assumed).
- Q: ¿F21, F22, F26, F31? → A: F21: su modal pasa a ser la vista ampliada (enmendado en F39); F22: el latido de 3 s
  pide la línea de tiempo (enmendado en F38); F26: «Checklist» deja de ser algo que se abre (se queda Spec y Plan); F31:
  sin sección «Cambios», se retira con F20 (assumed).
- Q: ¿El total de F25? → A: la línea de tiempo devuelve también el total de líneas de la rama (como hoy `listChanges`)
  (assumed).
- Q: ¿Terminal al ampliar? → A: se oculta, no se desmonta; al volver, el foco vuelve al terminal; Escape en la vista
  ampliada no llega a xterm (assumed).

## Outcomes

- Mientras el agente construye, el panel enseña en qué paso va, qué casillas cerró con qué código y el código que está
  escribiendo ahora, y ese código se puede ver en grande en el centro.

## Scope boundaries

**In:** pasos como seis tramos con nombre encima del título, línea de tiempo de casillas con su código, el tramo en vivo, «Ampliar» al centro y ⌘⇧E.
**Out:** subagentes como ramas (`panel-c-subagents`); QA como pantalla propia (`qa-screen`); el globo de preguntas (`ask-balloon`); editar código; comentar líneas.
**Never scoped out:** el diff como texto (nunca HTML); rutas literales a git (F24); el corte de 1 MB (F23); teclado y
nombres accesibles; tokens de color.

## Prior decisions

- Tramos por commits que marcan casillas (assumed, 11 nov).
- Ampliar sustituye al terminal en el centro, no abre ventana (assumed, 11 nov).
- Mismo sondeo de 3 s (assumed, 11 nov).

## Verification criteria

- **F36** Main shall split a workspace's commits since its base by the commits that turn checklist boxes of its
  current change (proposal or `tasks.md`, as `readChecklist` finds it) from `[ ]` to `[x]`, returning per box its
  index in the current checklist, text, state (closed, current = the first open box, pending) and, for closed and
  current boxes, the files changed in its range with +/− counts and the closing commit's short id — closed: from the
  previous closing commit (or the base) to its own; current: from the last closing commit (or the base) to the working
  tree, uncommitted changes included — and the branch's total added plus removed lines; a box is matched across
  commits by its text; a box marked but not committed shows closed with the current range; boxes closed in one
  commit share its range; paths under `.agents/` are left out; with no change folder or no checklist it shall return
  no boxes. One test holds a case per clause.
  Proof: src/main/flow/boxes.test.ts each box gets the code that closed it
- **F37** When the window asks the diff of a box's file, main shall answer the diff of that file over that box's
  range as text, with F23's cut and F24's literal paths, and an empty string for a file outside the range.
  Proof: src/main/flow/boxes.test.ts a box's file diff covers only its range
- **F29** (amended) While the selected workspace has a Libretto change, the centre of Trabajo shall show, above the
  workspace's repo and title, six segments named Entrada, Spec, Plan, Construir, Revisar and Aterrizar — done ones
  full, the current one filled closed/total of its checklist with «{closed}/{total}» after its name, pending ones
  empty — where Spec and Plan are buttons as F13 makes them; and while F25's total applies, its warning line at the
  top of the panel. The Libretto panel shall not show the stages.
  Proof: src/renderer/flow/panel.test.ts the steps show as six named segments above the work
- **F38** While the stage is Construir or later and there is a checklist, the panel shall show it as a timeline:
  closed boxes folded, each a button that opens its files and diff; the current box open with its files and the
  diff of its first file; the first 3 pending boxes greyed and «+{n} más» for the rest; the timeline asked again every
  3 seconds while it shows, skipping a tick while one is pending.
  Proof: src/renderer/flow/boxes.test.ts the checklist shows each box with its code
- **F39** When the person presses «⤢ Ampliar» on a box's code, the centre shall show that box's files and the chosen
  file's diff as text in place of the terminal, which stays mounted but hidden, with «Volver al terminal ⌘⇧E»;
  pressing it shall bring the terminal back with its focus.
  Proof: src/renderer/flow/boxes.test.ts the code can be seen large in the centre
- **F40** Trabajo → Ampliar código (⌘⇧E) shall open the current box's code as F39 and, pressed again, close it;
  Escape in the large view shall close it and not reach the terminal; the menu item shall be disabled unless Trabajo
  shows «Uno» with a workspace selected.
  Proof: src/renderer/flow/boxes.test.ts the large code opens and closes from the menu and the keyboard
- **F20** (amended) The Libretto panel shall show no «Cambios» section, no list of the branch's files and no «ver N
  archivos» button.
  Proof: src/renderer/flow/changes.test.ts changes show from construir on
- **F30** (amended) The panel's foldable sections (Subagentes) shall keep their folded state per section when the
  panel is mounted again and start open.
  Proof: src/renderer/flow/panel.test.ts the panel sections fold and remember

## Approach

### Summary
Un módulo `src/main/flow/boxes.ts` (tramos por casilla y su diff) con IPC `atril:flow:boxes` y
`atril:flow:boxdiff`; en el renderer, `Steps.tsx` (pasos) (seis tramos, en el centro encima del título, en `Workspace.tsx`) y `Boxes.tsx` (línea de tiempo) sustituyen la fila de etapas, Checklist y Cambios de `FlowPanel.tsx`; App muestra `BigCode` en el centro cuando está ampliado, con el terminal oculto, no desmontado.

### Technical context
Electron 45, React 19, vitest; git por `Runner`. `src/main/flow/changes.ts` (`listChanges`, `fileDiff`, F23/F24)
y `checklist.ts` (`parseBoxes`) se reutilizan. Para hallar commits que cierran casillas:
`git log --format=%H --reverse <base>..HEAD -- <proposal>` y, por commit, comparar `parseBoxes` del proposal antes y
después (`git show <sha>:<path>`). Diff por tramo: `git diff --numstat <from> <to> -- . ':(exclude).agents'` (para
el árbol de trabajo, sin `<to>`). Menú en `src/main/menu.ts` (junto a Modo foco, ⌘⇧E libre; ⌘⇧D sigue siendo «Dividir abajo»). Boceto en
`bocetos/fase1-nucleo.html` (hecho aparte); foto `ATRIL_SNAPSHOT_VIEW` con trabajo de prueba.

### The approach
- `boxRanges(path, base, change, run)` → `Box[]`; `boxDiff(path, base, change, index, file, run)`.
- El renderer pide `boxes` con el mismo latido de 3 s que F22 mientras la etapa es Construir o posterior.
- `BigCode` reutiliza la vista de diff del modal de F21 (lista + diff de texto).

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| un tramo por commit (como T3 Code por turno) | no dice qué casilla cierra cada código: lo que Libretto aporta |
| leer qué archivos toca cada casilla del texto del plan | el plan no lo dice siempre; los commits sí |
| ventana aparte para el código grande | otra ventana que gestionar; el centro ya está ahí |

### Risks
| Risk | Mitigation |
|---|---|
| ramas con muchos commits: leer el proposal en cada uno | solo commits que tocan el proposal (`-- <proposal>`) |
| el agente cierra casillas sin commit | el tramo en curso incluye lo no commiteado; la casilla sale cerrada sin código propio y comparte el tramo siguiente |
| xterm se desmonta al ampliar | el terminal se oculta (no se desmonta) mientras está ampliado |

### Validation and rollback
Gates; la app real con Playwright sobre un repo de prueba con 3 commits que cierran casillas y cambios sin commitear
(abrir una casilla cerrada, ver el código en vivo cambiar al escribir un archivo, Ampliar y volver). Un revert.

### Complexity deliberately kept
El corte por commits que marcan casillas: es lo que une código y Libretto.

## Checklist

- [ ] box ranges and box diffs in main with their IPC · Closes: F36, F37
- [ ] the six named steps above the work, the boxes timeline and the removals in the panel · waits on box 1 · Closes: F29, F38, F20, F30
- [ ] Ampliar to the centre, ⌘⇧E and its menu item; real-app drive; photo; novedades · waits on box 2 · Closes: F39, F40
