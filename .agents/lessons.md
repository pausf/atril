
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

## 2026-11-10 · agents-overview · 6→7
Reviewer found nothing against the contract (3 proofs re-run, green). Asked whether xterm refits after «Todos» hides it: yes, Terminal.tsx's ResizeObserver fires when the container goes from 0 to its size. No change.

## 2026-11-10 · add-qa-lab · 6→7
Reviewer found nothing (3 proofs re-run, green). Before the review the session added the Android SDK-folder lookup for adb/emulator, and found the test passed or failed depending on the machine (this Mac has ~/Library/Android/sdk): isolated HOME and ANDROID_* in the test. Lesson: a check that reads the user's home needs the test to own that home.

## 2026-11-10 · pause-agent · 6→7
Reviewer found nothing against the contract (3 proofs re-run). Asked whether a removed workspace leaves its pause mark: it did; dropFiles now removes it (seen red first). Before the review, the builder flagged that Claude Code's idle Notification (~60 s at the prompt) would end a pause; the hook now ignores idle_prompt for the mark and W87 says so (seen red first). Lesson: a mark that a hook clears must name which hook events count, including the ones Claude Code sends on its own.

## 2026-11-10 · open-work-from-mr · 4→6 and 6→7
Two cold spec reviews caught the first design leaving Libretto's patterns (an Atril worktree under review-project's own; libretto-flow given an MR URL it does not take); redesigned to Libretto's own paths. Work-reviewer found nothing; it asked whether anything treats a review session as a worktree — yes: the panel, documents, Cambios and QA read its folder, the person's copy. Fixed with `flowWorkspace` (W91), and the continue base is now the merge-base with the main line so Cambios shows the whole MR (W89 amended). Both seen red first. Lesson: before wiring a command into a flow, read the command's own file for its inputs and its isolation.

## 2026-11-10 · cost-per-work · 6→7
Reviewer found nothing (4 proofs re-run). Noted cost.ts keeps in-memory totals of a removed workspace until restart: a few numbers, kept as is. Before the review the session dropped the «≈» in front of «< 0,01 $» (seen red first; W94 amended).

## 2026-11-10 · mr-line-comments · 6→7
Reviewer found nothing (4 proofs re-run). The session caught that the builder's new file, linecomments.ts, was governed by no spec (mr's Governs lists files one by one): added to mr and excluded from workspaces. Lesson: a builder's new file needs a Governs check before landing, not only its tests.

## 2026-11-11 · work-history · 6→7
Reviewer found nothing (2 proofs and the i18n scans re-run). The builder's mutation check (removing the append's guard turned the test red) is the kind of proof that a «failed append doesn't fail removal» clause needs.

## 2026-11-11 · first-run-setup · 6→7
Reviewer found nothing (W97 proof and ui.ts validation re-run). The builder corrected the contract's «live workspace» to «any workspace record»: the stricter reading would have shown the card beside a sidebar of stopped workspaces. Lesson: «live» is a tmux word in this app; for what a person sees, say «in the list».

## 2026-11-11 · package-and-sign · 6→7
- The resources test asserted one hook import by name; the hook also imports `branchsize.mjs`, so deleting it would ship a broken hook with a green run. Fixed: the test reads every `from './x'` in the hook and checks each file exists.

## 2026-11-11 · package-and-sign · 6→7
- The builder added an ESLint `.cjs` globals block and `electron-winstaller: false` without the contract naming them. Fixed: both named in Scope **In**. Support edits a new dependency forces still go in the contract.

## 2026-11-11 · package-and-sign · 6→7
- Whether electron-builder accepts the config is unproven: nothing may be built here. Not fixed, by design: «sin probar» entry in CLAUDE.md and the checklist in bocetos/instalar.html §4.

## 2026-11-11 · ask-card · 6→7
- F35 names a singular form the code had but the proof never exercised (only 2 and 0). Fixed: a case with one other change; forced red once by asserting a wrong text.

## 2026-11-11 · ask-card · 6→7
- The reviewer could not confirm the Grafito selectors W105 parses. Checked: both exist verbatim (styles.css:142, :180). No change.

## 2026-11-11 · ask-card · 6→7
- `.quick-replies` CSS suspected dead after the card. Checked: the Pause button in Todos still uses it. No change.

## 2026-11-11 · panel-c · 6→7
- The change retired the Cambios section, the diff modal and the Checklist button, but only amended F20/F29/F30; F13, F21, F22, F25, F26, F31 and F32 stayed live and contradicted the code. Fixed: each amended in the change. When a change removes a UI part, list every criterion that names it.

## 2026-11-11 · panel-c · real app
- jsdom passed while the real window was broken: new step classes reused global `.seg` and `.bar`, and a 3 s poll cancelled a 2.7 s git diff forever. Caught only by driving the real app with Playwright. Every UI change is driven in the real app before landing.

## 2026-11-11 · subagent-branches · 6→7
- A click fires mouseenter then focus, so "ask once per entry" asked twice. Fixed: an entry is keyed by the branch until leave; a test hovers then focuses and counts one ask (watched red first).

## 2026-11-11 · subagent-branches · 6→7
- F28 still said «row» after rows became branches. Amended in the change; the stale panel prose (Subagentes folds) is superseded by F27/F30 amended.

