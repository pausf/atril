# quiet-panel

Tracker: none
Targets: flow-status
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> Sigue automejorándote y todo eso.

Segunda parte del hallazgo 9 (`fast-panel` lo bajó de ~5 s a ~1,6 s): cada vuelta de las casillas (cada 3 s por trabajo elegido) sigue lanzando 7 procesos aunque nada haya cambiado, y en el Mac de Pau cada uno cuesta 125–800 ms; esos procesos en reposo encarecen los que pide la persona.

## Decision log

### Session 2026-11-11
- Q: (revisión en frío) ¿Qué avisos cuentan? → A: una sola regla para todo trabajo: cuenta cualquier ruta del trabajo salvo las que contienen `/node_modules/` o están dentro de una carpeta git; dentro de una carpeta git solo cuentan `HEAD`, `index`, `packed-refs`, `refs/**` y `logs/**`. Para un worktree se vigilan su carpeta, su carpeta git (`worktrees/<nombre>`) y la común; en tu copia, la carpeta y su `.git` ya dentro (assumed).
- Q: (revisión en frío) ¿Y si el propio `git diff` reescribe `index`? → A: la versión se lee antes de calcular y se guarda con la respuesta: una reescritura propia cuesta como mucho un cálculo más, después git deja `index` quieto (assumed).
- Q: (revisión en frío) ¿Cuántos vigilantes? → A: se abren al pedir casillas de un trabajo, como mucho 4 a la vez; el quinto cierra el que lleva más sin usarse. Se cierran al cerrar u olvidar el trabajo (assumed).
- Q: (revisión en frío) ¿La salida de un build (`dist/`, `.next/`)? → A: cuenta como cambio; riesgo aceptado: en ese rato el panel calcula como hoy (assumed).
- Q: ¿Cómo se sabe que nada cambió sin lanzar git? → A: un vigilante de archivos (FSEvents, `fs.watch` recursivo) sobre la carpeta del trabajo y sobre la carpeta git de su rama (`HEAD`, `refs`, `logs`); cualquier aviso marca el trabajo como cambiado (assumed).
- Q: ¿Y si el vigilante se pierde un aviso? → A: como mucho 30 s después se vuelve a calcular igualmente (assumed).

## Outcomes

- Con un trabajo elegido y nada cambiando, el panel no lanza ningún proceso; al tocar un archivo o hacer un commit, la siguiente vuelta lo enseña.

## Scope boundaries

**In:** `src/main/flow/boxes.ts` (la respuesta guardada), un vigilante por trabajo en `src/main/flow/` (al lado de `watch.ts`), su cierre con `flow.forget`. **Out:** el estado de los agentes (W163 ya lo dejó en una llamada); MR, Jira, actividad.

## Constraints

- Nada se enseña más de 30 s viejo aunque el vigilante falle; con el vigilante bien, nada se enseña viejo.
- `.git/objects`, `node_modules` y similares no despiertan nada que no hiciera falta: los avisos se filtran por ruta.

## Prior decisions

- En el Mac de la persona cada proceso cuesta caro: el panel solo pregunta a git cuando un archivo o una ref cambiaron, o han pasado 30 s.

## Verification criteria

- **F46** While no counted path (see the Decision log's rule) of the workspace has changed since the version read at the start of the last `boxRanges` answer for the same folder, base and change, and that answer is under 30 s old by the module's clock, `boxRanges` shall return that answer running no process.
  Proof: src/main/flow/quiet.test.ts nothing changed costs no process
  Proof: src/main/flow/quiet.test.ts an answer older than thirty seconds is computed again
- **F47** When a file of the workspace is written or a commit is made, a `boxRanges` asked one second later or more shall compute again and show it.
  Proof: src/main/flow/quiet.test.ts an edit or a commit is seen on the next read
- **F48** At most four workspaces shall have a watcher open; opening a fifth closes the least recently asked; closing or forgetting a workspace shall close its watcher and drop its saved answer.
  Proof: src/main/flow/quiet.test.ts watchers are bounded and close with their work

## Approach

### Summary

`quiet(path)` abre, la primera vez y antes de calcular, un `fs.watch` recursivo sobre la carpeta y otro sobre su carpeta git (`git rev-parse --git-dir` una vez, guardado), y lleva un número de versión que sube con cada aviso que pasa el filtro. `boxRanges` guarda `{ version, at, answer }` y devuelve la misma si la versión no ha cambiado y no han pasado 30 s.

### Technical context

`src/main/flow/boxes.ts`, un archivo nuevo `src/main/flow/quiet.ts`, `src/main/index.ts` (cerrar con `flow.forget`/`forgetPlans`). Tests con repos git reales y temporizadores reales (los avisos de FSEvents llegan en tiempo real).

### The approach

- La carpeta git de un worktree es `<repo>/.git/worktrees/<nombre>`; las refs de la rama viven en la carpeta común (`git rev-parse --git-common-dir`): se vigilan las dos.
- Filtro: la regla del Decision log, una función pura con su propio caso en el test.
- `quiet.ts` exporta `now` inyectable (para el tope de 30 s) y `openWatchers()` (para F48); `dropPlans` en `index.ts`, que ya busca la carpeta por id, llama también a `closeQuiet(path)`.
- F47 se prueba escribiendo y esperando a que la versión suba (sondeo de hasta 2 s), nunca leyendo al instante.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Comparar `git status --porcelain` cada vuelta | es un proceso por vuelta: justo lo que se quiere quitar |
| Sondear menos (cada 10 s) | lo nuevo tardaría más en verse; el vigilante lo ve al momento |

### Risks

| Risk | Mitigation |
|---|---|
| FSEvents pierde un aviso | tope de 30 s |
| Un repo enorme con muchos avisos | los avisos solo suben un número; el cálculo sigue yendo cada 3 s como mucho |

### Validation and rollback

Tests rojos primero; la app real con el arnés `perf-*` contando procesos en reposo. Un revert.

### Complexity deliberately kept

El vigilante por trabajo: sin él, cada vuelta cuesta 7 procesos caros.

## Checklist

- [x] el vigilante y la respuesta guardada · Closes: F46, F47
- [x] vigilantes acotados y cerrados con el trabajo · Closes: F48
