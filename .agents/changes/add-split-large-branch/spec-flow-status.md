Targets: flow-status
Governs: src/renderer/flow/**

(A subset of the flow-status capability's own `Governs:`, which does not change.)

# flow-status — the large-branch warning

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- «Cambios» shows the total as a warning past 400 lines, saying Atril asked Claude to propose a split.

## Scope boundaries

**In:** the warning. **Out:** anything else in the panel.

## Constraints

- Uses the total F20 already shows.

## Prior decisions

- **400 lines** (proposal.md).

## Task breakdown

- The warning line in Cambios.

## Verification criteria

- **F25** While the change list totals more than the hook's threshold (400), «Cambios» shall show,
  in place of the plain total, a warning element (class `fbig`) reading «⚠ N líneas: rama grande
  (más de 400). Atril le ha pedido a Claude que te proponga separarla en MRs más pequeñas.»
  Proof: src/renderer/flow/changes.test.ts a large branch warns in cambios
