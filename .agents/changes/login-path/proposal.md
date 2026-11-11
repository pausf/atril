# login-path

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> me pone que falta claude pero tengo claude instalado...

## Decision log

### Session 2026-11-11
- Q: ¿Por qué falta `claude` si está instalado? → A: (comprobado) está en `~/.local/bin`; una app abierta desde el Dock o el Finder hereda `/usr/bin:/bin:/usr/sbin:/sbin` y Atril nunca lo amplía.
- Q: ¿De dónde sale el PATH bueno? → A: del shell de login e interactivo de la persona (`$SHELL -ilc`), que lee `.zprofile` y `.zshrc`, con 3 s de tope; detrás, `~/.local/bin`, `/opt/homebrew/bin` y `/usr/local/bin` por si el shell no contesta (assumed).

## Outcomes

- Abierta desde el Dock, Atril encuentra `claude`, `tmux`, `git` y `jira` donde los encuentra tu terminal; el doctor deja de decir que faltan.

## Scope boundaries

**In:** `src/main/login-path.ts` (nuevo), su llamada al arrancar en `src/main/index.ts`. **Out:** leer otras variables del shell (W51 limita el entorno de los comandos a PATH, HOME, USER, LANG, SSH_AUTH_SOCK y TMPDIR; aquí solo cambia PATH).

## Constraints

- Ningún texto del shell sale de main ni se registra; solo se queda el valor de PATH.
- El arranque no espera más de 3 s por el shell.

## Prior decisions

- Una app de Mac abierta desde el Finder no tiene el PATH del shell (ya decidido para el hook, que usa el Electron de Atril como Node): Atril lo pide al shell de login al arrancar, una vez, antes de comprobar herramientas.

## Task breakdown

- Leer el PATH del shell con marcadores y tope de tiempo, unirlo sin repetir; aplicarlo antes de la primera ventana.

## Verification criteria

- **W128** When Atril starts, main shall set its PATH, before the doctor or any agent runs, to the PATH printed by the person's `$SHELL -ilc` between two markers, then `~/.local/bin`, `/opt/homebrew/bin`, `/usr/local/bin` and the PATH it was launched with, each folder once, in that order; if the shell fails, prints no markers or has not answered in 3 s, then the same list without the shell's part.
  Proof: src/main/login-path.test.ts the shell's path comes first and nothing repeats
  Proof: src/main/login-path.test.ts a silent or slow shell still adds the usual folders

## Approach

### Summary

Una función `loginPath(run, env)` lanza el shell con `printf` entre marcadores, recorta, une y quita repetidos. `index.ts` la llama al principio de `whenReady` y asigna `process.env.PATH`; todos los `spawn` y tmux heredan.

### Technical context

TypeScript, vitest con un `Runner` falso. Dos archivos de código, uno de test.

### The approach

`run(shell, ['-ilc', 'printf "__ATRIL_PATH__%s__ATRIL_PATH__" "$PATH"'], { timeoutMs: 3000 })`; la regex saca lo de entre marcadores (los `.zshrc` que imprimen algo no estorban).

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Solo carpetas fijas | quien instala con asdf, nvm o en otra carpeta se queda fuera |
| El paquete `fix-path`/`shell-env` | una dependencia para diez líneas |

### Risks

| Risk | Mitigation |
|---|---|
| Un `.zshrc` lento retrasa el arranque | tope de 3 s, y las carpetas fijas cubren lo habitual |

### Validation and rollback

Dos tests con un shell falso, rojos primero; la app real lanzada con `PATH=/usr/bin:/bin` como lo haría el Dock. Un revert.

### Complexity deliberately kept

Los marcadores: un `.zshrc` que escribe en la salida estropearía un `echo $PATH` a secas.

## Checklist

- [x] el PATH del shell, unido y aplicado al arrancar · Closes: W128
