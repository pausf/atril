# crash-reports · workspaces

Targets: workspaces

## Verification criteria

- **W216** `crashReports` in `ui.json` shall survive a restart when it is `'on'` (anything else reads as off), and `crashLast` when it is `{ at: number, url: string }` or `{ at: number, error: string }`; any other value of either shall be dropped.
  Proof: src/main/ui.test.ts "remembers crash report consent and the last send"
