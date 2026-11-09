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

> En DMRs, aparte de mostrar ahí en pequeñito, debería haber como una sub pantalla, ¿sabes? Donde vaya llegando como notificaciones de esa, publica una MR o tienes una nueva MR por mirar o cosas de esas, pero en un apartado, porque si no, toda la barra lateral se llena, ¿sabes? Es decir, imagínate que en mis giras hay como 7 y en trabajo en marcha hay como 5, no cabe, ¿no? En la lateral.

> sonnet

> no pongas codex

> Voy a configurar y que salga lo de GitLab, GitHub, estas cosas. ¿Cómo lo haremos? O sea, ¿qué token necesitará? ¿O cuándo pedirá el token? Etcétera, etcétera.

> o más que el token que haya una autentificación de Chrome, ¿no? ¿Sabes? O sea, conéctate a GitHub, conéctate a GitLab, conéctate a Jira, ¿sabes? Como si fuera una aplicación, no sé, lo que sea más fácil.

## The reading

**Connect buttons (9 nov):** «Conectar con GitHub» with GitHub's OAuth device flow (client id
only, no secret, no server) and «Conectar con GitLab» with OAuth + PKCE as a public client
(Atril registered once as an application on gitlab.com; self-hosted GitLab needs its own
registration or falls back to a token). Tokens obtained this way go into the same write-only
encrypted store. Jira stays an API token (phase 1): Atlassian Cloud OAuth needs a client secret.

**Tokens (9 nov):** GitLab (host + PAT with `api`) and GitHub (PAT with `repo`, `read:org`) cards in Ajustes, reusing add-atril-core's write-only encrypted store (spec-settings.md); they replace the `gh`/`glab` approach below for what Atril reads and posts.

**Auth (agreed 9 nov):** Atril never asks for, stores or sees a forge token — everything goes
through `gh` and `glab` with the person's own login, as Jira goes through `jira`. On first
opening the MR screen Atril runs `gh auth status` / `glab auth status`; a missing login shows
"Ejecuta `gh auth login` / `glab auth login` en tu terminal". Scopes: GitHub `repo` +
`read:org`; GitLab `api` (`read_api` would only read). Observed on Pau's Mac (9 nov): gh logged
in as pausf via keyring; glab logged in via the shell's `GITLAB_TOKEN`, which a Finder-launched
app will not inherit — `glab auth login` stores it in glab's config instead.

**AI engine for scores (Pau, 9 nov):** Claude Sonnet via `claude -p --model sonnet --output-format json --json-schema …` on the subscription (no API key) for review difficulty, risk, "qué hace" and "por qué". Deterministic metrics stay AI-free and decide.

**Layout (Pau, 9 nov):** MRs get their own screen, not a sidebar section, reached from a rail of three screens (Trabajo · MR · Avisos) with counters. **Avisos** is a notification feed: review requested, comment on your MR, your agent opened an MR, CI failed, a new MR in a subscribed project, approvals/merges — filterable, each opening its MR or workspace.

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
