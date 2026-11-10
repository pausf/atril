# adopt-grafito

Tracker: none
Targets: workspaces
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> me gusta el grafito , ponlo en fase 1

## Reading

La app real (y su boceto `bocetos/fase1-nucleo.html`) pasa a la paleta «1 · Grafito» de
`bocetos/fase2-app.html`: grises fríos en OKLCH y un único acento azul apagado.

## Decision log

### Session 2026-11-10
- Q: ¿«fase 1» es el boceto o la app? → A: los dos: el boceto es el espejo de la app (assumed).
- Q: ¿Solo color, o también tipografía, densidad y radios? → A: solo la paleta en este cambio; la
  tipografía y el espaciado de Grafito, en otro si Pau lo pide (assumed).
- Q: ¿«te necesita» sigue en naranja? → A: no: en Grafito todo lo que llama la atención usa el acento
  (assumed).
- Q: ¿El editor de documentos y su resaltado (`--ed-*`) y la marca de Jira? → A: se quedan: el editor es
  oscuro en los dos temas y Jira es una marca (assumed).

## Outcomes

- Fondos, superficies, líneas y textos de la app son la escala de grises fría de Grafito; el único
  color de acción es su azul apagado, también para «te necesita», el foco, el estado en marcha y los modos.
- Añadido y quitado usan el verde y el rojo apagados de Grafito.
- El boceto `bocetos/fase1-nucleo.html` lleva la misma paleta.

## Scope boundaries

**In:** los tokens de `:root` y `[data-theme='dark']` de `src/renderer/styles.css` (salvo `--ed-*`, `--jira*`,
`--on-jira`), y los del boceto.
**Out:** tipografía, espaciado, radios e iconos de Grafito; el editor de documentos; colores fuera de tokens.
**Never scoped out:** el contraste de texto ≥ 4,5:1 en los dos temas (la prueba existente de `theme.test.ts`).

## Constraints

Colores solo como tokens; los valores, los de la variante 1 de `bocetos/fase2-app.html` pasados a hex.

## Prior decisions

- Paleta Grafito elegida por Pau entre cuatro variantes minimalistas (10 nov).
- Un único acento: lo que te necesita, lo pulsable, el foco y lo actual (10 nov, memoria de diseño).

## Task breakdown

- Tokens claros y oscuros a Grafito; el boceto igual.
- Test de que la paleta es de un solo acento.

## Verification criteria

- **W72** The app's colour tokens in both themes, other than `--ed-*`, `--jira`, `--jira-2` and
  `--on-jira`, shall each be a neutral (OKLCH chroma below 0.03), the Grafito accent hue (255 ± 15), or
  the muted added/removed green (150 ± 20) and red (25 ± 20) with chroma at most 0.13; and every text
  pair `theme.test.ts` already checks shall keep at least 4.5:1.
  Proof: src/renderer/theme.test.ts the palette is grafito with one accent

## Approach

### Summary

Cambiar valores, no nombres. Cada token sigue igual y toma su equivalente de Grafito.

### The approach

- `--run`, `--run-text`, `--ring`, `--mode-*`, `--you`, `--you-text` y `--hot` toman el acento y sus tintes.
- `--bad*`, `--ok*` y `--chg-*` toman el rojo y el verde apagados. `--chg-mod` pasa a neutro oscuro.
- Fondos y líneas toman la escala gris de Grafito.
- El test pasa cada hex a OKLCH (unas 20 líneas, sin dependencias) y comprueba croma y tono.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Renombrar los tokens a los de `fase2-app.html` | Toca cada regla CSS de la app para el mismo resultado. |
| Cambiar también tipografía y espaciado | Mucho más grande; se hace aparte si Pau lo pide. |

### Risks

| Risk | Mitigation |
|---|---|
| Un estado pierde su señal al ir todo al acento | Cada estado lleva texto (W22). La foto de Trabajo con los tres estados se mira antes de la revisión. |
| Contraste | La prueba de pares de `theme.test.ts` sigue igual. |

### Validation and rollback

El test nuevo se ve en rojo con los tokens de hoy (naranja `--you` y verde `--chg-add` saturados).
Rollback: un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [ ] tokens in both themes to Grafito with the palette test, and the fase1 sketch's tokens; photo of Trabajo · Closes: W72
