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
  mark the draft published. One test holds GitHub and GitLab.
  Proof: src/main/forge/linecomments.test.ts a draft lands on its line
- **M37** If that line post answers 422 or 400, or the drafts are stale, or the draft has no `file` or `line`,
  then Atril shall post it as M27's general comment instead, once, and the draft shall read «Publicado como
  comentario general: esa línea no está en el diff» in the first case.
  Proof: src/main/forge/linecomments.test.ts a draft that cannot land falls back to a general comment

## Checklist

- [ ] the line post for GitHub and GitLab with the general fallback · Closes: M36, M37
- [ ] the draft's note in the MR view; sketch; novedades · waits on box 1
