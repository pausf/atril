# Avisos

Governs: src/main/avisos.ts src/renderer/avisos/**

A feed of what changed in your MRs and agents, derived from successive MR listings and agent
states, with no extra forge request.

## Outcomes

### Avisos (add-avisos, 9 nov 2026)

- The rail has **Avisos** with the number of unread notices. The screen lists them newest first —
  review requested, a new comment, CI failing, a new MR in what you follow, an MR no longer open,
  an MR you opened, an agent that needs you — each with its time, filterable by kind, and each
  opening its MR view, or its workspace for an agent.
- **Marcar todo leído** clears the unread count; opening a notice marks it read.

## Scope boundaries

### Avisos (add-avisos, 9 nov 2026)

**In:** deriving notices from MR listings and agent states, storing the last 200, the screen, the
rail counter, filters, marking read. **Out:** notices from forge webhooks or the forges'
notification APIs, approvals (not in the listing data), Mac notifications for MR notices (only the
existing needs-you one), per-kind mute settings.

**Never scoped out:** no extra forge request; notice text built from Atril's own words plus the
MR's title as `{detail}`, shown as text; the screen is keyboard-operable.

## Constraints

### Avisos (add-avisos, 9 nov 2026)

- Uses add-mr-lists' listing and the status tracker; `MrItem` gains `notes?`.
- New capability `avisos`: `src/main/avisos.ts` and `src/renderer/avisos/**`.

## Prior decisions

### Avisos (add-avisos, 9 nov 2026)

- **A feed apart from the sidebar** — Pau, 9 nov: «debería haber como una sub pantalla … donde vaya
  llegando como notificaciones … publica una MR o tienes una nueva MR por mirar … en un apartado».
- **Derived, not fetched** (assumed).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| The forges' notification APIs | more requests and two very different shapes; the listing already has what matters |
| A Mac notification per MR event | noise; the needs-you one stays the only interruption |

#### Decision log, answers as given (2026-11-09)
- Q: «sigue con todo haz mejoras, nuevas features» — Pau, 9 nov → decisions taken with the recommended option, marked (assumed).
- Q: ¿De dónde salen los avisos? → A: de comparar cada carga de MR con la anterior y de los cambios de estado de los agentes; ninguna consulta extra a las forjas (assumed).
- Q: ¿Y la primera carga? → A: solo fija la referencia: no genera avisos (assumed).
- Q: ¿«Comentario nuevo»? → A: cuando sube el recuento de comentarios de una MR de Mías o Me toca revisar: GitHub `comments` de la búsqueda (siempre presente, misma fuente siempre), GitLab `user_notes_count`; tus propios comentarios también lo suben: límite nombrado (assumed).
- Q: (spec-reviewer) ¿Una lista recortada a 50? → A: esa lista de esa forja no da avisos de «nueva» ni de «ya no está» en esa carga (assumed).
- Q: (spec-reviewer) ¿Una MR en varias listas? → A: la referencia guarda el conjunto de listas de cada URL; las reglas de cada aviso dicen contra qué se comparan (assumed).
- Q: (spec-reviewer) ¿Trabajo borrado? → A: «Ese trabajo ya no está» (assumed).
- Q: ¿Cuántos se guardan? → A: los últimos 200, en `$ATRIL_HOME/avisos.json` (assumed).

## Task breakdown

## Verification criteria

### Avisos (add-avisos, 9 nov 2026)

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
