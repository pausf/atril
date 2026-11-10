# package-and-sign

Tracker: none
Targets: workspaces
Durable decisions: the four in Prior decisions below

## The ask, verbatim

> sigue creando funcionalidades. Tenemos que hacer el mejor gestor de IA, o sea, de orquestador y revisor de MRs, etcétera, porque lo queremos poner para que la gente le sea útil.

## Reading

Empaquetar Atril para otros: configuración de electron-builder (arm64), firma con certificado propio o ad-hoc, y las instrucciones para abrirlo sin pagar a Apple (investigación del 10 nov).

## Decision log

### Session 2026-11-11
- Q: ¿Con qué? → A: `electron-builder` como dependencia de desarrollo (versión fijada), configuración en
  `electron-builder.config.cjs` (JS, para que la identidad caiga a ad-hoc sin YAML con macros); hace falta una dependencia nueva porque no hay empaquetador (assumed).
- Q: ¿Qué sale? → A: un `.dmg` y un `.zip` para Apple Silicon (arm64); x64 no (assumed).
- Q: ¿Firma? → A: la investigación del 10 nov: certificado propio del Llavero si `ATRIL_SIGN_IDENTITY` está
  definido (p. ej. «Atril Local»), si no firma ad-hoc (`"-"`); `hardenedRuntime: true` con `allow-jit`,
  `allow-unsigned-executable-memory` y `disable-library-validation` en `build/entitlements.mac.plist`; sin
  notarización (sin cuenta de Apple) (assumed).
- Q: ¿Quién lo construye? → A: la persona, con `pnpm dist`; esta sesión no construye (CLAUDE.md: nunca `pnpm build`),
  así que la prueba es la configuración, y la comprobación a mano va escrita (assumed).
- Q: ¿Recursos? → A: `resources/` (Libretto, hook, resumen) va dentro del paquete como `extraResources`; `paths.ts`
  ya distingue empaquetado (assumed; el constructor lo comprueba).
- Q: ¿Instrucciones? → A: `bocetos/instalar.html`: construir, firmar con certificado propio, abrir la primera vez
  («Abrir igualmente» en Privacidad y seguridad desde Sequoia), y la vía de 99 $/año si un día se comparte (assumed).


### Session 2026-11-11 (revisión en frío)
- Q: ¿Dónde vive la caída a ad-hoc? → A: en el propio `electron-builder.config.cjs`:
  `identity: process.env.ATRIL_SIGN_IDENTITY || '-'`; el test lo carga con y sin la variable (assumed).
- Q: ¿`resources/` plano o en carpeta? → A: plano, `{ from: 'resources', to: '.' }`, como espera `paths.ts`
  (`<resourcesPath>/claude-hook.mjs`, `<resourcesPath>/libretto/`) (assumed).
- Q: ¿node-pty? → A: `asarUnpack` de `node_modules/node-pty/**`, `npmRebuild: true`, y `files` limitado a `out/**` y
  `package.json`; `dist` = `electron-vite build && electron-builder --mac` (assumed).
- Q: ¿Qué demuestra el test? → A: el texto de la configuración, nada más; que el `.dmg` arranque, abra terminales y
  encuentre el hook lo comprueba Pau a mano (entrada «sin probar») (assumed).
- Q: ¿Fijada? → A: versión exacta, sin `^` (`26.18.0`, del 20 oct) (assumed).
- Q: ¿Dueño de los archivos nuevos? → A: workspaces; su `Governs:` añade `electron-builder.config.cjs` y `build/**`
  (assumed).
- Q: ¿Foto y boceto? → A: no hay pantalla nueva: novedades lleva su sección sin foto y el boceto no cambia (assumed).
- Q: ¿Otro Mac? → A: fuera; la página explica «Abrir igualmente» y el certificado propio, sin prometerlo (assumed).

## Outcomes

- `pnpm dist` deja en `dist/` un `.dmg` y un `.zip` arm64 firmados (propio o ad-hoc) con todo lo que la app necesita
  dentro; una página explica cómo construirlo, firmarlo y abrirlo.

## Scope boundaries

**In:** la dependencia, la configuración, los entitlements, el script, la página de instalación.
**Out:** abrirlo en otro Mac como criterio, notarización, actualizaciones automáticas, x64, Windows/Linux, publicar el `.dmg`.
**Never scoped out:** ningún secreto en el repo (la identidad llega por variable de entorno); los recursos del hook y
Libretto dentro del paquete.

