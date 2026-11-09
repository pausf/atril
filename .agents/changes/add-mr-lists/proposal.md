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
- Q: ¿Límites? → A: como mucho 10 proyectos seguidos y 50 MRs con detalle por lista; se refresca al abrir, cada 5 minutos con la pantalla a la vista y con «Actualizar» (assumed).

## Outcomes

- The rail has an **MR** screen with three foldable lists — **Mías**, **Me toca revisar**, **Sigo**
  — mixing GitHub and GitLab, each row with title, project, author, CI, size and age; a row opens
  the MR in the browser. The rail shows how many MRs wait for your review.
- With no forge connected the screen says so and links to Ajustes; one forge failing shows its
  error in its place while the other's MRs still show.

## Scope boundaries

**In:** listing, the row fields, opening in the browser, refresh, the rail counter. **Out:** scores
(add-mr-scores), threads and replies (add-mr-threads), notifications (add-avisos), closed or
merged MRs, organisations' MRs you neither wrote, review nor follow, configuring which projects
you follow inside Atril.

**Never scoped out:** tokens stay in main (S25); forge requests never follow redirects (W50); main
opens only URLs it listed; the screen is keyboard-operable (rows are buttons).

## Constraints

- REST only, with the stored tokens: GitHub `search/issues` and `pulls`, GitLab
  `merge_requests` and `projects?starred=true`.
- No new dependency; same fetch timeout and error-code rules as the forge check (S20).

## Prior decisions

- **Three lists** — Pau, 9 nov (decision log).
- **Own screen** — Pau, 9 nov (decision log).
- **«Sigo» = Watch / star** (assumed): what the forges already record.

## Task breakdown

- Main: fetch, normalise and cap the three lists per forge; the open-URL guard.
- Renderer: the MR screen, the rail entry and counter, refresh.

## Verification criteria

- **M1** When the MR screen loads, Atril shall list as **Mías** the open MRs you authored, as **Me
  toca revisar** the open MRs where your review is requested, and as **Sigo** other people's open
  MRs in the repos you watch on GitHub and the projects you starred on GitLab — an MR appearing
  in an earlier list shall not repeat in a later one.
  Proof: src/main/forge/mrs.test.ts lists mine, to review and followed from both forges
- **M2** Each row shall show the title, the project, the author, the CI state as one of «Pasa»,
  «Falla», «En curso» or «Sin CI», the size as +added −removed and files, and the age.
  Proof: src/main/forge/mrs.test.ts lists mine, to review and followed from both forges
  Proof: src/renderer/mr/mrs.test.ts the mr screen shows three lists with their rows
- **M3** When the person activates a row, Atril shall open that MR in the browser, and main shall
  open only URLs present in its last listing.
  Proof: src/renderer/mr/mrs.test.ts the mr screen shows three lists with their rows
  Proof: src/main/forge/guards.test.ts only links and folders main handed out are accepted
- **M4** If a forge's request fails, then that forge's error shall show in its place while the other
  forge's MRs still show; while no forge is connected the screen shall say «Conecta GitHub o GitLab
  en Ajustes» with a button that opens Ajustes.
  Proof: src/main/forge/mrs.test.ts one forge failing keeps the other
  Proof: src/renderer/mr/mrs.test.ts no forge connected points to ajustes
- **M5** Atril shall follow at most 10 projects per forge and fetch details for at most 50 MRs per
  list, and shall refresh the lists when the screen opens, every 5 minutes while it is shown, and
  on «Actualizar».
  Proof: src/main/forge/mrs.test.ts lists mine, to review and followed from both forges
  Proof: src/renderer/mr/mrs.test.ts the mr screen shows three lists with their rows
- **M6** The rail shall show an «MR» entry with the number of MRs in «Me toca revisar» when it is
  not zero.
  Proof: src/renderer/mr/mrs.test.ts the mr screen shows three lists with their rows

## Approach

### Summary

`src/main/forge/mrs.ts` exposes `listMrs(store, fetch)` → `{ mine, review, following, errors }`
with one normalised `MrItem` shape per row (forge, url, title, project, author, ci, added,
removed, files, updatedAt, draft). GitHub: `GET /search/issues?q=is:pr+is:open+author:@me`,
`…+review-requested:@me`, `GET /user/subscriptions` then `GET /repos/{o}/{r}/pulls?state=open`
for up to 10 repos; details from `GET /repos/{o}/{r}/pulls/{n}` and the head commit's
`/check-runs` (or combined `/status`). GitLab: `GET /merge_requests?scope=created_by_me&state=opened`,
`?scope=all&reviewer_id=<me>&state=opened`, `GET /projects?starred=true` then each project's
open MRs; details from `GET /projects/:id/merge_requests/:iid` (`head_pipeline`,
`changes_count`) and `/diffs` stats only when cheap. Details are fetched six at a time. The
IPC `atril:mr:list` returns the lists; `atril:mr:open` is guarded like W52. The renderer adds
`src/renderer/mr/MrScreen.tsx` and the rail entry.

### Technical context

Files: `src/main/forge/mrs.ts` (+test), `src/main/forge/guards.ts` (listed URLs), `src/main/index.ts`,
`src/preload/{api,index}.ts`, `src/renderer/mr/MrScreen.tsx` (+ `mrs.test.ts`),
`src/renderer/components/Rail.tsx`, `src/renderer/App.tsx`, `mockApi.ts`, catalog entries (S16),
`styles.css`, the sketch. Gates: typecheck, lint, test.

### The approach

- Normalising: GitHub `additions`, `deletions`, `changed_files`; GitLab `changes_count` as files and
  the diff stats' additions and deletions when the detail call gives them, else unknown (shown «—»).
- CI: GitHub check runs → any failure «Falla», any in progress «En curso», all success «Pasa», none
  «Sin CI»; GitLab `head_pipeline.status` mapped the same way.
- Dedupe by URL in list order (Mías, then Me toca revisar, then Sigo).
- Age from `updated_at`, shown as «hace 3 h» / «hace 2 d».

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| `gh` / `glab` CLIs | Pau chose tokens (add-create-repo) |
| GraphQL (one GitHub query for everything) | fewer calls but a second API shape to maintain for GitHub only; REST works for both |
| Choosing followed projects inside Atril | a second list to keep in sync with what the forges already record |

### Risks

| Risk | What catches it |
|---|---|
| Rate limits with many followed projects | caps of 10 projects and 50 details (M5); a 403/429 shows as that forge's error (M4) |
| GitLab diff stats unavailable on large MRs | size shows «—» rather than a wrong number |

### Validation and rollback

M1–M6 seen red first. Rollback: one revert.

### Complexity deliberately kept

- A six-at-a-time detail fetch: forty sequential calls would take seconds per refresh.

## Checklist

- [ ] main lists the three MR lists from both forges, normalised, deduped and capped, with the open guard · Closes: M1, M2, M3, M4, M5
- [ ] the MR screen, its rail entry and counter, refresh and the no-forge state · waits on box 1 · Closes: M2, M3, M4, M5, M6
