Tracker: none
Targets: flow-status
Durable decisions: the ones in Prior decisions below

# add-flow-documents

## The ask, verbatim

Pau, 9 nov 2026:

> O es la spec o es el plan, si tú le das al libreto y le das encima del spec o del plan, que puedas ver lo que ha escrito la IA, ¿sabes? O si, por ejemplo, el plan lo ves bien y puedas modificarlo antes de que tire al siguiente, cosas de esas, ¿sabes?

## The reading

Not a bug; new work. In the Libretto panel, clicking a stage (spec, plan, checklist) opens what
the agent wrote — the change's `proposal.md` sections (contract, `## Approach`, `## Checklist`)
and any `spec-*.md` beside it — read from that workspace's worktree, which the panel already
watches. Editing is allowed while the agent waits for the person (needs-you), which is when
Libretto stops before code: the person changes the document, saves, and the agent reads the
saved file when it continues. While the agent is working the document is read-only, so the
two never write the same file at once.

## Decision log

### Session 2026-11-09
- Q: (propuesta) ver y editar spec y plan desde el panel; editar solo mientras el agente espera → A: «dale».
- Q: «No le preguntes, tú sigue» stands → the rest taken with the recommended option, marked (assumed).
- Q: ¿Qué se ve al pulsar cada etapa? → A: Spec = `proposal.md` desde arriba hasta `## Approach` más cada `spec-*.md`; Plan = `## Approach`; Checklist = `## Checklist`; una etapa sin nada escrito no se puede pulsar (assumed).
- Q: ¿Qué se edita? → A: el archivo entero de la pestaña que miras (`proposal.md` o un `spec-*.md`), como texto; leer es por secciones, editar es el archivo (assumed).
- Q: ¿Cuándo se puede editar? → A: con el agente en «te necesita» o parado; trabajando, no. Lo comprueba main al guardar, no solo la ventana (assumed).
- Q: ¿Y si Claude cambia el archivo mientras lo editas? → A: no se guarda nada y se avisa «Claude ha cambiado el archivo mientras editabas: vuelve a abrirlo» (assumed).
- Q: ¿Markdown con librería? → A: no: un lector mínimo (títulos, listas, casillas, bloques de código, negrita) que solo produce texto de React, nunca HTML (assumed).

## Outcomes

- In the Libretto panel, **Spec**, **Plan** and the **Checklist** are buttons once their part of
  the change exists; each opens a document view with what the agent wrote, readable (headings,
  lists, boxes, code), following the file live.
- While the agent waits for the person or has stopped, the view offers **Editar**: the whole file
  as text, **Guardar** and **Cancelar**. The agent reads the saved file when it continues.

## Scope boundaries

**In:** the document view, live reading, editing and saving `proposal.md` and `spec-*.md` of the
workspace's current change. **Out:** other changes' folders, the capability specs under
`.agents/specs/`, creating or deleting files, telling the agent what changed (the person replies
in the terminal), rich-text editing, a diff of the person's edit.

**Never scoped out:** main refuses a save while the agent is working, for any name that is not
`proposal.md` or `spec-<name>.md` directly in the current change folder, and when the file changed
on disk since it was read — and writes atomically, so a crash never leaves half a file; the file's
text is never rendered as HTML; the view is keyboard-operable (Escape closes, the buttons are
native).

## Constraints

