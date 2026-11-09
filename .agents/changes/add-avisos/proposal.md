Tracker: none
Targets: avisos
Durable decisions: the ones in Prior decisions below

# add-avisos

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

The **Avisos** screen: a feed of review requested, a comment on your MR, your agent opened an MR,
CI failed, a new MR in a project you follow, approvals and merges — filterable, each opening its
MR or workspace, with a counter in the rail. Needs add-mr-lists.

## Decision log

### Session 2026-11-09
- Q: «sigue con todo haz mejoras, nuevas features» — Pau, 9 nov → decisions taken with the recommended option, marked (assumed).
- Q: ¿De dónde salen los avisos? → A: de comparar cada carga de MR con la anterior y de los cambios de estado de los agentes; ninguna consulta extra a las forjas (assumed).
- Q: ¿Y la primera carga? → A: solo fija la referencia: no genera avisos (assumed).
- Q: ¿«Comentario nuevo»? → A: cuando sube el recuento de comentarios de una MR de Mías o Me toca revisar: GitHub `comments` de la búsqueda (siempre presente, misma fuente siempre), GitLab `user_notes_count`; tus propios comentarios también lo suben: límite nombrado (assumed).
- Q: (spec-reviewer) ¿Una lista recortada a 50? → A: esa lista de esa forja no da avisos de «nueva» ni de «ya no está» en esa carga (assumed).
- Q: (spec-reviewer) ¿Una MR en varias listas? → A: la referencia guarda el conjunto de listas de cada URL; las reglas de cada aviso dicen contra qué se comparan (assumed).
- Q: (spec-reviewer) ¿Trabajo borrado? → A: «Ese trabajo ya no está» (assumed).
- Q: ¿Cuántos se guardan? → A: los últimos 200, en `$ATRIL_HOME/avisos.json` (assumed).

## Outcomes

- The rail has **Avisos** with the number of unread notices. The screen lists them newest first —
  review requested, a new comment, CI failing, a new MR in what you follow, an MR no longer open,
  an MR you opened, an agent that needs you — each with its time, filterable by kind, and each
  opening its MR view, or its workspace for an agent.
- **Marcar todo leído** clears the unread count; opening a notice marks it read.

## Scope boundaries

**In:** deriving notices from MR listings and agent states, storing the last 200, the screen, the
rail counter, filters, marking read. **Out:** notices from forge webhooks or the forges'
notification APIs, approvals (not in the listing data), Mac notifications for MR notices (only the
existing needs-you one), per-kind mute settings.

**Never scoped out:** no extra forge request; notice text built from Atril's own words plus the
MR's title as `{detail}`, shown as text; the screen is keyboard-operable.

## Constraints

- Uses add-mr-lists' listing and the status tracker; `MrItem` gains `notes?`.
- New capability `avisos`: `src/main/avisos.ts` and `src/renderer/avisos/**`.

## Prior decisions

- **A feed apart from the sidebar** — Pau, 9 nov: «debería haber como una sub pantalla … donde vaya
  llegando como notificaciones … publica una MR o tienes una nueva MR por mirar … en un apartado».
- **Derived, not fetched** (assumed).

## Task breakdown

- Main: the diff between listings → notices, agent needs-you → notice, the store, IPC.
- Renderer: the Avisos screen, rail counter, filters, opening a notice.

## Verification criteria

- **V1** When an MR listing completes after a previous one, Atril shall add, with the MR title as
  detail: «Te piden revisión» for an URL in Me toca revisar that was not there before; «Comentario
  nuevo» when the `notes` count of an MR in Mías or Me toca revisar is higher than before; «La CI falla»
  when an MR in Mías was known with a CI state other than «Falla» and is now «Falla»; «MR nueva en lo
  que sigues» for an URL in Sigo that was in no list before; «Has abierto una MR» for an URL in Mías
  that was in no list before; and «Ya no está abierta» for an URL that was in Mías and is now in no
  list. A forge with an error in either listing, or a list cut at its cap (`more`), shall produce no
  notice of «new» or «gone» for that forge's rows of that list.
  (The proof asserts each of the six kinds, one input that triggers none, the failed-forge rule and
  the capped-list rule.)
  Proof: src/main/avisos.test.ts listings turn into notices
