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

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **⌘↩ en foco:** salta solo al agente que espera, el más antiguo según N1, sin contar el que tienes
    abierto. En foco nunca abre una tarea; si no espera nadie, la opción del menú está desactivada. N2 se
    enmienda para recogerlo.
  - **«Volver a»:**
    - Recuerda el trabajo en el que estabas al hacer el primer salto, y los saltos siguientes no lo
      cambian.
    - Se olvida al volver, al salir del foco o si ese trabajo se cierra.
    - Cambiar de trabajo a mano (⌘1…9, ⌘K) sigue permitido y no cambia a dónde vuelves.
  - **La pastilla:**
    - Nombra a todos los que esperan ahora, menos el abierto, aunque ya esperaran antes de entrar en el
      foco.
    - Desaparece cuando no queda ninguno.
    - Es parte de W79, en la ventana.
  - **El aviso del Mac:**
    - Un aviso que se calla por estar en el foco ya no sale después: la pastilla lo sustituye. W15 se
      enmienda con esa excepción.
    - Main mira `isFocused()` de la ventana en el momento de avisar. Minimizada, oculta o en otro
      Escritorio cuenta como «no delante».
    - La ventana le dice a main cada vez que el foco cambia y al cargar. Si recarga, el foco vuelve a
      estar apagado.
  - **Cuándo se puede activar:** «Modo foco» solo se activa en Trabajo con un trabajo elegido. Al cambiar
    de trabajo, el foco sigue puesto, ahora sobre el nuevo.
  - **Tutorial:** se nombra en el paso 4.
  - **Textos:** «Modo foco» y «Volver» van por `t()`.

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
  «Salir del foco»; choosing it again or pressing «Salir del foco» shall restore them; the menu item shall
  be disabled unless Trabajo is shown with a workspace selected; switching workspace keeps focus on the new
  one; focus shall not be stored across restarts. One test holds a case per clause.
  Proof: src/renderer/focus.test.ts focus keeps only the chosen workspace
- **W78** While focus is on and the Atril window is focused (`isFocused()` at that moment; minimised,
  hidden or on another Space is not focused), main shall show no macOS notification for a workspace
  entering needs-you, and that entry shall not be notified later; otherwise notifications behave as W15.
  One test holds the four combinations of focus on/off and window focused/not.
  Proof: src/main/focus.test.ts focus swaps the notification for the pill only in front
- **W79** While focus is on, the window shall show «{rama} te necesita» (plus «+{n}») for every needs-you
  workspace other than the selected one, without changing the selection, and hide it when there is none;
  ⌘↩ or pressing it shall select the oldest waiting one (N1 order) and keep focus on, with ⌘↩ disabled
  when none waits; «Volver a {rama}» or ⌘⌥← shall then select the workspace selected at the first jump,
  which later jumps or manual switches do not change and which is forgotten on return, on leaving focus or
  when that workspace is removed. One test holds a case per clause.
  Proof: src/renderer/focus.test.ts jump to the waiting agent and back

- **N2** (amended) While Trabajo or Tareas is shown and the list is not empty, ⌘↩ shall open its first
  item — the workspace for an agent, the Start for a task, or Tareas when that task is not loaded yet;
  otherwise the menu item is disabled; while focus mode is on, W79 governs ⌘↩ instead.
  Proof: src/renderer/nextup.test.ts command enter opens the next item
- **W15** (amended) When a session enters `needs-you`, Atril shall show one macOS notification, and no
  other until the session leaves that state, except where W78 suppresses it.
  Proof: src/main/status.test.ts notifies once per needs-you transition

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

- [ ] focus state, menu and layout; main's notification gate · Closes: W15, W77, W78
- [ ] the pill, jump and back; tutorial step 4 mentions ⌘⇧F (no criterion); sketch; photo · waits on box 1 · Closes: N2, W79
