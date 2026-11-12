# notify-core

Tracker: none
Targets: avisos
Durable decisions: the ones in Prior decisions below (notifications.json, «Nada» no guarda, una petición por MR que sale de Mías, el sondeo de MR en main)

## The ask, verbatim

> me gusta ya las notificaciones y todo, desarrolla todo lo nuevo de fase 1 núcleo

(Pau, 11 nov. Este cambio es la mitad de main de las notificaciones; la tarjeta de Ajustes y la pantalla Avisos van en `notify-ui`, que espera a este. Cubre: los 10 bugs de `bocetos/notificaciones.md`, los tipos nuevos de la tarjeta «Notificaciones» de Ajustes en `bocetos/fase1-nucleo.html` y la tarjeta tal como está dibujada. El resto de lo nuevo de fase 1 —la app del móvil, Skills, «Afinar la petición»— va en otros cambios.)

## Decision log

### Session 2026-11-11
- Q: ¿Dónde se guardan los ajustes de avisos? → A: en un archivo propio, `$ATRIL_HOME/notifications.json`, no en `ui.json`: main lo lee en cada aviso, `ui.json` es estado de la ventana con un `clean` que tira lo que no conoce y un `patchUi` con fusión especial para `folded`; un archivo dañado solo devuelve los avisos a sus valores por defecto (assumed). Si es incorrecto: un campo `notifications` en `UiState` y el criterio V7 cambia de archivo.
- Q: ¿«Nada» guarda el aviso en Avisos? → A: no; «Nada» no interrumpe ni guarda: la tarjeta dice «silenciado, no te avisa» (assumed). Si es incorrecto: V9 se invierte y «Nada» = «Solo Avisos» sin contador.
- Q: ¿Cómo se distingue fusionada de cerrada si el listado no lo dice? → A: una petición a la forja por cada MR que sale de Mías (como mucho 10 por listado); si falla, queda el «Ya no está abierta» de hoy (assumed). Rompe a propósito «ninguna consulta extra» de V1 para ese único caso. Si es incorrecto: un solo tipo «Ya no está abierta» que abre la MR en la forja.
- Q: ¿Cuándo es «QA terminada»? → A: la primera vez, desde que se lanzó la QA de ese trabajo, que `report.json` tiene cada criterio del cambio en Pasa o Falla (ninguno Sin probar ni ausente); una vez por ejecución (assumed).
- Q: ¿«Lleva N min esperándote» cuenta desde cuándo? → A: desde que main ve entrar el trabajo en `needs-you` (reloj de main, en memoria); reabrir Atril reinicia la cuenta: límite nombrado (assumed).
- Q: ¿Pregunta o fin de turno, cómo se sabe? → A: por el prefijo del texto que ya escribe el gancho: «Te pregunta: » es pregunta, «Claude dice: » es fin de turno, sin texto o con otro, pregunta (assumed).
- Q: ¿El recordatorio de inactividad de Claude Code (idle_prompt) cuenta como pregunta nueva? → A: no; el gancho deja el texto, las opciones y la hora del estado anterior tal como estaban (assumed).
- Q: ¿Qué hace «Agrupar»? → A: como mucho un aviso del Mac cada 120 s; lo que llega dentro de esa ventana se aguanta y, al cerrarse, sale solo si es uno o como «{n} agentes te necesitan» / «{n} avisos nuevos» si son varios (assumed).
- Q: ¿Horas de silencio y días? → A: de 19:00 a 09:00 por defecto (cruza la medianoche), apagado por defecto; los días marcados (S y D por defecto) son silencio todo el día; en silencio, lo que iba al Mac va solo a Avisos; sin resumen al volver (assumed).
- Q: ¿«Choca con otro trabajo» y la ventana cerrada? → A: se calcula cuando el radar se pide (la ventana lo pide cada 10 s); con la ventana cerrada no hay avisos de choque: límite nombrado (assumed). Si es incorrecto: main sondea el radar cada minuto sin ventana.
- Q: ¿Cómo se sabe que macOS bloquea los avisos? → A: `defaults export com.apple.ncprefs -` y la entrada del `bundle-id` de Atril; bloqueado si su `flags` no tiene el bit 25 (`0x2000000`); sin entrada o sin poder leerlo, «no lo sé» y no se enseña el problema (assumed; el significado del bit no está documentado por Apple — se comprueba en la ronda de QA con Pau).
- Q: ¿«Cerrar su trabajo» cierra sin preguntar? → A: no; abre la confirmación de siempre (W136) para ese trabajo (assumed).
- Q: ¿«Arreglar con Claude» desde el globo? → A: trae Atril al frente en esa MR y lanza ahí el «Arreglar CI con Claude» de M30, que ya enseña su resultado y sus errores; es una pulsación de la persona, no una llamada automática (assumed).
- Q: ¿Aviso al 95 % de cuota? → A: no; la tarjeta solo tiene el 80 % (assumed).

