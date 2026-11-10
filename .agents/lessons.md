
## 2026-11-09 · add-atril-core · 6→7
In-place mode wrote Claude's trust flag for the person's own checkout, breaking W31's "a folder Atril created": the W31 proof only exercised a worktree path. Fixed: trust only non-in-place workspaces; new test "never trusts the person's own checkout" (seen red when trusting always).

## 2026-11-09 · add-atril-core · 6→7
Clicking a needs-you notification only selected the workspace, which stayed hidden behind Tareas or Ajustes. Fixed: the click also switches to Trabajo; W38 with "notification click opens the workspace from any screen" (seen red without the switch).

## 2026-11-09 · add-atril-core · 6→7
spec-work-inbox.md still scoped the REST API OUT and said the token never passes through Atril after the decision log moved Jira to REST with a saved token. Fixed the two lines; a decision that changes scope must sweep Scope boundaries and Never-scoped-out in the same edit.

## 2026-11-09 · add-atril-core · 6→7
Dev-only snapshot hooks in main had no outcome behind them and let an env var swap the real inbox for fake data. Fixed: one constant, undefined when packaged; documented under Complexity deliberately kept.

## 2026-11-09 · add-atril-core · 6→7
I3's proof checked only main's { error: 'unconfigured' }, not the "Conecta Jira en Ajustes" link it promises, and its name still said "jira init". Fixed: I3 now cites the renderer test "inbox without a jira token links to ajustes" (seen red without the link); the main test renamed.

## 2026-11-09 · add-atril-core · 6→7
Question raised: trust.ts copied the whole ~/.claude.json into ~/.atril/backups on every launch, which can hold MCP secrets. Fixed by removing the copy; "trusts its own worktree without copying the claude config" asserts no backups dir (seen red before removal). No real backup existed on the person's machine.

## 2026-11-09 · add-atril-core · 6→7
Question raised: claude-hook.sh resolves its session with `tmux display -p '#S'` without -t. Checked, not a bug: with two sessions and the other one most recent, the hook still wrote its own (tmux reads $TMUX of the pane). Kept "hook writes the state of its own session when several exist" as a regression proof; no code change.

## 2026-11-09 · add-atril-core · 8
The landing commit went in with one red test: the gate ran inside a `&&` chain whose last command (`rg`) returned 0 whatever the test said. Cause of the red: every test file shared one temp ATRIL_CLAUDE_JSON, and a parallel Start test wrote a trust entry into it. Fixed: a vitest setup file gives each test file its own path; full suite green 3 runs in a row. Lesson: read the gate's own exit code before committing, never a filter's.

## 2026-11-09 · use-jira-board-columns · 6→7
Reviewer found nothing against the contract; raised that S9's proof mocks IPC so it cannot show the board kept on Reemplazar / forgotten on Borrar. Fixed: split into S10 citing the main-side store test that already proved it.

## 2026-11-09 · use-jira-board-columns · 6→7
Reviewer asked whether I17's "first column" is the board's first column even when empty. Answered (assumed): yes — an empty first column means nothing to start. No code change.

## 2026-11-09 · add-agent-activity · 6→7
A7's proof claimed "pushes two lines" but only seeded the mock before render, so a broken live update passed. Fixed: the mock now fans out activity events; the test pushes a line after render and asserts feed and row update (seen red with the subscription unhooked).

## 2026-11-09 · add-agent-activity · 6→7
A .gitignore hunk rode on this branch outside the contract — it came from the separate "make it private" request. Logged in the decision log; lesson: commit a side request on its own branch or say so in the change that carries it.

## 2026-11-09 · add-agent-activity · 6→7
Subagent descriptions were shown up to the 200-char line cap and can carry prompt-like text. Fixed: capped at 80 like the prompt; assertion seen red at 200.

## 2026-11-09 · add-agent-activity · 6
Two commits in a row went in with a red gate (a chain that did not stop). Fixed the habit: commits now run behind an explicit "all three exit codes are 0" guard. The red that guard then caught was a real race: tmux set remain-on-exit after starting the agent, so an agent that exits at once took its session away. Fixed by starting the pane idle, setting options, then respawn-pane with the agent (W39, red 2/3 before, green 5/5 after).

