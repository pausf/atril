# mr-page — workspaces

Targets: workspaces

Only the boundary moves: the new forge files belong to `mr`. The tutorial texts of steps `mr` and `mr-tools` (src/renderer/tour/Tour.tsx) are rewritten to name the page, «Revisar ▾» and «Fusionar»; W23 does not quote them, so no criterion changes. `data-tour="mr-tools"` moves to «Revisar ▾»; `src/renderer/tutorial.test.ts`'s list of targets does not change.

## Governs

`Governs:` gains `!src/main/forge/page.ts !src/main/forge/merge.ts` (and `mr`'s gains `src/main/forge/page.ts src/main/forge/merge.ts`). `scripts/land.py` does not touch `Governs:` lines: the landing commit edits both by hand.
