# qa-to-mr

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> haz 1 3 5 6

(3 = «Evidencia de verdad en la MR»: la QA en vivo ya guarda un resultado por criterio; que llegue a la MR. Idea sacada del «Verifier» de las fábricas de software, que adjunta evidencia de ejecución, 11 nov.)

## Decision log

### Session 2026-11-11
- Q: (revisión en frío) ¿Qué MR, exactamente? → A: una de «Mías» (la persona es la autora, así se puede comentar) cuya rama es la del trabajo y cuyo proyecto resuelve al repo del trabajo con la misma búsqueda que `openmr`; con varias, la actualizada más tarde; sin ninguna, no hay botón (assumed).
- Q: (revisión en frío) ¿Y si nunca se abrió la pantalla MR? → A: main pide la lista de MRs él mismo, reutilizando la última si tiene menos de 60 s (assumed).
- Q: (revisión en frío) ¿Idioma y criterios sin pasos? → A: el comentario va en el idioma de la app; un criterio que falla lleva su nota, o si no su último paso, como cita (`> `); sin objetivo, la primera línea no lo nombra (assumed).
- Q: (construcción) ¿Cómo lleva el fallo del comentario W150 completo? → A: `threads.reply` devuelve también `detail` y `fix` cuando la forja falla (`MrReply` los admite); `threads.test.ts` exige ahora los tres; y `openmr.ts` exporta `remoteNaming` para que la QA resuelva el repo igual que «Seguir en Atril» (assumed).
- Q: (construcción) ¿Formato del comentario? → A: cada línea es su propio párrafo (líneas separadas por una en blanco) para que la cita `> ` no se trague la siguiente; el texto del criterio sin su id; el objetivo como su pestaña («Chrome», «Android · app») (assumed).
- Q: ¿Cuándo llega a la MR? → A: solo cuando la persona pulsa «Publicar en la MR» en la pantalla QA; Atril no crea la MR (la abre el agente) ni publica solo (assumed).
- Q: ¿Qué se publica? → A: un comentario general con el objetivo probado y una línea por criterio — Pasa, Falla o Sin probar — y, en los que fallan, su último paso; las capturas no (GitHub no tiene API para subir imágenes a un comentario): el comentario dice que están en Atril (assumed).
- Q: ¿Cómo sabe Atril cuál es la MR? → A: la MR abierta de la lista de MRs cuya rama y repo coinciden con los del trabajo (assumed).

## Outcomes

- Quien revisa la MR ve qué criterios se probaron en vivo y con qué resultado, sin salir de GitHub o GitLab.

## Scope boundaries

**In:** `atril:qa:mrFor(id)` y una función en main que arma el texto y lo publica por la API de la forja que ya usa Atril (`src/main/forge/threads.ts` o la que publique comentarios generales), IPC `atril:qa:publish(id)`, el botón en `src/renderer/qa/QaScreen.tsx`, i18n. **Out:** subir capturas; editar un comentario anterior; publicar sin pulsar.

## Constraints

- El token no sale de main; la ventana manda solo el id del trabajo.
- Textos del comentario por `t()` en el idioma de la app.
- Los errores siguen W150 (frase por causa, botón, detalle plegado).

## Prior decisions

- La QA llega a la MR como un comentario que la persona publica; nunca sola.

## Verification criteria

- **W170** When «Publicar en la MR» is pressed for a workspace that has its MR (Decision log), main shall post one general comment on that MR: «Pruebas en vivo con Atril · {target}» (or without « · {target}» when there is none), one line per criterion «{Pasa|Falla|Sin probar} · {criterion text}», each failing one followed by a quoted line (`> `) with its note or else its last step, and «Las capturas están en Atril.» — all in the app's language; the screen then shows «Publicado en la MR» with a link to the MR and the button becomes «Publicar de nuevo».
  Proof: src/main/qa-publish.test.ts the qa summary reaches the mr as one comment
- **W174** The QA screen shall ask main (`atril:qa:mrFor(id)`) which MR the workspace has, by the Decision log's rule, listing MRs itself when its last list is older than 60 s.
  Proof: src/main/qa-publish.test.ts the work's own mr is found by repo and branch
- **W171** While the workspace has no MR, the QA screen shall show «Abre la MR para poder publicar aquí la QA.» instead of the button; while a post runs the button is disabled, so a second press sends nothing; if posting fails, it shall show the W150 problem with its button and post nothing more.
  Proof: src/renderer/qa-publish.test.ts without an mr the button is not offered and a failure says why

## Approach

### Summary

`qaPublish(id)` lee el informe (`qaReport`), busca la MR por repo y rama en la última lista de MRs, arma el texto y lo publica con la llamada de comentario general que ya existe en los hilos.

### Technical context

`src/main/qa-report.ts` (informe), `src/main/forge/threads.ts` (sesión y llamada a la forja), `src/main/index.ts` (la última lista de MRs), `QaScreen.tsx`. Tests con `fetch` falso.

### The approach

Texto puro en una función (`qaSummary(report, t)`) probada aparte; la publicación reutiliza la sesión de `threads.ts`.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Ponerlo en la descripción de la MR | la escribe el agente al crearla; reescribirla pisa lo suyo |
| Subir capturas | GitHub no tiene API para imágenes en comentarios; GitLab sí: queda para después |

### Risks

| Risk | Mitigation |
|---|---|
| Publicar dos veces | el botón se desactiva mientras publica; un segundo comentario es visible y se puede borrar |

### Validation and rollback

Tests rojos primero; la app real con un servidor de forja falso. Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] encontrar la MR del trabajo, y el texto y su publicación en main · Closes: W174, W170
- [x] el botón, sin MR y con error · waits on box 1 · Closes: W171