## 2026-11-09 · add-next-up · 6→7
Two queued proposals (add-own-tasks, add-create-repo) rode on this branch outside the contract. Docs only, left in place: same lesson as add-agent-activity — capture a side request on its own commit and say so.

## 2026-11-09 · add-next-up · 6→7
N3's "ignore a click within 1 s of a reply" is proven only against the event order we assume; nobody has watched a real macOS notification reply. Not fixed: needs a manual reply from a real notification.

## 2026-11-09 · add-next-up · 6→7
⌘↩ on a task the renderer had not loaded yet did nothing, silently (`setStarting(null)`). Fixed: it falls back to Tareas, which refetches on mount; N2 amended, case added to its proof and seen red first.

## 2026-11-09 · add-own-tasks · 4→5
spec-reviewer found six gaps the contract left to the builder: what a slug "word" is, the Nueva tarea button without Jira, the agent of an own task, three promises on one proof (I23), the argv shape of W40 and a proof that could not tell a newline from a second argument, and a refactor of StartDialog with no proof. All settled in the document before code.

## 2026-11-09 · add-own-tasks · 6→7
A non-string `task` over IPC was silently dropped and opened a plain agent instead of being refused (trust boundary). Fixed: main forwards anything but undefined and `taskPrompt` refuses non-strings with W41's message; seen red on `null` first.

## 2026-11-09 · add-own-tasks · 6→7
W40's proof used the test argv override, so the production `agentArgv` path had no proof that the prompt stays last. Fixed: agent.test.ts asserts it after every flag (green at once: the code was right, the proof was missing).

## 2026-11-09 · add-own-tasks · 1
Queued add-language rode on this branch, an hour after logging the same lesson. Docs only; add-flow-documents is now kept uncommitted until its own branch.

## 2026-11-09 · fix-test-home-leak · 6
A tmux test that timed out under load kept writing after afterEach deleted ATRIL_HOME, so its workspace record landed in the person's real ~/.atril (seen as a ghost «feat/q1 · demo» in the app). Fixed at the root: under vitest a missing path env throws (W42), and every module resolves the home through one function. The guard then caught four argv tests resolving against the real home.

## 2026-11-09 · move-repos-to-settings · 4→5
spec-reviewer caught I23 (empty text disables Empezar, unscoped) contradicting the new I27 (empty text allowed in «Nuevo trabajo»), plus Auto's meaning, the «Ir a Ajustes» behaviour, the dialog copy without text and S12 holding two promises. Lesson: when a delta loosens a rule, amend the old criterion's scope in the same delta instead of only adding the new one.

## 2026-11-09 · add-flow-documents · 4→5
spec-reviewer found that the approach leaned on a signal that does not fire: the flow watcher only emits when the stage changes, so a live document view would go stale on every in-stage edit. Settled by carrying the folder's newest mtime in FlowStage. Lesson: before an approach says "the existing X already does Y", read X — the review read watch.ts, the author had not.

## 2026-11-09 · add-flow-documents · 2
Pau asked what happens if he dislikes the spec, since «it goes straight to build». Checking found the real gap: Libretto does stop before code, but its question is a tool call and the hook marked every PreToolUse as working, so Atril would hide the stop and lock the editor exactly when it mattered. W44 fixes the hook. Lesson: when the user describes behaviour that the flow says cannot happen, look for what makes it look that way.

## 2026-11-09 · add-flow-documents · 6→7
The document modal never took focus: until the documents loaded, Escape did nothing and Tab left the aria-modal dialog. Fixed: the dialog focuses itself on mount, traps Tab and gives focus back on close; the new test was red first.

## 2026-11-09 · add-flow-documents · 6→7
saveDoc's mtime check and rename are not one atomic step. Not fixed: the contract never promised a lock; the ceiling is now named in the approach's risks.

