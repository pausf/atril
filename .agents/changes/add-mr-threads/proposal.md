Tracker: none
Targets: mr
Durable decisions: the ones in Prior decisions below

# add-mr-threads

## The ask, verbatim

Pau, 9 nov 2026:

> ya me gustaria hacer un software de gestion de MR de gitlab o github

> ok adelante , importate lo de claude code para ponerle puntuaciones etc.. de complejidad de IA como explica 530 de las notas etc....

> peor que sea muy parecido pero con flujo de LIBRETTO , las puntuaciones etcc revisor de gitlaby github, que cargue tus tearea de Jira

> donde se ve el tema de la putuacion el apartado de gitlab o github donde se ve la tarea ya en una PR o MR creada con puntuacion o ves MR de otra gente de tus proyectos en favoritos

> Hubhub, GitLab deberían ser tus MRs y MRs donde estés tú como suscrito en el proyecto, ¿vale? O que te hayan puesto como reviewer.

> como se ven los comentrios de gitbuh gitlab

> Pero no debería revisar todas, porque yo no voy a revisar todas las MRs. Entonces, solo debería revisar como mucho las que son reviewer o las mías, pero ya está.

> En DMRs, aparte de mostrar ahí en pequeñito, debería haber como una sub pantalla, ¿sabes? Donde vaya llegando como notificaciones de esa, publica una MR o tienes una nueva MR por mirar o cosas de esas, pero en un apartado, porque si no, toda la barra lateral se llena, ¿sabes? Es decir, imagínate que en mis giras hay como 7 y en trabajo en marcha hay como 5, no cabe, ¿no? En la lateral.

> sonnet

> no pongas codex

> Voy a configurar y que salga lo de GitLab, GitHub, estas cosas. ¿Cómo lo haremos? O sea, ¿qué token necesitará? ¿O cuándo pedirá el token? Etcétera, etcétera.

> o más que el token que haya una autentificación de Chrome, ¿no? ¿Sabes? O sea, conéctate a GitHub, conéctate a GitLab, conéctate a Jira, ¿sabes? Como si fuera una aplicación, no sé, lo que sea más fácil.

## The reading

Split from `add-mr-review` (9 nov), which held all of phase 2. Its notes on authentication are
superseded: GitHub and GitLab connect with write-only tokens in Ajustes (add-create-repo, S20).

The MR view: the GitLab/GitHub discussion threads — file and line, the code, replies, resolved
or waiting for you — with replies sent back to the forge; Libretto lens findings as drafts are split
out to add-mr-lens-drafts (9 nov). Needs add-mr-lists.

## Decision log

### Session 2026-11-09
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

## Outcomes

- Clicking an MR row opens the **MR view**: title, project, «Abrir en {forge}», and its threads
  — inline ones grouped by file and line with the code line they point at, general ones apart —
  each comment with author, time and text; GitLab threads say whether they are resolved.
- Threads where the last word is someone else's and you are involved are marked **Te toca
  responder** and counted in the view's header.
- Under each thread, a reply box and **Enviar** post the reply to the forge as you.

## Scope boundaries

**In:** reading threads for MRs of the latest listing, the «te toca responder» mark, posting a
reply to an existing thread or a new general comment. **Out:** starting a new inline comment on a
line, resolving or reopening threads, reactions, editing or deleting comments, suggestions, Libretto
lens drafts (add-mr-lens-drafts), rendering markdown (comments show as plain text).

**Never scoped out:** main reads and posts only for an MR in its latest listing (the W52 listed set);
a reply is sent only by the person's click and never twice for one click; comment text is shown as
text, never markup; tokens stay in main; requests never follow redirects; the view holds the
keyboard like the other modals.

## Constraints

- REST with the stored tokens; `redirect: 'error'`; 10 s per request; M6's error texts.
- The `mr` capability; the view reuses the modal frame (`useModalKeys`, `dlg edmodal`).

## Prior decisions

- **See the forge's comments in Atril** — Pau, 9 nov: «como se ven los comentrios de gitbuh gitlab».
- **Posting needs a click** (assumed): a reply is public and outward-facing.

## Task breakdown

- Main: fetch threads per forge, normalise, mark «te toca responder», post a reply, the listed-MR check.
- Renderer: the MR view with threads and reply boxes; rows open it.

## Verification criteria

- **M5** (amended) When the person activates a row, Atril shall open the MR view (M23); the view's
  «Abrir en {forge}» shall open that MR in the browser.
  Proof: src/renderer/mr/threads.test.ts a row opens the mr view with its threads
