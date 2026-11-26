# enforce-written-rules

Tracker: none

## Ask (verbatim)

Turn written rules into enforced ones, and trim CLAUDE.md (idea from "Agent Harness en 15 minutos": context only suggests, verification enforces).

1. Pre-push hook: add .githooks/pre-push that runs the work-identifier scan CLAUDE.md describes (git grep -niE -f ~/.config/atril/work-identifiers.txt over what is being pushed, ignoring the pnpm-lock.yaml integrity line) and refuses the push on a match. If that list file does not exist (any other contributor), the hook does nothing. Never copy the list into the repo. `pnpm run prepare` already points git at .githooks.
2. Claude Code guard: a project PreToolUse hook in .claude/settings.json that denies `pnpm build` (and `pnpm run build`) with a one-line reason; keep it tiny and testable.
3. Trim CLAUDE.md: the "Where we left off" history of ~20 landed branches is loaded into every agent session. Keep only what is current (the latest landed change, what is next, what is untested with real data) and the working rules; drop the per-branch history (git log and .agents/specs already hold it). Remove any rule now enforced by 1 or 2 from the prose, pointing to the hook instead.

Tests first for the hooks (a small script test is enough). All in English. Out: evals, changing Libretto skills.

## Reading

Not a bug: new enforcement (two hooks) plus a docs trim. Lesson ledger backs it: `harness-ladder` already moved rules from prose to lint/pre-commit; this continues that.
