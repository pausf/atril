# add-auto-mode

Queued: 2026-11-09
Tracker: none

Pau, 9 nov: «cuando se crea la tarea te diga si lo quieres automático o manual en que se pare en la
spec y plan; si una tarea es pequeña puede ser modo auto y sigue a construir solo con el spec y plan
sin revisar, solo lectura».

- Start dialogs (Empezar, Nueva tarea, Nuevo trabajo) ask **Manual** (default: stops at spec and plan,
  as today) or **Automático**.
- Automático starts `/libretto:libretto-attacca <KEY>` instead of `/libretto:libretto-flow`: same
  phases, no stop before code. Attacca also pushes and opens the MR at the end — the dialog must say
  so in its line, or auto stops before the push (open question for the spec).
- In auto, Spec/Plan/Checklist open read-only («modo automático») — nobody waits to edit.
- The workspace row shows an «Auto» badge.
