# add-subagents-view · flow-status

## Verification criteria

- **F27** While a workspace has subagents, the flow panel shall show a «Subagentes» section listing
  each one's description (or its type), its type and «trabajando · {tiempo}» or «terminado · {tiempo}»,
  newest first, as text; the workspace's row shall show «{n} subagentes» («1 subagente») while n > 0
  run, and nothing otherwise.
  Proof: src/renderer/flow/subagents.test.ts subagents show in the panel and the row
