# add-qa-lab

Tracker: none
Targets: workspaces
Durable decisions: the four in Prior decisions below

## The ask, verbatim

> molaria funcionalidad de QA, por ejemplo un apartado de la tareas para probar en live con chrome , emuladores de android o ios , etc... dependiendo del proyecto para ver que la features funcionan

## Reading

Un apartado «QA» por trabajo para ver la funcionalidad funcionando de verdad, no solo los tests:
según el tipo de proyecto (web, Android, iOS…), Atril levanta el entorno adecuado (Chrome, emulador de
Android, simulador de iOS) en la rama del trabajo, y el agente (o la persona) recorre la función y deja
capturas como prueba. Encaja con Libretto: es la evidencia de «la función funciona» antes de aterrizar.
A investigar en su spec: detectar el tipo de proyecto, levantar cada entorno (Chrome con DevTools/
Playwright, `emulator`/`adb`, `xcrun simctl`), cómo lo conduce Claude, dónde se ven las capturas, y que
nada arranque solo (cuota y recursos).

## Decision log

### Session 2026-11-10
- Q: ¿Qué es? → A: un botón «Probar en vivo» por trabajo que abre, al lado de su terminal, un Claude de QA con
  las herramientas para manejar la app de verdad (navegador o emulador), que la arranca en esa rama, recorre lo
  que promete la spec y deja capturas; Atril las enseña en una sección «QA» del panel (assumed).
- Q: ¿Qué herramientas? → A: web: Playwright MCP (`@playwright/mcp`, capturas a `--output-dir`); Android e iOS:
  `mobile-mcp` (`@mobilenext/mobile-mcp`), con el emulador o simulador ya en marcha; versiones fijadas
  (assumed; investigación 10 nov, sin verificar contra los docs oficiales).
- Q: ¿Cómo sin tocar la configuración de la persona? → A: `--mcp-config <archivo de Atril>` y
  `--strict-mcp-config` en esa sesión; nunca `claude mcp add` ni `~/.claude.json` (assumed).
- Q: ¿Qué tipo de proyecto? → A: por archivos, en este orden: Expo, React Native, Flutter, Android nativo, iOS
  nativo, web (`package.json` con `dev`, `start` o `preview`); sin coincidencia, no hay botón (assumed).
- Q: ¿Dónde van las capturas? → A: `$ATRIL_HOME/qa/<workspace>/`, fuera del repo, para no ensuciar git (assumed).
- Q: ¿Cuota y recursos? → A: nada arranca solo; un solo QA por trabajo a la vez; «Detener QA» cierra ese panel;
  arrancar emulador o simulador queda en manos del Claude de QA según su prompt (assumed).

## Outcomes

- En un trabajo cuyo repo es una app web, Android o iOS, «Probar en vivo» abre un panel de tmux con un Claude de
  QA que arranca la app, la recorre según la spec del cambio y guarda capturas.
- La sección «QA» del panel de Libretto lista esas capturas (las más nuevas primero) y al pulsar una se ve grande.
- «Detener QA» cierra ese panel; nada más se toca.

## Scope boundaries

**In:** detectar el tipo, el botón, el archivo de MCP por sesión, el panel de QA, la lista de capturas.
**Out:** grabar vídeo; ejecutar suites e2e propias del proyecto; elegir AVD o simulador en Ajustes (lo decide
el Claude de QA); comparar capturas entre versiones; instalar Xcode o el SDK de Android.
**Never scoped out:** nada se lanza sin pulsar; la configuración global de Claude no se toca; si falta `node`,
`adb` o `xcrun` para ese tipo, se dice qué falta en vez de lanzar; las capturas se pintan como imagen local.

## Prior decisions

- Playwright MCP para web y mobile-mcp para móvil, versiones fijadas (assumed, 10 nov).
- MCP solo por sesión con `--strict-mcp-config` (assumed, 10 nov).
- Capturas fuera del repo, en ATRIL_HOME (assumed, 10 nov).
- Un QA por trabajo y solo bajo demanda (assumed, 10 nov; CLAUDE.md: cuota bajo demanda).

## Task breakdown

- `detectQa(path)` con la tabla de tipos y su comando de arranque.
- El archivo MCP por tipo y el argv del Claude de QA (`agentArgv` con `mcpConfig`).
- `launchQa(id)`: comprueba herramientas, divide el panel del trabajo y lanza; `stopQa(id)`.
- Lista de capturas y su vigilante; sección «QA» en el panel.

## Verification criteria

- **W83** Atril shall classify a workspace's folder as expo (an `app.json` or `app.config.*` and an `expo`
  dependency), react-native (a `react-native` dependency with `ios/` or `android/`), flutter (`pubspec.yaml`
  with `flutter:`), android (`settings.gradle*` and `app/src/main/AndroidManifest.xml`), ios (an `*.xcodeproj`,
  `*.xcworkspace` or a `Package.swift` declaring `.iOS(`), web (`package.json` with a `dev`, `start` or
  `preview` script), first match in that order, or none.
  Proof: src/main/qa.test.ts projects are classified by their files
- **W84** When the person presses «Probar en vivo» on a classified workspace, main shall write
  `$ATRIL_HOME/qa/<id>.mcp.json` with Playwright MCP (web, `--output-dir $ATRIL_HOME/qa/<id>/`) or mobile-mcp
  (the rest), split the workspace's pane and start `claude` there with `--mcp-config` that file,
  `--strict-mcp-config` and a prompt naming the kind, its run command, the change's proposal path and the
  screenshot folder; if a tool the kind needs (`node`; plus `adb` for android, `xcrun` for ios, both for expo,
  react-native and flutter) is missing it shall start nothing and answer which; a second press while a QA pane
  lives shall be refused.
  Proof: src/main/qa.test.ts live qa starts one scoped agent with its tools
- **W85** While a workspace is classified, the Libretto panel shall show a «QA» section with «Probar en vivo»
  (or «Detener QA» while its pane lives) and the PNG files in its screenshot folder, newest first, each opening
  large on press; for an unclassified workspace no section shall show.
  Proof: src/renderer/qa.test.ts the qa section shows the button and the screenshots

## Approach

### Summary

Detección pura por archivos, un JSON de MCP escrito por Atril y un `claude` más en un panel dividido del mismo
tmux (como ⌘D). Las capturas son archivos que un vigilante lista.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| `claude mcp add` en la configuración de la persona | Toca su configuración global y afecta a todos sus agentes. |
| Reiniciar el agente del trabajo con los MCP | Pierde su contexto; el QA es un segundo par de ojos. |
| Chrome DevTools MCP para web | Bueno para depurar; Playwright deja las capturas en una carpeta fija sin depender del agente. |

### Risks

| Risk | Mitigation |
|---|---|
| Flags de MCP cambian entre versiones de Claude Code | Techo nombrado; el test fija el argv; versiones de paquetes fijadas. |
| Emulador y navegador pesan | Solo bajo demanda, uno por trabajo, «Detener QA». |
| Puertos ocupados entre worktrees | El prompt pide un puerto libre; techo: asignarlo desde Atril si choca. |

### Validation and rollback

Tests vistos en rojo. Rollback: un revert; los archivos de `qa/` se quedan, inofensivos.

### Complexity deliberately kept

Ninguna.

## Checklist

- [ ] detection, the MCP file, launch and stop with the tool check · Closes: W83, W84
- [ ] the QA section with screenshots; tutorial mention; sketch; photo · waits on box 1 · Closes: W85
