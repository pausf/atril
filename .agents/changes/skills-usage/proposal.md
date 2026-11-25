# skills-usage

Tracker: none
Targets: skills
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> «sigue con esto» (Pau, 24 nov 2026; la cola de Skills: listado → encender y apagar → editor → plugins → uso). «sigue» (25 nov 2026).

## Decision log

### Session 2026-11-25
- Q: ¿De dónde sale el uso? → A: de las sesiones que Claude Code guarda en `claudeDir()/projects/*/*.jsonl` (y sus `*/<sesión>/subagents/*.jsonl`): una línea con un `tool_use` `"name":"Skill"` cuenta `input.skill`; una línea de la persona con `<command-name>/x</command-name>` cuenta `x` (assumed: Claude Code no documenta otro registro de uso; `~/.claude.json` no se toca; el formato no está documentado, así que una línea que no se entiende se salta y nunca rompe la pantalla).
- Q: ¿Cuánto hacia atrás? → A: 30 días, y solo se abren archivos modificados en esos 30 días (assumed: hay ~3,5 GB de sesiones; leer todo cada vez es inviable).
- Q: ¿Cada vez que se abre Skills relee todo? → A: no: main guarda en memoria lo contado por archivo junto a su `mtime` y tamaño y solo relee los que cambiaron; una lectura a la vez (assumed: persistirlo en disco si la primera apertura resulta lenta).
- Q: ¿Cómo se casa una invocación con una tarjeta? → A: por el nombre que la tarjeta enseña sin la barra: `name` para personal y proyecto, `{plugin antes de @}:name` para plugin y Atril (assumed: es lo que se teclea y lo que el `Skill` recibe).
- Q: ¿Qué enseña? → A: en cada tarjeta, «usada hace {n} días» / «usada hoy» / «sin usar en 30 días»; un recuadro «Sin usar en 30 días» junto a Activas, Apagadas y Choques, que filtra; en el detalle, «Uso · últimos 14 días» con 14 barras, «{n} veces en 30 días» y «Según las sesiones de Claude Code en este Mac.» (assumed: como el boceto, sin el donut).
- Q: ¿«Apagar todas» las sin usar? → A: fuera (assumed: son N escrituras de golpe y merecen su propio cambio con deshacer).
- Q: (spec-reviewer) ¿Qué tarjetas dicen el uso y cuáles cuentan como «sin usar»? → A: dicen el uso todas menos las que no se cargan (`shadowedBy`), que no dicen nada; un nombre sin entrada es «sin usar en 30 días»; el recuadro y el filtro cuentan las que Claude puede usar: no `off`, no `shadowedBy` y `enabled` distinto de `false` (incluye «Solo si la llamas tú», que es justo la que solo cuenta si la tecleas) (assumed).
- Q: (spec-reviewer) ¿Dos tarjetas con el mismo nombre en repos distintos? → A: comparten el recuento: las sesiones no dicen de qué repo venía una skill con ese nombre; uso por repo está fuera (assumed).
- Q: (spec-reviewer) ¿Se vuelve a pedir el uso al cambiar de repo? → A: no: una vez por visita a la pantalla; el uso no depende del repo (assumed).
- Q: (spec-reviewer) ¿Escala y fecha de las barras? → A: proporcionales al máximo de esos 14 días; con todo a 0, todas al mínimo (2 px); la etiqueta con día y mes cortos de la configuración regional, p. ej. «25 nov: 3» (assumed).
- Q: (spec-reviewer) ¿Filtro «sin usar» vacío? → A: «No tienes ninguna sin usar.» (assumed).
- Q: ¿Y si leer el uso falla o tarda? → A: la lista nunca espera al uso; si falla, las tarjetas no dicen nada del uso y no hay recuadro (assumed: el uso es un añadido, no la pantalla).

## Outcomes

En Skills la persona ve qué skills y comandos usa de verdad y cuáles llevan 30 días sin usarse, para decidir cuáles apagar, sin gastar cuota: Atril lo cuenta leyendo las sesiones que Claude Code ya guarda en el Mac.

## Scope