- **V2** The first listing after Atril starts with no stored baseline shall produce no notice.
  Proof: src/main/avisos.test.ts the first listing only sets the baseline
- **V3** When an agent enters «te necesita» — once per entry, where the needs-you Mac notification
  fires — Atril shall add «{branch} te necesita» linked to its workspace.
  Proof: src/main/avisos.test.ts an agent that needs you is a notice
- **V4** Atril shall keep the newest 200 notices — dropping the oldest, read or not — and the
  baseline in `$ATRIL_HOME/avisos.json` across restarts.
  Proof: src/main/avisos.test.ts notices survive a restart and stay bounded
- **V5** The rail shall show «Avisos» with the number of unread stored notices when it is not zero;
  the screen shall list them newest first with kind, title and time, filter by kind, and «Marcar todo
  leído» shall clear the count.
  (The proof asserts the badge, the order, a filter hiding other kinds, and the count going to zero.)
  Proof: src/renderer/avisos/avisos.test.ts the feed lists, filters and marks read
- **V6** Opening a notice shall mark it read and open its MR view when the MR is in the latest
  listing (held app-wide, M9), otherwise say «Esta MR ya no está en la lista»; an agent notice shall
  open its workspace, or say «Ese trabajo ya no está» when it is gone.
  Proof: src/renderer/avisos/avisos.test.ts a notice opens what it is about

## Approach

### Summary

`src/main/avisos.ts`: `createAvisos(store)` with `onListing(lists)`, `onNeedsYou(ws)`, `list()`,
`markRead(ids | 'all')`, persisting `{ baseline: { [url]: { lists, forge, notes?, ci? } }, items: Notice[] }`.
`index.ts` calls `onListing` after `listMrs` (also on the dev fake path) and `onNeedsYou` where the
needs-you Mac notification fires; IPC `atril:avisos:list`, `atril:avisos:markRead` and an
`atril:avisos:changed` push. The renderer adds `src/renderer/avisos/Avisos.tsx`, a rail entry with
a badge, and opens MR views through the MR screen's existing view.

### Technical context

Files: `src/main/avisos.ts` (+test), `src/main/forge/mrs.ts` (`notes`), `src/main/index.ts`,
`src/preload/{api,index}.ts`, `src/renderer/avisos/Avisos.tsx` (+ `avisos.test.ts`),
`src/renderer/components/Rail.tsx`, `src/renderer/App.tsx`, `mockApi.ts`, catalog, styles,
`bocetos/novedades.html`. Gates: typecheck, lint, test.

### The approach

- A forge with an error in the new or the previous listing keeps its previous baseline rows and adds
  no notice (V1), so a failed refresh never looks like "everything closed".
- Notice: `{ id, kind, at, read, title, url?, workspaceId?, forge? }`; ids are random.
- Opening an MR notice: App switches to the MR screen and passes `openUrl` to MrScreen, which opens
  that row's view.
- Ownership: `avisos` governs `src/main/avisos.ts` and `src/renderer/avisos/**` (workspaces
  excludes them at landing); the `notes` field and the `openUrl` prop are mr's, with no criterion
  change; `index.ts`, `Rail.tsx` and `App.tsx` stay workspaces'.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| The forges' notification APIs | more requests and two very different shapes; the listing already has what matters |
| A Mac notification per MR event | noise; the needs-you one stays the only interruption |

### Risks

| Risk | What catches it |
|---|---|
| A refresh that partly failed floods notices | failed forges keep their baseline (V1) |
| Comment counts differ between search and detail | only an increase of the same source counts |

### Validation and rollback

V1–V6 seen red first. Rollback: one revert; `avisos.json` is a plain file.

### Complexity deliberately kept

None.

## Checklist

- [ ] main: notes in the listing, notices from listings and needs-you, the store, IPC · Closes: V1, V2, V3, V4
- [ ] the window: Avisos screen, rail counter, filters, mark read, opening a notice · waits on box 1 · Closes: V5, V6
