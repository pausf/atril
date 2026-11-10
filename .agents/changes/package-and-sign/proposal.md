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
  `electron-builder.yml`; hace falta una dependencia nueva porque no hay empaquetador (assumed).
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

## Outcomes

- `pnpm dist` deja en `dist/` un `.dmg` y un `.zip` arm64 firmados (propio o ad-hoc) con todo lo que la app necesita
  dentro; una página explica cómo construirlo, firmarlo y abrirlo.

## Scope boundaries

**In:** la dependencia, la configuración, los entitlements, el script, la página de instalación.
**Out:** notarización, actualizaciones automáticas, x64, Windows/Linux, publicar el `.dmg`.
**Never scoped out:** ningún secreto en el repo (la identidad llega por variable de entorno); los recursos del hook y
Libretto dentro del paquete.

## Prior decisions

- arm64 solo (assumed, 11 nov).
- Identidad por `ATRIL_SIGN_IDENTITY`, si no ad-hoc (assumed, 11 nov).
- Sin notarización ni auto-update (assumed, 11 nov; investigación del 10 nov).
- La sesión no construye; Pau sí (assumed, 11 nov).

## Verification criteria

- **W98** The repository shall hold an `electron-builder.yml` producing `dmg` and `zip` for `arm64` with
  `appId`, `productName: Atril`, the app icon from `build/icon.icns`, `extraResources` including `resources/`,
  `hardenedRuntime: true`, `entitlements` and `entitlementsInherit` pointing at `build/entitlements.mac.plist`
  (holding `allow-jit`, `allow-unsigned-executable-memory` and `disable-library-validation`), `notarize: false`,
  and `identity` read from `ATRIL_SIGN_IDENTITY` falling back to ad-hoc `"-"`; `package.json` shall carry a pinned
  `electron-builder` devDependency and a `dist` script that runs it. One test holds a case per clause.
  Proof: src/main/packaging.test.ts the packaging config builds a signed arm64 app
- **W99** A packaged app shall find its bundled `resources/` (Libretto, the hook, summarise) under
  `process.resourcesPath`, and a dev run under the repo, as `paths.ts` resolves them.
  Proof: src/main/paths.test.ts resources resolve packaged and in dev

## Checklist

- [ ] the dependency, config, entitlements, dist script and the resources path · Closes: W98, W99
- [ ] bocetos/instalar.html (build, sign, open); novedades; CLAUDE.md «sin probar» entry for a real build · waits on box 1
