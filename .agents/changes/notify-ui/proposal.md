# notify-ui

Tracker: none
Targets: settings
Durable decisions: none

## The ask, verbatim

> me gusta ya las notificaciones y todo, desarrolla todo lo nuevo de fase 1 núcleo

(Pau, 11 nov. Mitad de la ventana de las notificaciones: la tarjeta «Notificaciones», la tarjeta «Cuándo» y la pantalla Avisos con los tipos nuevos. Espera a `notify-core`, que da los ajustes, los tipos y `notify.*`.)

## Decision log

### Session 2026-11-11
- Q: ¿«Nada» guarda el aviso en Avisos? → A: no; «Nada» no interrumpe ni guarda: la tarjeta dice «silenciado, no te avisa» (assumed).
- Q: ¿«Cerrar su trabajo» cierra sin preguntar? → A: no; abre la confirmación de siempre (W136) para ese trabajo (assumed).
- Q: ¿Dónde se recuerda el plegado de cada grupo? → A: en `ui.json` `folded`, con `ntf-agents`, `ntf-mr` y `ntf-account`, desplegados por defecto (assumed).

### Session 2026-11-12 (revisión en frío)
- Q: ¿Partir el cambio? → A: sí; este es la mitad de la ventana y espera a `notify-core` (assumed).
- Q: ¿S37 y S43 se parten? → A: no; cada una es una tarjeta que se pinta de una vez y un test la recorre entera, con una aserción por cosa prometida. Techo: si una parte cambia sola, se parte entonces (assumed).

### Session 2026-11-14 (construcción)
- Q: ¿Qué botones lleva el aviso de ejemplo en «Así te llega»? → A: solo los que lleva el aviso real del Mac (W177, W186–W188): «Responder» en ask, done e idle; «Reabrir» en stopped; «Arreglar con Claude» en ci; «Cerrar su trabajo» en merged. Los inventados del boceto («Ver el plan», «Más tarde»…) no (assumed).
- Q: ¿Los días marcados de «Todo el día» con el acento? → A: no; en gris (`--text` sobre `--on-text`): el blanco sobre `--run` no llega al contraste en oscuro (assumed).
- Q: ¿Cómo sabe la ventana que un trabajo es del mismo repo que la MR (V15)? → A: una llamada IPC pequeña a main que reutiliza `closable` (el de W187, que mira los remotos); la ventana no tiene los remotos. Amplía el alcance a `src/main/**` y `src/preload/**` solo para esa llamada (assumed).

## Outcomes


- In Ajustes you choose, per type, whether it reaches the Mac, only Avisos or nothing; set a whole group at once; see how each one arrives; set the waiting reminder, focus, grouping and quiet hours; send a test; and learn — with a button to fix it — when macOS blocks Atril.

## Scope boundaries

**In:** `src/renderer/settings/Notifications.tsx` (both cards), `src/renderer/avisos/**` (bug 4, the new kinds), its place in `Ajustes.tsx` (second column, after «Idioma»), styles as tokens; in `src/main/**` and `src/preload/**`, only the one IPC call V15 needs to reuse main's `closable` (Decision log, 2026-11-14). **Out:** sounds, per-repo settings, the summary on return.

## Constraints

- Every text through `useT()` with its English entry; colours only from tokens; keyboard-operable (S-a11y as the rest of Ajustes).
- Each change saves at once through `notify.set(patch)`; there is no «Guardar».

## Prior decisions

- The settings file, the type table and `notify.*` are `notify-core`'s. The fold state of each group lives in `ui.json` `folded` under `ntf-agents`, `ntf-mr`, `ntf-account` (default unfolded) (assumed).

## Task breakdown

- The notifications card; the «Cuándo» card with test and problem.

## Verification criteria

The type table (keys, groups, defaults) is in the avisos spec after `notify-core` lands. The Avisos screen criteria are in `spec-avisos.md`.

- **S31** (amended) Ajustes shall group Conexiones and Repos in a left column and Apariencia, Idioma, Notificaciones and Cuándo in a right one, and `.ajustes` shall show them side by side while the window is at least 1100 px wide and as one column, left first, below that.
  Proof: src/renderer/settings/connections.test.ts settings use two columns when wide

- **S37** Ajustes shall show «Notificaciones» after «Idioma» with the intro «Todo llega a Avisos. Aquí eliges qué más te interrumpe con un aviso del Mac.» and three groups — «Tus agentes» (ask, done, stopped, idle, radar, qa), «Tus MR» (review, comment, ci, cipass, merged, following, opened) and «Tu cuenta» (quota) — each row with its label, its example text from the sketch, the tag «nuevo» on stopped, idle, radar, qa, cipass and quota, and a radio group «Mac · Solo Avisos · Nada» checked at the stored value; a row at «Nada» is dimmed. One test renders the card and asserts each of these.
  Proof: src/renderer/settings/notifications.test.ts the card lists every type at its stored value
- **S38** When the person picks a position in a row (click, or ← → within the group, which moves and selects), Ajustes shall send `notify.set({ types: { [key]: value } })` and show the answered value; reopening Ajustes shows it.
  Proof: src/renderer/settings/notifications.test.ts a choice saves and survives reopening
  Proof: src/renderer/settings/notifications.test.ts arrows move the choice
