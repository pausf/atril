# Avisos

Governs: src/main/avisos.ts src/renderer/avisos/**

A feed of what changed in your MRs and agents, derived from successive MR listings and agent
states, with no extra forge request.

## Outcomes

### Avisos (add-avisos, 9 nov 2026)

- The rail has **Avisos** with the number of unread notices. The screen lists them newest first —
  review requested, a new comment, CI failing, a new MR in what you follow, an MR no longer open,
  an MR you opened, an agent that needs you — each with its time, filterable by kind, and each
  opening its MR view, or its workspace for an agent.
- **Marcar todo leído** clears the unread count; opening a notice marks it read.

### Notificaciones (main) (notify-core, 12 nov 2026)

- Cada aviso dice de qué trabajo es en su título («WEB-3535 te pregunta», «OPS-4131 se ha parado»), no solo «Atril».
- Atril avisa también cuando un agente se para, cuando lleva N minutos esperándote, cuando dos trabajos tocan el mismo archivo, cuando termina la QA, cuando la CI vuelve a pasar, cuando una MR se fusiona o se cierra y cuando la cuota de Claude llega al 80 %; la CI que falla llega al Mac con «Arreglar con Claude».
- En Ajustes → Notificaciones eliges por tipo Mac / Solo Avisos / Nada, por grupos de golpe, los minutos del recordatorio, el modo foco, la agrupación y las horas de silencio; «Probar un aviso» saca uno de verdad, y si macOS no deja avisar te lo dice con «Abrir Ajustes del Sistema».
- Avisos deja de acumular preguntas ya contestadas, guarda lo que preguntaba el agente y se entera de las MR aunque la ventana esté cerrada.

## Scope boundaries

### Avisos (add-avisos, 9 nov 2026)

**In:** deriving notices from MR listings and agent states, storing the last 200, the screen, the
rail counter, filters, marking read. **Out:** notices from forge webhooks or the forges'
notification APIs, approvals (not in the listing data), Mac notifications for MR notices (only the
existing needs-you one), per-kind mute settings.

**Never scoped out:** no extra forge request; notice text built from Atril's own words plus the
MR's title as `{detail}`, shown as text; the screen is keyboard-operable.

### Notificaciones (main) (notify-core, 12 nov 2026)

**In:** los bugs 1–3 y 5–10 de de `bocetos/notificaciones.md` §«Huecos y bugs»; los tipos `stopped`, `idle`, `radar`, `qa`, `cipass`, `merged`/`closed` y `quota`, y `ask`/`done` separados; la CI que falla en el Mac con su acción; `$ATRIL_HOME/notifications.json`; la API `notify.*` que usará la tarjeta.

**Out (nombrado):** la tarjeta de Ajustes, la pantalla Avisos y el bug 4 (`notify-ui`); la app del móvil, Skills y «Afinar la petición» (otros cambios); el resumen al volver (idea 13); el contador del Dock (idea 14); «un revisor ha comentado» y «te han aprobado» (idea 10, piden datos que el listado no trae); «paso de Libretto listo» (idea 11); avisos de Jira o forja caídas (idea 12); el segundo aviso al 95 % de cuota; sonidos propios; avisos dentro de la app (*toasts*); el radar sondeado sin ventana.

**Never scoped out:** ningún aviso dispara una llamada a Claude; los textos de la forja y del agente se muestran como texto, nunca como HTML; la tarjeta se maneja entera con teclado (radios con flechas, interruptores con espacio); un fallo al guardar o al leer los permisos sigue la regla de errores.

## Constraints

### Avisos (add-avisos, 9 nov 2026)

- Uses add-mr-lists' listing and the status tracker; `MrItem` gains `notes?`.
- New capability `avisos`: `src/main/avisos.ts` and `src/renderer/avisos/**`.

### Notificaciones (main) (notify-core, 12 nov 2026)

- **Ninguna llamada automática a Claude.** «Arreglar con Claude» y «Reabrir» solo corren cuando la persona pulsa. La cuota sale del sondeo de `usage.ts` que ya existe; no se añade ninguno.
- **Textos:** castellano de España, por `t()` en main y `useT()` en la ventana, con su entrada en `src/preload/i18n-en.ts`; los escaneos S16/S19 deben seguir verdes. El idioma es el del momento de mostrar (W48).
- **Colores:** solo tokens de `:root` y `[data-theme='dark']`; la tarjeta usa gris + el acento (`--run`), como el boceto.
- **Errores:** frase de qué pasó y qué no puedes hacer, un botón que lo arregla y el detalle técnico plegado en «Ver detalle» (componente `Problem`).
- **Títulos:** el aviso del Mac de un trabajo lleva su nombre en el título — `jiraKey`, o la rama si no tiene — y el repo en el subtítulo; los de MR, la frase del tipo en el título y el título de la MR en el cuerpo.
- Escrituras atómicas (`.tmp` + `rename`) y serializadas, como `avisos.json` y `ui.json`.
- Tests con `ATRIL_HOME` temporal y su propio socket de tmux; nada de `~/.claude.json`, ni sesiones de tmux por defecto, ni repos reales.

## Prior decisions

### Avisos (add-avisos, 9 nov 2026)

- **A feed apart from the sidebar** — Pau, 9 nov: «debería haber como una sub pantalla … donde vaya
  llegando como notificaciones … publica una MR o tienes una nueva MR por mirar … en un apartado».
- **Derived, not fetched** (assumed).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| The forges' notification APIs | more requests and two very different shapes; the listing already has what matters |
| A Mac notification per MR event | noise; the needs-you one stays the only interruption |

#### Decision log, answers as given (2026-11-09)
- Q: «sigue con todo haz mejoras, nuevas features» — Pau, 9 nov → decisions taken with the recommended option, marked (assumed).
- Q: ¿De dónde salen los avisos? → A: de comparar cada carga de MR con la anterior y de los cambios de estado de los agentes; ninguna consulta extra a las forjas (assumed).
- Q: ¿Y la primera carga? → A: solo fija la referencia: no genera avisos (assumed).
- Q: ¿«Comentario nuevo»? → A: cuando sube el recuento de comentarios de una MR de Mías o Me toca revisar: GitHub `comments` de la búsqueda (siempre presente, misma fuente siempre), GitLab `user_notes_count`; tus propios comentarios también lo suben: límite nombrado (assumed).
- Q: (spec-reviewer) ¿Una lista recortada a 50? → A: esa lista de esa forja no da avisos de «nueva» ni de «ya no está» en esa carga (assumed).
- Q: (spec-reviewer) ¿Una MR en varias listas? → A: la referencia guarda el conjunto de listas de cada URL; las reglas de cada aviso dicen contra qué se comparan (assumed).
- Q: (spec-reviewer) ¿Trabajo borrado? → A: «Ese trabajo ya no está» (assumed).
- Q: ¿Cuántos se guardan? → A: los últimos 200, en `$ATRIL_HOME/avisos.json` (assumed).

### Notificaciones (main) (notify-core, 12 nov 2026)

- **Avisos más allá de «te necesita» al Mac** — Pau, 11 nov: «me gusta ya las notificaciones y todo». Sustituye a «Out: Mac notifications for MR notices … per-kind mute settings» de add-avisos (9 nov): ahora cada tipo elige.
- **`notifications.json` propio** en `$ATRIL_HOME`, no `ui.json` (assumed, ver Decision log). Un archivo ilegible o un campo inválido vale sus valores por defecto, como `ui.json`.
- **«Nada» ni interrumpe ni guarda** (assumed).
- **Una petición por MR que sale de Mías**, como mucho 10 por listado, para separar fusionada de cerrada (assumed). Techo: con más de 10 MR desaparecidas a la vez, las demás quedan como «Ya no está abierta».
- **El sondeo de MR pasa a main** (bug 10): main lista cada 5 min si nadie lo ha hecho, haya ventana o no; la ventana sigue pidiendo cuando quiere y eso cuenta como listado (assumed).
- **«Choca» solo con ventana** (assumed). Techo: con la ventana cerrada no hay choques; si Pau lo echa en falta, main sondea el radar cada minuto.
- **La espera de «Lleva N min» vive en memoria de main** (assumed). Techo: reabrir Atril la reinicia.
- **El permiso de macOS se lee de `com.apple.ncprefs`** (assumed). Techo: si Apple cambia el formato, el problema no se enseña nunca (falla hacia «no lo sé», no hacia un falso bloqueo).
- **Pregunta frente a fin de turno por prefijo del texto** (assumed): evita un campo nuevo en el estado; los archivos de estado de hoy siguen valiendo.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Ajustes dentro de `ui.json` | `clean` tira campos desconocidos y `patchUi` ya fusiona `folded` a mano; un tercer objeto anidado complica el archivo que más se toca |
| Campo `kind` nuevo en el estado del gancho | el prefijo del texto ya lo dice y los estados de hoy siguen valiendo |
| Distinguir fusionada/cerrada sin petición | el listado solo trae MR abiertas: sin petición no hay forma |
| Agrupar por trabajo con `groupId` de macOS | Electron no lo ofrece en macOS de forma fiable; el agrupado propio se prueba |
| Sondear el radar en main siempre | `git diff` de cada trabajo cada pocos segundos sin nadie mirando |

#### Decision log, answers as given (2026-11-12)
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

- Q: ¿Un tipo en «Nada» sigue moviendo las referencias (CI asentada, `notes`, Mías)? → A: sí, siempre; solo se descarta el aviso. La petición de W184 no se hace si `merged` está en «Nada» (assumed). Si es incorrecto: al quitar el silencio llegaría un aviso viejo.
- Q: ¿«Claude ha terminado» (fin de turno sin texto) es `ask` o `done`? → A: `done`; `ask` solo con «Te pregunta: », «Claude te necesita», sin texto u otro (assumed).
- Q: ¿Un aviso aguantado por el agrupador vuelve a mirar foco y silencio al salir? → A: sí; si al salir `route()` ya no dice `mac`, se queda solo en Avisos (assumed). Cumple W78: no llega al Mac más tarde.
- Q: ¿El aviso de W179 cuenta en la ventana de 120 s? → A: sí, como uno; si se aguanta, sus avisos entran en el grupo uno a uno (assumed).
- Q: ¿Quién prueba las ocho combinaciones del foco? → A: `focus.test.ts`, llamando a `route()`; V10 prueba Nada/Avisos y el silencio (assumed).
- Q: ¿Un `report.json` viejo cuenta como QA terminada? → A: no; cuenta solo si se modificó después del `launchQa`; sin criterios en el cambio, no hay aviso; reiniciar Atril desarma (assumed, techo nombrado).
- Q: ¿De dónde sale el id de proyecto de GitLab? → A: la ruta del proyecto de la URL, codificada (`acme%2Fshop-web`), que la API acepta como id (assumed).
- Q: ¿Quién guarda la hora del último listado? → A: `lastMrs` de `index.ts` (el que ya usa la QA a la MR); `mrpoll` lo lee y lo escribe (assumed).
- Q: ¿Partir el cambio? → A: sí, en dos: `notify-core` (main) y `notify-ui` (Ajustes y Avisos), como propuso la revisión (assumed).
- Q: (Pau, 12 nov) «para una tarea tan pequeña tengo 40 avisos… cuando tenga 200 no es gestionable» (en la prueba, 32 de 40 eran `agent` sin leer de solo 3 trabajos) → A: un solo aviso de agente sin leer por trabajo (V18), los leídos caducan a los 7 días con tope de 300 (V19, sustituye el tope de 200 de V4, que pasa a amended) y el contador cuenta trabajos, no avisos de agente (V20, calculado en la ventana: `src/renderer/avisos/Avisos.tsx`).
- Q: (Pau, 12 nov, comparando con Orca, cuyo contador «se limpia al visitar el trabajo») → A: abrir un trabajo marca leídos sus avisos de agente (V21); la ventana avisa a main con `avisos.seen(id)`.

## Task breakdown

## Verification criteria

### Avisos (add-avisos, 9 nov 2026)

- **V1** When an MR listing completes after a previous one, Atril shall add, with the MR title as detail: «Te piden revisión» (`review`) for an URL in Me toca revisar that was not there before; «Comentario nuevo» (`comment`) when the `notes` count of an MR in Mías or Me toca revisar is higher than before; «MR nueva en lo que sigues» (`following`) for an URL in Sigo that was in no list before; «Has abierto una MR» (`opened`) for an URL in Mías that was in no list before. A forge with an error in either listing, or a list cut at its cap (`more`), shall produce no notice of «new» or «gone» for that forge's rows of that list. One test holds the four kinds and both rules, one assertion per kind.
  Proof: src/main/avisos.test.ts listings turn into notices
- **V2** The first listing after Atril starts with no stored baseline shall produce no notice.
  Proof: src/main/avisos.test.ts the first listing only sets the baseline
- **V3** When an agent enters «te necesita» (once per entry, W15), Atril shall add a notice of kind `done` when the hook text starts with «Claude dice: » or is exactly «Claude ha terminado», and `ask` otherwise (starts with «Te pregunta: », is «Claude te necesita», is missing or anything else), titled with the work's name (`jiraKey`, else the branch), linked to its workspace, and carrying the hook text as `detail`.
  Proof: src/main/avisos.test.ts an agent that needs you is a notice
  Proof: src/main/avisos.test.ts a question and an end of turn are different kinds
- **V4** Atril shall keep the notices and the baseline in `$ATRIL_HOME/avisos.json` across restarts, bounded as V19 says: past 300, the oldest read go first, then the oldest unread.
  Proof: src/main/avisos.test.ts notices survive a restart and stay bounded
- **V5** The rail shall show «Avisos» with the number of unread stored notices when it is not zero;
  the screen shall list them newest first with kind, title and time, filter by kind, and «Marcar todo
  leído» shall clear the count.
  (The proof asserts the badge, the order, a filter hiding other kinds, and the count going to zero.)
  Proof: src/renderer/avisos/avisos.test.ts the feed lists, filters and marks read
- **V6** Opening a notice shall mark it read and: for `review`, `comment`, `ci`, `cipass`, `following` and `opened`, open its MR view when the MR is in the latest listing, otherwise say «Esta MR ya no está en la lista»; for `merged`, `closed` and `gone`, open the MR in its forge; for `ask`, `done`, `idle`, `stopped`, `qa`, `radar` and the stored legacy `agent`, open its workspace (for `qa`, its QA screen; for `radar`, the first of the two), or say «Ese trabajo ya no está» when it is gone; for `quota`, open nothing beyond marking it read.
  Proof: src/renderer/avisos/avisos.test.ts a notice opens what it is about
  Proof: src/renderer/avisos/avisos.test.ts merged, closed and gone open the forge
### Notificaciones (main) (notify-core, 12 nov 2026)

- **V16** When an MR listing completes, Atril shall add «La CI falla» (`ci`) for an MR in Mías whose last settled CI state (`pass` or `fail`, ignoring `running` and `none`) was `pass` and is now `fail`, and «La CI vuelve a pasar» (`cipass`) when it was `fail` and is now `pass`.
  Proof: src/main/avisos.test.ts ci fail and pass count the last settled state across running
- **V17** When an URL that was in Mías is in no list after a listing, Atril shall add «MR fusionada» (`merged`) or «MR cerrada» (`closed`) as W184 answers, or «Ya no está abierta» (`gone`) when it answers nothing.
  Proof: src/main/avisos.test.ts an MR leaving Mías is merged, closed or gone
- **V18** When Atril adds an `ask`, `done` or `idle` notice for a workspace that already has an unread `ask`, `done`, `idle` or legacy `agent` notice, it shall replace that notice (new kind, title, detail and time, unread, moved to the top) instead of adding another, so a workspace never holds more than one unread agent notice.
  Proof: src/main/avisos.test.ts one unread agent notice per workspace
- **V19** Avisos shall drop read notices older than 7 days and, past 300 stored notices, the oldest read ones first, whenever it writes.
  Proof: src/main/avisos.test.ts old read notices are dropped
- **V20** The Avisos badge count shall be the number of workspaces with an unread agent notice (`ask`, `done`, `idle`, legacy `agent`) plus the other unread notices, counted once per notice (so with V18 it never exceeds one per workspace for agents). The count is computed in the window (`src/renderer/avisos/Avisos.tsx`).
  Proof: src/renderer/avisos/avisos.test.ts the badge counts what waits for you
- **V21** When the person opens a workspace (selects it in Trabajo or its notice), Atril shall mark read every unread `ask`, `done`, `idle` and legacy `agent` notice of that workspace. The window tells main through `avisos.seen(workspaceId)`.
  Proof: src/main/avisos.test.ts opening a work reads its agent notices
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

### Notificaciones (Ajustes y Avisos) (notify-ui, 14 nov 2026)

- **V13** The Avisos screen shall show, under the title of an `ask` or `done` notice that has a `detail`, that text localised as the needs-you body is (S28), as plain text; a notice without `detail` shows its title alone. (Bug 4.)
  Proof: src/renderer/avisos/avisos.test.ts a question keeps what it asked
- **V14** The Avisos screen shall give each kind its own label — «te pregunta», «ha terminado su turno», «se ha parado», «te espera», «choca con otro trabajo», «QA terminada», «La CI vuelve a pasar», «MR fusionada», «MR cerrada», plus today's — and the kind filter shall list every kind present in the stored notices.
  Proof: src/renderer/avisos/avisos.test.ts every kind has its label and its filter
- **V15** Where a `merged` or `closed` notice's MR branch matches a non-review workspace of the same repo, the notice row shall offer «Cerrar su trabajo», which opens that workspace's close confirmation (W136) without closing anything by itself; with no matching workspace the button is absent.
  Proof: src/renderer/avisos/avisos.test.ts a merged MR offers to close its work
