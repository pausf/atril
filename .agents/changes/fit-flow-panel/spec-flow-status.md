# fit-flow-panel · amendments

Targets: flow-status

## Verification criteria

- **F20** (amended) While the stage is Construir, Terminado or Aterrizado and the list is not empty, the
  Libretto panel shall show «Cambios» with its files' status and +/− counts as F31 lists them, the
  total of added plus removed lines over every file, and Construir as a button reading «ver N
  archivos»; at earlier stages Construir shall not be a button and no «Cambios» section shall appear.
  Proof: src/renderer/flow/changes.test.ts changes show from construir on
