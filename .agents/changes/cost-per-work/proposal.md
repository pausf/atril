# cost-per-work

Tracker: none
Targets: workspaces
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> sigue creando funcionalidades. Tenemos que hacer el mejor gestor de IA, o sea, de orquestador y revisor de MRs, etcétera, porque lo queremos poner para que la gente le sea útil.

## Reading

Coste y cuota por trabajo (lista del 9 nov): tokens y coste estimado de cada trabajo, leídos de sus transcripts locales, sin llamadas a Claude.

## Decision log

### Session 2026-11-10
- Q: ¿De dónde salen los números? → A: de los transcripts locales de Claude Code, sin llamar a nada: cada
  línea `assistant` trae `message.usage` (input, output, cache creation, cache read) y `message.model`. Se
  suman el transcript principal del trabajo y los de sus subagentes (`<transcript sin .jsonl>/subagents/*.jsonl`)
  (assumed).
- Q: ¿Cómo sabe Atril qué transcript es de cada trabajo? → A: el hook guarda en cada evento la ruta de
  `transcript_path` (campo documentado) en `$ATRIL_HOME/transcripts/<session>`; solo la ruta, nunca contenido
  (assumed).
- Q: ¿Duplicados? → A: Claude Code puede escribir varias líneas del mismo mensaje con el mismo `usage`: se
  cuenta una vez por `message.id` (assumed).
- Q: ¿Precio? → A: tabla oficial de la API cacheada el 2026-11-03 (claude-api): Fable 5.2 8/40, Opus 5.5 4/20 (caché
  leída 0,20), Opus 5 5/25, Sonnet 5.5 2/10 (caché leída 0,10), Sonnet 5 2/10, Haiku 5.5 0,10/0,50 $ por millón;
  escritura de caché 1,25× la entrada, lectura de caché la publicada o 0,1× la entrada; un modelo desconocido
  cuenta tokens y no coste (assumed). Techo: los precios cambian; la tabla vive en un archivo con su fecha.
- Q: ¿Qué se dice? → A: «≈ {coste} $ · {tokens} tokens» y la etiqueta «estimado a precio de API» (con
  suscripción no se paga por token) (assumed).
- Q: ¿Dónde? → A: en la tarjeta de «Todos», en el panel de Libretto (una línea bajo «Cambio») y en el título
  de la fila al pasar el ratón (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **Varios transcripts por trabajo.** `transcripts/<session>` guarda una ruta por línea; se añade si es
    nueva. El total suma todas las rutas y sus subagentes, así que lo de un transcript anterior no se pierde
    al reanudar.
  - **Qué toca el hook.** W92 escribe solo ese archivo, en cualquier evento. El «no cambia nada» de W63 se
    refiere al archivo de subagentes. La frase de add-agent-activity «el payload crudo nunca va a disco» sigue
    siendo cierta: solo se guarda una ruta.
  - **`<session>`** es el mismo nombre que en W62.
  - **Líneas sin `message.id`.** Cuentan una vez cada una, porque no hay con qué deduplicarlas.
  - **El modelo.** Coincide si es el id exacto o el id seguido de una fecha (`-AAAAMMDD`).
  - **Precio incompleto.** El coste solo suma los modelos con precio. Si queda alguno sin él, se añade «(sin
    precio para {modelo})».
  - **Formato.**
    - Coste: «0,42 $», o «< 0,01 $» si no llega.
    - Tokens: «850», «12,3 k» o «1,2 M».
    - Si el total es 0 tokens, no se enseña nada.
  - **Lectura.** Main guarda por archivo hasta dónde ha leído y los `message.id` ya vistos, y relee cada
    30 s solo lo añadido. Empuja `atril:cost:changed` cuando el total cambia; la ventana pide
    `atril:cost:get`.
  - **La línea del panel de Libretto** es de flow-status: va en F34.
  - **Decisiones superadas.** El «Out: token or cost per workspace» y «Read the whole transcript» de
    add-agent-activity quedan superados por este cambio.

## Outcomes

- Cada trabajo enseña cuántos tokens lleva gastados (con sus subagentes) y su coste estimado a precio de API.

## Scope boundaries

**In:** guardar la ruta del transcript, sumar usage sin duplicados con subagentes, la tabla de precios, mostrarlo.
**Out:** coste real de la suscripción; presupuestos o avisos de gasto; histórico (va con el historial); la cuota
de 5 h por trabajo.
**Never scoped out:** nada sale del Mac; el contenido de los transcripts no se guarda ni se muestra; se lee
como mucho cada 30 s y solo los bytes nuevos.

## Prior decisions

- Transcripts locales como fuente, sin llamadas (assumed, 10 nov).
- Tabla de precios fechada en un archivo (assumed, 10 nov).
- «Estimado a precio de API» (assumed, 10 nov).

## Verification criteria

- **W92** On every hook event whose payload's `transcript_path` is a string ending in `.jsonl`, the hook shall
  add that path as a line to `$ATRIL_HOME/transcripts/<session>` (W62's session name) when it is not there yet,
  and write nothing else from the payload; other events leave the file as it is.
  Proof: src/main/agent.test.ts the hook keeps where the transcript is
- **W93** Main shall total a workspace's usage over its transcript and every `subagents/*.jsonl` beside it,
  counting each `message.id` once, as input, output, cache-write and cache-read tokens per model, and price them
  with the dated table (cache write 1.25× input; cache read the published price or 0.1× input), leaving the cost
  out for a model the table does not name (matching an exact id or the id plus `-YYYYMMDD`); lines that are not
  JSON or lack usage are skipped, and a line without `message.id` counts once; a later read covers only the bytes
  appended since the previous one. One test holds a case per clause.
  Proof: src/main/cost.test.ts usage is totalled once per message and priced by model
- **W94** A workspace's card and its row's title shall show «≈ {coste} $ · {tokens} tokens» with «estimado a
  precio de API» — cost as «0,42 $» or «< 0,01 $», tokens as «850», «12,3 k» or «1,2 M», plus «(sin precio para
  {modelo})» when a model is unpriced — updated when main pushes a change, and nothing when the total is 0
  tokens or there is no transcript. One test holds a case per clause.
  Proof: src/renderer/cost.test.ts each workspace shows its estimated cost

## Approach

- `src/main/prices.ts`: tabla fechada (`PRICES_AT = '2026-11-03'`) y `priceOf(model)`.
- `src/main/cost.ts`: `createCost({ emit })`. Por trabajo lee `transcripts/<session>`; por archivo guarda
  `{ offset, seen }` en memoria; un intervalo de 30 s lee lo añadido y emite si cambia el total.
- El hook añade la ruta con la misma escritura atómica que el resto (`replace`).
- Ventana: `useCost(id)` como `useSubagents`; tarjeta, fila y panel (F34).

## Checklist

- [ ] hook keeps the transcript path; main totals and prices usage · Closes: W92, W93
- [ ] card, panel and row show it; sketch; photo · waits on box 1 · Closes: W94, F34
