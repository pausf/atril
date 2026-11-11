# qa-screen

Tracker: none
Targets: workspaces
Durable decisions: the four in Prior decisions below

## The ask, verbatim

> la seccion de QA fuera de lateral deberia serun seccion nueva como MR , Libretto etc..

> la a  (informe por criterio, bocetos/qa-propuestas.html)

> HTML de fase 1 implementa el ver cómo como bug o probar cómo a ver qué hace.

## Reading

QA pasa a ser una pantalla propia en la barra (como MR o Libretto) con el informe por criterio: cada criterio del
cambio con Pasa / Falla / Sin probar, su prueba (pasos y capturas), «Ver cómo», «Marcar como bug», «Probar este» y
«Reprobar todo». Las plataformas (MCP oficial de Apple, emulador del SDK, Safari), la detección mejorada y los errores
con su arreglo van en `qa-targets`.

## Decision log

### Session 2026-11-11
- Q: ¿Dónde? → A: una pantalla «QA» en la barra, entre Libretto y Avisos (y en ⌘K); arriba, tarjetas de los trabajos
  vivos con lo que detectó W83 («App web», «Android», «sin detectar»); el panel de Libretto deja de tener la sección
  QA (assumed).
- Q: ¿De dónde salen los criterios? → A: del `## Verification criteria` del cambio en curso del trabajo (sus ids y
  su texto, como F36 encuentra el cambio) (assumed).
- Q: ¿De dónde salen los resultados? → A: el prompt del agente de QA (W84) le pide, además, escribir
  `$ATRIL_HOME/qa/<id>/report.json` al terminar cada criterio: `{ "criteria": [{ "id", "status":
  "pass"|"fail"|"untested", "note", "steps": [{ "text", "ms"?, "shot"? }] }] }`, `shot` el nombre de una captura de
  su carpeta. Main lo lee cada 3 s mientras la pantalla está abierta, como F33 (assumed).
- Q: ¿Fiarse del archivo? → A: es texto de un modelo: main lo valida (ids que existen en el cambio, estados de la
  lista, textos cortados a 400, 30 pasos como mucho, `shot` solo nombres de su carpeta sin `/` ni `..`); lo que no
  valga se ignora, nunca se ejecuta ni se pinta como HTML (assumed).
- Q: ¿«Ver cómo»? → A: un modal con los pasos del criterio (texto y duración), sus capturas en una tira y la elegida
  en grande; el paso que falló marcado (assumed).
- Q: ¿«Probar este» y «Reprobar todo»? → A: si el panel de QA está vivo, Atril escribe en él «Prueba solo el criterio
  {id}: {texto}. Actualiza report.json.» (o «Prueba otra vez todos los criterios…»); si no, lanza QA (W84) con esa
  petición al final del prompt. El criterio pasa a «Probando…» hasta que el informe lo cambie (assumed).
- Q: ¿«Marcar como bug»? → A: un formulario ya relleno (título «QA {rama}: {nota}», los pasos, el entorno: tipo,
  rama y commit, y el criterio) con «Crear en Jira» (como W108, al proyecto del tablero de Ajustes; sale si Jira está
  guardado con tablero) y «Pasar al agente del trabajo» (escribe el bug en el panel del agente del trabajo, W75-like);
  lo editas antes de mandarlo (assumed).

## Outcomes

- QA tiene su pantalla: eliges el trabajo y ves qué criterios de su cambio se han visto funcionar en la app, cómo los
  probó el agente, y conviertes un fallo en tarea de Jira o en un encargo al agente con un clic.

## Scope boundaries

**In:** la pantalla y su entrada en la barra y ⌘K, el informe por criterio, «Ver cómo», «Probar este», «Reprobar
todo», «Marcar como bug», quitar QA del panel.
**Out:** elegir plataforma, MCP de Apple, emulador del SDK, Safari, la detección mejorada y los errores con su arreglo
(`qa-targets`); vídeo; revisión antes/después.
**Never scoped out:** el informe es texto no fiable (validado, nunca HTML); nada se manda a Jira ni al agente sin
pulsar; el token de Jira no sale de main; teclado; textos por `t()`; estados con palabra, no solo color.

## Prior decisions

- QA como pantalla propia (Pau, 11 nov).
- Informe por criterio, la A de `bocetos/qa-propuestas.html` (Pau, 11 nov).
- El agente de QA escribe `report.json`; main lo valida (assumed, 11 nov).
- Bug a Jira o al agente, siempre al pulsar (assumed, 11 nov).

## Verification criteria

- **W113** Atril shall show a «QA» screen in the rail between Libretto and Avisos and in ⌘K, with a card per live
  workspace naming its W83 kind («App web», «Android», «iOS», «Expo», «React Native», «Flutter») or «sin detectar»,
  the picked one pressed; for the picked workspace, its change's criteria from `## Verification criteria` (id and
  text), each with «Pasa», «Falla», «Sin probar» or «Probando…» and a summary «{p} pasan · {f} fallan · {u} sin
  probar»; for «sin detectar», a line saying QA cannot open it; and «Probar en vivo» or «Detener QA» as W84/W85.
  One test holds a case per clause.
  Proof: src/renderer/qa-screen.test.ts the QA screen reports each criterion
