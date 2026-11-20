# mr-page-wide

Tracker: none
Targets: mr
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> «creo que tenemos que hacer modificación en la pantalla de MR se ve un poco raro por las columnas y que estrecho» (Pau, 19 nov 2026, viendo la captura a 1440 px)
> «enséñame con captura full pantalla, porque la captura las columnas se ven muy estrechas»

## Decision log

### Session 2026-11-19
- Q: ¿Cuál de las tres del boceto `bocetos/mr-anchura.html`? → A: la A: al abrir una MR la bandeja se esconde y la página ocupa todo el ancho; tarjetas a 300 px (assumed: Pau dijo «lo miramos luego, sigue»; GitHub y GitLab hacen esto; leer código pide ancho).
- Q: ¿Cómo se pasa de una MR a otra sin la bandeja? → A: J y K, sin modificadores, pasan a la siguiente o la anterior en el orden de la bandeja (Mías, Me toca revisar, Sigo), con «{i} de {n} · J/K» junto a «‹ Tus MR» (assumed).
- Q: (spec-reviewer) ¿Y ↑/↓? → A: se quedan para desplazar el código, que es para lo que se ensancha la página; solo J/K cambian de MR (assumed).
- Q: ¿Cuándo no cambian J/K? → A: con el foco en un campo de texto, con un menú (`role=menu`) o un diálogo (`aria-modal`) abiertos, con ⌘/Ctrl/⌥/Mayús pulsada o con la tecla mantenida (`repeat`) (assumed).
- Q: (spec-reviewer) ¿Una MR en dos listas? → A: cuenta una vez, en la primera lista donde sale; «{n}» son MRs distintas (assumed).
- Q: (spec-reviewer) ¿Y si la MR abierta ya no está en la lista? → A: no se enseña «{i} de {n}» y J/K no hacen nada (assumed).
- Q: ¿Al volver a la bandeja? → A: la fila de la MR que estaba abierta queda marcada `aria-current` y con el foco, hasta que se abre otra MR; tras «Fusionar» igual si la MR sigue en la lista (assumed). Es estado (`useState`), no un `ref`, porque tiene que pintar.
- Q: ¿El texto que se sale («De un commit anterior · Puntuar de nuevo»)? → A: es la celda de puntuación de la bandeja (`ScoreCell`, `.mr-inbox .mr-score` y `.mr-line`), visible sin MR abierta; se arregla en este cambio partiendo línea dentro de su fila; se comprueba con la foto (assumed: es CSS, jsdom no mide).
- Q: (spec-reviewer) ¿El `@media (max-width: 1100px)`? → A: pasa a `minmax(0,1fr) 240px` (assumed).

## Outcomes

Con una MR abierta, el código se lee a lo ancho: la bandeja no ocupa sitio, las tarjetas tienen 300 px (240 bajo 1100 px) y se pasa de una MR a la siguiente con J/K sin volver. En la bandeja, nada se monta encima de otra fila.

## Scope

**In:** `src/renderer/mr/MrScreen.tsx`, `src/renderer/mr/MrPage.tsx`, `src/renderer/styles.css` (`.mr-layout`, `.mr-score`), `src/renderer/mr/page.test.ts`, `src/preload/i18n-en.ts`, `bocetos/mr-anchura.html` (el boceto), `bocetos/novedades.html`, `bocetos/fase1-nucleo.html`, la foto.
**Out (nombrado):** plegar la bandeja a mano (la C del boceto); mover las tarjetas encima del código (la B); recordar la MR abierta entre sesiones; reordenar o rediseñar la bandeja (solo se arregla la línea que se sale); ↑/↓ para cambiar de MR.

## Constraints

- M43 sigue: Escape cierra solo la capa de arriba; salir con respuesta sin enviar pregunta antes.
- Textos por `t()` con entrada inglesa; colores por tokens.

## Prior decisions

- (2026-11-19, mr-page-wide) Con una MR abierta la bandeja se esconde y la página ocupa el ancho; se cambia de MR con ↑/↓ o K/J. Las variantes «bandeja estrecha con tarjetas arriba» y «bandeja plegable» perdieron (boceto `bocetos/mr-anchura.html`).

## Task breakdown

- Página a lo ancho, sin bandeja, con «{i} de {n}».
- J/K para cambiar de MR.
- Volver con la fila marcada; el texto de la puntuación que no se sale; foto y bocetos.

## Verification criteria

