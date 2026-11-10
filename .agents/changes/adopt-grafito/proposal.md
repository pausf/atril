# adopt-grafito

Tracker: none
Targets: workspaces
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> me gusta el grafito , ponlo en fase 1
> ponlo como tema mas el original que ya tenemos

## Reading

Grafito (variante 1 de `bocetos/fase2-app.html`: grises fríos en OKLCH y un único acento azul apagado)
entra en la app como **segunda paleta**, junto a la original; la persona elige en Ajustes → Apariencia.
El boceto `bocetos/fase1-nucleo.html` gana el mismo selector.

## Decision log

### Session 2026-11-10
- Q: ¿Sustituye a la original? → A: «ponlo como tema mas el original que ya tenemos».
- Q: ¿Cómo se combina con Claro/Oscuro/Automático? → A: son dos elecciones independientes: Paleta
  (Original · Grafito) y Tema (Claro · Oscuro · Automático); Grafito tiene claro y oscuro (assumed).
- Q: ¿Por defecto? → A: Original, para no cambiarle la app a nadie sin pedirlo (assumed).
- Q: ¿Solo color, o también tipografía, densidad y radios? → A: solo la paleta; lo demás, aparte si
  Pau lo pide (assumed).
- Q: ¿«te necesita» en Grafito? → A: en el acento, como en el boceto (assumed).
- Q: ¿El editor (`--ed-*`) y Jira? → A: se quedan igual en las dos paletas (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - W35 se enmienda: los colores solo viven en los cuatro bloques de tokens (dos de Original y dos de
    Grafito), y los de Grafito sobrescriben claves que ya existen. El test no se debilita.
  - El acento también tiene tope de croma, 0,13.
  - Un token `rgba()` se clasifica por su color.
  - «Al momento» significa en el mismo clic, sin esperar a main.
  - Un valor desconocido lo normaliza main al leer `ui.json`.
  - El boceto y la foto no tienen criterio: son dibujo y evidencia.
  - «Paleta», «Original» y «Grafito» pasan por `t()`.

## Outcomes

- Ajustes → Apariencia tiene «Paleta: Original · Grafito» encima de «Claro · Oscuro · Automático».
- Con Grafito, fondos, superficies, líneas y textos son la escala de grises fría de Grafito y el único
  color de acción es su azul apagado (también «te necesita», foco, en marcha y modos); añadido y quitado
  usan su verde y su rojo apagados. Con Original, nada cambia.
- La elección se guarda y se aplica al abrir, como el tema.
- El boceto `fase1-nucleo.html` ofrece la misma elección.

## Scope boundaries

**In:** el campo `palette` en el estado de la interfaz, el selector en Apariencia, los tokens de Grafito
en claro y oscuro, el boceto.
**Out:** tipografía, espaciado, radios e iconos de Grafito; las variantes Salvia, Arcilla y Ciruela;
cambiar la paleta original.
**Never scoped out:** contraste de texto ≥ 4,5:1 en las dos paletas y los dos temas; el selector con
teclado y estado legible (`aria-pressed`).

## Constraints

- Tokens sobrescritos bajo `[data-palette='grafito']` y `[data-palette='grafito'][data-theme='dark']`,
  con los mismos nombres; `--ed-*` y `--jira*` no se tocan.
- El estado vive donde vive `theme` (`src/main/ui.ts`, `UiState`), con su validación.

## Prior decisions

- Grafito elegido por Pau entre cuatro variantes minimalistas, como paleta adicional (10 nov).
- Original por defecto (assumed, 10 nov).

## Task breakdown

- `UiState.palette` con validación y valor por defecto; `data-palette` en `<html>`.
- Selector en Apariencia.
- Tokens Grafito y su test de un solo acento y contraste.
- Boceto con el selector; foto en Grafito.

## Verification criteria

- **W72** Where the palette is Grafito, every colour token in both themes other than `--ed-*`,
  `--jira`, `--jira-2` and `--on-jira` shall be a neutral (OKLCH chroma below 0.03), the accent hue
  (255 ± 15), or the muted added/removed green (150 ± 20) and red (25 ± 20), each of those three with
  chroma at most 0.13 (an `rgba()` token judged by its colour); and every text pair `theme.test.ts`
  checks shall keep at least 4.5:1 in the Grafito palette in both themes. One test holds both.
  Proof: src/renderer/theme.test.ts the grafito palette has one accent and keeps contrast
- **W73** Ajustes → Apariencia shall offer «Original» and «Grafito» as a pressed-state group named
  «Paleta»; choosing one shall set `data-palette` on the document (`original` or `grafito`) in the same
  click and keep it across restarts; main shall read an unknown stored value as Original, the default.
  One test holds a case per clause.
  Proof: src/renderer/theme.test.ts the palette is chosen in appearance and remembered

- **W35** (amended) Atril shall offer three themes in Ajustes — Claro, Oscuro and Automático (default,
  follows macOS); the choice persists across restarts, Automático switches live when the system
  appearance changes, and every theme keeps text contrast at 4.5:1 or more; colours shall live only in
  the token blocks — `:root`, `[data-theme='dark']` and their two `[data-palette='grafito']` overrides,
  whose keys all exist in the base blocks.
  Proof: src/renderer/theme.test.ts theme follows the choice and the system

## Approach

### Summary

Una segunda capa de tokens con atributo propio, `data-palette`, que se combina con `data-theme`. El
estado sigue el mismo camino que `theme`.

### The approach

- **`src/main/ui.ts`**: `PALETTES = ['original','grafito']`, `DEFAULT_UI.palette = 'original'`, validado
  como `theme`.
- **`ui.tsx`**: `setPalette`, y un efecto que pone `document.documentElement.dataset.palette`.
- **`Appearance.tsx`**: un segundo `.seg` «Paleta» encima del de «Tema».
- **`styles.css`**: dos bloques, `[data-palette='grafito']` y `[data-palette='grafito'][data-theme='dark']`,
  con los hex de la variante 1 de `fase2-app.html`. El acento va a `--run*`, `--ring`, `--mode-*`,
  `--you*` y `--hot`; el verde y el rojo apagados, a `--ok*`, `--bad*` y `--chg-add`/`--chg-del`;
  `--chg-mod` pasa a neutro.
- **Test**: hex → OKLCH en unas 20 líneas, sin dependencias.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Sustituir la paleta original | Pau la quiere como tema adicional. |
| Una sola lista de cinco temas (Claro, Oscuro, Auto, Grafito claro, Grafito oscuro) | Mezcla dos ejes; Automático dejaría de valer para Grafito. |

### Risks

| Risk | Mitigation |
|---|---|
| Un estado pierde su señal en Grafito | Cada estado lleva texto (W22). Se mira la foto de Trabajo en Grafito. |
| Un token olvidado se queda saturado | W72 recorre todos los tokens del bloque Grafito. |

### Validation and rollback

Los dos tests se ven en rojo antes: W72 sin bloque Grafito y W73 sin el selector.
Rollback: un revert. Un `palette` guardado que no exista se lee como Original.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] palette state, the selector and the Grafito tokens with their tests · Closes: W35, W72, W73
- [x] the fase1 sketch with the same palette choice; photo of Trabajo in Grafito (drawing and evidence, no criterion) · waits on box 1
