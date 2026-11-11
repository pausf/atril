# term-attach

Tracker: none
Targets: workspaces
Durable decisions: none

## The ask, verbatim

> Abre un agente nuevo. Y que ese agente nuevo compruebe la app y mire y vaya apuntando fallos, cosas de diseño que ve mal, etcétera, etcétera, y tú lo vas solventando.

Hallazgo 7 de `bocetos/hallazgos.md`: si la terminal no se puede enganchar (`atril:term:attach` → «posix_spawnp failed»), la caja negra se queda vacía con un cursor; el fallo solo sale en la consola como error sin capturar.

## Decision log

### Session 2026-11-11
- Q: (revisión en frío) ¿Qué contesta `attach` cuando no hay error? → A: `{ ok: true }` al enganchar y `{ ok: false }` para un trabajo desconocido o sin sesión (la vista de parado ya lo explica); nunca `undefined` (assumed).
- Q: (revisión en frío) ¿Y si llega un error tras cambiar de trabajo? → A: se descarta: el efecto guarda el id con el que llamó y solo pinta si sigue montado con ese id (assumed).
- Q: (revisión en frío) ¿Hay doble de xterm? → A: no: el test simula `@xterm/xterm` y `@xterm/addon-fit` con `vi.mock` (assumed).
- Q: ¿Qué arreglo ofrece? → A: «Volver a intentar», que engancha otra vez; el agente sigue en tmux y la frase lo dice (assumed).
- Q: ¿El mensaje de node-pty va al detalle? → A: sí: es un texto de node-pty sobre el proceso (`posix_spawnp failed`), sin datos de la persona (assumed).

## Outcomes

- Si la terminal no engancha, el centro lo dice, dice que el agente sigue trabajando y trae «Volver a intentar»; nada queda sin capturar.

## Scope boundaries

**In:** `src/main/pty.ts` (`attach` devuelve el resultado), `src/main/index.ts` (`atril:term:attach`), `src/preload/{api,index}.ts`, `src/renderer/components/Terminal.tsx`, i18n. **Out:** abrir la sesión en Terminal.app; reparar node-pty.

## Constraints

- Un fallo deja el mapa de clientes como estaba: nada enganchado a medias.

## Prior decisions

- Ninguna nueva.

## Verification criteria

- **W160** When `atril:term:attach` is asked, main shall answer `{ ok: true }` once the tmux client started, `{ ok: false }` for an unknown or not-alive workspace, and, if starting the client throws, `{ error: «No he podido abrir la terminal de {branch}.», detail }` with the thrown message as `detail`, keeping no client for that workspace; it never rejects.
  Proof: src/main/pty.test.ts a client that cannot start answers an error and keeps nothing
- **W161** When the terminal gets that error for the workspace it is showing, it shall show over the empty terminal a problem titled with the `error` field, «Tu agente sigue en tmux: solo falla esta vista.» under it and the detail folded; an answer for a workspace no longer shown is dropped.
  Proof: src/renderer/terminal.test.ts a terminal that cannot attach says so
- **W162** «Volver a intentar» shall ask to attach again with the terminal's current size; on `{ ok: true }` the problem goes, and on another error it is replaced by the new one.
  Proof: src/renderer/terminal.test.ts retrying hides the problem or shows the new one

## Approach

### Summary

`attach` envuelve `pty.spawn` en `try` y devuelve `{ ok } | { error }`; el manejador IPC busca la rama y monta la frase. `Terminal.tsx` guarda el error y pinta `Problem` encima del `xterm-host`.

### Technical context

Dos archivos de main, dos de preload, uno de la ventana, i18n. Tests con `node-pty` simulado (como `pty.test.ts`) y jsdom con `@xterm/xterm` y `@xterm/addon-fit` simulados por `vi.mock`. `TermApi.attach` en `src/preload/api.ts` pasa a devolver `Promise<{ ok: boolean } | { error: string; detail: string }>`.

### The approach

`attach(...)` → `try { spawn } catch (e) { return { error: String((e as Error).message) } }`. IPC: `{ error: t('No he podido abrir la terminal de {branch}.', …), detail }`. `Terminal`: `useState<{ error, detail } | null>`; «Volver a intentar» vuelve a llamar a `attach` con `cols`/`rows` actuales.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Abrir `tmux attach` en Terminal.app | otra ventana para algo que suele arreglarse reintentando; queda como idea |

### Risks

| Risk | Mitigation |
|---|---|
| Reintentar en bucle si siempre falla | solo al pulsar |

### Validation and rollback

Tests rojos primero; la app real con un `tmux` falso que no arranca el cliente. Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] main contesta el fallo sin rechazar · Closes: W160
- [x] la terminal lo pinta y reintenta · waits on box 1 · Closes: W161, W162
