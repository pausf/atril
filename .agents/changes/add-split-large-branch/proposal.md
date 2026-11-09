Tracker: none
Targets: workspaces
Durable decisions: the ones in Prior decisions below

# add-split-large-branch

## The ask, verbatim

Pau, 9 nov 2026:

> si una rama se esta haciendo muy grande que el propio claude te pida si quiere separar esta tarea en mas MR pequeñas

## The reading

Not a bug; new work, after `add-file-changes` (it reuses the branch size). When a workspace's
branch passes a size threshold — 400 changed lines against its base, the `chained-pr` skill's
own threshold — Atril's hook tells Claude once per threshold that the branch is large and that
at its next stop it should ask the person whether to split the work into chained MRs; Claude asks
with its question tool, which W44 already turns into «te necesita» and a Mac notification. The
«Cambios» section shows the total and turns orange past the threshold.

Verified 9 nov against https://code.claude.com/docs/en/hooks: a `PostToolUse` hook may print
`{"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "..."}}`; «Claude
Code wraps the string in a system reminder and inserts it into the conversation at the point
where the hook fired. Claude reads the reminder on the next model request». Strings are capped at
10,000 characters. How often to say it is Atril's choice: once per threshold crossed.

## Decision log

### Session 2026-11-09
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Cuánto es «grande»? → A: más de 400 líneas cambiadas (añadidas + borradas) contra la base del trabajo, el umbral de `chained-pr`; y de nuevo a 800, 1200… (assumed).
- Q: ¿Qué cuenta? → A: lo mismo que «Cambios» (F18): lo commiteado, lo no commiteado y lo nuevo sin seguimiento que git no ignora; un binario cuenta 0 (assumed).
- Q: ¿Cuándo se mira? → A: después de cada Edit, Write, MultiEdit o Bash (PostToolUse); otras herramientas no cambian archivos (assumed).
- Q: ¿Qué se le dice a Claude? → A: un `additionalContext` en español: el tamaño, el umbral, y que en su siguiente parada natural pregunte con AskUserQuestion si separar en MRs encadenadas (`chained-pr` si está) o seguir; que no separe sin preguntar (assumed).
- Q: ¿Y si Atril no encuentra el trabajo? → A: el hook no dice nada; nunca molesta a Claude (assumed).

- Q: (spec-reviewer) ¿Un salto de 0 a 900? → A: una sola nota; quedan avisados los umbrales hasta el alcanzado; solo un umbral más alto vuelve a avisar (assumed).
- Q: (spec-reviewer) ¿El número es exacto? → A: sí, el total de F18, sin cortar la cuenta (assumed).
- Q: (spec-reviewer) ¿Dos hooks a la vez? → A: cada umbral se reclama creando un archivo en exclusiva (`wx`); como mucho una nota por umbral (assumed).
- Q: (spec-reviewer) ¿El aviso promete una pregunta que ya no vendrá? → A: el texto dice lo que ya pasó: «Atril le ha pedido a Claude que te proponga separarla» (assumed).

## Outcomes

- When a workspace's branch passes 400 changed lines against its base — and again at 800,
  1200… — Claude is told once, through its hook, to ask the person at its next natural stop
  whether to split the work into smaller chained MRs; its question reaches Atril as «te
  necesita» (W44).
- The «Cambios» section shows the total as a warning past 400 lines: «⚠ N líneas: rama grande (más
  de 400). Atril le ha pedido a Claude que te proponga separarla en MRs más pequeñas.»

## Scope boundaries

**In:** measuring after file-changing tools, the once-per-threshold note to Claude, the warning in
Cambios (`spec-flow-status.md`). **Out:** splitting the branch (Claude does it, with
`chained-pr`), a configurable threshold, counting lines Claude has not written yet.

**Never scoped out:** the hook never blocks a tool, adds at most two git calls (numstat and the
untracked list) per file-changing event, never prints anything when it cannot find its workspace,
and the note never carries file contents.

## Constraints

- The hook already runs on PostToolUse (W14–W16, A1–A8); it finds its workspace in
  `$ATRIL_HOME/workspaces.json` by its tmux session name.
- Claude Code reads `hookSpecificOutput.additionalContext` from a PostToolUse hook's stdout and
  gives it to Claude on its next request (verified 9 nov, code.claude.com/docs/en/hooks).

