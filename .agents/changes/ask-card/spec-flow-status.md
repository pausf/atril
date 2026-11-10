# ask-card · flow-status

## Verification criteria

- **F30** (amended) Checklist, Cambios and Subagentes shall each be a section whose title is a button with
  `aria-expanded` that folds and unfolds it, showing its count while folded — Checklist «{closed}/{total}», Cambios
  its number, Subagentes its number of entries — and keeping its folded state per section when the panel is mounted
  again; all three shall start open. One test holds a case per clause.
  Proof: src/renderer/flow/panel.test.ts the panel sections fold and remember
- **F35** While the workspace's repo holds other change folders besides the current one, the panel shall show
  «{n} cambios más en este repo» with a button «Ver en Libretto» that opens the Libretto screen with that repo
  picked, and no list of their names; with none, it shall show nothing.
  Proof: src/renderer/flow/panel.test.ts other changes lead to Libretto
