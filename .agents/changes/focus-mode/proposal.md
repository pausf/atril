# focus-mode

Tracker: none
Targets: workspaces
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> Que tenemos que seguir el flujo que hemos dicho, es decir, lo de las puntuaciones y todo esto, ¿eh? O sea, no cambies la idea que tenemos, solo hay que mejorarla, ¿sabes? Tenemos que conseguir que la gente pueda hacer, por ejemplo, 3 tareas a la vez y con estas sin perder el foco.

## Reading

Modo foco (lista del 9 nov) al servicio de llevar 3 trabajos a la vez: estás en uno y Atril calla lo demás;
solo te interrumpe (discreto, sin cambiarte de pantalla) cuando otro agente te necesita, y con un atajo
saltas a él y vuelves exactamente a donde estabas.

## Decision log

### Session 2026-11-10
- Q: ¿Qué es el modo foco? → A: estás en un trabajo y Atril quita lo demás de la vista: la barra lateral y
  «Qué me toca» se esconden; la terminal y el panel de Libretto de ese trabajo se quedan (assumed).
- Q: ¿Cómo se entra y sale? → A: menú Trabajo → Modo foco, ⌘⇧F, y un botón «Salir del foco» arriba; no se
  recuerda al reiniciar (assumed: el foco es de un momento).
- Q: ¿Y si otro agente te necesita? → A: con Atril delante, en vez del aviso del Mac sale una pastilla
  discreta arriba, «{rama} te necesita», que no te cambia de trabajo; con Atril detrás, el aviso del Mac
  sale como siempre (permite responder, N3) (assumed).
- Q: ¿Cómo saltas y vuelves? → A: ⌘↩ (o pulsar la pastilla) va al que te necesita, sin salir del foco; allí
  «Volver a {rama}» y ⌘⌥← te devuelven al trabajo donde estabas (assumed).
- Q: (fase 5) ¿Cómo? → A: un estado `focus` en la ventana y un aviso a main de si suprimir notificaciones
  (assumed). Perdió: una ventana aparte por trabajo (rompe el modelo de una sola ventana).

## Outcomes

- ⌘⇧F deja a la vista solo el trabajo elegido: su terminal y su panel; ⌘⇧F otra vez, o «Salir del foco», lo
  devuelve todo.
- Mientras tanto, si otro agente te necesita y Atril está delante, una pastilla te lo dice sin moverte;
  ⌘↩ te lleva y «Volver a …» te trae de vuelta, sin salir del foco.

## Scope boundaries

**In:** el estado de foco, el menú y atajo, esconder barra y «Qué me toca», la pastilla, saltar y volver,
suprimir el aviso del Mac con Atril delante.
**Out:** foco por tiempo (pomodoro), silenciar sonidos del sistema, foco en Tareas o MR, recordar el foco.
**Never scoped out:** ningún agente se pierde: la pastilla nombra a todos los que te necesitan (el primero y
«+N»); con Atril detrás el aviso del Mac sigue; teclado para todo.

## Prior decisions

- El foco no se recuerda al reiniciar (assumed, 10 nov).
- Con Atril detrás, el aviso del Mac sale igual (assumed, 10 nov).
- ⌘⇧F y ⌘⌥← como atajos (assumed, 10 nov; libres en el menú).

## Task breakdown

- Ventana: estado `focus`, layout sin barra ni «Qué me toca», botón «Salir del foco».
- Menú: «Modo foco» ⌘⇧F, «Volver» ⌘⌥←.
- Main: no notificar needs-you mientras el foco esté activo y la ventana enfocada.
- Ventana: pastilla, salto con ⌘↩, «Volver a {rama}».

## Verification criteria

- **W77** When the person chooses Trabajo → Modo foco (⌘⇧F) with a workspace selected, the Trabajo screen
  shall hide the sidebar and «Qué me toca» and keep that workspace's terminal and Libretto panel, showing
  «Salir del foco»; choosing it again or pressing «Salir del foco» shall restore them; focus shall not be
  stored across restarts.
  Proof: src/renderer/focus.test.ts focus keeps only the chosen workspace
- **W78** While focus is on and the Atril window is focused, main shall show no macOS notification for a
  workspace entering needs-you, and the window shall show «{rama} te necesita» (plus «+{n}» for more)
  without changing the selected workspace; while the window is not focused, notifications behave as W15.
  Proof: src/main/focus.test.ts focus swaps the notification for the pill only in front
- **W79** While focus is on, ⌘↩ or pressing the pill shall select the first waiting workspace and keep
  focus on, and then «Volver a {rama}» or ⌘⌥← shall select the workspace selected before the jump.
  Proof: src/renderer/focus.test.ts jump to the waiting agent and back

## Approach

### Summary

Un estado de ventana, `focus`, que el layout respeta, y un `setFocus(boolean)` hacia main para que el
notificador sepa si debe callar. La pastilla lee la lista de «Qué me toca», que ya ordena los agentes en
espera (N1).

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Ventana aparte por trabajo | Rompe la ventana única y duplica la terminal. |
| Silenciar todos los avisos en foco | Con Atril detrás perderías al agente que te necesita. |

### Risks

| Risk | Mitigation |
|---|---|
| Un agente espera sin que lo veas | La pastilla los cuenta todos; con Atril detrás, aviso del Mac. |
| El atajo choca con la terminal | Son aceleradores de menú (como W22), la terminal no los recibe. |

### Validation and rollback

Tests nuevos vistos en rojo. Rollback: un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [ ] focus state, menu and layout; main's notification gate · Closes: W77, W78
- [ ] the pill, jump and back; tutorial step 4 or 5 mentions ⌘⇧F; sketch; photo · waits on box 1 · Closes: W79
