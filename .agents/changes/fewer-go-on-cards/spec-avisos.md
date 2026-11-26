# fewer-go-on-cards · avisos

Targets: avisos

## Verification criteria

- **V11** (amended) When a workspace leaves `needs-you` or `done` (to any state but those two) or leaves the workspace list, Atril shall mark read every unread `ask`, `done`, `idle` and legacy `agent` notice of that workspace, and leave its other notices as they were; entering `done` marks nothing read. (Bug 1.)
  Proof: src/main/avisos.test.ts answered questions stop counting as unread
  Proof: src/main/status.test.ts entering done adds one done notice
