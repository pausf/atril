# fast-panel · workspaces

Targets: workspaces

## Outcomes

- El estado de los agentes cuesta un proceso de tmux por vuelta y los observadores juntan ráfagas.

## Scope boundaries

**In:** src/main/status.ts, src/main/tmux.ts, src/main/activity.ts, src/main/workspaces.ts. **Out:** sondeos de MR y Jira.

## Constraints

- Nada se enseña más de 1 s viejo respecto a hoy.

## Verification criteria

- **W163** The status poll and `listWorkspaces` shall read tmux through one shared snapshot (`tmux list-panes -a` with session name, pane id and dead flag), taken at most once per second, so a status tick costs one tmux command whatever the number of works; creating, killing or respawning a session drops the snapshot, and decisions that act — sending a reply or keys, pausing, reopening — ask tmux directly instead.
  Proof: src/main/status.test.ts one tmux call per tick whatever the number of works
  Proof: src/main/tmux.test.ts the snapshot is shared for a second and dropped by any session change
- **W164** State-folder events (status) and activity-file events (activity) shall refresh 200 ms after the last event of a burst, and at least once per second while events keep coming.
  Proof: src/main/status.test.ts a burst of hook writes refreshes once
  Proof: src/main/activity.test.ts a burst of activity writes refreshes once
