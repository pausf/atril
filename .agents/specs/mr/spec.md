# MR

Governs: src/main/forge/mrs.ts src/main/forge/page.ts src/main/forge/merge.ts src/main/forge/scores.ts src/main/forge/threads.ts src/main/forge/lenses.ts src/main/forge/openmr.ts src/main/forge/linecomments.ts src/renderer/mr/**

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

### Fix CI with Claude (fix-ci-with-claude, 10 nov 2026)

- On an MR whose CI is «Falla» and whose job is alive in Atril, «Arreglar CI con Claude» types the request into the
  terminal of that agent and says «Enviado a {rama}».
- Without exactly one job in Atril, the button does not show.

### Open an MR in Atril (open-work-from-mr, 10 nov 2026)

- On an MR to review, one click opens Claude reviewing it with Libretto, in its own review-project worktree.
- On your own MR, one click leaves a job on its branch with Libretto resuming the change in progress (or asking you which one, if there are several or none).
- If a job already exists, it takes you to it; if the repo is missing, it tells you where to add it; if there is an error, you see it on the MR.

### Comments on their line (mr-line-comments, 10 nov 2026)

- A Libretto draft with a file and a line shows on the MR right at that line of the diff; if that is not possible, as a
  general comment as before, and Atril says which one it was.

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

- With the forge down or the token rejected, the MR list says the cause with its button and does not show «Ninguna MR.».

### QA on the MR (qa-to-mr, 11 nov 2026)

- A failure when publishing to an MR brings, besides its sentence, the folded code and its fix (W150), also from QA.

### MR page (mr-page, 19 nov 2026)

- Clicking an MR opens its page inside the MR screen, with no modal and across the full width (the inbox hides; J/K move to another MR): in the centre its code with every thread and every Libretto draft on its line, and on the right the score, «Contra su spec», the reviewers and the CI.
- A single «Revisar ▾» offers Puntuar, Comentar and A fondo, each where it was already available and doing what it already did; the header has no long-text buttons.
- In Mías, an MR that the forge lets you merge brings «Fusionar», which asks first and merges once; an MR in conflict says so on its row and on its page.
- The lens review reads the MR's title and description, and the job's request if it is in Atril, before giving an opinion on the diff.

### MR across the width (mr-page-wide, 20 nov 2026)

With an MR open, the code reads across the full width: the inbox takes no space, the cards are 300 px (240 under 1100 px) and you go from one MR to the next with J/K without going back. In the inbox, nothing is mounted on top of another row.

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

### Fix CI with Claude (fix-ci-with-claude, 10 nov 2026)

**In:** the query for whether there is an agent, the action, the button and its state.
**Out:** opening a new job; reading the CI logs from Atril; retrying the CI; pushing changes.
**Never scoped out:** the text is typed literally (no special keys), like the W-quick-replies; nothing is sent
without a press; the button works with the keyboard.

### Open an MR in Atril (open-work-from-mr, 10 nov 2026)

**In:** the three states of the button in the MR view, the repo choice, the review session, the job
on an existing branch, «Ir al trabajo», the errors in the view.
**Out:** cloning repos; MRs from forks with no remote naming them; choosing the command; automatic mode.
**Never scoped out:** Atril does not touch git in the person's copy (review-project, if it switches branch, restores as always); the validated URL as one argv element; nothing without a press.

### Comments on their line (mr-line-comments, 10 nov 2026)

**In:** publishing inline on GitHub and GitLab, the general fallback, the note, the old head.
**Out:** commenting by hand on the diff; applicable suggestions («suggestion»); multiline threads; editing what was published.
**Never scoped out:** it is published once (M27); the text goes as is, with no HTML; the token never leaves main.

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

**In:** `src/main/forge/mrs.ts`, `src/renderer/mr/MrScreen.tsx`. **Out:** threads, scores, lenses and line comments (they only take the new sentence).

### QA on the MR (qa-to-mr, 11 nov 2026)

**In:** `src/main/forge/threads.ts` (`reply`), `src/main/forge/openmr.ts` (`remoteNaming` exported). **Out:** the rest of the MR screen.

### MR page (mr-page, 19 nov 2026)

**In:** `src/renderer/mr/**` (the page, the inbox as a column, the «Revisar ▾» menu, the cards, the «Fusionar» confirmation, the conflict tag; `MrView.tsx` stops being a modal and so does `ScoreView.tsx`); `src/main/forge/mrs.ts` (merge state, conflict and target branch on the row); `src/main/forge/threads.ts` (the side of each thread); `src/main/forge/lenses.ts` (the request before the diff); new `src/main/forge/page.ts` (diff into files and lines, reviewers, contract) and `src/main/forge/merge.ts` (merging); the IPC wiring in `src/main/index.ts` and `src/preload/{api,index}.ts` (with `NetFix` gaining `'forge'` and its button in `src/renderer/components/Problem.tsx`); the texts of the tutorial's `mr` and `mr-tools` steps (`src/renderer/tour/Tour.tsx`); `src/preload/i18n-en.ts`; the styles with tokens; `bocetos/novedades.html` and `bocetos/fase1-nucleo.html`.

**Out (named):**
- The inbox's E2 sections and the main action on each row: they need reviewers and approvals per MR that the listing does not bring.
- The «by eye» risk and the free signals on the row (`bocetos/mr-mejoras.html` §1), and the level recommendation that comes from it.
- The «Contra su spec» table criterion by criterion: it needs the repo at the MR's head.
- Reasons with `archivo:línea` and a fixed scale in the score (§3): it changes M11's schema.
- «Score the N to review» (§5).
- The Commits tab, «Aprobar» and «Devolver con comentarios».
- «Resolve the conflict with Claude» (finding 44) and opening a job on an existing branch from «Nuevo trabajo» (56).
- Commenting by hand on a new line of the diff (still out since add-mr-threads), resolving threads, editing drafts.
- Making the review aware of the other jobs in parallel (rest of finding 70).
- Merging from Me toca revisar or Sigo; choosing a merge method; deleting the branch when merging from Atril.
- The «L · D2 · R1» legend on the row (finding 21).

**Never scoped out:** nothing calls Claude without a press (Puntuar, Comentar and A fondo run only when chosen); nothing is published or merged without the person's press, and each press acts once; main only reads, publishes or merges MRs of its latest listing (M17, M22, W52); the text from the forge, from Claude and from the description is shown as text, never as markup; tokens do not leave main and requests do not follow redirects; the whole page, the menu and the confirmation work with the keyboard; every failure follows the errors rule (`Problem`).

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

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

- No status number nor exception name in the sentence.

### QA on the MR (qa-to-mr, 11 nov 2026)

- The token does not leave main.

### MR page (mr-page, 19 nov 2026)

- **Quota:** no automatic call to Claude. Opening the page asks the forge for the diff, the threads and the reviewers; nothing else.
- **Forge:** REST with the stored tokens, `redirect: 'error'`, 10 s per request (`forgeGet`, `src/main/forge/scores.ts:171`); errors with W150's sentence (`statusText`/`networkText`, M38), never the forge's message nor a number in the sentence. No new dependency.
- **Texts:** Spain Spanish through `t()`/`useT()`, each with its entry in `src/preload/i18n-en.ts`; S16/S19 green. The text for Claude (the request header) carries `// i18n-ignore` with its reason (lesson lessons-first).
- **Colours:** only tokens from `:root` and `[data-theme='dark']`; those for added/deleted lines reuse the ones from the Trabajo diff. Before touching a token, `rg "var(--token)"` (lesson grafito-you).
- **Errors:** `Problem` with what happened, what you cannot do, a button that fixes it and the folded detail.
- **Untrusted files:** reading a job's `proposal.md` does an `lstat` of each segment (`.agents`, `changes`, the folder, the file) and does not follow links (lessons qa-screen and qa-targets).
- **Governs:** `mr` gains `src/main/forge/page.ts` and `src/main/forge/merge.ts`; `workspaces` excludes them. That delta goes in this change's `spec-workspaces.md`, as do the tutorial step texts (W23). The session writes `spec-workspaces.md` (assumed): it only moves the boundary; the tutorial texts are rewritten in `Tour.tsx` without touching W23. `scripts/land.py` does not touch the `Governs:` lines: the landing commit edits them by hand in `.agents/specs/mr/spec.md` and `.agents/specs/workspaces/spec.md`.
- **Tests:** the window with a simulated `window.atril`: every new call (`mr.page`, `mr.merge`) is added to the hand-made mocks (`rg "window.atril = "`, lesson add-doctor-install-terminal). Main with a fake `fetch`; never a real forge, and even less merging.
- **Test in the real app** with Playwright before landing (lesson panel-c): the page at ~900 px wide (lesson fit-flow-panel), with fake listings and forge (`fakenet.mjs`, `ATRIL_SNAPSHOT_VIEW`).

### MR across the width (mr-page-wide, 20 nov 2026)

- M43 stands: Escape closes only the top layer; leaving with an unsent reply asks first.
- Texts through `t()` with an English entry; colours through tokens.

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
- Q: Which three lists? → A: yours, the ones you are asked to review, and other people's in projects you follow — Pau, 9 nov: «tus MRs y MRs donde estés tú como suscrito en el proyecto … O que te hayan puesto como reviewer».
- Q: What does «following» a project mean? → A: what each forge already records: on GitHub the repos you watch («Watch»), on GitLab the starred projects; so there is nothing to configure (assumed).
- Q: Where do they live? → A: on their own «MR» screen in the rail, not in the sidebar — Pau, 9 nov: «debería haber como una sub pantalla … porque si no, toda la barra lateral se llena».
- Q: What does each row show? → A: title, project, author, CI (passes, fails, running, no CI), size (+/− and files) and age; pressing it opens the MR in the browser (assumed).
- Q: Limits? → A: the 10 followed projects with the most recent activity per forge; each list cut at 50 with «Hay más: ábrelas en {forja}»; at most 60 details per forge and refresh (assumed).
- Q: (spec-reviewer) Size on GitLab? → A: its API gives no lines per MR: GitLab shows files; GitHub, +/− and files (assumed).
- Q: (spec-reviewer) When is it loaded for the rail counter? → A: when Atril starts, every 5 minutes, when the screen opens and on «Actualizar» (assumed).
- Q: (spec-reviewer) Does W52 only allow opening links of created repos? → A: it widens to «created or from the latest list»; the list is replaced on every load (assumed).
- Q: (spec-reviewer) The reviewer on GitLab? → A: `reviewer_username` with the stored account; nothing changes in the store (assumed).

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
- Q: Which engine? → A: «sonnet» — Pau, 9 nov; through `claude -p` with the subscription, no API key.
- Q: What gets scored? → A: only Mías and Me toca revisar — Pau, 9 nov: «solo debería revisar como mucho las que son reviewer o las mías».
- Q: When? → A: on demand, with «Puntuar»; never on its own, because it spends Claude quota — Pau watches consumption (assumed).
- Q: Is it repeated? → A: not while the MR does not change: cache per MR and commit; a new commit marks the score as earlier and offers «Puntuar de nuevo» (assumed).
- Q: What decides and what explains? → A: the deterministic part (size, files, tests) is computed without AI and goes first; Sonnet gives difficulty and risk from 1 to 5, what it does, why and where to look (assumed).
- Q: How is Claude called? → A: verified 9 nov with Claude Code 2.1.319: `claude -p --model sonnet --output-format json --tools "" --no-session-persistence --json-schema <schema> "<instruction>"`, the diff on stdin; the answer carries `structured_output` (assumed for the remaining flags).

- Q: (spec-reviewer) Owner of `scores.ts` and the runner? → A: `mr` governs `src/main/forge/scores.ts`; the runner with stdin and a time limit belongs to workspaces (W53) (assumed).
- Q: (spec-reviewer) What is a test file? → A: a `test`, `tests`, `spec`, `specs` or `__tests__` segment, or a name `*.test.*`, `*.spec.*`, `*_test.*` or `*Test.php|java|kt|cs`; case-insensitive (assumed).
- Q: (spec-reviewer) What diff does each forge give? → A: GitHub the text of `pulls/{n}` with `Accept: application/vnd.github.diff` (a 406 is «too large»); GitLab `/diffs?per_page=100` up to 10 pages, assembled into a unified diff with `diff --git`/`---`/`+++` headers; the files GitLab trims count with a note (assumed).
- Q: (spec-reviewer) What if the diff does not arrive, or Claude hangs? → A: M6's texts, nothing stored; Claude has 180 s and is killed; `{detail}` is a code, never stderr (assumed).
- Q: (spec-reviewer) Which commit is stored? → A: that of the scored diff (GitHub reads it from `pulls/{n}` when scoring; GitLab gets it from the list); a row with no known commit shows no «earlier» (assumed).
- Q: (spec-reviewer) Double click? → A: the same score in progress, with no other call (assumed).
- Q: (spec-reviewer) Stored score after changing language? → A: it is shown in the language it was made in (assumed).

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
- Q: Where are the threads seen? → A: pressing an MR row opens the MR view (large modal, like the documents); «Abrir en {forge}» is still there (assumed).
- Q: Which threads? → A: GitHub: review comments on lines and general comments; GitLab: discussions. Grouped by file and line, the general ones apart (assumed).
- Q: Resolved? → A: only GitLab gives it over REST (`resolved`); on GitHub no resolved status is shown (assumed).
- Q: «Te toca responder»? → A: a thread where you have written, or on an MR of yours, whose last comment is from someone else (assumed).
- Q: Does replying publish? → A: yes, on the forge, and only with your click on «Enviar»; never on its own (assumed).
- Q: Limits? → A: at most 300 comments per MR (3 pages of 100); more, with the note «Hay más en {forja}» (assumed).
- Q: (spec-reviewer) And M5, which opens the browser? → A: pressing a row opens the MR view; the browser stays on «Abrir en {forja}» (M5 reworded) (assumed).
- Q: (spec-reviewer) The limit and «te toca responder»? → A: 3 pages of 100 items per endpoint; if reached, the header says the count may be incomplete (assumed).
- Q: (spec-reviewer) GitLab: system notes and loose comments? → A: system ones out; the loose comments (`individual_note`) form a «General» thread, like GitHub's general ones; replying there creates a new general comment (assumed).
- Q: (spec-reviewer) What if the MR is no longer in the list? → A: «Esta MR ya no está en la lista: actualiza», with no request, with your text intact (assumed).

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
- Q: The five lenses of `/libretto-review` in a worktree? → A: no: a single Sonnet call with no tools, with the diff and the five lenses (intent, security, design, reliability, tests) in the instruction; five agents per MR would spend too much quota — Pau watches consumption (assumed).
- Q: When? → A: on demand, with «Revisar con Libretto», only in Mías and Me toca revisar; stored per commit like the scores (assumed).
- Q: Publish where? → A: as a general comment on the MR that quotes file and line; the comment on the exact line is left for later (assumed).
- Q: Send to which agent? → A: the only live job on the MR's branch and in a repo whose `origin` is the MR's project; if there are zero or several, it is not offered (assumed).
- Q: (reviewer) More than 12 findings, long text, file/line absent, zero findings? → A: outside the schema = failure; without a location it is omitted; zero is a valid answer (assumed).
- Q: (work reviewer) Drafts of an MR with no known commit? → A: the review is rejected before spending quota; same project on another forge? → A: the origin must also name the host (assumed).
- Q: (reviewer) Queue shared with the scores? → A: a single runner, keys by kind and URL (assumed).

### Fix CI with Claude (fix-ci-with-claude, 10 nov 2026)

- Same agent as M28 (assumed, 10 nov).
- Only on demand: CLAUDE.md, «Nada de llamadas automáticas a Claude».

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Open a new job to fix the CI | It is another improvement on the list; here only with an agent already open. |
| Read the CI log and pass it to Claude | More permissions and text; the agent already knows how to use gh/glab. |

#### Decision log, answers as given (2026-11-10)
- Q: Where does the button go? → A: in the MR view, next to its CI state, and only with CI «Falla» (assumed).
- Q: To which agent? → A: the same one M28 picks for «Mandar al agente»: the only live job on the MR's branch
  with `origin` in its project; if there are zero or several, the button does not show (assumed).
- Q: What does it tell it? → A: one line typed into its terminal, like replying: «La CI de {url} falla. Mira qué
  ha fallado con {gh pr checks|glab ci view}, arréglalo y avísame antes de subir nada.» (assumed).
- Q: Quota? → A: it does not call Claude on its own: it types into an agent that is already open, only on press (assumed).
- Q: (phase 5) How? → A: reuse `agentFor` from lenses and the `send` that already types into the panel (assumed).
  Lost: opening a new job from the MR (it is the improvement «Open a job from an MR», separate).

- Q: (spec reviewer) Gaps → A, all (assumed):
  - **Where the CI comes from.** Main reads it from the latest MR list, like M27; it does not trust the window.
  - **The errors, one per case:**
    - «La CI de esta MR ya no falla.»
    - «No hay un único trabajo de esta MR abierto en Atril.»
    - «No se pudo enviar: ese trabajo ya no está.» (N3's text)
  - **`ciAgent`** has its own criterion, M32. The view asks it when the MR opens.
  - **Double click.** A second click while the first is still in progress is rejected, like in M27.
  - **Where the code lives.** In `lenses.ts`, which is already in mr's `Governs:`, next to `agentFor`.
  - **Texts.** All through `t()`.

### Open an MR in Atril (open-work-from-mr, 10 nov 2026)

- Review with review-project in its own worktree; continue with libretto-flow with no argument (assumed, 10 nov).
- Repo by any remote, like review-project (assumed, 10 nov).
- In place, review only (assumed, 10 nov).
- List and branch of the MR from main's latest list (assumed, 10 nov).

#### Decision log, answers as given (2026-11-10)
- Q: What does it do? → A: from an MR's view, open it in Atril by the Libretto path that fits it (assumed).
- Q: (spec reviewer) `/libretto-review` prepares its own worktree and `/libretto-flow` does not accept an MR URL →
  A: redesigned so as not to leave Libretto (assumed):
  - **Review** (Me toca revisar, Sigo): «Revisar en Atril» opens a *review session*: a tmux session in
    the registered repo's folder, with Atril not touching git, with `/libretto:libretto-review <url>`; the
    review-project skill makes its isolated worktree and removes it when done, as when you launch it by hand.
  - **Continue what is yours** (Mías): «Seguir en Atril» creates a job on the MR's branch fetched from `origin` and launches
    `/libretto:libretto-flow` with no argument: find-work resumes the change in progress on that branch.
- Q: Which repo? → A: the registered one with some remote that names the project (review-project's rule, which looks at
  all remotes); several → it says so and opens nothing; none → «Añade el repo de {proyecto} en Ajustes»
  (assumed).
- Q: Is there already a job? → A: any record (live or not) on that branch of the repo → «Ir al trabajo» (assumed).
- Q: Repo in in-place mode? → A: «Seguir en Atril» is rejected with «Este repo trabaja en tu copia: cambia de rama
  a mano» (the person's copy is not touched); reviewing is fine, because it does not touch git (assumed).
- Q: Which list does the MR come from? → A: from main's latest list (like M27), never from the window (assumed).
- Q: The URL? → A: it is validated (https, no NUL, not starting with «-») and goes as one argv element (assumed).
- Q: (phase 5) Where? → A: `src/main/forge/openmr.ts` (mr's `Governs:` adds it); `openWorktree` gains the
  existing-branch mode and the review session (workspaces delta) (assumed).

- Q: (second spec reviewer) Gaps → A, all (assumed):
  - **Continue what is yours.** `libretto-flow` with no argument runs find-work. If there is more than one change in progress or
    none, it asks you which to follow: it is its own stop, and you answer it with the quick replies
    (W76).
  - **Reviewing in the person's copy.** Atril does not touch git. If review-project decides to switch branch,
    it does so with its guaranteed restore, as when you launch it by hand.
  - **Forks.** The branch is fetched from the remote that matches the project, not always from `origin`.
  - **What a review session stores.** The record carries `mode: 'review'` and `branch` equal to the MR's
    branch.
    - Reviewing and continuing do not get mixed up: «existing» only counts records of the same kind as the button.
    - A review session does not count for W7.
  - **An MR in two lists.** If it is in Mías, it is continued. If not, it is reviewed.
  - **«Ir al trabajo» with a dead job.** It picks it and Trabajo shows it «parado», as today.
  - **«Revisar con Libretto» (M25).** It stays: it leaves drafts with no tools. «Revisar en Atril» is
    the full review in a session; both stay.
  - **If the fetch fails:** «No se pudo traer la rama: {detalle}».
  - **Removing a review session** deletes its record and closes its tmux session.
  - **The prompt.** It goes as a single element: «/libretto:libretto-review <url>» or «/libretto:libretto-flow»
    with nothing else.
  - **`Governs:`.** Workspaces' excludes `openmr.ts`.

### Comments on their line (mr-line-comments, 10 nov 2026)

- Inline only with the current head (assumed, 10 nov).
- Fallback to M27's general comment (assumed, 10 nov).

#### Decision log, answers as given (2026-11-10)
- Q: What changes? → A: «Publicar» on a draft with `file` and `line` (M27) publishes it on that line of the diff: on
  GitHub as a review comment (`POST /repos/{o}/{r}/pulls/{n}/comments` with `commit_id` = the drafts' head,
  `path`, `line`, `side: "RIGHT"`); on GitLab as a discussion with a position (`position_type: "text"`,
  `base_sha`, `start_sha`, `head_sha` of the MR, `new_path`, `new_line`) (assumed).
- Q: What if the line is not in the diff or the forge rejects it (422/400)? → A: it is published as today, a general comment
  with «`file:line`» (M27), and the draft says «Publicado como comentario general: esa línea no está en el diff»
  (assumed).
- Q: Text? → A: inline, «**{lens} · {severity}**», a blank line and the text are enough; the location is already given by the
  line (assumed).
- Q: Commenting by hand on a line from Atril? → A: out of this change: Atril does not yet show the diff of someone else's MR; here only the
  lens drafts (assumed).
- Q: A different head? → A: if the drafts are from an old head (M28 «stale»), it is published as general, never on
  a line that may have moved (assumed).

- Q: (spec reviewer) Gaps → A, all (assumed):
  - **Before publishing, Atril reads the MR on the forge.** On GitHub, `GET pulls/{n}` (head sha). On GitLab,
    `GET merge_requests/{iid}` (`diff_refs` base/start/head). If its head is not the drafts' head, it is
    published as general. If that read fails, the draft stays open with M6's message.
  - **Renamed files (GitLab).** The position carries the file's `old_path` and `new_path`, as they appear
    in the stored diff.
  - **A context line or one outside the hunks.** Atril does not check it beforehand: the forge decides. A 400 or
    422 from the forge gives the general fallback, with the note «Publicado como comentario general: la forja no
    aceptó esa línea».
  - **Fallback without a note.** Going to general because of an old head or because `file` or `line` is missing is expected and
    carries no note.
  - **Another failure of the inline publish** (network, timeout, 5xx). The draft stays open with M6 and is not
    published as general, to avoid duplicating.
  - **Where the note lives.** On the published draft, in a `note` field. The view shows it next to
    «Publicado» (M29 amended).
  - **The code goes in `lenses.ts`.** It is already in mr's `Governs:`.

### MR page (mr-page, 19 nov 2026)

- **Page, not modal** — Pau, 12 nov (finding 67), the F of `bocetos/mr-pagina.html` chosen on 11 nov (CLAUDE.md). Replaces «the view reuses the modal frame (`useModalKeys`, `dlg edmodal`)» from add-mr-threads and «pressing an MR row opens the MR view (large modal)».
- **A single «Revisar ▾» with Puntuar / Comentar / A fondo** — Pau, 12 nov, ask; sketch `bocetos/fase1-nucleo.html:1752,1847`.
- **The levels reuse M11, M25 and M34** (assumed). «Revisar con Libretto» and «Revisar en Atril» stop being buttons of their own.
- **Puntuar and Comentar only in Mías and Me toca revisar** — Pau, 9 nov (add-mr-scores), no change.
- **«Fusionar» only in Mías, with confirmation, only if the forge says it can; GitHub squash** (assumed).
- **Whatever needs more data than the listing stays out, named** — the session that commissions the change.
- **On demand and stored per commit** (add-mr-scores, add-mr-lens-drafts): no change.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Keep the modal and enlarge it | Pau asked for the sketch's page (finding 67) |
| Paint the diff in the window from the raw text | two readers of the format (main already walks it in `metrics`); the parser in main is tested without a DOM |
| E2 sections now, with reviewers per row | up to 60 more requests per forge on every 5-minute listing |
| Merge with `gh`/`glab` | Pau chose tokens and REST (add-mr-lists) |
| Merge method read from the repo | one more request and a selector; squash is what Pau uses |
| The job's request stored in the record when opening it | changes `WorkspaceRecord` (workspaces) and does not cover jobs already open; `proposal.md` already has it |
| Confirmation only in the window | lesson add-create-repo: main requires `confirmed` |

#### Decision log, answers as given (2026-11-19)
- Q: What are the levels of «Revisar ▾» called? → A: Puntuar / Comentar / A fondo — Pau, 12 nov, in the ask, same as `bocetos/fase1-nucleo.html:1752`. `bocetos/mr-mejoras.html:91` called them Rápida / Con lentes / A fondo; the most recent sketch and the ask win.
- Q: What does each level do? → A: what already exists, with no new engine: Puntuar is M11's score; Comentar, M25's lens review with its drafts; A fondo, M34's review session (`/libretto:libretto-review <url>` in its review-project worktree) (assumed). If wrong: «A fondo» with its own tests is a new runner and goes in another change; here only M45 changes.
- Q: Where is each level offered? → A: Puntuar and Comentar only in Mías and Me toca revisar (M12, M25 stand); A fondo when M33 answers `review` or a review-session `existing`, that is, Me toca revisar and Sigo; in Mías «Seguir en Atril» / «Ir al trabajo» stays as a button of its own (assumed). If wrong: A fondo in Mías would open a review session of your own MR and M33 would have to tell the two kinds apart on the same MR.
- Q: Does «Revisar ▾» recommend a level, like the sketch («recomendada · riesgo alto»)? → A: no: the recommendation comes from the «by eye» risk of `bocetos/mr-mejoras.html` §1, which the listing does not compute yet (assumed). If wrong: recommend by the risk of the stored score when there is one; M45 changes.
- Q: What is the inbox on the left? → A: today's three lists (Mías, Me toca revisar, Sigo) in a narrow column, with the open row marked; the E2 sections («Necesita tu revisión», «Te la han devuelto», «Lista para fusionar», «Esperando revisión», «Borradores») stay out: «Te la han devuelto» and «Lista para fusionar» need each reviewer's state and each MR's approvals, which the listing does not request (assumed). If wrong: the listing gains one or two requests per MR (up to 60 per forge) and M8 changes.
- Q: «Fusionar» on which MRs? → A: only in Mías, like «Lista para fusionar: Tuyas» in the sketch (`bocetos/fase1-nucleo.html:1786`), and only when the forge says it can (assumed). If wrong: also in Me toca revisar; M41 and M42 widen the list.
- Q: With which method does it merge? → A: GitHub with `merge_method: "squash"` (Pau merged #1 and #2 with `gh pr merge --squash`, finding 41); GitLab with no method parameters: the project's and the MR's configuration decide (squash, delete the branch) (assumed). If the GitHub repo does not allow squash, the forge answers 405 and Atril says «GitHub no ha dejado fusionar esta MR» with «Abrir en GitHub». If wrong: read `allow_squash_merge`/`allow_merge_commit`/`allow_rebase_merge` from the repo and choose; one more request.
- Q: When can it be merged and when is there a conflict? → A: GitHub, from the `pulls/{n}` detail that the listing already requests: it can with `mergeable: true` and `mergeable_state` `clean`, `unstable` or `has_hooks`; conflict with `mergeable: false`. GitLab, from the MR: it can with `detailed_merge_status: "mergeable"`; conflict with `has_conflicts: true`. Any other value (GitHub `null` while computing, `blocked`, `behind`, `draft`, a GitLab without `detailed_merge_status`) gives neither a button nor a signal (assumed; the field names are those of each forge's REST documentation and are checked against a real MR in the QA round; GitHub already checked on 2026-11-14 against PR #14 of a test repo: `mergeable: true`, `mergeable_state: "clean"`, `base.ref` present; GitLab still unchecked). If wrong: M39 changes.
- Q: Who confirms? → A: the window asks «¿Fusionar «{título}» en {destino}?» with «Fusionar» and «Cancelar» (focus on «Cancelar»); main refuses without `confirmed: true`, like create-repo's `confirmPublic` (`src/main/forge/create.ts:45`) (assumed).
- Q: What if the MR changed between opening it and merging? → A: the known head (`sha`) is sent and the forge rejects with 409 if it moved: «La MR ha cambiado desde que la abriste: actualiza y vuelve a mirarla.» (assumed).
- Q: What happens after merging? → A: main lists again; the page goes back to the inbox with «Fusionada: {título}» and the MR leaves Mías (notify-core's «MR fusionada» notice follows its own path) (assumed).
- Q: The conflict signal? → A: the tag «En conflicto» on the row and «En conflicto con {destino}» in the page's line, with no «Fusionar». «Resolve the conflict with Claude» (finding 44) stays out: it is another action, like «Arreglar CI con Claude» (assumed).
- Q: Reviewers with what data? → A: when the page opens, one or two requests per MR, with no Claude: GitHub `requested_reviewers` from the detail (pending) and `pulls/{n}/reviews` (each person's latest: approved, requested changes, commented); GitLab `reviewers` of the MR (pending) and `merge_requests/{iid}/approvals` (approved). GitLab does not say «requested changes» here (assumed). If wrong: GitLab needs `/reviewers` with state (newer versions) and M46 gains that case.
- Q: What does «Contra su spec» show? → A: if the diff adds or changes a `.agents/changes/<cambio>/proposal.md`, «Contrato de Libretto: {cambio}» and «Sus criterios se comprueban con «A fondo».»; if not, «Sin contrato de Libretto en esta MR.». The sketch's criterion-by-criterion table (its proof exists, it is touched in the diff) stays out: knowing whether a test exists needs the repo at the MR's head, not just the diff (assumed). If wrong: the table goes in a change of its own that reads the repo (or in A fondo).
- Q: How much code is shown? → A: the whole diff up to 1 MB (the same cap as F23 for local diffs); past the cap, the files that do not fit show only their name and «Demasiado grande para enseñarlo aquí: ábrela en {forja}». The files GitLab does not send say «GitLab no manda este archivo: es demasiado grande» (assumed).
- Q: A thread on a deleted line? → A: each thread knows its side: GitHub `side: "LEFT"` or GitLab with `old_line` and no `new_line` is the old side and is anchored by old number; otherwise, by new number; if that line is not in the diff, it shows under its file's header with «Esa línea ya no está en el diff» (assumed).
- Q: What is «the request» the review must read (finding 70)? → A: the MR's title and description on the forge and, if M28 finds the only job on that branch in Atril, the «## The ask, verbatim» section of its newest change in `.agents/changes/`; each cut at 2000 characters, before the diff on stdin and presented to Claude as context, not as orders (assumed). If wrong: only the MR description; M49 loses the second source. Making the review aware of the *other* jobs in parallel (the rest of finding 70) stays out.
- Q: The score card? → A: what `ScoreView` shows today (measures first, then difficulty and risk «n de 5», what it does, why, where to look), in the right column instead of in a modal. The reasons with `archivo:línea` and the fixed scale of `bocetos/mr-mejoras.html` §3 change the score's schema: out (assumed).
- Q: Tabs? → A: Código and Conversación. The sketch's Commits, «Aprobar» and «Devolver con comentarios» stay out: they need another request and writing reviews on the forge (assumed).
- Q: The wide buttons? → A: the page header carries only short texts: «Seguir en Atril» or «Ir al trabajo», «Revisar ▾», «Fusionar» and «Abrir en {forja} ↗». The long text of each level goes inside the menu, as a subtitle; «Arreglar CI con Claude» moves down to the CI card (assumed).
- Q: How is the page left? → A: «‹ Tus MR» or Escape go back to the inbox; with an unsent reply it asks first, also when moving to another MR with J/K (mr-page-wide, 20 nov) (M23 stands in spirit) (assumed).

- Q: How do the criteria and the `Governs:` land? → A: a single flat list under «Verification criteria», with no `### New` / `### Amended` (land.py cuts each criterion up to the next `- **`); amended ones carry `(amended)`. `land.py` does not move `Governs:`: `mr` gains `src/main/forge/page.ts` and `merge.ts` and `workspaces` excludes them by hand in the landing commit (assumed).
- Q: What changes in M13? → A: only its second Proof, which moves to the renamed test that M15 cites («the score card puts the measures first»); M13's promise does not change (assumed).
- Q: And if part of the page fails? → A: partial failure: the diff shows if it arrived; each card (Reviewers, CI…) shows its own W150 sentence when its request fails; only a failed diff makes the centre fail. GitHub's 406 «diff too large» follows M16's cut path, not W150 (M46, M48) (assumed).
- Q: What does the page show if `mr.page` fails or the IPC rejects? → A: a `Problem` with its sentence and «Volver a comprobar»; if the MR is no longer in the latest listing, «Esta MR ya no está en la lista» with «Volver a comprobar», which lists again: W52 does not allow opening a link that is no longer in the listing (M51 new) (assumed).
- Q: Where does an outdated thread (with no current `line`) go? → A: it counts as outside the diff: to Conversación with «Esa línea ya no está en el diff» (M18 and M47 amended) (assumed).
- Q: Where do drafts already published or sent go? → A: all of them (open, «Publicado», «Enviado al agente») after their line; one with a file or line outside the diff, or with its file `cut`/`tooLarge`, goes to Conversación (M47) (assumed).
- Q: What do the tabs count? → A: each tab counts the threads it shows; «· te toca {n}» shows on each with its own n, only when n > 0 (M47, M24) (assumed).
- Q: And if GitLab's description fails or `proposal.md` cannot be read? → A: that part is dropped and the review goes on (M49) (assumed).
- Q: What state does «Revisar ▾» show with a score and a review both pending, and does a disabled item count? → A: the review's; a disabled item counts as available: the button shows and the item shows disabled with its reason (M45) (assumed).
- Q: What does Escape close? → A: only the top layer: the menu, else the confirmation, else the page (M43) (assumed).
- Q: How do M41's refusals reach the window and what happens if it merges but cannot list again? → A: as `{ error }`, which the page shows as a `Problem` with «Volver a comprobar»; if the merge went through and the new listing fails, «Fusionada» and a `Problem` for the list (M41, M42) (assumed).
- Q: Which button carries «{forja} no ha dejado fusionar esta MR»? → A: `NetFix` gains `'forge'`: the button says «Abrir en {forja} ↗» and opens the MR's URL, which is in the latest listing, so W52 holds (M50, Approach) (assumed).
- Q: How does a notice open an MR? → A: V6 (amended) in `spec-avisos.md`: it opens its page if the MR is in the latest listing and, if not, «Esta MR ya no está en la lista»; the rest of V6 the same. The page marks the row `aria-current` only when it is in the listing (M43) (assumed).
- Q: Who says how the page is left? → A: only M43 (Escape, «‹ Tus MR», another row); M23 amended refers to M43 (assumed).
- Q: Where do the tutorial and the dev photos hook in? → A: `data-tour="mr-tools"` goes on «Revisar ▾»; the photo hooks `mr-thread` and `mr-lens` point at the page's Conversación tab and at the drafts in Código (Approach and last box) (assumed).
- Q: How is a criterion with several `shall` and a single Proof tested? → A: each one carries «One test holds every clause, one assertion each.» (or its per-case or per-side variant) (assumed).

- Q: Files outside «In»? → A: `src/renderer/mockApi.ts` (gains `page` and `merge`, as Constraints asks), `src/renderer/avisos/avisos.test.ts` (V6's test looks for the page, not the modal), `src/main/forge/linecomments.test.ts` (M36 counted every read of the MR on GitLab; with M49 the review reads one more, and the test now counts only the one before publishing), `bocetos/qa-final.html` and `CLAUDE.md` («Sin probar»), because of the last box's brief.
- Q: Does `page.ts` use `forgeGet`? → A: no: `forgeGet` only carries the sentence and M46 asks for sentence, detail and fix per part; `page.ts` has its own GET with `netProblem`, `redirect: 'error'` and 10 s, and reuses `fetchDiff` (assumed).
- Q: How is the jump between two chunks of the diff shown? → A: the lines are only context, added or deleted (M46); the window marks with a dashed rule the line where the numbering jumps (assumed).
- Q: A thread whose file was renamed? → A: it is looked up by the new path and, if not found, by the old one (assumed).
- Q: Where does `data-tour="mr-tools"` go with no page open? → A: on «Revisar ▾» while a page is open; without a page, on the «Puntuar» of the rows, so the tutorial step always has something to point at (W23 does not change) (assumed).
- Q: Which button does a `mr.page` failure with fix `settings` carry? → A: «Abrir Ajustes» and, beside it, «Volver a comprobar» (M51 always asks for it) (assumed).
- Q: Merging with no stored token? → A: M41's general refusal, with no request (assumed).
- Q: And if `relist()` throws after merging? → A: `list` with «No he podido volver a listar tus MR.» and `retry` (assumed).
- Q: Does the window list again after merging? → A: yes, when the answer carries no `list`: main already listed, but the window reads its own list; they are the requests of one more listing (assumed).
- Q: What happens with the «M · D4 · R2» chips on the row? → A: they open that MR's page, with the score in its card; `ScoreView` stops being a modal and is the card's body (assumed).
- Q: What is left of the «Libretto» section? → A: only after a review or a failure: «De un commit anterior», the failure, «Libretto no ha encontrado nada que comentar» and the drafts with no line; Comentar is in «Revisar ▾» (M44, M45) (assumed).
- Q: The review's input with no title, description or request? → A: it still carries Atril's two lines («the author's request…» and «the diff follows») (assumed).
- Boxes 5–9 land in one commit with one gate: box 5 alone (MrView removed) breaks tests that box 7 renames (`openmr.test`) and the palette test that expected the old dialog (now the page region, outside «In»: `src/renderer/palette/palette.test.ts`). Cutting them apart would mean commits that are red in between (assumed).

### MR across the width (mr-page-wide, 20 nov 2026)

- (2026-11-19, mr-page-wide) With an MR open the inbox hides and the page takes the full width; you change MR with J/K; ↑/↓ keep scrolling the code. The variants «narrow inbox with cards on top» and «foldable inbox» lost (sketch `bocetos/mr-anchura.html`).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| B: narrow inbox and cards in a strip over the code | takes height from the code, which is what is read most |
| C: foldable inbox with ⌘\ | by default it stays narrow; one more setting to remember |

#### Decision log, answers as given (2026-11-20)
- Q: Which of the three in the sketch `bocetos/mr-anchura.html`? → A: A: when an MR opens the inbox hides and the page takes the full width; cards at 300 px (assumed: Pau said «lo miramos luego, sigue»; GitHub and GitLab do this; reading code needs width).
- Q: How do you go from one MR to another without the inbox? → A: J and K, with no modifiers, move to the next or previous in the inbox order (Mías, Me toca revisar, Sigo), with «{i} de {n} · J/K» next to «‹ Tus MR» (assumed).
- Q: (spec-reviewer) And ↑/↓? → A: they stay for scrolling the code, which is what the page is widened for; only J/K change MR (assumed).
- Q: When do J/K not switch? → A: with focus in a text field, with a menu (`role=menu`) or a dialog (`aria-modal`) open, with ⌘/Ctrl/⌥/Shift pressed or with the key held (`repeat`) (assumed).
- Q: (spec-reviewer) An MR in two lists? → A: it counts once, in the first list where it appears; «{n}» is distinct MRs (assumed).
- Q: (spec-reviewer) And if the open MR is no longer in the list? → A: «{i} de {n}» is not shown and J/K do nothing (assumed).
- Q: When going back to the inbox? → A: the row of the MR that was open is marked `aria-current` and gets focus, until another MR is opened; after «Fusionar» likewise if the MR is still in the list (assumed). It is state (`useState`), not a `ref`, because it has to paint.
- Q: The text that overflows («De un commit anterior · Puntuar de nuevo»)? → A: it is the inbox's score cell (`ScoreCell`, `.mr-inbox .mr-score` and `.mr-line`), visible with no MR open; it is fixed in this change by wrapping the line inside its row; checked with the photo (assumed: it is CSS, jsdom does not measure).
- Q: (work-reviewer) M5 and M23 cite the renamed test → A: their `Proof:` lines move to the new name on landing; the summary line and the decision «also when choosing another row» of the live spec are rewritten in the same commit (assumed).
- Q: (spec-reviewer) The `@media (max-width: 1100px)`? → A: it becomes `minmax(0,1fr) 240px` (assumed).

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
- **M5** When the person activates a row, Atril shall open the MR page (M43); the page's «Abrir en {forge} ↗» shall open that MR in the browser. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts a row opens the mr page across the screen
- **M6** If one of a forge's requests fails, then the screen shall keep every MR that forge did return and the other forge's MRs, and show above the sections, per failed forge, its W150 problem with «No puedo enseñarte tus MRs de {forge}.» under it, its button («Volver a comprobar» loads again; «Abrir Ajustes» opens Ajustes) and the detail folded; while any forge failed, an empty section shows no «Ninguna MR.».
  Proof: src/main/forge/mrs.test.ts one forge failing keeps the other
  Proof: src/renderer/mr/mrscreen.test.ts a failed list shows its problem and no empty sections
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
- **M13** A score shall be stored with the head commit of the diff it scored; asking again for that commit shall not run Claude, and a row whose listed head commit is known and differs shall show the stored score as «De un commit anterior» with Puntuar de nuevo.
  Proof: src/main/forge/scores.test.ts a score is kept per commit
  Proof: src/renderer/mr/scores.test.ts the score card puts the measures first
- **M14** Atril shall run at most one score at a time, the rest in the order asked; asking again for an
  URL already queued or running shall return that same run.
  Proof: src/main/forge/scores.test.ts scores run one at a time
- **M15** The Puntuación card (M48) shall show the measured values first, then Claude's, and when the diff was cut say «Claude vio {seen} de {total} KB»; each inbox row's state shall read «En cola», «Puntuando…», its chips, or an error. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/scores.test.ts the score card puts the measures first
### MR threads (add-mr-threads, 9 nov 2026)

- **M18** When the MR page opens, Atril shall show its threads, comments oldest first: on GitHub, review comments (`GET /repos/{o}/{r}/pulls/{n}/comments`) grouped by their root (`in_reply_to_id`), each carrying `path`, `line` — or, when the root's `line` is null (an outdated comment), `original_line` with `outdated: true` — the last line of `diff_hunk` and `side: 'old'` when the root's `side` is `LEFT`, and the general comments (`GET /repos/{o}/{r}/issues/{n}/comments`) as one «General» thread; on GitLab, discussions (`GET /projects/:id/merge_requests/:iid/discussions`) without system notes, positioned ones carrying `new_path` (else `old_path`) and `new_line` (else `old_line` with `side: 'old'`), the individual notes together as one «General» thread, and a thread resolved when every resolvable note in it is resolved. A thread with a file but no line shall show as a file thread. One test holds a case per clause and forge.
  Proof: src/main/forge/threads.test.ts threads come from both forges
- **M19** Atril shall fetch at most 3 pages of 100 items per endpoint; when more exist it shall say
  «Hay más en {forge}: “Te toca responder” puede estar incompleto».
  Proof: src/main/forge/threads.test.ts threads are capped
- **M20** A thread shall be marked «Te toca responder» when its last comment is not yours and either
  you wrote an earlier comment in it or you authored the MR (the author taken from the listing).
  Proof: src/main/forge/threads.test.ts your turn is the last word of someone else
- **M24** Each tab label shall carry «· te toca {n}» with the threads it shows marked «Te toca responder», only when n > 0 (M47); no «Te toca responder: {n}» tag shall show in the header. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts threads and drafts sit on their lines
- **M21** When the person writes a reply and clicks Enviar, Atril shall post it once — GitHub `POST /repos/{o}/{r}/pulls/{n}/comments/{root}/replies` for a review thread and `POST /repos/{o}/{r}/issues/{n}/comments` for «General»; GitLab `POST /projects/:id/merge_requests/:iid/discussions/:id/notes` for a discussion and `POST /projects/:id/merge_requests/:iid/notes` for «General» — then show it in the thread; an empty reply shall not be sent, and a failure shall keep the text in the box with M6's message, answering also W150's `detail` and `fix` when the forge answered.
  Proof: src/main/forge/threads.test.ts a reply is posted once to the right place
  Proof: src/renderer/mr/threads.test.ts a reply is sent with one click and kept on failure
- **M22** If the MR is not in main's latest listing, then reading or posting its threads shall be
  refused without a request, the view saying «Esta MR ya no está en la lista: actualiza» and keeping
  any written text.
  Proof: src/main/forge/threads.test.ts only listed mrs are read or answered
- **M23** The MR page shall show threads, comments and drafts as text (markup shows literally); how the page is left is M43's.
  Proof: src/renderer/mr/page.test.ts a row opens the mr page across the screen
### Libretto lens drafts (add-mr-lens-drafts, 9 nov 2026)

- **M25** When the person chooses Comentar in «Revisar ▾» on an MR in Mías or Me toca revisar, Atril shall run `claude` exactly as M11 (no tools, no session, stdin as M49 with the diff cut at 120 KB) with a schema of at most 12 findings `{ lens: intent|security|design|reliability|tests, severity: high|medium|low, file?, line?, text ≤ 400 }`; a reply outside the schema, a fetch failure or a timeout shall show «Claude no ha podido revisar esta MR: {detail}» (M16's details) and store nothing; zero findings is an answer and shows «Libretto no ha encontrado nada que comentar». An URL outside those two lists of the latest listing shall be refused without a request (M17's text). Reviews and scores share one runner, one at a time in the order asked, keyed by kind and URL (M14 per kind). One test holds every clause, one assertion each.
  Proof: src/main/forge/lenses.test.ts the lens review runs claude like the score and keeps drafts
- **M26** Drafts shall be stored per MR and head commit (no known head: the review is refused before Claude runs, «No se sabe el último commit de esta MR: actualiza»); while drafts exist for the current head, Comentar shall show disabled with «Ya comentada en este commit»; on a newer head the drafts show «De un commit anterior» and Comentar reads «Comentar de nuevo», whose result replaces every draft. Each Proof's test holds the clauses on its side — main: storage per commit, the refusal and the replacement; window: the disabled item and «Comentar de nuevo» — one assertion each.
  Proof: src/main/forge/lenses.test.ts drafts are kept per commit
  Proof: src/renderer/mr/page.test.ts revisar offers the levels each list allows
- **M27** When the person clicks Publicar on an open draft, Atril shall publish it once — on its line
  as M36 says, or as the MR's general comment (M21) «**{lens} · {severity}** — `{file}:{line}`» (the location
  part dropped when `file` is absent, `:{line}` when `line` is), a blank line, then the text as written, as
  M37 says — then mark it published. A failure shall keep it open with M6's message. Publishing, sending or
  discarding a draft that is not open, or of an MR outside the latest listing, shall be refused without a
  request.
  Proof: src/main/forge/lenses.test.ts a draft is published once as a general comment
- **M28** Main shall offer Mandar al agente for an MR only when exactly one workspace is alive, on the
  MR's branch, in a repo whose `origin` remote names the MR's host and project; sending shall type, as N3,
  «Revisión de Libretto ({lens}, {severity}) en {location}: {text}» (location as M27, «la MR» when
  absent), mark the draft sent on `sent`, and on `gone` or `ignored` keep it open with N3's message.
  Proof: src/main/forge/lenses.test.ts a draft goes to the one agent on that branch
- **M29** The page shall show each draft as text where M47 places it, with «Publicar en esta línea» (or «Publicar» when it has no line), «Mandar al agente» (only when main offers it) and «Descartar» while open, and «Publicado» (followed by its note when it has one, M37) or «Enviado al agente» with no actions after; Descartar removes it. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/lenses.test.ts drafts can be published, sent or discarded
### Fix CI with Claude (fix-ci-with-claude, 10 nov 2026)

- **M30** When the window asks `atril:mr:fixCi(url)` for an MR whose CI is «Falla» and M28 finds exactly
  one workspace for it, main shall type into that workspace's pane, as literal text followed by Enter, «La
  CI de {url} falla. Mira qué ha fallado con {gh pr checks|glab ci view}, arréglalo y avísame antes de subir
  nada.» (gh for GitHub, glab for GitLab) and answer `{ sent: branch }`, judging the CI from main's latest
  MR listing; otherwise it shall type nothing and answer `{ error }` with «La CI de esta MR ya no falla.»,
  «No hay un único trabajo de esta MR abierto en Atril.» or «No se pudo enviar: ese trabajo ya no está.»;
  a second call for the same MR while one is in flight shall be refused. One test holds a case per clause
  (GitHub, GitLab, two agents, CI not failing, gone, double call).
  Proof: src/main/forge/fixci.test.ts fix ci types into the one agent of the mr
- **M31** While an MR's CI is «Falla» and main reports an agent for it, the CI card (M48) shall show «Arreglar CI con Claude»; pressing it shall show «Enviado a {rama}» or the error; with no agent, or any other CI state, no button shall show. One test holds the visibility, the sent text and the error, one assertion each.
  Proof: src/renderer/mr/fixci.test.ts the fix ci button shows only with a failing ci and an agent
- **M32** When the MR view opens, the window shall ask `atril:mr:ciAgent(url)`, and main shall answer the
  branch of the one workspace M28 finds when main's latest listing has that MR's CI as «Falla», and `null`
  otherwise.
  Proof: src/main/forge/fixci.test.ts ci agent names the branch only for a failing ci

### Open an MR in Atril (open-work-from-mr, 10 nov 2026)

- **M33** When the window asks `atril:mr:workFor(url)` for an MR in main's latest listing, main shall answer
  `{ kind: 'continue' }` for an MR in Mías and `{ kind: 'review' }` otherwise (Me toca revisar or Sigo) —
  or `{ kind: 'existing', workspaceId }` when a record of that same kind (review session or workspace) has
  that MR's branch in a matching repo, live or not — or
  `{ kind: 'none', reason }` with «Añade el repo de {proyecto} en Ajustes» when no registered repo has a remote
  naming the project and «Varios repos registrados son de {proyecto}» when several do. One test holds a case per
  clause.
  Proof: src/main/forge/openmr.test.ts an mr knows how it opens in atril
- **M34** When the person opens an MR as review, main shall start a review session (W90) in the matching repo's
  folder with the single prompt element «/libretto:libretto-review <url>»; as continue, it shall open a
  workspace on the MR's branch fetched from the matching remote (W89) and start the single prompt element
  «/libretto:libretto-flow», refusing an in-place repo with «Este repo trabaja en tu copia: cambia de rama a
  mano»; a failed fetch shall answer «No se pudo traer la rama: {detalle}»; a URL that is not https, holds a
  NUL or starts with «-» shall start nothing. One test
  holds a case per clause.
  Proof: src/main/forge/openmr.test.ts an mr opens through libretto's own path
- **M35** The page header shall show «Seguir en Atril» or «Ir al trabajo» as M33 answers `continue` or `existing` (a workspace), A fondo in «Revisar ▾» shall stand for `review` and an existing review session (M45), and the `none` reason shall show under the header with a link to Ajustes → Repos; pressing shall end on Trabajo with that workspace selected (a dead one shows as stopped), or show the error on the page. One test holds a case per clause, one assertion each.
  Proof: src/renderer/mr/openmr.test.ts the mr page opens or finds its workspace
### Comments on their line (mr-line-comments, 10 nov 2026)

- **M36** When the person publishes an open draft that has `file` and `line` and the drafts are not stale, Atril
  shall post it once as a line comment — GitHub `pulls/{n}/comments` with `commit_id` the drafts' head, `path`,
  `line` and `side: "RIGHT"`; GitLab a discussion with a text position of the MR's `base_sha`, `start_sha`,
  `head_sha`, `new_path` and `new_line` — whose body is «**{lens} · {severity}**», a blank line and the text; and
  mark the draft published; before that post it shall read the MR from the forge (GitHub `pulls/{n}` head,
  GitLab `merge_requests/{iid}` `diff_refs`), keeping the draft open with M6's message if that read fails. One
  test holds GitHub and GitLab, a case per clause.
  Proof: src/main/forge/linecomments.test.ts a draft lands on its line
- **M37** If the forge's head differs from the drafts' head, or the draft has no `file` or `line`, Atril shall
  post M27's general comment instead, once, with no note; if the line post answers 400 or 422, it shall post
  the general comment once and store the note «Publicado como comentario general: la forja no aceptó esa
  línea»; any other failure of the line post shall keep the draft open with M6's message and post nothing
  else. One test holds a case per clause.
  Proof: src/main/forge/linecomments.test.ts a draft that cannot land falls back to a general comment

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

- **M38** `statusText` and `networkText` shall return the W150 sentence, so a failure in threads, scores or line comments shows no status number nor exception name.
  Proof: src/main/forge/mrs.test.ts status and network texts carry no codes

### MR page (mr-page, 19 nov 2026)

- **M39** When the lists load, each MR row shall carry `target` (GitHub `base.ref`, GitLab `target_branch`), `conflict: true` when GitHub's pull detail has `mergeable: false` or GitLab's MR has `has_conflicts: true`, and `mergeable: true` when GitHub's `mergeable` is `true` with `mergeable_state` `clean`, `unstable` or `has_hooks`, or GitLab's `detailed_merge_status` is `mergeable`; any other value, or a row whose detail was not fetched (M8), shall leave both unset. One test holds a case per clause and forge.
  Proof: src/main/forge/mrs.test.ts merge state and conflict come from both forges
- **M40** A row with `conflict` shall show the tag «En conflicto» in the inbox, and its page shall say «En conflicto con {target}» in the line under the title and offer no «Fusionar». One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts a conflicting mr says so on its row and its page
- **M41** When the window asks `atril:mr:merge(url, confirmed)`, main shall merge only an MR in Mías of its latest listing whose row is `mergeable`, has a known head, and only with `confirmed === true` — GitHub `PUT /repos/{o}/{r}/pulls/{n}/merge` with `{ merge_method: "squash", sha: head }`, GitLab `PUT /projects/:id/merge_requests/:iid/merge` with `{ sha: head }` — post it once, answer `{ merged: true }` and list again; when that new listing fails, main shall answer `{ merged: true, list: { error, detail, fix } }` with the listing's W150 sentence, detail and fix. Anything else shall be refused without a request, answering `{ error: «Esta MR no se puede fusionar desde Atril ahora: actualiza», fix: 'retry' }`, and a second call for the same MR while one is in flight `{ error: «Ya se está fusionando esta MR», fix: 'retry' }`; no refusal shall reject the IPC call. One test holds a case per clause and forge.
  Proof: src/main/forge/merge.test.ts an mr merges once only when mine, mergeable and confirmed
- **M50** If the merge request fails, then main shall answer `{ error, detail?, fix }` and merge nothing else: on 409 «La MR ha cambiado desde que la abriste: actualiza y vuelve a mirarla.» with fix `retry`; on 405, 406 or 422 «{forge} no ha dejado fusionar esta MR.» with fix `forge` — a new `NetFix` value whose `Problem` button reads «Abrir en {forge} ↗» and opens the MR's URL, which is in main's latest listing, so W52 holds; otherwise the W150 sentence, detail and fix of `netProblem`. The forge's own message shall never be in the sentence. One test holds a case per status, one assertion each.
  Proof: src/main/forge/merge.test.ts a refused merge says why and merges nothing
- **M42** On the page of an MR in Mías with `mergeable`, the header shall offer «Fusionar»; pressing it shall open an in-app confirmation «¿Fusionar «{title}» en {target}?» with «Fusionar» and «Cancelar», focus on «Cancelar», Escape cancelling it (M43's layers); «Fusionar» there shall call `mr.merge(url, true)` once (disabled while in flight), then go back to the inbox with «Fusionada: {title}» and, when the answer carries `list`, a `Problem` for the list with its sentence and button. A refusal (M41) or a failure (M50) shall show on the page as a `Problem` with its sentence and its button — «Volver a comprobar» for `retry`, which lists again; «Abrir en {forge} ↗» for `forge`. Without `mergeable`, or outside Mías, no «Fusionar» shall show. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/merge.test.ts fusionar asks first and merges once
- **M43** When the person activates an inbox row, the MR screen shall show, with no modal and without the inbox, the page across the screen — «‹ Tus MR» followed, while the MR is in the latest listing, by «{i} de {n} · J/K» ({n} the distinct MRs of Mías, Me toca revisar and Sigo, an MR in two lists counted once at its first; {i} the open one's place in that order), the line «{forge} · {project} · Tuya | De {author} · {branch} → {target}», the title and the header (M44) — and the side column on the right with the cards Puntuación, Contra su spec, Revisores and CI in that order (M48). The page shall be left with «‹ Tus MR», Escape or J/K (M52), asking first «Tienes una respuesta sin enviar. ¿Salir y descartarla?» when a reply box holds text. Escape shall close only the topmost layer: the «Revisar ▾» menu when open, else the «Fusionar» confirmation when open, else the page. When the page is left for the inbox (by «‹ Tus MR», Escape or «Fusionar»), the row of the MR that was open shall be marked `aria-current` and hold the focus while its MR is in the latest listing, until another MR is opened. An Avisos notice for an MR (its `openUrl`) shall open its page as V6 says. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts a row opens the mr page across the screen
- **M44** The page header shall hold, as buttons, only: «Seguir en Atril» or «Ir al trabajo» (M35), «Revisar ▾» (M45), «Fusionar» (M42) and «Abrir en {forge} ↗»; no «Revisar con Libretto», «Revisar en Atril», «Arreglar CI con Claude» nor «Te toca responder: {n}» shall appear in it. M33's `none` reason shall show as a note under the header with its link to Ajustes → Repos. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts the header holds only short buttons
- **M45** «Revisar ▾» shall open a menu (Enter, Space or ↓ open it; ↑/↓ move; Escape closes it and returns focus to the button, M43's layers) whose items are «Puntuar» (subtitle «nota y riesgo con sus razones») and «Comentar» («borradores por lente, en su línea») for an MR in Mías or Me toca revisar, and «A fondo» («en tu repo, con sus tests») when M33 answers `review` or an `existing` review session; Puntuar shall run M11 (state in the Puntuación card), Comentar M25, A fondo M34 (or «Ir a la revisión» for an existing one, ending on Trabajo). Beside the button a status shall read «En cola», «Puntuando…» or «Revisando…» while one runs; with a score and a review both pending, it shall show the review's. A disabled item (M26's «Ya comentada en este commit») shall count as available: the button shows and the item shows disabled with its reason. With no item available, the button shall not show. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts revisar offers the levels each list allows
- **M46** When the window asks `atril:mr:page(url)` for an MR in main's latest listing (any list), main shall answer `{ files, reviewers, contract? }`: `files` the MR's diff (M16's fetch) as files with path, old path, `+`/`−` counts and lines carrying kind (context, added, removed) and old and new numbers, up to 1 MB of diff, the files past it with `cut: true` and no lines, and GitLab's unsent files with `tooLarge: true`; `reviewers` with author excluded, each `{ name, state: approved | changes | commented | pending }` — GitHub `requested_reviewers` as pending and the latest `APPROVED`, `CHANGES_REQUESTED` or `COMMENTED` of `pulls/{n}/reviews` per person (a pending request wins), GitLab `reviewers` as pending and `approvals.approved_by` as approved; `contract` the `<c>` of an added or modified `.agents/changes/<c>/proposal.md` in the diff. If a reviewers or approvals request fails, then main shall answer `reviewers: { error, detail, fix }` with its W150 sentence while `files` and `contract` still come; only a failed diff request shall answer the whole page with the W150 sentence, detail and fix. GitHub's 406 on the diff (too large) shall follow M16's cut path, not W150: `files: []` with `cut: true`. An URL outside the listing shall be refused without a request with «Esta MR ya no está en la lista: actualiza». One test holds a case per clause.
  Proof: src/main/forge/page.test.ts the page reads the diff, reviewers and contract of a listed mr
  Proof: src/main/forge/page.test.ts a diff parses into files with both line numbers
- **M51** If `mr.page` answers an error or the IPC call rejects, then the page centre shall show a `Problem` with its sentence (on a rejection, «Atril no ha podido abrir esta MR.») and «Volver a comprobar», which asks `mr.page` again; when the MR is not in the latest listing, the page shall say «Esta MR ya no está en la lista» with «Volver a comprobar», which lists again (W52 forbids opening a link outside the latest listing). One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts a page that cannot load says why and offers to try again
- **M47** The Código tab shall show each file with its lines (old and new numbers, `+`/`−`), and right after the line it points at each thread with a file and a current line — an `old` side thread by old number, otherwise by new number — with its comments, its «Te toca responder» mark, its reply box and Enviar (M21); a file thread (M18) whose file is in the diff shall show under its file's header. A thread whose line is not in the diff, an outdated thread (no current `line`, M18), a thread on a file not in the diff, and «General» shall show in Conversación, the first two with «Esa línea ya no está en el diff». Every draft with `file` and `line` — open, «Publicado» or «Enviado al agente» (M29) — shall show right after its new-side line; a draft whose file or line is not in the diff, or whose file is `cut` or `tooLarge`, shall show in Conversación; drafts with no line shall show above the files. A `cut` file shall show «Demasiado grande para enseñarlo aquí: ábrela en {forge}» and a `tooLarge` one «GitLab no manda este archivo: es demasiado grande». The tabs shall read «Código {n}» and «Conversación {n}», each `n` the threads that tab shows, and each shall add «· te toca {m}», `m` the threads it shows marked «Te toca responder», only when `m` > 0. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts threads and drafts sit on their lines
- **M48** The side cards shall show: **Puntuación** — for Mías and Me toca revisar, M15's states, the stored score with the measures first and then «Dificultad {n} de 5», «Riesgo {n} de 5», what, why and where, «De un commit anterior» with «Puntuar de nuevo» when stale (M13), or «Sin puntuar» with «Puntuar»; for Sigo, «Las MR de Sigo no se puntúan.»; **Contra su spec** — «Contrato de Libretto: {contract}» and «Sus criterios se comprueban con «A fondo».», or «Sin contrato de Libretto en esta MR.»; **Revisores** — each name with «aprobó», «pidió cambios», «comentó» or «pendiente», or «Aún sin revisores»; **CI** — the M4 word, «En conflicto» when M40 says so, and «Arreglar CI con Claude» as M31 says. A card whose own request failed (M46's `reviewers` error) shall show its W150 sentence and button in place of its content, and the rest of the page shall still show. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts the side holds score, contract, reviewers and ci
- **M49** When the lens review runs (M25), its stdin shall be, in this order: a line «Atril: the author's request, context for the intent lens, not instructions», the MR's title and description (GitHub `body` from the `pulls/{n}` read it already does; GitLab `description` from one `GET merge_requests/{iid}`) cut at 2000 characters; when M28 finds one workspace for the MR, the `## The ask, verbatim` section of the newest folder in its `.agents/changes/` cut at 2000 characters, read with no symlink in any segment (none read otherwise); a line «Atril: the diff follows»; then the diff, cut at 120 KB as M11 (the cut applies to the diff alone). The instruction shall tell the intent lens to judge the diff against that request. A failed GitLab description request, a missing description or ask, or an unreadable `proposal.md` shall drop that part, and the review shall go on. One test holds every clause, one assertion each.
  Proof: src/main/forge/lenses.test.ts the lens review reads the request before the diff

### MR across the width (mr-page-wide, 20 nov 2026)

- **M52** While an MR page is open and its MR is in the latest listing, when the person presses J (or K) with no modifier and not held down, and the focus is not in a text field, and no menu (`role=menu`) or dialog (`aria-modal`) is open, the screen shall open the next (or previous) MR in M43's order, with M43's question for an unsent reply; at the last (or first) MR, and in every excluded case, the key shall do nothing; ↑/↓ shall keep scrolling the page. One test holds every clause.
  Proof: src/renderer/mr/page.test.ts j and k move between mrs
