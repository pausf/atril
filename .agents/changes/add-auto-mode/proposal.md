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

## Outcomes

- Empezar (Jira), Nueva tarea and Nuevo trabajo with text offer **Manual** (default: Libretto stops at
  the spec and plan, as today) or **Automático** (no stop: from the spec and plan straight to build).
- An automatic workspace shows «Auto» on its row; its Spec, Plan and Checklist open read-only.
- Before an automatic agent pushes or opens a request, Claude Code asks the person.

## Scope boundaries

**In:** the choice in the three dialogs, the attacca command, the record field, the row badge,
read-only documents, the push confirmation. **Out:** switching mode on a running workspace, picking
the mode from task size automatically, a setting for the default mode.

**Never scoped out:** the task text stays one argv element (W-own); the push needs the person.

## Constraints

- The mode only changes the slash command; W29/W31/W33/W34 apply unchanged.
- The hook stays the only thing Claude Code runs from Atril; it reads a marker, never the record.

## Prior decisions

- **Auto = attacca** (assumed): Libretto's own unattended mode; if it is wrong, the command is one
  string in `jira/start.ts` and `workspaces.ts`.
- **Push asks in auto** (assumed): what changes if wrong is one hook rule.

## Task breakdown

- Main: the mode in start requests and records, the marker, the hook rule.
- Window: the choice in the dialogs, the badge, read-only documents.

## Verification criteria

- **W58** Where the person picks Automático in Empezar, Nueva tarea or Nuevo trabajo with text, Atril
  shall start the agent with `/libretto:libretto-attacca <key or text>` instead of
  `/libretto:libretto-flow` (still one argv element), store `mode: 'auto'` in the workspace record
  and show «Auto» on its row; Manual, the default, changes nothing; Nuevo trabajo without text
  offers no mode.
  Proof: src/main/agent.test.ts automatic mode starts attacca and is recorded
- **W59** While a workspace is automatic (the marker `$ATRIL_HOME/auto/<session>` exists, written when
  it starts and removed with the workspace), the hook shall answer a PreToolUse for Bash whose
  command matches `git push`, `gh pr create` or `glab mr create` with
  `permissionDecision: "ask"` and the reason «Modo automático: confirma antes de subir»; for any
  other command, or without the marker, it shall print nothing. Ceiling: a push inside a script the
  command calls is not seen.
  Proof: src/main/agent.test.ts the hook asks before an automatic push
- **F26** In an automatic workspace, Spec, Plan and Checklist shall open read-only whatever the
  agent's state, with the status bar «solo lectura · modo automático».
  Proof: src/renderer/flow/documents.test.ts automatic documents are read-only

## Approach

### Summary

`Mode = 'manual' | 'auto'` travels with the start requests (`jira.start`, the own-task start) into
`createWorkspace`, which picks the command, writes `mode` to the record and touches the marker.
`removeWorkspace` deletes the marker. The hook checks the marker by session name on PreToolUse/Bash
and prints the JSON decision. Dialogs get a two-option radio under the model; `WorkspaceView` carries
`mode`; the row shows a badge; `DocModal` treats `mode === 'auto'` as read-only.

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

W58, W59, F26 seen red first. Rollback: one revert.

### Complexity deliberately kept

None.

## Checklist

- [ ] main and hook: mode in requests and records, attacca, marker, the push question · Closes: W58, W59
- [ ] the window: the choice in the three dialogs, «Auto» on the row, read-only documents · waits on box 1 · Closes: F26
