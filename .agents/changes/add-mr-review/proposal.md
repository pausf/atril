Tracker: none
Queued: 2026-11-09

# add-mr-review

## The ask, verbatim

Pau, 9 nov 2026:

> ya me gustaria hacer un software de gestion de MR de gitlab o github

> ok adelante , importate lo de claude code para ponerle puntuaciones etc.. de complejidad de IA como explica 530 de las notas etc....

> peor que sea muy parecido pero con flujo de LIBRETTO , las puntuaciones etcc revisor de gitlaby github, que cargue tus tearea de Jira

> donde se ve el tema de la putuacion el apartado de gitlab o github donde se ve la tarea ya en una PR o MR creada con puntuacion o ves MR de otra gente de tus proyectos en favoritos

> Hubhub, GitLab deberían ser tus MRs y MRs donde estés tú como suscrito en el proyecto, ¿vale? O que te hayan puesto como reviewer.

> como se ven los comentrios de gitbuh gitlab

> Pero no debería revisar todas, porque yo no voy a revisar todas las MRs. Entonces, solo debería revisar como mucho las que son reviewer o las mías, pero ya está.

## The reading

**What gets scored (Pau, 9 nov):** only MRs you authored or where you are a reviewer get metrics, AI scores and Libretto lenses. MRs in subscribed projects ("Sigo") are listed only — title, author, CI status, size — with no AI, no metrics and no checkout.

**Comments (Pau, 9 nov):** the MR view shows the GitLab/GitHub discussion threads — file and line, the code, replies, resolved / needs-your-answer — with replies sent back to the forge; Libretto lens findings appear as drafts to publish on the MR, send to the agent, or discard. Sketch: boceto 8, MR view, "Hilos".

**Which MRs appear (Pau, 9 nov, supersedes "favoritos"):** three lists, GitHub and GitLab
alike — the MRs you authored; the MRs where you are a reviewer; and other people's MRs in
the projects you are subscribed to (watching).

Phase 2 of Atril (see add-atril-core's phase table): GitLab and GitHub MRs inside the app —
your own task once it becomes an MR, with its scores (deterministic metrics decide:
cognitive/cyclomatic complexity, CRAP, coverage and mutation of the changed code,
duplication, coupling; `claude -p --json-schema` explains: review difficulty and risk), and
**other people's MRs in the projects you are subscribed to**. Plus Orca's phase-2 part:
built-in diff with inline comments sent back to the agent, open the PR/MR from the app,
and deciding which MR a human reads. Visual reference: `bocetos/app-mac.html` (boceto 6),
"MR" tab.
