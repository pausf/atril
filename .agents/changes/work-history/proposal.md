# work-history

Tracker: none
Targets: workspaces
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> sigue creando funcionalidades. Tenemos que hacer el mejor gestor de IA, o sea, de orquestador y revisor de MRs, etcétera, porque lo queremos poner para que la gente le sea útil.

## Reading

Historial de trabajos terminados (lista del 9 nov): lo aterrizado, con su MR, duración, coste y enlace al informe.

## Decision log

### Session 2026-11-10
- Q: ¿Cuándo entra un trabajo en el historial? → A: al quitarlo con éxito (W10/W90): es cuando deja de estar «en
  marcha» (assumed). Lo aterrizado y lo abandonado entran igual; la etapa a la que llegó lo distingue.
- Q: ¿Qué se guarda? → A: una línea en `$ATRIL_HOME/history.jsonl`: rama, repo, clave de Jira si la tenía, modo,
  cambio de Libretto y etapa a la que llegó, abierto (nuevo campo `createdAt` en el registro; los viejos no lo
  tienen) y cerrado, y el coste (W93) en ese momento; nunca contenido de transcripts ni del repo (assumed).
- Q: ¿Dónde se ve? → A: una sección plegable «Terminados» bajo «Trabajo en marcha», plegada por defecto, con los 20
  últimos: rama, repo, etapa («Aterrizado», «Construir»…), «duró {d}» cuando hay `createdAt`, el coste y «hace
  {n} d» (assumed).
- Q: ¿Tamaño? → A: el archivo guarda los 200 últimos; la vista enseña 20 (assumed).

## Outcomes

- Lo que terminaste queda a la vista con su etapa, cuánto duró y cuánto costó, aunque ya no esté en marcha.

## Scope boundaries

**In:** `createdAt` en los registros nuevos, la línea al quitar, la sección «Terminados».
**Out:** reabrir desde el historial; buscar o filtrar; el informe exportable (otra idea); MR enlazada (Atril no la
guarda aún).
**Never scoped out:** escritura atómica (W80); nada de contenido; teclado en la sección.

## Prior decisions

- Al quitar, no al aterrizar (assumed, 10 nov).
- 200 en disco, 20 a la vista (assumed, 10 nov).
- Sección plegada en Trabajo (assumed, 10 nov).

## Verification criteria

- **W95** Atril shall record `createdAt` (epoch seconds) on every new workspace record, and when a workspace is
  removed successfully it shall append to `$ATRIL_HOME/history.jsonl` its branch, repo, Jira key, mode, Libretto
  change and stage at that moment, `createdAt` when present, `closedAt`, and its W93 total, keeping only the
  200 newest lines, written atomically; a failed removal shall append nothing.
  Proof: src/main/history.test.ts a removed workspace leaves one history line
- **W96** Trabajo shall show a «Terminados» section, folded by default (W28), with the 20 newest history lines,
  each with its branch, repo, stage, «duró {d}» when `createdAt` is known, its cost text (W94) and «hace {n} d»
  (or «hoy»).
  Proof: src/renderer/history.test.ts finished works show in their own section

## Checklist

- [ ] createdAt, the history line on removal and the 200 cap · Closes: W95
- [ ] the Terminados section; sketch; photo; novedades · waits on box 1 · Closes: W96
