Tracker: none
Targets: mr
Durable decisions: the ones in Prior decisions below

# add-mr-lists

## The ask, verbatim

Pau, 9 nov 2026:

> ya me gustaria hacer un software de gestion de MR de gitlab o github

> ok adelante , importate lo de claude code para ponerle puntuaciones etc.. de complejidad de IA como explica 530 de las notas etc....

> peor que sea muy parecido pero con flujo de LIBRETTO , las puntuaciones etcc revisor de gitlaby github, que cargue tus tearea de Jira

> donde se ve el tema de la putuacion el apartado de gitlab o github donde se ve la tarea ya en una PR o MR creada con puntuacion o ves MR de otra gente de tus proyectos en favoritos

> Hubhub, GitLab deberían ser tus MRs y MRs donde estés tú como suscrito en el proyecto, ¿vale? O que te hayan puesto como reviewer.

> como se ven los comentrios de gitbuh gitlab

> Pero no debería revisar todas, porque yo no voy a revisar todas las MRs. Entonces, solo debería revisar como mucho las que son reviewer o las mías, pero ya está.

> En DMRs, aparte de mostrar ahí en pequeñito, debería haber como una sub pantalla, ¿sabes? Donde vaya llegando como notificaciones de esa, publica una MR o tienes una nueva MR por mirar o cosas de esas, pero en un apartado, porque si no, toda la barra lateral se llena, ¿sabes? Es decir, imagínate que en mis giras hay como 7 y en trabajo en marcha hay como 5, no cabe, ¿no? En la lateral.

> sonnet

> no pongas codex

> Voy a configurar y que salga lo de GitLab, GitHub, estas cosas. ¿Cómo lo haremos? O sea, ¿qué token necesitará? ¿O cuándo pedirá el token? Etcétera, etcétera.

> o más que el token que haya una autentificación de Chrome, ¿no? ¿Sabes? O sea, conéctate a GitHub, conéctate a GitLab, conéctate a Jira, ¿sabes? Como si fuera una aplicación, no sé, lo que sea más fácil.

## The reading

Split from `add-mr-review` (9 nov), which held all of phase 2. Its notes on authentication are
superseded: GitHub and GitLab connect with write-only tokens in Ajustes (add-create-repo, S20).

The **MR** screen in the rail: three lists across GitHub and GitLab — the MRs you authored, the
MRs where you are a reviewer, and other people's open MRs in the projects you follow — each row
with title, project, author, CI status, size and age, opening the MR in the browser. Lists only;
no scores, no threads.

## Decision log

### Session 2026-11-09
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

## Outcomes

- The rail has an **MR** screen with three lists — **Mías**, **Me toca revisar**, **Sigo** — mixing
  GitHub and GitLab, each row with title, project, author, CI, size and age; a row opens the MR in
  the browser. The rail shows how many MRs wait for your review.
- With no forge connected the screen says so and opens Ajustes; a forge that fails shows its error
  while what it did return, and the other forge, still show.

## Scope boundaries

**In:** listing, the row fields, opening in the browser, refresh, the rail counter.
**Out:** scores (add-mr-scores), threads and replies (add-mr-threads), notifications (add-avisos),
closed or merged MRs, choosing followed projects inside Atril, line counts for GitLab MRs.

**Never scoped out:** tokens stay in main (S25); forge requests never follow redirects (W50); main
opens only URLs it listed or created (W52, amended in `spec-workspaces.md`); rows are buttons and
the lists use the foldable sections every screen uses (W28).

## Constraints

- REST only, with the stored tokens; no new dependency; 10 s per request; error codes, never
  messages, from network failures (S20).

## Prior decisions

- **Three lists** and **own screen** — Pau, 9 nov (decision log).
- **«Sigo» = Watch / star** (assumed): what the forges already record.

## Task breakdown

- Main: the lists per forge (fetch, normalise, dedupe, cap), the CI mapping, the listed-URL guard.
- Renderer: the MR screen, the rail entry and counter, the app-level refresh.

## Verification criteria

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
  status, or «No se ha podido conectar con {forge} ({detail})» on a network failure, keep every MR
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

## Approach

### Summary

`src/main/forge/mrs.ts` exposes `listMrs(store, fetch)` → `{ connected, mine, review, following,
more, errors }` with one `MrItem` per row (forge, url, title, project, author, ci, added?,
removed?, files?, updatedAt). It replaces the guard's listed-URL set on every call. The renderer
holds the result in an app-level hook that loads at start, every 5 minutes and on demand; the MR
screen and the rail read it.

### Technical context

Files: `src/main/forge/mrs.ts` (+test), `src/main/forge/guards.ts` (+ the listed set),
`src/main/index.ts` (`atril:mr:list`, `atril:mr:open`), `src/preload/{api,index}.ts`,
`src/renderer/mr/{MrScreen,useMrs}.tsx` (+ `mrs.test.ts`), `src/renderer/components/Rail.tsx`
(entry and badge), `src/renderer/App.tsx`, `mockApi.ts`, the catalog (S16), `styles.css`, the
sketch. Gates: typecheck, lint, test.

### The approach

- GitHub (`api.github.com`, Bearer): Mías `GET /search/issues?q=is:pr+is:open+author:@me&per_page=50`;
  Me toca revisar `…+review-requested:@me`; Sigo `GET /user/subscriptions?per_page=100`, sorted by
  `pushed_at` desc, first 10, then `GET /repos/{o}/{r}/pulls?state=open&per_page=50` each, minus your
  own. Details per MR: `GET /repos/{o}/{r}/pulls/{n}` (additions, deletions, changed_files, head sha,
  user, updated_at) and `GET /repos/{o}/{r}/commits/{sha}/check-runs`.
- GitLab (`<site>/api/v4`, PRIVATE-TOKEN): Mías `GET /merge_requests?scope=created_by_me&state=opened&per_page=50`;
  Me toca revisar `GET /merge_requests?scope=all&state=opened&reviewer_username=<account>&per_page=50`;
  Sigo `GET /projects?starred=true&order_by=last_activity_at&per_page=10`, then
  `GET /projects/:id/merge_requests?state=opened&per_page=50` each, minus your own. Details per MR:
  `GET /projects/:id/merge_requests/:iid` (`changes_count`, `head_pipeline.status`).
- Order of work: dedupe by URL across lists first, then fetch details six at a time up to 60 per
  forge; rows past that keep the list fields and show size and CI as «—».
- `ciState(...)` is one pure function per forge, tested by table (M4).
- Rail: a new `mr` screen with a badge prop; the no-forge state comes from `connected`.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| `gh` / `glab` CLIs | Pau chose tokens (add-create-repo) |
| GraphQL | a second API shape for GitHub only; REST serves both |
| Polling only while the screen is open | the rail counter would be wrong until the first visit |
| Combined commit status on GitHub | misses Actions, which report as check runs |

### Risks

| Risk | What catches it |
|---|---|
| Rate limits | the caps (M8); a 403/429 shows as that forge's status (M6) |
| GitHub watches every repo you can push to | only the 10 most recently pushed are followed (M8) |

### Validation and rollback

M1–M9 seen red first. Rollback: one revert.

### Complexity deliberately kept

- Six-at-a-time detail fetch: sixty sequential calls would take seconds per refresh.

## Checklist

- [ ] main lists the three MR lists from both forges, deduped, capped, with the CI mapping, the errors and the listed-URL guard · Closes: M1, M2, M4, M6, M8, W52
- [ ] the MR screen, the app-level refresh, the rail entry and counter, the no-forge state · waits on box 1 · Closes: M3, M5, M7, M9
