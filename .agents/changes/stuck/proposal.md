# stuck

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> haz 1 3 5 6

(5 = «Dónde se atasca»: el tiempo en cada paso de Libretto por trabajo terminado, para ver si el cuello está en la spec, en construir o en la revisión. Idea sacada de las fábricas de software, que invierten donde se acumula el trabajo, 11 nov.)

## Decision log

### Session 2026-11-11
- Q: (revisión en frío) ¿Cuándo es «cerrar»? → A: el momento en que `historyEntry` corre, justo antes de quitar el trabajo (assumed).
- Q: (revisión en frío) ¿Qué es «marcar una casilla»? → A: un commit en el que sube el número de casillas cerradas que da `parseBoxes` (`src/main/flow/checklist.ts`) respecto al commit anterior del documento (assumed).
- Q: (revisión en frío) ¿Qué commits? → A: los de la rama, `git log <baseCommit>..HEAD -- <proposal.md>`, del más antiguo al más nuevo; un commit donde el archivo ya no existe (aterrizado) se salta (assumed).
- Q: (revisión en frío) ¿Mediana y empates? → A: de los 20 más recientes, los que tengan ese tramo; con número par, la media de los dos centrales; empate: el primero en orden Spec, Plan, Construir, Cierre; menos de un minuto se escribe «<1 min». El titular va dentro de Terminados, visible al desplegarlo (assumed).
- Q: ¿De dónde salen los tiempos? → A: de git, una vez, al cerrar el trabajo: los commits del documento del cambio (`.agents/changes/<cambio>/proposal.md`) marcan cuándo se escribió la spec, cuándo apareció el checklist y cuándo se marcó la última casilla; el principio es la creación del trabajo y el final, su cierre (assumed).
- Q: ¿Qué tramos? → A: Spec (de abrir a la spec escrita), Plan (hasta el checklist), Construir (hasta la última casilla), Cierre (hasta cerrar el trabajo: revisar, MR, aterrizar) (assumed).
- Q: (al construir) ¿Contra qué cuenta el primer commit de la rama si sube casillas? → A: contra 0; el documento en `baseCommit` no cuenta (assumed).
- Q: (al construir) ¿Y si no sale ningún tramo? → A: la línea no lleva `steps` (assumed).
- Q: (al construir) ¿Cómo se redondea {d}? → A: hacia abajo, en una sola unidad (105 min → «1 h»); «Cierre» en inglés es «Wrap-up» (assumed).
- Q: ¿Dónde se ve? → A: en Terminados: los tramos de cada trabajo en su fila y, arriba, el tramo con la mediana más alta de los últimos 20 (assumed).

## Outcomes

- En Terminados ves cuánto tardó cada trabajo en cada tramo y en cuál se te va el tiempo normalmente.

## Scope boundaries

**In:** `src/main/history.ts` (`historyEntry` gana `steps`), una función pura que los calcula, la pantalla de Terminados, i18n. **Out:** tiempos de trabajos abiertos; tiempos de la MR en la forja; gráficas.

## Constraints

- Se calcula una sola vez, al cerrar; ningún coste mientras el trabajo está abierto.
- Un trabajo sin cambio de Libretto no tiene tramos: su fila no cambia.

## Prior decisions

- Los tiempos por tramo salen de git al cerrar el trabajo; Atril no vigila tiempos mientras trabajas.

## Verification criteria

- **W172** When a workspace with a Libretto change is closed, its history line shall carry `steps` in seconds from the branch's commits to that change's `proposal.md` (`<baseCommit>..HEAD`, oldest first): `spec` from the record's `createdAt` to the first commit whose file has a `## Verification criteria` section; `plan` from there to the first commit whose file has a box under `## Checklist`; `construir` from there to the last commit that raises the count of closed boxes; `cierre` from the last of those marks that exists to the moment of closing. A step is left out when either of its ends is missing (no `createdAt`, no such commit); a step of 0 is kept; none is ever negative.
  Proof: src/main/history.test.ts a closed work records the time of each step
  Proof: src/main/history.test.ts missing marks leave their steps out
- **W173** Terminados shall show, under each entry with steps, its steps in order as «Spec {d} · Plan {d} · Construir {d} · Cierre {d}» (only those it has), with {d} as «<1 min», «{n} min», «{n} h» or «{n} d»; and at the top of the unfolded list, when at least three of the 20 newest entries have steps, «Donde más tiempo se va: {step} (mediana {d})» for the step with the highest median over the entries that have it (an even count takes the mean of the two middle values; a tie goes to the earlier step).
  Proof: src/renderer/history.test.ts each finished work shows its steps and the slowest one leads

## Approach

### Summary

`stepTimes(rec, change, now, run)` en `history.ts`: `git log --format='%H %ct' <baseCommit>..HEAD -- <proposal.md>` y un `git show` por commit (pocos), una sola vez al cerrar; las casillas con `parseBoxes`. La pantalla es `src/renderer/components/History.tsx`. La pantalla de Terminados lee `steps` y calcula la mediana.

### Technical context

`src/main/history.ts`, `src/preload/api.ts` (`HistoryEntry.steps`), la pantalla de Terminados (busca `HistoryEntry` en `src/renderer`), i18n. Tests con repos git reales y fechas de commit fijadas (`GIT_COMMITTER_DATE`).

### The approach

Recorre los commits del más antiguo al más nuevo y fija las tres marcas; los tramos se restan y se descartan los que falten o salgan negativos.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Vigilar el paso en vivo | el vigilante solo mira el trabajo elegido; los demás se perderían |
| Tiempos de la forja (MR) | otra llamada de red y otra fuente; queda para después |

### Risks

| Risk | Mitigation |
|---|---|
| Commits reescritos (rebase) mueven las fechas | se usan las fechas de commit tal como quedan; un tramo negativo se descarta |

### Validation and rollback

Tests rojos primero; la app real cerrando un trabajo con commits fechados. Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] los tramos al cerrar · Closes: W172
- [x] Terminados los enseña con el más lento arriba · waits on box 1 · Closes: W173