## 2026-11-09 · add-file-changes · 4→5
spec-reviewer found the scope saying renames show as D + A while the approach said M, plus an undefined «total», a 1 MB cap with no proof, and no rule for whether the diff modal follows the agent. Settled before code (--no-renames, total = lines, F23 for the cap, the modal as a snapshot with Actualizar).

## 2026-11-09 · add-file-changes · 6→7
work-reviewer: an untracked symlink was followed to count its lines, and listed names reached git as pathspecs (a file named `a*.txt` pulled `ab.txt` into its diff). Fixed with lstat and --literal-pathspecs; F24 added, its test red on both before the fix.

## 2026-11-09 · add-split-large-branch · 4→5
spec-reviewer: the hook's printout had no way to be observed by the proof, a 0→900 jump was ambiguous, "one git call" contradicted the approach, parallel hooks could both announce, and "orange" had no criterion. Settled by moving the logic into a callable sizeNotice, claims with wx files, W46 pinning both counters, and F25 naming the class.

## 2026-11-09 · add-split-large-branch · 6→7
work-reviewer: the approach said the renderer imports the hook's THRESHOLD while the code pins a copy by test (text fixed); the hook's git calls had no timeout (5 s added, a timeout means no note); claim files are never cleaned (ceiling named — session ids are random).

## 2026-11-09 · add-language · 4→5
spec-reviewer: the default ("Sistema") contradicted the test default ("es"), Sistema had two sources (window vs main), "every text" had no closing proof, and module constants would freeze the language at load. Settled: main is the one source, the mock is a Spanish Mac, S19 scans for Spanish literals outside t(), constants become functions.

## 2026-11-09 · add-language · 6
Committed the language proofs while red (4acae03), outside the all-green guard adopted earlier today. Labelled as such and followed by the extraction, but the guard exists so the history never holds a red tree; next time keep red tests uncommitted until the code that turns them green.

## 2026-11-09 · add-language · 6→7
work-reviewer: ui:get could change main's language (Sistema after a macOS change) without rebuilding the menu (fixed); a message already on screen stays in the old language (ceiling named); the hook's own Spanish prefixes stay Spanish (queued as translate-hook-prefixes); "piece of work" read badly (now "workspace").

## 2026-11-09 · add-create-repo · 4→5
spec-reviewer: the create/clone code sat in workspaces' Governs while its criteria were written into settings; GitLab's address and non-401 failures had no rule; S25 borrowed S20's proof; the clone's id collision, existing folder and failure path had no criterion. Settled with spec-workspaces.md (W49–W51), https-only GitLab, a status test and one proof per clone path.

## 2026-11-09 · add-create-repo · 6→7
work-reviewer: the public confirmation lived only in the window; forge:open took any https URL; the clone folder took any absolute path; forge requests followed redirects with the token header; git inherited the whole shell environment. All fixed in main (confirmPublic, guards for links and folders, redirect 'error', an env allowlist), W50–W52 amended, tests red first. Also: a reviewer was launched on a red tree (fixture missing snapshotView) — run the gates before launching it.

## 2026-11-09 · add-mr-lists · 4→5
spec-reviewer: M3 contradicted W52 (open only created links), GitLab gives no per-MR line counts, CI states had no mapping, the rail counter needed data before the screen was opened, and the GitLab reviewer filter needed an id the store never kept. Settled before code; W52 amended, reviewer_username used.

## 2026-11-09 · add-mr-lists · 6→7
work-reviewer: M6's network text lacked the period the shared catalog key has (contract aligned with the key); a GitHub pull without head.sha asked /commits/undefined/check-runs and could raise a false forge error (now skipped, CI unknown).

## 2026-11-09 · add-mr-scores · 4→5
spec-reviewer: a hung claude would block the queue forever (no timeout), GitLab's /diffs is not a unified diff, a failed diff fetch had no outcome, {detail} could have echoed stderr, and "only mine and review" had no main-side proof. Settled with W53 (stdin + kill), M16, M17 and a per-forge diff recipe.

## 2026-11-09 · add-mr-scores · 6
The builder followed the contract's test-file rule literally (`*Test.php` ignoring case), which made latest.php and Contest.java count as tests. The contract was wrong; fixed there and in code (the xUnit suffix is case-sensitive), negatives added to M10's proof, seen red first.

