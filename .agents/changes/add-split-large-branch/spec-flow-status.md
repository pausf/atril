Targets: flow-status
Governs: src/renderer/flow/**

(A subset of the flow-status capability's own `Governs:`, which does not change.)

# flow-status — the large-branch warning

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- «Cambios» shows the total in orange past 400 lines with the note that Claude will ask about a split.

## Scope boundaries

**In:** the warning. **Out:** anything else in the panel.

## Constraints

- Uses the total F20 already shows.

## Prior decisions

- **400 lines** (proposal.md).

## Task breakdown

- The warning line in Cambios.

## Verification criteria

- **F25** While the change list totals more than 400 lines, «Cambios» shall show «⚠ N líneas: rama
  grande. Claude te preguntará si la separa en MRs más pequeñas.» in place of the plain total.
  Proof: src/renderer/flow/changes.test.ts a large branch warns in cambios
