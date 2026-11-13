# terminal-read-only — flow-status

Targets: flow-status

## Verification criteria

- **F25** (amended) While the branch totals more than the hook's threshold (400) and the person has not chosen «Dejarla así» for that threshold, the top of the Libretto panel shall show a warning element (class `fbig`) reading «⚠ N líneas: rama grande (más de 400).» with «Separar en MRs encadenadas», which sends the agent «Separa esta rama en MRs encadenadas.» through the composer's path (W204), and «Dejarla así», which stores `bigDismissed[workspaceId] = k` in `ui.json` and hides the warning until the branch passes the next threshold.
  Proof: src/renderer/flow/changes.test.ts a large branch offers to split it from the warning
