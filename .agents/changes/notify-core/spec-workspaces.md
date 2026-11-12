# notify-core — workspaces

Targets: workspaces

Main's side of `notifications`: detecting each notice type and presenting the Mac notification. The contract, decision log and checklist live in `proposal.md`; the type table (keys, groups, defaults) is there too.

## Outcomes

- Main tells you, by the work's name, when an agent asks, ends its turn, stops, keeps waiting, collides with another work, finishes QA; when CI breaks or comes back; when an MR is merged or closed; when Claude's quota reaches 80 %.
- At most one Mac notification every 2 min when grouping is on; nothing on the Mac in quiet hours or, if you ask for it, in focus mode.
- MR notices keep coming with the window closed.

## Scope boundaries

**In:** `src/main/status.ts`, `src/main/avisos.ts`'s settings, `src/main/focus.ts`, new `src/main/notify.ts`, new `src/main/mrpoll.ts`, new `src/main/forge/outcome.ts`, `src/main/usage.ts`, `src/main/radar.ts`, `src/main/qa-report.ts`, `src/main/index.ts` wiring and IPC, `src/preload/**`, `resources/claude-hook.mjs`. **Out:** see `proposal.md` (summary on return, Dock badge, reviewer comments, 95 % quota, radar without a window).

## Constraints

- No detector runs `claude` or calls Anthropic beyond `usage.ts`'s existing poll.
- Every detector's first observation after Atril starts only sets its baseline (as V2 and the status first pass do).
- Notification texts are built with main's `t()` at the moment of showing (W48).

## Prior decisions

- See `proposal.md` → Prior decisions; all of them apply here.

## Task breakdown

- Status detectors; QA, radar and quota detectors; MR outcome and poll; presentation, grouping, permission, test.

## Verification criteria

- **W15** (amended) When a session enters `needs-you`, Atril shall add one `ask` or `done` notice (V3) and show it on the Mac only when `route()` (V10) answers `mac`; no other `ask` or `done` notice for that session until it leaves the state, except W176; W180's `idle` is a different kind and is allowed.
  Proof: src/main/status.test.ts notifies once per needs-you transition
- **W78** (amended) While the setting «Respetar el modo foco» is on, focus mode is on and the Atril window is focused (`isFocused()` at that moment; minimised, hidden or on another Space is not focused), main shall show no Mac notification of any type, keeping the notice in Avisos, and that notice shall not reach the Mac later; while the setting is off, focus mode shall not quiet anything. One test holds the eight combinations of setting on/off, focus on/off and window focused/not, through `route()`, for an `ask`, a `stopped` and a `ci`.
  Proof: src/main/focus.test.ts focus quiets every type only in front
- **N3** (amended) When the person replies to an `ask`, `done` or `idle` Mac notification, Atril shall type the reply into that workspace's agent pane as literal text followed by Enter, without bringing Atril to the front — except that, while the session's state file holds `options` (W74) and the trimmed reply is an integer from 1 to the number of options, Atril shall answer it as W75's `{ option: n - 1 }`; with `options` the reply placeholder shall read «Responde con 1–{n}». It shall send nothing for an empty reply, and if the workspace or its pane no longer exists it shall send nothing and show «{work}: no se pudo enviar, ese trabajo ya no está». (Bug 5.)
  Proof: src/main/reply.test.ts reply reaches only its own pane as literal text
  Proof: src/main/reply.test.ts a number answers the option with its key
- **W176** While a session stays in `needs-you`, when its state file's text changes from one starting «Claude dice: » to one starting «Te pregunta: », Atril shall add one new `ask` notice with the new text, once per such change. (Bug 3.)
  Proof: src/main/status.test.ts a question after an end of turn notifies again
