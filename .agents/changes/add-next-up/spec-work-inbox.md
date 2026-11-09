Targets: work-inbox
Governs: src/main/jira/** src/renderer/inbox/**

# work-inbox — one-click Start

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- **Empezar** starts at once, without the dialog, when the task's project and component already
  have a remembered repo and the proposed branch (the key) is free; ⌥-click, a first task of a
  project, or a taken branch open the dialog as today (I4–I10).

## Scope boundaries

**In:** the fast path. **Out:** an undo (Quitar closes a fresh workspace); choosing model or repo
on one click.

## Constraints

- The fast path calls the same `proposeStart` and `start` as the dialog, with W34's «Por
  defecto» model (no `--model`).

## Prior decisions

- **One click for a known project** — Pau, 9 nov, usability batch («si» to item 4); undo out
  (assumed, proposal.md decision log).

## Task breakdown

- Fast path in the Tareas Empezar button; ⌥-click keeps the dialog.

## Verification criteria

- **I20** When the person clicks Empezar on a task whose project and component have a remembered
  repo and whose proposed branch is free, Atril shall start it without the dialog and without a
  `--model` flag.
  Proof: src/renderer/nextup.test.ts one click starts a remembered task
- **I21** When the person ⌥-clicks Empezar, or the project has no remembered repo, or the
  proposed branch is taken, Atril shall open the Start dialog.
  Proof: src/renderer/nextup.test.ts option click or unknown project opens the dialog
