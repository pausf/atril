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

- **W92** On every hook event the hook shall write the payload's `transcript_path`, when it is a string ending
  in `.jsonl`, to `$ATRIL_HOME/transcripts/<session>`, and nothing else from the payload.
  Proof: src/main/agent.test.ts the hook keeps where the transcript is
- **W93** Main shall total a workspace's usage over its transcript and every `subagents/*.jsonl` beside it,
  counting each `message.id` once, as input, output, cache-write and cache-read tokens per model, and price them
  with the dated table (cache write 1.25× input; cache read the published price or 0.1× input), leaving the cost
  out for a model the table does not name; lines that are not JSON or lack usage are skipped. One test holds a
  case per clause.
  Proof: src/main/cost.test.ts usage is totalled once per message and priced by model
- **W94** A workspace's card, its Libretto panel and its row's title shall show «≈ {coste} $ · {tokens} tokens»
  with «estimado a precio de API», refreshed at most every 30 seconds, and nothing when it has no transcript.
  Proof: src/renderer/cost.test.ts each workspace shows its estimated cost

## Checklist

- [ ] hook keeps the transcript path; main totals and prices usage · Closes: W92, W93
- [ ] card, panel and row show it; sketch; photo · waits on box 1 · Closes: W94