- **M43** (amended) When the person activates an inbox row, the MR screen shall show, with no modal and without the inbox, the page across the screen — «‹ Tus MR» followed, while the MR is in the latest listing, by «{i} de {n} · J/K» ({n} the distinct MRs of Mías, Me toca revisar and Sigo, an MR in two lists counted once at its first; {i} the open one's place in that order), the line «{forge} · {project} · Tuya | De {author} · {branch} → {target}», the title and the header (M44) — and the side column on the right with the cards Puntuación, Contra su spec, Revisores and CI in that order (M48). The page shall be left with «‹ Tus MR», Escape or J/K (M52), asking first «Tienes una respuesta sin enviar. ¿Salir y descartarla?» when a reply box holds text. Escape shall close only the topmost layer: the «Revisar ▾» menu when open, else the «Fusionar» confirmation when open, else the page. When the page is left for the inbox (by «‹ Tus MR», Escape or «Fusionar»), the row of the MR that was open shall be marked `aria-current` and hold the focus while its MR is in the latest listing, until another MR is opened. An Avisos notice for an MR (its `openUrl`) shall open its page as V6 says. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts a row opens the mr page across the screen
- **M52** While an MR page is open and its MR is in the latest listing, when the person presses J (or K) with no modifier and not held down, and the focus is not in a text field, and no menu (`role=menu`) or dialog (`aria-modal`) is open, the screen shall open the next (or previous) MR in M43's order, with M43's question for an unsent reply; at the last (or first) MR, and in every excluded case, the key shall do nothing; ↑/↓ shall keep scrolling the page. One test holds every clause.
  Proof: src/renderer/mr/page.test.ts j and k move between mrs

## Approach

### Summary
`MrScreen` deja de pintar `.mr-inbox` cuando hay una MR abierta y pasa a `MrPage` su posición; un `keydown` en el mismo efecto que ya escucha Escape mueve entre MRs; CSS a dos columnas.

### Technical context
React 19, Testing Library, vitest con jsdom. Radio: `MrScreen.tsx`, `MrPage.tsx`, `styles.css`, `page.test.ts` y los textos. El test de M43 actual (`a row opens the mr page beside the inbox`) se reescribe con el nombre nuevo: hoy afirma que la bandeja está; con el cambio afirma que no. Los demás tests de `page.test.ts` que afirman `aria-current` con la página abierta o pulsan otra fila para cambiar de MR (líneas ~61–74, 97–98, 131) pasan a volver con «‹ Tus MR» y abrir la otra, o a usar J; sus `expect` sobre la página no cambian.

### The approach
- `rows` = las URL de Mías, Me toca revisar y Sigo, sin repetir (la primera gana); `i = rows.indexOf(opened)`; con `i >= 0`, `MrPage` recibe `pos={{ i: i + 1, n: rows.length }}` y pinta `t('{i} de {n} · J/K')` tras «‹ Tus MR»; con `i < 0`, nada.
- El mismo `useEffect` que atiende Escape en `MrScreen` atiende `j`/`k`: sale si `e.defaultPrevented`, `e.repeat`, `e.metaKey || e.ctrlKey || e.altKey || e.shiftKey`, si hay `[aria-modal="true"]` o `[role="menu"]` en el documento, si `document.activeElement` es `input`, `textarea`, `select` o `isContentEditable`, o si `i < 0`; si no y existe `rows[i±1]`, `preventDefault()` y `go(rows[i±1])`. `go` ya hace la pregunta de M43. No se toca `escape.current` (cierra al llamarlo). ↑/↓ no se escuchan.
- `const [last, setLast] = useState<string | null>(null)`: al volver (`go(null)` y la salida de `onMerged`) `setLast(opened)`; al abrir otra, `setLast(null)`. La fila marca `aria-current` si `opened === url || (!opened && last === url)`; un `useEffect` sobre `[opened, last]` enfoca esa fila cuando la bandeja se pinta.
- CSS: `.mr-layout { grid-template-columns: minmax(0,1fr) 300px }` y en `@media (max-width: 1100px)` `minmax(0,1fr) 240px`; `.mr-line` y `.mr-score` (también bajo `.mr-inbox`) con `flex-wrap: wrap` y `min-width: 0` para que «De un commit anterior · Puntuar de nuevo» parta dentro de su fila.
- Textos nuevos con entrada inglesa: «{i} de {n} · J/K».

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| B: bandeja estrecha y tarjetas en franja sobre el código | quita alto al código, que es lo que más se lee |
| C: bandeja plegable con ⌘\ | por defecto sigue estrecha; un ajuste más que recordar |

### Risks
| Risk | Mitigation |
|---|---|
| J cambia de MR mientras escribes una respuesta | M52 excluye campos de texto; el test de M52 escribe en la caja y pulsa J |
| J con «Revisar ▾» abierto cambia de MR | M52 excluye `role=menu`; el mismo test abre el menú y pulsa J |

### Validation and rollback
`page.test.ts`: M43 reescrito y M52 nuevo. Forzar rojo M52 quitando la guarda de campos de texto. La foto a 1440 px comprueba el ancho y la línea de la puntuación. Rollback: un revert.

### Complexity deliberately kept
Ninguna.

## Checklist

- [x] La página a lo ancho sin bandeja, con «{i} de {n} · J/K», la fila marcada y con foco al volver, y los tests de `page.test.ts` que cambiaban de fila adaptados · Closes: M43
- [x] J/K entre MRs, con sus guardas · waits on box 1 · Closes: M52
- [x] CSS (300/240 px, la línea de puntuación que parte), textos en inglés, foto a 1440 px mirada, boceto `bocetos/mr-anchura.html` y novedades · waits on boxes 1–2 · Closes: M43
