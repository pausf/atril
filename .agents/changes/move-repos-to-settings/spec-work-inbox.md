Targets: work-inbox
Governs: src/renderer/inbox/**

(A subset of the work-inbox capability's own `Governs:`, which does not change.)

# work-inbox — one dialog for a task and for plain work

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- The own-task dialog opens two ways: «Nueva tarea» in Tareas (text required, as I23) and
  «Nuevo trabajo» in Trabajo (text optional; without text the agent is plain Claude).
- With no repo registered, the dialog points to Ajustes → Repos with a button that goes there.

## Scope boundaries

**In:** the optional text, the plain-Claude path, the no-repo pointer. **Out:** anything else in
the dialog.

## Constraints

- Plain work calls `workspaces.open` without a task, as the old «+ trabajo» did.

## Prior decisions

- **One dialog** (assumed, proposal.md decision log): two ways in, one form.

## Task breakdown

- `OwnTaskDialog` takes a `textOptional` flag and its title; the no-repo note gains a button.

## Verification criteria

- **I27** When the person opens «Nuevo trabajo», leaves the text empty, picks a repo and writes a
  branch, Empezar shall open a workspace with no task, so the agent is plain Claude.
  Proof: src/renderer/inbox/owntask.test.ts new work without text opens plain claude
- **I25** (amended) If no repo is registered, then the dialog shall say «Añade un repo en
  Ajustes → Repos», offer «Ir a Ajustes» which opens Ajustes, and Empezar shall be disabled.
  Proof: src/renderer/inbox/owntask.test.ts own task needs a repo