## Prior decisions

- arm64 solo (assumed, 11 nov).
- Identidad por `ATRIL_SIGN_IDENTITY`, si no ad-hoc (assumed, 11 nov).
- Sin notarización ni auto-update (assumed, 11 nov; investigación del 10 nov).
- La sesión no construye; Pau sí (assumed, 11 nov).

## Verification criteria

- **W98** The repository shall hold an `electron-builder.config.cjs` asking for `dmg` and `zip` for `arm64` with
  `appId`, `productName: Atril`, the icon `build/icon.icns`, `extraResources` copying `resources` flat into the
  resources dir, `asarUnpack` covering `node-pty`, `hardenedRuntime: true`, `entitlements` and
  `entitlementsInherit` at `build/entitlements.mac.plist` (holding `allow-jit`, `allow-unsigned-executable-memory`
  and `disable-library-validation`), `notarize: false`, and `identity` equal to `ATRIL_SIGN_IDENTITY` when set and
  `"-"` when not; `package.json` shall pin `electron-builder` to an exact version and its `dist` script shall run
  `electron-vite build` then `electron-builder`. One test holds a case per clause; it proves the config text, never
  a built app.
  Proof: src/main/packaging.test.ts the packaging config asks for a signed arm64 app
- **W99** When packaged, `resourcesDir()` shall return `process.resourcesPath`, and in dev the repo's `resources/`;
  and every file the main process joins onto `resourcesDir()` (`claude-hook.mjs`, `libretto/`), and every
  local module the hook imports (`summarise.mjs`), shall exist in `resources/`, so the flat copy of W98 places it where it is looked for.
  Proof: src/main/paths.test.ts resources resolve packaged and in dev

## Approach

### Summary
Una configuración JS de electron-builder, sus entitlements, el script `dist` y dos tests que leen la configuración y
la ruta de recursos. Nada se construye en esta sesión.

### Technical context
Electron 45, electron-vite 6 (`out/main`, `out/preload`, `out/renderer`), node-pty nativo, vitest. Archivos:
`electron-builder.config.cjs`, `build/entitlements.mac.plist`, `package.json`, `src/main/packaging.test.ts`,
`src/main/paths.test.ts`, `.agents/specs/workspaces/spec.md` (Governs), `bocetos/instalar.html`,
`bocetos/novedades.html`, `CLAUDE.md`.

### The approach
El test hace `require` de la config con `ATRIL_SIGN_IDENTITY` puesto y quitado (borrando la caché de `require`), y
lee el plist como texto. W99 sustituye `process.versions.electron`, `process.defaultApp` y `process.resourcesPath`
con `Object.defineProperty`/`vi.stubGlobal` y los restaura; para la segunda mitad busca con `rg`-equivalente en
`src/main` cada `join(resourcesDir(), '<x>')` y comprueba que `<x>` existe en `resources/`.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| `electron-builder.yml` + `CSC_NAME` | no expresa «si no, ad-hoc» sin macros; un test no puede ver la caída |
| electron-forge | más piezas (makers, plugins) para el mismo `.dmg` |
| construir aquí para probarlo | CLAUDE.md lo prohíbe |

### Risks
| Risk | Mitigation |
|---|---|
| la config es válida en texto pero electron-builder la rechaza | entrada «sin probar»: Pau corre `pnpm dist` |
| node-pty sin reconstruir para arm64 | `npmRebuild: true` y `asarUnpack`; comprobación a mano: abrir un terminal en la app instalada |
| un recurso nuevo que no esté en `resources/` | la segunda mitad de W99 falla |

### Validation and rollback
`pnpm -s typecheck`, `lint`, `test`. El test de identidad se fuerza en rojo cambiando `'-'` antes de creerlo. Un
revert lo quita todo.

### Complexity deliberately kept
Config en JS y no YAML: la caída a ad-hoc lo pide.

## Checklist

- [x] the pinned dependency, the config, the entitlements, the dist script, Governs and both tests · Closes: W98, W99
- [x] bocetos/instalar.html (build, sign, open, what to check by hand); novedades section without photo; CLAUDE.md «sin probar» entry for `pnpm dist` · waits on box 1
