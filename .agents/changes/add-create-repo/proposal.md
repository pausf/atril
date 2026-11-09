Tracker: none
Targets: settings
Durable decisions: the ones in Prior decisions below

# add-create-repo

## The ask, verbatim

Pau, 9 nov 2026:

> Tenía también el poder crear repositorios privados o públicos en GitHub, GitLab desde este sitio. ¿Sabes?

## The reading

Not a bug; new work. From Atril, create a repository on GitHub or GitLab — name, description,
private or public — with the person's connected account (phase 2's «Conectar con GitHub /
GitLab», add-mr-review), clone it locally, and register it as an Atril repo so work can start
on it at once. Depends on the forge connection; GitLab group/namespace choice and GitHub
personal vs organisation owner are open questions for its spec.

## Decision log

### Session 2026-11-09
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Cómo se conecta Atril a GitHub y GitLab? → A: con un token en Ajustes, guardado cifrado y que no se vuelve a ver, como Jira — Pau, 9 nov: «Pensaba poner los tokens … de GitLab, GitHub y de Jira, no utilizar los GH» y «una vez que lo ponen, que ya no se puede visualizar».
- Q: ¿GitLab propio? → A: dirección configurable, `https://gitlab.com` por defecto (assumed).
- Q: ¿Dueño del repo? → A: la cuenta personal del token; organizaciones y grupos quedan fuera de este cambio (assumed).
- Q: ¿Visibilidad por defecto? → A: privado; «Público» pide confirmarlo con un segundo clic que dice que cualquiera podrá verlo (assumed).
- Q: ¿Cómo se clona? → A: por SSH con la URL que devuelve la forja; el token nunca entra en una URL ni en un comando de git; si SSH falla se dice y se muestra el comando para hacerlo a mano (assumed).
- Q: ¿Inicializar el repo? → A: con un README, para que se pueda clonar y crear ramas al momento (assumed).
- Q: (spec-reviewer) ¿Quién es dueño de crear y clonar? → A: workspaces (`src/main/forge/**` cae en su `Governs:`): W49–W51 en `spec-workspaces.md`; settings se queda con conexiones, tarjetas y diálogo (assumed).
- Q: (spec-reviewer) ¿Qué dirección de GitLab vale? → A: solo `https://`, como Jira (assumed).
- Q: (spec-reviewer) ¿Y un 403, un 5xx o un fallo de red al conectar? → A: nada se guarda; «… ha rechazado el token ({status})» o «No se ha podido conectar con … ({detail})» (assumed).
- Q: (spec-reviewer) ¿Qué id toma el repo en Atril? → A: el de `registerRepo`; si está cogido, el libre que propone; la carpeta usa el nombre que devuelve la forja (assumed).
- Q: (spec-reviewer) ¿Diálogo sin forjas conectadas? → A: dice «Conecta GitHub o GitLab en Ajustes» y Crear queda desactivado; «Clonar y añadir a Atril» empieza desmarcado (assumed).

## Outcomes

- Ajustes has **GitHub** and **GitLab** cards like Jira's: paste a token (and, for GitLab, the
  address), Atril checks it against the forge, stores it encrypted, shows the account, and never
  shows the token again.
- The Repos card has **«Crear repo…»**: forge (only connected ones), name, description, Privado or
  Público, and «Clonar y añadir a Atril» with a parent folder. Atril creates it under the
  person's account, shows its link, and — when asked — clones it there and registers it as an
  Atril repo.

## Scope boundaries

**In:** the two connections, creating a personal repo with a README, the optional clone and
registration. **Out:** organisations and groups, templates, licences and .gitignore choices,
deleting or renaming repos, cloning over HTTPS with the token, using `gh` or `glab`.

**Never scoped out:** tokens live only in main, encrypted, never in the window, a log, a git URL
or an agent's environment; the name is validated before any request; a public repo needs the
explicit confirmation; the cards and the dialog are keyboard-operable.

## Constraints

- Same secret store and write-only pattern as Jira (S1–S8); no new dependency.
- GitHub REST `GET /user`, `POST /user/repos`; GitLab REST `GET /api/v4/user`,
  `POST /api/v4/projects` with `PRIVATE-TOKEN`.
- Registration reuses `registerRepo` (W1–W4).

## Prior decisions

- **Create repos from Atril** — Pau, 9 nov: «poder crear repositorios privados o públicos en
  GitHub, GitLab desde este sitio».