## 2026-11-09 · add-avisos · 6→7
work-reviewer: the baseline keeps one list per URL (listings dedupe, M2), so an MR moving from Mías to Me toca revisar fired a false «Te piden revisión» (fixed: only an MR new to you or merely followed counts; test red first); dev photo listings wrote fake notices into the real avisos.json (fixed); no test covered a forge reconnecting (added).

## 2026-11-09 · tour-new-screens · 7
W23 promises a tutorial step per element, but five changes added screens and controls (Nuevo trabajo, Spec/Plan/Construir, MR, Avisos) without a step, and nothing failed: the proof only listed the old targets. Fixed by extending the proof first (red) and the tour; lesson: a change that adds a rail screen or a primary control owes W23 a step in the same change.

## 2026-11-09 · add-mr-lens-drafts · 6→7
- The contract said «no head: not stored» but not what the window does with drafts nobody can act on; the cold work-reviewer found buttons that always failed. A state the store refuses must be refused before it is shown — or before quota is spent.
- Matching a local repo to a forge project by path alone ignores the host: the same `acme/api` exists on two forges. Compare host and path.
- Left as is (unverified): a POST that succeeds with an unreadable JSON body leaves the draft open, so a retry would post twice. Forges answer 201 with JSON; revisit if it ever shows.

## 2026-11-09 · add-auto-mode · 6→7
- A safety regex written from the spec's own examples missed how agents really push (`bash -c "git push"`, `/usr/bin/git`, `--no-pager`). For a guard, test the realistic false negatives first; a false positive only costs a question.
- A side file written before a step that can throw (the marker before tmux) needs cleanup on that throw, not only on the happy removal.
- Contract slip: replacing the whole criteria section dropped F26; re-count criteria after any section rewrite.

## 2026-11-10 · add-subagents-view · 6→7
Reviewer asked whether the earlier W62 tmux hang and W66 failure only show in the full run. Investigated: W66 was a race in the test — it asserted the row counts right after `findByText`, before `subagents.get` resolved; failed 3/5 under load. Fixed with `waitFor` (6/6 green). The ~1000 s W62 hang never reproduced in 11 runs and the test caps itself at 30 s, so it was tmux outside the test; no code change. Lesson: a renderer assertion on data from a second async IPC must wait for that data, not for the first render.

