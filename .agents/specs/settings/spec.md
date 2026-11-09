# Settings

Governs: src/main/credentials/** src/renderer/settings/**

## Outcomes

- A **Ajustes** screen, reached from the rail (Trabajo · Ajustes in this phase), with the
  **Jira** card: site URL, email, API token, and a **«Crear token en Atlassian»** button that
  opens `https://id.atlassian.com/manage-profile/security/api-tokens` in the browser. The GitLab and GitHub cards are phase 2
  (add-mr-review) and reuse this same store and screen.
- Wherever a feature needs a service with no token stored, it says so and links to Ajustes
  ("Conecta Jira en Ajustes") instead of failing.
- Saving a token checks it with one call and shows the account it belongs to, or the error.
- The top bar shows **who is signed in**: the Jira account's avatar and display name, as a
  session chip; clicking it opens Ajustes. With no token, the chip says "Sin conectar". In
  phase 2 the GitHub and GitLab avatars join it.
- **Once saved, a token is never shown again** — not in Ajustes, not anywhere. The card shows
  "Guardado · <cuenta>" with **Reemplazar** and **Borrar**. Replacing means pasting a new one.

### Board columns (use-jira-board-columns, 9 nov 2026)

- The Jira card in Ajustes gains **Tablero**: a search field that lists the boards whose name
  matches, and the chosen one shown as "Tablero: <nombre>" with Cambiar.

### Repos in Ajustes (move-repos-to-settings, 9 nov 2026)

- Ajustes has a **Repos** card: one row per registered repo with its id and path, and a mode
  select — «Auto · <detected mode>», «Worktree», «In-place» — plus «Añadir repo…».
- The Trabajo sidebar shows **«＋ Nuevo trabajo»** above «Trabajo en marcha» and no repo list.

## Scope boundaries

**In:** storing, checking, replacing and deleting the Jira token, through a store and a card
shape the phase-2 GitLab and GitHub cards reuse unchanged; the "connect in Ajustes"
state where a feature needs one.

**Out:** a browser login for Jira — Atlassian Cloud's OAuth (3LO) needs a client secret,
which a desktop app cannot keep, so it would need a backend of ours (checked 9 nov); a
browser "Conectar" for GitHub (device flow) and GitLab (PKCE) is phase 2; several accounts per service; reading tokens from `gh`, `glab`
or `jira`; giving tokens to agents. Agents never receive them: the `jira` CLI the Libretto
agent uses stays the person's own (the workspaces spec W21).

**Never scoped out:** tokens encrypted at rest with the OS keychain; never in a log, a plain
file, or a message to the renderer; inputs are password fields.

### Board columns (use-jira-board-columns, 9 nov 2026)

**In:** searching boards by name, picking one, remembering it. **Out:** several boards.

### Repos in Ajustes (move-repos-to-settings, 9 nov 2026)

**In:** the Repos card (list, mode select, add with the id prompt), removing the sidebar's Repos
section and its per-repo «+ trabajo» form, the sidebar button (`spec-workspaces.md`), the
dialog's optional text and the no-repo pointer (`spec-work-inbox.md`). **Out:** removing a repo
(not possible today either), renaming a repo, editing its path.

**Never scoped out:** the card uses only native `<select>`, `<input>` and `<button>` controls, so
it is keyboard-reachable like the other cards (W22) — a ceiling named: no test drives it by
keyboard; add one if a custom control ever replaces a native one. The add flow keeps its
validation (id pattern, not a git folder).

## Constraints

- Electron `safeStorage` (macOS Keychain-backed key) encrypts each token; the ciphertext lives
  in `~/.atril/secrets.bin`. If `safeStorage.isEncryptionAvailable()` is false, Atril refuses
  to store and says why — never a plaintext fallback.
- Tokens live only in the main process. The renderer can send a token once (save) and can ask
  whether one exists and for whom; no IPC returns a token.
- Network: only the Jira site URL the person entered (`https://…`, refused otherwise).
- Check: Jira `GET /rest/api/3/myself` with basic auth `email:token`.

### Board columns (use-jira-board-columns, 9 nov 2026)

- `GET /rest/agile/1.0/board?name=<q>&maxResults=50`, in main, with the saved Jira creds.
- The board id and name are stored with the account metadata, never inside the token blob.

### Repos in Ajustes (move-repos-to-settings, 9 nov 2026)

- Same `repos` API as today (`list`, `add`, `addWithId`, `setOverride`); nothing in main changes.
- The card sits between Jira and Apariencia and uses the existing card styles.

## Prior decisions

- **Tokens in the app, hybrid** — Pau, 9 nov: «Pensaba poner los tokens, o sea, los tokens de
  GitLab, GitHub y de Jira, no utilizar los GH y cosas de estas», then «Yo lo haría, vale,
  híbrido». Atril uses its own tokens for everything it reads and posts; agents keep their
  CLIs and never see the tokens.
- **«Lo que sea más fácil»** — Pau, 9 nov: «o más que el token que haya una autentificación de
  Chrome … conéctate a GitHub, conéctate a GitLab, conéctate a Jira … lo que sea más fácil».
  Jira stays a token with a button to the page that creates it; GitHub and GitLab get browser
  "Conectar" in phase 2.
- **A session chip with the account's avatar** — Pau, 9 nov: «que cogiera el icono del Jira
  o del GitHub o del GitLab … para mostrar como arriba como una sesión … saber que soy yo el que
  está en esa sesión de atril».
- **Only phase 1 now** — Pau, 9 nov: «Y hacemos solo la fase 1 núcleo». The GitLab and GitHub
  cards move to add-mr-review.
- **Write-only once saved** — Pau, 9 nov: «donde pongan los tokens, pero ocultos … una vez que
  lo ponen, que ya no se puede visualizar».

### Board columns (use-jira-board-columns, 9 nov 2026)

- **One board, picked by the person** — work-inbox spec, decision log (assumed).

### Repos in Ajustes (move-repos-to-settings, 9 nov 2026)

- **Repos are configuration** — Pau, 9 nov: «el diseño de erepos es raro» → «ok» to the sketch:
  repos live in Ajustes; the Trabajo sidebar is for the work that is running.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Keep repos in the sidebar, compacted | still config mixed with daily work; Pau's «raro» was about the place, the sketch was approved |
| A separate Repos screen in the rail | a fourth screen for something touched once |
| Keep «+ trabajo» per repo in Ajustes | starting work belongs where the work is, not in settings |

#### Decision log, answers as given (2026-11-09)
- Q: ¿Te vale el boceto `bocetos/repos.html` (repos en Ajustes, «＋ Nuevo trabajo» en la barra)? → A: «ok».
- Q: «No le preguntes, tú sigue» stands → the rest taken with the recommended option, marked (assumed).
- Q: ¿Cómo se llama el diálogo cuando se abre desde Trabajo? → A: «Nuevo trabajo», el mismo diálogo que «Nueva tarea» con el texto opcional (assumed).
- Q: ¿Y sin texto? → A: Claude a secas, sin `/libretto:libretto-flow`, como hacía «+ trabajo»; la rama hay que escribirla (assumed).
- Q: (spec-reviewer) ¿«Auto» guarda el modo detectado? → A: no: Auto quita lo forzado (`setOverride(id, null)`), así la detección sigue mandando (W4) (assumed).
- Q: (spec-reviewer) ¿Qué pasa al pulsar «Ir a Ajustes»? → A: el diálogo se cierra y se ve Ajustes; al volver se abre de nuevo y relee los repos (assumed).
- Q: (spec-reviewer) ¿Qué dice el diálogo sin texto obligatorio? → A: etiqueta «¿Qué hay que hacer? (opcional)»; la fila «Lanza» muestra `claude` sin texto y `/libretto:libretto-flow «tu texto»` con texto (assumed).
- Q: (spec-reviewer) ¿Y el boceto? → A: `bocetos/repos.html` queda como registro de la decisión; `fase1-nucleo.html` se actualiza para verse igual (tarjeta en Ajustes, botón en la barra) (assumed).
- Q: (spec-reviewer) ¿El tutorial? → A: no tiene paso de repos; no cambia (assumed).
- Q: ¿Dónde se ve el motivo del modo? → A: como `title` del desplegable y, en texto, bajo el nombre cuando el modo es in-place, que es el que conviene entender (assumed).

## Task breakdown

- Encrypted store with save / exists / delete.
- One check call per service.
- Ajustes screen with the Jira card and the write-only states.
- The "Conecta X en Ajustes" state, used by the Jira inbox now and by MR screens in phase 2.

## Verification criteria

- **S1** When a token is saved, Atril shall store it encrypted with `safeStorage` in
  `~/.atril/secrets.bin`, and the file shall not contain the token in clear.
  Proof: src/main/credentials/store.test.ts saved token is encrypted at rest
- **S2** If `safeStorage` encryption is unavailable, then Atril shall refuse to save and say
  why.
  Proof: src/main/credentials/store.test.ts refuses to save without keychain encryption
- **S3** No IPC response, log line or file other than `secrets.bin` shall ever contain a saved
  token.
  Proof: src/main/credentials/store.test.ts token never leaves the main process
- **S4** When the Jira token is saved, Atril shall check it with `/rest/api/3/myself` and show
  the account name, or the service's error without the token.
  Proof: src/main/credentials/check.test.ts check shows the account or the error
- **S5** While a token is stored, the Ajustes card shall show "Guardado" with the account and
  offer only Reemplazar and Borrar, never the token.
  Proof: src/renderer/settings/settings.test.ts saved token cannot be seen again
- **S6** If a feature needs a service with no token, it shall show "Conecta <servicio> en
  Ajustes" with a link to that card.
  Proof: src/renderer/settings/settings.test.ts missing token links to ajustes
- **S7** When the person presses «Crear token en Atlassian», Atril shall open Atlassian's API
  token page in the default browser and nothing else.
  Proof: src/renderer/settings/settings.test.ts create token button opens the atlassian page
- **S8** While a Jira token is saved, the top bar shall show the account's avatar and display
  name from `/rest/api/3/myself`; the avatar is fetched by the main process and reaches the
  renderer as image data only, never with the token; clicking the chip opens Ajustes.
  Proof: src/renderer/settings/settings.test.ts top bar shows who is signed in

### Board columns (use-jira-board-columns, 9 nov 2026)

- **S9** When the person searches and picks a board in Ajustes, Atril shall store its id and
  name, and show it on the Jira card.
  Proof: src/renderer/settings/settings.test.ts picks a board and keeps it
- **S10** When the Jira token is replaced, Atril shall keep the picked board; when it is
  deleted, Atril shall forget the board too.
  Proof: src/main/credentials/store.test.ts board survives replacing the token and is forgotten on delete

### Repos in Ajustes (move-repos-to-settings, 9 nov 2026)

- **S11** While Ajustes is shown, the Repos card shall list every registered repo with its id,
  its path and a mode select offering «Auto · <detected mode>», «Worktree» and «In-place»;
  choosing «Worktree» or «In-place» shall store it as the repo's mode (W4), choosing «Auto» shall
  clear it, and the select shall show the choice; a repo detected as in-place shall show the
  reason under its path.
  Proof: src/renderer/settings/repos.test.ts repos card lists and sets the mode
- **S12** When the person adds a repo from the card and its id is taken, the card shall ask for
  another id and register it with the one given.
  Proof: src/renderer/settings/repos.test.ts adding a repo asks for a free id
- **S13** If the folder the person picks is not a git repository, then the card shall say «Esa
  carpeta no es un repositorio git.» and register nothing.
  Proof: src/renderer/settings/repos.test.ts a folder that is not git is refused
