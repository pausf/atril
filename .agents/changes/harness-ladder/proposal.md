# harness-ladder

Tracker: none
Targets: workspaces
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> Escala de Corrección: Hacer el error imposible por arquitectura o diseño; bloquearlo mediante el sistema de tipos o reglas de Linter deterministas; atraparlo mediante una prueba automatizada; reglas escritas en texto (`.md`) como último recurso. […] prohibir importaciones cruzadas entre el hilo principal y el hilo de renderizado.
> «hay que hacer un gran harness y una buena aplicación» (Pau, 19 nov 2026)

## Decision log

### Session 2026-11-19
- Q: ¿Qué lecciones suben primero? → A: las que se repiten y caben en una regla que hoy pasa o pasa con pocos arreglos: frontera main↔renderer, mocks de `window.atril` a mano, `homedir()` fuera de su sitio y commits en rojo (assumed; informe en `report.md` de la cola).
- Q: ¿Las reglas valen también en tests? → A: la frontera no (siete tests la cruzan para comparar constantes; moverlas no evita ningún fallo real); la de mocks solo en tests (assumed).
- Q: ¿El hook de commit corre la suite entera? → A: no, typecheck y lint: la suite tarda más de 10 min bajo carga; la suite sigue en la puerta (assumed). Si es incorrecto: el hook llama a `gate.sh`.
- Q: (spec-reviewer) ¿Qué cuenta como importar? → A: declaraciones `import`/`export … from`, de tipos incluidas; `import()` dinámico y `vi.mock` no (assumed: `no-restricted-imports` no los ve y hoy nadie los usa así). Test es un archivo `*.test.ts(x)`; `test-helpers.ts` no lo es. `src/preload/**` queda fuera de la regla.
- Q: (spec-reviewer) ¿Qué cuenta como asignar `window.atril`? → A: cualquier asignación a una propiedad llamada `atril` (`window.atril =`, `(window as X).atril =`, `globalThis.atril =`); `vi.stubGlobal`, `Object.assign` y `defineProperty` quedan fuera (assumed: nadie los usa para `atril` hoy).
- Q: (spec-reviewer) ¿Qué cuenta como leer HOME? → A: `process.env.HOME` y `process.env['HOME']`; `env['HOME']` sobre un parámetro (`login-path.ts`) y la lista de variables permitidas de `forge/create.ts` no, porque no buscan la casa del usuario (assumed).
- Q: (spec-reviewer) ¿Cómo migran los tests sin cambiar lo que prueban? → A: `mockApi` acepta un tercer argumento `over`, un parcial profundo de `AtrilApi` que se mezcla sobre el mock completo; cada test pasa sus stubs de hoy tal cual, promesas que no resuelven incluidas, y sus `expect` no se tocan (assumed).
- Q: (spec-reviewer) `lessons.md` solo crece: ¿cómo se marcan las cubiertas? → A: una entrada nueva por casilla, `## 2026-11-19 · harness-ladder · arnés`, que nombra las lecciones que la regla sustituye (assumed).
- Q: ¿Escrituras atómicas e `ipcMain` envuelto? → A: fuera de este cambio: 15 archivos con `writeFile` y 109 `ipcMain` en `index.ts` piden su propio cambio (assumed).

### Session 2026-11-20
- Q: (builder) ¿Cuánto tarda `.githooks/pre-commit`? → A: 5,3 s y 4,8 s (typecheck + lint, dos medidas con `time`), muy por debajo de los 60 s del riesgo: se queda como está.
- Q: (builder) ¿Qué tipo tiene `over`? → A: parcial profundo laxo: una hoja función acepta cualquier función y cada nivel admite miembros de más, porque los tests guardan sus stubs tal cual (respuestas parciales y `term.input`, que la API ya no tiene y `components/terminal.test.tsx` stub-ea para probar que nadie lo llama) (assumed).
- Q: (builder) ¿Con qué fecha van las entradas de lecciones? → A: `## 2026-11-20 · harness-ladder · arnés`, el día en que se construyen, no el 19 que dice la entrada de arriba (assumed).

