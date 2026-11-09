Tracker: none
Targets: work-inbox
Durable decisions: the ones in Prior decisions below

# add-own-tasks

## The ask, verbatim

Pau, 9 nov 2026:

> Parte de Jira, por ejemplo, que también puedo escribir yo que puedo lanzar el libreto flow desde uno creado yo mismo, ¿sabes? Personalizado, poniendo yo el prom o lo que sea desde el mismo panel,

## The reading

Not a bug; new work. Besides Jira tasks, the person writes a task themselves in Atril — free
text as the prompt — picks repo, branch and model, and Atril starts a workspace whose agent runs
`/libretto:libretto-flow <the text>`. Libretto already takes "what the user said" as its third
source and writes the proposal with the words verbatim. Candidate shape: a «Nueva tarea» button
in Tareas opening the Start dialog with a text area instead of a Jira key; the branch derived
from the first words (editable); own tasks listed with the workspace they started.

## Decision log

### Session 2026-11-09
- Q: «No le preguntes, tú sigue» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Dónde se escribe la tarea propia? → A: botón «Nueva tarea» en la cabecera de Tareas («desde el mismo panel»), que abre un diálogo: texto, repo, rama y modelo (assumed).
- Q: ¿Qué recibe el agente? → A: `/libretto:libretto-flow <texto>` como un único argumento; Libretto ya toma «lo que dijo el usuario» como fuente y lo guarda literal en su proposal (assumed).
- Q: ¿Y la rama? → A: se propone a partir de las primeras palabras (minúsculas, sin acentos, guiones, máx. 40) y se puede editar; deja de seguir al texto en cuanto la tocas (assumed).
- Q: ¿Límite del texto? → A: 2000 caracteres; Libretto escribe el resto en la spec, no hace falta más en una línea de comandos (assumed).
- Q: (spec-reviewer) ¿Qué es una «palabra» para la rama? → A: un tramo de `[a-z0-9]` tras quitar acentos y pasar a minúsculas; la puntuación separa palabras. «Editada» = cualquier cambio tuyo en el campo, aunque lo vacíes (assumed).
- Q: (spec-reviewer) ¿«Nueva tarea» sin Jira conectado? → A: sí, se ve y funciona: la cabecera de Tareas queda fuera del estado «Conecta…» (assumed, I25).
- Q: (spec-reviewer) ¿Qué agente? → A: siempre `claude` (assumed).
- Q: (spec-reviewer) ¿Dónde se nota el límite de 2000? → A: el área de texto no deja escribir más (`maxLength`, unidades UTF-16, igual que `.length` en main) (assumed).
- Q: (spec-reviewer) ¿Se extrae el atrapado de foco del diálogo de Empezar? → A: no: el diálogo nuevo lleva el suyo y el de Empezar no se toca, así no puede romperse sin prueba (assumed).
- Q: ¿Se listan las tareas propias aparte? → A: no: cada una es un trabajo más en Trabajo, con su rama; una lista aparte sería una segunda fuente de verdad (assumed).

## Outcomes

- Tareas has a **«Nueva tarea»** button. It opens a dialog with a text area («¿Qué hay que
  hacer?»), the repo, a branch proposed from the first words of the text (editable) and the model.
- **Empezar** opens a workspace on that branch whose agent runs the Libretto flow with the text
  as the request, and shows it in Trabajo, like a Jira Start.

## Scope boundaries

**In:** the button, the dialog, the branch proposal, starting the workspace with the text.
**Out:** saving drafts, editing the text after Start, a separate list of own tasks, creating a
Jira issue from the text, Jira transitions (there is no issue).

**Never scoped out:** the text reaches the agent as one literal argument behind the flow
command — never a shell string, never a flag (`spec-workspaces.md`, W40); the dialog is fully
keyboard-reachable (Tab cycles inside it, Escape closes, ⌘↩ submits from the text area).

## Constraints

- Reuses `workspaces.open` (W-criteria for both modes) with the text as one more argument; the
  flow command is built in main, never in the renderer.
- Same dialog look and focus rules as the Start dialog (I4–I10).

## Prior decisions

- **Own tasks from the same panel** — Pau, 9 nov: «puedo lanzar el libreto flow desde uno
  creado yo mismo … Personalizado, poniendo yo el prom o lo que sea desde el mismo panel».
- **No separate list** (assumed): an own task is a workspace like any other; its text lives in
  the Libretto proposal the agent writes, which is where Libretto keeps a request anyway.

## Task breakdown