- **W177** Main shall build each Mac notification as: for `ask` «{work} te pregunta» with the question after «Te pregunta: » as body (else «Claude te necesita»); `done` «{work} ha terminado su turno» with the hook text; `stopped` «{work} se ha parado» / «Su terminal se ha cerrado.»; `idle` «{work} te espera» / «Desde hace {m} min. Solo te lo recuerdo una vez.»; `qa` «QA terminada en {work}» / W181's count; `radar` «Dos trabajos tocan lo mismo» / W182's sentence; `review` «Te piden revisión», `comment` «Comentario nuevo en tu MR», `ci` «La CI falla en tu MR», `cipass` «La CI vuelve a pasar», `merged` «MR fusionada», `closed` «MR cerrada», `gone` «Ya no está abierta», `following` «MR nueva en lo que sigues», `opened` «Has abierto una MR», each with the MR title as body; `quota` W183's text. `{work}` is the record's `jiraKey`, else its branch; a work's notification carries its repo's name as subtitle; none is titled «Atril». (Bug 7.)
  Proof: src/main/notify.test.ts every type is titled by what it is about
- **W178** When a workspace's agent state goes from `working`, `needs-you` or `paused` to `stopped` after the first pass, Atril shall add one `stopped` notice for it; a workspace Atril is closing (between «Cerrar» and its record's removal) shall not count.
  Proof: src/main/status.test.ts an agent that stops is a notice
  Proof: src/main/status.test.ts closing a work from Atril is not a stop
- **W179** If two or more workspaces stop in the same refresh pass, then the Mac shall get one notification «{n} trabajos se han parado» with their names as body («A, B y C»), while Avisos keeps one `stopped` notice per workspace.
  Proof: src/main/status.test.ts several stops in one pass are one Mac notice
- **W180** When a workspace has been in `needs-you` for `idleMinutes` (V7) by main's clock since main saw it enter, Atril shall add one `idle` notice for it, once per entry; changing `idleMinutes` applies to waits in progress; a workspace that left `needs-you` before then gets none. The clock is main's memory: a workspace already in `needs-you` when Atril starts counts from that start.
  Proof: src/main/status.test.ts a long wait reminds you once
- **W181** When, after `launchQa` for a workspace, its `report.json`, modified after that launch, first holds every criterion of its change with status `pass` or `fail`, Atril shall add one `qa` notice with body «{p} pasan, {f} fallan.» (singular «1 pasa», «1 falla»); a later report change in the same run adds none; the next `launchQa` arms it again; a change with no criteria adds none; restarting Atril disarms it.
  Proof: src/main/qa-report.test.ts a finished QA run is one notice
- **W182** When a radar answer (W166) shows two workspaces sharing a file that the previous answer did not show them sharing, Atril shall add one `radar` notice per pair with body «{a} y {b} tocan {file}» for the first new file in sort order, plus « y {n} más» when there are more new ones; the first answer after start only sets the baseline; a file already shared never notifies again while it stays shared.
  Proof: src/main/radar.test.ts a new shared file is one notice per pair
- **W183** When a usage reading shows the five-hour or the seven-day window at 80 % or more and the previous reading of that window (same `resetsAt`) was below 80 %, Atril shall add one `quota` notice titled «Cuota de Claude al 80 %» with body «5 h al {pct} % · se reinicia a las {HH:MM}» or «7 días al {pct} % · se reinicia el {día}»; at most one per window per `resetsAt`; the first reading after start only sets the baseline; a reading with an error adds nothing.
  Proof: src/main/usage.test.ts the quota crossing 80 percent is one notice
- **W184** When an URL leaves Mías (V1), main shall ask its forge once — GitHub `GET /repos/{owner}/{repo}/pulls/{n}`, GitLab `GET /projects/{id}/merge_requests/{iid}` with `{id}` the URL's project path, encoded — and answer `merged` (GitHub `merged: true`, GitLab `state: merged`), `closed` (otherwise closed) or nothing (open, error, timeout of 10 s, no token); at most 10 such requests per listing, the rest answering nothing.
  Proof: src/main/forge/outcome.test.ts a vanished MR is merged, closed or unknown
