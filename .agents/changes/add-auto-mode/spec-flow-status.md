# add-auto-mode · flow-status

## Verification criteria

- **F26** In an automatic workspace, Spec, Plan and Checklist shall open read-only whatever the
  agent's state (an exception to F15; the diff modals already are), with the status bar «solo lectura ·
  modo automático» in place of F15's.
  Proof: src/renderer/flow/documents.test.ts automatic documents are read-only

