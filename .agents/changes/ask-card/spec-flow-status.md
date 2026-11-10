# ask-card · flow-status

## Verification criteria

- **F30** (amended) Checklist, Cambios and Subagentes shall each be a section whose title is a button with
  `aria-expanded` that folds and unfolds it, showing its count while folded — Checklist «{closed}/{total}», Cambios
  its number, Subagentes its number of entries — and keeping its folded state per section when the panel is mounted
  again; all three shall start open. One test holds a case per clause.
  Proof: src/renderer/flow/panel.test.ts the panel sections fold and remember
- **F35** While the flow state's `others` is not empty, the panel shall show «{n} cambios más en este repo» (n its
  length; «1 cambio más en este repo» for one) with a button «Ver en Libretto» that stores that workspace's repo as the Libretto repo (W104) and opens the
  Libretto screen, and no list of their names; with `others` empty, it shall show neither.
  Proof: src/renderer/flow/panel.test.ts other changes lead to Libretto
