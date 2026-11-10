# add-doctor-install-terminal

Tracker: none
Targets: workspaces
Durable decisions: the three in Prior decisions below

## The ask, verbatim

> herramienta por instalar está muy bien, pero de paso, yo le hablaría un terminal, ¿no? Y que se vaya instalando. También, ¿no?

## Reading

El aviso «N herramienta(s) por instalar» (`DoctorChip`) hoy solo copia el comando. Que además
abra una terminal y lo lance ahí para que se vaya instalando, y que el doctor vuelva a comprobar al acabar.

## Decision log

### Session 2026-11-10
- Q: ¿Qué terminal? → A: Terminal.app vía `osascript` (`activate` + `do script`): viene con macOS y la persona ve y responde lo que pida el instalador (contraseña, licencia de Xcode) (assumed). Si Pau usa otra (iTerm, Ghostty), se añade un ajuste.
- Q: ¿Una terminal dentro de Atril (xterm + pty)? → A: no: un instalador que pide `sudo` o abre un diálogo de macOS va mejor en una terminal de verdad, y Atril no tiene pty fuera de tmux, que puede ser justo lo que falta (assumed).
- Q: ¿Cómo sabe Atril que terminó? → A: no lo sabe: al volver la ventana de Atril al frente (foco), el doctor comprueba otra vez y el aviso se actualiza o desaparece (assumed). Si eso no basta, un sondeo de 5 s mientras haya una instalación lanzada.
- Q: (fase 5) ¿Cómo se construye? → A: un handler `atril:doctor:install(tool)` que solo acepta nombres de la lista y un listener de foco en la ventana (assumed). Perdió: pasar el comando desde la ventana (abriría una puerta para ejecutar cualquier cosa).

## Outcomes

- En el aviso «N herramienta(s) por instalar», cada herramienta con comando tiene **Instalar** al lado
  de Copiar. Al pulsarlo se abre Terminal.app con ese comando ya en marcha y el elemento dice
  «Instalando en Terminal…».
- Al volver a Atril, el doctor comprueba otra vez: lo instalado desaparece de la lista y, si ya no
  falta nada, el aviso entero.

## Scope boundaries

**In:** el botón, el handler en main, el texto de estado, volver a comprobar al recuperar el foco.

**Out:** elegir otra terminal; ver la instalación dentro de Atril; detectar el final de la instalación;
instalar varias a la vez con un botón; actualizar herramientas que ya están.

**Never scoped out:** la ventana solo manda el nombre de la herramienta y main ejecuta únicamente el
comando de su lista (W21); un fallo al abrir Terminal se dice en el elemento; el botón se alcanza y
se pulsa con teclado.

## Constraints

- Sin dependencias nuevas; `osascript` viene con macOS.
- El comando va dentro de una cadena AppleScript: comillas y barras invertidas escapadas.
- Textos por `t()` con su inglés en `src/preload/i18n-en.ts`.

## Prior decisions

- Terminal.app vía `osascript` (assumed, 10 nov). Techo: una persona con otra terminal ve Terminal.app;
  se añade un ajuste cuando alguien lo pida.
- Solo nombres de la lista cruzan el IPC (assumed, 10 nov): la lista de W21 es la única fuente de
  comandos.
- Volver a comprobar al recuperar el foco, sin seguir la instalación (assumed, 10 nov).

## Task breakdown

- Main: `installTool(tool, run)` y su handler.
- Preload: `doctor.install` / `installTool` en la API.
- Ventana: botón Instalar, estado por herramienta, error, doctor al recuperar el foco.

## Verification criteria

- **W70** When the window asks `atril:doctor:install(tool)` with a tool in W21's list, main shall run
  `osascript` with two `-e` scripts — `tell application "Terminal" to activate` and
  `tell application "Terminal" to do script "<that tool's install command>"`, with `"` and `\` escaped —
  and answer `{ ok: true }`; if the tool is not in the list it shall run nothing and answer `{ error }`;
  if `osascript` exits non-zero it shall answer `{ error }` with its first stderr line.
  Proof: src/main/doctor.test.ts install opens the terminal with the listed command only
- **W71** When the person presses «Instalar» on a tool in the doctor list, Atril shall ask main to
  install that tool by name and show «Instalando en Terminal…» on it, or the error main answered;
  when the Atril window regains focus after that, it shall run the doctor again and show the chip only
  for what is still missing.
  Proof: src/renderer/doctor.test.ts install runs in the terminal and rechecks on focus

## Approach

### Summary

Un handler IPC en main busca el comando por nombre en la lista del doctor y lo abre en Terminal.app con
`osascript`. La ventana añade el botón y, al recuperar el foco, vuelve a lanzar el doctor que ya existe.

### Technical context

TypeScript, Electron y React 19, con vitest. Toca:
- `src/main/doctor.ts`: `installTool`, que reutiliza `TOOLS`.
- `src/main/index.ts`: un handler.
- `src/preload/{api,index}.ts`.
- `src/renderer/components/DoctorChip.tsx`.
- `src/renderer/App.tsx`: volver a comprobar al recuperar el foco.
- `src/preload/i18n-en.ts`.
- Tests: `src/main/doctor.test.ts` y `src/renderer/doctor.test.ts`.
- El boceto: el botón en el pop del doctor.

### The approach

- **Main.**
  - `installTool(tool, run)` busca en `TOOLS` y escapa el comando con
    `c.replace(/\\/g, '\\\\').replace(/"/g, '\\"')`.
  - Ejecuta `run('osascript', ['-e', 'tell application "Terminal" to activate', '-e', `tell application "Terminal" to do script "${esc}"`])`.
  - El `Runner` se inyecta, así que el test no abre nada.
- **Ventana.**
  - `DoctorChip` recibe `onInstall(tool)` y guarda por herramienta un estado: `'running'` o el texto del error.
  - `App` instala un listener `window` `focus` que relanza `doctor()` mientras haya problemas.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Terminal dentro de Atril con xterm y un pty | Sin pty fuera de tmux, que puede ser lo que falta; `sudo` y los diálogos de macOS van mejor fuera. |
| La ventana manda el comando | Abriría la ejecución de cualquier texto desde el renderer. |
| Sondear el doctor cada 5 s | Más estado para lo que el foco ya resuelve cuando vuelves. |

### Risks

| Risk | Mitigation |
|---|---|
| macOS pide permiso de Automatización para controlar Terminal | El primer `osascript` dispara el diálogo del sistema. Si se deniega, sale non-zero y W70 muestra el error. |
| Un nombre forjado desde la ventana | W70 no ejecuta nada fuera de la lista; el test lo prueba con `tmux; rm -rf /`. |

### Validation and rollback

Dos tests nuevos, vistos en rojo primero. El de W71 dispara un evento `focus` y comprueba la segunda
llamada a `doctor`. Podría pasar por la razón equivocada si `doctor` se llamase por otro motivo; por eso
se cuentan las llamadas antes y después del foco. Rollback: un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [ ] main installs a listed tool in Terminal.app and refuses any other name · Closes: W70
- [ ] the Instalar button, its state and the recheck on focus; sketch button · waits on box 1 · Closes: W71
