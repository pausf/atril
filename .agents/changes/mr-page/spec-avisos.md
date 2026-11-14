# mr-page — avisos

Targets: avisos

Only V6's MR clause moves: a notice for an MR opens its page (M43 in `mr`) instead of the old MR view; the agent clause is unchanged.

## Verification criteria

- **V6** (amended) Opening a notice shall mark it read and open its MR page (M43) when the MR is in the latest
  listing (held app-wide, M9), otherwise say «Esta MR ya no está en la lista»; an agent notice shall
  open its workspace, or say «Ese trabajo ya no está» when it is gone.
  Proof: src/renderer/avisos/avisos.test.ts a notice opens what it is about