**In:** `src/main/skills/usage.ts` nuevo con su test, el IPC `atril:skills:usage` en `src/main/index.ts` y `src/preload/{api,index}.ts`, `src/renderer/mockApi.ts`, `src/renderer/skills/` (tarjeta, recuadro y filtro, detalle), `src/renderer/App.tsx` (solo la vista de foto `skills-uso`), `src/preload/i18n-en.ts`, estilos con tokens, `bocetos/novedades.html`, `bocetos/fase1-nucleo.html`, la foto.
**Out (nombrado):** «Apagar todas»; duplicar y borrar; vista Lista; donut; uso de más de 30 días; uso por repo; contar lo que Claude carga sin invocar (una skill «leída» por descripción no es un uso).

## Constraints

- Ninguna llamada a Claude; nunca `~/.claude.json`. Solo lectura de `claudeDir()/projects`.
- Lectura por líneas en streaming; una línea se mira con `JSON.parse` solo si contiene `"name":"Skill"` o `<command-name>`.
- Textos por `t()` con entrada inglesa; colores por tokens.
- Tests con `ATRIL_CLAUDE_DIR` temporal y sesiones sembradas.

## Prior decisions

- (2026-11-25, skills-usage) El uso sale de las sesiones de Claude Code en `claudeDir()/projects`, nunca de `~/.claude.json` ni de una llamada a Claude; una línea que no se entiende se salta.
- (2026-11-25, skills-usage) Solo se miran 30 días y solo los archivos modificados en ellos; lo contado se guarda en memoria por archivo (`mtime` + tamaño) — ponytail: en memoria, persistir si la primera apertura es lenta.
- (2026-11-25, skills-usage) Una invocación casa con la tarjeta por el nombre que esta enseña sin barra (`name` o `{plugin antes de @}:name`).

## Task breakdown

- Main: contar invocaciones por nombre y día, con caché por archivo.
- Pantalla: tarjeta, recuadro y filtro «Sin usar en 30 días», detalle con barras.
- Foto y bocetos.

## Verification criteria

- **K35** When `atril:skills:usage` is called, main shall read every `*.jsonl` under `claudeDir()/projects/<dir>/` and `claudeDir()/projects/<dir>/<session>/subagents/` whose `mtime` is within the last 30 days, and answer `{ usage }` mapping each name to `{ last, days }` — `last` the newest ISO `timestamp` seen for it, `days` a 30-number array (index 0 today, local time) of uses per day — counting once per line an assistant line holding a `tool_use` named `Skill` (its `input.skill`) and once per line a user line whose content holds `<command-name>/x</command-name>` (as `x`); lines older than 30 days, unparsable lines and lines without `timestamp` shall count nothing; a file whose `mtime` is older than 30 days shall count nothing even when its lines carry recent timestamps (it is not opened). Day `k` is the number of local calendar days between today and the line's `timestamp`. One test holds every clause.
  Proof: src/main/skills/usage.test.ts "counts Skill tool uses and typed commands per day within 30 days"
- **K36** If a file's `mtime` and size are unchanged since the last `atril:skills:usage`, then main shall not read it again and shall reuse what it counted; a file that changed shall be read again whole and a file that disappeared shall stop counting. One test holds every clause.
  Proof: src/main/skills/usage.test.ts "reuses an unchanged file and rereads a changed one"
- **K39** While one `atril:skills:usage` read runs, a second call shall get the same answer without starting another read; if `claudeDir()/projects` cannot be listed for a reason other than not existing, main shall answer `{ error }` and not reject, and with no `projects` folder it shall answer `{ usage: {} }`. One test holds every clause.
  Proof: src/main/skills/usage.test.ts "shares a running read and answers an error instead of rejecting"
