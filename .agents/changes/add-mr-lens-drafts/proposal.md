Tracker: none
Targets: mr
Durable decisions: the ones in Prior decisions below

# add-mr-lens-drafts

## The ask, verbatim

Pau, 9 nov 2026 (from the phase-2 ask):

> como se ven los comentrios de gitbuh gitlab

## The reading

Split from add-mr-threads (9 nov): Libretto's review lenses (`/libretto-review`) run over an MR in
a worktree and their findings appear in the MR view as drafts — publish on the MR as a comment
on its file and line, send to the agent of that workspace, or discard. Needs add-mr-threads.

## Decision log

### Session 2026-11-09
- Q: «sigue con todo haz mejoras, nuevas features» — Pau → decisions taken with the recommended option, marked (assumed).
- Q: ¿Las cinco lentes de `/libretto-review` en un worktree? → A: no: una sola llamada a Sonnet sin herramientas con el diff y las cinco lentes (intención, seguridad, diseño, fiabilidad, tests) en la instrucción; cinco agentes por MR gastarían demasiada cuota — Pau cuida el consumo (assumed).
- Q: ¿Cuándo? → A: bajo demanda, con «Revisar con Libretto», solo en Mías y Me toca revisar; guardado por commit como las puntuaciones (assumed).
- Q: ¿Publicar dónde? → A: como comentario general de la MR que cita archivo y línea; el comentario en la línea exacta queda para más adelante (assumed).
- Q: ¿Mandar al agente cuál? → A: el único trabajo vivo en la rama de la MR y en un repo cuyo `origin` es el proyecto de la MR; si hay cero o varios, no se ofrece (assumed).
- Q: (revisor) ¿Más de 12 hallazgos, texto largo, file/line ausentes, cero hallazgos? → A: fuera de esquema = fallo; sin ubicación se omite; cero es respuesta válida (assumed).
- Q: (revisor de obra) ¿Borradores de una MR sin commit conocido? → A: se rechaza la revisión antes de gastar cuota; ¿mismo proyecto en otra forja? → A: el origin también debe nombrar el host (assumed).
- Q: (revisor) ¿Cola compartida con las puntuaciones? → A: un solo runner, claves por tipo y URL (assumed).

## Outcomes

- The MR view of an MR in Mías or Me toca revisar offers **Revisar con Libretto**. Claude Sonnet
  reads the diff through five lenses and returns findings; each shows as a **draft** with its lens,
  severity, file:line and text, and three actions: **Publicar** (a general comment on the MR that
  quotes the file and line), **Mandar al agente** (typed into the terminal of the workspace on that
  branch), **Descartar**.
- Drafts are kept per MR commit; a newer commit marks them as from an earlier commit.

## Scope boundaries

**In:** the review call, the drafts, publish as a general comment, send to the agent, discard, the
cache. **Out:** inline comments on the exact line, running `/libretto-review` with its five agents in a
worktree, automatic review, reviewing «Sigo», editing a draft before publishing (it can be discarded
and written by hand in the thread).

**Never scoped out:** Claude runs with no tools and the diff on stdin (as M11); nothing is published
or sent without the person's click, and each click acts once; tokens stay in main; draft text is
shown as text.

## Constraints

- Reuses scores' diff fetch, cut, queue, runner timeout and failure texts (M11, M14, M16, W53), the
  listed-only rule (M17), the thread posting endpoints (M21) and `replyToAgent` (N3).
- `MrItem` gains `branch?` (GitHub `head.ref` from the detail call, GitLab `source_branch`).

## Prior decisions

- **Lens findings as drafts** — Pau, 9 nov (phase-2 ask): the MR view's comments with Libretto's
  findings as drafts to publish, send to the agent, or discard.
- **One call, not five agents** (assumed): quota.

## Task breakdown

- Main: the lens call and schema, the drafts cache per commit, publish, send to agent.
- Renderer: the button, the drafts list with its three actions.

## Verification criteria

