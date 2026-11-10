# mr-line-comments

Tracker: none
Targets: mr
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> sigue creando funcionalidades. Tenemos que hacer el mejor gestor de IA, o sea, de orquestador y revisor de MRs, etcétera, porque lo queremos poner para que la gente le sea útil.

## Reading

Comentarios en la línea exacta (lista del 9 nov): en el diff de una MR, comentar una línea y publicarlo en GitHub/GitLab como comentario de revisión.

## Decision log

### Session 2026-11-10
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

## Outcomes

- Un borrador de Libretto con archivo y línea aparece en la MR justo en esa línea del diff; si no se puede, como
  comentario general como hasta ahora, y Atril dice cuál fue.

## Scope boundaries

**In:** publicar en línea en GitHub y GitLab, el respaldo general, el aviso, la cabeza vieja.
**Out:** comentar a mano en el diff; sugerencias aplicables («suggestion»); hilos multilínea; editar lo publicado.
**Never scoped out:** se publica una vez (M27); el texto va tal cual, sin HTML; el token nunca sale de main.

## Prior decisions

- En línea solo con la cabeza actual (assumed, 10 nov).
- Respaldo al comentario general de M27 (assumed, 10 nov).

## Verification criteria

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

- **M27** (amended) When the person clicks Publicar on an open draft, Atril shall publish it once — on its line
  as M36 says, or as the MR's general comment (M21) «**{lens} · {severity}** — `{file}:{line}`» (the location
  part dropped when `file` is absent, `:{line}` when `line` is), a blank line, then the text as written, as
  M37 says — then mark it published. A failure shall keep it open with M6's message. Publishing, sending or
  discarding a draft that is not open, or of an MR outside the latest listing, shall be refused without a
  request.
  Proof: src/main/forge/lenses.test.ts a draft is published once as a general comment
- **M29** (amended) The MR view shall show each draft as text, with Publicar, Mandar al agente (only when main
  offers it) and Descartar while open, and «Publicado» (followed by its note when it has one, M37) or «Enviado
  al agente» with no actions after; Descartar removes it.
  Proof: src/renderer/mr/lenses.test.ts drafts can be published, sent or discarded

## Checklist

- [ ] the line post for GitHub and GitLab with the general fallback · Closes: M27, M36, M37
- [ ] the draft's note in the MR view; sketch; novedades · waits on box 1 · Closes: M29
