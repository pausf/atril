# add-qa-lab · flow-status

Targets: flow-status

## Verification criteria

- **F33** While the selected workspace is classified (W83), the Libretto panel shall show a «QA» section
  with «Probar en vivo», or «Detener QA» while its QA pane lives, and its screenshots newest first —
  asked from main as `qa.status(id)` every 3 seconds while the section shows, received as data URLs (the
  12 newest, each at most 2 MB) — each opening large on press; for an unclassified workspace no section
  shall show. One test holds a case per clause.
  Proof: src/renderer/flow/qa.test.ts the qa section shows the button and the screenshots
