# fewer-go-on-cards · flow-status

Targets: flow-status

## Verification criteria

- **F51** While the agent's state is `done`, the document editor's status bar shall say «✎ editable · Claude ha terminado».
  Proof: src/renderer/flow/documents.test.ts a done agent's document is editable
