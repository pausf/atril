# Flow status

Governs: src/main/flow/** src/renderer/flow/**

## Outcomes

- The right panel shows the selected workspace's **stage**, its checklist (closed / total,
  and the first open box), and the file it read them from.
- The stage updates by itself when the agent writes the files, without a manual refresh.
- A workspace with no Libretto change shows "sin Libretto" and nothing invented.

## Scope boundaries

**In:** reading `.agents/changes/*/` in a workspace and deriving the stage.

**Out:** writing any Libretto file; running `libretto`; stages the files cannot show.
`review-work` and `present-work` leave nothing on disk that tells them apart from building,
so they are **not** shown as their own stages in this phase — the boceto's eight dots
become the six below. Showing them needs a signal from the agent session (phase 3).

## Constraints

- Libretto's layout and checklist rule exactly as `find-work` defines them: the checklist is
  the workspaces spec's `## Checklist` when it holds a box, else `tasks.md`, else `plan.md`; a box
  is a line matching `^\s*[-*]\s+\[( |x|X)\]`; boxes inside a code fence do not count; in
  the workspaces spec only boxes under `## Checklist` count.
- Watching: `fs.watch` on the workspace root (non-recursive) to see `.agents/` appear, and
  on `.agents/changes/` once it exists, debounced 500 ms.
- **Base** is the base commit in the workspace record (workspaces spec, Vocabulary).
- **Which change:** with several folders under `.agents/changes/`, the panel shows the one
  modified most recently and lists the others by name.
- **Old layout:** a change with no the workspaces spec gets its stage from its checklist alone
  (Construir or Terminado sin aterrizar), else Entrada.

## Prior decisions

- **The flow is the spine of every piece of work** — Pau, 9 nov: «tiene que combinar la dos
  cosas, para que sea un flujo en un app».
- **Read-only, from files** — the app never decides the stage; Libretto does, by writing its
  files.

## Task breakdown

- Checklist reader with Libretto's rule.
- Stage derivation.
- Watcher with debounce, pushing changes to the renderer.

## Verification criteria

Stages, in order: **Entrada · Spec · Plan · Construir · Terminado sin aterrizar ·
Aterrizado**.

- **F1** Where a change's the workspaces spec has no `## Verification criteria` heading, Atril
  shall show the stage Entrada.
  Proof: src/main/flow/stage.test.ts proposal without criteria is entrada
- **F2** Where it has `## Verification criteria` and no `## Approach`, Atril shall show Spec.
  Proof: src/main/flow/stage.test.ts criteria without approach is spec
- **F3** Where it has `## Approach` and its checklist holds no box, Atril shall show Plan.
  Proof: src/main/flow/stage.test.ts approach without boxes is plan
- **F4** Where its checklist holds at least one open box, Atril shall show Construir with
  closed / total and the first open box.
  Proof: src/main/flow/stage.test.ts open boxes is construir with counts
- **F5** Where every box is closed and the change folder still exists, Atril shall show
  Terminado sin aterrizar.
  Proof: src/main/flow/stage.test.ts all boxes closed is finished not landed
- **F6** Where the workspace has `.agents/`, no change folder, and commits ahead of its base
  commit, Atril shall show Aterrizado.
  Proof: src/main/flow/stage.test.ts no folder with commits ahead is landed
- **F7** The checklist reader shall ignore boxes inside a code fence, and in the workspaces spec
  boxes outside `## Checklist`.
  Proof: src/main/flow/checklist.test.ts fenced and out of section boxes do not count
- **F8** When a change's files change on disk, Atril shall update the stage within one
  second.
  Proof: src/main/flow/watch.test.ts file change updates the stage
- **F9** If a workspace has no `.agents/` directory, then Atril shall show "sin Libretto".
  Proof: src/main/flow/stage.test.ts no changes folder is sin libretto
- **F10** Where the workspace has `.agents/` but no change folder and no commits ahead of its
  base commit, Atril shall show Entrada.
  Proof: src/main/flow/stage.test.ts fresh workspace with agents dir is entrada
- **F11** When `.agents/` appears in a workspace that showed "sin Libretto", Atril shall show
  its stage within one second.
  Proof: src/main/flow/watch.test.ts agents dir appearing leaves sin libretto
- **F12** Where several change folders exist, Atril shall show the most recently modified one
  and list the others.
  Proof: src/main/flow/stage.test.ts several changes shows the latest and lists the rest
