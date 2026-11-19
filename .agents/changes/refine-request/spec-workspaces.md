# refine-request · workspaces

Targets: workspaces

## Verification criteria

- **W208** When `atril:refine:ask(text)` is called with a string that, trimmed, has 1–2000 characters and no NUL, main shall run `claude -p --model haiku --output-format json --tools "" --no-session-persistence --json-schema <{questions: 1–5 strings}> <instruction>` once — the instruction in English, ending «Write the questions in {lang}.» with the app's language, as `scores.ts` does — with the trimmed request on stdin (never in argv) and a 60 s timeout, outside the scores queue, and answer `{ questions }`: `structured_output.questions`, each trimmed with newlines turned into spaces, empty and repeated ones dropped, each cut to 200 characters, at most 5. Any other argument shall answer `{ error: «No hay petición que afinar.», detail: 'argument', fix: 'retry' }` with no run.
  Proof: src/main/refine.test.ts asks haiku once with the request on stdin and keeps well-formed questions
- **W209** If the run does not give questions, then main shall answer `{ error, detail, fix: 'retry' }`, never rejecting the IPC call and never carrying Claude's output: exit 124 → «Claude no ha contestado a tiempo.», detail `timeout`; exit 127 → «No encuentro Claude Code en este Mac.», detail `claude`; any other non-zero exit → «Claude ha fallado.», detail `exit {code}`; exit 0 with stdout that is not JSON, `is_error: true`, no `structured_output.questions` array, or no question left after W208's cleaning → «Claude no ha devuelto preguntas.», detail `json`, `is_error`, `schema` or `empty`. A call while one runs shall answer «Ya está preguntando.», detail `busy`, with no new run.
  Proof: src/main/refine.test.ts a failed ask says why and runs one at a time