## 2026-11-11 · qa-screen · 6→7
- The paste into an agent pane only stripped ESC; ^C, ^D and \r inside a bug body could act before Enter. Fixed: every C0 control but \n and \t is dropped; the hostile-paste test carries them (watched red).

## 2026-11-11 · qa-screen · 6→7
- report.json was opened with stat (follows symlinks) while shots used lstat. Fixed: lstat for both; untrusted files are never followed.

## 2026-11-11 · qa-targets · 6→7
- A device hold survived a dead mobile pane when the same workspace then ran a browser QA, so another workspace was told every emulator was busy. Fixed: a browser launch frees its workspace's holds; test watched red.

## 2026-11-11 · qa-targets · 6→7
- lstat on qa.json alone follows a linked `.atril` folder out of the repo. Fixed: the folder is lstat'ed too; lstat every segment an untrusted path crosses, not only the last.

## 2026-11-11 · qa-targets · 6→7
- Targets are kept per repo but a worktree may lack the folder; tmux's raw error would reach the card. Fixed: a missing folder answers «Elegir a mano» before any split; test watched red.

## 2026-11-11 · plain-errors · 6→7
A test fixed along the way (a race in `boxes.test.ts`) stayed outside the contract and the reviewer flagged it. If a race shows up while building, it goes in the Decision log at that moment, not afterwards.

## 2026-11-11 · plain-errors · 6→7
The initial quota state («aún sin leer») falls into the generic sentence; it fits W20, but a «cargando» state painted as an error is easy to forget when writing sentences per cause.

## 2026-11-11 · login-path · 6→7
Nothing against the contract. Reviewer's doubt: does a fish `$SHELL` join `"$PATH"` with spaces? No: since fish 3, PATH is a path variable and, quoted, it joins with «:». If an odd shell does not, the fixed folders still get in. General lesson: an empty PATH is inherited by every Dock app; any new tool launched from main goes through here.

## 2026-11-11 · dirty-copy · 6→7
The retry with empty text (plain Claude in a worktree) had no test: a criterion saying «el mismo texto y modo» covers two code branches, and the test only proved one. Added «a blank dirty retry opens plain claude in a worktree».

## 2026-11-11 · ws-errors · 6→7
«Olvidar» never deletes the folder, but its test deletes the folder before forgetting: it could not see a deletion. A «never X» clause needs a case where X would be visible.

## 2026-11-11 · ws-errors · 6→7
`atril:ws:forget` accepts any id, also a live one with its folder; only the window limits it to the broken case. Accepted: it does not touch the folder and the record can be recreated by opening the branch.

## 2026-11-11 · model-pick · 6→7
`proposeStart` built the displayed command with an unvalidated model (the one that runs was validated). If two paths build the same command, both go through the same list; now «an unknown effort is refused before anything runs» proves it.

## 2026-11-11 · model-pick · harness
Since `login-path`, the login shell's PATH goes first: a fake `claude` only in `PATH` loses and the tests start the real one (it burned quota on test repos). The harness uses a fake `SHELL` that prepends the doubles; noted in CLAUDE.md.

## 2026-11-11 · reopen-work · 6→7
Two reopens of the same work at once (reloaded window) both saw «sin sesión»; the second's `catch` killed the first's healthy session and neither came out right. Cleanup after a failure may only undo what that same call created: a lock per id. Proof: «a stopped work reopens where it was».

## 2026-11-11 · reopen-work · real-app test
Killing tmux with a work open froze the whole of Atril: `term:resize` reached a dead pty client, node-pty threw EBADF inside an `ipcMain.on` and Electron showed a modal NSAlert. The tests did not see it because they do not use a real node-pty; it only showed up when testing in the app. W149.

## 2026-11-11 · state-files · 6→7
Accepted without fixing: if `workspaces.json` gets damaged between «Quitar»'s initial check and its final write, the worktree has already been removed and the write fails without overwriting anything. Opening does undo (W146). A window of milliseconds; if it shows up in practice, removing must write the record before deleting.

## 2026-11-11 · net-errors · 6→7
W150 said «cualquier error HTTP» and the change only touched the calls on its list: creating a repo (`HTTP <n>` fallback), searching boards, moving to In Progress and passing to Jira still carried the number in the sentence. When a criterion says «cualquier», look for all the calls (`rg "respondió|HTTP \$\{"`) before closing. Fixed; their tests now require the exact sentence.

## 2026-11-11 · net-errors · pending
`forge/scores.ts:225` and `forge/lenses.ts:175` can pass `err.message` to the sentence if what is thrown is not a `Failure`. Goes with the MR redesign.

## 2026-11-11 · libretto-models · 6→7
The Decision log said the spec's sentence «la copia es `171db90`» changed, and the commit did not touch it: a decision that names a change to the living spec is made in the same commit, not left to `land.py`.

## 2026-11-11 · net-errors · after landing
`qa-report.test.ts` still expected «400» in the sentence: `net-errors` changed `libretto.ts` and I did not run the tests of its users. When changing a shared sentence, `rg` the old text in `*.test.ts` before landing.

## 2026-11-11 · repo-gone · 6→7
Nothing against the contract. Accepted: removing a repo reads `workspaces.json` and then writes `repos.json` with no lock; a work opened right in between would point to a removed repo (W155 would say so on use).

