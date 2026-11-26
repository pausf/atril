# repo-harness

Tracker: none

## The ask, verbatim

> Show, per repo, which agent harness it has and what it is missing (idea from CodelyTV's "Agent Harness en 15 minutos": context, actions, verification, guardrails). In Atril's repo settings (or the repo's detail), a read-only "Harness" card lists what is detected, each with a tick or a gap and one line on why it matters: context (CLAUDE.md or AGENTS.md and its size, skills in .claude/skills), verification (a lint script, a typecheck script, a test script, a pre-commit hook, CI workflows), guardrails (Claude Code hooks and permission rules in .claude/settings.json, a pre-push hook). Detection is deterministic file reading in main, cheap, no Claude calls, no writes to the repo. A gap may offer one button that opens the relevant doc or file; never auto-fix.
> New criterion ids: use W280 and up (other works in parallel use W217–W279). Tests first; drive it in the real app with a sample repo before landing; all in English (UI texts through t() with their Spanish in i18n-es.ts). (Pau, 26 Nov 2026)

## Reading

A new feature (not a bug report): a read-only card per repo that reads the repo's own files in main and shows ticks and gaps.