- **Tokens, not the CLIs** — Pau, 9 nov (decision log above).
- **SSH for the clone** (assumed): a token in a remote URL ends up in `.git/config` in clear.

## Task breakdown

- The GitHub and GitLab connections (check, store, cards).
- Creating the repo (validation, visibility, request, result).
- Cloning over SSH into a chosen folder and registering it.

## Verification criteria

- **S20** When the person saves a GitHub token, or a GitLab `https://` address and token, Atril
  shall check it against the forge's `/user` and store it only on a 2xx answer, then show the
  account name and never the token; on any other status it shall show «{forge} ha rechazado el
  token ({status}). No se ha guardado.», on a network failure «No se ha podido conectar con
  {forge} ({detail}).», and for a GitLab address that is not `https://` «La dirección de GitLab
  debe empezar por https://» — storing nothing in all three.
  Proof: src/main/credentials/forge.test.ts a forge token is checked before it is stored
- **S23** While Público is chosen, Crear shall stay disabled until the person ticks «Entiendo que
  cualquiera podrá verlo».
  Proof: src/renderer/settings/createrepo.test.ts a public repo needs the confirmation
- **S25** The forge status answers sent to the window shall carry `saved`, the account and the
  address, and nothing derived from the token.
  Proof: src/main/credentials/forge.test.ts forge status carries no token
- **S26** While no forge is connected, the Crear repo dialog shall say «Conecta GitHub o GitLab en
  Ajustes» and keep Crear disabled; otherwise it shall offer only the connected forges, with
  «Clonar y añadir a Atril» unticked.
  Proof: src/renderer/settings/createrepo.test.ts the dialog offers only connected forges

## Approach

### Summary

`src/main/credentials/forge.ts` checks and stores the two tokens through the existing secret
store (`github`, `gitlab`); `src/main/forge/create.ts` validates, creates (GitHub
`POST /user/repos` with `auto_init`, GitLab `POST /api/v4/projects` with
`initialize_with_readme`), and optionally clones and registers. The window gets two cards in
Ajustes, mirroring the Jira card, and a «Crear repo…» dialog from the Repos card.

### Technical context

Files: `src/main/credentials/forge.ts` (+test), `src/main/forge/create.ts` (+test),
`src/main/index.ts` (IPC), `src/preload/{api,index}.ts`, `src/renderer/settings/{Forges,
CreateRepo}.tsx` (+ `createrepo.test.ts`), `Ajustes.tsx`, `Repos.tsx`, the catalog for the new
texts (S16), the sketch. Gates: typecheck, lint, test.

### The approach

- Checks: GitHub `GET https://api.github.com/user` with `Authorization: Bearer`, `Accept:
  application/vnd.github+json`; GitLab `GET <site>/api/v4/user` with `PRIVATE-TOKEN`; 10 s
  timeout; network error codes only, never messages (as Jira, S-criteria).
- Create: the forge answer gives `html_url`/`web_url` and `ssh_url`/`ssh_url_to_repo`.
- Clone: refuse if `<folder>/<forge path>` exists; `git clone -- <ssh url> <folder>/<forge path>`
  through the runner, with no credential in argv or env; then `registerRepo(path)`, and on
  `id-taken` again with the suggested id.
- Tests inject `fetch` and use a local bare repository as the "SSH URL", so cloning runs
  offline.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| `gh repo create` / `glab repo create` | Pau chose tokens over the CLIs |
| Browser OAuth login | needs an OAuth app registered per forge and a redirect server; tokens work today |
| HTTPS clone with the token in the URL | the token would sit in `.git/config` in clear |

### Risks

| Risk | What catches it |
|---|---|
| A public repo created by mistake | private default and the explicit confirmation (S23) |
| SSH keys not set up | the clone fails cleanly with the manual command (S24); the repo still exists |
| GitLab self-hosted with a self-signed certificate | the check fails with the network code, as Jira's |

### Validation and rollback

S20–S25 seen red first. Rollback: one revert; repos already created stay on the forge.

### Complexity deliberately kept

- Two forges behind one small `Forge` shape (check URL, create URL, headers, field names): the
  difference is data, not code paths.

## Checklist

- [x] the GitHub and GitLab connections: check, store, the two cards · Closes: S20, S25
- [x] creating the repo: validation, the request, the dialog with the public confirmation · waits on box 1 · Closes: W49, W50, S23, S26
- [x] clone over SSH and register · waits on box 2 · Closes: W51, W52
