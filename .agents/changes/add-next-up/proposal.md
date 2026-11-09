Tracker: none
Targets: workspaces
Durable decisions: the ones in Prior decisions below

# add-next-up

## The ask, verbatim

Pau, 9 nov 2026:

> Para que sea más usable y todo esto, ¿qué mejorarías?

The session proposed five usability changes; Pau accepted with «si» that items 2, 3 and 4 go
in their own change after the core (1 and the doctor chip went into add-atril-core; ⌘K is
phase 3):

2. **One "Qué me toca ahora" queue** at the top: agents waiting for you, specs to approve, MRs
   to review, Jira tasks not started — one list ordered by urgency, ⌘↩ jumps to the next.
3. **Answer the agent from the macOS notification**: a reply action on the needs-you
   notification sends the text into that agent's session without opening Atril.
4. **Start in one click after the first time**: once a Jira project/component has a remembered
   repo, Start skips the dialog (branch derived automatically), with an undo.

## The reading

Not a bug; new work, after add-atril-core lands. Depends on its agent states (needs-you),
Start, and the phase-2 MR lists for the MR part of the queue.

## Decision log

### Session 2026-11-09
- Q: «No le preguntes, tú sigue» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Qué entra en «Qué me toca»? → A: agentes en «te necesita» (los más antiguos primero), después tareas de la primera columna del tablero (o «Por empezar» sin tablero); las MR llegan con la fase 2 (assumed).
- Q: ¿Cómo se responde desde el aviso? → A: aviso de macOS con respuesta (`hasReply`); el texto se escribe en el panel del agente con `tmux send-keys -l` y Enter, solo en ese panel (assumed).
- Q: ¿Cuándo es un clic «Empezar»? → A: cuando el proyecto+componente ya tiene repo recordado y la rama propuesta está libre: arranca con el modelo por defecto sin diálogo; ⌥-clic abre el diálogo siempre (assumed).
- Q: (spec-reviewer) ¿Qué tareas entran en la lista? → A: solo las que no tienen ya un trabajo abierto; si el tablero no se puede leer (I18), las del grupo «Por empezar» (assumed).
- Q: (spec-reviewer) ¿Dónde funciona ⌘↩? → A: solo con Trabajo o Tareas a la vista y con algo en la lista; si no, el elemento del menú está desactivado (assumed).
- Q: (spec-reviewer) ¿«Modelo por defecto»? → A: el «Por defecto» de W34, sin `--model` (assumed).
- Q: (spec-reviewer) ¿Y el «deshacer» del paso 4? → A: fuera de alcance: «Quitar» ya cierra un trabajo recién abierto (assumed).
- Q: (spec-reviewer) ¿Responder en el aviso cuenta como pulsarlo (W38)? → A: no: responder no trae Atril al frente ni cambia de pantalla; solo pulsar el aviso lo hace (assumed).
- Q: (spec-reviewer) ¿Y si el trabajo ya no existe al responder? → A: no se envía nada y un aviso dice «No se pudo enviar: ese trabajo ya no está» (assumed).

## Outcomes

- A **«Qué me toca»** strip at the top of Trabajo lists, in order, the agents waiting for the
  person (oldest first) and then the tasks waiting to start; **⌘↩** opens the next one.
- The needs-you notification has a **reply field**: what the person types goes into that
  agent's terminal, followed by Enter, without opening Atril.
- **Empezar** starts at once when the task's project and component already have a remembered
  repo and the proposed branch is free; ⌥-click (or a missing memory) opens the dialog.

## Scope boundaries

**In:** the strip, ⌘↩, the reply notification. One-click Start is the work-inbox amendment
in `spec-work-inbox.md`. **Out:** MRs in the strip (phase 2), replies to anything but the
agent's own pane, changing model or repo on one click, an «undo» for one-click Start («Quitar»
already closes a fresh workspace).

**Never scoped out:** a reply only ever reaches the pane of the workspace the notification
belongs to; the reply text goes to tmux as a literal (`send-keys -l`), never as key names or
shell; an empty reply sends nothing.

## Constraints

- Electron `Notification` with `hasReply: true` and the `reply` event (macOS).
- `tmux send-keys -t <pane id> -l <text>` then `send-keys -t <pane id> Enter`, through the runner.
- One-click Start reuses Start (I4–I10, W34) with the default model.

## Prior decisions

- **The usability batch** — Pau, 9 nov: «Para que sea más usable y todo esto, ¿qué mejorarías?»
  → «si» to items 2–4 in their own change.

## Task breakdown

- Next-up list in main (ordering) + the strip and ⌘↩ in the renderer.
- Reply notification → literal send to the pane.
- One-click Start path.

## Verification criteria

- **N1** The «Qué me toca» list shall order agents in `needs-you` by how long they have been
  waiting (oldest first), then the tasks with no open workspace from the first board column — or
  from «Por empezar» when there is no board or it cannot be read (I18) — in Jira's order.
  Proof: src/main/nextup.test.ts orders waiting agents before tasks
- **N2** While Trabajo or Tareas is shown and the list is not empty, ⌘↩ shall open its first
  item — the workspace for an agent, the Start for a task; otherwise the menu item is disabled.
  Proof: src/renderer/nextup.test.ts command enter opens the next item
- **N3** When the person replies to a needs-you notification, Atril shall type the reply into
  that workspace's agent pane as literal text followed by Enter, without bringing Atril to the
  front; it shall send nothing for an empty reply, and if the workspace or its pane no longer
  exists it shall send nothing and say «No se pudo enviar: ese trabajo ya no está».
  Proof: src/main/reply.test.ts reply reaches only its own pane as literal text

## Approach

### Summary

Main computes the next-up list from the agent states and the inbox groups it already has; the
renderer shows it as a strip and binds ⌘↩ through the app menu. The notification gains a reply
handler that writes to tmux. Start gains a fast path in the renderer.

### Technical context

src/main/nextup.ts (+test), src/main/status.ts (hasReply + reply), src/main/tmux.ts (sendText),
src/main/reply.test.ts, src/main/menu.ts (⌘↩ "Siguiente"), index.ts/preload, renderer strip +
Inbox fast path + test, sketch.

### The approach

- `nextUp(states, waitingSince, inbox)` → `[{kind:'agent', id} | {kind:'task', key}]`; the
  waiting time comes from the state file's `at`.
- `sendText(paneId, text)` = `send-keys -l` + `Enter`; the reply handler resolves the pane from
  the workspace record of the notification's workspace id.
- Fast path: the renderer calls `proposeStart`; if a repo is remembered and no suffix was
  needed, it calls `start` directly.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Reply by opening Atril | the point is answering without switching apps |
| `send-keys` without `-l` | text like `C-c` or `Enter` would be interpreted as keys |
| One click always | the first task of a project must still pick its repo |

### Risks

| Risk | What catches it |
|---|---|
| The reply arrives after the agent moved on | it lands as the next message to Claude, like typing it in the terminal |
| macOS may fire a click right after a reply | a click within 1 s of a reply is ignored (unverified on a real notification) |
| ⌘↩ clashes with a terminal shortcut | it is a menu accelerator, handled before xterm; only when Trabajo or Tareas is shown |

### Validation and rollback

N1–N4 forced red once each; one real reply check on a private tmux socket (send-keys into a
`cat` pane and capture it). Rollback: one revert.

### Complexity deliberately kept

None.

## Checklist

- [x] next up: the ordered list and strip with ⌘↩, the reply notification into the agent pane, one-click Start for remembered tasks · Closes: N1, N2, N3, I20, I21
