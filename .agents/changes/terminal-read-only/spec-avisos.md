# terminal-read-only — avisos

Targets: avisos

## Verification criteria

- **V3** (amended) When an agent enters «te necesita» (once per entry, W15), Atril shall add a notice of kind `done` when the hook text starts with «Claude dice: » or is exactly «Claude ha terminado», and `ask` otherwise (starts with «Te pregunta: », is «Claude te necesita», is missing or anything else), titled with the work's name (`jiraKey`, else the branch), linked to its workspace, and carrying the hook text as `detail` — except while Automático answers that wait by itself (W205, W206) or W199 shows it as working, when it adds none.
  Proof: src/main/avisos.test.ts an agent that needs you is a notice
  Proof: src/main/avisos.test.ts a question and an end of turn are different kinds
  Proof: src/main/status.test.ts automatic answers its own questions with the recommended option
