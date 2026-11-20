
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
Un test arreglado de paso (una carrera en `boxes.test.ts`) quedó fuera del contrato y el revisor lo marcó. Si una carrera sale al construir, se apunta en el Decision log en el momento, no después.

## 2026-11-11 · plain-errors · 6→7
El estado inicial de la cuota («aún sin leer») cae en la frase genérica; encaja con W20, pero un estado «cargando» que se pinta como error es fácil de olvidar al escribir frases por causa.

## 2026-11-11 · login-path · 6→7
Nada contra el contrato. Duda del revisor: un `$SHELL` fish, ¿une `"$PATH"` con espacios? No: desde fish 3, PATH es una variable de rutas y entre comillas se une con «:». Si un shell raro no lo hace, las carpetas fijas siguen entrando. Lección general: un PATH vacío lo heredan todas las apps del Dock; cualquier herramienta nueva que se lance desde main pasa por aquí.

## 2026-11-11 · dirty-copy · 6→7
El reintento con texto vacío (Claude a secas en un worktree) no tenía test: un criterio que dice «el mismo texto y modo» cubre dos ramas del código, y el test solo probaba una. Añadido «a blank dirty retry opens plain claude in a worktree».

## 2026-11-11 · ws-errors · 6→7
«Olvidar» nunca borra la carpeta, pero su test borra la carpeta antes de olvidar: no podría ver un borrado. Una cláusula «nunca X» necesita un caso donde X sería visible.

## 2026-11-11 · ws-errors · 6→7
`atril:ws:forget` acepta cualquier id, también uno vivo con su carpeta; solo la ventana lo limita al caso roto. Aceptado: no toca la carpeta y el registro se puede volver a crear abriendo la rama.

## 2026-11-11 · model-pick · 6→7
`proposeStart` construía el comando que se enseña con un modelo sin validar (el que se ejecuta sí se validaba). Si dos caminos montan el mismo comando, los dos pasan por la misma lista; ahora lo prueba «an unknown effort is refused before anything runs».

## 2026-11-11 · model-pick · arnés
Desde `login-path`, el PATH del shell de login va delante: un `claude` falso solo en `PATH` pierde y las pruebas arrancan el real (gastó cuota en repos de prueba). El arnés usa un `SHELL` falso que antepone los dobles; anotado en CLAUDE.md.

## 2026-11-11 · reopen-work · 6→7
Dos reopen del mismo trabajo a la vez (ventana recargada) veían los dos «sin sesión»; el `catch` del segundo mataba la sesión sana del primero y ninguno salía bien. Una limpieza tras un fallo solo puede deshacer lo que creó esa misma llamada: candado por id. Proof: «a stopped work reopens where it was».

## 2026-11-11 · reopen-work · prueba en la app real
Matar tmux con un trabajo abierto bloqueaba Atril entero: `term:resize` llegaba a un cliente pty muerto, node-pty lanzaba EBADF dentro de un `ipcMain.on` y Electron mostraba un NSAlert modal. Los tests no lo veían porque no usan node-pty real; solo salió al probar en la app. W149.

## 2026-11-11 · state-files · 6→7
Aceptado sin arreglar: si `workspaces.json` se daña entre la comprobación inicial de «Quitar» y su escritura final, el worktree ya se ha quitado y la escritura falla sin sobrescribir nada. Abrir sí deshace (W146). Ventana de milisegundos; si aparece en la práctica, quitar debe escribir el registro antes de borrar.

## 2026-11-11 · net-errors · 6→7
W150 decía «cualquier error HTTP» y el cambio solo tocó las llamadas de su lista: crear repo (`HTTP <n>` de reserva), buscar tableros, mover a In Progress y pasar a Jira seguían con el número en la frase. Cuando un criterio dice «cualquier», buscar todas las llamadas (`rg "respondió|HTTP \$\{"`) antes de cerrar. Arreglados; sus tests ahora exigen la frase exacta.

## 2026-11-11 · net-errors · pendiente
`forge/scores.ts:225` y `forge/lenses.ts:175` pueden pasar `err.message` a la frase si lo que se lanza no es un `Failure`. Va con el rediseño de la MR.

## 2026-11-11 · libretto-models · 6→7
El Decision log decía que la frase «la copia es `171db90`» de la spec cambiaba, y el commit no la tocaba: una decisión que nombra un cambio en la spec viva se hace en el mismo commit, no se deja a `land.py`.

## 2026-11-11 · net-errors · después de aterrizar
`qa-report.test.ts` seguía esperando «400» en la frase: `net-errors` cambió `libretto.ts` y no corrí los tests de quien lo usa. Al cambiar una frase compartida, `rg` del texto viejo en `*.test.ts` antes de aterrizar.

## 2026-11-11 · repo-gone · 6→7
Nada contra el contrato. Aceptado: quitar un repo lee `workspaces.json` y luego escribe `repos.json` sin candado; un trabajo abierto justo entre medias apuntaría a un repo quitado (W155 lo diría al usarlo).

## 2026-11-11 · term-attach · 6→7
«Never rejects» se probó solo en `pty.attach`; el manejador IPC leía la lista con el lector estricto y rechazaría con `workspaces.json` dañado. Un IPC que solo enseña usa `listWorkspacesOrNone` (W145).

## 2026-11-11 · fast-panel · 6→7
Responder, contestar rápido y pausar decidían «vivo» con la foto de tmux de 1 s porque `listWorkspaces` pasó a usarla: un lector compartido que se abarata cambia también a quien actúa. Las acciones leen el registro y preguntan `has-session` directamente.

