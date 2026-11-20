# skills-toggle — workspaces

Targets: workspaces

## Verification criteria

- **W215** `skillsWriteOk` in `ui.json` shall survive a restart when it is `true`; any other value shall be dropped.
  Proof: src/main/ui.test.ts remembers skills write consent and drops anything but true
