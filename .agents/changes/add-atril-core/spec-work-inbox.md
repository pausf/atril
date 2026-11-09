Targets: work-inbox
Governs: src/main/jira/** src/renderer/inbox/**

# work-inbox — the person's Jira tasks, and Start

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- The sidebar's "Mis Jira" lists every **task**: assigned to the person, in an open sprint,
  not Done — key, summary, type, status. It refreshes on launch, every 5 minutes, and on
  demand.
- A task that already has a workspace shows that, instead of a Start button.
- **Start** opens a dialog with: the repo (remembered per Jira project and component, asked
  the first time), the branch (derived from the summary, editable), the repo's mode with its
  reason, and the full command line that will run (`claude --plugin-dir <bundled Libretto>
  --settings ~/.atril/hooks.json "/libretto:libretto-flow <KEY>"`). Confirming opens the
  workspace, starts the agent session, and moves the issue to In Progress.
- If Jira cannot be reached, the inbox says why and what the person runs; the rest of Atril
  keeps working.

## Scope boundaries

**In:** reading tasks, the Jira→repo memory, Start, the In Progress transition.

**Out:** creating, editing or commenting on Jira issues; any transition other than In
Progress (Done belongs to phase 2, with the MR); boards, epics, other people's tasks; Jira's
REST API or MCP.

**Never scoped out:** the issue key and the branch are validated before they reach a
command; the Jira token never passes through Atril.

## Constraints

- Only the `jira` CLI (ankitpokhrel/jira-cli), installed and configured by the person;
  `--raw` JSON output, never `--plain` (Libretto's `find-work/tracker.md`: plain mode carries
  colour codes and drops the description).
- The query: `jira issue list --raw --jql "assignee = currentUser() AND sprint in
  openSprints() AND statusCategory != Done"`.
- The command Start runs goes through the primary spec's agent session, with Claude's hooks
  passed by `--settings` (proposal.md, W14).

## Prior decisions

- **Read the tasks of the person using the app** — Pau, 9 nov: «tambien que lea lo jira
  asignado a la persona que va».
- **Jira via its CLI, never REST or MCP; the token never enters the app** — Libretto's
  tracker rule.
- **Start runs Claude only** — `libretto --help`: «codex cannot run the flow».
- **Jira→repo asked once and remembered per project and component** — decision log,
  assumed. The memory key is the issue's project plus its first component, or the project
  alone when it has none.
- **The task→workspace link is the Jira key in the workspace record** (proposal.md
  vocabulary); it survives restarts with the record.
- **"Unconfigured" means `jira project list` fails** — a real authenticated call, as
  Libretto's tracker rule says; `jira --version` and `jira me` prove nothing.

## Task breakdown

- Jira reader: run the query, parse the raw JSON, map errors to messages.
- Repo memory per project and component.
- Branch derivation and validation.
- Start dialog and the launch.
- In Progress transition with failure handling.

## Verification criteria

- **I1** When the inbox refreshes, Atril shall run `jira issue list --raw` with the JQL in
  Constraints.
  Proof: src/main/jira/inbox.test.ts  queries my open sprint issues
- **I2** When the CLI returns JSON, Atril shall list each issue's key, summary, type and
  status.
  Proof: src/main/jira/inbox.test.ts  parses issues from raw json
- **I3** If `jira` is missing or `jira project list` fails, then the inbox shall show the install command
  or tell the person to run `jira init` in their own shell, and shall never ask for a token.
  Proof: src/main/jira/inbox.test.ts  unconfigured jira asks the person to run jira init
- **I4** When the person starts a task whose project and component have no remembered repo,
  Atril shall ask for one and remember it for the next task of that project and component.
  Proof: src/main/jira/start.test.ts  remembers the repo per project and component
- **I5** When the dialog opens, Atril shall propose a branch made of the summary as a
  lowercase ASCII slug of at most 40 characters that passes `git check-ref-format --branch`.
  Proof: src/main/jira/start.test.ts  derives a valid branch from the summary
- **I6** When Start is confirmed, Atril shall launch `claude` with the bundled Libretto plugin,
  its hooks and the prompt `/libretto:libretto-flow <KEY>` in the new workspace's agent
  session — the plugin-namespaced name observed in box 4, because the bare `/libretto-flow`
  exists only where Libretto is installed globally.
  Proof: src/main/jira/start.test.ts  start launches libretto-flow with the key
- **I7** If an issue key does not match `^[A-Z][A-Z0-9]+-[0-9]+$`, then Atril shall refuse
  to start it.
  Proof: src/main/jira/start.test.ts  refuses a malformed issue key
- **I8** If the In Progress transition fails, then Atril shall keep the workspace and agent
  running and show the error.
  Proof: src/main/jira/start.test.ts  transition failure keeps the workspace
- **I9** While a workspace record carries a task's key, the inbox shall show that workspace
  instead of Start, also after a restart.
  Proof: src/main/jira/inbox.test.ts  task with a workspace shows it instead of start
- **I10** If the proposed branch already exists in the repo, or its worktree path exists,
  then the dialog shall say so and propose the same name with the first free `-2`, `-3`…
  suffix.
  Proof: src/main/jira/start.test.ts  proposes a free branch when the slug is taken