### Session 2026-11-12 (revisión en frío)
- Q: ¿Un tipo en «Nada» sigue moviendo las referencias (CI asentada, `notes`, Mías)? → A: sí, siempre; solo se descarta el aviso. La petición de W184 no se hace si `merged` está en «Nada» (assumed). Si es incorrecto: al quitar el silencio llegaría un aviso viejo.
- Q: ¿«Claude ha terminado» (fin de turno sin texto) es `ask` o `done`? → A: `done`; `ask` solo con «Te pregunta: », «Claude te necesita», sin texto u otro (assumed).
- Q: ¿Un aviso aguantado por el agrupador vuelve a mirar foco y silencio al salir? → A: sí; si al salir `route()` ya no dice `mac`, se queda solo en Avisos (assumed). Cumple W78: no llega al Mac más tarde.
- Q: ¿El aviso de W179 cuenta en la ventana de 120 s? → A: sí, como uno; si se aguanta, sus avisos entran en el grupo uno a uno (assumed).
- Q: ¿Quién prueba las ocho combinaciones del foco? → A: `focus.test.ts`, llamando a `route()`; V10 prueba Nada/Avisos y el silencio (assumed).
- Q: ¿Un `report.json` viejo cuenta como QA terminada? → A: no; cuenta solo si se modificó después del `launchQa`; sin criterios en el cambio, no hay aviso; reiniciar Atril desarma (assumed, techo nombrado).
- Q: ¿De dónde sale el id de proyecto de GitLab? → A: la ruta del proyecto de la URL, codificada (`acme%2Fshop-web`), que la API acepta como id (assumed).
- Q: ¿Quién guarda la hora del último listado? → A: `lastMrs` de `index.ts` (el que ya usa la QA a la MR); `mrpoll` lo lee y lo escribe (assumed).
- Q: ¿Partir el cambio? → A: sí, en dos: `notify-core` (main) y `notify-ui` (Ajustes y Avisos), como propuso la revisión (assumed).

## Outcomes

- Cada aviso dice de qué trabajo es en su título («WEB-3535 te pregunta», «OPS-4131 se ha parado»), no solo «Atril».
- Atril avisa también cuando un agente se para, cuando lleva N minutos esperándote, cuando dos trabajos tocan el mismo archivo, cuando termina la QA, cuando la CI vuelve a pasar, cuando una MR se fusiona o se cierra y cuando la cuota de Claude llega al 80 %; la CI que falla llega al Mac con «Arreglar con Claude».
- En Ajustes → Notificaciones eliges por tipo Mac / Solo Avisos / Nada, por grupos de golpe, los minutos del recordatorio, el modo foco, la agrupación y las horas de silencio; «Probar un aviso» saca uno de verdad, y si macOS no deja avisar te lo dice con «Abrir Ajustes del Sistema».
- Avisos deja de acumular preguntas ya contestadas, guarda lo que preguntaba el agente y se entera de las MR aunque la ventana esté cerrada.

## Scope boundaries

