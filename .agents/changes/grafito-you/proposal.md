# grafito-you

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> Abre un agente nuevo. Y que ese agente nuevo compruebe la app y mire y vaya apuntando fallos, cosas de diseño que ve mal, etcétera, etcétera, y tú lo vas solventando.

Hallazgo 28 de `bocetos/hallazgos.md`: en Grafito «te necesita» se pinta del mismo azul que «trabajando»; con 3–4 filas no se ve cuál te necesita.

## Decision log

### Session 2026-11-11
- Q: ¿Qué color cambia? → A: «trabajando» pasa al gris de los textos secundarios (`--sub`) y el único acento azul queda para «te necesita»: gris más un acento, como pidió Pau (assumed).

## Outcomes

- En Grafito, la fila que te necesita es la única en azul.

## Scope boundaries

**In:** `--run` y `--run-text` de Grafito en `src/renderer/styles.css`. **Out:** la paleta Original.

## Constraints

- W72 sigue: el gris es neutro; contraste de texto ≥ 4,5:1.

## Prior decisions

- En Grafito el acento es para lo que pide a la persona; lo que solo trabaja va en gris.

## Verification criteria

- **W165** Where the palette is Grafito, in both themes, `--run` and `--run-text` shall be neutrals (OKLCH chroma below 0.03) and `--you` and `--you-text` the accent, so working and needs-you never share a colour.
  Proof: src/renderer/theme.test.ts grafito tells needs-you from working

## Approach

### Summary

Cuatro valores en `styles.css` y un test que los lee.

### Technical context

`theme.test.ts` ya lee los tokens de `styles.css` y calcula OKLCH y contraste.

### The approach

`--run: var(--sub)` no vale porque el test lee valores; se copian los de `--sub` de cada tema.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Un ámbar para «te necesita» en Grafito | segundo acento; W72 lo prohíbe y Pau quiere uno |

### Risks

| Risk | Mitigation |
|---|---|
| «trabajando» se ve apagado | el giro del icono sigue diciendo que trabaja |

### Validation and rollback

Test rojo primero; foto de la barra lateral en Grafito. Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] los dos colores de Grafito y su test · Closes: W165
