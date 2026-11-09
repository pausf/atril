
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