- **W114** Main shall read `$ATRIL_HOME/qa/<id>/report.json` and answer only entries whose id is a criterion of the
  workspace's change, whose status is pass, fail or untested, with `note` and step texts cut to 400 characters, at
  most 30 steps, and `shot` kept only when it is a bare file name present in the workspace's QA folder; a missing,
  unreadable or malformed file shall answer no entries. One test holds a case per clause.
  Proof: src/main/qa-report.test.ts the qa report is read as untrusted data
- **W115** When the person presses «Ver cómo» on a criterion with steps, Atril shall open a modal with its steps (text
  and duration when known), the failing step marked when the status is fail, and its screenshots as data URLs (W85's
  limits) in a strip, the chosen one large; Escape or «Cerrar» closes it and returns focus.
  Proof: src/renderer/qa-screen.test.ts a criterion shows how it was tested
- **W116** When the person presses «Probar este» or «Reprobar todo», main shall type into the live QA pane «Prueba
  solo el criterio {id}: {texto}. Actualiza report.json.» or «Prueba otra vez todos los criterios y actualiza
  report.json.» then Enter, or, with no QA pane, launch QA (W84) with that request appended to its prompt; the
  criterion (or all) shall read «Probando…» until the report changes it.
  Proof: src/main/qa-report.test.ts testing one criterion asks the qa agent for just that
- **W117** When the person presses «Marcar como bug» on a failed criterion, Atril shall open a form prefilled with a
  title «QA {branch}: {note}», the steps, the environment (kind, branch, head commit) and the criterion, all editable;
  «Crear en Jira» (only while Jira is saved with a board) shall create the issue as W108 does and show «Creada
  {KEY}»; «Pasar al agente del trabajo» shall type the form as one message into the workspace's agent pane, as W75
  does for text; an error shall show in the form and keep it open.
  Proof: src/renderer/qa-screen.test.ts a failed criterion becomes a bug
- **F33** (amended) The Libretto panel shall show no QA section.
  Proof: src/renderer/flow/qa.test.ts the qa section shows the button and the screenshots

## Approach

### Summary
Main: `src/main/qa-report.ts` (leer y validar el informe; pedir un criterio) y el prompt de W84 ampliado; IPC
`atril:qa:report`, `atril:qa:retest`, `atril:qa:bug`. Renderer: `src/renderer/qa/QaScreen.tsx` (+ `QaHow.tsx`,
`QaBug.tsx`), la entrada en `Rail.tsx`, `App.tsx` y `palette/items.ts`; `FlowPanel` deja de pintar `Qa.tsx`.

### Technical context
Electron 45, React 19, vitest. Reutiliza `detectQa`/`launchQa`/`qaStatus`/`stopQa` (`src/main/qa.ts`), las capturas como
data URLs (W85), la lectura de criterios del proposal (como `stageOf`/F36), `ideaToJira` de `src/main/libretto.ts`
generalizado a «crear incidencia con resumen y descripción», y `replyToAgent`/`sendText` para escribir en un panel.
Referencia visual: `bocetos/fase1-nucleo.html` (pantalla QA, `qaHow`, formulario de bug, `Probando…`).

### The approach
- El informe se lee con el mismo latido que `qaStatus` (3 s) mientras la pantalla está a la vista.
- «Probando…» es estado del renderer por criterio; se quita cuando el informe trae otro estado para ese id.
- El formulario de bug compone el texto en el renderer; main crea la incidencia o lo escribe en el panel.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| parsear lo que dice el agente en su terminal | frágil; un archivo con forma es comprobable |
| un test runner propio (Playwright tests generados) | otro motor; el agente de QA ya maneja el navegador |

### Risks
| Risk | Mitigation |
|---|---|
| el agente no escribe el informe o lo escribe mal | W114 lo valida; sin informe todo sale «Sin probar»; «sin probar» en CLAUDE.md para el real |
| estilos globales pisan la pantalla | clases propias `qa-*`; app real con Playwright antes de aterrizar |

### Validation and rollback
Gates; la app real con un `report.json` sembrado (pasa, falla, sin probar, capturas) manejada con Playwright: Ver cómo,
Marcar como bug (Jira oculto sin tablero; «Pasar al agente» escribe en el panel), Probar este. Un revert.

### Complexity deliberately kept
La validación del informe: es texto de un modelo que se pinta en pantalla.

## Checklist

- [ ] read and validate the report, retest requests, the bug actions in main with IPC · Closes: W114, W116
- [ ] the QA screen, rail, ⌘K, Ver cómo, Marcar como bug, QA out of the panel; real-app drive; photo; novedades · waits on box 1 · Closes: W113, W115, W117, F33
