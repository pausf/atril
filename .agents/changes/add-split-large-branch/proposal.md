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

Verified 9 nov against https://code.claude.com/docs/en/hooks: a `PostToolUse` hook may print
`{"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "..."}}`; «Claude
Code wraps the string in a system reminder and inserts it into the conversation at the point
where the hook fired. Claude reads the reminder on the next model request». Strings are capped at
10,000 characters. How often to say it is Atril's choice: once per threshold crossed.