- **K37** When the Skills screen shows and the usage answers, each card not shadowed shall show «usada hoy», «usada hace 1 día», «usada hace {n} días» or (no entry for its name) «sin usar en 30 días», matching the card's name without the slash (K5), and a shadowed card shall say nothing about usage; a fourth tile «Sin usar en 30 días» shall count the items that are not `off`, not shadowed, not `enabled: false` and have no use, with «candidatas a apagar» (or «todas en uso» at 0), and activating it shall filter to those items as a pressed toggle that a second press, «Todas» or another filter undoes, showing «No tienes ninguna sin usar.» when none; the usage shall be asked once per visit to the screen, not again on a repo pick; while it has not answered, or it answered `{ error }`, cards shall say nothing about usage and the tile shall not show. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx "shows when each skill was last used and filters the unused ones"
- **K38** When the detail (K7) opens and the usage has answered, it shall show «Uso · últimos 14 días» with 14 bars (oldest left, height proportional to that day's uses over the 14-day maximum, 2 px when 0, each with an accessible label «{día mes corto}: {n}», e.g. «25 nov: 3»), «{n} veces en 30 días» (or «Sin usar en 30 días.») and «Según las sesiones de Claude Code en este Mac.»; without usage it shall show none of these. One test holds every clause.
  Proof: src/renderer/skills/skills.test.tsx "the detail shows the last 14 days of use"

## Approach

### Summary
`src/main/skills/usage.ts` con `createUsage({ dir })` que devuelve `read()`: lista los `.jsonl` recientes, reutiliza o relee cada uno con `readline` y suma por nombre y día. El renderer pide el uso tras la lista, lo guarda aparte y lo pasa a la tarjeta, al recuadro y al detalle.

### Technical context
Electron + TS + React 19, vitest (node con carpetas temporales; jsdom con `mockApi`). `paths.ts` da `claudeDir()` (con `ATRIL_CLAUDE_DIR` en tests). `cost.ts` ya lee transcripciones de Claude Code (W93) con offsets; este cambio no lo toca. `Skills.tsx` tiene los recuadros y el `Filter`; `SkillCard.tsx` y `SkillDetail.tsx` pintan tarjeta y detalle. Radio: unos 10 archivos.

### The approach
- **Archivos:** `readdir(projects)` → por cada carpeta, sus `*.jsonl` y `<sesión>/subagents/*.jsonl`; `stat` y se descarta `mtime < ahora − 30 d`.
- **Caché:** `Map<path, { mtimeMs, size, hits: { name, ts }[] }>`; mismo `mtimeMs` y `size` → se reutiliza; las claves que no aparecen esta vez se borran.
- **Línea:** `includes('"name":"Skill"') || includes('<command-name>')` → `JSON.parse` en `try`; `type === 'assistant'` → cada bloque `tool_use` con `name === 'Skill'` y `input.skill` string, una vez por línea y nombre; `type === 'user'` → el texto (string o bloques `text`) con `/<command-name>\/([^<\s]+)<\/command-name>/`. Sin `timestamp` válido, nada.
- **Respuesta:** al sumar, `ts` < ahora − 30 d se ignora; `days[k]` con k = días locales entre hoy y `ts`. Una promesa compartida mientras corre.
- **Pantalla:** `usage: Record<string, SkillUse> | null` en `Skills.tsx`, pedido en el mismo efecto que la lista con el flag `live` (K11) pero sin esperar; `Filter` gana `'idle'`; la tarjeta y el detalle reciben `use?: SkillUse | null`.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| Leer `~/.claude.json` | prohibido tocarlo; y no sabemos que guarde fechas |
| Hooks de Claude Code que apunten cada uso | escribe en los ajustes de la persona y solo cuenta desde hoy |
| Persistir el recuento en `ATRIL_HOME` | más código y una caché que invalidar; en memoria basta hasta medir |
| Releer todo cada vez | ~3,5 GB; aun con el filtro de 30 días, la caché ahorra casi todo |

### Risks
| Risk | Mitigation |
|---|---|
| Claude Code cambia el formato | línea no entendida = nada; la pantalla sin uso sigue funcionando (K36, K37) |
| Primera lectura lenta | streaming + filtro de texto antes de `JSON.parse`; la lista no espera |
| Contar dos veces la misma invocación | una vez por línea y nombre (K35) |

### Validation and rollback
K35, K36 y K39 con sesiones sembradas y `utimes`; forzar rojo K36 quitando la comparación de `mtime`/tamaño (el archivo reescrito con igual tamaño y `mtime` restaurado debe dar el recuento viejo). K37–K38 en jsdom. Foto de la pantalla con uso. Rollback: un revert.

### Complexity deliberately kept
La caché por archivo: sin ella cada apertura de Skills relee cientos de MB.

## Checklist

- [x] Main: `usage.ts` con caché, IPC y preload · Closes: K35, K36, K39
- [ ] Tarjeta, recuadro y filtro, detalle con barras · waits on box 1 · Closes: K37, K38
- [ ] Textos en inglés, foto (vista `skills-uso`) y bocetos · waits on box 2 · Closes: K37, K38