## Prior decisions

- **Smaller MRs, asked by Claude** — Pau, 9 nov: «si una rama se esta haciendo muy grande que el
  propio claude te pida si quiere separar esta tarea en mas MR pequeñas».
- **400 lines** (assumed): the `chained-pr` skill's own threshold for a reviewable MR.

## Task breakdown

- Hook: size after file-changing tools, threshold memory per session, the note on stdout.
- Renderer: the warning in Cambios.

## Verification criteria

- **W45** When a PostToolUse for Edit, Write, MultiEdit or Bash ends and the workspace's branch
  has more than 400 × k changed lines against its base, with k higher than any k already claimed
  in that session, the hook shall claim k and print one `additionalContext` naming the exact total
  and asking Claude to offer a split into chained MRs at its next stop; otherwise — at or below
  400, k not higher than one claimed, another tool, or no workspace record for the session — it
  shall print nothing.
  (One proof holds all: it runs `sizeNotice` over a real repo through 300 lines, 500, 500 again,
  1300 in one jump, 1400, Read at 2000, and an unknown session, and checks each result.)
  Proof: src/main/activity.test.ts a large branch asks claude to offer a split
- **W46** The hook's count shall equal F18's total for the same tree, and the renderer's warning
  threshold shall be the hook's.
  Proof: src/main/activity.test.ts the hook counts like the change list

## Approach

### Summary

`resources/branchsize.mjs` exports `THRESHOLD = 400` and `sizeNotice({ home, session, event,
tool })`: for PostToolUse on the four tools it reads `$ATRIL_HOME/workspaces.json`, takes `path`
and `baseCommit` from the record whose `session` matches, counts like F18 (numstat + untracked,
binary and symlink rules), and when k = floor((total − 1) / 400) is above every claim in
`$ATRIL_HOME/size/<session>/`, claims it by creating `k<k>` with flag `wx` and returns the note.
`resources/claude-hook.mjs` calls it after the state write and prints
`{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":note}}` when there is
one. The renderer imports `THRESHOLD` for the warning. The renderer
adds the warning to Cambios.

### Technical context

Files: `resources/claude-hook.mjs`, `resources/branchsize.mjs` (+ `.d.mts`),
`src/main/activity.test.ts`, `src/renderer/flow/FlowPanel.tsx`, `src/renderer/flow/changes.test.ts`,
the sketch. Gates: typecheck, lint, test.

### The approach

- The count mirrors F18 in plain JS (the hook cannot import TypeScript): numstat sums, plus each
  untracked file's lines (binary or symlink rules as F18/F24); W46 pins it to F18.
- Claims: one empty file per announced k; `wx` makes two concurrent hooks race safely.
- The note: «Atril: esta rama ya cambia N líneas respecto a su base (más de T). En tu siguiente
  parada natural, pregunta a la persona con AskUserQuestion si quiere separar el trabajo en MRs
  más pequeñas encadenadas (usa la skill chained-pr si está disponible) o seguir en una sola. No
  separes nada sin preguntar.»

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Atril shows a button that types the suggestion into the terminal | Pau asked for Claude itself to ask; the hook note does that without the person acting |
| Measuring on every tool | Read, Grep and the like change nothing; one git call per edit is enough |
| Libretto deciding the split up front | it already can, at write-tasks; this catches the branch that grew past the plan |

### Risks

| Risk | What catches it |
|---|---|
| The hook gets slower on a huge worktree | two git calls per edit, only after file-changing tools; ceiling named: not measured — a cap on untracked counting if it ever shows |
| Claude ignores the note | it is a request, not a block; the orange warning in Cambios shows the person anyway |

### Validation and rollback

W45 and F25 seen red first. Rollback: one revert.

### Complexity deliberately kept

- A second copy of the F18 counting rules in `branchsize.mjs`: the hook runs as plain Node
  without the TypeScript build; the test pins both to the same numbers.

## Checklist

- [ ] branchsize.mjs counts like F18 and claims each threshold once; the hook prints the note · Closes: W45, W46
- [ ] the warning in Cambios with the shared threshold; the sketch's copy · waits on box 1 · Closes: F25