## 2026-11-10 · add-subagents-view · 6→7
The hook accepted PreToolUse for `Task` as well as `Agent`, but W62 named only `Agent`: code with no outcome. Fixed (assumed: keep it, `Task` is the tool's older name in Claude Code) by amending W62 and making the "sin tipo" call use `Task` in the proof (seen red without it).

## 2026-11-10 · add-subagents-view · 6→7
Reviewer noted stale pending entries are dropped only on SubagentStart, so an unmatched queue is trimmed by the 20-entry cap alone. Not a violation of W62; no code change.

## 2026-11-10 · add-subagent-detail · 6→7
Reviewer found nothing against the contract (8 proofs re-run, all green).

## 2026-11-10 · add-subagent-detail · 6
A full-suite gate went red once on `src/main/reply.test.ts` (20 s timeout), a tmux test this change never touched; it passed 3/3 alone and 2/2 in the next full runs. Same family as the ~1000 s W62 hang: a git/tmux call blocking under load. Not patched blind; open question for a change of its own: which call blocks (likely a synchronous `tmuxOut`/`execFileSync` in test helpers or `openWorktree` under parallel files).

## 2026-11-10 · add-doctor-install-terminal · 6→7
Reviewer found nothing against the contract (both proofs re-run, green).

## 2026-11-10 · add-doctor-install-terminal · 6
The builder's first full gate went red with 3 failures, one seen: `src/main/workspaces.test.ts` › «refuses an invalid branch name», a file the change never touched; the rerun was 224/224. Third sighting today of git/tmux tests failing only under full-suite load (with reply.test.ts and the W62 hang): it is a pattern, not noise. Needs its own change.

## 2026-11-10 · add-doctor-install-terminal · 7
Adding a `snapshotView()` call to DoctorChip broke three tests whose hand-built `window.atril` lacked it. Fixed in the test mock, not with optional chaining in the app. Lesson: a component that gains a new `window.atril` call must be checked against tests that mock the bridge by hand (`rg "window.atril = "`).

## 2026-11-10 · fit-flow-panel · 6→7
Reviewer found nothing against the contract (4 proofs re-run, green). Noted Fold.tsx gained role="region" for every fold in the app, outside the approach's file list; kept.

## 2026-11-10 · fit-flow-panel · 6
The contract aimed at 1080 px; Pau's window is ~900 px (his screenshots: 2880×1768 at 2x) and the first build still scrolled there. Lesson: take the target size from the person's own screenshots, not from a round number, and look at the photo at that size before the review.

## 2026-11-10 · test infra · 6
Root cause of the day's flaky tmux/git timeouts (W62 hang, reply, workspaces, changes, status, create): vitest ran ~10 workers, each spawning real git and tmux, under a machine load of ~7. A test taking 2 s alone took up to 35 s in the full run. Measured: with `maxWorkers: 4` the slowest test fell to 14 s, zero failures, +15 s wall time; two more full runs green. Lesson: a timeout that only appears in the full run is contention until measured otherwise — time each file in a full run before raising timeouts.

## 2026-11-10 · adopt-grafito · 6→7
Reviewer found nothing against the contract (4 proofs re-run, green). Noted `UiState.palette` is optional in the type while main always fills it; kept, the same as other optional ui fields.

## 2026-11-10 · expand-tour · 6→7
Reviewer found nothing against the contract (W23 proof and the i18n scan re-run, green; ~12 text claims spot-checked true).

## 2026-11-10 · expand-tour · 6
The step table written before reading the code said four untrue things (Nueva tarea «crea en Jira», a red rail badge, a live subagent terminal, the 5 h reset). The builder caught them by checking each sentence against its component. Lesson: copy for a tutorial is a claim about the code — write it from the component, not from memory.

## 2026-11-10 · redesign-connections · 6→7
Reviewer: (1) the Paleta/Tema row labels in Appearance were scope that arrived unasked — kept, recorded here; (2) asked whether folding a row mid-Reemplazar kept `replacing` — it did, so reopening showed the steps instead of Gestionar. Fixed: the row toggle resets `replacing`; case added to «connect guides in three steps» (seen red first).

## 2026-11-10 · fix-ci-with-claude · 6→7
Reviewer found nothing against the contract (3 proofs re-run, green); noted the double-call refusal text («Ya se está enviando a ese trabajo») was not among the decision log's three, which the criterion allows. No real-app photo: no snapshot fake has a failing-CI MR with an agent; the sketch shows it.

## 2026-11-10 · quick-replies · 6→7
Reviewer found nothing (3 proofs re-run, green). Before the review the session caught that a failed send kept the buttons disabled (no retry); W76 amended and fixed, seen red first. Unverified on a real Claude Code: that its AskUserQuestion selector takes a typed digit plus Enter — listed under «Sin probar con datos reales».

## 2026-11-10 · focus-mode · 6→7
Reviewer: (1) W78's proof tested only the pure table, not main's wiring — a broken isFocused read or replay would pass. Fixed: `createNotifyGate` holds the wiring and its test proves a quieted entry is never replayed (mutation seen red: gate always showing). (2) asked whether «Volver a» survives leaving Trabajo — decided yes, latent focus, logged. (3) a removed remembered workspace kept `returnTo` set — now cleared when the list loses it. Lesson: when a proof is a pure helper, the wiring around it needs its own seam or it is unproven.

## 2026-11-10 · atomic-records · 6
A full-run red («Unexpected end of JSON input» in tmux.test.ts) was a real bug, not load: `writeRecords` truncated then wrote workspaces.json while watchers read it. Reproduced 3/3 with a write/read race test; fixed with temp file + rename (and repos.json, same pattern). Lesson: a parse error in a test is evidence of a race in the code, not of a slow machine — reproduce before blaming contention.