## Outcomes

Cuatro errores que ya se pagaron dejan de poder repetirse sin que `pnpm lint` o el commit lo paren, con un mensaje que dice qué usar en su lugar; las lecciones que los cubrían dicen qué regla las sustituye.

## Scope

**In:** `eslint.config.mjs`; `src/main/harness.test.ts` nuevo; `src/renderer/mockApi.ts` y los 10 tests que asignan `window.atril` a mano; `.githooks/pre-commit` y el script `prepare` de `package.json`; `.agents/lessons.md` (una entrada nueva por casilla que nombra las lecciones que su regla sustituye).
**Out (nombrado):** escrituras atómicas; envoltorio de `ipcMain`; reglas de rutas y entorno (`lstat`, `process.env` esparcido); escaneo de `.error` fuera de `Problem`; selectores CSS duplicados.

## Constraints

- `pnpm lint` tiene que salir limpio al final de cada casilla.
- Cada regla trae un `message` que dice qué usar en su lugar.

## Prior decisions

- (2026-11-19, harness-ladder) Una lección que se repite sube al peldaño más alto que la pare (diseño > tipo o lint > test > texto); una entrada nueva en `lessons.md` nombra las lecciones sustituidas para que la retro no las vuelva a contar.
- (2026-11-19, harness-ladder) El hook de commit corre typecheck y lint, no la suite: la suite sigue en la puerta.

## Task breakdown

- Frontera main↔renderer en lint.
- `mockApi` como única forma de poner `window.atril` en tests.
- `homedir()` solo en `paths.ts`, `trust.ts` y `qa.ts`.
- Hook de commit.
- Una entrada de lecciones por regla.

## Verification criteria

- **W210** If a file under `src/renderer/**` that is not `*.test.ts(x)` has an `import` or `export … from` declaration (type-only included) whose path resolves under `src/main/`, or one under `src/main/**` whose path resolves under `src/renderer/`, then `pnpm lint` shall fail with «renderer y main solo hablan por preload».
  Proof: src/main/harness.test.ts lint refuses an import across main and renderer
- **W211** If any file other than `src/renderer/mockApi.ts` assigns to a member named `atril` (`window.atril`, `(window as X).atril`, `globalThis.atril`), then `pnpm lint` shall fail with «usa mockApi() de src/renderer/mockApi.ts».
  Proof: src/main/harness.test.ts lint refuses a hand-made window.atril
- **W212** If a file under `src/main/**` that is not `*.test.ts` and not `paths.ts`, `trust.ts` or `qa.ts` calls `homedir()`, or reads `process.env.HOME` or `process.env['HOME']`, then `pnpm lint` shall fail with «las rutas de casa salen de paths.ts (ATRIL_HOME en tests)».
  Proof: src/main/harness.test.ts lint refuses homedir outside paths
- **W213** When the `prepare` script of `package.json` runs in a git repository, that repository's `core.hooksPath` shall be `.githooks`.
  Proof: src/main/harness.test.ts prepare points git at the hooks
- **W214** If `pnpm -s typecheck` fails, or if `pnpm -s lint` fails, then `.githooks/pre-commit` shall exit non-zero.
  Proof: src/main/harness.test.ts the pre-commit hook stops a red commit

## Approach

### Summary
Tres bloques en `eslint.config.mjs` (`no-restricted-imports`, `no-restricted-syntax`, `no-restricted-properties`) acotados por `files`/`ignores`, probados con la API de ESLint sobre texto; un hook de shell versionado.

### Technical context
ESLint 10 flat config + typescript-eslint; vitest. `ESLint` de `eslint` con `lintText(code, { filePath })` usa la config real del repo, así el test prueba la regla de verdad. Radio: `eslint.config.mjs`, `package.json`, `.githooks/pre-commit`, 1 test nuevo, 10 tests migrados, `mockApi.ts` si le falta algo.