- **M25** When the person clicks Revisar con Libretto on an MR in Mías or Me toca revisar, Atril shall
  run `claude` exactly as M11 (no tools, no session, the diff on stdin cut at 120 KB) with a schema of
  at most 12 findings `{ lens: intent|security|design|reliability|tests, severity: high|medium|low,
  file?, line?, text ≤ 400 }`; a reply outside the schema, a fetch failure or a timeout shall show
  «Claude no ha podido revisar esta MR: {detail}» (M16's details) and store nothing; zero findings is
  an answer and shows «Libretto no ha encontrado nada que comentar». An URL outside those two lists
  of the latest listing shall be refused without a request (M17's text). Reviews and scores share one
  runner, one at a time in the order asked, keyed by kind and URL (M14 per kind).
  Proof: src/main/forge/lenses.test.ts the lens review runs claude like the score and keeps drafts
- **M26** Drafts shall be stored per MR and head commit (no known head: the review is refused before Claude runs, «No se sabe el último commit de esta MR: actualiza»); while drafts
  exist for the current head the button is not offered; on a newer head the list shows «De un commit
  anterior» with «Revisar de nuevo», whose result replaces every draft.
  Proof: src/main/forge/lenses.test.ts drafts are kept per commit
- **M27** When the person clicks Publicar on an open draft, Atril shall post once, as the MR's general
  comment (M21), «**{lens} · {severity}** — `{file}:{line}`» (the location part dropped when `file`
  is absent, `:{line}` when `line` is), a blank line, then the text as written; then mark it
  published. A failure shall keep it open with M6's message. Publishing, sending or discarding a
  draft that is not open, or of an MR outside the latest listing, shall be refused without a request.
  Proof: src/main/forge/lenses.test.ts a draft is published once as a general comment
- **M28** Main shall offer Mandar al agente for an MR only when exactly one workspace is alive, on the
  MR's branch, in a repo whose `origin` remote names the MR's host and project; sending shall type, as N3,
  «Revisión de Libretto ({lens}, {severity}) en {location}: {text}» (location as M27, «la MR» when
  absent), mark the draft sent on `sent`, and on `gone` or `ignored` keep it open with N3's message.
  Proof: src/main/forge/lenses.test.ts a draft goes to the one agent on that branch
- **M29** The MR view shall show each draft as text, with Publicar, Mandar al agente (only when main
  offers it) and Descartar while open, and «Publicado» or «Enviado al agente» with no actions after;
  Descartar removes it.
  Proof: src/renderer/mr/lenses.test.ts drafts can be published, sent or discarded

## Approach

### Summary

`src/main/forge/lenses.ts` reuses `scores.ts`' pieces (diff fetch, cut, queue, claude runner,
target map) with its own schema and cache (`$ATRIL_HOME/lenses/<sha256(url)>.json` holding
`{ head, drafts: { id, lens, severity, file?, line?, text, state: open|published|sent }[] }`).
Publishing reuses `threads.ts`' general-comment post. IPC: `atril:mr:review(url)`,
`atril:mr:draftsOf(url)` (returns `{ head, stale, drafts, canSend }`), `atril:mr:publishDraft(url, id)`, `atril:mr:sendDraft(url, id)`,
`atril:mr:discardDraft(url, id)`. The MR view shows a «Libretto» section above the threads.

### Technical context

Files: `src/main/forge/lenses.ts` (+test), `src/main/forge/{scores,threads,mrs}.ts` (shared helpers,
`branch`), `src/main/index.ts`, `src/preload/{api,index}.ts`, `src/renderer/mr/MrView.tsx`
(+ `lenses.test.ts`), `mockApi.ts`, catalog, styles, `bocetos/novedades.html`. `mr` gains
`src/main/forge/lenses.ts` in its `Governs:` at landing (workspaces excludes it). Gates: typecheck,
lint, test.

### The approach

- The instruction names the five lenses with one line each, asks only for findings worth a reviewer's
  time, in the person's language, and says the size/test measures (M10) are already known.
- Sending to the agent finds the workspace by `branch` among `listWorkspaces()`; the text is one line:
  «Revisión de Libretto ({lens}, {severity}) en {file}:{line}: {text}».
- `scores.ts`' `chain` becomes a runner both modules share; `pending` keys become `score:<url>` and
  `review:<url>`, so a review waits behind a score and the reverse without colliding.
- Draft text goes to the forge as written, like any comment the person types (M21).

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| `/libretto-review` with five lens agents in a worktree | five agents per MR; quota |
| Inline comments on the exact line | GitHub needs commit_id/side, GitLab a full position with three shas; later |
| Auto-review on every new commit | quota |

### Risks

| Risk | What catches it |
|---|---|
| Noise: twelve weak findings | the instruction asks for findings worth a reviewer's time; drafts are discarded with one click |
| A branch name shared by two repos | Mandar al agente only with exactly one match (M28) |

### Validation and rollback

M25–M28 seen red first. Rollback: one revert; posted comments stay on the forge.

### Complexity deliberately kept

None.

## Checklist

- [x] main: branch on rows, the lens call, drafts per commit, publish, send to agent, the listed-only check · Closes: M25, M26, M27, M28
- [x] the window: Revisar con Libretto, drafts with Publicar, Mandar al agente and Descartar · waits on box 1 · Closes: M29
