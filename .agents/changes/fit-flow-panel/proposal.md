# fit-flow-panel

Tracker: none
Targets: flow-status
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> la barra de la derecha donde el flujo , cambios est con scroll, hay alguna manera de hacer que sea mas visible tda esa barra sin scroll

## Reading

El panel de Libretto (etapas, checklist, Cambios, Subagentes) no cabe y obliga a hacer scroll. Que
quepa a la vista: más compacto, secciones plegables o repartir el alto, sin perder nada.

## Diseño acordado (Pau, 10 nov: «si»)

1. Etapas en una sola fila: seis iconos unidos, la actual resaltada con su nombre debajo; las ya
   alcanzadas siguen abriendo Spec/Plan/Construir; nombre accesible en cada icono.
2. Checklist, Cambios, Otros cambios y Subagentes como `FoldSection` con su cuenta en la cabecera;
   «Otros cambios» plegado por defecto; el estado se recuerda.
3. Cambios con tope de 8 archivos y «+N más» que abre el modal del diff.

Descartado: Subagentes como pestaña (deja de verse de un vistazo). Orden: justo después de
add-doctor-install-terminal, antes de expand-tour (assumed: el «si» respondía a la propuesta).

## Pau, 10 nov, más tarde

- Cinco diseños alternativos en `bocetos/fase2-nucleo.html`; recomendado el 3 (Zen) con Archivos y
  «También» plegables.
- Pau: «vamos a probar el 3 en fase 2 … con el diseño 3 y con el diseño 1» → `bocetos/fase2-app.html`,
  la app entera con selector Zen / Partitura.
- Q: ¿Los dos en la app real con un ajuste? → A: «probar en el boceto». Se construye solo el elegido,
  con datos y presentación separados; la segunda vista y su ajuste, solo si se echa de menos.

## Decision log

### Session 2026-11-10
- Q: ¿Qué diseño? → A: «nada queda con el 0 · Acordado es el que me gusta … implementa con ese».
- Q: ¿La frase «Dónde va cada trabajo, leído de sus archivos.»? → A: se va: el panel lo dice por sí
  mismo y son dos líneas (assumed).
- Q: ¿Cuenta de cada sección plegada? → A: Checklist «3/7», Cambios y Otros cambios su número,
  Subagentes su número de entradas (assumed).
- Q: ¿Qué abre «+N más»? → A: el modal del diff en el noveno archivo, con todos en su lista (assumed).
- Q: (fase 5) ¿Cómo? → A: reutilizar `FoldSection` (ya recuerda su estado) y CSS para la fila de
  etapas; sin componentes nuevos salvo los que salgan solos (assumed). Perdió: un componente de
  «stepper» genérico (una sola vista lo usa).

## Outcomes

- Las seis etapas ocupan una sola fila: iconos unidos por una línea; la actual lleva su nombre debajo;
  las demás lo dicen al pasar el ratón y a un lector de pantalla. Spec, Plan y Construir siguen
  abriendo lo suyo como hoy (F13, F20).
- Checklist, Cambios, Otros cambios y Subagentes se pliegan pulsando su título, con su cuenta a la
  vista; Atril recuerda cómo los dejaste; Otros cambios empieza plegado.
- Cambios enseña como mucho 8 archivos; con más, «+N más» abre el diff del noveno.
- Un trabajo normal (3/7, 12 archivos, 3 subagentes) cabe en el panel sin scroll en una ventana de
  1080 px de alto.

## Scope boundaries

**In:** la fila de etapas, las cuatro secciones plegables, el tope de Cambios, quitar la frase de cabecera.

**Out:** los diseños Zen, Partitura, Río, Programa y Esfera (quedan en `bocetos/fase2-nucleo.html`); un
ajuste para elegir diseño; la pestaña Actividad; el modal del subagente.

**Never scoped out:** cada etapa conserva su nombre y su estado como texto accesible (W22); las secciones
se pliegan con teclado; nada que hoy se pueda abrir deja de poderse abrir.

## Constraints

- `FoldSection` y `useFolded` existentes; ids de sección estables para recordar el estado.
- Textos por `t()` con su inglés; colores solo como tokens.
- `a11y.test.ts` ya exige que cada `.stg` lleve hecho/ahora/pendiente como texto.

## Prior decisions

- Diseño 0 elegido por Pau entre seis en `bocetos/fase2-nucleo.html` (10 nov).
- Una sola vista, sin ajuste para cambiarla: Pau, «probar en el boceto», y luego eligió el 0 (10 nov).
- 8 archivos como tope de Cambios (assumed, 10 nov): con más, el diff modal ya lista todos.