### The approach
- W210: dos objetos de config, uno con `files: ['src/renderer/**/*.{ts,tsx}']` y `patterns: [{ group: ['**/main/**'] }]`, otro con `files: ['src/main/**/*.ts']` y `['**/renderer/**']`; ambos `ignores: ['**/*.test.ts', '**/*.test.tsx']`. Hoy ningún archivo que no sea test cruza.
- W211: `no-restricted-syntax` con `AssignmentExpression > MemberExpression.left[property.name='atril']` en `src/**/*.{ts,tsx}`, `ignores: ['src/renderer/mockApi.ts']`. `mockApi(o, stored, over?)`: `over` es `DeepPartial<AtrilApi>` mezclado en profundidad sobre el mock completo (las funciones de `over` sustituyen, los objetos se mezclan). Cada uno de los 10 tests cambia solo su línea de montaje: `window.atril = {…} as unknown as AtrilApi` → `mockApi({}, undefined, {…})`; sus `expect` no cambian y siguen en verde.
- W212: `no-restricted-syntax` (no `no-restricted-properties`, que no ve `process.env.X` anidado) con `CallExpression[callee.name='homedir']`, `CallExpression[callee.property.name='homedir']` y `MemberExpression[object.object.name='process'][object.property.name='env'][property.name='HOME']` / `[property.value='HOME']`; `files: ['src/main/**/*.ts']`, `ignores` los tests y los tres archivos. Como W211 también usa `no-restricted-syntax` y una regla repetida en otro objeto sustituye a la anterior, W211 y W212 van en objetos con `files` que no se solapan para `src/main` o se juntan en uno con los dos selectores.
- W213: `"prepare": "git config core.hooksPath .githooks"` (sin `|| true`: fuera de un repo, como al instalar el `.dmg`, no corre `prepare`). El test crea un repo git temporal, corre el comando de `prepare` leído de `package.json` con ese `cwd` y lee `git config core.hooksPath`.
- W214: el hook es `#!/bin/sh\nset -e\npnpm -s typecheck\npnpm -s lint`, con bit de ejecución en git (`git update-index --chmod=+x`). El test lo ejecuta con `sh` dos veces, con un `pnpm` falso al principio del `PATH` que falla solo en `typecheck` y luego solo en `lint`, y comprueba salida distinta de 0 en ambas y 0 cuando el falso no falla. El hook corre también en los commits de `land.py`/`libretto land`; el tiempo de typecheck+lint se mide en la casilla y se apunta en el Decision log.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| husky / lefthook | una dependencia para un archivo de tres líneas |
| Mover `WARN_AT` y los modelos a `src/shared` para aplicar la frontera también a tests | el test que cruza solo compara una constante; mover no evita ningún fallo |
| Probar las reglas corriendo `pnpm lint` sobre archivos fixture | escribe archivos en el árbol; `lintText` no |

### Risks
| Risk | Mitigation |
|---|---|
| Una regla que pasa por no aplicar nunca (glob mal) | cada test de W210–W212 lint-a un texto que debe fallar y otro que debe pasar |
| El hook hace lentos los commits | se mide en la casilla; si pasa de 60 s se apunta y se decide |

### Validation and rollback
`src/main/harness.test.ts`. Forzar rojo: comentar la regla y ver el test fallar. Rollback: un revert y `git config --unset core.hooksPath`.

### Complexity deliberately kept
Ninguna.

## Checklist

- [x] Frontera main↔renderer y `homedir()` en lint, con su entrada en lecciones · Closes: W210, W212
- [x] `window.atril` solo por `mockApi` (con `over`), los 10 tests migrados, entrada en lecciones · Closes: W211
- [x] `prepare` y hook de commit, tiempo medido, entrada en lecciones · Closes: W213, W214