**In:** los bugs 1–3 y 5–10 de de `bocetos/notificaciones.md` §«Huecos y bugs»; los tipos `stopped`, `idle`, `radar`, `qa`, `cipass`, `merged`/`closed` y `quota`, y `ask`/`done` separados; la CI que falla en el Mac con su acción; `$ATRIL_HOME/notifications.json`; la API `notify.*` que usará la tarjeta.

**Out (nombrado):** la tarjeta de Ajustes, la pantalla Avisos y el bug 4 (`notify-ui`); la app del móvil, Skills y «Afinar la petición» (otros cambios); el resumen al volver (idea 13); el contador del Dock (idea 14); «un revisor ha comentado» y «te han aprobado» (idea 10, piden datos que el listado no trae); «paso de Libretto listo» (idea 11); avisos de Jira o forja caídas (idea 12); el segundo aviso al 95 % de cuota; sonidos propios; avisos dentro de la app (*toasts*); el radar sondeado sin ventana.

**Never scoped out:** ningún aviso dispara una llamada a Claude; los textos de la forja y del agente se muestran como texto, nunca como HTML; la tarjeta se maneja entera con teclado (radios con flechas, interruptores con espacio); un fallo al guardar o al leer los permisos sigue la regla de errores.

## Constraints

- **Ninguna llamada automática a Claude.** «Arreglar con Claude» y «Reabrir» solo corren cuando la persona pulsa. La cuota sale del sondeo de `usage.ts` que ya existe; no se añade ninguno.
- **Textos:** castellano de España, por `t()` en main y `useT()` en la ventana, con su entrada en `src/preload/i18n-en.ts`; los escaneos S16/S19 deben seguir verdes. El idioma es el del momento de mostrar (W48).
- **Colores:** solo tokens de `:root` y `[data-theme='dark']`; la tarjeta usa gris + el acento (`--run`), como el boceto.
- **Errores:** frase de qué pasó y qué no puedes hacer, un botón que lo arregla y el detalle técnico plegado en «Ver detalle» (componente `Problem`).
- **Títulos:** el aviso del Mac de un trabajo lleva su nombre en el título — `jiraKey`, o la rama si no tiene — y el repo en el subtítulo; los de MR, la frase del tipo en el título y el título de la MR en el cuerpo.
- Escrituras atómicas (`.tmp` + `rename`) y serializadas, como `avisos.json` y `ui.json`.
- Tests con `ATRIL_HOME` temporal y su propio socket de tmux; nada de `~/.claude.json`, ni sesiones de tmux por defecto, ni repos reales.

## Prior decisions

- **Avisos más allá de «te necesita» al Mac** — Pau, 11 nov: «me gusta ya las notificaciones y todo». Sustituye a «Out: Mac notifications for MR notices … per-kind mute settings» de add-avisos (9 nov): ahora cada tipo elige.
- **`notifications.json` propio** en `$ATRIL_HOME`, no `ui.json` (assumed, ver Decision log). Un archivo ilegible o un campo inválido vale sus valores por defecto, como `ui.json`.
- **«Nada» ni interrumpe ni guarda** (assumed).
- **Una petición por MR que sale de Mías**, como mucho 10 por listado, para separar fusionada de cerrada (assumed). Techo: con más de 10 MR desaparecidas a la vez, las demás quedan como «Ya no está abierta».
- **El sondeo de MR pasa a main** (bug 10): main lista cada 5 min si nadie lo ha hecho, haya ventana o no; la ventana sigue pidiendo cuando quiere y eso cuenta como listado (assumed).
- **«Choca» solo con ventana** (assumed). Techo: con la ventana cerrada no hay choques; si Pau lo echa en falta, main sondea el radar cada minuto.
- **La espera de «Lleva N min» vive en memoria de main** (assumed). Techo: reabrir Atril la reinicia.
- **El permiso de macOS se lee de `com.apple.ncprefs`** (assumed). Techo: si Apple cambia el formato, el problema no se enseña nunca (falla hacia «no lo sé», no hacia un falso bloqueo).
- **Pregunta frente a fin de turno por prefijo del texto** (assumed): evita un campo nuevo en el estado; los archivos de estado de hoy siguen valiendo.

