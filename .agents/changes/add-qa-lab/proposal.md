# add-qa-lab

Tracker: none
Queued: 2026-11-10

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
