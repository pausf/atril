Targets: workspaces
Governs: src/renderer/components/**

(A subset of the workspaces capability's own `Governs:`, which does not change.)

# workspaces — the sidebar without repos

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- The Trabajo sidebar starts with «＋ Nuevo trabajo», then «Trabajo en marcha» and the Jira
  summary; the repo list and its per-repo «+ trabajo» form are gone.

## Scope boundaries

**In:** the button and removing the section. **Out:** anything in main.

## Constraints

- W28's folding keeps working for the sections that remain.

## Prior decisions

- **Repos are configuration** (proposal.md).

## Task breakdown

- Sidebar button; drop `components/Repos.tsx`; re-point W28's proof at «Trabajo en marcha».

## Verification criteria

- **W43** While Trabajo is shown, the sidebar shall show «＋ Nuevo trabajo», which opens the
  «Nuevo trabajo» dialog, and shall not show a Repos section.
  Proof: src/renderer/sidebar.test.ts sidebar offers new work and no repos
- **W28** (amended proof) When the person clicks a sidebar section's title, Atril shall fold or
  unfold that section, keep its count visible, and remember the state across restarts.
  Proof: src/renderer/sidebar.test.ts section title folds the section and keeps its count
