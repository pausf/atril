# MR

Governs: src/main/forge/mrs.ts src/main/forge/scores.ts src/main/forge/threads.ts src/main/forge/lenses.ts src/renderer/mr/**

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

### MR threads (add-mr-threads, 9 nov 2026)

- Clicking an MR row opens the **MR view**: title, project, «Abrir en {forge}», and its threads
  — inline ones grouped by file and line with the code line they point at, general ones apart —
  each comment with author, time and text; GitLab threads say whether they are resolved.
- Threads where the last word is someone else's and you are involved are marked **Te toca
  responder** and counted in the view's header.
- Under each thread, a reply box and **Enviar** post the reply to the forge as you.

### Libretto lens drafts (add-mr-lens-drafts, 9 nov 2026)

- The MR view of an MR in Mías or Me toca revisar offers **Revisar con Libretto**. Claude Sonnet
  reads the diff through five lenses and returns findings; each shows as a **draft** with its lens,
  severity, file:line and text, and three actions: **Publicar** (a general comment on the MR that
  quotes the file and line), **Mandar al agente** (typed into the terminal of the workspace on that
  branch), **Descartar**.
- Drafts are kept per MR commit; a newer commit marks them as from an earlier commit.

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

### MR threads (add-mr-threads, 9 nov 2026)

**In:** reading threads for MRs of the latest listing, the «te toca responder» mark, posting a
reply to an existing thread or a new general comment. **Out:** starting a new inline comment on a
line, resolving or reopening threads, reactions, editing or deleting comments, suggestions, Libretto
lens drafts (add-mr-lens-drafts), rendering markdown (comments show as plain text).

**Never scoped out:** main reads and posts only for an MR in its latest listing (the W52 listed set);
a reply is sent only by the person's click and never twice for one click; comment text is shown as
text, never markup; tokens stay in main; requests never follow redirects; the view holds the
keyboard like the other modals.

### Libretto lens drafts (add-mr-lens-drafts, 9 nov 2026)

**In:** the review call, the drafts, publish as a general comment, send to the agent, discard, the
cache. **Out:** inline comments on the exact line, running `/libretto-review` with its five agents in a
worktree, automatic review, reviewing «Sigo», editing a draft before publishing (it can be discarded
and written by hand in the thread).

**Never scoped out:** Claude runs with no tools and the diff on stdin (as M11); nothing is published
or sent without the person's click, and each click acts once; tokens stay in main; draft text is
shown as text.

## Constraints

### MR lists (add-mr-lists, 9 nov 2026)

- REST only, with the stored tokens; no new dependency; 10 s per request; error codes, never
  messages, from network failures (S20).

### MR scores (add-mr-scores, 9 nov 2026)

- The runner gains stdin input; same no-shell rule (W-criteria).
- Diffs come from the forges with the stored tokens, `redirect: 'error'`, 10 s per request.

### MR threads (add-mr-threads, 9 nov 2026)

- REST with the stored tokens; `redirect: 'error'`; 10 s per request; M6's error texts.
- The `mr` capability; the view reuses the modal frame (`useModalKeys`, `dlg edmodal`).

### Libretto lens drafts (add-mr-lens-drafts, 9 nov 2026)

- Reuses scores' diff fetch, cut, queue, runner timeout and failure texts (M11, M14, M16, W53), the
  listed-only rule (M17), the thread posting endpoints (M21) and `replyToAgent` (N3).
- `MrItem` gains `branch?` (GitHub `head.ref` from the detail call, GitLab `source_branch`).

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

### MR threads (add-mr-threads, 9 nov 2026)

- **See the forge's comments in Atril** — Pau, 9 nov: «como se ven los comentrios de gitbuh gitlab».
- **Posting needs a click** (assumed): a reply is public and outward-facing.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| GitHub GraphQL review threads (gives resolved) | a second API for GitHub only; resolved status is the one gap |
| Rendering comments as markdown | a sanitiser or a library for little gain; plain text is safe |
| Replying from the browser only | Pau asked to see and answer them in Atril |

#### Decision log, answers as given (2026-11-09)
- Q: «sigue con todo haz mejoras, nuevas features» — Pau, 9 nov, evening → decisions taken with the recommended option, marked (assumed).
- Q: ¿Dónde se ven los hilos? → A: al pulsar una fila de MR se abre la vista de la MR (modal grande, como los documentos); «Abrir en {forge}» sigue ahí (assumed).
- Q: ¿Qué hilos? → A: GitHub: comentarios de revisión en líneas y comentarios generales; GitLab: discusiones. Agrupados por archivo y línea, los generales aparte (assumed).
- Q: ¿Resuelto? → A: solo GitLab lo da por REST (`resolved`); en GitHub no se muestra estado de resuelto (assumed).
- Q: ¿«Te toca responder»? → A: un hilo en el que has escrito, o de una MR tuya, cuyo último comentario es de otra persona (assumed).
- Q: ¿Responder publica? → A: sí, en la forja, y solo con tu clic en «Enviar»; nunca solo (assumed).
- Q: ¿Límites? → A: como mucho 300 comentarios por MR (3 páginas de 100); más, con nota «Hay más en {forja}» (assumed).
- Q: (spec-reviewer) ¿Y M5, que abre el navegador? → A: pulsar una fila abre la vista de la MR; el navegador queda en «Abrir en {forja}» (M5 reformulado) (assumed).
- Q: (spec-reviewer) ¿El límite y «te toca responder»? → A: 3 páginas de 100 elementos por endpoint; si se alcanza, la cabecera dice que el recuento puede estar incompleto (assumed).
- Q: (spec-reviewer) ¿GitLab: notas del sistema y comentarios sueltos? → A: las del sistema fuera; los comentarios sueltos (`individual_note`) forman un hilo «General», como los generales de GitHub; responder ahí crea un comentario general nuevo (assumed).
- Q: (spec-reviewer) ¿Y si la MR ya no está en la lista? → A: «Esta MR ya no está en la lista: actualiza», sin petición, con tu texto intacto (assumed).

### Libretto lens drafts (add-mr-lens-drafts, 9 nov 2026)

- **Lens findings as drafts** — Pau, 9 nov (phase-2 ask): the MR view's comments with Libretto's
  findings as drafts to publish, send to the agent, or discard.
- **One call, not five agents** (assumed): quota.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| `/libretto-review` with five lens agents in a worktree | five agents per MR; quota |
| Inline comments on the exact line | GitHub needs commit_id/side, GitLab a full position with three shas; later |
| Auto-review on every new commit | quota |

#### Decision log, answers as given (2026-11-09)
- Q: «sigue con todo haz mejoras, nuevas features» — Pau → decisions taken with the recommended option, marked (assumed).
- Q: ¿Las cinco lentes de `/libretto-review` en un worktree? → A: no: una sola llamada a Sonnet sin herramientas con el diff y las cinco lentes (intención, seguridad, diseño, fiabilidad, tests) en la instrucción; cinco agentes por MR gastarían demasiada cuota — Pau cuida el consumo (assumed).
- Q: ¿Cuándo? → A: bajo demanda, con «Revisar con Libretto», solo en Mías y Me toca revisar; guardado por commit como las puntuaciones (assumed).
- Q: ¿Publicar dónde? → A: como comentario general de la MR que cita archivo y línea; el comentario en la línea exacta queda para más adelante (assumed).
- Q: ¿Mandar al agente cuál? → A: el único trabajo vivo en la rama de la MR y en un repo cuyo `origin` es el proyecto de la MR; si hay cero o varios, no se ofrece (assumed).
- Q: (revisor) ¿Más de 12 hallazgos, texto largo, file/line ausentes, cero hallazgos? → A: fuera de esquema = fallo; sin ubicación se omite; cero es respuesta válida (assumed).
- Q: (revisor de obra) ¿Borradores de una MR sin commit conocido? → A: se rechaza la revisión antes de gastar cuota; ¿mismo proyecto en otra forja? → A: el origin también debe nombrar el host (assumed).
- Q: (revisor) ¿Cola compartida con las puntuaciones? → A: un solo runner, claves por tipo y URL (assumed).

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
- **M5** When the person activates a row, Atril shall open the MR view (M23); the view's
  «Abrir en {forge}» shall open that MR in the browser.
  Proof: src/renderer/mr/threads.test.ts a row opens the mr view with its threads
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

### MR threads (add-mr-threads, 9 nov 2026)

- **M18** When the MR view opens, Atril shall show its threads, comments oldest first: on GitHub,
  review comments (`GET /repos/{o}/{r}/pulls/{n}/comments`) grouped by their root
  (`in_reply_to_id`), each carrying `path`, `line` (else `original_line`) and the last line of
  `diff_hunk`, and the general comments (`GET /repos/{o}/{r}/issues/{n}/comments`) as one «General»
  thread; on GitLab, discussions (`GET /projects/:id/merge_requests/:iid/discussions`) without
  system notes, positioned ones carrying `new_path` (else `old_path`) and `new_line` (else
  `old_line`), the individual notes together as one «General» thread, and a thread resolved when
  every resolvable note in it is resolved. A thread with a file but no line shall show as a file
  thread.
  Proof: src/main/forge/threads.test.ts threads come from both forges
- **M19** Atril shall fetch at most 3 pages of 100 items per endpoint; when more exist it shall say
  «Hay más en {forge}: “Te toca responder” puede estar incompleto».
  Proof: src/main/forge/threads.test.ts threads are capped
- **M20** A thread shall be marked «Te toca responder» when its last comment is not yours and either
  you wrote an earlier comment in it or you authored the MR (the author taken from the listing).
  Proof: src/main/forge/threads.test.ts your turn is the last word of someone else
- **M24** The MR view's header shall show how many threads are marked «Te toca responder».
  Proof: src/renderer/mr/threads.test.ts a row opens the mr view with its threads
- **M21** When the person writes a reply and clicks Enviar, Atril shall post it once — GitHub `POST
  /repos/{o}/{r}/pulls/{n}/comments/{root}/replies` for a review thread and `POST
  /repos/{o}/{r}/issues/{n}/comments` for «General»; GitLab `POST
  /projects/:id/merge_requests/:iid/discussions/:id/notes` for a discussion and `POST
  /projects/:id/merge_requests/:iid/notes` for «General» — then show it in the thread; an empty reply
  shall not be sent, and a failure shall keep the text in the box with M6's message.
  Proof: src/main/forge/threads.test.ts a reply is posted once to the right place
  Proof: src/renderer/mr/threads.test.ts a reply is sent with one click and kept on failure
- **M22** If the MR is not in main's latest listing, then reading or posting its threads shall be
  refused without a request, the view saying «Esta MR ya no está en la lista: actualiza» and keeping
  any written text.
  Proof: src/main/forge/threads.test.ts only listed mrs are read or answered
- **M23** The MR view shall show the threads as text (markup in a comment shows literally), and
  close with Escape — asking first when a reply box has unsent text.
  Proof: src/renderer/mr/threads.test.ts a row opens the mr view with its threads

### Libretto lens drafts (add-mr-lens-drafts, 9 nov 2026)

- **M25** When the person clicks Revisar con Libretto on an MR in Mías or Me toca revisar, Atril shall
  run `claude` exactly as M11 (no tools, no session, the diff on stdin cut at 120 KB) with a schema of
  at most 12 findings `{ lens: intent|security|design|reliability|tests, severity: high|medium|low,
  file?, line?, text ≤ 400 }`; a reply outside the schema, a fetch failure or a timeout shall show
  «Claude no ha podido revisar esta MR: {detail}» (M16's details) and store nothing; zero findings is
  an answer and shows «Libretto no ha encontrado nada que comentar». An URL outside those two lists
  of the latest listing shall be refused without a request (M17's text). Reviews and scores share one
  runner, one at a time in the order asked, keyed by kind and URL (M14 per kind).
  Proof: src/main/forge/lenses.test.ts the lens review runs claude like the score and keeps drafts
- **M26** Drafts shall be stored per MR and head commit (no known head: the review is refused before Claude runs, «No se sabe el último commit de esta MR: actualiza»); while drafts
  exist for the current head the button is not offered; on a newer head the list shows «De un commit
  anterior» with «Revisar de nuevo», whose result replaces every draft.
  Proof: src/main/forge/lenses.test.ts drafts are kept per commit
- **M27** When the person clicks Publicar on an open draft, Atril shall post once, as the MR's general
  comment (M21), «**{lens} · {severity}** — `{file}:{line}`» (the location part dropped when `file`
  is absent, `:{line}` when `line` is), a blank line, then the text as written; then mark it
  published. A failure shall keep it open with M6's message. Publishing, sending or discarding a
  draft that is not open, or of an MR outside the latest listing, shall be refused without a request.
  Proof: src/main/forge/lenses.test.ts a draft is published once as a general comment
- **M28** Main shall offer Mandar al agente for an MR only when exactly one workspace is alive, on the
  MR's branch, in a repo whose `origin` remote names the MR's host and project; sending shall type, as N3,
  «Revisión de Libretto ({lens}, {severity}) en {location}: {text}» (location as M27, «la MR» when
  absent), mark the draft sent on `sent`, and on `gone` or `ignored` keep it open with N3's message.
  Proof: src/main/forge/lenses.test.ts a draft goes to the one agent on that branch
- **M29** The MR view shall show each draft as text, with Publicar, Mandar al agente (only when main
  offers it) and Descartar while open, and «Publicado» or «Enviado al agente» with no actions after;
  Descartar removes it.
  Proof: src/renderer/mr/lenses.test.ts drafts can be published, sent or discarded
