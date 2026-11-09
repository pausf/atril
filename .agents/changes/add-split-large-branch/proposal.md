Tracker: none
Queued: 2026-11-09

# add-split-large-branch

## The ask, verbatim

Pau, 9 nov 2026:

> si una rama se esta haciendo muy grande que el propio claude te pida si quiere separar esta tarea en mas MR pequeñas

## The reading

Not a bug; new work, after `add-file-changes` (it reuses the branch size). When a workspace's
branch passes a size threshold — 400 changed lines against its base, the `chained-pr` skill's
own threshold — Atril's hook tells Claude once per threshold that the branch is large and that
at its next stop it should ask the person whether to split the work into chained MRs; Claude asks
with its question tool, which W44 already turns into «te necesita» and a Mac notification. The
«Cambios» section shows the total and turns orange past the threshold.

To verify at spec time, not assumed: that a Claude Code `PostToolUse` hook can hand Claude extra
context (`hookSpecificOutput.additionalContext`), and how often a hook may do it.
