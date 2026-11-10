# cost-per-work · flow-status

Targets: flow-status

## Verification criteria

- **F34** While the selected workspace has a non-zero total (W93), the Libretto panel shall show, under «Cambio»,
  the same «≈ {coste} $ · {tokens} tokens» line as W94 with «estimado a precio de API».
  Proof: src/renderer/flow/cost.test.ts the panel shows the work's estimated cost
