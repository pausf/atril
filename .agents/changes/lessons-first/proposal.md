# lessons-first

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> haz 1 3 5 6

(6 = «Contexto compartido»: que cada agente nuevo arranque con las lecciones del repo, `.agents/lessons.md`. Idea sacada de las fábricas de software: el límite es la calidad del contexto, 11 nov.)

## Decision log

### Session 2026-11-11
- Q: (revisión en frío) ¿Y el comando que enseña «Empezar»? → A: mira el archivo en la carpeta del repo elegido (el worktree sale de ella); sin repo elegido, no lo lleva. El que se lanza mira la carpeta del trabajo (assumed).
- Q: (revisión en frío) ¿QA y el `argv` a medida? → A: el agente de QA no lo lleva; el `argv` a medida es solo de tests (assumed).
- Q: (revisión en frío) ¿Enlaces? → A: ni `.agents` ni `lessons.md` pueden ser enlaces (`lstat` de los dos) (assumed).
- Q: ¿Cómo llegan las lecciones al agente? → A: Atril añade al arrancar `--append-system-prompt` con una frase fija que le pide leer `.agents/lessons.md` antes de empezar; no copia el contenido (el agente lo lee del repo, siempre al día) (assumed).
- Q: ¿Siempre? → A: solo si `.agents/lessons.md` es un archivo normal dentro de la carpeta del trabajo (no un enlace); si no, nada cambia (assumed).

## Outcomes

- En un repo con lecciones, cada agente que abre Atril (nuevo, reabierto o de QA no) empieza sabiendo que existen y leyéndolas.

## Scope boundaries

**In:** `src/main/agent.ts` (`agentArgv({ lessons })`), `src/main/workspaces.ts` (abrir y reabrir), `src/main/jira/start.ts` (`proposeStart`). **Out:** el agente de QA; escribir lecciones; resumirlas.

## Constraints

- La frase es fija y sale de main (W41: nada de la persona como bandera).
- Un enlace simbólico no cuenta (no se le pide leer algo de fuera del repo).

## Prior decisions

- Atril recuerda a cada agente las lecciones del repo con una frase fija; el contenido lo lee el agente.

## Verification criteria

- **W169** `agentArgv({ lessons: true })` shall add `--append-system-prompt` with «Este repo guarda en .agents/lessons.md los errores que ya se pagaron aquí. Léelo antes de empezar y no los repitas.» before the prompt, and nothing without it.
  Proof: src/main/agent.test.ts lessons are pointed out only when the repo keeps them
- **W175** When a workspace's agent starts or is reopened, it shall get `lessons: true` exactly when, in the workspace's folder, `.agents` is a real directory and `.agents/lessons.md` a regular file (`lstat`, no links); the command «Empezar» shows applies the same rule to the chosen repo's folder; the QA agent never gets it.
  Proof: src/main/workspaces.test.ts a new or reopened work is told about lessons only with a real file
  Proof: src/main/jira/start.test.ts the shown command points at lessons only when the chosen repo keeps them

## Approach

### Summary

`agentArgv({ lessons: true })` añade la bandera con la frase; `openWorktree` y `reopenWorkspace` miran el archivo con `lstat` justo antes de lanzar.

### Technical context

`agent.ts`, `workspaces.ts`; tests en `agent.test.ts` (argv) y un caso en `workspaces.test.ts` si hace falta la carpeta real.

### The approach

`const lessons = (await lstat(join(path, '.agents', 'lessons.md')).catch(() => null))?.isFile() === true`.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Pegar el contenido en el prompt | se queda viejo y engorda el contexto; el agente puede leerlo |
| Ponerlo en el `CLAUDE.md` del repo | escribe en el repo de la persona |

### Risks

| Risk | Mitigation |
|---|---|
| Un `claude` antiguo sin la bandera | la bandera existe en la versión que comprueba el doctor; si fallara, el agente no arrancaría y W131 lo diría |

### Validation and rollback

Test rojo primero; la app real mirando `claude-calls.log` del claude falso. Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] la frase al arrancar, al reabrir y en «Empezar», solo con lecciones reales · Closes: W169, W175