- **W185** Main shall list MRs every 5 min when the latest listing (`lastMrs`, written by the window's listings and by main's) is older than 5 min or there is none, whether or not a window exists, feeding Avisos as the window's listings do; with no forge connected it shall not list. (Bug 10.)
  Proof: src/main/mrpoll.test.ts main lists when nobody has for five minutes
- **W186** A `ci` Mac notification shall carry the action «Arreglar con Claude»; choosing it shall bring Atril to the front on that MR's view and start M30's fix there, whose result and errors show as M30 says; clicking the notification opens the MR view.
  Proof: src/main/notify.test.ts ci offers to fix it with Claude
- **W187** A `merged` or `closed` Mac notification whose MR branch matches a non-review workspace of the same repo shall carry the action «Cerrar su trabajo»; choosing it shall bring Atril to the front with that workspace's close confirmation (W136) open; without a match it carries no action; clicking opens the MR in its forge.
  Proof: src/main/notify.test.ts a merged MR offers to close its work
- **W188** A `stopped` Mac notification for one workspace shall carry the action «Reabrir», which reopens it as W141 says (`reopenWorkspace`), a refusal (W142) showing as a Mac notification with its sentence; clicking opens its workspace.
  Proof: src/main/notify.test.ts a stopped agent offers to reopen
- **W189** While «Agrupar» is on, when a Mac notification is due less than 120 s after the last one shown, main shall hold it; 120 s after that last one, a single held notice shall show as itself and two or more as one notification «{n} agentes te necesitan» (all from workspaces) or «{n} avisos nuevos» (otherwise), body the first three names or titles; W179's notification counts as one slot and, if held, its notices join the group one by one; at release each held notice is routed again (V10) and only those still `mac` show; with none left, nothing shows. The joined «A, B y C» list ends with « y {k} más»; clicking it opens Avisos. While «Agrupar» is off, each shows at once.
  Proof: src/main/notify.test.ts grouping lets one notice through every two minutes
- **W190** While quiet hours are on, `inQuiet(now, quiet)` shall be true when `now`'s weekday is in `days`, or when its local time is in `[from, to)` — wrapping past midnight when `from` > `to`, empty when `from` = `to`. Cases: Tue 20:00 and Wed 08:59 with 19:00–09:00 are quiet, Wed 09:00 is not, Sat 12:00 with `sat` is quiet.
  Proof: src/main/avisos.test.ts quiet hours wrap midnight and cover whole days
- **W191** Main shall keep a reference to each shown Mac notification until it is clicked, replied to, acted on or closed, never more than the 50 newest; the «no se pudo enviar» notification shall be held the same way. (Bug 6.)
  Proof: src/main/notify.test.ts shown notifications stay referenced and bounded
- **W192** Main shall answer notification permission as `blocked` when `defaults export com.apple.ncprefs -` holds an `apps` entry whose `bundle-id` is Atril's and whose `flags` lacks bit 25 (`0x2000000`), `allowed` when it has it, and `unknown` when there is no entry or the command or its XML fails; «Abrir Ajustes del Sistema» shall open `x-apple.systempreferences:com.apple.Notifications-Settings.extension`. (Bug 9.)
  Proof: src/main/notify.test.ts permission reads macOS notification flags
- **W193** When the person asks for a test notification of a type, main shall show that type's example (S42's texts) on the Mac regardless of its setting, focus, quiet hours and grouping, add nothing to Avisos, and answer `blocked` when W192 says so.
  Proof: src/main/notify.test.ts a test notice skips every rule and the feed
- **W194** When the person clicks a Mac notification, main shall bring the window to the front and open what V6 says for its type (for `ask`, `done`, `idle` the Trabajo screen with that workspace, as W38), and mark its notice read (V12); a click within 1 s of a reply is ignored (N3).
  Proof: src/main/notify.test.ts a click opens what the notice is about
- **W195** When Claude Code's idle reminder fires (a `Notification` with `notification_type` `idle_prompt` or «waiting for your input») while the session's state file says `needs-you`, the hook shall keep that file's `text`, `options`, `multiSelect` and `at` as they were.
  Proof: src/main/agent.test.ts the idle reminder keeps the question
