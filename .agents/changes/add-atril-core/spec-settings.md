Targets: settings
Governs: src/main/credentials/** src/renderer/settings/**

# settings — the person's tokens, write-only

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

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

## Scope boundaries

**In:** storing, checking, replacing and deleting the Jira token, through a store and a card
shape the phase-2 GitLab and GitHub cards reuse unchanged; the "connect in Ajustes"
state where a feature needs one.

**Out:** a browser login for Jira — Atlassian Cloud's OAuth (3LO) needs a client secret,
which a desktop app cannot keep, so it would need a backend of ours (checked 9 nov); a
browser "Conectar" for GitHub (device flow) and GitLab (PKCE) is phase 2; several accounts per service; reading tokens from `gh`, `glab`
or `jira`; giving tokens to agents. Agents never receive them: the `jira` CLI the Libretto
agent uses stays the person's own (proposal.md W21).

**Never scoped out:** tokens encrypted at rest with the OS keychain; never in a log, a plain
file, or a message to the renderer; inputs are password fields.

## Constraints

- Electron `safeStorage` (macOS Keychain-backed key) encrypts each token; the ciphertext lives
  in `~/.atril/secrets.bin`. If `safeStorage.isEncryptionAvailable()` is false, Atril refuses
  to store and says why — never a plaintext fallback.
- Tokens live only in the main process. The renderer can send a token once (save) and can ask
  whether one exists and for whom; no IPC returns a token.
- Network: only the Jira site URL the person entered (`https://…`, refused otherwise).
- Check: Jira `GET /rest/api/3/myself` with basic auth `email:token`.

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

## Task breakdown

- Encrypted store with save / exists / delete.
- One check call per service.
- Ajustes screen with the Jira card and the write-only states.
- The "Conecta X en Ajustes" state, used by the Jira inbox now and by MR screens in phase 2.

## Verification criteria

- **S1** When a token is saved, Atril shall store it encrypted with `safeStorage` in
  `~/.atril/secrets.bin`, and the file shall not contain the token in clear.
  Proof: src/main/credentials/store.test.ts  saved token is encrypted at rest
- **S2** If `safeStorage` encryption is unavailable, then Atril shall refuse to save and say
  why.
  Proof: src/main/credentials/store.test.ts  refuses to save without keychain encryption
- **S3** No IPC response, log line or file other than `secrets.bin` shall ever contain a saved
  token.
  Proof: src/main/credentials/store.test.ts  token never leaves the main process
- **S4** When the Jira token is saved, Atril shall check it with `/rest/api/3/myself` and show
  the account name, or the service's error without the token.
  Proof: src/main/credentials/check.test.ts  check shows the account or the error
- **S5** While a token is stored, the Ajustes card shall show "Guardado" with the account and
  offer only Reemplazar and Borrar, never the token.
  Proof: src/renderer/settings/settings.test.ts  saved token cannot be seen again
- **S6** If a feature needs a service with no token, it shall show "Conecta <servicio> en
  Ajustes" with a link to that card.
  Proof: src/renderer/settings/settings.test.ts  missing token links to ajustes
- **S7** When the person presses «Crear token en Atlassian», Atril shall open Atlassian's API
  token page in the default browser and nothing else.
  Proof: src/renderer/settings/settings.test.ts  create token button opens the atlassian page
- **S8** While a Jira token is saved, the top bar shall show the account's avatar and display
  name from `/rest/api/3/myself`; the avatar is fetched by the main process and reaches the
  renderer as image data only, never with the token; clicking the chip opens Ajustes.
  Proof: src/renderer/settings/settings.test.ts  top bar shows who is signed in
