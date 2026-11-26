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

### Notifications (main) (notify-core, 12 nov 2026)

- Each notice names its work in its title («WEB-3535 te pregunta», «OPS-4131 se ha parado»), not just «Atril».
- Atril also notifies when an agent stops, when it has been waiting for you for N minutes, when two jobs touch the same file, when QA finishes, when CI passes again, when an MR is merged or closed and when the Claude quota reaches 80%; a failing CI reaches the Mac with «Arreglar con Claude».
- In Ajustes → Notificaciones you choose per type Mac / Solo Avisos / Nada, per group at once, the reminder minutes, focus mode, grouping and quiet hours; «Probar un aviso» fires a real one, and if macOS does not allow notifications it tells you so with «Abrir Ajustes del Sistema».
- Avisos stops piling up questions that were already answered, keeps what the agent asked, and learns about MRs even when the window is closed.

## Scope boundaries

### Avisos (add-avisos, 9 nov 2026)

**In:** deriving notices from MR listings and agent states, storing the last 200, the screen, the
rail counter, filters, marking read. **Out:** notices from forge webhooks or the forges'
notification APIs, approvals (not in the listing data), Mac notifications for MR notices (only the
existing needs-you one), per-kind mute settings.

**Never scoped out:** no extra forge request; notice text built from Atril's own words plus the
MR's title as `{detail}`, shown as text; the screen is keyboard-operable.

### Notifications (main) (notify-core, 12 nov 2026)

**In:** bugs 1–3 and 5–10 of `bocetos/notificaciones.md` §«Huecos y bugs»; the types `stopped`, `idle`, `radar`, `qa`, `cipass`, `merged`/`closed` and `quota`, and `ask`/`done` split apart; a failing CI on the Mac with its action; `$ATRIL_HOME/notifications.json`; the `notify.*` API the card will use.

**Out (named):** the Ajustes card, the Avisos screen and bug 4 (`notify-ui`); the phone app, Skills and «Afinar la petición» (other changes); the summary on return (idea 13); the Dock counter (idea 14); «a reviewer commented» and «you were approved» (idea 10, they need data the listing does not carry); «Libretto step ready» (idea 11); notices for Jira or forge outages (idea 12); the second notice at 95% quota; custom sounds; in-app notices (*toasts*); radar polling without a window.

**Never scoped out:** no notice triggers a call to Claude; forge and agent texts are shown as text, never as HTML; the whole card is keyboard-operable (radios with arrows, switches with space); a failure to save or read the permissions follows the errors rule.

## Constraints

### Avisos (add-avisos, 9 nov 2026)

- Uses add-mr-lists' listing and the status tracker; `MrItem` gains `notes?`.
- New capability `avisos`: `src/main/avisos.ts` and `src/renderer/avisos/**`.

### Notifications (main) (notify-core, 12 nov 2026)

- **No automatic call to Claude.** «Arreglar con Claude» and «Reabrir» only run when the person presses. The quota comes from the existing `usage.ts` poll; none is added.
- **Texts:** Spanish from Spain, through `t()` in main and `useT()` in the window, the key is the English text and each has its Spanish entry in `src/preload/i18n-es.ts`; the S16/S19 scans must stay green. The language is the one at the moment of showing (W48).
- **Colours:** only tokens from `:root` and `[data-theme='dark']`; the card uses grey + the accent (`--run`), as in the sketch.
- **Errors:** a sentence saying what happened and what you cannot do, a button that fixes it and the technical detail folded in «Ver detalle» (`Problem` component).
- **Titles:** a job's Mac notice carries its name in the title — `jiraKey`, or the branch if it has none — and the repo in the subtitle; MR ones carry the kind's phrase in the title and the MR title in the body.
- Atomic (`.tmp` + `rename`) and serialised writes, like `avisos.json` and `ui.json`.
- Tests with a temporary `ATRIL_HOME` and their own tmux socket; no `~/.claude.json`, no default tmux sessions, no real repos.

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
- Q: Where do notices come from? → A: from comparing each MR load with the previous one and from agent state changes; no extra queries to the forges (assumed).
- Q: And the first load? → A: it only sets the baseline: it produces no notices (assumed).
- Q: «Comentario nuevo»? → A: when the comment count of an MR in Mías or Me toca revisar goes up: GitHub `comments` from the search (always present, same source every time), GitLab `user_notes_count`; your own comments raise it too: named limit (assumed).
- Q: (spec-reviewer) A list cut at 50? → A: that forge's list gives no «new» or «gone» notices in that load (assumed).
- Q: (spec-reviewer) An MR in several lists? → A: the baseline keeps the set of lists of each URL; each notice's rules say what it is compared against (assumed).
- Q: (spec-reviewer) A deleted work? → A: «Ese trabajo ya no está» (assumed).
- Q: How many are kept? → A: the last 200, in `$ATRIL_HOME/avisos.json` (assumed).