## Task breakdown

- Ajustes de avisos: archivo, valores por defecto, limpieza y decisión Mac / Avisos / Nada con foco y silencio.
- El feed: tipos nuevos, mensaje del agente, caducidad, «Nada» que no guarda, fusionada/cerrada.
- Main: detectar cada tipo nuevo (status, QA, radar, cuota, MR) y el sondeo de MR.
- Main: presentar el aviso del Mac (título, acciones, respuesta con número, agrupar, conjunto acotado, permiso, prueba).
- La tarjeta de Ajustes y la pantalla Avisos.
- Bocetos, i18n y prueba en la app real.

## Verification criteria

Avisos (this file). The Mac side is in `spec-workspaces.md`. The Avisos screen (V6, V13–V15) and the Ajustes cards are in `notify-ui`.

The 14 notice types, their group and their default, used by every criterion below:

| Key | Ajustes label | Group | Default |
|---|---|---|---|
| `ask` | Te pregunta algo | agents | mac |
| `done` | Ha terminado su turno | agents | mac |
| `stopped` | Se ha parado | agents | mac |
| `idle` | Lleva {m} min esperándote | agents | list |
| `radar` | Choca con otro trabajo | agents | list |
| `qa` | QA terminada | agents | mac |
| `review` | Te piden revisión | mr | list |
| `comment` | Comentario nuevo | mr | list |
| `ci` | La CI falla en tu MR | mr | mac |
| `cipass` | La CI vuelve a pasar | mr | list |
| `merged` | Fusionada o cerrada | mr | list |
| `following` | MR nueva en lo que sigues | mr | list |
| `opened` | Has abierto una MR | mr | list |
| `quota` | Cuota de Claude al 80 % | account | mac |

- **V1** (amended) When an MR listing completes after a previous one, Atril shall add, with the MR title as detail: «Te piden revisión» (`review`) for an URL in Me toca revisar that was not there before; «Comentario nuevo» (`comment`) when the `notes` count of an MR in Mías or Me toca revisar is higher than before; «MR nueva en lo que sigues» (`following`) for an URL in Sigo that was in no list before; «Has abierto una MR» (`opened`) for an URL in Mías that was in no list before. A forge with an error in either listing, or a list cut at its cap (`more`), shall produce no notice of «new» or «gone» for that forge's rows of that list. One test holds the four kinds and both rules, one assertion per kind.
  Proof: src/main/avisos.test.ts listings turn into notices
- **V16** When an MR listing completes, Atril shall add «La CI falla» (`ci`) for an MR in Mías whose last settled CI state (`pass` or `fail`, ignoring `running` and `none`) was `pass` and is now `fail`, and «La CI vuelve a pasar» (`cipass`) when it was `fail` and is now `pass`.
  Proof: src/main/avisos.test.ts ci fail and pass count the last settled state across running
- **V17** When an URL that was in Mías is in no list after a listing, Atril shall add «MR fusionada» (`merged`) or «MR cerrada» (`closed`) as W184 answers, or «Ya no está abierta» (`gone`) when it answers nothing.
  Proof: src/main/avisos.test.ts an MR leaving Mías is merged, closed or gone
- **V3** (amended) When an agent enters «te necesita» (once per entry, W15), Atril shall add a notice of kind `done` when the hook text starts with «Claude dice: » or is exactly «Claude ha terminado», and `ask` otherwise (starts with «Te pregunta: », is «Claude te necesita», is missing or anything else), titled with the work's name (`jiraKey`, else the branch), linked to its workspace, and carrying the hook text as `detail`.
  Proof: src/main/avisos.test.ts an agent that needs you is a notice
  Proof: src/main/avisos.test.ts a question and an end of turn are different kinds