## 2026-11-11 · term-attach · 6→7
«Never rejects» was proven only in `pty.attach`; the IPC handler read the list with the strict reader and would reject with a damaged `workspaces.json`. An IPC that only shows uses `listWorkspacesOrNone` (W145).

## 2026-11-11 · fast-panel · 6→7
Replying, quick replies and pausing decided «alive» with tmux's 1 s snapshot because `listWorkspaces` started using it: a shared reader that gets cheaper also changes whoever acts. Actions read the record and ask `has-session` directly.

## 2026-11-11 · fast-panel · 6→7
The plan cache read the checklist before its `stat`: an edit in between stored the old plan under the new key. First the key, then the read.

## 2026-11-11 · fast-panel · measurement
On Pau's Mac each process costs ~125 ms at rest and 300–800 ms under load (not git: `/usr/bin/true` 3 ms, git does 6.5 ms of work; probably antivirus). Before/after with 4 works: boxDiff 3.9–5.3 s → 1.5–1.8 s; repeated boxes 4.7–6.3 s → 1.6 s; at rest 11 → 5 processes/s. Left: launch nothing if the file watcher says nothing changed.

## 2026-11-11 · grafito-you · 6→7
I changed `--run` to grey for the «trabajando» label without looking for who else used it: the unread notice dot, the search selection, the current step and «conectado» lost the accent. Before changing a token, `rg "var(--token)"`; if the change is for a single place, a new token.

## 2026-11-11 · diff-header · 6→7
Removing the header exposed that `diffLine` coloured any `--- x` as a header, also a deleted line; and a rename with no changes was left blank. A text test does not see classes: if the change is about how it looks, the test looks at the markup.

## 2026-11-11 · quiet-panel · 6→7
A watcher that failed (an `fs.watch` error or `rev-parse` down once) stayed dead in its slot forever and that work computed on every turn. A resource that fails is replaced on the next request, not kept. Accepted without fixing: the wall clock going backwards lengthens the 30 s cap; a work no longer in the list keeps its watcher until the fifth pushes it out.

## 2026-11-11 · quiet-panel · measurement
With 4 works: repeated boxes 1.6 s → 0–1 ms; returning to a work 2.4 s → 62 ms; at rest 5 → 2.2 processes/s. Left: the first visit (~6 s, cold plan) and the open box's diff, which repeats every 3 s.

## 2026-11-11 · flow-empty · 6→7
«Never blank» was proven with «leyendo» and with the early phases, but `null` (main says «no flow», e.g. a review) still left the tab empty. For a «never X» promise, enumerate every value that can arrive, not just the example's.

## 2026-11-11 · lessons-first · 6→7
The criterion named three places (open, reopen and the «Empezar» command) and two link types, but the tests covered only the linked file and not the displayed command. Each clause of a criterion with «y» needs its case.

## 2026-11-11 · lessons-first · after landing
`LESSONS_NOTE` is Spanish without `t()` and broke «no spanish text skips t» (src/preload/i18n.test.ts), which I did not run. A text for the model carries `// i18n-ignore` with its why; and when changing main, run both language tests, not just one.

## 2026-11-11 · qa-to-mr · 6→7
The builder widened `threads.reply`'s answer (another capability's, mr) and there was no `spec-mr.md`: the new shape would never have reached the MR spec. If a change touches a file governed by another capability, its delta goes in the same change. Accepted pending: what the QA agent writes in notes and steps is published as is; there is no preview before «Publicar en la MR».

## 2026-11-12 · notify-core · 6→7
A numbered reply from the Mac turned every refusal of `answerAgent` into «ese trabajo ya no está», although the work still existed (N3 allows that sentence only for a vanished work or pane). A result type with three outcomes was squeezed into two. Fixed with `fromAnswer`, which keeps the refusal's own sentence; proved by «only a vanished work reads as gone» and «a refused numbered reply says why, not that the work is gone».

## 2026-11-12 · notify-core · 6→7
Two docs files from other work (`bocetos/qa-real.md`, `bocetos/dogfood-juegos.md`) rode in the change's range because they were committed on its branch before the build. Harmless, but a reviewer cannot tell them from scope creep. Commit unrelated docs on their own branch or say in the change which ones ride along.

## 2026-11-14 · notify-ui · 6→7
The test-notice animation and the «not at Mac» dimming shared one ternary, so after the first «Probar un aviso» the banner was never dimmed again (S42). Two independent states folded into one class expression; the S42 test never pressed the test button first. Fixed by composing the classes separately; «testing a notice says where it went» now hovers a list type after a test.

## 2026-11-14 · notify-ui · 6→7
`App.tsx` and `Problem.tsx` changed for V6/V15 and S45 but the scope's «In» did not name them. When a criterion needs a shared component, name it in the contract as the box is cut.

## 2026-11-14 · terminal-read-only · 6→7
The hook dropped `kind: 'question'` when any Notification arrived while an `AskUserQuestion` waited, so the card fell back to «Sigue» (pasting the continue sentence into the selector), Automático stopped answering, and a `permission_prompt` turned «Permitir» into option 1. The test fired that exact sequence but only asserted the state after the later Stop. Fixed: a Notification while a question waits keeps it a question; «the hook keeps every question…» now asserts the in-between state after a plain and a permission Notification. Assert every intermediate state a sequence passes through, not only the last.