- **M18** When the MR view opens, Atril shall show its threads, comments oldest first: on GitHub,
  review comments (`GET /repos/{o}/{r}/pulls/{n}/comments`) grouped by their root
  (`in_reply_to_id`), each carrying `path`, `line` (else `original_line`) and the last line of
  `diff_hunk`, and the general comments (`GET /repos/{o}/{r}/issues/{n}/comments`) as one «General»
  thread; on GitLab, discussions (`GET /projects/:id/merge_requests/:iid/discussions`) without
  system notes, positioned ones carrying `new_path` (else `old_path`) and `new_line` (else
  `old_line`), the individual notes together as one «General» thread, and a thread resolved when
  every resolvable note in it is resolved. A thread with a file but no line shall show as a file
  thread.
  Proof: src/main/forge/threads.test.ts threads come from both forges
- **M19** Atril shall fetch at most 3 pages of 100 items per endpoint; when more exist it shall say
  «Hay más en {forge}: “Te toca responder” puede estar incompleto».
  Proof: src/main/forge/threads.test.ts threads are capped
- **M20** A thread shall be marked «Te toca responder» when its last comment is not yours and either
  you wrote an earlier comment in it or you authored the MR (the author taken from the listing).
  Proof: src/main/forge/threads.test.ts your turn is the last word of someone else
- **M24** The MR view's header shall show how many threads are marked «Te toca responder».
  Proof: src/renderer/mr/threads.test.ts a row opens the mr view with its threads
- **M21** When the person writes a reply and clicks Enviar, Atril shall post it once — GitHub `POST
  /repos/{o}/{r}/pulls/{n}/comments/{root}/replies` for a review thread and `POST
  /repos/{o}/{r}/issues/{n}/comments` for «General»; GitLab `POST
  /projects/:id/merge_requests/:iid/discussions/:id/notes` for a discussion and `POST
  /projects/:id/merge_requests/:iid/notes` for «General» — then show it in the thread; an empty reply
  shall not be sent, and a failure shall keep the text in the box with M6's message.
  Proof: src/main/forge/threads.test.ts a reply is posted once to the right place
  Proof: src/renderer/mr/threads.test.ts a reply is sent with one click and kept on failure
- **M22** If the MR is not in main's latest listing, then reading or posting its threads shall be
  refused without a request, the view saying «Esta MR ya no está en la lista: actualiza» and keeping
  any written text.
  Proof: src/main/forge/threads.test.ts only listed mrs are read or answered
- **M23** The MR view shall show the threads as text (markup in a comment shows literally), and
  close with Escape — asking first when a reply box has unsent text.
  Proof: src/renderer/mr/threads.test.ts a row opens the mr view with its threads

## Approach

### Summary

`src/main/forge/threads.ts`: `readThreads(store, target)` and `reply(store, target, threadId, body)`
per forge, where `target = { forge, ref, author }` comes from a new map of all three lists of the
latest listing, kept beside M17's scorable map (`listMrs` fills both). IPC `atril:mr:threads(url)` and `atril:mr:reply(url, threadId, body)`. The renderer
opens `MrView` (modal) from a row; «Abrir en {forge}» calls the existing guarded open.

### Technical context

`Governs:` — `mr` gains `src/main/forge/threads.ts`; workspaces excludes it at landing.
Files: `src/main/forge/threads.ts` (+test), `src/main/forge/{mrs,guards}.ts` (the listed url→ref map),
`src/main/index.ts`, `src/preload/{api,index}.ts`, `src/renderer/mr/{MrScreen,MrView}.tsx`
(+ `threads.test.ts`), `mockApi.ts`, catalog, styles, the sketch and `bocetos/novedades.html`.

### The approach

- Normalised shape: `Thread { id, forge, file?, line?, code?, resolved?, comments: { id, author, at,
  body }[], yourTurn }`; GitHub review comments carry `path`, `line` (or `original_line`) and
  `diff_hunk` (its last line is the code); GitLab notes carry `position.new_path`, `new_line` and no
  code line (shown without it).
- «You» = the stored account (GitHub login / GitLab username).
- Posting: one request per click; the button disables while sending; a success appends the comment
  the forge returned.
- Pagination: `per_page=100&page=1..3`; GitHub's `Link: rel="next"` or GitLab's `x-next-page` tells
  whether more exist.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| GitHub GraphQL review threads (gives resolved) | a second API for GitHub only; resolved status is the one gap |
| Rendering comments as markdown | a sanitiser or a library for little gain; plain text is safe |
| Replying from the browser only | Pau asked to see and answer them in Atril |

### Risks

| Risk | What catches it |
|---|---|
| A double click posts twice | the button disables while sending; M21's test clicks twice |
| A long discussion | 3 pages per endpoint and the «Hay más» note (M19) |

### Validation and rollback

M18–M23 seen red first. Rollback: one revert; replies already posted stay on the forge.

### Complexity deliberately kept

None.

## Checklist

- [ ] main: the listed url→ref map, threads per forge, your-turn, caps, reply, the listed-only check · Closes: M18, M19, M20, M21, M22
- [ ] the window: rows open the MR view, threads, reply boxes, the header count, Abrir en forge · waits on box 1 · Closes: M5, M21, M23, M24