- **V7** Atril shall keep the notification settings in `$ATRIL_HOME/notifications.json` as `{ types: Record<key, 'mac'|'list'|'mute'>, idleMinutes, focus, group, quiet: { on, from, to, days } }`; a missing file, unreadable JSON, an unknown key or an invalid value shall read as that field's default (the table above, `idleMinutes` 15, `focus` true, `group` true, `quiet` `{ on: false, from: '19:00', to: '09:00', days: ['sat','sun'] }`); `idleMinutes` outside 5–120 or not a multiple of 5 shall read as 15; `from`/`to` not matching `HH:MM` shall read as their defaults.
  Proof: src/main/avisos.test.ts notification settings default and clean
- **V8** When a settings patch is saved, Atril shall merge it into the stored settings (`types` key by key, `quiet` field by field, others replaced), drop invalid fields, write the file atomically and answer the stored settings; two patches sent back to back shall both survive.
  Proof: src/main/avisos.test.ts settings patches merge and both survive
- **V9** If a notice's type is set to «Nada» (`mute`), then Atril shall neither store it in Avisos nor show it on the Mac, while still updating every reference V1, V16 and V17 compare against (so unmuting never fires a stale difference); `merged`, `closed` and `gone` follow the `merged` setting, and while it is `mute` W184 asks no forge.
  Proof: src/main/avisos.test.ts a muted type is neither stored nor shown
- **V10** Atril shall route each new notice with the pure `route(type, settings, { now, focusOn, windowFocused })`: `mute` → `mute`; `list` → `list`; `mac` → `list` while `settings.focus` and `focusOn` and `windowFocused`, `list` while W190's quiet hours hold at `now`, otherwise `mac`. A notice held by W189 is routed again when released. The eight focus combinations are W78's proof; this one holds `mute`, `list` and quiet hours.
  Proof: src/main/avisos.test.ts route honours the type, focus and quiet hours
- **V11** When a workspace leaves `needs-you` (to working, paused or stopped) or leaves the workspace list, Atril shall mark read every unread `ask`, `done`, `idle` and legacy `agent` notice of that workspace, and leave its other notices as they were. (Bug 1.)
  Proof: src/main/avisos.test.ts answered questions stop counting as unread
- **V12** When the person clicks a Mac notification that came from a stored notice, Atril shall mark that notice read; a grouped notification, or W179's, shall mark read every stored notice id it carries. (Bug 2.)
  Proof: src/main/avisos.test.ts clicking the Mac notice marks its notice read

## Approach

### Summary

Tres piezas. **Avisos** (`src/main/avisos.ts`) gana los ajustes (`readNotifySettings`, `patchNotifySettings` sobre `notifications.json`), la decisión pura `route()`, los tipos nuevos, `detail`, la caducidad y fusionada/cerrada; `add` devuelve los ids creados para que main los ate al globo. **Main** (`src/main/notify.ts`, nuevo, más `status.ts`, `usage.ts`, `radar.ts`, `qa-report.ts`, `forge/outcome.ts`, `mrpoll.ts`, el gancho e `index.ts`) detecta cada tipo, pregunta a `route()` y, si sale `mac`, monta el `Notification` con título del trabajo, acciones, agrupación y conjunto acotado. La ventana solo gana la API `notify.*`; sus pantallas van en `notify-ui`.

### Technical context