- Main: `workspaces.open` takes an optional task text, validated and turned into the flow argument.
- Renderer: «Nueva tarea» button and dialog in Tareas, with the branch proposal.

## Verification criteria

- **I22** When the person writes a task in «Nueva tarea», picks a repo and presses Empezar, Atril
  shall open a workspace on the shown branch with the chosen model, passing the text as the task with agent `claude`,
  and show it in Trabajo.
  Proof: src/renderer/inbox/owntask.test.ts own task opens a workspace with its text
- **I23** While the text is empty or only spaces, Empezar shall be disabled, and the text area
  shall accept at most 2000 characters (UTF-16 units).
  Proof: src/renderer/inbox/owntask.test.ts own task needs text
- **I25** If no repo is registered, then the dialog shall say «Añade un repo en Trabajo para
  empezar» and Empezar shall be disabled.
  Proof: src/renderer/inbox/owntask.test.ts own task needs a repo
- **I26** While Jira is not connected (I3), «Nueva tarea» shall still be shown and open the dialog.
  Proof: src/renderer/inbox/owntask.test.ts own task works without jira
- **I24** While the person has not edited the branch, the branch shall be the first five words of
  the text, a word being a run of `[a-z0-9]` after lower-casing and removing accents, joined by
  hyphens, at most 40 characters with no trailing hyphen («Añadir filtro de Laboratorios» →
  `anadir-filtro-de-laboratorios`; «fix: bug-in api, ya» → `fix-bug-in-api-ya`); once the person
  changes the field in any way, it shall stay as they left it.
  Proof: src/renderer/inbox/owntask.test.ts branch follows the text until edited

## Approach

### Summary

The `atril:ws:open` IPC gains an optional fifth argument, the task text. Main validates it and
passes `prompt: '/libretto:libretto-flow ' + text` to the existing `openWorktree`/in-place open,
which already hands the argv to tmux without a shell. The renderer adds a «Nueva tarea» button in
the Tareas header, outside the «Conecta…» state, and an `OwnTaskDialog` next to `StartDialog`
with its own focus trap; `StartDialog` is not touched.

### Technical context

TypeScript, Electron, React, vitest (jsdom for the renderer). Files: `src/main/index.ts` (IPC),
`src/main/workspaces.ts` (`taskPrompt` validation), `src/preload/{index,api}.ts` (signature),
`src/renderer/inbox/{Inbox,OwnTaskDialog}.tsx`, `src/renderer/inbox/branch.ts` (slug), tests `src/main/tmux.test.ts`,
`src/main/workspaces.test.ts`, `src/renderer/inbox/owntask.test.ts`, the sketch
`bocetos/fase1-nucleo.html`. Gates: typecheck, lint, test.

### The approach

- `taskPrompt(text)` in workspaces.ts: trim; reject empty, > 2000 or containing `\0` (W41);
  return `/libretto:libretto-flow <text>` (the trimmed text, inner newlines kept).
- The IPC handler calls it when a fifth argument is present and returns `{ error }` on refusal
  before anything is created.
- `slugBranch(text)`: NFD, drop combining marks, lower case, non `[a-z0-9]` → `-`, first five
  words, trim hyphens, cut at 40 then trim a trailing hyphen.
- The dialog keeps `branchEdited`; while false, the branch is `slugBranch(text)`.
- W40's proof runs real tmux on the private test socket with a fake agent in place of `claude`
  that writes its argument count and each argument NUL-terminated, so a newline inside the text
  cannot pass for a second argument; what arrives is observed, not assumed.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| A text field in the Sidebar's «+ trabajo» form | Pau asked for it «desde el mismo panel» as Jira, i.e. Tareas |
| Building the flow command in the renderer | the renderer would choose the command line; main must |
| A Jira issue created from the text | out of scope; not every own task belongs in Jira |

### Risks

| Risk | What catches it |
|---|---|
| A text starting with `--` read as a claude flag | it is never first: the argument starts with `/libretto:libretto-flow` (W40 proof) |
| A slug that is not a valid git branch | `[a-z0-9-]` only and no leading/trailing hyphen; empty slug leaves the field empty and Empezar disabled |
| Branch already exists | the existing open refuses it with its own error (W-criteria), shown in the dialog |

### Validation and rollback

W40 forced red by passing the text through `sh -c` once; W41 and I22–I24 seen red before the code.
Rollback: one revert.

### Complexity deliberately kept

None.

## Checklist

- [x] own task: main validates the text and starts the flow with it, the «Nueva tarea» dialog in Tareas with the branch proposal, the sketch · Closes: W40, W41, I22, I23, I24, I25, I26
