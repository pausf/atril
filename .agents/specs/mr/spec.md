# MR

Governs: src/main/forge/mrs.ts src/renderer/mr/**

The MR screen: your merge requests on GitHub and GitLab, the ones you review, and the ones in
the projects you follow. Phase 2 of Atril; scores, threads and notifications build on it.

## Outcomes

### MR lists (add-mr-lists, 9 nov 2026)

- The rail has an **MR** screen with three lists — **Mías**, **Me toca revisar**, **Sigo** — mixing
  GitHub and GitLab, each row with title, project, author, CI, size and age; a row opens the MR in
  the browser. The rail shows how many MRs wait for your review.
- With no forge connected the screen says so and opens Ajustes; a forge that fails shows its error
  while what it did return, and the other forge, still show.

## Scope boundaries

### MR lists (add-mr-lists, 9 nov 2026)

**In:** listing, the row fields, opening in the browser, refresh, the rail counter.
**Out:** scores (add-mr-scores), threads and replies (add-mr-threads), notifications (add-avisos),
closed or merged MRs, choosing followed projects inside Atril, line counts for GitLab MRs.

**Never scoped out:** tokens stay in main (S25); forge requests never follow redirects (W50); main
opens only URLs it listed or created (W52, amended in `spec-workspaces.md`); rows are buttons and
the lists use the foldable sections every screen uses (W28).

## Constraints

### MR lists (add-mr-lists, 9 nov 2026)

- REST only, with the stored tokens; no new dependency; 10 s per request; error codes, never
  messages, from network failures (S20).

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
