
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
