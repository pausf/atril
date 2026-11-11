# radar · flow-status

Targets: flow-status

## Outcomes

- Caben 12 vigilantes a la vez: el radar y el panel no se expulsan con varios trabajos.

## Scope boundaries

**In:** `src/main/flow/quiet.ts`. **Out:** el resto del vigilante.

## Constraints

- Nada más cambia en F46–F47.

## Verification criteria

- **F48** (amended) At most twelve workspaces shall have a watcher open; opening a thirteenth closes the least recently asked; closing or forgetting a workspace shall close its watcher and drop its saved answer.
  Proof: src/main/flow/quiet.test.ts watchers are bounded and close with their work
