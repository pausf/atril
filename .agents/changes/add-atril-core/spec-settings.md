Targets: settings
Governs: src/main/secrets/** src/renderer/settings/**

# settings — the person's tokens, write-only

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- A **Ajustes** screen, reached from the rail, with one card per service: **Jira** (site URL,
  email, API token), **GitLab** (host, default `https://gitlab.com`, personal access token)
  and **GitHub** (personal access token).
- Wherever a feature needs a service with no token stored, it says so and links to Ajustes
  ("Conecta Jira en Ajustes") instead of failing.
- Saving a token checks it with one call and shows the account it belongs to, or the error.
- **Once saved, a token is never shown again** — not in Ajustes, not anywhere. The card shows
  "Guardado · <cuenta>" with **Reemplazar** and **Borrar**. Replacing means pasting a new one.

## Scope boundaries

**In:** storing, checking, replacing and deleting the three tokens; the "connect in Ajustes"
state where a feature needs one.

**Out:** OAuth browser flows; several accounts per service; reading tokens from `gh`, `glab`
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
- Network: only the service the token belongs to — the Jira site URL the person entered,
  the GitLab host, `api.github.com`.
- Checks: Jira `GET /rest/api/3/myself` (basic auth email:token), GitLab `GET /api/v4/user`
  (`PRIVATE-TOKEN`), GitHub `GET /user` (`Authorization: Bearer`).

## Prior decisions

- **Tokens in the app, hybrid** — Pau, 9 nov: «Pensaba poner los tokens, o sea, los tokens de
  GitLab, GitHub y de Jira, no utilizar los GH y cosas de estas», then «Yo lo haría, vale,
  híbrido». Atril uses its own tokens for everything it reads and posts; agents keep their
  CLIs and never see the tokens.
- **Write-only once saved** — Pau, 9 nov: «donde pongan los tokens, pero ocultos … una vez que
  lo ponen, que ya no se puede visualizar».

## Task breakdown

- Encrypted store with save / exists / delete.
- One check call per service.
- Ajustes screen with the three cards and the write-only states.
- The "Conecta X en Ajustes" state, used by the Jira inbox now and by MR screens in phase 2.

## Verification criteria

- **S1** When a token is saved, Atril shall store it encrypted with `safeStorage` in
  `~/.atril/secrets.bin`, and the file shall not contain the token in clear.
  Proof: src/main/secrets/store.test.ts  saved token is encrypted at rest
- **S2** If `safeStorage` encryption is unavailable, then Atril shall refuse to save and say
  why.
  Proof: src/main/secrets/store.test.ts  refuses to save without keychain encryption
- **S3** No IPC response, log line or file other than `secrets.bin` shall ever contain a saved
  token.
  Proof: src/main/secrets/store.test.ts  token never leaves the main process
- **S4** When a token is saved, Atril shall check it with the service's identity call and show
  the account name, or the service's error without the token.
  Proof: src/main/secrets/check.test.ts  check shows the account or the error
- **S5** While a token is stored, the Ajustes card shall show "Guardado" with the account and
  offer only Reemplazar and Borrar, never the token.
  Proof: src/renderer/settings/settings.test.ts  saved token cannot be seen again
- **S6** If a feature needs a service with no token, it shall show "Conecta <servicio> en
  Ajustes" with a link to that card.
  Proof: src/renderer/settings/settings.test.ts  missing token links to ajustes
