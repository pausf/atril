# MR

Governs: src/main/forge/mrs.ts src/main/forge/scores.ts src/renderer/mr/**

The MR screen: your merge requests on GitHub and GitLab, the ones you review, and the ones in
the projects you follow. Phase 2 of Atril; scores, threads and notifications build on it.

## Outcomes

### MR lists (add-mr-lists, 9 nov 2026)

- The rail has an **MR** screen with three lists — **Mías**, **Me toca revisar**, **Sigo** — mixing
  GitHub and GitLab, each row with title, project, author, CI, size and age; a row opens the MR in
  the browser. The rail shows how many MRs wait for your review.
- With no forge connected the screen says so and opens Ajustes; a forge that fails shows its error
  while what it did return, and the other forge, still show.

### MR scores (add-mr-scores, 9 nov 2026)

- Rows in **Mías** and **Me toca revisar** offer **Puntuar**. Scoring shows, first, what Atril
  measures itself — size S/M/L/XL, +/− lines, files, whether tests changed — and then Claude's
  view: difficulty and risk from 1 to 5, what the MR does, why those numbers, and where to look.
- A score is kept per MR commit and shown again without calling Claude; a newer commit marks it
  as from an earlier commit, with **Puntuar de nuevo**.

## Scope boundaries

### MR lists (add-mr-lists, 9 nov 2026)

**In:** listing, the row fields, opening in the browser, refresh, the rail counter.
**Out:** scores (add-mr-scores), threads and replies (add-mr-threads), notifications (add-avisos),
closed or merged MRs, choosing followed projects inside Atril, line counts for GitLab MRs.

**Never scoped out:** tokens stay in main (S25); forge requests never follow redirects (W50); main
opens only URLs it listed or created (W52, amended in `spec-workspaces.md`); rows are buttons and
the lists use the foldable sections every screen uses (W28).

### MR scores (add-mr-scores, 9 nov 2026)

**In:** the diff fetch, the deterministic metrics, the Claude call, the cache, the queue, the score
view. **Out:** scoring «Sigo», automatic scoring, code-complexity tools per language (cyclomatic,
coverage, mutation) — later, when a repo is checked out locally —, posting scores to the forge.

**Never scoped out:** Claude runs with no tools and no session saved; the diff reaches it on stdin,
never in argv; tokens never reach Claude or the window; a failed or malformed answer says so and
stores nothing.

## Constraints

### MR lists (add-mr-lists, 9 nov 2026)

- REST only, with the stored tokens; no new dependency; 10 s per request; error codes, never
  messages, from network failures (S20).

### MR scores (add-mr-scores, 9 nov 2026)

- The runner gains stdin input; same no-shell rule (W-criteria).
- Diffs come from the forges with the stored tokens, `redirect: 'error'`, 10 s per request.

## Prior decisions

### MR lists (add-mr-lists, 9 nov 2026)

- **Three lists** and **own screen** — Pau, 9 nov (decision log).
- **«Sigo» = Watch / star** (assumed): what the forges already record.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| `gh` / `glab` CLIs | Pau chose tokens (add-create-repo) |
| GraphQL | a second API shape for GitHub only; REST serves both |
| Polling only while the screen is open | the rail counter would be wrong until the first visit |
| Combined commit status on GitHub | misses Actions, which report as check runs |

#### Decision log, answers as given (2026-11-09)
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Qué tres listas? → A: las tuyas, las que te toca revisar, y las de otros en proyectos que sigues — Pau, 9 nov: «tus MRs y MRs donde estés tú como suscrito en el proyecto … O que te hayan puesto como reviewer».
- Q: ¿Qué es «seguir» un proyecto? → A: lo que ya marca cada forja: en GitHub los repos que vigilas («Watch»), en GitLab los proyectos con estrella; así no hay nada que configurar (assumed).
- Q: ¿Dónde viven? → A: en su propia pantalla «MR» en el carril, no en la barra lateral — Pau, 9 nov: «debería haber como una sub pantalla … porque si no, toda la barra lateral se llena».
- Q: ¿Qué muestra cada fila? → A: título, proyecto, autor, CI (pasa, falla, en curso, sin CI), tamaño (+/− y archivos) y antigüedad; pulsarla abre la MR en el navegador (assumed).
- Q: ¿Límites? → A: los 10 proyectos seguidos con actividad más reciente por forja; cada lista cortada en 50 con «Hay más: ábrelas en {forja}»; como mucho 60 detalles por forja y refresco (assumed).
- Q: (spec-reviewer) ¿Tamaño en GitLab? → A: su API no da líneas por MR: GitLab muestra archivos; GitHub, +/− y archivos (assumed).
- Q: (spec-reviewer) ¿Cuándo se carga para el contador del carril? → A: al arrancar Atril, cada 5 minutos, al abrir la pantalla y con «Actualizar» (assumed).
- Q: (spec-reviewer) ¿W52 solo deja abrir enlaces de repos creados? → A: se amplía a «creados o de la última lista»; la lista se reemplaza en cada carga (assumed).
- Q: (spec-reviewer) ¿El revisor en GitLab? → A: `reviewer_username` con la cuenta guardada; nada cambia en el almacén (assumed).

### MR scores (add-mr-scores, 9 nov 2026)

- **Sonnet, through Claude Code** — Pau, 9 nov.
- **Only mine and to review** — Pau, 9 nov.
- **On demand, cached by commit** (assumed): every score costs quota.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Score every listed MR automatically | spends quota on MRs nobody opens |
| The Anthropic API with a key | Pau uses the subscription; `claude -p` needs no key |
| Diff in the prompt argument | argv has a size limit and shows in process lists |
| Per-language complexity tools now | needs a checkout and toolchains per repo; out until a checkout exists |

#### Decision log, answers as given (2026-11-09)
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Qué motor? → A: «sonnet» — Pau, 9 nov; vía `claude -p` con la suscripción, sin clave de API.
- Q: ¿Qué se puntúa? → A: solo Mías y Me toca revisar — Pau, 9 nov: «solo debería revisar como mucho las que son reviewer o las mías».
- Q: ¿Cuándo? → A: bajo demanda, con «Puntuar»; nunca solo, porque gasta la cuota de Claude — Pau cuida el consumo (assumed).
- Q: ¿Se repite? → A: no mientras la MR no cambie: caché por MR y commit; un commit nuevo marca la puntuación como anterior y ofrece «Puntuar de nuevo» (assumed).
- Q: ¿Qué decide y qué explica? → A: lo determinista (tamaño, archivos, tests) se calcula sin IA y va primero; Sonnet da dificultad y riesgo de 1 a 5, qué hace, por qué y dónde mirar (assumed).
- Q: ¿Cómo se llama a Claude? → A: verificado 9 nov con Claude Code 2.1.319: `claude -p --model sonnet --output-format json --tools "" --no-session-persistence --json-schema <schema> "<instrucción>"`, el diff por stdin; la respuesta trae `structured_output` (assumed para el resto de flags).

- Q: (spec-reviewer) ¿Dueño de `scores.ts` y del runner? → A: `mr` gobierna `src/main/forge/scores.ts`; el runner con stdin y tiempo máximo es de workspaces (W53) (assumed).
- Q: (spec-reviewer) ¿Qué es un archivo de test? → A: un segmento `test`, `tests`, `spec`, `specs` o `__tests__`, o un nombre `*.test.*`, `*.spec.*`, `*_test.*` o `*Test.php|java|kt|cs`; sin distinguir mayúsculas (assumed).
- Q: (spec-reviewer) ¿Qué diff da cada forja? → A: GitHub el texto de `pulls/{n}` con `Accept: application/vnd.github.diff` (un 406 es «demasiado grande»); GitLab `/diffs?per_page=100` hasta 10 páginas, montado en un diff unificado con cabeceras `diff --git`/`---`/`+++`; los archivos que GitLab recorta cuentan con nota (assumed).
- Q: (spec-reviewer) ¿Y si no llega el diff, o Claude se cuelga? → A: los textos de M6, nada guardado; Claude tiene 180 s y se mata; `{detail}` es un código, nunca stderr (assumed).
- Q: (spec-reviewer) ¿Qué commit se guarda? → A: el del diff puntuado (GitHub lo lee de `pulls/{n}` al puntuar; GitLab lo trae la lista); una fila sin commit conocido no muestra «anterior» (assumed).
- Q: (spec-reviewer) ¿Doble clic? → A: la misma puntuación en curso, sin otra llamada (assumed).
- Q: (spec-reviewer) ¿Puntuación guardada tras cambiar de idioma? → A: se muestra en el idioma en que se hizo (assumed).

## Task breakdown

## Verification criteria

### MR lists (add-mr-lists, 9 nov 2026)

- **M1** When the lists load, Atril shall put in **Mías** the open MRs you authored, in **Me toca
  revisar** the open MRs where your review is requested, and in **Sigo** other people's open MRs in
  your followed projects.
  Proof: src/main/forge/mrs.test.ts lists mine, to review and followed from both forges
- **M2** An MR that belongs to an earlier list shall not repeat in a later one (order: Mías, Me toca
  revisar, Sigo).
  Proof: src/main/forge/mrs.test.ts an mr shows once
- **M3** Each row shall show the title, the project, the author, the CI state, the size — «+added
  −removed · N archivos» on GitHub, «N archivos» on GitLab — and the age («hace 3 h», «hace 2 d»).
  Proof: src/renderer/mr/mrs.test.ts the mr screen shows three lists with their rows
- **M4** The CI state shall be «Falla» for GitHub check-run conclusions failure, timed_out,
  cancelled or action_required and GitLab pipelines failed or canceled; «En curso» for check runs
  queued or in progress and pipelines running, pending, created, preparing, waiting_for_resource or
  scheduled; «Pasa» when every check run concluded success, neutral or skipped and for pipelines
  success, skipped or manual; and «Sin CI» with no check runs or no pipeline.
  Proof: src/main/forge/mrs.test.ts ci states map to four words
- **M5** When the person activates a row, Atril shall open that MR in the browser.
  Proof: src/renderer/mr/mrs.test.ts the mr screen shows three lists with their rows
- **M6** If one of a forge's requests fails, then the screen shall show for that forge «{forge} ha
  rechazado el token: reemplázalo en Ajustes» on 401, «{forge} ha respondido {status}» on another
  status, or «No se ha podido conectar con {forge} ({detail}).» on a network failure, keep every MR
  that forge did return, and keep the other forge's MRs.
  Proof: src/main/forge/mrs.test.ts one forge failing keeps the other
- **M7** While no forge is connected the screen shall say «Conecta GitHub o GitLab en Ajustes» with
  a button that opens Ajustes.
  Proof: src/renderer/mr/mrs.test.ts no forge connected points to ajustes
- **M8** Atril shall follow per forge the 10 followed projects with the most recent activity, cut
  each list at 50 rows with «Hay más: ábrelas en {forge}» when more existed, and fetch at most 60 MR
  details per forge and refresh.
  Proof: src/main/forge/mrs.test.ts caps keep a refresh bounded
- **M9** Atril shall load the lists when it starts, every 5 minutes, when the MR screen opens and on
  «Actualizar», and the rail shall show the «MR» entry with the number of MRs in «Me toca revisar»
  from the latest load whenever it is not zero.
  Proof: src/renderer/mr/mrs.test.ts the lists refresh and the rail counts reviews

### MR scores (add-mr-scores, 9 nov 2026)

- **M10** Atril shall measure from the diff alone the added and removed lines (header lines excluded),
  the files, whether a test file changed — a path segment `test`, `tests`, `spec`, `specs` or
  `__tests__`, or a name `*.test.*`, `*.spec.*` or `*_test.*` ignoring case, or `*Test.{php,java,kt,cs}`
  with a capital T, so `latest.ts` and `latest.php` are not one — and a size of S below 100 changed lines, M below 400, L below 1000
  and XL from 1000.
  Proof: src/main/forge/scores.test.ts metrics come from the diff alone
- **M11** When an MR is scored, Atril shall run `claude` with exactly `-p --model sonnet
  --output-format json --tools "" --no-session-persistence --json-schema <schema>` and an instruction
  that names the person's language, send the diff on stdin — cut at 120 KB (UTF-8 bytes) at the last
  file boundary before it, with a line telling Claude it was cut — and take difficulty, risk, what,
  why and where from `structured_output`.
  Proof: src/main/forge/scores.test.ts scoring runs claude with no tools and the diff on stdin
- **M16** If the diff cannot be fetched, then Atril shall show «No se ha podido traer el diff:
  {detail}» with M6's texts as the detail (and «es demasiado grande para {forge}» on GitHub's 406);
  if Claude exits non-zero, runs past 180 s (then it is killed) or answers outside the schema, Atril
  shall show «Claude no ha podido puntuar esta MR ({detail})» with the exit code, «tiempo agotado» or
  «respuesta fuera del esquema» — never its output — and in both cases store nothing.
  Proof: src/main/forge/scores.test.ts failures store nothing and say why
- **M12** Only rows in Mías and Me toca revisar shall offer Puntuar.
  Proof: src/renderer/mr/scores.test.ts only mine and to review can be scored
- **M17** Main shall score only an URL that is in Mías or Me toca revisar of its latest listing, checked
  when asked; anything else shall be refused without fetching or running anything.
  Proof: src/main/forge/scores.test.ts only listed mine and review urls are scored
- **M13** A score shall be stored with the head commit of the diff it scored; asking again for that
  commit shall not run Claude, and a row whose listed head commit is known and differs shall show the
  stored score as «De un commit anterior» with Puntuar de nuevo.
  Proof: src/main/forge/scores.test.ts a score is kept per commit
  Proof: src/renderer/mr/scores.test.ts the score view puts the measures first
- **M14** Atril shall run at most one score at a time, the rest in the order asked; asking again for an
  URL already queued or running shall return that same run.
  Proof: src/main/forge/scores.test.ts scores run one at a time
- **M15** The score view shall show the measured values first, then Claude's, and when the diff was
  cut say «Claude vio {seen} de {total} KB»; each row's state shall read «En cola», «Puntuando…», its
  chips, or an error.
  Proof: src/renderer/mr/scores.test.ts the score view puts the measures first
