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

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **Etapa y cambio.** Main llama a `stageOf` (código de flow-status, solo lectura) **antes** de quitar el
    trabajo. Las etapas son las de siempre: Entrada, Spec, Plan, Construir, Terminado, Aterrizado y «sin
    Libretto».
  - **Orden de las cosas.** Se capturan etapa y coste, se quita el trabajo y, solo si quitarlo sale bien, se
    añade la línea. Si el historial no se puede escribir, el trabajo se quita igual.
  - **Sesiones de revisión.** No entran.
  - **Cuántas se guardan.** Las 200 últimas por orden de escritura, recortando tras añadir. Las escrituras van
    en cola, una a una, con archivo temporal y renombrado como W80.
  - **Formatos:**
    - «duró»: «< 1 min», «{m} min», «{h} h {m} min» o «{d} d {h} h».
    - Antigüedad: «hoy» si es el mismo día de calendario, si no «hace {n} d».
    - Coste: la forma corta de W94, «≈ 0,42 $ · 850 tokens», sin la etiqueta y nada si son 0 tokens.
  - **La sección.** La cabecera cuenta todas las líneas del archivo. Si no hay ninguna, la sección no sale. La
    ventana lo pide al cargar (`atril:history:list`) y main avisa al añadir (`atril:history:changed`).
  - **La MR y el informe** quedan fuera; la frase de la lectura que los nombraba está superada.

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
  200 newest lines, written atomically and one write at a time; stage and change shall be read before the
  removal, the line appended only after it succeeds, a failed removal appending nothing and a failed append not
  failing the removal; review sessions shall append nothing. One test holds a case per clause.
  Proof: src/main/history.test.ts a removed workspace leaves one history line
- **W96** While history has lines, Trabajo shall show a «Terminados» section, folded by default (W28), its count
  the number of lines, with the 20 newest, each with its branch, repo, stage, «duró» as «< 1 min» / «{m} min» /
  «{h} h {m} min» / «{d} d {h} h» when `createdAt` is known, W94's short cost «≈ {coste} $ · {tokens} tokens»
  when non-zero, and «hoy» or «hace {n} d» by calendar day; it shall update when main pushes a new line. One test
  holds a case per clause.
  Proof: src/renderer/history.test.ts finished works show in their own section

## Checklist

- [ ] createdAt, the history line on removal and the 200 cap · Closes: W95
- [ ] the Terminados section; sketch; photo; novedades · waits on box 1 · Closes: W96
