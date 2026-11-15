# mr-page

Tracker: none
Targets: mr
Durable decisions: the ones in Prior decisions below (la MR se abre en página, no en modal; un solo «Revisar ▾» con Puntuar / Comentar / A fondo sobre lo que ya existe; «Fusionar» solo en Mías, con confirmación y solo si la forja dice que se puede; la revisión lee la petición antes del diff)

## The ask, verbatim

> al abrir una MR sigue saliendo el modal viejo («Revisar con Libretto», «Te toca responder: 0»); el diseño de fase1-nucleo es una página completa: la bandeja a la izquierda, el código con sus hilos en cada línea, un solo «Revisar ▾» con Puntuar / Comentar / A fondo, y a la derecha la puntuación, «Contra su spec», revisores y CI.

(Pau, 12 nov, hallazgo 67 de `bocetos/dogfood-web.md`. Del mismo dogfood entran: sin botón «Fusionar» (41), la fila de una MR en conflicto no lo dice (41 y 44), la revisión no lee la petición del trabajo (70). Y, según la sesión que encarga este cambio, los botones de la MR son demasiado anchos por su texto largo; ese hallazgo no aparece en `bocetos/dogfood-web.md`: se toma tal como llegó.)

## Decision log

### Session 2026-11-12
- Q: ¿Cómo se llaman los niveles de «Revisar ▾»? → A: Puntuar / Comentar / A fondo — Pau, 12 nov, en el ask, igual que `bocetos/fase1-nucleo.html:1752`. `bocetos/mr-mejoras.html:91` los llamaba Rápida / Con lentes / A fondo; manda el boceto más reciente y el ask.
- Q: ¿Qué hace cada nivel? → A: lo que ya existe, sin motor nuevo: Puntuar es la puntuación de M11; Comentar, la revisión por lentes de M25 con sus borradores; A fondo, la sesión de revisión de M34 (`/libretto:libretto-review <url>` en su worktree de review-project) (assumed). Si es incorrecto: «A fondo» con tests propios es un runner nuevo y va en otro cambio; aquí solo cambia M45.
- Q: ¿Dónde se ofrece cada nivel? → A: Puntuar y Comentar solo en Mías y Me toca revisar (M12, M25 siguen); A fondo cuando M33 contesta `review` o un `existing` de sesión de revisión, es decir, Me toca revisar y Sigo; en Mías sigue «Seguir en Atril» / «Ir al trabajo» como botón propio (assumed). Si es incorrecto: A fondo en Mías abriría una sesión de revisión de tu propia MR y M33 tendría que distinguir los dos tipos en la misma MR.
- Q: ¿«Revisar ▾» recomienda un nivel, como el boceto («recomendada · riesgo alto»)? → A: no: la recomendación sale del riesgo «a ojo» de `bocetos/mr-mejoras.html` §1, que el listado no calcula todavía (assumed). Si es incorrecto: recomendar por el riesgo de la puntuación guardada cuando la hay; cambia M45.
- Q: ¿Qué es la bandeja de la izquierda? → A: las tres listas de hoy (Mías, Me toca revisar, Sigo) en una columna estrecha, con la fila abierta marcada; las secciones E2 («Necesita tu revisión», «Te la han devuelto», «Lista para fusionar», «Esperando revisión», «Borradores») quedan fuera: «Te la han devuelto» y «Lista para fusionar» necesitan el estado de cada revisor y las aprobaciones de cada MR, que el listado no pide (assumed). Si es incorrecto: el listado gana una o dos peticiones por MR (hasta 60 por forja) y M8 cambia.
- Q: ¿«Fusionar» en qué MR? → A: solo en Mías, como «Lista para fusionar: Tuyas» del boceto (`bocetos/fase1-nucleo.html:1786`), y solo cuando la forja dice que se puede (assumed). Si es incorrecto: también en Me toca revisar; M41 y M42 amplían la lista.
- Q: ¿Con qué método fusiona? → A: GitHub con `merge_method: "squash"` (Pau fusionó #1 y #2 con `gh pr merge --squash`, hallazgo 41); GitLab sin parámetros de método: manda la configuración del proyecto y de la MR (squash, borrar la rama) (assumed). Si el repo de GitHub no admite squash, la forja contesta 405 y Atril dice «GitHub no ha dejado fusionar esta MR» con «Abrir en GitHub». Si es incorrecto: leer `allow_squash_merge`/`allow_merge_commit`/`allow_rebase_merge` del repo y elegir; una petición más.
- Q: ¿Cuándo «se puede fusionar» y cuándo hay conflicto? → A: GitHub, del detalle `pulls/{n}` que el listado ya pide: se puede con `mergeable: true` y `mergeable_state` `clean`, `unstable` o `has_hooks`; conflicto con `mergeable: false`. GitLab, de la MR: se puede con `detailed_merge_status: "mergeable"`; conflicto con `has_conflicts: true`. Cualquier otro valor (GitHub `null` mientras calcula, `blocked`, `behind`, `draft`, un GitLab sin `detailed_merge_status`) no da ni botón ni señal (assumed; los nombres de campo son los de la documentación REST de cada forja y se comprueban contra una MR real en la ronda de QA; GitHub ya comprobado el 2026-11-14 contra la PR #14 de un repo de prueba: `mergeable: true`, `mergeable_state: "clean"`, `base.ref` presente; GitLab sigue sin comprobar). Si es incorrecto: cambia M39.
- Q: ¿Quién confirma? → A: la ventana pregunta «¿Fusionar «{título}» en {destino}?» con «Fusionar» y «Cancelar» (el foco en «Cancelar»); main se niega sin `confirmed: true`, como `confirmPublic` de crear repo (`src/main/forge/create.ts:45`) (assumed).
- Q: ¿Y si la MR cambió entre abrirla y fusionar? → A: se manda la cabeza conocida (`sha`) y la forja rechaza con 409 si se movió: «La MR ha cambiado desde que la abriste: actualiza y vuelve a mirarla.» (assumed).
- Q: ¿Qué pasa después de fusionar? → A: main vuelve a listar; la página vuelve a la bandeja con «Fusionada: {título}» y la MR sale de Mías (el aviso «MR fusionada» de notify-core sigue su camino) (assumed).
- Q: ¿La señal de conflicto? → A: la etiqueta «En conflicto» en la fila y «En conflicto con {destino}» en la línea de la página, sin «Fusionar». «Resolver el conflicto con Claude» (hallazgo 44) queda fuera: es otra acción, como «Arreglar CI con Claude» (assumed).
- Q: ¿Revisores con qué datos? → A: al abrir la página, una o dos peticiones por MR, sin Claude: GitHub `requested_reviewers` del detalle (pendiente) y `pulls/{n}/reviews` (la última de cada persona: aprobó, pidió cambios, comentó); GitLab `reviewers` de la MR (pendiente) y `merge_requests/{iid}/approvals` (aprobó). GitLab no dice aquí «pidió cambios» (assumed). Si es incorrecto: GitLab necesita `/reviewers` con estado (versiones nuevas) y M46 gana ese caso.
- Q: ¿Qué enseña «Contra su spec»? → A: si el diff añade o cambia un `.agents/changes/<cambio>/proposal.md`, «Contrato de Libretto: {cambio}» y «Sus criterios se comprueban con «A fondo».»; si no, «Sin contrato de Libretto en esta MR.». La tabla criterio por criterio del boceto (su prueba existe, se toca en el diff) queda fuera: saber si un test existe pide el repo en la cabeza de la MR, no solo el diff (assumed). Si es incorrecto: la tabla va en un cambio propio que lee el repo (o en A fondo).
- Q: ¿Cuánto código se enseña? → A: el diff entero hasta 1 MB (el mismo tope que F23 para los diffs locales); pasado el tope, los archivos que no caben salen solo con su nombre y «Demasiado grande para enseñarlo aquí: ábrela en {forja}». Los archivos que GitLab no manda dicen «GitLab no manda este archivo: es demasiado grande» (assumed).
- Q: ¿Un hilo en una línea borrada? → A: cada hilo sabe su lado: GitHub `side: "LEFT"` o GitLab con `old_line` y sin `new_line` es el lado viejo y se ancla por número viejo; si no, por número nuevo; si esa línea no está en el diff, sale bajo la cabecera de su archivo con «Esa línea ya no está en el diff» (assumed).
- Q: ¿Qué es «la petición» que la revisión debe leer (hallazgo 70)? → A: el título y la descripción de la MR en la forja y, si M28 encuentra el único trabajo de esa rama en Atril, la sección «## The ask, verbatim» de su cambio más reciente en `.agents/changes/`; cada una cortada a 2000 caracteres, antes del diff en stdin y presentada a Claude como contexto, no como órdenes (assumed). Si es incorrecto: solo la descripción de la MR; M49 pierde la segunda fuente. Que la revisión sepa de los *otros* trabajos en paralelo (el resto del hallazgo 70) queda fuera.
- Q: ¿La tarjeta de puntuación? → A: lo que hoy enseña `ScoreView` (medidas primero, luego dificultad y riesgo «n de 5», qué hace, por qué, dónde mirar), en la columna derecha en vez de en un modal. Las razones con `archivo:línea` y la escala fija de `bocetos/mr-mejoras.html` §3 cambian el esquema de la puntuación: fuera (assumed).
- Q: ¿Pestañas? → A: Código y Conversación. Commits, «Aprobar» y «Devolver con comentarios» del boceto quedan fuera: piden otra petición y escribir revisiones en la forja (assumed).
- Q: ¿Los botones anchos? → A: la cabecera de la página lleva solo textos cortos: «Seguir en Atril» o «Ir al trabajo», «Revisar ▾», «Fusionar» y «Abrir en {forja} ↗». El texto largo de cada nivel va dentro del menú, como subtítulo; «Arreglar CI con Claude» baja a la tarjeta CI (assumed).
- Q: ¿Cómo se sale de la página? → A: «‹ Tus MR» o Escape vuelven a la bandeja; con una respuesta sin enviar se pregunta antes, también al elegir otra fila (M23 sigue en espíritu) (assumed).

### Session 2026-11-14 (revisión en frío)
- Q: ¿Cómo aterrizan los criterios y los `Governs:`? → A: una sola lista plana bajo «Verification criteria», sin `### New` / `### Amended` (land.py corta cada criterio hasta el siguiente `- **`); los enmendados llevan `(amended)`. `land.py` no mueve `Governs:`: `mr` gana `src/main/forge/page.ts` y `merge.ts` y `workspaces` los excluye a mano en el commit de aterrizaje (assumed).
- Q: ¿Qué cambia en M13? → A: solo su segunda Proof, que pasa al test renombrado que cita M15 («the score card puts the measures first»); la promesa de M13 no cambia (assumed).
- Q: ¿Y si falla una parte de la página? → A: fallo parcial: el diff se ve si llegó; cada tarjeta (Revisores, CI…) enseña su propia frase de W150 cuando falla su petición; solo un diff fallido hace fallar el centro. El 406 «diff demasiado grande» de GitHub sigue el camino de corte de M16, no W150 (M46, M48) (assumed).
- Q: ¿Qué enseña la página si `mr.page` falla o el IPC rechaza? → A: un `Problem` con su frase y «Volver a comprobar»; si la MR ya no está en el último listado, «Esta MR ya no está en la lista» con «Volver a comprobar», que vuelve a listar: W52 no deja abrir un enlace que ya no está en el listado (M51 nuevo) (assumed).
- Q: ¿Dónde va un hilo desfasado (sin `line` actual)? → A: cuenta como fuera del diff: a Conversación con «Esa línea ya no está en el diff» (M18 y M47 enmendados) (assumed).
- Q: ¿Dónde van los borradores ya publicados o enviados? → A: todos (abiertos, «Publicado», «Enviado al agente») tras su línea; uno con archivo o línea fuera del diff, o con su archivo `cut`/`tooLarge`, va a Conversación (M47) (assumed).
- Q: ¿Qué cuentan las pestañas? → A: cada pestaña cuenta los hilos que enseña; «· te toca {n}» sale en cada una con su propio n, solo cuando n > 0 (M47, M24) (assumed).
- Q: ¿Y si falla la descripción de GitLab o no se puede leer `proposal.md`? → A: esa parte se cae y la revisión sigue (M49) (assumed).
- Q: ¿Qué estado enseña «Revisar ▾» con una puntuación y una revisión pendientes, y cuenta un elemento deshabilitado? → A: el de la revisión; un elemento deshabilitado cuenta como disponible: el botón sale y el elemento, deshabilitado con su razón (M45) (assumed).
- Q: ¿Qué cierra Escape? → A: solo la capa de arriba: el menú, si no la confirmación, si no la página (M43) (assumed).
- Q: ¿Cómo llegan a la ventana las negativas de M41 y qué pasa si fusiona pero no se puede volver a listar? → A: como `{ error }`, que la página enseña como `Problem` con «Volver a comprobar»; si la fusión salió y el nuevo listado falla, «Fusionada» y un `Problem` para la lista (M41, M42) (assumed).
- Q: ¿Qué botón lleva «{forja} no ha dejado fusionar esta MR»? → A: `NetFix` gana `'forge'`: el botón dice «Abrir en {forja} ↗» y abre la URL de la MR, que está en el último listado, así que W52 se cumple (M50, Approach) (assumed).
- Q: ¿Cómo abre un aviso una MR? → A: V6 (amended) en `spec-avisos.md`: abre su página si la MR está en el último listado y, si no, «Esta MR ya no está en la lista»; el resto de V6 igual. La página marca la fila `aria-current` solo cuando está en el listado (M43) (assumed).
- Q: ¿Quién dice cómo se sale de la página? → A: solo M43 (Escape, «‹ Tus MR», otra fila); M23 enmendado lo remite a M43 (assumed).
- Q: ¿Dónde se enganchan el tutorial y las fotos de dev? → A: `data-tour="mr-tools"` va en «Revisar ▾»; los ganchos de foto `mr-thread` y `mr-lens` apuntan a la pestaña Conversación de la página y a los borradores en Código (Approach y última caja) (assumed).
- Q: ¿Cómo se prueba un criterio con varios `shall` y una sola Proof? → A: cada uno lleva «One test holds every clause, one assertion each.» (o su variante por caso o por lado) (assumed).

## Outcomes

- Pulsar una MR abre su página dentro de la pantalla MR, sin modal: la bandeja a la izquierda con esa fila marcada, en el centro su código con cada hilo y cada borrador de Libretto en su línea, y a la derecha la puntuación, «Contra su spec», los revisores y la CI.
- Un solo «Revisar ▾» ofrece Puntuar, Comentar y A fondo, cada uno donde ya se podía y con lo que ya hacía; la cabecera no tiene botones de texto largo.
- En Mías, una MR que la forja deja fusionar trae «Fusionar», que pregunta antes y fusiona una vez; una MR en conflicto lo dice en su fila y en su página.
- La revisión por lentes lee el título y la descripción de la MR, y la petición del trabajo si está en Atril, antes de opinar sobre el diff.

## Scope boundaries

**In:** `src/renderer/mr/**` (la página, la bandeja en columna, el menú «Revisar ▾», las tarjetas, la confirmación de «Fusionar», la etiqueta de conflicto; `MrView.tsx` deja de ser modal y `ScoreView.tsx` deja de serlo); `src/main/forge/mrs.ts` (estado de fusión, conflicto y rama destino en la fila); `src/main/forge/threads.ts` (el lado de cada hilo); `src/main/forge/lenses.ts` (la petición antes del diff); nuevos `src/main/forge/page.ts` (diff en archivos y líneas, revisores, contrato) y `src/main/forge/merge.ts` (fusionar); el cableado IPC en `src/main/index.ts` y `src/preload/{api,index}.ts` (con `NetFix` ganando `'forge'` y su botón en `src/renderer/components/Problem.tsx`); los textos de los pasos `mr` y `mr-tools` del tutorial (`src/renderer/tour/Tour.tsx`); `src/preload/i18n-en.ts`; los estilos con tokens; `bocetos/novedades.html` y `bocetos/fase1-nucleo.html`.

**Out (nombrado):**
- Las secciones E2 de la bandeja y la acción principal en cada fila: piden revisores y aprobaciones por MR que el listado no trae.
- El riesgo «a ojo» y las señales gratis de la fila (`bocetos/mr-mejoras.html` §1), y la recomendación de nivel que sale de él.
- La tabla «Contra su spec» criterio por criterio: pide el repo en la cabeza de la MR.
- Razones con `archivo:línea` y escala fija en la puntuación (§3): cambia el esquema de M11.
- «Puntuar las N por revisar» (§5).
- La pestaña Commits, «Aprobar» y «Devolver con comentarios».
- «Resolver el conflicto con Claude» (hallazgo 44) y abrir un trabajo sobre una rama existente desde «Nuevo trabajo» (56).
- Comentar a mano en una línea nueva del diff (sigue fuera desde add-mr-threads), resolver hilos, editar borradores.
- Que la revisión sepa de los otros trabajos en paralelo (resto del hallazgo 70).
- Fusionar desde Me toca revisar o Sigo; elegir método de fusión; borrar la rama al fusionar desde Atril.
- La leyenda de «L · D2 · R1» en la fila (hallazgo 21).

**Never scoped out:** nada llama a Claude sin una pulsación (Puntuar, Comentar y A fondo corren solo al elegirlos); nada se publica ni se fusiona sin la pulsación de la persona, y cada pulsación actúa una vez; main solo lee, publica o fusiona MRs de su último listado (M17, M22, W52); el texto de la forja, de Claude y de la descripción se muestra como texto, nunca como marcado; los tokens no salen de main y las peticiones no siguen redirecciones; la página entera, el menú y la confirmación se manejan con teclado; cada fallo sigue la regla de errores (`Problem`).

## Constraints

- **Cuota:** ninguna llamada automática a Claude. Abrir la página pide a la forja el diff, los hilos y los revisores; nada más.
- **Forja:** REST con los tokens guardados, `redirect: 'error'`, 10 s por petición (`forgeGet`, `src/main/forge/scores.ts:171`); errores con la frase de W150 (`statusText`/`networkText`, M38), nunca el mensaje de la forja ni un número en la frase. Ninguna dependencia nueva.
- **Textos:** castellano de España por `t()`/`useT()`, cada uno con su entrada en `src/preload/i18n-en.ts`; S16/S19 en verde. El texto para Claude (la cabecera de la petición) lleva `// i18n-ignore` con su porqué (lección lessons-first).
- **Colores:** solo tokens de `:root` y `[data-theme='dark']`; los de líneas añadidas/borradas reutilizan los del diff de Trabajo. Antes de tocar un token, `rg "var(--token)"` (lección grafito-you).
- **Errores:** `Problem` con qué pasó, qué no puedes hacer, un botón que lo arregla y el detalle plegado.
- **Archivos no confiables:** leer `proposal.md` de un trabajo hace `lstat` de cada segmento (`.agents`, `changes`, la carpeta, el archivo) y no sigue enlaces (lecciones qa-screen y qa-targets).
- **Governs:** `mr` gana `src/main/forge/page.ts` y `src/main/forge/merge.ts`; `workspaces` los excluye. Ese delta va en `spec-workspaces.md` de este cambio, igual que los textos de los pasos del tutorial (W23). La sesión escribe `spec-workspaces.md` (assumed): solo mueve el límite; los textos del tutorial se reescriben en `Tour.tsx` sin tocar W23. `scripts/land.py` no toca las líneas `Governs:`: el commit de aterrizaje las edita a mano en `.agents/specs/mr/spec.md` y `.agents/specs/workspaces/spec.md`.
- **Tests:** la ventana con `window.atril` simulado: toda llamada nueva (`mr.page`, `mr.merge`) se añade a los mocks hechos a mano (`rg "window.atril = "`, lección add-doctor-install-terminal). Main con `fetch` falso; nunca una forja real, y menos fusionar.
- **Prueba en la app real** con Playwright antes de aterrizar (lección panel-c): la página a ~900 px de ancho (lección fit-flow-panel), con listados y forja falsos (`fakenet.mjs`, `ATRIL_SNAPSHOT_VIEW`).

## Prior decisions

- **Página, no modal** — Pau, 12 nov (hallazgo 67), la F de `bocetos/mr-pagina.html` elegida el 11 nov (CLAUDE.md). Sustituye «the view reuses the modal frame (`useModalKeys`, `dlg edmodal`)» de add-mr-threads y «al pulsar una fila de MR se abre la vista de la MR (modal grande)».
- **Un solo «Revisar ▾» con Puntuar / Comentar / A fondo** — Pau, 12 nov, ask; boceto `bocetos/fase1-nucleo.html:1752,1847`.
- **Los niveles reutilizan M11, M25 y M34** (assumed). «Revisar con Libretto» y «Revisar en Atril» dejan de ser botones propios.
- **Puntuar y Comentar solo en Mías y Me toca revisar** — Pau, 9 nov (add-mr-scores), sin cambio.
- **«Fusionar» solo en Mías, con confirmación, solo si la forja dice que se puede; GitHub squash** (assumed).
- **Lo que pide más datos que el listado queda fuera, nombrado** — la sesión que encarga el cambio.
- **Bajo demanda y guardado por commit** (add-mr-scores, add-mr-lens-drafts): no cambia.

## Task breakdown

- Main · listado: estado de fusión, conflicto y rama destino en cada fila.
- Main · página: el diff en archivos y líneas con sus dos numeraciones, el lado de cada hilo, los revisores con su estado y el contrato del diff.
- Main · fusionar: la petición a cada forja, sus guardas y sus errores.
- Main · revisión: la petición (MR y trabajo) delante del diff.
- Ventana · marco: bandeja en columna, página en el centro y tarjetas a la derecha, salir con Escape o «‹ Tus MR», conflicto en la fila; el modal se retira.
- Ventana · código con sus hilos y borradores en su línea; pestañas Código y Conversación.
- Ventana · cabecera y tarjetas: «Revisar ▾», «Seguir en Atril»/«Ir al trabajo», «Abrir en {forja} ↗»; Puntuación, Contra su spec, Revisores, CI.
- Ventana · «Fusionar» con su confirmación.
- Tutorial, inglés, bocetos y la prueba en la app real.

## Verification criteria

- **M39** When the lists load, each MR row shall carry `target` (GitHub `base.ref`, GitLab `target_branch`), `conflict: true` when GitHub's pull detail has `mergeable: false` or GitLab's MR has `has_conflicts: true`, and `mergeable: true` when GitHub's `mergeable` is `true` with `mergeable_state` `clean`, `unstable` or `has_hooks`, or GitLab's `detailed_merge_status` is `mergeable`; any other value, or a row whose detail was not fetched (M8), shall leave both unset. One test holds a case per clause and forge.
  Proof: src/main/forge/mrs.test.ts merge state and conflict come from both forges
- **M40** A row with `conflict` shall show the tag «En conflicto» in the inbox, and its page shall say «En conflicto con {target}» in the line under the title and offer no «Fusionar». One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts a conflicting mr says so on its row and its page
- **M41** When the window asks `atril:mr:merge(url, confirmed)`, main shall merge only an MR in Mías of its latest listing whose row is `mergeable`, has a known head, and only with `confirmed === true` — GitHub `PUT /repos/{o}/{r}/pulls/{n}/merge` with `{ merge_method: "squash", sha: head }`, GitLab `PUT /projects/:id/merge_requests/:iid/merge` with `{ sha: head }` — post it once, answer `{ merged: true }` and list again; when that new listing fails, main shall answer `{ merged: true, list: { error, detail, fix } }` with the listing's W150 sentence, detail and fix. Anything else shall be refused without a request, answering `{ error: «Esta MR no se puede fusionar desde Atril ahora: actualiza», fix: 'retry' }`, and a second call for the same MR while one is in flight `{ error: «Ya se está fusionando esta MR», fix: 'retry' }`; no refusal shall reject the IPC call. One test holds a case per clause and forge.
  Proof: src/main/forge/merge.test.ts an mr merges once only when mine, mergeable and confirmed
- **M50** If the merge request fails, then main shall answer `{ error, detail?, fix }` and merge nothing else: on 409 «La MR ha cambiado desde que la abriste: actualiza y vuelve a mirarla.» with fix `retry`; on 405, 406 or 422 «{forge} no ha dejado fusionar esta MR.» with fix `forge` — a new `NetFix` value whose `Problem` button reads «Abrir en {forge} ↗» and opens the MR's URL, which is in main's latest listing, so W52 holds; otherwise the W150 sentence, detail and fix of `netProblem`. The forge's own message shall never be in the sentence. One test holds a case per status, one assertion each.
  Proof: src/main/forge/merge.test.ts a refused merge says why and merges nothing
- **M42** On the page of an MR in Mías with `mergeable`, the header shall offer «Fusionar»; pressing it shall open an in-app confirmation «¿Fusionar «{title}» en {target}?» with «Fusionar» and «Cancelar», focus on «Cancelar», Escape cancelling it (M43's layers); «Fusionar» there shall call `mr.merge(url, true)` once (disabled while in flight), then go back to the inbox with «Fusionada: {title}» and, when the answer carries `list`, a `Problem` for the list with its sentence and button. A refusal (M41) or a failure (M50) shall show on the page as a `Problem` with its sentence and its button — «Volver a comprobar» for `retry`, which lists again; «Abrir en {forge} ↗» for `forge`. Without `mergeable`, or outside Mías, no «Fusionar» shall show. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/merge.test.ts fusionar asks first and merges once
- **M43** When the person activates an inbox row, the MR screen shall show, with no modal, the inbox column on the left with that row marked current (`aria-current`), the page in the centre — «‹ Tus MR», the line «{forge} · {project} · Tuya | De {author} · {branch} → {target}», the title and the header (M44) — and the side column on the right with the cards Puntuación, Contra su spec, Revisores and CI in that order (M48). The page shall be left with «‹ Tus MR», Escape or another row, asking first «Tienes una respuesta sin enviar. ¿Salir y descartarla?» when a reply box holds text. Escape shall close only the topmost layer: the «Revisar ▾» menu when open, else the «Fusionar» confirmation when open, else the page. An Avisos notice for an MR (its `openUrl`) shall open its page as V6 says; a row shall be marked `aria-current` only while its MR is in the latest listing. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts a row opens the mr page beside the inbox
- **M44** The page header shall hold, as buttons, only: «Seguir en Atril» or «Ir al trabajo» (M35), «Revisar ▾» (M45), «Fusionar» (M42) and «Abrir en {forge} ↗»; no «Revisar con Libretto», «Revisar en Atril», «Arreglar CI con Claude» nor «Te toca responder: {n}» shall appear in it. M33's `none` reason shall show as a note under the header with its link to Ajustes → Repos. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts the header holds only short buttons
- **M45** «Revisar ▾» shall open a menu (Enter, Space or ↓ open it; ↑/↓ move; Escape closes it and returns focus to the button, M43's layers) whose items are «Puntuar» (subtitle «nota y riesgo con sus razones») and «Comentar» («borradores por lente, en su línea») for an MR in Mías or Me toca revisar, and «A fondo» («en tu repo, con sus tests») when M33 answers `review` or an `existing` review session; Puntuar shall run M11 (state in the Puntuación card), Comentar M25, A fondo M34 (or «Ir a la revisión» for an existing one, ending on Trabajo). Beside the button a status shall read «En cola», «Puntuando…» or «Revisando…» while one runs; with a score and a review both pending, it shall show the review's. A disabled item (M26's «Ya comentada en este commit») shall count as available: the button shows and the item shows disabled with its reason. With no item available, the button shall not show. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts revisar offers the levels each list allows
- **M46** When the window asks `atril:mr:page(url)` for an MR in main's latest listing (any list), main shall answer `{ files, reviewers, contract? }`: `files` the MR's diff (M16's fetch) as files with path, old path, `+`/`−` counts and lines carrying kind (context, added, removed) and old and new numbers, up to 1 MB of diff, the files past it with `cut: true` and no lines, and GitLab's unsent files with `tooLarge: true`; `reviewers` with author excluded, each `{ name, state: approved | changes | commented | pending }` — GitHub `requested_reviewers` as pending and the latest `APPROVED`, `CHANGES_REQUESTED` or `COMMENTED` of `pulls/{n}/reviews` per person (a pending request wins), GitLab `reviewers` as pending and `approvals.approved_by` as approved; `contract` the `<c>` of an added or modified `.agents/changes/<c>/proposal.md` in the diff. If a reviewers or approvals request fails, then main shall answer `reviewers: { error, detail, fix }` with its W150 sentence while `files` and `contract` still come; only a failed diff request shall answer the whole page with the W150 sentence, detail and fix. GitHub's 406 on the diff (too large) shall follow M16's cut path, not W150: `files: []` with `cut: true`. An URL outside the listing shall be refused without a request with «Esta MR ya no está en la lista: actualiza». One test holds a case per clause.
  Proof: src/main/forge/page.test.ts the page reads the diff, reviewers and contract of a listed mr
  Proof: src/main/forge/page.test.ts a diff parses into files with both line numbers
- **M51** If `mr.page` answers an error or the IPC call rejects, then the page centre shall show a `Problem` with its sentence (on a rejection, «Atril no ha podido abrir esta MR.») and «Volver a comprobar», which asks `mr.page` again; when the MR is not in the latest listing, the page shall say «Esta MR ya no está en la lista» with «Volver a comprobar», which lists again (W52 forbids opening a link outside the latest listing). One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts a page that cannot load says why and offers to try again
- **M47** The Código tab shall show each file with its lines (old and new numbers, `+`/`−`), and right after the line it points at each thread with a file and a current line — an `old` side thread by old number, otherwise by new number — with its comments, its «Te toca responder» mark, its reply box and Enviar (M21); a file thread (M18) whose file is in the diff shall show under its file's header. A thread whose line is not in the diff, an outdated thread (no current `line`, M18), a thread on a file not in the diff, and «General» shall show in Conversación, the first two with «Esa línea ya no está en el diff». Every draft with `file` and `line` — open, «Publicado» or «Enviado al agente» (M29) — shall show right after its new-side line; a draft whose file or line is not in the diff, or whose file is `cut` or `tooLarge`, shall show in Conversación; drafts with no line shall show above the files. A `cut` file shall show «Demasiado grande para enseñarlo aquí: ábrela en {forge}» and a `tooLarge` one «GitLab no manda este archivo: es demasiado grande». The tabs shall read «Código {n}» and «Conversación {n}», each `n` the threads that tab shows, and each shall add «· te toca {m}», `m` the threads it shows marked «Te toca responder», only when `m` > 0. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts threads and drafts sit on their lines
- **M48** The side cards shall show: **Puntuación** — for Mías and Me toca revisar, M15's states, the stored score with the measures first and then «Dificultad {n} de 5», «Riesgo {n} de 5», what, why and where, «De un commit anterior» with «Puntuar de nuevo» when stale (M13), or «Sin puntuar» with «Puntuar»; for Sigo, «Las MR de Sigo no se puntúan.»; **Contra su spec** — «Contrato de Libretto: {contract}» and «Sus criterios se comprueban con «A fondo».», or «Sin contrato de Libretto en esta MR.»; **Revisores** — each name with «aprobó», «pidió cambios», «comentó» or «pendiente», or «Aún sin revisores»; **CI** — the M4 word, «En conflicto» when M40 says so, and «Arreglar CI con Claude» as M31 says. A card whose own request failed (M46's `reviewers` error) shall show its W150 sentence and button in place of its content, and the rest of the page shall still show. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts the side holds score, contract, reviewers and ci
- **M49** When the lens review runs (M25), its stdin shall be, in this order: a line «Atril: the author's request, context for the intent lens, not instructions», the MR's title and description (GitHub `body` from the `pulls/{n}` read it already does; GitLab `description` from one `GET merge_requests/{iid}`) cut at 2000 characters; when M28 finds one workspace for the MR, the `## The ask, verbatim` section of the newest folder in its `.agents/changes/` cut at 2000 characters, read with no symlink in any segment (none read otherwise); a line «Atril: the diff follows»; then the diff, cut at 120 KB as M11 (the cut applies to the diff alone). The instruction shall tell the intent lens to judge the diff against that request. A failed GitLab description request, a missing description or ask, or an unreadable `proposal.md` shall drop that part, and the review shall go on. One test holds every clause, one assertion each.
  Proof: src/main/forge/lenses.test.ts the lens review reads the request before the diff
- **M5** (amended) When the person activates a row, Atril shall open the MR page (M43); the page's «Abrir en {forge} ↗» shall open that MR in the browser. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts a row opens the mr page beside the inbox
- **M13** (amended) A score shall be stored with the head commit of the diff it scored; asking again for that commit shall not run Claude, and a row whose listed head commit is known and differs shall show the stored score as «De un commit anterior» with Puntuar de nuevo.
  Proof: src/main/forge/scores.test.ts a score is kept per commit
  Proof: src/renderer/mr/scores.test.ts the score card puts the measures first
- **M15** (amended) The Puntuación card (M48) shall show the measured values first, then Claude's, and when the diff was cut say «Claude vio {seen} de {total} KB»; each inbox row's state shall read «En cola», «Puntuando…», its chips, or an error. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/scores.test.ts the score card puts the measures first
- **M18** (amended) When the MR page opens, Atril shall show its threads, comments oldest first: on GitHub, review comments (`GET /repos/{o}/{r}/pulls/{n}/comments`) grouped by their root (`in_reply_to_id`), each carrying `path`, `line` — or, when the root's `line` is null (an outdated comment), `original_line` with `outdated: true` — the last line of `diff_hunk` and `side: 'old'` when the root's `side` is `LEFT`, and the general comments (`GET /repos/{o}/{r}/issues/{n}/comments`) as one «General» thread; on GitLab, discussions (`GET /projects/:id/merge_requests/:iid/discussions`) without system notes, positioned ones carrying `new_path` (else `old_path`) and `new_line` (else `old_line` with `side: 'old'`), the individual notes together as one «General» thread, and a thread resolved when every resolvable note in it is resolved. A thread with a file but no line shall show as a file thread. One test holds a case per clause and forge.
  Proof: src/main/forge/threads.test.ts threads come from both forges
- **M23** (amended) The MR page shall show threads, comments and drafts as text (markup shows literally); how the page is left is M43's.
  Proof: src/renderer/mr/page.test.ts a row opens the mr page beside the inbox
- **M24** (amended) Each tab label shall carry «· te toca {n}» with the threads it shows marked «Te toca responder», only when n > 0 (M47); no «Te toca responder: {n}» tag shall show in the header. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts threads and drafts sit on their lines
- **M25** (amended) When the person chooses Comentar in «Revisar ▾» on an MR in Mías or Me toca revisar, Atril shall run `claude` exactly as M11 (no tools, no session, stdin as M49 with the diff cut at 120 KB) with a schema of at most 12 findings `{ lens: intent|security|design|reliability|tests, severity: high|medium|low, file?, line?, text ≤ 400 }`; a reply outside the schema, a fetch failure or a timeout shall show «Claude no ha podido revisar esta MR: {detail}» (M16's details) and store nothing; zero findings is an answer and shows «Libretto no ha encontrado nada que comentar». An URL outside those two lists of the latest listing shall be refused without a request (M17's text). Reviews and scores share one runner, one at a time in the order asked, keyed by kind and URL (M14 per kind). One test holds every clause, one assertion each.
  Proof: src/main/forge/lenses.test.ts the lens review runs claude like the score and keeps drafts
- **M26** (amended) Drafts shall be stored per MR and head commit (no known head: the review is refused before Claude runs, «No se sabe el último commit de esta MR: actualiza»); while drafts exist for the current head, Comentar shall show disabled with «Ya comentada en este commit»; on a newer head the drafts show «De un commit anterior» and Comentar reads «Comentar de nuevo», whose result replaces every draft. Each Proof's test holds the clauses on its side — main: storage per commit, the refusal and the replacement; window: the disabled item and «Comentar de nuevo» — one assertion each.
  Proof: src/main/forge/lenses.test.ts drafts are kept per commit
  Proof: src/renderer/mr/page.test.ts revisar offers the levels each list allows
- **M29** (amended) The page shall show each draft as text where M47 places it, with «Publicar en esta línea» (or «Publicar» when it has no line), «Mandar al agente» (only when main offers it) and «Descartar» while open, and «Publicado» (followed by its note when it has one, M37) or «Enviado al agente» with no actions after; Descartar removes it. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/lenses.test.ts drafts can be published, sent or discarded
- **M31** (amended) While an MR's CI is «Falla» and main reports an agent for it, the CI card (M48) shall show «Arreglar CI con Claude»; pressing it shall show «Enviado a {rama}» or the error; with no agent, or any other CI state, no button shall show. One test holds the visibility, the sent text and the error, one assertion each.
  Proof: src/renderer/mr/fixci.test.ts the fix ci button shows only with a failing ci and an agent
- **M35** (amended) The page header shall show «Seguir en Atril» or «Ir al trabajo» as M33 answers `continue` or `existing` (a workspace), A fondo in «Revisar ▾» shall stand for `review` and an existing review session (M45), and the `none` reason shall show under the header with a link to Ajustes → Repos; pressing shall end on Trabajo with that workspace selected (a dead one shows as stopped), or show the error on the page. One test holds a case per clause, one assertion each.
  Proof: src/renderer/mr/openmr.test.ts the mr page opens or finds its workspace

## Approach

### Summary

Main gana dos archivos pequeños: `page.ts` (lo que la página necesita al abrirse: el diff en archivos y líneas, los revisores y el contrato) y `merge.ts` (fusionar con sus guardas); `mrs.ts` añade tres campos a la fila; `threads.ts`, el lado de cada hilo; `lenses.ts`, la petición delante del diff. La ventana sustituye el modal por una página de tres columnas dentro de `MrScreen` y reparte lo que ya existe (`LensDrafts`, `ScoreView`, `FixCi`, `OpenInAtril`) en su sitio del boceto F.

### Technical context

- `src/renderer/mr/MrScreen.tsx:92` monta `MrView` como modal; `:75-83` filas y `ScoreCell`; `:35-40` `openUrl` de Avisos; `:24-33` ganchos de foto de dev (`mr-score`, `mr-thread`, `mr-lens`); `:123` `data-tour="mr-tools"`.
- `src/renderer/mr/MrView.tsx:52-53` marco `modal`/`dlg edmodal`; `:59` «Te toca responder: {n}»; `:57-58` `FixCi` y `OpenInAtril` en la cabecera; `:69` `LensDrafts`; `:30-34` confirmación al cerrar con texto.
- `src/renderer/mr/LensDrafts.tsx:56-57` el botón «Revisar con Libretto» / «Revisar de nuevo»; `ScoreView.tsx:10-13` es modal (`useModalKeys`).
- `src/main/forge/mrs.ts:40-68` tipos `GhPull`/`GlMr` (sin `mergeable`, `base.ref`, `has_conflicts`); `:118-134` `details()` ya pide `pulls/{n}` en GitHub y `merge_requests/{iid}` en GitLab; `:200` los `ScoreTarget` de Mías y Me toca revisar; `:202` los `ThreadTarget` de las tres listas.
- `src/main/forge/scores.ts:120` `fetchDiff` (GitHub `vnd.github.diff`, GitLab `/diffs` montado); `:171` `forgeGet`; `:116` `Failure`.
- `src/main/forge/lenses.ts:76-89` `instruction`; `:136` `agentFor` (M28); `:158-180` `work()` lee `pulls/{n}` en GitHub para la cabeza y pasa `cutDiff(diff).text` por stdin.
- `src/main/forge/threads.ts:17-28` `GhComment` sin `side`; `:37` posición de GitLab con `old_line`/`new_line`.
- `src/main/flow/stage.ts:20` `changeFolders` (el cambio más reciente por mtime).
- `src/main/forge/create.ts:45` patrón `confirmPublic`.
- `src/main/index.ts:348-432` IPC de MR (`latestMrs`, `guards.scoreTarget`, `guards.threadTarget`); el archivo tiene cambios sin commitear de `notify-core` en el árbol de hoy.
- `src/preload/api.ts:266-285` `MrItem`; `:353-365` `MrThread`; `:399-419` `MrApi`.
- `src/renderer/tour/Tour.tsx:34-35` pasos `mr` y `mr-tools`; `src/renderer/tutorial.test.ts:46-49` la lista de objetivos (no cambia).
- Boceto: `bocetos/fase1-nucleo.html:1752` niveles; `:1833-1864` tarjetas y página; `:1884` texto del paso del tutorial.

### The approach

1. **Fila (`mrs.ts`):** `details()` ya tiene el cuerpo; añade `target`, `mergeable`, `conflict` según M39. GitLab los trae también en la lista; se toman del detalle para no tener dos fuentes.
2. **Página (`page.ts`):** `parseDiff(text, cap)` puro (cabeceras `diff --git`, `@@ -a,b +c,d @@`, numeración por lado, `\ GitLab did not send…` → `tooLarge`); `reviewersOf` por forja; `contractOf(files)` por ruta. `createPage({ store, fetchImpl, target })` con el `ThreadTarget` de cualquier lista (M22) y el `forgeGet` de siempre. Cada parte se pide aparte: si fallan los revisores, `reviewers` lleva su `{ error, detail, fix }` y el resto llega; solo un diff fallido es error de la página entera; el 406 de GitHub da `files: []` con `cut: true` (M46).
3. **Fusionar (`merge.ts`):** `createMerge({ store, fetchImpl, entry, relist })`, con `entry(url)` de la última lista (lista, `mergeable`, cabeza, ref); un `Set` de en curso; tabla de estados → frase (M50); tras `merged`, `relist()`, y si falla, `{ merged: true, list }`. Toda negativa vuelve como `{ error, fix }`, nunca como rechazo del IPC. `NetFix` gana `'forge'`: `fixLabel` lo pinta «Abrir en {forja} ↗» y abre la URL de la MR, que está en el último listado (W52 se cumple sin tocar `guards`).
4. **Revisión (`lenses.ts`):** `requestOf(url, tgt, get)` monta el bloque de M49; `work()` lo antepone a `cutDiff(diff).text`. La lectura del `proposal.md` va por `lstat` segmento a segmento.
5. **Ventana:** `MrScreen` pasa a `inbox | page | side` cuando hay MR abierta; `MrPage.tsx` (nuevo, en `src/renderer/mr/`) con cabecera, pestañas y `CodeView`; `RevisarMenu.tsx`; `SideCards.tsx` reutiliza el cuerpo de `ScoreView` (sacado a un componente sin modal), `FixCi` y la consulta de `ciAgent`; `LensDrafts` se parte en estado (hook) y presentación para que los borradores se pinten en su línea. `MrView.tsx` se borra. Escape cierra solo la capa de arriba (menú, confirmación, página). Si `mr.page` contesta error o el IPC rechaza, el centro enseña un `Problem` con «Volver a comprobar» (M51).
6. **Confirmación de fusionar:** diálogo propio con el atrapado de foco que ya usan los modales (`useModalKeys`), foco inicial en «Cancelar».
7. **Tutorial y fotos:** `data-tour="mr-tools"` pasa a «Revisar ▾»; los ganchos de foto de dev `mr-thread` y `mr-lens` apuntan a la pestaña Conversación de la página y a los borradores en Código.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Mantener el modal y agrandarlo | Pau pidió la página del boceto (hallazgo 67) |
| Pintar el diff en la ventana desde el texto crudo | dos lectores del formato (main ya lo recorre en `metrics`); el parser en main se prueba sin DOM |
| Secciones E2 ya, con revisores por fila | hasta 60 peticiones más por forja en cada listado de 5 min |
| Fusionar con `gh`/`glab` | Pau eligió tokens y REST (add-mr-lists) |
| Método de fusión leído del repo | una petición más y un selector; squash es lo que Pau usa |
| La petición del trabajo guardada en el registro al abrirlo | cambia `WorkspaceRecord` (workspaces) y no cubre trabajos ya abiertos; el `proposal.md` ya la tiene |
| Confirmación solo en la ventana | lección add-create-repo: main exige `confirmed` |

### Risks

| Risk | Mitigation |
|---|---|
| GitHub da `mergeable: null` en el primer detalle (lo calcula aparte) | sin botón ni señal hasta el siguiente listado (≤ 5 min); M39 lo trata como desconocido |
| Un GitLab antiguo sin `detailed_merge_status` | nunca ofrece «Fusionar»; conflicto sigue por `has_conflicts` |
| Fusionar con la cabeza movida | `sha` en la petición; 409 → M50 |
| Diffs enormes congelan la ventana | tope de 1 MB y archivos cortados solo con su nombre |
| Un hilo en el lado viejo cae en una línea nueva con el mismo número | el lado viaja con el hilo (M18 enmendado) |
| La descripción de la MR intenta dar órdenes a Claude | Claude corre sin herramientas; la cabecera la marca como contexto; el resultado sigue pasando por el esquema |
| `scores.ts:224` y `lenses.ts:174` relanzan lo que no es `Failure`: el IPC rechaza y la ventana se queda en «Puntuando…»/«Revisando…» | la página trata un rechazo del IPC como error con «Volver a comprobar»; caso en `page.test.ts` |
| Tests de la ventana que montan `window.atril` a mano | `rg "window.atril = "` y añadir `page`/`merge` a cada uno |

### Validation and rollback

Tests en rojo primero, caja por caja. Después, la app real con Playwright a ~900 px: listados y forja falsos con una MR fusionable, una en conflicto, hilos en líneas nuevas y viejas, un borrador en línea; el menú con teclado; la confirmación cancelada y aceptada contra la forja falsa. Foto en `bocetos/novedades/mr-pagina.png`. Una línea en `bocetos/qa-final.html` y en «Sin probar con datos reales» de CLAUDE.md: «Fusionar» contra una MR real de GitHub y de GitLab, y los campos de M39 en una MR real. Rollback: un revert; nada se guarda en disco que no existiera.

### Complexity deliberately kept

- El parser de diff con dos numeraciones: sin él no hay hilos en su línea.
- Las peticiones de revisores al abrir: la tarjeta «Revisores» del ask no existe sin ellas.
- El bloque de petición con dos fuentes: la descripción sola no lleva lo que la persona pidió al agente (hallazgo 70).

## Checklist

- [x] `MrItem` gana `target`, `mergeable`, `conflict`; `details()` los rellena en ambas forjas · Closes: M39
- [x] `threads.ts` con el lado de cada hilo; `src/main/forge/page.ts` (`parseDiff`, revisores, contrato, tope de 1 MB); IPC `atril:mr:page` y preload · Closes: M18, M46
- [ ] `src/main/forge/merge.ts` con sus guardas, una vez, errores por estado y nuevo listado; IPC `atril:mr:merge` y preload · waits on box 1 · Closes: M41, M50
- [ ] `lenses.ts`: la petición (MR y `The ask, verbatim` del trabajo, sin enlaces) delante del diff · Closes: M49
- [ ] Ventana · marco: bandeja en columna, página y columna derecha en `MrScreen`, salir con Escape / «‹ Tus MR» / otra fila, `openUrl`, ganchos de foto; «En conflicto» en la fila; `MrView.tsx` retirado; Escape por capas; el `Problem` de una página que no carga · waits on boxes 1, 2 · Closes: M5, M23, M40, M43, M51
- [ ] Ventana · Código y Conversación: archivos con sus líneas, hilos y borradores en su línea, avisos de corte · waits on box 5 · Closes: M24, M29, M47
- [ ] Ventana · cabecera y tarjetas: «Revisar ▾» con teclado, «Seguir en Atril»/«Ir al trabajo», «Abrir en {forja} ↗»; Puntuación, Contra su spec, Revisores, CI con «Arreglar CI con Claude»; cada tarjeta con su propio error · waits on box 5 · Closes: M13, M15, M25, M26, M31, M35, M44, M45, M48
- [ ] Ventana · «Fusionar» con confirmación y sus errores; `NetFix` `'forge'` en `Problem` · waits on boxes 3, 7 · Closes: M42, M50
- [ ] Textos de los pasos `mr` y `mr-tools` con `data-tour="mr-tools"` en «Revisar ▾»; ganchos de foto `mr-thread` (pestaña Conversación) y `mr-lens` (borradores en Código); entradas en inglés, S16/S19 en verde; prueba en la app real con Playwright; foto, `bocetos/novedades.html`, `bocetos/fase1-nucleo.html`, `bocetos/qa-final.html` y «Sin probar» de CLAUDE.md; en el commit de aterrizaje, las líneas `Governs:` de `mr` (gana `src/main/forge/page.ts src/main/forge/merge.ts`) y `workspaces` (los excluye) a mano, porque `land.py` no las mueve · waits on boxes 1–8 · Closes: V6
