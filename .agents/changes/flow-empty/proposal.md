# flow-empty

Tracker: none
Targets: flow-status
Durable decisions: none

## The ask, verbatim

> Sigue automejorándote y todo eso.

Hallazgo 13 de `bocetos/hallazgos.md`: al elegir un trabajo que te necesita, en Spec, el panel «Flujo de Libretto» sale en blanco: ni texto que diga qué pasa ni por qué no hay casillas.

## Decision log

### Session 2026-11-11
- Q: (al construir) `null` del flujo es también una respuesta (trabajo de revisión) → A: `useFlow` da `undefined` mientras espera; solo eso enseña «Leyendo…» (assumed).
- Q: ¿Qué dice el panel sin casillas? → A: en qué paso está y cuándo salen las casillas; sin botón, porque no hay nada que arreglar (assumed).

## Outcomes

- El panel nunca está en blanco: o dice que está leyendo, o enseña las casillas, o dice por qué aún no hay.

## Scope boundaries

**In:** `src/renderer/flow/FlowPanel.tsx`, i18n. **Out:** abrir la spec desde aquí (ya lo hacen los botones de documento).

## Constraints

- Textos por `t()`.

## Prior decisions

- Ninguna nueva.

## Verification criteria

- **F49** While a workspace is selected and its flow has not answered yet, the Libretto tab shall show «Leyendo el flujo de este trabajo…».
  Proof: src/renderer/flow/flowempty.test.ts the panel says it is reading
- **F50** While the stage is `entrada`, `spec` or `plan`, or it is `construir` with no boxes, the Libretto tab shall show, under the change line, «Aún no hay casillas: salen cuando el plan tenga su checklist.»; at `entrada` with no change it shall say «Este trabajo aún no tiene cambio de Libretto: lo crea el primer paso.».
  Proof: src/renderer/flow/flowempty.test.ts before the checklist the panel says why there are no boxes

## Approach

### Summary

Dos ramas más en `LibrettoFlow`.

### Technical context

`FlowPanel.tsx`; test con jsdom y `mockApi`.

### The approach

`flow === null` con trabajo elegido → «Leyendo…». Sin `timeline` y paso anterior a terminar → la frase.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Un esqueleto animado | más código para lo mismo: una frase basta |

### Risks

| Risk | Mitigation |
|---|---|
| Ninguno relevante | — |

### Validation and rollback

Test rojo primero. Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] leyendo y sin casillas · Closes: F49, F50