## 2026-11-11 · fast-panel · 6→7
La caché del plan leía el checklist antes de su `stat`: una edición entre medias guardaba el plan viejo con la clave nueva. Primero la clave, luego la lectura.

## 2026-11-11 · fast-panel · medición
En el Mac de Pau cada proceso cuesta ~125 ms en reposo y 300–800 ms con carga (no es git: `/usr/bin/true` 3 ms, git hace 6,5 ms de trabajo; probable antivirus). Antes/después con 4 trabajos: boxDiff 3,9–5,3 s → 1,5–1,8 s; boxes repetido 4,7–6,3 s → 1,6 s; reposo 11 → 5 procesos/s. Queda: no lanzar nada si el vigilante de archivos dice que nada cambió.

## 2026-11-11 · grafito-you · 6→7
Cambié `--run` a gris para la etiqueta «trabajando» sin buscar quién más lo usaba: el punto de aviso sin leer, la selección del buscador, el paso actual y «conectado» perdían el acento. Antes de cambiar un token, `rg "var(--token)"`; si el cambio es para un solo sitio, token nuevo.

## 2026-11-11 · diff-header · 6→7
Quitar la cabecera dejó a la vista que `diffLine` coloreaba como cabecera cualquier `--- x`, también una línea borrada; y un renombrado sin cambios quedaba en blanco. Un test de texto no ve clases: si el cambio es de cómo se ve, el test mira el marcado.

## 2026-11-11 · quiet-panel · 6→7
Un vigilante que fallaba (error de `fs.watch` o `rev-parse` caído una vez) quedaba muerto en su hueco para siempre y ese trabajo calculaba en cada vuelta. Un recurso que falla se sustituye en la siguiente petición, no se guarda. Aceptados sin arreglar: el reloj de pared hacia atrás alarga el tope de 30 s; un trabajo que ya no está en la lista conserva su vigilante hasta que lo saca el quinto.

## 2026-11-11 · quiet-panel · medición
Con 4 trabajos: casillas repetidas 1,6 s → 0–1 ms; volver a un trabajo 2,4 s → 62 ms; reposo 5 → 2,2 procesos/s. Quedan: la primera visita (~6 s, plan en frío) y el diff de la casilla abierta, que se repite cada 3 s.

## 2026-11-11 · flow-empty · 6→7
«Nunca en blanco» se probó con «leyendo» y con las fases tempranas, pero `null` (main dice «no hay flujo», p. ej. una revisión) seguía dejando la pestaña vacía. Para una promesa «nunca X», enumerar cada valor que puede llegar, no solo los del ejemplo.

## 2026-11-11 · lessons-first · 6→7
El criterio nombraba tres sitios (abrir, reabrir y el comando de «Empezar») y dos tipos de enlace, pero las pruebas cubrían solo el archivo enlazado y no el comando enseñado. Cada cláusula de un criterio con «y» necesita su caso.

## 2026-11-11 · lessons-first · después de aterrizar
`LESSONS_NOTE` es castellano sin `t()` y rompió «no spanish text skips t» (src/preload/i18n.test.ts), que no corrí. Un texto para el modelo lleva `// i18n-ignore` con su porqué; y al cambiar main, correr las dos pruebas de idioma, no solo una.

## 2026-11-11 · qa-to-mr · 6→7
El constructor ensanchó la respuesta de `threads.reply` (de otra capacidad, mr) y no había `spec-mr.md`: la forma nueva nunca habría llegado a la spec de MR. Si un cambio toca un archivo gobernado por otra capacidad, su delta va en el mismo cambio. Pendiente aceptado: lo que el agente de QA escribe en notas y pasos se publica tal cual; no hay vista previa antes de «Publicar en la MR».

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

## 2026-11-20 · refine-request · arnés
A gate hung ~10 h overnight: killed runs left `atril-test-*` tmux servers alive and the next suite never got past RUN. The gate script now kills leftover test servers first and wraps each suite in a hard `alarm` (30 min, rerun 15 min).

## 2026-11-20 · harness-ladder · arnés
Two rules moved from prose to `pnpm lint` (W210, W212). Files under `src/renderer` and `src/main` (tests apart) can no longer import from each other: they talk through preload. Outside `paths.ts`, `trust.ts` and `qa.ts`, code in `src/main` can no longer call `homedir()` or read `process.env.HOME`. The home rule replaces «2026-11-09 · fix-test-home-leak · 6» (every module resolves the home through one function) and the home half of «2026-11-10 · add-qa-lab · 6→7». Both are proved by `src/main/harness.test.ts`, which lints one text that must fail and one that must pass against the real config.

## 2026-11-20 · harness-ladder · arnés
`pnpm lint` now refuses any assignment to a member named `atril` outside `src/renderer/mockApi.ts` (W211). A test with its own stubs passes them as `mockApi({}, undefined, over)`: they are laid over the full mock, so a component that gains a new `window.atril` call no longer breaks tests whose mock lacks it. Ten tests were migrated, changing only their setup line. This replaces «2026-11-10 · add-doctor-install-terminal · 7» (hand-built `window.atril` missing `snapshotView`, check every hand-made mock). `over` is typed loosely on purpose: `components/terminal.test.tsx` stubs `term.input`, a member the API no longer has, to prove that nobody calls it.
