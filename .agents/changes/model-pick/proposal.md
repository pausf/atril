# model-pick

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> https://claude.dev/blog/which-claude-model-should-you-build-with/ podemos utilzar esto de alguna manera?
> haz todas

Del artículo: empezar en Opus 5.5 `medium`; Sonnet 5.5 para trabajo acotado (bugs, iterar, «spec driven») a mitad de precio; subir el esfuerzo antes de cambiar de modelo. Precios: Fable 5.2 lee caché a 0,20 $; Haiku 5.5 cuesta 0,10/0,50 hasta 100K tokens de entrada y 0,50/2,50 por encima (caché 0,01 y 0,05).

## Decision log

### Session 2026-11-11
- Q: (constructor) `suggest.ts`, `SuggestLine.tsx` y los diálogos viven bajo el `Governs:` de work-inbox → A: los criterios se quedan en workspaces, que ya gobierna el modelo y el comando (W34); la línea compartida es una pieza de la ventana (assumed).
- Q: (constructor) ¿Cómo se ve la sugerencia? → A: «Sugerido: Sonnet · Medio. {porqué} [Usar]», en una línea gris (assumed).
- Q: (revisión en frío) ¿Qué texto mira la sugerencia en «Empezar»? → A: el resumen y el tipo de Jira (assumed).
- Q: (revisión en frío) ¿Un esfuerzo raro por IPC? → A: se rechaza en main como un modelo raro (assumed).
- Q: ¿La sugerencia se aplica sola? → A: no: sale debajo del modelo con su porqué y un botón «Usar»; la persona decide (assumed, como la nota de MR de 540: la persona decide).
- Q: ¿De qué sale la sugerencia? → A: de reglas fijas sobre el texto y el tipo de Jira, sin llamar a Claude (CLAUDE.md: nada de llamadas automáticas) (assumed).
- Q: ¿Qué niveles de esfuerzo? → A: Por defecto, bajo, medio, alto y muy alto (`xhigh`); `max` se queda fuera del selector (assumed: es caro y el artículo no lo recomienda para empezar).

## Outcomes

- Al abrir un trabajo eliges también el esfuerzo; el agente arranca con `--effort` y el trabajo lo recuerda.
- Si la tarea parece un arreglo acotado o un cambio grande, el diálogo sugiere modelo y esfuerzo con su porqué; «Usar» lo aplica.
- El coste por trabajo cuenta la lectura de caché de Fable y el tramo largo de Haiku.

## Scope boundaries

**In:** `agent.ts` (`--effort`), `workspaces.ts` (campo `effort` del registro), IPC de abrir y de Empezar (Jira), `OwnTaskDialog.tsx` y `StartDialog.tsx`, un `suggest.ts` en el renderer, `prices.ts` y `cost.ts`. **Out:** reintentar con más esfuerzo (va con «Volver a abrir», siguiente cambio); modelos de los subagentes de Libretto (cambio aparte); medir modelos con tareas reales.

## Constraints

- Solo valores de una lista llegan a la línea de órdenes (W41: nada del texto como bandera).
- Nada llama a Claude para sugerir.

## Prior decisions

- Atril sugiere modelo y esfuerzo con reglas fijas y su porqué; nunca los cambia por la persona.

## Task breakdown

- `--effort` de punta a punta.
- La sugerencia y su botón.
- Precios.

## Verification criteria

- **W137** When a workspace opens from «Nuevo trabajo» or «Empezar» with an effort of `low`, `medium`, `high` or `xhigh`, the agent command (and the command «Empezar» shows) shall carry `--effort <level>` before the prompt and the record shall keep `effort`; with `default` or no effort the command has no `--effort` and the record has no `effort` field; any other value is refused in main with ««{effort}» no es un esfuerzo disponible» before anything runs.
  Proof: src/main/agent.test.ts effort reaches the command only from the list
  Proof: src/main/jira/start.test.ts an unknown effort is refused before anything runs
- **W34** (amended) Where the person picks a model in Start or in "Nuevo trabajo", Atril shall launch Claude with `--model <alias>` (`opus`, `sonnet`, `haiku`; no flag for "Por defecto"), store it in the workspace record, and show it on the workspace row; the effort picker beside it offers Por defecto, Bajo, Medio, Alto and Muy alto (`low`, `medium`, `high`, `xhigh`). Fable is not offered.
  Proof: src/main/agent.test.ts chosen model reaches claude and the record
- **W138** The suggestion shall come from the task text in «Nuevo trabajo», or the Jira summary and type in «Empezar», matched case-insensitively: a Jira type Bug, or a word starting with `arregl`, `fallo`, `error`, `bug`, `fix`, `typo`, `corrige` or `errata`, gives `sonnet` with `medium` and «Un arreglo acotado: Sonnet lo hace bien a mitad de precio que Opus.»; else a word starting with `refactor`, `migra`, `arquitectura`, `reescrib` or `rediseñ` gives `opus` with `high` and «Un cambio grande: mejor Opus con más esfuerzo.»; else none. A missing Jira type counts as not Bug. («fixture» counts as a fix: the rule is a hint, not a classifier.)
  Proof: src/renderer/inbox/suggest.test.ts the rules pick model and effort with their reason