## 2026-11-14 · terminal-read-only · 6→7
A failed «Separar en MRs encadenadas» and a failed card answer showed the bare error in a span, outside the error rule (what happened, what it stops, one fixing button). The composer already used `Problem` for the same failure. Fixed: both use `Problem` with «Volver a intentar», proved in changes.test and agentcard.test (seen red without the fix). A new send path copies the error shape of the sibling that already exists.

## 2026-11-14 · terminal-read-only · 6
With a `tmux attach -r` client on the session, tmux 3.7 refuses every `send-keys` («client is read-only»): answers, pause and the Enter after a paste all stopped, while every unit test passed because none attached a read-only client. Only the real-app drive found it. `tmux.ts` falls back to `paste-buffer -r`; «keys reach a pane that a read-only client watches» attaches a real `-r` client. When a change alters how a tmux client attaches, test sending keys with that client attached.

## 2026-11-16 · mr-page · 6→7
GitLab's assembled diff (`fetchDiff`) always wrote `--- a/` and `+++ b/` headers, so a deleted `proposal.md` on GitLab still counted as the MR's contract (M46); only GitHub's real diff carried `/dev/null`. Fixed by writing `/dev/null` from GitLab's `new_file`/`deleted_file`; page.test now holds a GitLab deleted and added proposal. When one forge's data is rebuilt to look like the other's, test the rule on both.

## 2026-11-16 · mr-page · 6→7
The reviewers branch rethrew anything not a `Failure`, so a 200 with a non-JSON body (a proxy page) failed the whole MR page instead of its card (M46). Fixed: any reviewers error becomes the card's problem; page.test feeds an HTML body (seen red). A «fails only its part» rule has to catch every error of that part, not just the typed ones.

## 2026-11-16 · mr-page · 6→7
A thread on a cut or unsent file went to Conversación with «Esa línea ya no está en el diff», which is false: the line is in the MR, only not drawn (M47). Fixed: it stays with its file. Placing rules for drafts already handled cut files; threads were not given the same case.

## 2026-11-16 · mr-page · 6→7
Not fixed, reported: a lens review waiting behind a score reads «Revisando…», not «En cola» (M45). Main never sends the review's queue state to the window; the behaviour predates this change and M45 may mean only scores.

## 2026-11-20 · refine-request · 6→7
A dev-only snapshot view and a seed prop went into `App.tsx`, outside Scope «In», with no line saying so. Photo plumbing is scope too: name it in Scope when the box that needs the photo is cut. Fixed: added to Scope and the Decision log.

## 2026-11-20 · refine-request · 6→7
`withAnswers` trimmed the end of the request when answers were present, while I30 says «the request as typed». Small helpers that tidy input drift from criteria that promise verbatim text. Fixed: no trim, and a case with trailing spaces in the I30 test.

## 2026-11-20 · refine-request · 6→7
`is_error !== false` sent any exit-0 JSON without `is_error` (and `null`) to detail `is_error`, against W209's mapping. Copied from `scores.ts`, which has the same shape and is not fixed here (M16 owns it). Fixed in refine.ts with `null` → json and missing questions → schema, both tested.

## 2026-11-20 · refine-request · 6→7
I30 covers both dialogs and both «Lanza» templates; its proof drove only «Nueva tarea» with the flow template. A criterion naming two surfaces needs each one driven once. Fixed: a test for «Nuevo trabajo» in Automático with the composed text.

## 2026-11-20 · refine-request · harness
A gate hung ~10 h overnight: killed runs left `atril-test-*` tmux servers alive and the next suite never got past RUN. The gate script now kills leftover test servers first and wraps each suite in a hard `alarm` (30 min, rerun 15 min).

## 2026-11-20 · harness-ladder · harness
Two rules moved from prose to `pnpm lint` (W210, W212). Files under `src/renderer` and `src/main` (tests apart) can no longer import from each other: they talk through preload. Outside `paths.ts`, `trust.ts` and `qa.ts`, code in `src/main` can no longer call `homedir()` or read `process.env.HOME`. The home rule replaces «2026-11-09 · fix-test-home-leak · 6» (every module resolves the home through one function) and the home half of «2026-11-10 · add-qa-lab · 6→7». Both are proved by `src/main/harness.test.ts`, which lints one text that must fail and one that must pass against the real config.

## 2026-11-20 · harness-ladder · harness
`pnpm lint` now refuses any assignment to a member named `atril` outside `src/renderer/mockApi.ts` (W211). A test with its own stubs passes them as `mockApi({}, undefined, over)`: they are laid over the full mock, so a component that gains a new `window.atril` call no longer breaks tests whose mock lacks it. Ten tests were migrated, changing only their setup line. This replaces «2026-11-10 · add-doctor-install-terminal · 7» (hand-built `window.atril` missing `snapshotView`, check every hand-made mock). `over` is typed loosely on purpose: `components/terminal.test.tsx` stubs `term.input`, a member the API no longer has, to prove that nobody calls it.