- **S39** When the person presses «Todo al Mac», «Todo a Avisos» or «Silenciar» in a group header, Ajustes shall set every type of that group to `mac`, `list` or `mute` in one `notify.set` and leave the other groups unchanged.
  Proof: src/renderer/settings/notifications.test.ts a group setter changes only its group
- **S40** Each group header shall read «{n} tipos · {mac} al Mac» plus « · {list} solo en Avisos» when that count is not zero («1 tipo» in the singular), and fold or unfold its rows with `aria-expanded`, remembered in `ui.json` `folded`.
  Proof: src/renderer/settings/notifications.test.ts a group header counts and folds
- **S41** The `idle` row's title shall read «Lleva {m} min esperándote» with − and + buttons that change `idleMinutes` by 5 between 5 and 120 (− disabled at 5, + at 120), saving each change.
  Proof: src/renderer/settings/notifications.test.ts the waiting minutes step by five within bounds
- **S42** When a row is hovered or focused, the preview «Así te llega» shall show that type's example — title and body as in the sketch's `t`/`b` (e.g. «WEB-3535 te pregunta» / «¿Uso la tabla del BOE o la de la API?»), «{m}» filled — and the caption «Así te sale en el Mac: {label}» at `mac`, «{label}: solo en Avisos, sin globo ni sonido» at `list`, «{label}: silenciado, no te avisa» at `mute`, the banner dimmed when not `mac`.
  Proof: src/renderer/settings/notifications.test.ts the preview follows the hovered type
- **S43** The «Cuándo» card shall show three switches saved at once — «Respetar el modo foco» (`focus`), «Agrupar» («Un solo aviso del Mac por cada 2 min.», `group`) and «Horas de silencio» (`quiet.on`) — and, under the last, «de {from} a {to}» time inputs, a 24 h bar of the quiet span and day toggles L M X J V S D («Todo el día») that save `quiet.from`, `quiet.to` and `quiet.days`; while `quiet.on` is off those controls are `aria-disabled` and out of the tab order. One test renders the card and asserts each of these.
  Proof: src/renderer/settings/notifications.test.ts when-settings save and quiet fields follow their switch
- **S44** When the person presses «Probar un aviso», Ajustes shall call `notify.test(previewed type)` and say «Enviado: mira la esquina de tu pantalla.», or «macOS no lo dejará salir: arréglalo arriba.» when it answers `blocked`.
  Proof: src/renderer/settings/notifications.test.ts testing a notice says where it went
- **S45** If `notify.permission()` answers `blocked` when the card mounts or after «Volver a comprobar», then the card shall show, above everything, the problem «macOS no deja a Atril mostrar avisos.» / «Todo sigue llegando a Avisos, pero el Mac no te interrumpe aunque elijas «Mac».» with «Abrir Ajustes del Sistema» (W192) and «Volver a comprobar»; `allowed` and `unknown` show nothing.
  Proof: src/renderer/settings/notifications.test.ts a blocked Mac shows the problem with its fix
- **S46** If saving a change fails, then the card shall show «No he podido guardar tus avisos: el cambio se perderá al cerrar Atril.» with «Volver a intentar», which resends the same patch, and main's reason folded under «Ver detalle».
  Proof: src/renderer/settings/notifications.test.ts a failed save says so and retries

## Approach

### Summary
`src/renderer/settings/Notifications.tsx` pinta las dos tarjetas del boceto (`bocetos/fase1-nucleo.html` 2268–2350) sobre `notify.get/set/test/permission/openSystem`; `Avisos.tsx` gana etiquetas, filtros, `detail`, destinos y «Cerrar su trabajo».

### Technical context
React 19, tests con Testing Library en `src/renderer/**/*.test.ts(x)`; patrón de tarjeta de `Language.tsx`; `Problem.tsx` para errores; `patchUi` para `folded`. Unos 4 archivos nuevos o tocados más `i18n-en.ts` y `styles.css`.

### The approach
Estado local con lo que contesta `notify.set`; cada cambio guarda al momento; el problema de guardado retiene el último parche para «Volver a intentar». La vista previa lee los ejemplos de una tabla en el componente.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| Botón «Guardar» | el resto de Ajustes guarda al momento |

### Risks
| Risk | Mitigation |
|---|---|
| Atajos de flechas chocan con los globales | el radio group para la propagación; test de flechas |

### Validation and rollback
Tests en rojo primero; la tarjeta manejada con Playwright en la app real y foto `bocetos/novedades/notificaciones.png`. Rollback: un revert.

### Complexity deliberately kept
Ninguna.

## Checklist

- [x] Tarjeta «Notificaciones»: grupos, filas, radios, setters, resumen y plegado, paso de minutos, vista previa; columna derecha · Closes: S31, S37, S38, S39, S40, S41, S42
- [x] Tarjeta «Cuándo», «Probar un aviso», el problema de macOS y el de guardado · waits on box 1 · Closes: S43, S44, S45, S46
- [x] Pantalla Avisos: etiquetas y filtros, `detail`, destinos de cada tipo, «Cerrar su trabajo» · Closes: V6, V13, V14, V15
- [ ] Entradas en inglés; S16/S19 en verde; prueba en la app real con Playwright y foto; `bocetos/novedades.html` y `bocetos/fase1-nucleo.html` (tarjeta hecha) · waits on boxes 1–3
