# open-work-from-mr · workspaces

Targets: workspaces

## Verification criteria

- **W89** When a workspace is opened with `existing: true` on a branch that exists on `origin`, Atril shall run
  `git fetch origin <branch>` and add the worktree on the local branch if it exists, or on a new local branch
  tracking `origin/<branch>` if not, recording the fetched commit as `baseCommit`; it shall refuse in-place repos
  and branches missing on `origin`. One test holds a case per clause.
  Proof: src/main/workspaces.test.ts a workspace opens on an existing remote branch
- **W90** A review session shall be a workspace record with `mode: 'review'` whose path is the repo's root: opening
  it runs no git command that changes a ref, the index or the working tree, and removing it only ends its tmux
  session.
  Proof: src/main/workspaces.test.ts a review session never touches git