## 2026-11-20 · harness-ladder · harness
A commit with red typecheck or lint can no longer go in (W213, W214). The `prepare` script sets `core.hooksPath` to `.githooks`, and `.githooks/pre-commit` runs `pnpm -s typecheck` and `pnpm -s lint` with `set -e`, in about 5 s. This replaces the typecheck and lint half of «2026-11-09 · add-atril-core · 8» (a gate inside an `&&` chain that always returned 0), «2026-11-09 · add-agent-activity · 6» (two commits in a row while red) and «2026-11-09 · add-language · 6» (proofs committed while red). The test half still depends on the gate: the hook does not run the suite, which takes more than 10 min under load.

## 2026-11-20 · harness-ladder · 6→7
`no-restricted-imports` with `**/main/**` missed `'../main'`, a directory import that resolves to `src/main/index.ts`. A glob boundary needs the bare directory too (`**/main`). Fixed, with that case in the test.

## 2026-11-20 · harness-ladder · 6→7
The `window.atril` rule was scoped to `src/**` while W211 says any file; `test/setup.ts` slipped through. Scope a rule by the criterion's words, not by where the offenders happen to live today. Fixed: `**/*.{ts,tsx}`.

## 2026-11-20 · harness-ladder · 6→7
A call-site selector (`callee.name='homedir'`) misses `import { homedir as h }`. Ban the import specifier as well as the call. Fixed: `ImportSpecifier[imported.name='homedir']`.

## 2026-11-20 · harness-ladder · harness
Every full gate in this change failed 12–14 tmux/git tests under load and passed them alone on rerun. The gate is green but twice as slow; queue: run the tmux/git files in their own vitest project with fewer workers.

## 2026-11-20 · mr-page-wide · 6→7
Renaming a test that other criteria cite (M5, M23) leaves dead proofs in the live spec once only the amended criterion lands. Before renaming a proof, `rg` its name in `.agents/specs/`. Fixed at landing.

## 2026-11-20 · mr-page-wide · 6→7
The contract's Prior decisions still said «↑/↓ o K/J» after the spec review moved to J/K only; the durable line is the one that outlives the change, so it must be re-read after every contract fix. Fixed.

## 2026-11-20 · mr-page-wide · 6→7
The outcome «nada se monta encima de otra fila» was checked on a photo that stayed in the scratchpad. A photo that proves an outcome goes in the commit. Fixed: `bocetos/novedades/mr-bandeja.png`.

## 2026-11-20 · mr-page-wide · 6→7
Tour text and two test helpers changed outside Scope «In»; they followed from M43 but were not named. Fixed: listed in Scope.

## 2026-11-20 · skills-list · 6→7
K5 said «one test holds every clause» but the builder split the no-repo case into its own uncited test. When a criterion names one test, every clause goes in that test or the criterion names both. Fixed: folded into the cited test.

## 2026-11-20 · skills-list · 6→7
K6's empty-filter and «aún no tiene skills propias» clauses were proven only in uncited tests. Same rule as above. Fixed: folded into «search and filter narrow the cards».

## 2026-11-20 · skills-list · 6→7
A screen that reloads on a selector change took every reply, so a slow reply for the previous repo could land under the new one. Any `.then(setState)` keyed on a choice drops replies from a superseded choice. Fixed: K11 and its test, forced red without the guard.

## 2026-11-23 · skills-toggle · 6→7
The K11 lesson was applied to `load()` but not to the write's answer: a reply for one repo could still land under another while a write was pending. A guard for stale replies covers every `setData`, not only the first one found. Fixed: K18, selector disabled while writing.

## 2026-11-23 · skills-toggle · 6→7
Atomic write (`tmp` + `rename`) onto a symlinked settings file replaces the link with a plain file and silently cuts a dotfiles setup. Writing a file the person owns resolves `realpath` first. Fixed: K13 clause and test, forced red.

## 2026-11-23 · skills-toggle · 6→7
`revealFile` mapped any unknown origin to `personal`, so an `atril` ref revealed the user's settings although K12 gives it no `writesTo`. Map only the origins the contract names, refuse the rest. Fixed.

## 2026-11-24 · skills-editor · 6→7
A guard that clears the dirty flag must also end the state that was dirty: «Nueva skill» discarded the changes but left the editor open with the text, so later exits no longer asked and the text was lost. When `next()` does not unmount the editor, discarding closes it. Fixed and forced red.

## 2026-11-24 · skills-editor · 6→7
Creating a skill was refused when only a command had that name, though K21 names skills; a check over a list keyed by name filters by every field the criterion names (`kind`). Fixed.

## 2026-11-24 · skills-editor · 8
Second time a test name with `\'` broke its spec-drift citation (also in skills-list). Prettier keeps single quotes with an escaped apostrophe, and spec-drift reads the literal text. Builders write such names in double quotes; landing runs spec-drift before committing, not after.

## 2026-11-24 · skills-plugins · 6→7
The plugin-name regex allowed a leading `-`, so `-y@x` passed validation and reached the CLI as a positional that could read as a flag; the "bad input" test only failed because of a trailing space. A regex guarding a CLI positional starts with an alphanumeric, and each bad case in the test fails for the reason it names. Fixed in contract and code.

