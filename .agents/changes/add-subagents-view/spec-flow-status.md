# add-subagents-view · flow-status

## Verification criteria

- **F27** While the selected workspace has subagent entries, the flow panel shall show a «Subagentes»
  section, newest `startedAt` first, each as text: its description (or its type when it has none),
  its type when a description is shown, and «trabajando · {d}» (now − startedAt, refreshed every second
  while any runs) or «terminado · {d}» (endedAt − startedAt), where {d} is «45 s» under a minute and
  «1 min 20 s» from there.
  Proof: src/renderer/flow/subagents.test.ts subagents show in the panel
