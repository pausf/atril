Targets: workspaces
Governs: src/main/forge/guards.ts src/main/index.ts src/renderer/components/Rail.tsx src/renderer/App.tsx

(A subset of the workspaces capability's own `Governs:`, which now excludes
`src/main/forge/mrs.ts` and `src/renderer/mr/**` — the new `mr` capability owns them.)

# workspaces — open listed MRs too

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- Main also opens the MR links of the latest listing.

## Scope boundaries

**In:** the guard. **Out:** everything else.

## Constraints

- Same guard module as W52.

## Prior decisions

- **Listed links count** (assumed, proposal.md decision log).

## Task breakdown

- `guards.listed(urls)` replaces the listed set; `openable` accepts created or listed.

## Verification criteria

- **W52** (amended) Main shall open in the browser only a link it returned from a create or that is
  in its latest MR listing — a link from an earlier listing no longer counts — and clone only into
  the folder its own picker returned last; anything else from the window shall be ignored.
  Proof: src/main/forge/guards.test.ts only links and folders main handed out are accepted
