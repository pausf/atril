# open-work-from-mr · workspaces

Targets: workspaces

## Verification criteria

- **W89** When a workspace is opened with `existing: true` and a remote on a branch that exists there, Atril
  shall run `git fetch <remote> <branch>` and add the worktree on the local branch if it exists, or on a new local
  branch tracking `<remote>/<branch>` if not, recording the fetched commit as `baseCommit`; it shall refuse in-place repos
  and branches missing on that remote. One test holds a case per clause.
  Proof: src/main/workspaces.test.ts a workspace opens on an existing remote branch
- **W90** A review session shall be a workspace record with `mode: 'review'`, `branch` the MR's branch and path the
  repo's root: opening it runs no git command that changes a ref, the index or the working tree; it does not count
  for W7; removing it deletes its record and ends its tmux session without any git command.
  Proof: src/main/workspaces.test.ts a review session never touches git
