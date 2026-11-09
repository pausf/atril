Targets: workspaces
Governs: src/main/** src/preload/** !src/main/jira/** !src/main/flow/** !src/main/credentials/**

(A subset of the workspaces capability's own `Governs:`, which does not change.)

# workspaces — a workspace started from a task text

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- `workspaces.open` takes an optional task text; the agent then starts with the Libretto flow
  and that text as its request.

## Scope boundaries

**In:** validating the text and building the agent argument in main. **Out:** storing the text
in the workspace record.

**Never scoped out:** the text is one argv element after `/libretto:libretto-flow `, so it can
never become a `claude` flag or reach a shell; the renderer cannot choose the command.

## Constraints

- tmux `respawn-pane` already receives argv as separate arguments (W39); the text rides that.

## Prior decisions

- **The flow command is built in main** (assumed): the renderer sends data, never a command line.

## Task breakdown

- Validate the text and pass `prompt: '/libretto:libretto-flow ' + text` to the existing open.

## Verification criteria

- **W40** When a workspace is opened with a task text, the agent's last argument shall be the
  single string `/libretto:libretto-flow <trimmed text>`; a text holding `$(…)`, `;`, both kinds
  of quote, a newline, or starting with `--` shall arrive byte for byte, as that one argument, and
  run nothing.
  Proof: src/main/tmux.test.ts task text reaches the agent as one literal argument
- **W41** If the task is not a string, or its text is empty after trimming, longer than 2000 characters, or contains a NUL
  character, then `workspaces.open` shall refuse with «El texto de la tarea no es válido (máx. 2000
  caracteres).» and create nothing.
  Proof: src/main/workspaces.test.ts invalid task text creates nothing
