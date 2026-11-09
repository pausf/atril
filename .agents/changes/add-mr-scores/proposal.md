Tracker: none
Targets: mr
Durable decisions: the ones in Prior decisions below

# add-mr-scores

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

Scores for the MRs you authored or review (never «Sigo»): deterministic metrics decide —
size, files, cognitive/cyclomatic complexity of the changed code, coverage where available —
and Claude Sonnet via `claude -p --model sonnet --output-format json --json-schema …` on the
subscription explains review difficulty, risk, «qué hace» and «por qué». Needs add-mr-lists.

## Decision log

### Session 2026-11-09
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Qué motor? → A: «sonnet» — Pau, 9 nov; vía `claude -p` con la suscripción, sin clave de API.
- Q: ¿Qué se puntúa? → A: solo Mías y Me toca revisar — Pau, 9 nov: «solo debería revisar como mucho las que son reviewer o las mías».
- Q: ¿Cuándo? → A: bajo demanda, con «Puntuar»; nunca solo, porque gasta la cuota de Claude — Pau cuida el consumo (assumed).
- Q: ¿Se repite? → A: no mientras la MR no cambie: caché por MR y commit; un commit nuevo marca la puntuación como anterior y ofrece «Puntuar de nuevo» (assumed).
- Q: ¿Qué decide y qué explica? → A: lo determinista (tamaño, archivos, tests) se calcula sin IA y va primero; Sonnet da dificultad y riesgo de 1 a 5, qué hace, por qué y dónde mirar (assumed).
- Q: ¿Cómo se llama a Claude? → A: verificado 9 nov con Claude Code 2.1.319: `claude -p --model sonnet --output-format json --tools "" --no-session-persistence --json-schema <schema> "<instrucción>"`, el diff por stdin; la respuesta trae `structured_output` (assumed para el resto de flags).

## Outcomes

- Rows in **Mías** and **Me toca revisar** offer **Puntuar**. Scoring shows, first, what Atril
  measures itself — size S/M/L/XL, +/− lines, files, whether tests changed — and then Claude's
  view: difficulty and risk from 1 to 5, what the MR does, why those numbers, and where to look.
- A score is kept per MR commit and shown again without calling Claude; a newer commit marks it
  as from an earlier commit, with **Puntuar de nuevo**.

## Scope boundaries

**In:** the diff fetch, the deterministic metrics, the Claude call, the cache, the queue, the score
view. **Out:** scoring «Sigo», automatic scoring, code-complexity tools per language (cyclomatic,
coverage, mutation) — later, when a repo is checked out locally —, posting scores to the forge.

**Never scoped out:** Claude runs with no tools and no session saved; the diff reaches it on stdin,
never in argv; tokens never reach Claude or the window; a failed or malformed answer says so and
stores nothing.

## Constraints

- The runner gains stdin input; same no-shell rule (W-criteria).
- Diffs come from the forges with the stored tokens, `redirect: 'error'`, 10 s per request.

## Prior decisions

- **Sonnet, through Claude Code** — Pau, 9 nov.
- **Only mine and to review** — Pau, 9 nov.
- **On demand, cached by commit** (assumed): every score costs quota.

## Task breakdown

- Main: diff fetch per forge; `metrics(diff)`; the Claude call with the schema; cache; one-at-a-time queue.
- Renderer: Puntuar per row, the score chips, the score view.

## Verification criteria

- **M10** Atril shall measure from the diff alone the added and removed lines, the files, whether
  any test file changed (a path with `test`, `spec` or `__tests__`), and a size of S below 100
  changed lines, M below 400, L below 1000 and XL from 1000.
  Proof: src/main/forge/scores.test.ts metrics come from the diff alone
