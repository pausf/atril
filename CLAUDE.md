# Atril

Mac app (Electron + TypeScript + React 19, pnpm) that takes each Jira task through the Libretto flow
with Claude Code agents in tmux, and manages GitHub/GitLab MRs. Remote `github.com/pausf/atril`
(public, MIT; git identity `pausf`, noreply email).

`bocetos/` (design sketches) is local-only and gitignored: the references to it below point at files that exist on Pau's disk, not in the repo.

## Where we left off (10 Nov 2026) — start here

The branches are stacked: each one comes off the previous one and `main` has not moved. The latest is
**`crash-reports`** (26 Nov: opt-in in Settings → "Failures"; an unexpected failure is scrubbed and opened as an English issue `Crash <sig>:` in pausf/atril with the person's GitHub token, and `.github/workflows/crash-report.yml` turns it into branch `atril-crash/<sig>`, file `crash-reports/<sig>.md` and a PR; untested against real GitHub). Before it,
**`skills-usage`** (25 Nov: in Skills, each card says when it was last used —"used today", "used 3 days ago", "unused in 30 days"—, an "Unused in 30 days" box that filters the candidates to switch off (not Atril's own) and, in the detail view, bars for the last 14 days; main counts it by reading the Claude Code sessions in `~/.claude/projects` from the last 30 days, with an in-memory cache per file; never `~/.claude.json` and never Claude). Before it,
**`skills-plugins`** (24 Nov: in Skills, "Add plugin" with the catalog of your marketplaces, search and "Install" for you or only in one repo; "Update" and "Remove" on each plugin; "Add marketplace"; everything through `claude plugin … --json`, never with `-y`: whatever asks to accept a command goes to "Do it in Terminal"; untested with the real CLI). Before it,
**`skills-editor`** (24 Nov: in Skills, "Edit" in the detail view of personal and project skills —whole file, ⌘S, conflict if it changed outside, warning for a broken header, leaving with changes asks, draft kept in memory— and "New skill"; main only touches paths it lists itself). Before it,
**`skills-toggle`** (23 Nov: in Skills, "State" in the detail view and an "Active" switch per plugin; it writes a single key in the personal file that decides —`~/.claude/settings.json` or the repo's `settings.local.json`—, never the repo's `settings.json`; "Pinned by …" if another file wins; it asks the first time; it respects symlinks). Before it,
**`skills-list`** (20 Nov: "Skills" screen in the rail and ⌘K: Claude Code skills, commands and plugins by origin —Personal, Project, Plugins, Atril— with state, clashes, ~tokens, search, filters and detail; read-only, spends no quota). Before it,
**`mr-page-wide`** (20 Nov: the MR page at full width, no tray; "‹ Your MRs · 2 of 5 · J/K", J/K switch MR, ↑/↓ scroll; cards at 300 px; when you go back, the row is marked and focused). Before it,
**`harness-ladder`** (20 Nov: correction ladder: `pnpm lint` fails if renderer and main import each other, if `window.atril` is mounted outside `mockApi()` or if `homedir()` is used outside `paths.ts`; `.githooks/pre-commit` hook with typecheck and lint, ~5 s). Before it,
**`refine-request`** (20 Nov: "Refine the request · optional" in New task and New job: four fixed questions and "Let Claude ask me" with Haiku only when pressed; the answers travel attached to the request; untested with the real Claude). Before it,
**`mr-page`** (19 Nov: the MR opens as a page next to the tray, with code and its threads, Conversation, "Review ▾", cards on the right and "Merge" with confirmation; untested against real forges: merging and GitLab's fields). Before it,
**`terminal-read-only`** (14 Nov: read-only terminal, one card per kind of wait —question, permission, end of turn—, "Write to the agent", Automatic keeps going on its own up to 3 times, large branch with "Split"/"Leave it as is"; untested with the real Claude: digit + Enter in the selector and "Allow" = 1). Before it,
**`notify-ui`** (14 Nov: "Notifications" and "When" cards in Settings, Notices screen with the new types). Before it,
**`notify-core`** (12 Nov: notices with the job's name, new types, one unread per job, grouping, focus and quiet hours in main; `notify-ui` follows). Before it,
**`plain-errors`** (11 Nov: quota, tools and Jira with a sentence, a button and "See detail"; findings 1, 2 and 24). Before it, **`qa-targets`**, landed and pushed on 11 Nov (QA: tabs per platform with their why, `.atril/qa.json` and "Pick by hand", one emulator or simulator reserved per job, errors with their fix). Before it, `qa-screen`, `subagent-branches` and `panel-c`. **Next: fix the 42 findings from the walk through the app** (`hallazgos` of 11 Nov, copy in `bocetos/hallazgos.md`), from serious to minor. Ideas for later: `bocetos/ideas.html` (120, favourites marked with ★; 51–120 added on 11 Nov).

1. Done on 10 Nov: `add-subagents-view`, `add-subagent-detail`, `add-doctor-install-terminal`, `restyle-mode-picker`, `fit-flow-panel`, `show-doc-buttons`, `adopt-grafito`, `expand-tour` and `redesign-connections`.
   Phase 2 sketches: `bocetos/fase2-nucleo.html` (6 designs of the panel; Pau chose 0) and `bocetos/fase2-app.html` (4 minimalist variants; Pau chose Grafito, already in the app as the second palette).
2. **Goal (Pau, 10 Nov): improve the idea, don't change it** (Libretto flow, scores, drafts…),
   so that one person can carry **3 tasks at once without losing focus**. Done on 10–11 Nov: CI, quick
   replies, focus, Todos, live QA, pause, open MR, cost, inline comments, history, first steps. Queue: the whole of Libretto inside Atril (Pau, 11 Nov): right panel with live code (steps as six named segments above the job title, the C of `bocetos/pasos-arriba.html`; QA as its own screen (the A of `bocetos/qa-propuestas.html`: report per criterion, each one Passes/Fails/Untested with its screenshot, "See how", "Mark as bug" and "Re-test"; iOS with Apple's official MCP `xcrun mcpbridge` (Xcode 26.3+), simctl if something needs touching; Android with the SDK emulator of the person through the official `emulator`/`adb`, via mobile-mcp; web Chrome with Playwright and Safari with its WebKit MCP; improved W83 detection: it says why, several platforms as tabs remembered per repo, monorepos at 2 levels, "Pick by hand" saved per repo and optional `.atril/qa.json`, and "I don't know how to open this project" if there is nothing; one simulator or emulator per job, reserved until it is released, like Simlock, to run 3 QAs at once without stepping on each other), questions in a balloon from the row (the 8 of `bocetos/preguntas.html`), with their why and the recommended one marked, and the row with an amber border and "It asks you something · Answer ›" (the 1 of `bocetos/aviso-pregunta.html`); proposal C of `bocetos/panel-derecho.html`; steps: the 2 of `bocetos/pasos.html`; subagents: the 2 of `bocetos/subagentes.html`, branches with the last action on hover; "⤢ Enlarge" / ⌘⇧D brings the code to the centre, large), `agent-suggestions` (draft in the scratchpad: a notice that closes itself), `converge` and `retro`; better MRs (Pau: "do it all", `bocetos/mr-mejoras.html`): free signals and risk at a glance in the list, a single "Review" with levels Quick / With lenses / In depth, the score with reasons and a fixed scale (like 540, newsletter #15: the AI only detects the MR type and the broken rules with their evidence; a deterministic script starts at 100 and subtracts the weight of each rule according to the type; the weights are tuned with what people answer to the comments; the person decides), review against its spec, score several at once on demand; MR page: when an MR is opened, the F of `bocetos/mr-pagina.html` (code with its threads, score and spec on the right); the tray, the E2 (sections like GitHub/Graphite, no lights); then the ★ of `bocetos/ideas.html` (1–50, then 51–120). **When done (Pau, 11 Nov): end-to-end QA of Atril** — me, in the real app with Playwright: every screen, emulators (Android from its SDK, iOS with `mcpbridge`, Chrome), the whole of Libretto in a test repo, forges and Jira with fake servers (errors included); Pau, with his accounts: `bocetos/qa-final.html`, a guided list with the expected result and a checkbox per step (it leaves "Untested"). Every feature is tested by driving the real app (Playwright) before landing.
   The tmux/git test hangs were contention: fixed with `maxWorkers: 4` (see lessons).
3. After that, the list of improvements given to Pau on 9 Nov. Go one by one with the Libretto flow:
   - CI status in the MR row, and "Fix CI with Claude".
   - Open a job from an MR.
   - Cost and quota per job.
   - History of finished jobs.
   - Move the Jira task when the MR is opened.
   - Comments on the exact line.
   - Filters in Tasks.
   - Focus mode.
   - Pause an agent.
   - Task templates.
   - Quick replies to the agent.
   - Export a job's report.

Untested with real data (needs Pau):
- Connect the forge and see real MRs.
- A real score.
- Libretto's drafts on a real MR.
- Automatic mode asking before the push.
- The Jira board.
- Replying from a Mac notice.
- That Claude Code's option selector accepts the typed number (quick replies).
- Live QA with a real Claude, a real browser and a real emulator (only tested with doubles).
- Publishing a draft on its line against a real GitHub/GitLab.
- "Start" on the Libretto screen: that Claude Code takes `/libretto:write-spec <name>` as the first message and follows the flow.
- "Move to Jira" from Libretto against a real Jira (type Task, the board's project).
- Live QA: that the real QA agent writes `report.json` per criterion (only tested with a seeded report).
- `pnpm dist` and opening the installed `.dmg`: the list in `bocetos/instalar.html` §4 (the session does not build).
- `openmr.test.ts` and `pause.test.ts` sometimes fail in the full suite because of git timing under load (they pass alone): look at it in the QA round.
- That Esc pauses Claude with no stray events and that "Pick up where you left off." is taken as a new message.
- The MR page against real forges: a real "Merge" on GitHub (squash) and on GitLab (no parameters), the M39 fields on a real GitLab MR (`detailed_merge_status`, `has_conflicts`, `target_branch`; GitHub already checked), GitLab's reviewers and the threads on the old side (`bocetos/qa-final.html`).
- The lens review actually reading the request (M49): that Claude takes the description as context and not as orders.

## How we work here

- **Only the Libretto flow**, per change:
  - The contract goes in `.agents/changes/<change>/proposal.md`. It carries Decision log, EARS criteria with `Proof:`, Approach and Checklist; the deltas of other capabilities go in `spec-<cap>.md`.
  - Before building, a cold spec-reviewer.
  - The builder writes the tests first, in red.
  - After that, the cold work-reviewer, the fixes and the lessons.
  - Finally, land it.
- **Autonomy (Pau):** keep going without asking. Take the recommended option and note it with `(assumed)`. Push only to pausf/atril.
- **Living specs** in `.agents/specs/{workspaces,work-inbox,flow-status,settings,mr,avisos}/spec.md`. Read them before touching code.
- **Gates:** `pnpm -s typecheck`, `pnpm -s lint` and `pnpm -s test`, all of them before every commit, with an `if` that does not let you commit on red. The `.githooks/pre-commit` hook already runs typecheck and lint (`pnpm run prepare` enables it). **Never `pnpm build`.**
- **Commands:** rg/fd/eza/bat, not grep/find/ls/cat.
- **Commits:** conventional, no `Co-Authored-By` and no AI attribution.
- **Before every push**, scan for real work identifiers with
  `git grep -niE -f ~/.config/atril/work-identifiers.txt HEAD`.
  The list lives outside the repo on purpose: never copy it here. It must come out empty; an `integrity` hash
  in `pnpm-lock.yaml` matches by chance (11 Nov): that line does not count. Use example
  names (shop-web, WEB, SHOP, PF, OPS, acme).
- **Never** a folder named `secrets` (there is a global deny rule), nor read `~/.atril/secrets.bin`. Tokens live only in main.
- **Do not touch:** Pau's real repos, his default tmux sessions or `~/.claude.json`. Tests use their own tmux socket and a temporary `ATRIL_HOME`.
- **Quota:** Pau looks after his Claude quota. No automatic calls to Claude: only on demand. Bounded subagents, on Sonnet for the mechanical work, never Fable.
- **Every feature that lands** updates:
  - `bocetos/novedades.html`: section, real photo in `bocetos/novedades/*.png` and history;
  - `bocetos/fase1-nucleo.html` (the sketch).
- **Photos of the real app** (dev only):
  ```
  ATRIL_HOME=$(mktemp -d) ATRIL_SNAPSHOT=$PWD/bocetos/novedades/x.png ATRIL_SNAPSHOT_VIEW=<view> ATRIL_SNAPSHOT_DELAY_MS=6000 pnpm -s dev
  ```
  Launch it in the background, wait for the PNG to exist and then `pkill -f "electron-vite dev"`.
- **Tests with a fake `claude` (11 Nov):** since `login-path`, Atril puts your login shell's PATH *in front*: a fake `claude` only in `PATH` loses and the real one starts (spends quota). Launch the app with `SHELL` pointing to a fake shell that, with `-ilc`, prepends the folder of the doubles to the PATH.
- **Screenshots (11 Nov):** never `screencapture` of the whole screen (Pau's personal windows show up). Only Atril's window: `page.screenshot` through CDP, or `screencapture -l <windowid>`.
- **Errors (Pau, 11 Nov):** no loose errors ("error 500", "something went wrong"). Every failure says what happened, what you cannot do because of it, and brings a button that fixes it (Terminal with the command, the token page, Settings, "Check again"); the technical code only in "See detail", folded. Catalog in `bocetos/errores.html`.
- **Texts:** all of them go through `t()`/`useT()`; the key is the English text and its Spanish entry lives in `src/preload/i18n-es.ts`. The S16/S19 scans check it.
- **Colours** only as tokens in `:root` and `[data-theme='dark']`.
- **Landing:** `python3 scripts/land.py <change> "<Label>"`. It applies `proposal.md` onto its
  `Targets:` capability and each `spec-<cap>.md` onto `<cap>`. `(amended)` criteria replace the
  existing one. Then, in the same commit: `git rm -r .agents/changes/<change>`, `libretto wiki` and
  `libretto land`.
- **Reviewers' lessons** in `.agents/lessons.md`. Read them: they are the mistakes already paid for.
