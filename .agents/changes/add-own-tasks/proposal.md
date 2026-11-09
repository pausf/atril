Tracker: none
Queued: 2026-11-09

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
