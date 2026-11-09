Tracker: none
Targets: work-inbox
Durable decisions: the ones in Prior decisions below

# use-jira-board-columns

## The ask, verbatim

Pau, 9 nov 2026:

> los flujos de tareas del Jira, cógelas del tablero.

## The reading

Not a bug: the Tareas screen groups tasks by Jira status category (Por empezar / En curso /
En revisión y despliegue), a heuristic of Atril's. Pau wants the groups — the flow — to be the
**columns of his Jira board**, in the board's order.

Observed 9 nov: `jira board list -p <PROJECT>` returns the same many kanban boards for WEB,
SHOP and APP (the project filter does not narrow it), so the board cannot be inferred: the
person picks it.

## Decision log

### Session 2026-11-09
- Q: «No le preguntes, tú sigue» stands → decisions below are taken with the recommended option and marked (assumed).
- Q: ¿Qué tablero? → A: el que la persona elige en Ajustes, con un buscador por nombre; uno solo (assumed). Si es falso: varios tableros a la vez o uno por proyecto.
- Q: ¿Y las tareas que no están en ninguna columna del tablero? → A: grupo «Fuera del tablero», al final y plegado (assumed).
- Q: ¿Qué columna viene plegada? → A: la primera columna desplegada; las que el tablero llama Done/Hecho no salen (la consulta ya excluye lo terminado); el resto desplegadas salvo «Fuera del tablero» (assumed).
- Q: ¿Sin tablero elegido? → A: la agrupación actual por categoría, con un aviso «Elige tu tablero en Ajustes para ver sus columnas» (assumed).
