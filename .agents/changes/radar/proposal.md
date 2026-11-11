# radar

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> haz 1 3 5 6

(1 = «Radar de choques entre trabajos»: avisar cuando dos de tus trabajos tocan el mismo archivo, antes de que choquen en la MR. Idea sacada de las fábricas de software con colas de merge, 11 nov.)

## Decision log

### Session 2026-11-11
- Q: (revisión en frío) ¿Qué base? → A: la `baseCommit` del registro de cada trabajo, también en los que trabajan en tu copia (assumed).
- Q: (revisión en frío) ¿Qué trabajos entran? → A: todo registro que no sea de revisión, vivo o parado, como afectado y como «con quién» (assumed).
- Q: (revisión en frío) ¿Y pasado el tope de vigilantes? → A: el tope sube a 12 (F48 enmendado); más allá, el más antiguo se cierra y ese trabajo recalcula: riesgo aceptado. Radar y panel comparten el vigilante de cada carpeta (assumed).
- Q: ¿Qué cuenta como choque? → A: dos trabajos abiertos del mismo repo (ninguno de revisión) que cambian el mismo archivo respecto a su base, con commits o sin ellos (assumed).
- Q: ¿Dónde se ve? → A: en la fila de cada trabajo afectado, una línea gris «Choca con {rama} en {archivo}» (y «y N más»), con la lista entera al pasar el ratón; sin color nuevo: gris más un acento (assumed).
- Q: ¿Cuánto cuesta? → A: la lista de archivos de cada trabajo pasa por el vigilante de `quiet-panel`: sin cambios, cero procesos; el tope de vigilantes sube de 4 a 12 para que el radar y el panel no se expulsen (assumed).

- Q: (al construir) ¿Cómo se separan los «{rama}: {archivo}» del título? → A: uno por línea (`\n`) (assumed).
- Q: (al construir) ¿Quién pregunta cada 10 s? → A: la lista de trabajos de la barra lateral, mientras está montada (assumed).
- Q: (al construir) El test de tope con 13 vigilantes tarda ~50 s en este Mac (cada proceso es caro) → A: su límite pasa de 60 s a 120 s; los del radar, a 90 s (assumed).

## Outcomes

- Con tres trabajos en el mismo repo, si dos tocan `src/cart.ts`, sus dos filas lo dicen antes de abrir ninguna MR.

## Scope boundaries

**In:** `src/main/radar.ts` (nuevo), IPC `atril:radar:get`, `src/main/flow/quiet.ts` (tope a 12), `src/renderer/components/WorkspaceList.tsx`, un `useRadar` en la ventana, i18n. **Out:** resolver el choque; avisar entre repos distintos; cola de merge.

## Constraints

- En reposo, el radar no lanza procesos (usa `quietly`).
- La ventana recibe ramas y rutas relativas al repo, nada más.

## Prior decisions

- Atril avisa de choques entre trabajos del mismo repo por archivo; no decide nada ni toca ramas.

## Verification criteria

- **W166** Main shall answer, for every workspace record that is not a review, the other non-review records of the same repo that change at least one of the same files against their own `baseCommit` (committed or not), as `{ id, branch, files }` with repo-relative files sorted; records of different repos never collide, and a record sharing no file gets an empty list.
  Proof: src/main/radar.test.ts two works on one file collide and nothing else does
- **W167** While nothing counted (F46) changed in any workspace, asking the radar again within 30 s of the last computation shall run no process; after that, each workspace computes again at most once per 30 s.
  Proof: src/main/radar.test.ts the radar costs nothing while nothing changes
- **W168** A workspace row with collisions shall show, under its repo line and in the secondary grey, «Choca con {branch} en {file}» for its first collision's first file, followed by « y {n} más» where n is the total of files across all its collisions minus one, with every «{branch}: {file}» as the line's title; a row without collisions shows no such line. The window asks the radar every 10 s.
  Proof: src/renderer/radar.test.ts a colliding row says with whom and where
  Proof: src/renderer/radar.test.ts a row without collisions shows nothing new

## Approach

### Summary

`radar(run)` lee los registros, agrupa por repo, pide a cada trabajo su lista de archivos con `quietly(path, 'radar:' + base, …)` sobre `listChanges` y cruza. La ventana lo pide cada 10 s.

### Technical context

`src/main/{radar,index}.ts`, `src/main/flow/quiet.ts`, `src/preload/{api,index}.ts`, `src/renderer/components/WorkspaceList.tsx`, `src/renderer/radar.ts`, i18n. Tests con repos git reales y un Runner espía.

### The approach

`RadarHit = { id: string; branch: string; files: string[] }`; `atril:radar:get` → `Record<id, RadarHit[]>`. Lectura con `readRecordsOrNone`. `MAX_WATCHERS = 12`; radar y panel usan el mismo vigilante por carpeta (`quietly` va por ruta).

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Comparar diffs línea a línea | más caro; el archivo ya avisa a tiempo |
| Avisar solo al abrir la MR | llega tarde: el choque ya está hecho |

### Risks

| Risk | Mitigation |
|---|---|
| Archivos que siempre cambian (lockfiles) avisan siempre | se muestran igual: son choques reales en la MR |

### Validation and rollback

Tests rojos primero; la app real con dos trabajos que tocan el mismo archivo. Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] el radar en main, sin procesos en reposo, y el tope de vigilantes · Closes: W166, W167, F48 (spec-flow-status.md)
- [x] la línea en la fila · waits on box 1 · Closes: W168