- **W139** While a dialog has a suggestion and the chosen model or the chosen effort differs from it, the dialog shall show «Sugerido: {model} · {effort}» with its reason and a «Usar» button that sets both; with no suggestion, or both already equal, nothing shows; the dialog never changes the model or effort by itself.
  Proof: src/renderer/newwork.test.ts a suggestion is shown and used only on click
  Proof: src/renderer/inbox/start.test.ts the start dialog suggests from the jira type
- **W130** (amended) When the new-work or the start dialog gets an error with a `fix`, it shall show it as a problem titled with main's sentence, «No he creado el trabajo.» under it, the detail folded and a button by its `fix`: «Usar un worktree esta vez» asks to open the same repo, branch, model, effort, text and mode with `worktree: true`; «Abrir en Terminal» asks main to open Terminal for that repo.
  Proof: src/renderer/newwork.test.ts a dirty copy offers a worktree this time
  Proof: src/renderer/newwork.test.ts a blank dirty retry opens plain claude in a worktree
  Proof: src/renderer/newwork.test.ts a git failure offers terminal for the repo
- **W93** (amended) Main shall total a workspace's usage over its transcript and every `subagents/*.jsonl` beside it, counting each `message.id` once, as input, output, cache-write and cache-read tokens per model, and price each message with the dated table (cache write 1.25× that message's input price; cache read the published price or 0.1× input — Fable 5.2's published 0,20 included), where `claude-haiku-5-5` (or it plus `-YYYYMMDD`) uses 0,50 / 2,50 $ per million and cache read 0,05 for a message whose input, cache write and cache read add up to more than 100 000 tokens, and 0,10 / 0,50 with cache read 0,01 otherwise (exactly 100 000 is the short price); leaving the cost out for a model the table does not name (matching an exact id or the id plus `-YYYYMMDD`); lines that are not JSON or lack usage are skipped, and a line without `message.id` counts once; a later read covers only the bytes appended since the previous one; the table's date is 2026-11-11. One test holds a case per clause.
  Proof: src/main/cost.test.ts usage is totalled once per message and priced by model
  Proof: src/main/cost.test.ts haiku long prompts and fable cache use their prices

## Approach

### Summary

`Effort` es una lista nueva al lado de `Model`; viaja igual que el modelo. La sugerencia es una función pura en el renderer. El coste pasa a calcularse por mensaje para poder elegir el tramo.

### Technical context

`src/preload/api.ts` (`Effort`, `open`, `StartRequest`), `src/main/{agent,workspaces,index,prices,cost}.ts`, `src/main/jira/start.ts`, `src/renderer/inbox/{OwnTaskDialog,StartDialog,suggest}.tsx|ts`, `src/renderer/components/models.ts`, i18n. Tests: `agent.test.ts`, `suggest.test.ts` (nuevo), `newwork.test.ts`, `cost.test.ts`.

### The approach

- `EFFORTS = ['low','medium','high','xhigh']`; `agentArgv({ effort })` añade `--effort` si está en la lista.
- `open(repoId, branch, agent, model?, task?, auto?, worktree?, effort?)`; `StartRequest.effort` and `proposeStart(…, { effort })`, validated against `EFFORTS` in `index.ts` and `start.ts` as the model is.
- `suggest(text, issueType?)` → `{ model, effort, why } | null`.
- `Price` gana `long?: Price`; `priceOf` sigue igual; `take` guarda cada mensaje y `total` suma los tokens por modelo como hoy y el dinero mensaje a mensaje, con `long` cuando la entrada del mensaje pasa de 100 000. `Totals.models` no cambia de forma.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Preguntar a Claude qué modelo usar | gasta cuota en cada trabajo, y la regla es nada de llamadas automáticas |
| Aplicar la sugerencia sola | decide por la persona; el artículo dice medir antes de cambiar |

### Risks

| Risk | Mitigation |
|---|---|
| La regla acierta poco | solo sugiere, con su porqué; «Usar» es un clic |
| Un `claude` antiguo sin `--effort` | solo se añade si la persona elige un nivel |

### Validation and rollback

Tests rojos primero; la app real abriendo un trabajo «arregla el fallo del carrito» y mirando la orden en `claude-calls.log` del claude falso. Un revert.

### Complexity deliberately kept

El coste por mensaje en vez de por modelo: el tramo de Haiku depende de cada petición.

## Checklist

- [x] `--effort` de punta a punta, guardado en el registro, también en el reintento · Closes: W137, W34, W130
- [x] la sugerencia, su regla y su botón en los dos diálogos · Closes: W138, W139
- [x] precios de Fable y del tramo largo de Haiku · Closes: W93