## Task breakdown

- Fila de etapas en `LibrettoFlow` y su CSS.
- Checklist, Cambios y Otros cambios como `FoldSection`; Subagentes también.
- Tope de 8 en Cambios con «+N más».
- Boceto `fase1-nucleo.html` con el panel nuevo; foto.

## Verification criteria

- **F29** The Libretto panel shall show its six stages in one row, each with its icon and, as its text,
  its name and its state («hecho», «ahora» or «pendiente»), where only the current stage's name is
  visible and the others' text is visually hidden; the stages F13 and F20 make buttons stay buttons
  with the same actions.
  Proof: src/renderer/flow/panel.test.ts stages sit in one row and keep their names
- **F30** Checklist, Cambios, Otros cambios and Subagentes shall each be a section whose title is a
  button with `aria-expanded` that folds and unfolds it, showing its count while folded — Checklist
  «{closed}/{total}», Cambios and Otros cambios their number, Subagentes its number of entries —
  remembered across restarts per section; Otros cambios shall start folded.
  Proof: src/renderer/flow/panel.test.ts the panel sections fold and remember
- **F31** While the change list holds more than 8 files, «Cambios» shall list the first 8 in list order
  and a «+{n} más» button that opens F21's modal on the ninth file.
  Proof: src/renderer/flow/changes.test.ts cambios shows eight and opens the rest

## Approach

### Summary

Solo renderer. En `LibrettoFlow`, `.stages` pasa a fila: cada etapa es un icono con su texto entero en un
`span` visualmente oculto, salvo la actual, que lo lleva visible. Las secciones se envuelven en
`FoldSection` y Cambios corta a 8 con un botón al final.

### Technical context

React 19 con vitest. Toca:
- `src/renderer/flow/FlowPanel.tsx` y `src/renderer/flow/Subagents.tsx` (su `section` pasa a `FoldSection`).
- `src/renderer/styles.css` y `src/preload/i18n-en.ts`.
- Tests: uno nuevo, `src/renderer/flow/panel.test.ts`, y `changes.test.ts`.
- `bocetos/fase1-nucleo.html`.

`subagents.test.ts` busca la lista por nombre «Subagentes», así que el nombre tiene que seguir.

### The approach

- **Fila de etapas.** `.stages` usa `display:flex`, con una línea por `::before` entre pasos.
  - Cada `.stg` lleva el icono y `<span className="stg-t">` con nombre y estado.
  - `.stg-t` está visualmente oculto (patrón sr-only), salvo `.stg.c .stg-t`, que se ve bajo el icono.
  - `title` repite el texto para el ratón.
- **Secciones.** `FoldSection` con ids `flow-checklist`, `flow-changes`, `flow-others` (este con
  `defaultFolded`) y `flow-subagents`.
- **Cambios.** `changes.slice(0, 8)` y, si sobran, un botón «+{n} más» que llama a `onDiff(changes[8].path)`.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Diseños 1–5 de `fase2-nucleo.html` | Pau eligió el 0. |
| Un componente `Stepper` aparte | Lo usaría una sola vista; es CSS sobre lo que ya hay. |
| Scroll interno solo en Cambios | Sigue escondiendo cosas; el tope con «+N más» lo dice. |

### Risks

| Risk | Mitigation |
|---|---|
| Al ocultar el texto se pierde el estado para lectores de pantalla | Patrón sr-only, no `display:none`. `a11y.test.ts` y F29 lo prueban. |
| `FoldSection` cambia el título de la sección de Subagentes | F27 y F28 siguen pasando sus tests. El nombre de la lista no cambia. |
| No cabe en la realidad | Foto con el trabajo más cargado a 1080 px, mirada antes de la revisión. |

### Validation and rollback

Tests nuevos, vistos en rojo primero:
- `panel.test.ts`: «stages sit in one row and keep their names» y «the panel sections fold and remember».
- `changes.test.ts`: «cambios shows eight and opens the rest».

El de F29 podría pasar por la razón equivocada si el texto estuviera en el DOM pero visible para todas.
Por eso comprueba la clase de ocultación en las no actuales.

Que quepa en altura no lo puede probar jsdom: se mira en la foto. Rollback: un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [ ] the stages in one row with their names kept as text · Closes: F29
- [ ] the four sections fold with counts, remembered; Cambios capped at 8 with «+N más»; sketch and photo · waits on box 1 · Closes: F30, F31