- `src/main/avisos.ts`: `createAvisos` con cola serializada y `avisos.json`; `diff()` compara listados; `onNeedsYou` añade `agent`.
- `src/main/status.ts`: `createStatus` sondea cada 2 s y por `fs.watch`; `shouldNotify(prev, next)`; la primera pasada solo registra; `notificationBody` lee `state/<session>.json`.
- `src/main/focus.ts`: `showsNotification`, `createNotifyGate` (W78).
- `src/main/index.ts` 682–720: el único `new Notification` con respuesta (N3), clic (W38), conjunto `shown`.
- `src/main/usage.ts`: `createUsage` con `emit` cada 60 s; `src/main/radar.ts`: `radar(run)` pedido por `atril:radar:get` cada 10 s desde `src/renderer/radar.ts`; `src/main/qa-report.ts`: `readEntries`, `readCriteria`; `src/main/qa.ts`: `launchQa`.
- `src/main/forge/lenses.ts` `fixCi(url)` (M30); `src/main/forge/openmr.ts` `workFor`; `src/renderer/components/WorkspaceList.tsx` confirmación de cierre (W136).
- `resources/claude-hook.mjs` 186–194: escribe el estado; ya calcula `idle`.
- `src/renderer/settings/Ajustes.tsx` y `Language.tsx` (patrón de tarjeta); `src/renderer/components/Problem.tsx` (regla de errores); `src/preload/api.ts` (`Aviso`, `AvisoKind`, nueva `NotifySettings`, `NotifyApi`).
- Boceto: `bocetos/fase1-nucleo.html` líneas 2268–2350 (la tarjeta, sus textos y su comportamiento, fuente de verdad del diseño).

### The approach

1. **Avisos primero, todo puro y probado:** `NotifySettings` + `clean`, `route()`, quiet hours (`inQuiet(now, quiet)`), `diff()` con `ciSettled` en la referencia y `branch` guardada, `outcome` inyectado, `onAgent(ws, kind, detail)`, `expire(workspaceId)`, `markRead` devuelve ids.
2. **Detectores en main, cada uno una función pura que compara antes/después** (`stoppedNow`, `idleDue`, `clashesNew`, `quotaCrossed`, `qaFinished`) para probarla sin tmux, y un cableado mínimo en `index.ts`.
3. **`notify.ts`** reúne la presentación: `present(notice)` → opciones de `Notification` (título, subtítulo, cuerpo, `hasReply`, `actions`), `createGrouper({ now, show, windowMs: 120_000 })`, `createShown(max 50)`, `parseNcprefs(xml, bundleId)`.
4. **Mecanismos que la revisión pidió por escrito:**
   - W176: `status` guarda en memoria el último texto del estado por sesión (ya lo lee para el cuerpo en cada pasada) y compara el prefijo en cada pasada mientras sigue en `needs-you`.
   - W181: `launchQa` apunta en memoria la hora de lanzamiento por trabajo; `qaFinished` lee `readCriteria` del cambio y `report.json` solo si su `mtime` es posterior.
   - Acciones del globo: cada `Notification` cierra sobre los ids de sus avisos; `action`, `click` y `reply` usan esos ids, sin tabla de correspondencias.
   - W184 GitLab: el id es la ruta del proyecto sacada de la URL y codificada con `encodeURIComponent`.
   - W185: `lastMrs` de `index.ts` es la única hora de último listado; la ventana y `mrpoll` la escriben al terminar un listado.
5. **API para `notify-ui`:** `notify.get/set/test/permission/openSystem` por IPC y preload, sin pantalla todavía.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Ajustes dentro de `ui.json` | `clean` tira campos desconocidos y `patchUi` ya fusiona `folded` a mano; un tercer objeto anidado complica el archivo que más se toca |
| Campo `kind` nuevo en el estado del gancho | el prefijo del texto ya lo dice y los estados de hoy siguen valiendo |
| Distinguir fusionada/cerrada sin petición | el listado solo trae MR abiertas: sin petición no hay forma |
| Agrupar por trabajo con `groupId` de macOS | Electron no lo ofrece en macOS de forma fiable; el agrupado propio se prueba |
| Sondear el radar en main siempre | `git diff` de cada trabajo cada pocos segundos sin nadie mirando |

### Risks

