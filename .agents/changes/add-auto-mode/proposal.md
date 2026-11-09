# add-auto-mode

Tracker: none
Targets: workspaces
Durable decisions: the ones in Prior decisions below

## Decision log

### Session 2026-11-09
- Q: Pau, 9 nov: «cuando se crea la tarea te diga si lo quieres automático o manual en que se pare en la spec y plan; si una tarea es pequeña puede ser modo auto y sigue a construir solo con el spec y plan sin revisar, solo lectura».
- Q: ¿Qué lanza el automático? → A: `/libretto:libretto-attacca`, el modo sin paradas de Libretto: mismas fases, nada que mantener en Atril (assumed).
- Q: attacca hace push y abre la MR solo; ¿se deja? → A: no: en automático Atril pide confirmación antes de `git push`, `gh pr create` y `glab mr create`, con el permiso de Claude Code («ask» desde el hook); se lo dije a Pau al encolar (assumed).
- Q: ¿Nuevo trabajo sin texto? → A: sin modo: es Claude a secas (assumed).
- Q: ¿Por defecto? → A: Manual, como hoy (assumed).
- Q: (revisor) ¿El clic directo de Empezar (I20)? → A: siempre Manual; ⌥-clic abre el diálogo con la elección (assumed).
- Q: (revisor) ¿Campo `mode`? → A: ya existe (in-place/worktree): campo nuevo `auto` (assumed).
- Q: (revisor) ¿F15 frente a F26? → A: F26 es la excepción y su texto gana; solo el editor de documentos (assumed).

## Outcomes

- Empezar (Jira), Nueva tarea and Nuevo trabajo with text offer **Manual** (default: Libretto stops at
  the spec and plan, as today) or **Automático** (no stop: from the spec and plan straight to build).
- An automatic workspace shows «Auto» on its row; its Spec, Plan and Checklist open read-only.
- Before an automatic agent pushes or opens a request, Claude Code asks the person.

## Scope boundaries

**In:** the choice in the three dialogs, the attacca command, the record field, the row badge,
read-only documents, the push confirmation. **Out:** switching mode on a running workspace, picking
the mode from task size automatically, a setting for the default mode.

**Never scoped out:** the task text stays one argv element (W40); the push needs the person.

## Constraints

- The mode only changes the slash command; W29/W31/W33/W34 apply unchanged.
- The hook stays the only thing Claude Code runs from Atril; it reads a marker, never the record.

## Prior decisions

- **Auto = attacca** (assumed): Libretto's own unattended mode; if it is wrong, the command is one
  string in `jira/start.ts` and `workspaces.ts`.
- **Push asks in auto** (assumed): what changes if wrong is one hook rule.
- **Automatic still stops where attacca stops**: a failing gate twice, a missing `jira`/`gh`/`glab`, the release question at the end and the push question; the row then shows «te necesita» like any agent.
- **Free text to attacca**: attacca hands `$ARGUMENTS` to find-work, which takes a request made in conversation (assumed).

## Task breakdown

- Main: the mode in start requests and records, the marker, the hook rule.
- Window: the choice in the dialogs, the badge, read-only documents.

## Verification criteria

- **W58** Where the start request carries `auto: true` (Empezar's dialog, Nueva tarea, or Nuevo trabajo
  with text), Atril shall start the agent with the single argument
  `/libretto:libretto-attacca <key or trimmed text>` instead of `/libretto:libretto-flow …`, store
  `auto: true` in the workspace record (a new field; `mode` stays `in-place | worktree`) and carry it
  in `WorkspaceView`; without it, or with any value but `true`, nothing changes.
  Proof: src/main/agent.test.ts automatic mode starts attacca and is recorded
- **W40** (amended) When a workspace is opened with a task text, the agent's last argument shall be the
  single string `/libretto:libretto-flow <trimmed text>`, or `/libretto:libretto-attacca <trimmed text>`
  when it is automatic (W58); a text holding `$(…)`, `;`, both kinds of quote, a newline, or starting
  with `--` shall arrive byte for byte, as that one argument, and run nothing.
  Proof: src/main/tmux.test.ts task text reaches the agent as one literal argument
- **W59** While the marker `$ATRIL_HOME/auto/<session>` exists, the hook shall answer a PreToolUse for
  Bash whose command matches `/(^|[\s;&|(])(git(\s+-[cC]\s+\S+)*\s+push|gh\s+pr\s+create|glab\s+mr\s+create)\b/`
  by printing exactly `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask",
  "permissionDecisionReason":"Modo automático: confirma antes de subir"}}`; for any other command or
  tool, or without the marker, it shall print nothing. Ceiling: a push inside a script the command
  calls is not seen; a quoted «git push» in an `echo` only adds a question; whether a person's own
  bypass mode or allow rule overrides «ask» is the host's (unverified).
  Proof: src/main/agent.test.ts the hook asks before an automatic push
- **W60** An automatic workspace's marker shall be written with its record, before its tmux session
  starts, and deleted when the workspace is removed.
  Proof: src/main/agent.test.ts the automatic marker lives as long as the workspace
- **W61** Empezar's dialog, Nueva tarea and Nuevo trabajo once it has text shall offer Manual (default)
  and Automático with the line «Sin parar en spec y plan; antes de subir te pregunta»; Nuevo trabajo
  without text offers none; Empezar's one click (I20) is always Manual; an automatic workspace's row
  shows «Auto».
  Proof: src/renderer/inbox/mode.test.ts the start dialogs offer manual or automatic

- **F26** In an automatic workspace, Spec, Plan and Checklist shall open read-only whatever the
  agent's state (an exception to F15; the diff modals already are), with the status bar «solo lectura ·
  modo automático» in place of F15's.
  Proof: src/renderer/flow/documents.test.ts automatic documents are read-only

## Approach

### Summary

`Mode = 'manual' | 'auto'` travels with the start requests (`jira.start`, the own-task start) into
`createWorkspace`, which picks the command, writes `mode` to the record and touches the marker.
`removeWorkspace` deletes the marker. The hook checks the marker by session name on PreToolUse/Bash
and prints the JSON decision. Dialogs get a two-option radio under the model; `WorkspaceView` carries
`auto`; the row shows a badge; `DocModal` reads `auto` from the selected workspace and is read-only.

### Technical context

Files: `src/main/{jira/start,workspaces,agent}.ts`, `resources/claude-hook.mjs`,
`src/preload/{api,index,i18n-en}.ts`, `src/renderer/inbox/{StartDialog,OwnTaskDialog}.tsx`,
`src/renderer/components/Sidebar.tsx`, `src/renderer/flow/DocModal.tsx`, `mockApi.ts`, styles,
`bocetos/novedades.html`, `bocetos/fase1-nucleo.html`. F26 lands in flow-status. Gates: typecheck,
lint, test.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Atril answers Libretto's stop question itself | fragile: reads Claude's terminal |
| attacca untouched (it pushes and opens the MR) | Pau was told the push would ask |
| A "no push" argument to attacca | changes the Libretto payload, not Atril |

### Risks

| Risk | What catches it |
|---|---|
| A push run through a script | named ceiling in W59 |
| Marker left behind | removed with the workspace; a stale one only adds a question |

### Validation and rollback

W58–W61, W40, F26 seen red first. Rollback: one revert.

### Complexity deliberately kept

None.

## Checklist

- [ ] main and hook: mode in requests and records, attacca, marker, the push question · Closes: W58, W40, W59, W60
- [ ] the window: the choice in the three dialogs, «Auto» on the row, read-only documents · waits on box 1 · Closes: W61, F26
