Tracker: none

# add-atril-core

## The ask, verbatim

Pau, 9 nov 2026, en una sola conversación (en orden):

> ya me gustaria hacer un software de gestion de MR de gitlab o github

> podriamos combinar libretto con un nuevo softwaree de gestion con integration co github y gitlab para revisar lo que se tiene que ver etc... si quieres primero hazme bocetos en html. es un aaplicacion repito de MAC

> no tiene que combinar la dos cosas, para que sea un flujo en un app y que gestione githib y gitlab con lo que te pasado de flujos

> tambien que lea lo jira asignado a la persona que va

> haz un diseño mas visual, intentqado que se pueda abrir lo sugagente con lo que se esta trabajando por tara para ver como va etc..

> busca en intenet diseño etc... tiene que se mas minimalistas para que todo sea entendible

> tiene que funcionar como https://www.onorca.dev/

> ok adelante , importate lo de claude code para ponerle puntuaciones etc.. de complejidad de IA como explica 530 de las notas etc....

> mw gustaia hacerlo de 0 no utlizar orca

> peor que sea muy parecido pero con flujo de LIBRETTO , las puntuaciones etcc revisor de gitlaby github, que cargue tus tearea de Jira

> pero que tenga la funcionalidades tambien de orca ehh

> sisi con electron y typescript

"los flujos" y "530 de las notas" are the two 540 newsletters he pasted (#13 and #14):
software factory with deterministic guardrails shifted left, explain-pr, deciding which PRs
a human reads, spec-first, an orchestrator with core / worker / workflow executor / UI.

## The reading

**Not a bug.** Nothing exists yet; this is new work.

The whole product, agreed across the conversation: a native-feeling Mac app, built from
scratch in Electron + TypeScript, that works like Orca (an agent development environment:
one git worktree per agent, real agent terminals in split panes, Claude Code and Codex,
usage meters) and adds what Orca lacks — the Libretto flow as the spine of every piece of
work, the person's own Jira tasks as the input, and review of GitLab and GitHub MRs with
scores (deterministic metrics decide, `claude -p --json-schema` explains). AI goes through
the Claude Code CLI on the subscription, never an API key.

Delivered in four phases, agreed 9 nov:

| Phase | Orca's part | Atril's own part |
|---|---|---|
| **1 · core — THIS CHANGE** | worktree per agent · real terminals with split panes · Claude Code and Codex · usage meters · macOS notifications | the person's Jira sprint tasks · Libretto flow per stage · "Empezar" opens a worktree and launches `/libretto-flow <KEY>` |
| 2 · review | built-in diff with inline comments sent back to the agent · open PR/MR from the app | GitLab and GitHub MRs · scores · which MR a human reads |
| 3 · comfort | file and Markdown previews · ⌘K jump anywhere · dictation · chat beside the terminal | visible guardrails · the spec stop inside the app |
| 4 · scale | remote hosts over SSH · scheduled automations · embedded browser · mobile app | a model per stage (Claude, Codex, Qwen on the VPS) |

**This change is phase 1 only.** Phases 2–4 are later changes.

Visual reference: `bocetos/app-mac.html` (boceto 6) — left sidebar with Jira tasks and
worktrees, centre the agent's terminal, right the Libretto panel. Minimal: colour only for
state (needs you / working / failed). Earlier sketches kept in `bocetos/` for history.

Orca (`github.com/stablyai/orca`, MIT, TypeScript + Electron) may be read for how it solves
PTYs and worktrees, and pieces reused with attribution — but Atril does not run on it.