## 2026-11-24 · skills-plugins · 6→7
Success was "not failed" instead of "`outcome` is `ok`", so exit 0 with `{}` showed «Instalado». A success check names the success value. Fixed with tests.

## 2026-11-24 · skills-plugins · 6→7
A decision log line said a test covered the catalog read during an action; none did. Fixed: asserted.

## 2026-11-24 · skills-plugins · 6→7
`undefined === undefined` matched a `local` install without `projectPath` when no repo was picked, offering buttons main would refuse. Comparisons against an optional lookup guard the lookup first. Fixed, forced red.

## 2026-11-25 · skills-usage · 6→7
- The cold reviewer found nothing. Looking at the photo turned up two failures the tests took as fine because the contract allowed them: Atril's skills counted as «candidatas a apagar» (they are not switched off one by one) and a single use said «1 veces». Rule: look at the photo against what the person will read, not only against the criterion; the singular and what cannot be touched go in the contract from the start.
- The text filter before `JSON.parse` looks for `"name":"Skill"` without spaces: checked against a real session of this project (Claude Code writes compact JSON). If one day it counts 0, look here first.

## 2026-11-26 · crash-reports · 6→7
- The work reviewer fed the scrubber real-looking input and found what the per-pattern test missed: quoted text survived in the stack (V8 repeats the message on its first line), bare hostnames (`jira.acme.corp`) and paths with spaces leaked, short `password=` values stayed, a damaged `crash-sent.json` silently stopped all sending, and the e-mail regex took ~300 ms on 16 KB. Rule: a scrubber is proven by adversarial inputs and a timing case, not by one example per pattern; anything whose output leaves the machine is cut before it is scanned.
- Pau changed the delivery three times (PR from a branch → fork → issue turned into a PR by a repo workflow) once the repo was going public. Rule: settle visibility and who has write access before designing anything that writes to a forge.

## 2026-11-26 · add-agent-harness-evals · 6→7
- The work reviewer found the contract's last outcome unmet: the one real proof run (add-coupon × 2 on haiku) scored 0 of 2 with no skill called, so the `/libretto:libretto-attacca` prefix is unconfirmed in `-p`. The fake claude proved every path except the one the whole eval depends on. Rule: when the premise of a tool is "a real X does Y", the first real run must check that premise before anything is scored, and the report must show it (`skills called`); a green suite against a fake proves the plumbing, not the premise. Reported as not fixed: the prefix is Pau's call.
- The reviewer asked whether the empty `.agents/specs/evals/spec.md` skeleton is intended. It is: `land.py` fills it at landing. Rule: a new capability's skeleton is created with its `Governs:` line in phase 2 and says so in the change document, so a cold reader does not read it as a missing spec.
## 2026-11-26 · add-pr-qa-pictures · 6→7
- Box 4 still said «Before by ancestry» after the stop moved «Antes» to «a recorded MR the forge reports merged» (squash merges break ancestry). A fix at the stop rewrites every line that named the old mechanism, checklist included. Fixed.
- The reviewer could not see that a 15 s OCR timeout ends «unreadable», nor that «Publicar sin imágenes» with every picture blocked posts the comment: both were proven (a runner answering 124 in W243's test; `publish(ID, token)` with all rows blocked in W250's), but only inside longer tests. A clause proven deep in a test is a clause a reader misses: name it in a comment above the assertion. Already true; nothing to change in code.

## 2026-11-26 · add-pr-qa-pictures · 6
- The drive script connected over CDP to port 9333, which another Atril instance with the person's real workspaces was already using; it clicked «QA» there before the mistake showed. Before driving the real app, check that the CDP port is free (`lsof -iTCP:<port> -sTCP:LISTEN`) and pick another; never assume the port Atril's docs use is yours.

## 2026-11-26 · enforce-written-rules · arnés
Two written rules moved from CLAUDE.md to hooks (W230–W234). The work-identifier scan before a push is `.githooks/pre-push`; it scans the tip tree of each pushed ref, drops blank lines from the private list (a blank pattern matches every line), ignores only `pnpm-lock.yaml` lines that contain `integrity:`, and refuses the push when the scan itself fails. «Never `pnpm build`» is a PreToolUse guard in `.claude/settings.json` (`.claude/hooks/no-build.sh`, exit 2 with one line). This replaces the prose rule in CLAUDE.md «Puertas» and the «Antes de cada push» scan (including the note that a lock `integrity` hash can match by chance). CLAUDE.md lost its per-branch history and went from 14474 to about 5300 bytes, with a test (W235) that keeps it under 7000. Known ceilings: an identifier added and removed inside one push passes; `pnpm -C dir build`, `sh -c "pnpm build"` and other build entry points pass the guard; `git push --no-verify` is the person's own choice.

## 2026-11-26 · enforce-written-rules · 6→7
Reviewer found nothing against the contract (the six proofs W230–W235 re-run, 11/11 in harness.test.ts, green). It did not re-run the forced-red mutations; the builder did (chmod -x, no `sed`, every git-grep error read as no match, broken guard regex, wrong matcher, guard that never denies) and each turned the named test red. Not exercised: the guard inside a live Claude Code session; the test runs the registered command with `sh -c` and `CLAUDE_PROJECT_DIR` set, as settings.json names it.

