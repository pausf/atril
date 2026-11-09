# add-subagents-view

Queued: 2026-11-09
Tracker: none

Pau, 9 nov: «si claude crea subagentes también estaría bien verlos».

- The hook already sees PreToolUse/PostToolUse; add `SubagentStart`/`SubagentStop` and read the
  `Agent` tool's `description` and `subagent_type` from PreToolUse.
- The flow panel lists the workspace's subagents: name, type, running/done, elapsed time.
- The workspace row shows «2 subagentes» while any run; a finished one stays listed until the next
  prompt.
- Nothing from the subagent's transcript is read (quota, privacy): only the hook events.