### Notifications (main) (notify-core, 12 nov 2026)

- **Notices beyond «needs you» on the Mac** — Pau, 11 nov: «me gusta ya las notificaciones y todo». Replaces «Out: Mac notifications for MR notices … per-kind mute settings» of add-avisos (9 nov): now each type chooses.
- **Its own `notifications.json`** in `$ATRIL_HOME`, not `ui.json` (assumed, see Decision log). An unreadable file or an invalid field takes its defaults, like `ui.json`.
- **«Nada» neither interrupts nor stores** (assumed).
- **One request per MR leaving Mías**, at most 10 per listing, to tell merged from closed (assumed). Ceiling: with more than 10 MRs gone at once, the rest are left as «Ya no está abierta».
- **MR polling moves to main** (bug 10): main lists every 5 min if nobody has, window or not; the window keeps asking whenever it wants and that counts as a listing (assumed).
- **«Choca» only with a window** (assumed). Ceiling: with the window closed there are no clashes; if Pau misses it, main polls the radar every minute.
- **The «Lleva N min» wait lives in main's memory** (assumed). Ceiling: reopening Atril restarts it.
- **The macOS permission is read from `com.apple.ncprefs`** (assumed). Ceiling: if Apple changes the format, the problem is never shown (it fails towards «don't know», not towards a false block).
- **Question versus end of turn by text prefix** (assumed): avoids a new field in the state; today's state files stay valid.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Settings inside `ui.json` | `clean` drops unknown fields and `patchUi` already merges `folded` by hand; a third nested object complicates the file that is touched most |
| New `kind` field in the hook state | the text prefix already says it and today's states stay valid |
| Telling merged from closed without a request | the listing only carries open MRs: without a request there is no way |
| Group by work with macOS `groupId` | Electron does not offer it reliably on macOS; our own grouping is tested |
| Always poll the radar in main | a `git diff` of every job every few seconds with nobody looking |

#### Decision log, answers as given (2026-11-12)
- Q: Where are the notice settings stored? → A: in a file of their own, `$ATRIL_HOME/notifications.json`, not in `ui.json`: main reads it on every notice, `ui.json` is window state with a `clean` that drops what it does not know and a `patchUi` with special merging for `folded`; a damaged file only returns notices to their defaults (assumed). If wrong: a `notifications` field in `UiState` and criterion V7 changes file.
- Q: Does «Nada» store the notice in Avisos? → A: no; «Nada» neither interrupts nor stores: the card says «silenciado, no te avisa» (assumed). If wrong: V9 is inverted and «Nada» = «Solo Avisos» without a counter.
- Q: How is merged told from closed if the listing does not say? → A: one forge request for each MR that leaves Mías (at most 10 per listing); if it fails, today's «Ya no está abierta» remains (assumed). Deliberately breaks V1's «no extra query» for that single case. If wrong: a single «Ya no está abierta» type that opens the MR on the forge.
- Q: When is «QA terminada»? → A: the first time, since that job's QA was launched, that `report.json` has every criterion of the change as Pasa or Falla (none Sin probar or missing); once per run (assumed).
- Q: «Lleva N min esperándote» counts from when? → A: from when main sees the job enter `needs-you` (main's clock, in memory); reopening Atril restarts the count: named limit (assumed).
- Q: Question or end of turn, how is it known? → A: by the text prefix the hook already writes: «Te pregunta: » is a question, «Claude dice: » is an end of turn, no text or another one, question (assumed).
- Q: Does Claude Code's idle reminder (idle_prompt) count as a new question? → A: no; the hook leaves the previous state's text, options and time as they were (assumed).
- Q: What does «Agrupar» do? → A: at most one Mac notice every 120 s; what arrives inside that window is held and, when it closes, goes out alone if it is one or as «{n} agentes te necesitan» / «{n} avisos nuevos» if there are several (assumed).
- Q: Quiet hours and days? → A: from 19:00 to 09:00 by default (crosses midnight), off by default; the marked days (Sat and Sun by default) are silent all day; while quiet, what went to the Mac goes only to Avisos; no summary on return (assumed).
- Q: «Choca con otro trabajo» and the closed window? → A: it is computed when the radar is requested (the window requests it every 10 s); with the window closed there are no clash notices: named limit (assumed). If wrong: main polls the radar every minute without a window.
- Q: How is it known that macOS blocks notifications? → A: `defaults export com.apple.ncprefs -` and the entry for Atril's `bundle-id`; blocked if its `flags` lacks bit 25 (`0x2000000`); with no entry or unable to read it, «don't know» and the problem is not shown (assumed; the bit's meaning is not documented by Apple — checked in the QA round with Pau).
- Q: Does «Cerrar su trabajo» close without asking? → A: no; it opens the usual confirmation (W136) for that job (assumed).
- Q: «Arreglar con Claude» from the bubble? → A: brings Atril to the front on that MR and launches M30's «Arreglar CI con Claude» there, which already shows its result and its errors; it is a person's press, not an automatic call (assumed).
- Q: A notice at 95% quota? → A: no; the card only has 80% (assumed).

- Q: Does a type set to «Nada» keep moving the references (settled CI, `notes`, Mías)? → A: yes, always; only the notice is discarded. W184's request is not made if `merged` is on «Nada» (assumed). If wrong: when the mute is lifted an old notice would arrive.
- Q: Is «Claude ha terminado» (end of turn with no text) `ask` or `done`? → A: `done`; `ask` only with «Te pregunta: », «Claude te necesita», no text or another (assumed).
- Q: Does a notice held by the grouper look at focus and quiet again on release? → A: yes; if on release `route()` no longer says `mac`, it stays in Avisos only (assumed). Satisfies W78: it never reaches the Mac later.
- Q: Does W179's notice count in the 120 s window? → A: yes, as one; if held, its notices join the group one by one (assumed).
- Q: Who tests the eight focus combinations? → A: `focus.test.ts`, calling `route()`; V10 tests Nada/Avisos and quiet (assumed).
- Q: Does an old `report.json` count as QA finished? → A: no; it counts only if modified after `launchQa`; with no criteria in the change, there is no notice; restarting Atril disarms it (assumed, named ceiling).
- Q: Where does the GitLab project id come from? → A: the project path from the URL, encoded (`acme%2Fshop-web`), which the API accepts as an id (assumed).
- Q: Who stores the time of the last listing? → A: `lastMrs` in `index.ts` (the one QA-to-MR already uses); `mrpoll` reads and writes it (assumed).
- Q: Split the change? → A: yes, in two: `notify-core` (main) and `notify-ui` (Ajustes and Avisos), as the review proposed (assumed).
- Q: (Pau, 12 nov) «para una tarea tan pequeña tengo 40 avisos… cuando tenga 200 no es gestionable» (in the test, 32 of 40 were unread `agent` from just 3 jobs) → A: a single unread agent notice per job (V18), read ones expire after 7 days with a cap of 300 (V19, replaces V4's cap of 200, which becomes amended) and the counter counts jobs, not agent notices (V20, computed in the window: `src/renderer/avisos/Avisos.tsx`).
- Q: (Pau, 12 nov, comparing with Orca, whose counter «se limpia al visitar el trabajo») → A: opening a job marks its agent notices read (V21); the window tells main with `avisos.seen(id)`.

## Task breakdown

## Verification criteria

### Avisos (add-avisos, 9 nov 2026)

- **V1** When an MR listing completes after a previous one, Atril shall add, with the MR title as detail: «Te piden revisión» (`review`) for an URL in Me toca revisar that was not there before; «Comentario nuevo» (`comment`) when the `notes` count of an MR in Mías or Me toca revisar is higher than before; «MR nueva en lo que sigues» (`following`) for an URL in Sigo that was in no list before; «Has abierto una MR» (`opened`) for an URL in Mías that was in no list before. A forge with an error in either listing, or a list cut at its cap (`more`), shall produce no notice of «new» or «gone» for that forge's rows of that list. One test holds the four kinds and both rules, one assertion per kind.
  Proof: src/main/avisos.test.ts listings turn into notices
- **V2** The first listing after Atril starts with no stored baseline shall produce no notice.
  Proof: src/main/avisos.test.ts the first listing only sets the baseline
- **V3** When an agent enters «te necesita» (once per entry, W15), Atril shall add a notice of kind `done` when the hook text starts with «Claude dice: » or is exactly «Claude ha terminado», and `ask` otherwise (starts with «Te pregunta: », is «Claude te necesita», is missing or anything else), titled with the work's name (`jiraKey`, else the branch), linked to its workspace, and carrying the hook text as `detail` — except while Automático answers that wait by itself (W205, W206) or W199 shows it as working, when it adds none.
  Proof: src/main/avisos.test.ts an agent that needs you is a notice
  Proof: src/main/avisos.test.ts a question and an end of turn are different kinds
  Proof: src/main/status.test.ts automatic answers its own questions with the recommended option
- **V4** Atril shall keep the notices and the baseline in `$ATRIL_HOME/avisos.json` across restarts, bounded as V19 says: past 300, the oldest read go first, then the oldest unread.
  Proof: src/main/avisos.test.ts notices survive a restart and stay bounded
- **V5** The rail shall show «Avisos» with the number of unread stored notices when it is not zero;
  the screen shall list them newest first with kind, title and time, filter by kind, and «Marcar todo
  leído» shall clear the count.
  (The proof asserts the badge, the order, a filter hiding other kinds, and the count going to zero.)
  Proof: src/renderer/avisos/avisos.test.ts the feed lists, filters and marks read
- **V6** Opening a notice shall mark it read and: for `review`, `comment`, `ci`, `cipass`, `following` and `opened`, open its MR page (M43) when the MR is in the latest listing (held app-wide, M9), otherwise say «Esta MR ya no está en la lista»; for `merged`, `closed` and `gone`, open the MR in its forge; for `ask`, `done`, `idle`, `stopped`, `qa`, `radar` and the stored legacy `agent`, open its workspace (for `qa`, its QA screen; for `radar`, the first of the two), or say «Ese trabajo ya no está» when it is gone; for `quota`, open nothing beyond marking it read.
  Proof: src/renderer/avisos/avisos.test.ts a notice opens what it is about
  Proof: src/renderer/avisos/avisos.test.ts merged, closed and gone open the forge
### Notifications (main) (notify-core, 12 nov 2026)

- **V16** When an MR listing completes, Atril shall add «La CI falla» (`ci`) for an MR in Mías whose last settled CI state (`pass` or `fail`, ignoring `running` and `none`) was `pass` and is now `fail`, and «La CI vuelve a pasar» (`cipass`) when it was `fail` and is now `pass`.
  Proof: src/main/avisos.test.ts ci fail and pass count the last settled state across running
- **V17** When an URL that was in Mías is in no list after a listing, Atril shall add «MR fusionada» (`merged`) or «MR cerrada» (`closed`) as W184 answers, or «Ya no está abierta» (`gone`) when it answers nothing.
  Proof: src/main/avisos.test.ts an MR leaving Mías is merged, closed or gone
- **V18** When Atril adds an `ask`, `done` or `idle` notice for a workspace that already has an unread `ask`, `done`, `idle` or legacy `agent` notice, it shall replace that notice (new kind, title, detail and time, unread, moved to the top) instead of adding another, so a workspace never holds more than one unread agent notice.
  Proof: src/main/avisos.test.ts one unread agent notice per workspace
- **V19** Avisos shall drop read notices older than 7 days and, past 300 stored notices, the oldest read ones first, whenever it writes.
  Proof: src/main/avisos.test.ts old read notices are dropped
- **V20** The Avisos badge count shall be the number of workspaces with an unread agent notice (`ask`, `done`, `idle`, legacy `agent`) plus the other unread notices, counted once per notice (so with V18 it never exceeds one per workspace for agents). The count is computed in the window (`src/renderer/avisos/Avisos.tsx`).
  Proof: src/renderer/avisos/avisos.test.ts the badge counts what waits for you
- **V21** When the person opens a workspace (selects it in Trabajo or its notice), Atril shall mark read every unread `ask`, `done`, `idle` and legacy `agent` notice of that workspace. The window tells main through `avisos.seen(workspaceId)`.
  Proof: src/main/avisos.test.ts opening a work reads its agent notices
- **V7** Atril shall keep the notification settings in `$ATRIL_HOME/notifications.json` as `{ types: Record<key, 'mac'|'list'|'mute'>, idleMinutes, focus, group, quiet: { on, from, to, days } }`; a missing file, unreadable JSON, an unknown key or an invalid value shall read as that field's default (the table above, `idleMinutes` 15, `focus` true, `group` true, `quiet` `{ on: false, from: '19:00', to: '09:00', days: ['sat','sun'] }`); `idleMinutes` outside 5–120 or not a multiple of 5 shall read as 15; `from`/`to` not matching `HH:MM` shall read as their defaults.
  Proof: src/main/avisos.test.ts notification settings default and clean
- **V8** When a settings patch is saved, Atril shall merge it into the stored settings (`types` key by key, `quiet` field by field, others replaced), drop invalid fields, write the file atomically and answer the stored settings; two patches sent back to back shall both survive.
  Proof: src/main/avisos.test.ts settings patches merge and both survive
- **V9** If a notice's type is set to «Nada» (`mute`), then Atril shall neither store it in Avisos nor show it on the Mac, while still updating every reference V1, V16 and V17 compare against (so unmuting never fires a stale difference); `merged`, `closed` and `gone` follow the `merged` setting, and while it is `mute` W184 asks no forge.
  Proof: src/main/avisos.test.ts a muted type is neither stored nor shown
- **V10** Atril shall route each new notice with the pure `route(type, settings, { now, focusOn, windowFocused })`: `mute` → `mute`; `list` → `list`; `mac` → `list` while `settings.focus` and `focusOn` and `windowFocused`, `list` while W190's quiet hours hold at `now`, otherwise `mac`. A notice held by W189 is routed again when released. The eight focus combinations are W78's proof; this one holds `mute`, `list` and quiet hours.
  Proof: src/main/avisos.test.ts route honours the type, focus and quiet hours
- **V11** When a workspace leaves `needs-you` (to working, paused or stopped) or leaves the workspace list, Atril shall mark read every unread `ask`, `done`, `idle` and legacy `agent` notice of that workspace, and leave its other notices as they were. (Bug 1.)
  Proof: src/main/avisos.test.ts answered questions stop counting as unread
- **V12** When the person clicks a Mac notification that came from a stored notice, Atril shall mark that notice read; a grouped notification, or W179's, shall mark read every stored notice id it carries. (Bug 2.)
  Proof: src/main/avisos.test.ts clicking the Mac notice marks its notice read

### Notifications (Ajustes and Avisos) (notify-ui, 14 nov 2026)

- **V13** The Avisos screen shall show, under the title of an `ask` or `done` notice that has a `detail`, that text localised as the needs-you body is (S28), as plain text; a notice without `detail` shows its title alone. (Bug 4.)
  Proof: src/renderer/avisos/avisos.test.ts a question keeps what it asked
- **V14** The Avisos screen shall give each kind its own label — «te pregunta», «ha terminado su turno», «se ha parado», «te espera», «choca con otro trabajo», «QA terminada», «La CI vuelve a pasar», «MR fusionada», «MR cerrada», plus today's — and the kind filter shall list every kind present in the stored notices.
  Proof: src/renderer/avisos/avisos.test.ts every kind has its label and its filter
- **V15** Where a `merged` or `closed` notice's MR branch matches a non-review workspace of the same repo, the notice row shall offer «Cerrar su trabajo», which opens that workspace's close confirmation (W136) without closing anything by itself; with no matching workspace the button is absent.
  Proof: src/renderer/avisos/avisos.test.ts a merged MR offers to close its work