## 2026-11-26 · english-source · 6
A «forced red» went by green because `sd` with `^` matched nothing and the file never changed. Check the diff of the sabotage (`git diff --stat`) before reading the test's verdict; a red you did not see happen is not a red.

## 2026-11-26 · english-source · 6
Three tests read Spanish through an identity `t` (`(es) => es`) and a production export `STEPS` did the same. Flipping the keys broke them, not the catalog. When the source language of a text changes, grep for identity `t` helpers, not only for `t('…')` calls.
## 2026-11-26 · fewer-go-on-cards · 6→7
Reviewer found nothing against the contract (27 proofs re-run, all green). Before the review the build caught two gaps itself: a Stop with an unanswered question would have become `done` (W228 added, the ask said «no pending question or permission»), and four older proofs assumed every Stop is `needs-you` (W26 and W87 amended in the change, the tests updated, not weakened).

## 2026-11-26 · fewer-go-on-cards · 6→7
Second, bounded review of the why-card box (25a000f...HEAD): nothing found, 6 proofs re-run green. Worth keeping: after this change a «Sigue» card only shows at the keep-going cap or after a pending wait, so the loop wording mostly arrives together with the cap; a loop in Automático is still pressed up to 3 times before its card.
## 2026-11-26 · skills-dense · 6→7
The box claiming «at least 20 whole rows on the photo» was ticked on a photo of the top of the screen, which shows 15. The drive script had counted 23 on a scrolled view that was never kept. The photo that proves a number is the one the count was taken on. Fixed: a second photo, scrolled, 21 rows counted by the same script (local `bocetos/`, out of git since 26 Nov).

## 2026-11-26 · skills-dense · 6→7
Replacing the whole groups block with the «Nada se llama» message also removed the «Plugins» line, which K40 says always shows. An empty state that swaps out a container takes along everything in it that is not a result. Fixed: the message sits above the groups; a test searches «zzz» and finds «Añadir plugin» (seen red first).

## 2026-11-26 · skills-dense · 6→7
The docs said 203 example items while the contract and seed say 171: the heading adds Atril's own 32. A number in a doc names what it counts. Fixed in novedades and the decision log.

## 2026-11-26 · skills-dense · 6→7
The «Resumen» label on the tile group arrived without a criterion; it exists because the tiles and the filter buttons share names. Kept and logged in the decision log.

## 2026-11-26 · skills-dense · real app
The first drive connected over CDP to another session's Atril on the same port and read Pau's real skills (heading 169). Its photo was deleted before anything was committed. Every drive now uses its own port, checks the port is free first, and stops unless a seeded example row is on screen. And the bottom quota bar shows the real account's numbers: photos are cropped above it.

## 2026-11-26 · skills-dense · 1
I told Pau his brief was wrong («there is no `i18n-es.ts`») after checking only this branch, which was 46 commits behind `origin/main`, where English had become the source language. The brief was right. Before contradicting a claim about the repo, `git fetch` and check `origin/main`, not the worktree.

## 2026-11-26 · repo-harness · 6→7
- `skills` counted at most 300 entries (a guard against a huge folder) but the contract said «the number of skills», so a repo with 301 showed 300 with no word about it. Fixed: the cap is in W280 and a 301-skill case asserts 300 (forced red by removing the slice). A guard the builder adds against hostile input goes into the criterion in the same edit.
- The 1 MB cap was checked on `stat` and then the whole file was read, so a file that grew in between slipped past it. Fixed: read at most cap+1 bytes through the open handle and refuse when more came back. A size cap is on the bytes read, not on an earlier metadata call. Not provable by a test (a race): the oversize cases still cover the path.
- A `CLAUDE.md` that exists but cannot be read made `memory` fall through to `AGENTS.md` or a gap, against «`CLAUDE.md` wins when both are files». Fixed: it is found with its name and no count (W280, test with a mode 000 file, forced red).

