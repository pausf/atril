Targets: workspaces
Governs: resources/** src/main/** !src/main/flow/**

(A subset of the workspaces capability's own `Governs:`, which does not change.)

# workspaces — Claude's questions count as waiting for you

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- When Claude asks the person something with its question tool — Libretto's stop before code is
  one — the workspace shows «te necesita», notifies with the question, and the documents become
  editable (F15); once the person answers, it shows «trabajando» again.

## Scope boundaries

**In:** the hook's state for `AskUserQuestion`. **Out:** any other tool.

## Constraints

- Same hook, same state file (W14–W16, W26, A1–A8).

## Prior decisions

- **The stop must be visible** — Pau, 9 nov: «si la spec y plan no nos gusta como lo hacemos ya que
  pasa directamente a construir»: it does not — Libretto stops before code with a question — but
  the hook marked every tool as working, so Atril hid that stop (found 9 nov).

## Task breakdown

- `AskUserQuestion` in PreToolUse → needs-you with «Te pregunta: <first question>».

## Verification criteria

- **W44** When Claude calls `AskUserQuestion`, the hook shall set the workspace to `needs-you`
  with «Te pregunta: <its first question>» as the text, and when that call returns (PostToolUse)
  it shall set `working`.
  Proof: src/main/activity.test.ts a question from claude means it needs you
