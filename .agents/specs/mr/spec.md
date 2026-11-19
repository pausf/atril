# MR

Governs: src/main/forge/mrs.ts src/main/forge/page.ts src/main/forge/merge.ts src/main/forge/scores.ts src/main/forge/threads.ts src/main/forge/lenses.ts src/main/forge/openmr.ts src/main/forge/linecomments.ts src/renderer/mr/**

The MR screen: your merge requests on GitHub and GitLab, the ones you review, and the ones in
the projects you follow. Phase 2 of Atril; scores, threads and notifications build on it.

## Outcomes

### MR lists (add-mr-lists, 9 nov 2026)

- The rail has an **MR** screen with three lists — **Mías**, **Me toca revisar**, **Sigo** — mixing
  GitHub and GitLab, each row with title, project, author, CI, size and age; a row opens the MR in
  the browser. The rail shows how many MRs wait for your review.
- With no forge connected the screen says so and opens Ajustes; a forge that fails shows its error
  while what it did return, and the other forge, still show.

### MR scores (add-mr-scores, 9 nov 2026)

- Rows in **Mías** and **Me toca revisar** offer **Puntuar**. Scoring shows, first, what Atril
  measures itself — size S/M/L/XL, +/− lines, files, whether tests changed — and then Claude's
  view: difficulty and risk from 1 to 5, what the MR does, why those numbers, and where to look.
- A score is kept per MR commit and shown again without calling Claude; a newer commit marks it
  as from an earlier commit, with **Puntuar de nuevo**.

### MR threads (add-mr-threads, 9 nov 2026)

- Clicking an MR row opens the **MR view**: title, project, «Abrir en {forge}», and its threads
  — inline ones grouped by file and line with the code line they point at, general ones apart —
  each comment with author, time and text; GitLab threads say whether they are resolved.
- Threads where the last word is someone else's and you are involved are marked **Te toca
  responder** and counted in the view's header.
- Under each thread, a reply box and **Enviar** post the reply to the forge as you.

### Libretto lens drafts (add-mr-lens-drafts, 9 nov 2026)

- The MR view of an MR in Mías or Me toca revisar offers **Revisar con Libretto**. Claude Sonnet
  reads the diff through five lenses and returns findings; each shows as a **draft** with its lens,
  severity, file:line and text, and three actions: **Publicar** (a general comment on the MR that
  quotes the file and line), **Mandar al agente** (typed into the terminal of the workspace on that
  branch), **Descartar**.
- Drafts are kept per MR commit; a newer commit marks them as from an earlier commit.

### Arreglar CI con Claude (fix-ci-with-claude, 10 nov 2026)

- En una MR con CI «Falla» y su trabajo vivo en Atril, «Arreglar CI con Claude» escribe la petición en la
  terminal de ese agente y dice «Enviado a {rama}».
- Sin trabajo único en Atril, el botón no aparece.

### Abrir una MR en Atril (open-work-from-mr, 10 nov 2026)

- En una MR a revisar, un clic abre a Claude revisándola con Libretto, en su propio worktree de review-project.
- En una MR tuya, un clic deja un trabajo en su rama con Libretto retomando el cambio en curso (o preguntándote cuál, si hay varios o ninguno).
- Si ya hay trabajo, te lleva a él; si falta el repo, te dice dónde añadirlo; si hay un error, lo ves en la MR.

### Comentarios en su línea (mr-line-comments, 10 nov 2026)

- Un borrador de Libretto con archivo y línea aparece en la MR justo en esa línea del diff; si no se puede, como
  comentario general como hasta ahora, y Atril dice cuál fue.

### Jira, GitHub y GitLab (net-errors, 11 nov 2026)

- Con la forja caída o el token rechazado, la lista de MRs dice la causa con su botón y no enseña «Ninguna MR.».

### QA en la MR (qa-to-mr, 11 nov 2026)

- Un fallo al publicar en una MR trae, además de su frase, el código plegado y su arreglo (W150), también desde la QA.

### Página de MR (mr-page, 19 nov 2026)

- Pulsar una MR abre su página dentro de la pantalla MR, sin modal: la bandeja a la izquierda con esa fila marcada, en el centro su código con cada hilo y cada borrador de Libretto en su línea, y a la derecha la puntuación, «Contra su spec», los revisores y la CI.
- Un solo «Revisar ▾» ofrece Puntuar, Comentar y A fondo, cada uno donde ya se podía y con lo que ya hacía; la cabecera no tiene botones de texto largo.
- En Mías, una MR que la forja deja fusionar trae «Fusionar», que pregunta antes y fusiona una vez; una MR en conflicto lo dice en su fila y en su página.
- La revisión por lentes lee el título y la descripción de la MR, y la petición del trabajo si está en Atril, antes de opinar sobre el diff.

## Scope boundaries

### MR lists (add-mr-lists, 9 nov 2026)

**In:** listing, the row fields, opening in the browser, refresh, the rail counter.
**Out:** scores (add-mr-scores), threads and replies (add-mr-threads), notifications (add-avisos),
closed or merged MRs, choosing followed projects inside Atril, line counts for GitLab MRs.

**Never scoped out:** tokens stay in main (S25); forge requests never follow redirects (W50); main
opens only URLs it listed or created (W52, amended in `spec-workspaces.md`); rows are buttons and
the lists use the foldable sections every screen uses (W28).

### MR scores (add-mr-scores, 9 nov 2026)

**In:** the diff fetch, the deterministic metrics, the Claude call, the cache, the queue, the score
view. **Out:** scoring «Sigo», automatic scoring, code-complexity tools per language (cyclomatic,
coverage, mutation) — later, when a repo is checked out locally —, posting scores to the forge.

**Never scoped out:** Claude runs with no tools and no session saved; the diff reaches it on stdin,
never in argv; tokens never reach Claude or the window; a failed or malformed answer says so and
stores nothing.

### MR threads (add-mr-threads, 9 nov 2026)

**In:** reading threads for MRs of the latest listing, the «te toca responder» mark, posting a
reply to an existing thread or a new general comment. **Out:** starting a new inline comment on a
line, resolving or reopening threads, reactions, editing or deleting comments, suggestions, Libretto
lens drafts (add-mr-lens-drafts), rendering markdown (comments show as plain text).

**Never scoped out:** main reads and posts only for an MR in its latest listing (the W52 listed set);
a reply is sent only by the person's click and never twice for one click; comment text is shown as
text, never markup; tokens stay in main; requests never follow redirects; the view holds the
keyboard like the other modals.

### Libretto lens drafts (add-mr-lens-drafts, 9 nov 2026)

**In:** the review call, the drafts, publish as a general comment, send to the agent, discard, the
cache. **Out:** inline comments on the exact line, running `/libretto-review` with its five agents in a
worktree, automatic review, reviewing «Sigo», editing a draft before publishing (it can be discarded
and written by hand in the thread).

**Never scoped out:** Claude runs with no tools and the diff on stdin (as M11); nothing is published
or sent without the person's click, and each click acts once; tokens stay in main; draft text is
shown as text.

### Arreglar CI con Claude (fix-ci-with-claude, 10 nov 2026)

**In:** la consulta de si hay agente, la acción, el botón y su estado.
**Out:** abrir un trabajo nuevo; leer los logs de la CI desde Atril; reintentar la CI; subir cambios.
**Never scoped out:** el texto se escribe literal (sin teclas especiales), como W-respuestas; nada se envía
sin pulsar; el botón se usa con teclado.

### Abrir una MR en Atril (open-work-from-mr, 10 nov 2026)

**In:** los tres estados del botón en la vista de la MR, la elección del repo, la sesión de revisión, el trabajo
en rama existente, «Ir al trabajo», los errores en la vista.
**Out:** clonar repos; MRs de forks sin remote que las nombre; elegir el comando; automático.
**Never scoped out:** Atril no toca git en la copia de la persona (review-project, si cambia de rama, restaura como siempre); la URL validada como un elemento del argv; nada sin pulsar.

### Comentarios en su línea (mr-line-comments, 10 nov 2026)

**In:** publicar en línea en GitHub y GitLab, el respaldo general, el aviso, la cabeza vieja.
**Out:** comentar a mano en el diff; sugerencias aplicables («suggestion»); hilos multilínea; editar lo publicado.
**Never scoped out:** se publica una vez (M27); el texto va tal cual, sin HTML; el token nunca sale de main.

### Jira, GitHub y GitLab (net-errors, 11 nov 2026)

**In:** `src/main/forge/mrs.ts`, `src/renderer/mr/MrScreen.tsx`. **Out:** hilos, puntuaciones, lentes y comentarios en línea (solo toman la frase nueva).

### QA en la MR (qa-to-mr, 11 nov 2026)

**In:** `src/main/forge/threads.ts` (`reply`), `src/main/forge/openmr.ts` (`remoteNaming` exportado). **Out:** el resto de la pantalla MR.

### Página de MR (mr-page, 19 nov 2026)

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

### MR lists (add-mr-lists, 9 nov 2026)

- REST only, with the stored tokens; no new dependency; 10 s per request; error codes, never
  messages, from network failures (S20).

### MR scores (add-mr-scores, 9 nov 2026)

- The runner gains stdin input; same no-shell rule (W-criteria).
- Diffs come from the forges with the stored tokens, `redirect: 'error'`, 10 s per request.

### MR threads (add-mr-threads, 9 nov 2026)

- REST with the stored tokens; `redirect: 'error'`; 10 s per request; M6's error texts.
- The `mr` capability; the view reuses the modal frame (`useModalKeys`, `dlg edmodal`).

### Libretto lens drafts (add-mr-lens-drafts, 9 nov 2026)

- Reuses scores' diff fetch, cut, queue, runner timeout and failure texts (M11, M14, M16, W53), the
  listed-only rule (M17), the thread posting endpoints (M21) and `replyToAgent` (N3).
- `MrItem` gains `branch?` (GitHub `head.ref` from the detail call, GitLab `source_branch`).

### Jira, GitHub y GitLab (net-errors, 11 nov 2026)

- Ningún número de estado ni nombre de excepción en la frase.

### QA en la MR (qa-to-mr, 11 nov 2026)

- El token no sale de main.

### Página de MR (mr-page, 19 nov 2026)

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

### MR lists (add-mr-lists, 9 nov 2026)

- **Three lists** and **own screen** — Pau, 9 nov (decision log).
- **«Sigo» = Watch / star** (assumed): what the forges already record.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| `gh` / `glab` CLIs | Pau chose tokens (add-create-repo) |
| GraphQL | a second API shape for GitHub only; REST serves both |
| Polling only while the screen is open | the rail counter would be wrong until the first visit |
| Combined commit status on GitHub | misses Actions, which report as check runs |

#### Decision log, answers as given (2026-11-09)
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Qué tres listas? → A: las tuyas, las que te toca revisar, y las de otros en proyectos que sigues — Pau, 9 nov: «tus MRs y MRs donde estés tú como suscrito en el proyecto … O que te hayan puesto como reviewer».
- Q: ¿Qué es «seguir» un proyecto? → A: lo que ya marca cada forja: en GitHub los repos que vigilas («Watch»), en GitLab los proyectos con estrella; así no hay nada que configurar (assumed).
- Q: ¿Dónde viven? → A: en su propia pantalla «MR» en el carril, no en la barra lateral — Pau, 9 nov: «debería haber como una sub pantalla … porque si no, toda la barra lateral se llena».
- Q: ¿Qué muestra cada fila? → A: título, proyecto, autor, CI (pasa, falla, en curso, sin CI), tamaño (+/− y archivos) y antigüedad; pulsarla abre la MR en el navegador (assumed).
- Q: ¿Límites? → A: los 10 proyectos seguidos con actividad más reciente por forja; cada lista cortada en 50 con «Hay más: ábrelas en {forja}»; como mucho 60 detalles por forja y refresco (assumed).
- Q: (spec-reviewer) ¿Tamaño en GitLab? → A: su API no da líneas por MR: GitLab muestra archivos; GitHub, +/− y archivos (assumed).
- Q: (spec-reviewer) ¿Cuándo se carga para el contador del carril? → A: al arrancar Atril, cada 5 minutos, al abrir la pantalla y con «Actualizar» (assumed).
- Q: (spec-reviewer) ¿W52 solo deja abrir enlaces de repos creados? → A: se amplía a «creados o de la última lista»; la lista se reemplaza en cada carga (assumed).
- Q: (spec-reviewer) ¿El revisor en GitLab? → A: `reviewer_username` con la cuenta guardada; nada cambia en el almacén (assumed).

### MR scores (add-mr-scores, 9 nov 2026)

- **Sonnet, through Claude Code** — Pau, 9 nov.
- **Only mine and to review** — Pau, 9 nov.
- **On demand, cached by commit** (assumed): every score costs quota.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Score every listed MR automatically | spends quota on MRs nobody opens |
| The Anthropic API with a key | Pau uses the subscription; `claude -p` needs no key |
| Diff in the prompt argument | argv has a size limit and shows in process lists |
| Per-language complexity tools now | needs a checkout and toolchains per repo; out until a checkout exists |

#### Decision log, answers as given (2026-11-09)
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Qué motor? → A: «sonnet» — Pau, 9 nov; vía `claude -p` con la suscripción, sin clave de API.
- Q: ¿Qué se puntúa? → A: solo Mías y Me toca revisar — Pau, 9 nov: «solo debería revisar como mucho las que son reviewer o las mías».
- Q: ¿Cuándo? → A: bajo demanda, con «Puntuar»; nunca solo, porque gasta la cuota de Claude — Pau cuida el consumo (assumed).
- Q: ¿Se repite? → A: no mientras la MR no cambie: caché por MR y commit; un commit nuevo marca la puntuación como anterior y ofrece «Puntuar de nuevo» (assumed).
- Q: ¿Qué decide y qué explica? → A: lo determinista (tamaño, archivos, tests) se calcula sin IA y va primero; Sonnet da dificultad y riesgo de 1 a 5, qué hace, por qué y dónde mirar (assumed).
- Q: ¿Cómo se llama a Claude? → A: verificado 9 nov con Claude Code 2.1.319: `claude -p --model sonnet --output-format json --tools "" --no-session-persistence --json-schema <schema> "<instrucción>"`, el diff por stdin; la respuesta trae `structured_output` (assumed para el resto de flags).

- Q: (spec-reviewer) ¿Dueño de `scores.ts` y del runner? → A: `mr` gobierna `src/main/forge/scores.ts`; el runner con stdin y tiempo máximo es de workspaces (W53) (assumed).
- Q: (spec-reviewer) ¿Qué es un archivo de test? → A: un segmento `test`, `tests`, `spec`, `specs` o `__tests__`, o un nombre `*.test.*`, `*.spec.*`, `*_test.*` o `*Test.php|java|kt|cs`; sin distinguir mayúsculas (assumed).
- Q: (spec-reviewer) ¿Qué diff da cada forja? → A: GitHub el texto de `pulls/{n}` con `Accept: application/vnd.github.diff` (un 406 es «demasiado grande»); GitLab `/diffs?per_page=100` hasta 10 páginas, montado en un diff unificado con cabeceras `diff --git`/`---`/`+++`; los archivos que GitLab recorta cuentan con nota (assumed).
- Q: (spec-reviewer) ¿Y si no llega el diff, o Claude se cuelga? → A: los textos de M6, nada guardado; Claude tiene 180 s y se mata; `{detail}` es un código, nunca stderr (assumed).
- Q: (spec-reviewer) ¿Qué commit se guarda? → A: el del diff puntuado (GitHub lo lee de `pulls/{n}` al puntuar; GitLab lo trae la lista); una fila sin commit conocido no muestra «anterior» (assumed).
- Q: (spec-reviewer) ¿Doble clic? → A: la misma puntuación en curso, sin otra llamada (assumed).
- Q: (spec-reviewer) ¿Puntuación guardada tras cambiar de idioma? → A: se muestra en el idioma en que se hizo (assumed).

### MR threads (add-mr-threads, 9 nov 2026)

- **See the forge's comments in Atril** — Pau, 9 nov: «como se ven los comentrios de gitbuh gitlab».
- **Posting needs a click** (assumed): a reply is public and outward-facing.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| GitHub GraphQL review threads (gives resolved) | a second API for GitHub only; resolved status is the one gap |
| Rendering comments as markdown | a sanitiser or a library for little gain; plain text is safe |
| Replying from the browser only | Pau asked to see and answer them in Atril |

#### Decision log, answers as given (2026-11-09)
- Q: «sigue con todo haz mejoras, nuevas features» — Pau, 9 nov, evening → decisions taken with the recommended option, marked (assumed).
- Q: ¿Dónde se ven los hilos? → A: al pulsar una fila de MR se abre la vista de la MR (modal grande, como los documentos); «Abrir en {forge}» sigue ahí (assumed).
- Q: ¿Qué hilos? → A: GitHub: comentarios de revisión en líneas y comentarios generales; GitLab: discusiones. Agrupados por archivo y línea, los generales aparte (assumed).
- Q: ¿Resuelto? → A: solo GitLab lo da por REST (`resolved`); en GitHub no se muestra estado de resuelto (assumed).
- Q: ¿«Te toca responder»? → A: un hilo en el que has escrito, o de una MR tuya, cuyo último comentario es de otra persona (assumed).
- Q: ¿Responder publica? → A: sí, en la forja, y solo con tu clic en «Enviar»; nunca solo (assumed).
- Q: ¿Límites? → A: como mucho 300 comentarios por MR (3 páginas de 100); más, con nota «Hay más en {forja}» (assumed).
- Q: (spec-reviewer) ¿Y M5, que abre el navegador? → A: pulsar una fila abre la vista de la MR; el navegador queda en «Abrir en {forja}» (M5 reformulado) (assumed).
- Q: (spec-reviewer) ¿El límite y «te toca responder»? → A: 3 páginas de 100 elementos por endpoint; si se alcanza, la cabecera dice que el recuento puede estar incompleto (assumed).
- Q: (spec-reviewer) ¿GitLab: notas del sistema y comentarios sueltos? → A: las del sistema fuera; los comentarios sueltos (`individual_note`) forman un hilo «General», como los generales de GitHub; responder ahí crea un comentario general nuevo (assumed).
- Q: (spec-reviewer) ¿Y si la MR ya no está en la lista? → A: «Esta MR ya no está en la lista: actualiza», sin petición, con tu texto intacto (assumed).

### Libretto lens drafts (add-mr-lens-drafts, 9 nov 2026)

- **Lens findings as drafts** — Pau, 9 nov (phase-2 ask): the MR view's comments with Libretto's
  findings as drafts to publish, send to the agent, or discard.
- **One call, not five agents** (assumed): quota.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| `/libretto-review` with five lens agents in a worktree | five agents per MR; quota |
| Inline comments on the exact line | GitHub needs commit_id/side, GitLab a full position with three shas; later |
| Auto-review on every new commit | quota |

#### Decision log, answers as given (2026-11-09)
- Q: «sigue con todo haz mejoras, nuevas features» — Pau → decisions taken with the recommended option, marked (assumed).
- Q: ¿Las cinco lentes de `/libretto-review` en un worktree? → A: no: una sola llamada a Sonnet sin herramientas con el diff y las cinco lentes (intención, seguridad, diseño, fiabilidad, tests) en la instrucción; cinco agentes por MR gastarían demasiada cuota — Pau cuida el consumo (assumed).
- Q: ¿Cuándo? → A: bajo demanda, con «Revisar con Libretto», solo en Mías y Me toca revisar; guardado por commit como las puntuaciones (assumed).
- Q: ¿Publicar dónde? → A: como comentario general de la MR que cita archivo y línea; el comentario en la línea exacta queda para más adelante (assumed).
- Q: ¿Mandar al agente cuál? → A: el único trabajo vivo en la rama de la MR y en un repo cuyo `origin` es el proyecto de la MR; si hay cero o varios, no se ofrece (assumed).
- Q: (revisor) ¿Más de 12 hallazgos, texto largo, file/line ausentes, cero hallazgos? → A: fuera de esquema = fallo; sin ubicación se omite; cero es respuesta válida (assumed).
- Q: (revisor de obra) ¿Borradores de una MR sin commit conocido? → A: se rechaza la revisión antes de gastar cuota; ¿mismo proyecto en otra forja? → A: el origin también debe nombrar el host (assumed).
- Q: (revisor) ¿Cola compartida con las puntuaciones? → A: un solo runner, claves por tipo y URL (assumed).

### Arreglar CI con Claude (fix-ci-with-claude, 10 nov 2026)

- Mismo agente que M28 (assumed, 10 nov).
- Solo bajo demanda: CLAUDE.md, «Nada de llamadas automáticas a Claude».

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Abrir un trabajo nuevo para arreglar la CI | Es otra mejora de la lista; aquí solo con agente ya abierto. |
| Leer el log de la CI y pasárselo a Claude | Más permisos y texto; el agente ya sabe usar gh/glab. |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Dónde va el botón? → A: en la vista de la MR, junto a su estado de CI, y solo con CI «Falla» (assumed).
- Q: ¿A qué agente? → A: al mismo que M28 elige para «Mandar al agente»: el único trabajo vivo en la rama
  de la MR con `origin` en su proyecto; si hay cero o varios, el botón no sale (assumed).
- Q: ¿Qué le dice? → A: una línea escrita en su terminal, como responder: «La CI de {url} falla. Mira qué
  ha fallado con {gh pr checks|glab ci view}, arréglalo y avísame antes de subir nada.» (assumed).
- Q: ¿Cuota? → A: no llama a Claude por su cuenta: escribe en un agente que ya está abierto, solo al pulsar (assumed).
- Q: (fase 5) ¿Cómo? → A: reutilizar `agentFor` de lenses y el `send` que ya escribe en el panel (assumed).
  Perdió: abrir un trabajo nuevo desde la MR (es la mejora «Abrir un trabajo desde una MR», aparte).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **De dónde sale la CI.** Main la lee de la última lista de MR, como M27; no se fía de la ventana.
  - **Los errores, uno por caso:**
    - «La CI de esta MR ya no falla.»
    - «No hay un único trabajo de esta MR abierto en Atril.»
    - «No se pudo enviar: ese trabajo ya no está.» (el texto de N3)
  - **`ciAgent`** tiene su propio criterio, M32. La vista lo pregunta al abrir la MR.
  - **Doble clic.** Un segundo clic mientras el primero sigue en curso se rechaza, como en M27.
  - **Dónde vive el código.** En `lenses.ts`, que ya está en el `Governs:` de mr, junto a `agentFor`.
  - **Textos.** Todos por `t()`.

### Abrir una MR en Atril (open-work-from-mr, 10 nov 2026)

- Revisar con review-project en su propio worktree; seguir con libretto-flow sin argumento (assumed, 10 nov).
- Repo por cualquier remote, como review-project (assumed, 10 nov).
- En sitio, solo revisar (assumed, 10 nov).
- Lista y rama de la MR desde la última lista de main (assumed, 10 nov).

#### Decision log, answers as given (2026-11-10)
- Q: ¿Qué hace? → A: desde la vista de una MR, abrirla en Atril por el camino de Libretto que le toca (assumed).
- Q: (revisor de spec) `/libretto-review` prepara su propio worktree y `/libretto-flow` no acepta una URL de MR →
  A: rediseñado para no salirse de Libretto (assumed):
  - **Revisar** (Me toca revisar, Sigo): «Revisar en Atril» abre una *sesión de revisión*: una sesión de tmux en
    la carpeta del repo registrado, sin que Atril toque git, con `/libretto:libretto-review <url>`; el skill
    review-project hace su worktree aislado y lo quita al acabar, como cuando lo lanzas a mano.
  - **Seguir lo tuyo** (Mías): «Seguir en Atril» crea un trabajo en la rama de la MR traída de `origin` y lanza
    `/libretto:libretto-flow` sin argumento: find-work retoma el cambio en curso de esa rama.
- Q: ¿Qué repo? → A: el registrado con algún remote que nombre el proyecto (la regla de review-project, que mira
  todos los remotes); varios → se dice y no se abre nada; ninguno → «Añade el repo de {proyecto} en Ajustes»
  (assumed).
- Q: ¿Ya hay un trabajo? → A: cualquier registro (vivo o no) en esa rama del repo → «Ir al trabajo» (assumed).
- Q: ¿Repo en modo en sitio? → A: «Seguir en Atril» se rechaza con «Este repo trabaja en tu copia: cambia de rama
  a mano» (no se toca la copia de la persona); revisar sí, porque no toca git (assumed).
- Q: ¿De qué lista viene la MR? → A: de la última lista de main (como M27), nunca de la ventana (assumed).
- Q: ¿La URL? → A: se valida (https, sin NUL, sin empezar por «-») y va como un elemento del argv (assumed).
- Q: (fase 5) ¿Dónde? → A: `src/main/forge/openmr.ts` (el `Governs:` de mr lo añade); `openWorktree` gana el
  modo de rama existente y la sesión de revisión (delta de workspaces) (assumed).

- Q: (segundo revisor de spec) Holguras → A, todas (assumed):
  - **Seguir lo tuyo.** `libretto-flow` sin argumento corre find-work. Si hay más de un cambio en curso o
    ninguno, te pregunta cuál seguir: es su propia parada, y la contestas con las respuestas rápidas
    (W76).
  - **Revisar en la copia de la persona.** Atril no toca git. Si review-project decide cambiar de rama,
    lo hace con su restauración garantizada, como cuando lo lanzas a mano.
  - **Forks.** Se trae la rama del remote que coincide con el proyecto, no siempre de `origin`.
  - **Qué guarda una sesión de revisión.** El registro lleva `mode: 'review'` y `branch` igual a la rama
    de la MR.
    - Revisar y seguir no se confunden: «existing» solo cuenta registros del mismo tipo que el botón.
    - Una sesión de revisión no cuenta para W7.
  - **Una MR en dos listas.** Si está en Mías, se sigue. Si no, se revisa.
  - **«Ir al trabajo» con un trabajo muerto.** Lo elige y Trabajo lo enseña «parado», como hoy.
  - **«Revisar con Libretto» (M25).** Se queda: deja borradores sin herramientas. «Revisar en Atril» es
    la revisión completa en una sesión; salen los dos.
  - **Si falla el fetch:** «No se pudo traer la rama: {detalle}».
  - **Quitar una sesión de revisión** borra su registro y cierra su sesión de tmux.
  - **El prompt.** Va como un solo elemento: «/libretto:libretto-review <url>» o «/libretto:libretto-flow»
    sin más.
  - **`Governs:`.** El de workspaces excluye `openmr.ts`.

### Comentarios en su línea (mr-line-comments, 10 nov 2026)

- En línea solo con la cabeza actual (assumed, 10 nov).
- Respaldo al comentario general de M27 (assumed, 10 nov).

#### Decision log, answers as given (2026-11-10)
- Q: ¿Qué cambia? → A: «Publicar» de un borrador con `file` y `line` (M27) lo publica en esa línea del diff: en
  GitHub como comentario de revisión (`POST /repos/{o}/{r}/pulls/{n}/comments` con `commit_id` = la cabeza de los
  borradores, `path`, `line`, `side: "RIGHT"`); en GitLab como discusión con posición (`position_type: "text"`,
  `base_sha`, `start_sha`, `head_sha` del MR, `new_path`, `new_line`) (assumed).
- Q: ¿Y si la línea no está en el diff o la forja la rechaza (422/400)? → A: se publica como hoy, comentario general
  con «`file:line`» (M27), y el borrador dice «Publicado como comentario general: esa línea no está en el diff»
  (assumed).
- Q: ¿Texto? → A: en línea basta «**{lens} · {severity}**», línea en blanco y el texto; la ubicación ya la da la
  línea (assumed).
- Q: ¿Comentar a mano en una línea desde Atril? → A: fuera de este cambio: Atril no enseña aún el diff de una MR
  ajena; aquí solo los borradores de las lentes (assumed).
- Q: ¿Cabeza distinta? → A: si los borradores son de una cabeza vieja (M28 «stale»), se publica en general, nunca en
  una línea que pudo moverse (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **Antes de publicar, Atril lee la MR en la forja.** En GitHub, `GET pulls/{n}` (head sha). En GitLab,
    `GET merge_requests/{iid}` (`diff_refs` base/start/head). Si su cabeza no es la de los borradores, se
    publica en general. Si esa lectura falla, el borrador sigue abierto con el mensaje de M6.
  - **Archivos renombrados (GitLab).** La posición lleva `old_path` y `new_path` del archivo, tal como salen
    en el diff guardado.
  - **Una línea de contexto o fuera de los hunks.** Atril no la comprueba antes: decide la forja. Un 400 o
    422 de la forja da el respaldo general, con la nota «Publicado como comentario general: la forja no
    aceptó esa línea».
  - **Respaldo sin nota.** Ir a general por cabeza vieja o porque falte `file` o `line` es lo previsto y no
    lleva nota.
  - **Otro fallo de la publicación en línea** (red, timeout, 5xx). El borrador sigue abierto con M6 y no
    se publica en general, para no duplicar.
  - **Dónde vive la nota.** En el borrador publicado, en un campo `note`. La vista la enseña junto a
    «Publicado» (M29 enmendado).
  - **El código va en `lenses.ts`.** Ya está en el `Governs:` de mr.

### Página de MR (mr-page, 19 nov 2026)

- **Página, no modal** — Pau, 12 nov (hallazgo 67), la F de `bocetos/mr-pagina.html` elegida el 11 nov (CLAUDE.md). Sustituye «the view reuses the modal frame (`useModalKeys`, `dlg edmodal`)» de add-mr-threads y «al pulsar una fila de MR se abre la vista de la MR (modal grande)».
- **Un solo «Revisar ▾» con Puntuar / Comentar / A fondo** — Pau, 12 nov, ask; boceto `bocetos/fase1-nucleo.html:1752,1847`.
- **Los niveles reutilizan M11, M25 y M34** (assumed). «Revisar con Libretto» y «Revisar en Atril» dejan de ser botones propios.
- **Puntuar y Comentar solo en Mías y Me toca revisar** — Pau, 9 nov (add-mr-scores), sin cambio.
- **«Fusionar» solo en Mías, con confirmación, solo si la forja dice que se puede; GitHub squash** (assumed).
- **Lo que pide más datos que el listado queda fuera, nombrado** — la sesión que encarga el cambio.
- **Bajo demanda y guardado por commit** (add-mr-scores, add-mr-lens-drafts): no cambia.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Mantener el modal y agrandarlo | Pau pidió la página del boceto (hallazgo 67) |
| Pintar el diff en la ventana desde el texto crudo | dos lectores del formato (main ya lo recorre en `metrics`); el parser en main se prueba sin DOM |
| Secciones E2 ya, con revisores por fila | hasta 60 peticiones más por forja en cada listado de 5 min |
| Fusionar con `gh`/`glab` | Pau eligió tokens y REST (add-mr-lists) |
| Método de fusión leído del repo | una petición más y un selector; squash es lo que Pau usa |
| La petición del trabajo guardada en el registro al abrirlo | cambia `WorkspaceRecord` (workspaces) y no cubre trabajos ya abiertos; el `proposal.md` ya la tiene |
| Confirmación solo en la ventana | lección add-create-repo: main exige `confirmed` |

#### Decision log, answers as given (2026-11-19)
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

- Q: ¿Archivos fuera de «In»? → A: `src/renderer/mockApi.ts` (gana `page` y `merge`, como pide Constraints), `src/renderer/avisos/avisos.test.ts` (la prueba de V6 busca la página, no el modal), `src/main/forge/linecomments.test.ts` (M36 contaba toda lectura de la MR en GitLab; con M49 la revisión lee una más, y la prueba cuenta ahora solo la de antes de publicar), `bocetos/qa-final.html` y `CLAUDE.md` («Sin probar»), por el encargo de la última caja.
- Q: ¿`page.ts` usa `forgeGet`? → A: no: `forgeGet` solo lleva la frase y M46 pide frase, detalle y arreglo por parte; `page.ts` tiene su propio GET con `netProblem`, `redirect: 'error'` y 10 s, y reutiliza `fetchDiff` (assumed).
- Q: ¿Cómo se ve el salto entre dos trozos del diff? → A: las líneas solo son contexto, añadida o borrada (M46); la ventana marca con una raya discontinua la línea donde salta la numeración (assumed).
- Q: ¿Un hilo cuyo archivo se renombró? → A: se busca por la ruta nueva y, si no, por la vieja (assumed).
- Q: ¿Dónde va `data-tour="mr-tools"` sin página abierta? → A: en «Revisar ▾» mientras hay una página; sin página, en el «Puntuar» de las filas, para que el paso del tutorial siempre tenga a qué apuntar (W23 no cambia) (assumed).
- Q: ¿Qué botón lleva un fallo de `mr.page` con arreglo `settings`? → A: «Abrir Ajustes» y, al lado, «Volver a comprobar» (M51 lo pide siempre) (assumed).
- Q: ¿Fusionar sin token guardado? → A: la negativa general de M41, sin petición (assumed).
- Q: ¿Y si `relist()` lanza tras fusionar? → A: `list` con «No he podido volver a listar tus MR.» y `retry` (assumed).
- Q: ¿La ventana vuelve a listar tras fusionar? → A: sí, cuando la respuesta no trae `list`: main ya listó, pero la ventana lee su propia lista; son las peticiones de un listado más (assumed).
- Q: ¿Qué pasa con las fichas «M · D4 · R2» de la fila? → A: abren la página de esa MR, con la puntuación en su tarjeta; `ScoreView` deja de ser modal y es el cuerpo de la tarjeta (assumed).
- Q: ¿Qué queda de la sección «Libretto»? → A: solo tras una revisión o un fallo: «De un commit anterior», el fallo, «Libretto no ha encontrado nada que comentar» y los borradores sin línea; Comentar está en «Revisar ▾» (M44, M45) (assumed).
- Q: ¿La entrada de la revisión sin título, descripción ni petición? → A: lleva igual las dos líneas de Atril («the author's request…» y «the diff follows») (assumed).
- Boxes 5–9 land in one commit with one gate: box 5 alone (MrView removed) breaks tests that box 7 renames (`openmr.test`) and the palette test that expected the old dialog (now the page region, outside «In»: `src/renderer/palette/palette.test.ts`). Cutting them apart would mean commits that are red in between (assumed).

## Task breakdown

## Verification criteria

### MR lists (add-mr-lists, 9 nov 2026)

- **M1** When the lists load, Atril shall put in **Mías** the open MRs you authored, in **Me toca
  revisar** the open MRs where your review is requested, and in **Sigo** other people's open MRs in
  your followed projects.
  Proof: src/main/forge/mrs.test.ts lists mine, to review and followed from both forges
- **M2** An MR that belongs to an earlier list shall not repeat in a later one (order: Mías, Me toca
  revisar, Sigo).
  Proof: src/main/forge/mrs.test.ts an mr shows once
- **M3** Each row shall show the title, the project, the author, the CI state, the size — «+added
  −removed · N archivos» on GitHub, «N archivos» on GitLab — and the age («hace 3 h», «hace 2 d»).
  Proof: src/renderer/mr/mrs.test.ts the mr screen shows three lists with their rows
- **M4** The CI state shall be «Falla» for GitHub check-run conclusions failure, timed_out,
  cancelled or action_required and GitLab pipelines failed or canceled; «En curso» for check runs
  queued or in progress and pipelines running, pending, created, preparing, waiting_for_resource or
  scheduled; «Pasa» when every check run concluded success, neutral or skipped and for pipelines
  success, skipped or manual; and «Sin CI» with no check runs or no pipeline.
  Proof: src/main/forge/mrs.test.ts ci states map to four words
- **M5** When the person activates a row, Atril shall open the MR page (M43); the page's «Abrir en {forge} ↗» shall open that MR in the browser. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts a row opens the mr page beside the inbox
- **M6** If one of a forge's requests fails, then the screen shall keep every MR that forge did return and the other forge's MRs, and show above the sections, per failed forge, its W150 problem with «No puedo enseñarte tus MRs de {forge}.» under it, its button («Volver a comprobar» loads again; «Abrir Ajustes» opens Ajustes) and the detail folded; while any forge failed, an empty section shows no «Ninguna MR.».
  Proof: src/main/forge/mrs.test.ts one forge failing keeps the other
  Proof: src/renderer/mr/mrscreen.test.ts a failed list shows its problem and no empty sections
- **M7** While no forge is connected the screen shall say «Conecta GitHub o GitLab en Ajustes» with
  a button that opens Ajustes.
  Proof: src/renderer/mr/mrs.test.ts no forge connected points to ajustes
- **M8** Atril shall follow per forge the 10 followed projects with the most recent activity, cut
  each list at 50 rows with «Hay más: ábrelas en {forge}» when more existed, and fetch at most 60 MR
  details per forge and refresh.
  Proof: src/main/forge/mrs.test.ts caps keep a refresh bounded
- **M9** Atril shall load the lists when it starts, every 5 minutes, when the MR screen opens and on
  «Actualizar», and the rail shall show the «MR» entry with the number of MRs in «Me toca revisar»
  from the latest load whenever it is not zero.
  Proof: src/renderer/mr/mrs.test.ts the lists refresh and the rail counts reviews

### MR scores (add-mr-scores, 9 nov 2026)

- **M10** Atril shall measure from the diff alone the added and removed lines (header lines excluded),
  the files, whether a test file changed — a path segment `test`, `tests`, `spec`, `specs` or
  `__tests__`, or a name `*.test.*`, `*.spec.*` or `*_test.*` ignoring case, or `*Test.{php,java,kt,cs}`
  with a capital T, so `latest.ts` and `latest.php` are not one — and a size of S below 100 changed lines, M below 400, L below 1000
  and XL from 1000.
  Proof: src/main/forge/scores.test.ts metrics come from the diff alone
- **M11** When an MR is scored, Atril shall run `claude` with exactly `-p --model sonnet
  --output-format json --tools "" --no-session-persistence --json-schema <schema>` and an instruction
  that names the person's language, send the diff on stdin — cut at 120 KB (UTF-8 bytes) at the last
  file boundary before it, with a line telling Claude it was cut — and take difficulty, risk, what,
  why and where from `structured_output`.
  Proof: src/main/forge/scores.test.ts scoring runs claude with no tools and the diff on stdin
- **M16** If the diff cannot be fetched, then Atril shall show «No se ha podido traer el diff:
  {detail}» with M6's texts as the detail (and «es demasiado grande para {forge}» on GitHub's 406);
  if Claude exits non-zero, runs past 180 s (then it is killed) or answers outside the schema, Atril
  shall show «Claude no ha podido puntuar esta MR ({detail})» with the exit code, «tiempo agotado» or
  «respuesta fuera del esquema» — never its output — and in both cases store nothing.
  Proof: src/main/forge/scores.test.ts failures store nothing and say why
- **M12** Only rows in Mías and Me toca revisar shall offer Puntuar.
  Proof: src/renderer/mr/scores.test.ts only mine and to review can be scored
- **M17** Main shall score only an URL that is in Mías or Me toca revisar of its latest listing, checked
  when asked; anything else shall be refused without fetching or running anything.
  Proof: src/main/forge/scores.test.ts only listed mine and review urls are scored
- **M13** A score shall be stored with the head commit of the diff it scored; asking again for that commit shall not run Claude, and a row whose listed head commit is known and differs shall show the stored score as «De un commit anterior» with Puntuar de nuevo.
  Proof: src/main/forge/scores.test.ts a score is kept per commit
  Proof: src/renderer/mr/scores.test.ts the score card puts the measures first
- **M14** Atril shall run at most one score at a time, the rest in the order asked; asking again for an
  URL already queued or running shall return that same run.
  Proof: src/main/forge/scores.test.ts scores run one at a time
- **M15** The Puntuación card (M48) shall show the measured values first, then Claude's, and when the diff was cut say «Claude vio {seen} de {total} KB»; each inbox row's state shall read «En cola», «Puntuando…», its chips, or an error. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/scores.test.ts the score card puts the measures first
### MR threads (add-mr-threads, 9 nov 2026)

- **M18** When the MR page opens, Atril shall show its threads, comments oldest first: on GitHub, review comments (`GET /repos/{o}/{r}/pulls/{n}/comments`) grouped by their root (`in_reply_to_id`), each carrying `path`, `line` — or, when the root's `line` is null (an outdated comment), `original_line` with `outdated: true` — the last line of `diff_hunk` and `side: 'old'` when the root's `side` is `LEFT`, and the general comments (`GET /repos/{o}/{r}/issues/{n}/comments`) as one «General» thread; on GitLab, discussions (`GET /projects/:id/merge_requests/:iid/discussions`) without system notes, positioned ones carrying `new_path` (else `old_path`) and `new_line` (else `old_line` with `side: 'old'`), the individual notes together as one «General» thread, and a thread resolved when every resolvable note in it is resolved. A thread with a file but no line shall show as a file thread. One test holds a case per clause and forge.
  Proof: src/main/forge/threads.test.ts threads come from both forges
- **M19** Atril shall fetch at most 3 pages of 100 items per endpoint; when more exist it shall say
  «Hay más en {forge}: “Te toca responder” puede estar incompleto».
  Proof: src/main/forge/threads.test.ts threads are capped
- **M20** A thread shall be marked «Te toca responder» when its last comment is not yours and either
  you wrote an earlier comment in it or you authored the MR (the author taken from the listing).
  Proof: src/main/forge/threads.test.ts your turn is the last word of someone else
- **M24** Each tab label shall carry «· te toca {n}» with the threads it shows marked «Te toca responder», only when n > 0 (M47); no «Te toca responder: {n}» tag shall show in the header. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/page.test.ts threads and drafts sit on their lines
- **M21** When the person writes a reply and clicks Enviar, Atril shall post it once — GitHub `POST /repos/{o}/{r}/pulls/{n}/comments/{root}/replies` for a review thread and `POST /repos/{o}/{r}/issues/{n}/comments` for «General»; GitLab `POST /projects/:id/merge_requests/:iid/discussions/:id/notes` for a discussion and `POST /projects/:id/merge_requests/:iid/notes` for «General» — then show it in the thread; an empty reply shall not be sent, and a failure shall keep the text in the box with M6's message, answering also W150's `detail` and `fix` when the forge answered.
  Proof: src/main/forge/threads.test.ts a reply is posted once to the right place
  Proof: src/renderer/mr/threads.test.ts a reply is sent with one click and kept on failure
- **M22** If the MR is not in main's latest listing, then reading or posting its threads shall be
  refused without a request, the view saying «Esta MR ya no está en la lista: actualiza» and keeping
  any written text.
  Proof: src/main/forge/threads.test.ts only listed mrs are read or answered
- **M23** The MR page shall show threads, comments and drafts as text (markup shows literally); how the page is left is M43's.
  Proof: src/renderer/mr/page.test.ts a row opens the mr page beside the inbox
### Libretto lens drafts (add-mr-lens-drafts, 9 nov 2026)

- **M25** When the person chooses Comentar in «Revisar ▾» on an MR in Mías or Me toca revisar, Atril shall run `claude` exactly as M11 (no tools, no session, stdin as M49 with the diff cut at 120 KB) with a schema of at most 12 findings `{ lens: intent|security|design|reliability|tests, severity: high|medium|low, file?, line?, text ≤ 400 }`; a reply outside the schema, a fetch failure or a timeout shall show «Claude no ha podido revisar esta MR: {detail}» (M16's details) and store nothing; zero findings is an answer and shows «Libretto no ha encontrado nada que comentar». An URL outside those two lists of the latest listing shall be refused without a request (M17's text). Reviews and scores share one runner, one at a time in the order asked, keyed by kind and URL (M14 per kind). One test holds every clause, one assertion each.
  Proof: src/main/forge/lenses.test.ts the lens review runs claude like the score and keeps drafts
- **M26** Drafts shall be stored per MR and head commit (no known head: the review is refused before Claude runs, «No se sabe el último commit de esta MR: actualiza»); while drafts exist for the current head, Comentar shall show disabled with «Ya comentada en este commit»; on a newer head the drafts show «De un commit anterior» and Comentar reads «Comentar de nuevo», whose result replaces every draft. Each Proof's test holds the clauses on its side — main: storage per commit, the refusal and the replacement; window: the disabled item and «Comentar de nuevo» — one assertion each.
  Proof: src/main/forge/lenses.test.ts drafts are kept per commit
  Proof: src/renderer/mr/page.test.ts revisar offers the levels each list allows
- **M27** When the person clicks Publicar on an open draft, Atril shall publish it once — on its line
  as M36 says, or as the MR's general comment (M21) «**{lens} · {severity}** — `{file}:{line}`» (the location
  part dropped when `file` is absent, `:{line}` when `line` is), a blank line, then the text as written, as
  M37 says — then mark it published. A failure shall keep it open with M6's message. Publishing, sending or
  discarding a draft that is not open, or of an MR outside the latest listing, shall be refused without a
  request.
  Proof: src/main/forge/lenses.test.ts a draft is published once as a general comment
- **M28** Main shall offer Mandar al agente for an MR only when exactly one workspace is alive, on the
  MR's branch, in a repo whose `origin` remote names the MR's host and project; sending shall type, as N3,
  «Revisión de Libretto ({lens}, {severity}) en {location}: {text}» (location as M27, «la MR» when
  absent), mark the draft sent on `sent`, and on `gone` or `ignored` keep it open with N3's message.
  Proof: src/main/forge/lenses.test.ts a draft goes to the one agent on that branch
- **M29** The page shall show each draft as text where M47 places it, with «Publicar en esta línea» (or «Publicar» when it has no line), «Mandar al agente» (only when main offers it) and «Descartar» while open, and «Publicado» (followed by its note when it has one, M37) or «Enviado al agente» with no actions after; Descartar removes it. One test holds every clause, one assertion each.
  Proof: src/renderer/mr/lenses.test.ts drafts can be published, sent or discarded
### Arreglar CI con Claude (fix-ci-with-claude, 10 nov 2026)

- **M30** When the window asks `atril:mr:fixCi(url)` for an MR whose CI is «Falla» and M28 finds exactly
  one workspace for it, main shall type into that workspace's pane, as literal text followed by Enter, «La
  CI de {url} falla. Mira qué ha fallado con {gh pr checks|glab ci view}, arréglalo y avísame antes de subir
  nada.» (gh for GitHub, glab for GitLab) and answer `{ sent: branch }`, judging the CI from main's latest
  MR listing; otherwise it shall type nothing and answer `{ error }` with «La CI de esta MR ya no falla.»,
  «No hay un único trabajo de esta MR abierto en Atril.» or «No se pudo enviar: ese trabajo ya no está.»;
  a second call for the same MR while one is in flight shall be refused. One test holds a case per clause
  (GitHub, GitLab, two agents, CI not failing, gone, double call).
  Proof: src/main/forge/fixci.test.ts fix ci types into the one agent of the mr
- **M31** While an MR's CI is «Falla» and main reports an agent for it, the CI card (M48) shall show «Arreglar CI con Claude»; pressing it shall show «Enviado a {rama}» or the error; with no agent, or any other CI state, no button shall show. One test holds the visibility, the sent text and the error, one assertion each.
  Proof: src/renderer/mr/fixci.test.ts the fix ci button shows only with a failing ci and an agent
- **M32** When the MR view opens, the window shall ask `atril:mr:ciAgent(url)`, and main shall answer the
  branch of the one workspace M28 finds when main's latest listing has that MR's CI as «Falla», and `null`
  otherwise.
  Proof: src/main/forge/fixci.test.ts ci agent names the branch only for a failing ci

### Abrir una MR en Atril (open-work-from-mr, 10 nov 2026)

- **M33** When the window asks `atril:mr:workFor(url)` for an MR in main's latest listing, main shall answer
  `{ kind: 'continue' }` for an MR in Mías and `{ kind: 'review' }` otherwise (Me toca revisar or Sigo) —
  or `{ kind: 'existing', workspaceId }` when a record of that same kind (review session or workspace) has
  that MR's branch in a matching repo, live or not — or
  `{ kind: 'none', reason }` with «Añade el repo de {proyecto} en Ajustes» when no registered repo has a remote
  naming the project and «Varios repos registrados son de {proyecto}» when several do. One test holds a case per
  clause.
  Proof: src/main/forge/openmr.test.ts an mr knows how it opens in atril
- **M34** When the person opens an MR as review, main shall start a review session (W90) in the matching repo's
  folder with the single prompt element «/libretto:libretto-review <url>»; as continue, it shall open a
  workspace on the MR's branch fetched from the matching remote (W89) and start the single prompt element
  «/libretto:libretto-flow», refusing an in-place repo with «Este repo trabaja en tu copia: cambia de rama a
  mano»; a failed fetch shall answer «No se pudo traer la rama: {detalle}»; a URL that is not https, holds a
  NUL or starts with «-» shall start nothing. One test
  holds a case per clause.
  Proof: src/main/forge/openmr.test.ts an mr opens through libretto's own path
- **M35** The page header shall show «Seguir en Atril» or «Ir al trabajo» as M33 answers `continue` or `existing` (a workspace), A fondo in «Revisar ▾» shall stand for `review` and an existing review session (M45), and the `none` reason shall show under the header with a link to Ajustes → Repos; pressing shall end on Trabajo with that workspace selected (a dead one shows as stopped), or show the error on the page. One test holds a case per clause, one assertion each.
  Proof: src/renderer/mr/openmr.test.ts the mr page opens or finds its workspace
### Comentarios en su línea (mr-line-comments, 10 nov 2026)

- **M36** When the person publishes an open draft that has `file` and `line` and the drafts are not stale, Atril
  shall post it once as a line comment — GitHub `pulls/{n}/comments` with `commit_id` the drafts' head, `path`,
  `line` and `side: "RIGHT"`; GitLab a discussion with a text position of the MR's `base_sha`, `start_sha`,
  `head_sha`, `new_path` and `new_line` — whose body is «**{lens} · {severity}**», a blank line and the text; and
  mark the draft published; before that post it shall read the MR from the forge (GitHub `pulls/{n}` head,
  GitLab `merge_requests/{iid}` `diff_refs`), keeping the draft open with M6's message if that read fails. One
  test holds GitHub and GitLab, a case per clause.
  Proof: src/main/forge/linecomments.test.ts a draft lands on its line
- **M37** If the forge's head differs from the drafts' head, or the draft has no `file` or `line`, Atril shall
  post M27's general comment instead, once, with no note; if the line post answers 400 or 422, it shall post
  the general comment once and store the note «Publicado como comentario general: la forja no aceptó esa
  línea»; any other failure of the line post shall keep the draft open with M6's message and post nothing
  else. One test holds a case per clause.
  Proof: src/main/forge/linecomments.test.ts a draft that cannot land falls back to a general comment

### Jira, GitHub y GitLab (net-errors, 11 nov 2026)

- **M38** `statusText` and `networkText` shall return the W150 sentence, so a failure in threads, scores or line comments shows no status number nor exception name.
  Proof: src/main/forge/mrs.test.ts status and network texts carry no codes

### Página de MR (mr-page, 19 nov 2026)

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