## 2026-11-26 · repo-harness · real app
- Port 9333 for `ATRIL_CDP_PORT` was already taken by another Electron (the person's own Atril, being driven by another session), so my dev app could not open its debugger and `connectOverCDP` attached to THAT window instead. I only read its text, but the next step would have been clicks. Before attaching, check `lsof -iTCP:<port> -sTCP:LISTEN` belongs to a process under this worktree's `node_modules`, pick an unlikely port, and confirm the page (`Sin conectar`, the sample repo ids) is yours. Stop your own app by `pkill -f '<this worktree>/node_modules'`, never a global `pkill -f "electron-vite dev"`: other worktrees run theirs too.

## 2026-11-26 · repo-harness · 6
- `spec-drift --anchors` read `Proof: file "name"` with the quotes as part of the name and called every citation broken; the working form is `Proof: file name` with no quotes (the form the older criteria use).
- Main speaks Spanish by default (`lang.ts`), so a detail like «142 lines» built in main would have shown English-keyed text untranslated in tests and Spanish in the app. Items now carry names and numbers only and the window writes the sentences through `t()`.
- A criterion that said «one test holds every clause» grew to five clauses once the card was built, and the tests followed the clauses rather than the criterion. Cut the criterion when the tests split (W286 → W286, W288, W289, W295) instead of citing a test that no longer holds them.

## 2026-11-26 · fix-cdp-isolation · 6
- A fresh worktree has no Electron binary (`Error: Electron uninstall`, exit 1): a drive that expects «exit 1» reads that as the guard working. Before believing an exit code, read the log line that proves the cause (`atril: ATRIL_CDP_PORT … refusing to start`, plus Chromium's `bind() failed`). `node node_modules/electron/install.js` installs the binary; `pnpm install` does not.
- The hidden probe window of the CDP gate was the only window: destroying it fired `window-all-closed` → `app.quit()` before the real window existed. The unit tests were green and the first free-port drive «worked» because it read the target list before the app died. Drive until the real window shows, then check the app is still alive seconds later (W331).
- Seen three times as prose (`add-pr-qa-pictures`, `skills-dense`, `repo-harness`) and now enforced: a busy `ATRIL_CDP_PORT` makes a dev Atril exit 1, and `attachVerified` refuses any browser whose pages lack the launch token. Stop a drive with `pkill -f "$PWD/node_modules"`, never `pkill -f "electron-vite dev"` (other worktrees run theirs).

## 2026-11-26 · fix-cdp-isolation · 6→7
Reviewer found nothing against the contract (12 proofs re-run, typecheck and lint green). It did not drive the real app, so the busy-port exit and the free-port start rest on the builder's own drive (logged above); that drive is what found W331, which no unit test would have.

## 2026-11-26 · work-vs-main · 6→7
Reviewer found nothing against the contract (17 proofs re-run, typecheck and lint green); it read the main-side diffs, not the renderer ones. Before it, the cold spec review caught that W310's «ids both works define» would have made every pair clash on change documents already on main: a work's ids are only those its base does not define. A rule that compares two branches compares what each added, never what they share by ancestry.

## 2026-11-26 · work-vs-main · real app
The shared-ids line passed its test and, at the sidebar's width, cut the id itself («…que feat/b: W30…»). Text that ends in the one value it exists to show gets that value first, so an ellipsis eats the context and not the point. Seen only in the real window.

## 2026-11-26 · work-vs-main · 1
This work was itself created from a stale local checkout (the bug it fixes, #11): reset onto origin/main before anything else. Until this change lands, a work started from «New work» should `git fetch` and check `git log origin/main..HEAD` before building.

## 2026-11-27 · finished-means-finished · 6→7
Reviewer found nothing against the contract (5 proofs re-run, typecheck and lint green). Before it, the cold spec review caught that «no Go on» in W336 could never fail (W313 already hid the card) and that W334 joined two promises on one proof; and the builder found the W334 test passing for the wrong reason: an Automático work is turned `working` by its own «Sigue», so it is never reminded and the idle clause was untested. A manual work now carries the reminder clause (seen red). When one test holds a clause per mode, each clause needs a work in the mode that reaches it.

## 2026-11-27 · finished-means-finished · 1
Issue #4 was filed before work-vs-main's W313, so half of what it describes (the card) was already fixed in the window; the rest lived in main, which read the stale state file. When an issue predates a landing that touched the same path, re-read the issue against `origin/main` and fix only what is still true.

## 2026-11-27 · card-answer-lands · 6→7
Reviewer found nothing against the contract (4 proofs re-run, typecheck and lint green). It noted `CLAUDE.md` changed outside the «In» list (one «Untested» line for W339): added to «In». It did not drive the app, so W337's layout rests on the builder's drive. Before it, the cold spec review caught W340 contradicting W76's «Enviado» on press (amended), the row and strip cards able to send twice during the wait (main now refuses a second answer while one lands), and no rule for a window too short for both (the strip keeps 64 px).

## 2026-11-27 · card-answer-lands · real app
- The first drive seeded the tmux session with `new-session -x 120 -y 40`, which pins the window size: tmux read 120x40 whatever the client asked, so the row floor could not be seen. Atril creates sessions with no size; a seed copies the app's own `new-session` arguments.
- A fresh worktree's dev Atril could not open its terminal («No he podido abrir la terminal»): `pnpm install` leaves node-pty unbuilt for Electron (`allowBuilds: node-pty: false`). `pnpm run rebuild` (electron-rebuild) fixes it. Before reading a tmux size off a drive, check `tmux list-clients` shows the read-only client.
- The unit proofs were green while a 3 KB command pushed «Permitir» and the «did not arrive» problem under the strip's fold: only the real window showed it. The question text now scrolls in its own 8-line box and a new problem scrolls into view (W337, W340 grew those clauses).

## 2026-11-27 · ignored-files-not-dirty · 6→7
The work-reviewer was told `main...HEAD` and local `main` was behind origin, so it saw already-merged work as part of the diff. Give the reviewer `origin/main...HEAD` after a `git fetch`; the reviewer found nothing against the contract.

## 2026-11-27 · push-guard-heredoc · 6→7
Reviewer finding: the quote pass paired an unquoted escaped apostrophe (`echo don\'t; git push; echo 'x'`) with a later `'` and emptied the real `git push` between them, against the Constraint «failing towards asking»; no W422 case had a stray quote. Fixed: a `\x` outside quotes is skipped, so an escaped quote opens nothing; new W422 row seen red before the fix. A text-stripping guard needs a case where the thing it strips is mis-paired, not only where it is well-formed.
