Targets: workspaces
Governs: src/main/run.ts

(A subset of the workspaces capability's own `Governs:`, which now also excludes
`src/main/forge/scores.ts` — the `mr` capability owns it.)

# workspaces — the runner takes stdin and a time limit

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- A command can be given text on stdin and a time limit after which it is killed.

## Scope boundaries

**In:** `input` and `timeoutMs` on the runner. **Out:** anything else.

## Constraints

- Still an argument array, never a shell.

## Prior decisions

- **Scores need it** (proposal.md): the diff goes on stdin; a hung `claude` must not block the queue.

## Task breakdown

- `run(cmd, args, { input, timeoutMs })`.

## Verification criteria

- **W53** When the runner is given `input`, it shall write it to the child's stdin and close it; when
  given `timeoutMs`, it shall kill the child after that time and resolve with code 124.
  Proof: src/main/run.test.ts input reaches stdin and a timeout kills