| Risk | Mitigation |
|---|---|
| El bit 25 de `ncprefs` no significa «permitido» en la versión de macOS de Pau | `parseNcprefs` devuelve `unknown` ante cualquier duda; se prueba en la QA con avisos activados y desactivados a mano |
| Las acciones del globo (`actions`) solo se ven con estilo «Alertas» o al pasar el ratón | el clic sigue abriendo lo mismo; la acción es un atajo |
| La petición de fusionada/cerrada falla o tarda | tope de 10 y timeout de 10 s; si falla, «Ya no está abierta» de hoy |
| `guards.openable` rechaza una URL que ya no está en el listado | al crear un aviso de MR, su URL entra en lo que `openable` acepta |
| El sondeo de main duplica peticiones con el de la ventana | main solo lista si el último listado tiene más de 5 min |
| Tests de tiempo inestables | relojes inyectados (`now`) en grouper, idle y quiet; nada de `sleep` |

### Validation and rollback

Tests en rojo primero, caja por caja. Después, la app real con el arnés de `bocetos/notificaciones.md` (ATRIL_HOME temporal, socket propio, `claude` falso, estados escritos a mano, `fakenet.mjs` para las forjas): cada tipo provocado, Avisos y `notifications.json` comprobados, la tarjeta manejada con Playwright, foto en `bocetos/novedades/notificaciones.png`. El globo del Mac no se ve por CDP: se registra lo que `present()` construye en el log de dev. Rollback: un revert; `notifications.json` sobrante no molesta a una versión anterior.

### Complexity deliberately kept

- El agrupador con su ventana de 120 s: lo pide la tarjeta y es la defensa contra 3 agentes a la vez.
- Una petición por MR desaparecida: sin ella «Fusionada o cerrada» no puede existir.

## Checklist

- [x] `NotifySettings` en `api.ts`; `readNotifySettings`/`patchNotifySettings` con limpieza y escritura atómica · Closes: V7, V8
- [ ] `route()` e `inQuiet()` puros · waits on box 1 · Closes: V10, W190
- [ ] `diff()`: estado de CI asentado, `cipass`, `branch` en la referencia, `outcome` inyectado; los silenciados mueven las referencias · Closes: V1, V16, V17
- [ ] `src/main/forge/outcome.ts`: una petición por MR que sale de Mías, tope 10, timeout 10 s, id de GitLab por ruta, sin petición si `merged` está en «Nada» · waits on box 3 · Closes: W184
- [ ] `onAgent` con `ask`/`done` y `detail`; «Nada» no guarda; `expire`; ids devueltos y marcado por clic · waits on box 2 · Closes: V3, V9, V11, V12
- [ ] Gancho: el recordatorio de inactividad conserva texto, opciones y hora · Closes: W195
- [ ] `status.ts`: tipo por prefijo, pregunta nueva en la misma espera, parado (uno o agrupado por pasada, sin los que Atril cierra), espera de N min · waits on boxes 5, 6 · Closes: W15, W176, W178, W179, W180
- [ ] Detectores: `qaFinished` (QA), `clashesNew` (radar), `quotaCrossed` (cuota) y su cableado · waits on box 5 · Closes: W181, W182, W183
- [ ] `src/main/mrpoll.ts` con `lastMrs` compartido · Closes: W185
- [ ] `src/main/notify.ts`: `present()` con títulos del trabajo y acciones; respuesta con número; conjunto acotado y aviso de fallo retenido · waits on boxes 2, 5 · Closes: W177, N3, W186, W187, W188, W191, W194
- [ ] Agrupador de 120 s que vuelve a enrutar al soltar, y foco según el ajuste · waits on box 10 · Closes: W189, W78
- [ ] Permiso de macOS (`parseNcprefs`), abrir Ajustes del Sistema, aviso de prueba, IPC y preload `notify.*`; una línea en `bocetos/qa-final.html` para comprobar el bit 25 con avisos activados y desactivados · waits on box 10 · Closes: W192, W193
- [ ] Entradas en inglés de los textos de main; escaneos S16/S19 en verde; prueba en la app real (arnés de `bocetos/notificaciones.md`, `present()` registrado en el log de dev); `bocetos/novedades.html` y `bocetos/notificaciones.md` con los bugs cerrados · waits on boxes 1–12