- The current change and its folder come from `stageOf` (F12's most recent change).
- The agent state comes from main's status tracker (W14–W16, W26).
- No new dependency.

## Prior decisions

- **See and correct what the agent wrote** — Pau, 9 nov: «si tú le das al libreto y le das encima
  del spec o del plan, que puedas ver lo que ha escrito la IA … el plan lo ves bien y puedas
  modificarlo antes de que tire al siguiente» → «dale» to: read live, edit only while it waits.
- **Edit only while the agent waits** (assumed): the agent and the person never write one file
  at once; the mtime check catches the rest.

## Task breakdown

- Main: read the current change's documents; save with the three refusals and an atomic write.
- Renderer: stage buttons, the document view with tabs per file, the minimal markdown reader,
  edit mode.

## Verification criteria

- **F13** When the person clicks Spec, Plan or Checklist in the Libretto panel, Atril shall open
  the current change's document at that part — Spec: `proposal.md` up to `## Approach` and one tab
  per `spec-*.md`; Plan: `## Approach`; Checklist: `## Checklist` — and a stage whose part does not
  exist yet shall not be a button.
  Proof: src/renderer/flow/documents.test.ts stage opens what the agent wrote
- **F14** While the document view is open and not being edited, it shall show the file's new
  text when the agent changes it.
  Proof: src/renderer/flow/documents.test.ts document view follows the file live
- **F15** While the agent is working, Editar shall be disabled with «Claude está escribiendo:
  podrás editar cuando te espere»; while it waits or has stopped, Editar shall open the whole file
  as text and Guardar shall save it.
  Proof: src/renderer/flow/documents.test.ts edit only while the agent waits
- **F16** If a save arrives while the agent is working, or names a file other than `proposal.md`
  or `spec-<name>.md` directly in the current change folder, or the file's mtime differs from the
  one it was read with, then Atril shall write nothing and say why; otherwise it shall replace the
  file atomically.
  Proof: src/main/flow/document.test.ts save refuses unless it is safe
- **F17** The document view shall render headings, list items, boxes, code blocks and bold as
  text, so markup in the file (`<script>`, `<img onerror>`) shows as literal characters.
  Proof: src/renderer/flow/documents.test.ts markdown renders as text only

## Approach

### Summary

`src/main/flow/document.ts` exposes `readDocs(ws)` → `{ change, files: [{ name, text, mtimeMs }] }`
for the current change, and `saveDoc(ws, state, name, text, mtimeMs)` with the three refusals and
a temp-file + rename write. Two IPC handlers wire them (`atril:flow:docs`, `atril:flow:save`), the
second reading the agent state from the status tracker in main. The renderer's `LibrettoFlow`
turns Spec, Plan and Checklist into buttons that open `DocumentView`, which re-reads on the
existing `flow.onChange` signal and renders through `markdown.tsx`.

### Technical context

TypeScript, Electron, React 19, vitest (+jsdom). Files: `src/main/flow/document.ts` (+test),
`src/main/index.ts` (two handlers), `src/preload/{api,index}.ts`, `src/renderer/flow/{FlowPanel,
DocumentView,markdown}.tsx`, `src/renderer/mockApi.ts`, `styles.css`, test
`src/renderer/flow/documents.test.ts`, the sketch `bocetos/fase1-nucleo.html`. Gates: typecheck,
lint, test. No new dependency.

### The approach

- Sections: `Spec` = text before the first `^## Approach`; `Plan` = from `## Approach` to the next
  `^## ` heading that is not inside it (i.e. up to `## Checklist` or the end); `Checklist` = from
  `## Checklist` to the end. A stage is a button only when its section is non-empty.
- Name check: `/^(proposal|spec-[a-z0-9-]+)\.md$/` and the resolved path's parent equals the
  change folder.
- Atomic write: `writeFile(<file>.atril-tmp)` then `rename`.
- Live: `DocumentView` re-reads docs whenever `flow.onChange` fires for its workspace (the watcher
  already fires on any file change in the change folder, F8); while editing it does not replace
  the person's text.
- Markdown: line-based — `#`…`######` → heading elements, `- [ ]`/`- [x]` → a disabled checkbox
  and text, `- `/`* `/`1. ` → list items, fenced blocks → `<pre>`, `**x**` → `<b>`; every piece is a
  React text node.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| A markdown library (react-markdown, marked) | a new dependency for five constructs; marked returns HTML that would need sanitising |
| Editing only the section you read | splicing a section back into the file is where edits get lost; the whole file is honest |
| Locking the file while the person edits | the agent does not know about the lock; the state gate plus the mtime check cover it |
| Edit any time, last writer wins | the agent's next write silently erases the person's correction |

### Risks

| Risk | What catches it |
|---|---|
| The agent starts writing between Editar and Guardar | the mtime check refuses the save (F16) |
| A crafted name escapes the folder (`../`, absolute) | the name pattern plus the parent-folder check (F16 proof uses both) |
| A huge file freezes the view | ceiling named: no cap; Libretto documents are a few hundred lines |

### Validation and rollback

F13–F17 seen red before the code; F16 forced red once with each refusal disabled. Rollback: one
revert.

### Complexity deliberately kept

- The mtime round-trip on save: it is what makes "edit while it waits" safe when the agent wakes
  up early.

## Checklist

- [ ] flow documents: main reads and saves the current change's files safely, the panel opens them by stage, live, with edit while the agent waits, the sketch · Closes: F13, F14, F15, F16, F17