- **M11** When the person asks to score an MR, Atril shall run `claude` with exactly `-p --model
  sonnet --output-format json --tools "" --no-session-persistence --json-schema <schema>` and the
  instruction, send the diff on stdin cut at 120 KB with a note when cut, and take difficulty,
  risk, what, why and where from `structured_output`; if Claude fails or answers outside the
  schema, Atril shall say «Claude no ha podido puntuar esta MR ({detail})» and store nothing.
  Proof: src/main/forge/scores.test.ts scoring runs claude with no tools and the diff on stdin
- **M12** Only rows in Mías and Me toca revisar shall offer Puntuar, and main shall score only an URL
  in those two lists of its latest listing.
  Proof: src/renderer/mr/scores.test.ts only mine and to review can be scored
- **M13** A score shall be stored per MR and head commit; asking again for the same commit shall
  not run Claude, and a listing whose head commit differs shall show the stored score as «De un
  commit anterior» with Puntuar de nuevo.
  Proof: src/main/forge/scores.test.ts a score is kept per commit
- **M14** Atril shall run at most one score at a time and the rest in the order asked.
  Proof: src/main/forge/scores.test.ts scores run one at a time
- **M15** The score view shall show the measured values first and Claude's below, Claude answering
  in the person's language.
  Proof: src/renderer/mr/scores.test.ts the score view puts the measures first

## Approach

### Summary

`src/main/forge/scores.ts`: `fetchDiff(store, item)` (GitHub `GET /repos/{o}/{r}/pulls/{n}` with
`Accept: application/vnd.github.diff`, GitLab `GET /projects/:id/merge_requests/:iid/diffs`
joined into one unified diff), `metrics(diff)`, `scoreWithClaude(diff, metrics, lang, run)`, a
JSON cache in `$ATRIL_HOME/scores/<sha256(url)>.json` holding `{ head, metrics, ai, at }`, and a
promise queue. `listMrs` adds each row's head commit (`head.sha` / `sha`) so the window can tell
a stale score. IPC `atril:mr:score(url)` and `atril:mr:scoreOf(url)`. The renderer adds the
Puntuar button, the chips and a score modal.

### Technical context

Files: `src/main/forge/scores.ts` (+test), `src/main/forge/mrs.ts` (head commit, the url→ref map),
`src/main/run.ts` (stdin), `src/main/index.ts`, `src/preload/{api,index}.ts`,
`src/renderer/mr/{MrScreen,ScoreView}.tsx` (+ `scores.test.ts`), `mockApi.ts`, catalog, styles.

### The approach

- Schema: `{ difficulty: 1–5, risk: 1–5, what: string ≤ 300, why: string ≤ 400, where: string[] ≤ 3 }`,
  `additionalProperties: false`; answers outside it are a failure (M11).
- Instruction: names the language (`es`/`en`), says the measured values decide size and that
  Claude explains, and asks for review difficulty and risk with reasons.
- The runner's `input` is written to the child's stdin and closed; no shell.
- Queue: a single promise chain in main; the window shows «En cola» and «Puntuando…».

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Score every listed MR automatically | spends quota on MRs nobody opens |
| The Anthropic API with a key | Pau uses the subscription; `claude -p` needs no key |
| Diff in the prompt argument | argv has a size limit and shows in process lists |
| Per-language complexity tools now | needs a checkout and toolchains per repo; out until a checkout exists |

### Risks

| Risk | What catches it |
|---|---|
| A huge diff | cut at 120 KB with a note (M11); metrics still use the whole diff |
| Claude's answer drifts from the schema | `--json-schema` plus a check in main; failure stores nothing (M11) |
| The claude CLI changes its flags | the exact argv is pinned by M11's test |

### Validation and rollback

M10–M15 seen red first. Rollback: one revert; cached scores are plain files.

### Complexity deliberately kept

- A queue of one: scores are slow and paid in quota; parallel runs would only burn it faster.

## Checklist

- [ ] main: diff per forge, metrics, the Claude call, cache by commit, one-at-a-time queue, scoring only mine and to review · Closes: M10, M11, M12, M13, M14
- [ ] the window: Puntuar on the right rows, the chips, the score view, stale marker · waits on box 1 · Closes: M12, M13, M15
