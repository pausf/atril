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

- **I23** (amended) While the dialog is «Nueva tarea» and the text is empty or only spaces,
  Empezar shall be disabled; in both dialogs the text area shall accept at most 2000 characters.
  Proof: src/renderer/inbox/owntask.test.ts own task needs text
- **I27** When the person starts from «Nuevo trabajo», Atril shall open the workspace with the
  text as its task when the text is not blank (as I22), and with no task — plain Claude — when it
  is blank; Empezar needs only a repo and a branch there.
  (One proof holds both: the test starts one with text and one without and checks each call.)
  Proof: src/renderer/inbox/owntask.test.ts new work without text opens plain claude
- **I25** (amended) If no repo is registered, then the dialog shall say «Añade un repo en
  Ajustes → Repos», offer «Ir a Ajustes» which closes the dialog and shows Ajustes, and Empezar
  shall be disabled.
  Proof: src/renderer/inbox/owntask.test.ts own task needs a repo
