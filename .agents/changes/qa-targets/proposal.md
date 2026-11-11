# qa-targets

Targets: workspaces
Durable decisions: the five in Prior decisions below

## The ask, verbatim

> de iOS utiliza MCP oficial, y el de Android… emulador que tenga instalado esa persona
> ¿cómo sabrá que una aplicación la tiene que abrir en Chrome y otras en emulador…?
> Flujos importantes… si no tiene un emulador… mensajes de error…
> (540 #15) Simlock, un móvil para cada agente: cada uno tiene el suyo hasta que lo libera. — «me parece bien, ejecutas las ideas»

## Decision log

### Session 2026-11-11
- Q: ¿Motor por plataforma? → A: iOS con el MCP oficial de Apple `xcrun mcpbridge` (Xcode 26.3+), simctl o mobile-mcp si hace falta tocar; Android con el emulador del SDK de la persona por `emulator`/`adb`, vía mobile-mcp; web Chrome con Playwright y Safari con WebKit.
- Q: ¿Detección? → A: dice por qué; varias plataformas como pestañas recordadas por repo; monorepos a 2 niveles; «Elegir a mano» guardado por repo y opcional `.atril/qa.json`; «No sé cómo abrir este proyecto» si no hay nada.
- Q: ¿Errores? → A: ninguno suelto: qué pasó, qué no puedes hacer y un botón que lo arregla; lo técnico en «Ver detalle» (`bocetos/errores.html`).
- Q: ¿Varias QA a la vez? → A: un simulador o emulador por trabajo, reservado hasta que se libera, como Simlock.
- Q: ¿Safari con qué MCP? → A: Playwright MCP con `--browser webkit`, el motor de Safari; no hay un MCP oficial de Safari que se pueda instalar sin firmar nada (assumed: si aparece uno oficial, cambia solo `mcpConfig`).
- Q: ¿Un proyecto RN/Expo/Flutter cuántas pestañas da? → A: Android e iOS, una por plataforma que tenga carpeta (`android/`, `ios/`) o, en Expo, ambas (assumed).
- Q: ¿Qué emulador reserva? → A: el primero de la lista de la persona que no tenga otro trabajo con su QA vivo; nunca crea uno sin que lo pida (assumed).

## Outcomes

- La tarjeta de QA de un trabajo enseña una pestaña por plataforma que se puede probar (Chrome, Safari, Android, iOS), con el porqué en una línea («Hay un `package.json` con el script `dev`»). La pestaña elegida se recuerda por repo.
- «Probar en vivo» lanza el QA de la pestaña elegida con su motor y, en móvil, con un emulador o simulador reservado para ese trabajo; un segundo trabajo coge otro.
- Cuando algo falta, la tarjeta dice qué pasó, qué no puedes hacer y trae el botón que lo arregla.
- Sin nada detectado: «No sé cómo abrir este proyecto» con «Elegir a mano».

## Scope boundaries

Dentro: detección por carpeta raíz y subcarpetas a 2 niveles; `.atril/qa.json`; «Elegir a mano»; pestañas; motor por plataforma; reserva de dispositivo; errores con arreglo en el lanzamiento de QA.

Fuera: crear emuladores por nuestra cuenta (solo se abre la Terminal con el comando, la persona lo lanza); dispositivos físicos; descargar Xcode; el resto de errores de Atril (otro cambio); varios QA del mismo trabajo a la vez (sigue siendo uno, W84).

Nunca fuera: validar `.atril/qa.json` (lo escribe el repo, no Atril); la ventana nunca manda un comando, solo el nombre de un arreglo; escritura atómica del archivo de elecciones.

## Constraints

- Las plataformas son exactamente `chrome | safari | android | ios`. W83 sigue clasificando una carpeta; esto la llama por cada carpeta.
- Los textos por `t()` con su entrada en `i18n-en.ts`; colores solo tokens.
- `QaResult` de `retest`/`stop` no cambia; el de `launch` añade `problem`.
- Tests con `ATRIL_HOME` temporal y dobles del `Runner`; nunca un emulador real en los tests.

## Prior decisions

- (11 nov, Pau) Motores: iOS `xcrun mcpbridge` + mobile-mcp para tocar; Android mobile-mcp con el emulador de la persona; Chrome con Playwright; Safari con Playwright WebKit (assumed).
- (11 nov, Pau) Un dispositivo por trabajo, reservado mientras su QA vive; la reserva caduca sola cuando su pane ya no está.
- (11 nov, Pau) Errores: qué pasó, qué no puedes hacer, un botón con el arreglo; detalle plegado.
- (11 nov) Los arreglos son nombres fijos que main traduce en una acción; la ventana nunca manda un comando ni una URL (como W21).
- (11 nov) `.atril/qa.json` manda sobre lo detectado; «Elegir a mano» se suma como una pestaña más.

## Task breakdown

- Encontrar los objetivos de un repo (raíz y 2 niveles), con su porqué, y leer `.atril/qa.json`.
- Guardar por repo la pestaña elegida y los objetivos elegidos a mano.
- Motor por plataforma y reserva de dispositivo al lanzar.
- Errores con arreglo en el lanzamiento y sus acciones.
- La tarjeta: pestañas, «Elegir a mano», el aviso con su arreglo y «No sé cómo abrir este proyecto».

## Verification criteria

- **W120** Main shall list a workspace's QA targets by running W83 on its folder and on every subfolder up to two levels deep (skipping `node_modules`, `Pods`, `build`, `dist`, `vendor` and names starting with `.`, at most 200 folders read), never descending into a folder that classified (its `android/` and `ios/` belong to it), turning each classified folder into targets: web → `chrome` and `safari`; android → `android`; ios → `ios`; expo → `android` and `ios`; react-native and flutter → `android` if it has `android/`, `ios` if it has `ios/`; each with its folder relative to the repo (`''` for the root), W83's command, and a one-line reason naming the file that decided it (e.g. «Hay un package.json con el script dev»); root first, then by folder path; two targets with the same platform and folder count once.
  Proof: src/main/qa-targets.test.ts targets come from the root and two levels down with their reason
- **W121** Where the repo holds `.atril/qa.json` with `{"targets":[{"platform","dir","command"}]}`, main shall use its valid entries instead of the detected ones (platform one of the four, `dir` relative with no `..` segment and an existing folder, `command` a string of at most 200 characters), each with the reason «Lo dice .atril/qa.json»; if the file exists and no entry is valid, then main shall use the detected targets and add the line «.atril/qa.json no se entiende: uso lo que detecto».
  Proof: src/main/qa-targets.test.ts qa.json replaces detection only with valid entries
- **W122** When the person saves «Elegir a mano» (platform, folder, command), main shall add that target to the repo's entry in `$ATRIL_HOME/qa-targets.json` (temporary file and rename) with the reason «Lo elegiste a mano», listed after the detected ones or the `.atril/qa.json` ones, and «Quitar» on it shall remove it; a target with an unknown platform, a `dir` with `..` or a missing folder, or an empty command shall be refused with a sentence saying which.
  Proof: src/main/qa-targets.test.ts manual targets are kept per repo and validated
- **W123** While a workspace has a target, its QA card shall show the chosen target's reason under the target, W121's line when there is one, and «Quitar» beside the reason of a manual target; while it has more than one, it shall show one tab per target («Chrome», «Safari», «Android», «iOS», with the folder after a «·» when it is not the root); pressing a tab shall save it as the repo's chosen target in `qa-targets.json`, a later card of that repo shall open on it, and «Probar en vivo» shall launch that target.
  Proof: src/renderer/qa-screen.test.ts targets show as tabs remembered per repo
- **W84** (amended) When the person presses «Probar en vivo» on a workspace's target, main shall write `$ATRIL_HOME/qa/<id>.mcp.json` with, for chrome, Playwright MCP `--browser chrome`; for safari, Playwright MCP `--browser webkit` (both `--isolated --output-dir $ATRIL_HOME/qa/<id>/`); for android, mobile-mcp; for ios, `xcrun mcpbridge` and mobile-mcp; split the workspace's pane and start `claude` there in the target's folder with `--mcp-config` that file, `--strict-mcp-config` and a prompt naming the platform, the command, the reserved device (W124) on mobile, the change's proposal path and the screenshot folder; the QA pane's tmux id is kept in `$ATRIL_HOME/qa/<id>.pane`; a second press while that pane lives shall be refused; «Detener QA» shall kill only that pane, free its device and keep the MCP file and the screenshots. One test holds a case per clause.
  Proof: src/main/qa.test.ts live qa starts one scoped agent with its tools
- **W124** When QA launches on android or ios, main shall reserve the first of the person's devices (android: `emulator -list-avds`; ios: available iPhone simulators from `xcrun simctl list devices available -j`) not held in `$ATRIL_HOME/qa/devices.json` by another workspace whose QA pane lives, write `{device: workspaceId}` there, and name that device in the prompt (`emulator -avd <name>` or `xcrun simctl boot <udid>`); a hold whose pane no longer lives counts as free; when two workspaces launch at once with one free device, one shall get it and the other shall answer W125's «every device held».
  Proof: src/main/qa.test.ts each live qa gets its own device
- **W125** If QA cannot launch, then main shall answer the first problem in this order, with what happened, what the person cannot do, one fix and the technical detail (every missing tool named there), and start nothing: no target → «Elegir a mano» (handled by the window alone); no `node` → «Instalar Node» (Terminal with `brew install node`); android with no `adb` or `emulator` → «Instalar Android Studio» (`https://developer.android.com/studio`); android with no AVD → «Crear un Pixel 8» (Terminal with `sdkmanager "system-images;android-35;google_apis;arm64-v8a" && avdmanager create avd -n Pixel_8 -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_8`); ios with no `xcrun` or no `mcpbridge` (`xcrun --find mcpbridge` fails) → «Actualizar Xcode» (`macappstore://apps.apple.com/app/id497799835`); ios with no available iPhone simulator → «Abrir Xcode» (`open -a Xcode`); every device held → «Ver el otro QA» (opens the workspace holding the first device of the list). A missing Chrome or Playwright WebKit is not a launch problem: the agent meets it. The window shall send only the fix's name and the workspace id, and main shall refuse a name it does not know (`pick-manual` included). One test holds a case per problem.
  Proof: src/main/qa.test.ts every launch problem comes with its fix
- **W126** When launch answers a problem, the QA card shall show its what and cannot in words, a button with the fix and «Ver detalle» folded with the technical detail, with no raw error elsewhere; a workspace with no target shall read «No sé cómo abrir este proyecto», the line «Busqué package.json con dev, start o preview, app.json de Expo, pubspec.yaml, settings.gradle, .xcodeproj o Package.swift, en la raíz y dos niveles», and «Elegir a mano».
  Proof: src/renderer/qa-screen.test.ts a launch problem shows its fix and detail folded
- **W117** (amended) When the person presses «Marcar como bug» on a failed criterion, Atril shall open a form prefilled with a
  title «QA {branch}: {note}», the steps, the environment (target platform and folder, branch, head commit) and the criterion, all editable.
  Proof: src/renderer/qa-screen.test.ts a failed criterion becomes a bug
- **W113** (amended) Atril shall show a «QA» screen in the rail between Libretto and Avisos and in ⌘K, with a card per live workspace naming its chosen target («Chrome», «Safari», «Android», «iOS») or «sin detectar», the picked one pressed; for the picked workspace, its current change's criteria (each `- **ID**` line under `## Verification criteria`, id and text), each with «Pasa», «Falla» or «Sin probar» from the report (last entry per id; absent → «Sin probar») and a summary «{p} pasan · {f} fallan · {u} sin probar»; «Este trabajo no tiene criterios que probar» when there are none; «Todas las capturas», the 12 newest of its QA folder, each at most 2 MB, as data URLs; W123's tabs and W126's lines; and «Probar en vivo» or «Detener QA» as W84. One test holds a case per clause.
  Proof: src/renderer/qa-screen.test.ts the QA screen reports each criterion

## Approach

### Summary

Un módulo nuevo `src/main/qa-targets.ts` encuentra los objetivos (W120–W122) y guarda las elecciones; `qa.ts` lanza un objetivo concreto con su motor, reserva el dispositivo (W124) y devuelve problemas con su arreglo (W125); `qa-fix.ts` traduce el nombre de un arreglo en una acción. La tarjeta de `QaScreen.tsx` pinta pestañas, el aviso y el formulario «Elegir a mano».

### Technical context

TypeScript, Electron 45, React 19, vitest. Archivos: `src/main/qa.ts`, `src/main/qa-targets.ts` (nuevo), `src/main/qa-fix.ts` (nuevo), `src/main/index.ts` (IPC `atril:qa:targets|choose|manual|unmanual|fix`, `launch(id, key)`), `src/preload/{api,index,i18n-en}.ts`, `src/renderer/qa/QaScreen.tsx` y un `QaPick.tsx` para el formulario, los tests nombrados. `qaStatus`/`qaReport` cambian `kind` por `target` (el elegido, `QaTarget | null`) y añaden `targets` y `note` (la línea de W121). Unos 9 archivos.

### The approach

- `QaTarget = { key, platform, dir, command, why, source: 'detected'|'file'|'manual' }`; `key = platform + ':' + dir`. `listTargets(repoPath)` hace BFS con `readdir` (withFileTypes), corta a 2 niveles y 200 carpetas, llama a `detectQa` por carpeta y expande según W120. `.atril/qa.json` se valida con `lstat` (archivo normal, ≤64 KB) y entrada a entrada.
- `qa-targets.json`: `{ [repoId]: { chosen?: key, manual: QaTarget[] } }`, escrito con temporal + rename; la clave es el `repoId` del registro del trabajo, así todos los trabajos de un repo comparten elección. Los `dir` son relativos a la carpeta del trabajo (su worktree).
- `launchQa(id, run, request?, key?)`: elige el objetivo (`key` o el elegido, o el primero); comprueba herramientas; para móvil lista dispositivos con el `Runner`, lee `devices.json`, salta los retenidos por otro trabajo con pane vivo (`qaPane`), escribe la reserva; luego MCP, prompt y `splitCommand` con el `cwd` del objetivo. Los fallos devuelven `{ error: what, problem: { what, cant, fix, detail } }`. `stopQa` borra la reserva del trabajo.
- `runFix(id, fix, run)`: `switch` cerrado sobre los nombres de W125; abre Terminal como `doctor.installTool` (osascript con el comando fijo) o `shell.openExternal` con URLs fijas; `open-workspace` responde el id del otro trabajo para que la ventana lo abra; `pick-manual` lo resuelve la ventana sin ir a main.
- Ventana: pestañas sobre la tarjeta (botones con `aria-pressed`), la línea del porqué, el aviso con botón y `<details>` «Ver detalle», el formulario en línea con un `<select>` de plataforma, la carpeta y el comando.

### Alternatives it beat

| Considered | Why it lost |
|---|---|
| Plataforma `web` con un selector de navegador aparte | Dos controles para una sola elección; las pestañas ya son la elección |
| Reservar con un lock de archivo por dispositivo | La reserva ya caduca sola mirando si el pane vive; un lock huérfano no |
| Crear el emulador desde Atril | Descarga gigas sin que la persona lo vea; Terminal con el comando lo enseña y lo deja en sus manos |

### Risks

| Risk | Mitigation |
|---|---|
| Un monorepo enorme hace lenta la tarjeta | Tope de 200 carpetas y 2 niveles, probado en W120 |
| Dos lanzamientos a la vez cogen el mismo emulador | El `starting` de W84 se amplía a un lock global de reserva (una promesa en cadena), probado en W124 |
| `xcrun mcpbridge` no existe en el Xcode de la persona | W125 lo detecta con `xcrun --find mcpbridge` y ofrece actualizar |
| `.atril/qa.json` hostil (ruta fuera del repo, enlace) | `..` rechazado, `lstat`, tope de tamaño y de comando |

### Validation and rollback

Tests nuevos en `qa-targets.test.ts`; casos nuevos en `qa.test.ts` y `qa-screen.test.ts`. El que puede pasar por la razón equivocada es la reserva: el test debe tener un pane vivo de otro trabajo (doble de `hasPane`) y fallar si se le da el mismo dispositivo. Prueba en la app real con un repo de ejemplo con `apps/web` y `apps/mobile`. Rollback: un revert.

### Complexity deliberately kept

El lock de reserva en cadena: sin él dos «Probar en vivo» seguidos en dos trabajos se quedan el mismo emulador, que es justo lo que pidió Pau evitar.

## Checklist

- [ ] qa-targets.ts: objetivos de raíz y 2 niveles con su porqué, `.atril/qa.json`, elegidos a mano y pestaña elegida por repo, con IPC · Closes: W120, W121, W122
- [ ] lanzar un objetivo: motor por plataforma, carpeta del objetivo, reserva de dispositivo y liberación al detener · waits on box 1 · Closes: W84, W124
- [ ] problemas con su arreglo al lanzar y `runFix` con nombres cerrados · waits on box 2 · Closes: W125
- [ ] tarjeta: pestañas recordadas, aviso con arreglo y detalle, «No sé cómo abrir este proyecto», «Elegir a mano» · waits on boxes 1–3 · Closes: W123, W126, W113, W117
