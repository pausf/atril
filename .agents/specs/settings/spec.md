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

### Language (add-language, 9 nov 2026)

- Ajustes has an **Idioma** card: Español · English · Sistema. Choosing one switches the window,
  the app menu and new Mac notifications at once, and the choice survives restarts.
- What Atril did not write — the terminal, Claude's words, Jira titles, file names and contents —
  stays exactly as it came.

### Create repos (add-create-repo, 9 nov 2026)

- Ajustes has **GitHub** and **GitLab** cards like Jira's: paste a token (and, for GitLab, the
  address), Atril checks it against the forge, stores it encrypted, shows the account, and never
  shows the token again.
- The Repos card has **«Crear repo…»**: forge (only connected ones), name, description, Privado or
  Público, and «Clonar y añadir a Atril» with a parent folder. Atril creates it under the
  person's account, shows its link, and — when asked — clones it there and registers it as an
  Atril repo.

### Hook prefixes (translate-hook-prefixes, 9 nov 2026)

- In English, activity lines and needs-you notifications read «Reading x.php», «Claude says: …»,
  «Asks you: …», «✗ phpunit failed» — Atril's words translated, what follows exactly as written.

### Connections (redesign-connections, 10 nov 2026)

- Ajustes opens with three connection rows that read at a glance and do not take up half the screen.
- Conectar guides in three steps and says which permissions are needed; nothing looks disabled for no reason.
- Gestionar shows Reemplazar and Borrar (and the board in Jira) without ever showing the token (S5).
- In a wide window, Ajustes uses two columns.

### Plain errors (plain-errors, 11 nov 2026)

- Connecting Jira with an address that does not respond says what failed, without the exception name, with the code folded under «Ver detalle».

### Damaged state files (state-files, 11 nov 2026)

- With a damaged `repos.json`, Ajustes → Repos says which one and what you cannot do, with «Mostrar en Finder», instead of «Aún no hay ninguno».

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

- Connecting GitHub or GitLab states the cause without the exception name, with the code folded, like Jira (S32).

### Broken repos (repo-gone, 11 nov 2026)

- Ajustes → Repos marks a broken repo and lets you look for its folder or remove it; any repo can be removed.

### Notifications (Ajustes and Avisos) (notify-ui, 14 nov 2026)

- In Ajustes you choose, per type, whether it reaches the Mac, only Avisos or nothing; set a whole group at once; see how each one arrives; set the waiting reminder, focus, grouping and quiet hours; send a test; and learn — with a button to fix it — when macOS blocks Atril.

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

### Language (add-language, 9 nov 2026)

**In:** the setting, the window's text, the menu, notifications, main's messages that reach the
window. **Out:** more languages, translating Jira or Claude, dates and numbers formatted per
locale beyond the time already shown, the sketches.

**Never scoped out:** a text with no English entry shows in Spanish rather than empty; the card is
keyboard-reachable like Apariencia.

### Create repos (add-create-repo, 9 nov 2026)

**In:** the two connections, creating a personal repo with a README, the optional clone and
registration. **Out:** organisations and groups, templates, licences and .gitignore choices,
deleting or renaming repos, cloning over HTTPS with the token, using `gh` or `glab`.

**Never scoped out:** tokens live only in main, encrypted, never in the window, a log, a git URL
or an agent's environment; the name is validated before any request; a public repo needs the
explicit confirmation; the cards and the dialog are keyboard-operable.

### Hook prefixes (translate-hook-prefixes, 9 nov 2026)

**In:** the prefixes `resources/summarise.mjs` writes. **Out:** changing what the hook writes to
disk; translating Claude's words.

**Never scoped out:** a line that matches no known prefix shows exactly as it came.

### Connections (redesign-connections, 10 nov 2026)

**In:** the presentation of the Jira, GitHub and GitLab cards, their texts and the Ajustes layout.
**Out:** how tokens are stored or checked (S1–S4, S20 do not change); new forges; OAuth.
**Never scoped out:** the token is never shown (S3, S5); keyboard and focus in the rows and forms;
errors visible next to the field.

### Plain errors (plain-errors, 11 nov 2026)

**In:** `src/main/credentials/check.ts`, `src/renderer/settings/Connection.tsx`, `src/renderer/settings/Ajustes.tsx`. **Out:** Forges errors.

### Damaged state files (state-files, 11 nov 2026)

**In:** `src/renderer/settings/Repos.tsx`. **Out:** repairing the file.

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

**In:** `src/main/credentials/forge.ts`, `src/renderer/settings/Forges.tsx`, `src/renderer/settings/Connection.tsx`. **Out:** Jira (already done in S32).

### Broken repos (repo-gone, 11 nov 2026)

**In:** `src/renderer/settings/Repos.tsx`. **Out:** cloning again.

### Notifications (Ajustes and Avisos) (notify-ui, 14 nov 2026)

**In:** `src/renderer/settings/Notifications.tsx` (both cards), `src/renderer/avisos/**` (bug 4, the new kinds), `src/renderer/App.tsx` (mounting the card, the new targets of `openAviso`), `src/renderer/components/Problem.tsx` (an optional second button, `cant` optional), its place in `Ajustes.tsx` (second column, after «Idioma»), styles as tokens; in `src/main/**` and `src/preload/**`, only the one IPC call V15 needs to reuse main's `closable` (Decision log, 2026-11-14). **Out:** sounds, per-repo settings, the summary on return.

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

### Language (add-language, 9 nov 2026)

- The setting lives in `ui.json` beside the theme (W35); no new dependency.
- Main owns the resolved language and the window takes it from main (`spec-workspaces.md`).
- Spanish stays the source of every text: it is the key.

### Create repos (add-create-repo, 9 nov 2026)

- Same secret store and write-only pattern as Jira (S1–S8); no new dependency.
- GitHub REST `GET /user`, `POST /user/repos`; GitLab REST `GET /api/v4/user`,
  `POST /api/v4/projects` with `PRIVATE-TOKEN`.
- Registration reuses `registerRepo` (W1–W4).

### Hook prefixes (translate-hook-prefixes, 9 nov 2026)

- Every key passes through a literal `t()` call (S16).

### Plain errors (plain-errors, 11 nov 2026)

- `err.message` never reaches the window; only list codes and the exception name, in the detail.

### Damaged state files (state-files, 11 nov 2026)

- The window asks to show the file by name, never by path.

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

- `err.message` never reaches the window.

### Broken repos (repo-gone, 11 nov 2026)

- The window sends only ids; main opens the folder dialog.

### Notifications (Ajustes and Avisos) (notify-ui, 14 nov 2026)

- Every text through `useT()` with its English entry; colours only from tokens; keyboard-operable (S-a11y as the rest of Ajustes).
- Each change saves at once through `notify.set(patch)`; there is no «Guardar».

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
- Q: Does the sketch `bocetos/repos.html` work for you (repos in Ajustes, «＋ Nuevo trabajo» in the bar)? → A: «ok».
- Q: «No le preguntes, tú sigue» stands → the rest taken with the recommended option, marked (assumed).
- Q: What is the dialog called when opened from Trabajo? → A: «Nuevo trabajo», the same dialog as «Nueva tarea» with the text optional (assumed).
- Q: And with no text? → A: plain Claude, without `/libretto:libretto-flow`, as «+ trabajo» did; the branch has to be typed (assumed).
- Q: (spec-reviewer) Does «Auto» store the detected mode? → A: no: Auto removes the forced one (`setOverride(id, null)`), so detection keeps deciding (W4) (assumed).
- Q: (spec-reviewer) What happens on pressing «Ir a Ajustes»? → A: the dialog closes and Ajustes shows; on coming back it opens again and rereads the repos (assumed).
- Q: (spec-reviewer) What does the dialog say without required text? → A: label «¿Qué hay que hacer? (opcional)»; the «Lanza» row shows `claude` without text and `/libretto:libretto-flow «tu texto»` with text (assumed).
- Q: (spec-reviewer) And the sketch? → A: `bocetos/repos.html` stays as a record of the decision; `fase1-nucleo.html` is updated to look the same (card in Ajustes, button in the bar) (assumed).
- Q: (spec-reviewer) The tutorial? → A: it has no repos step; unchanged (assumed).
- Q: Where is the reason for the mode shown? → A: as the dropdown's `title` and, as text, under the name when the mode is in-place, which is the one worth understanding (assumed).

### Language (add-language, 9 nov 2026)

- **English as well** — Pau, 9 nov: «Hazlo la versión en inglés, es decir, en ajustes que puedas
  elegir español o inglés. del sistema.»
- **Spanish text as the key** (assumed): no invented ids to keep in sync; a missing entry falls
  back to the Spanish it already has.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| i18next / react-intl | a dependency and a key scheme for two languages and ~200 strings |
| Invented ids (`settings.title`) | two files to keep in sync per text; a missing id shows nothing |
| Translating Jira titles or Claude's output | not Atril's words; and it would need a model call |

#### Decision log, answers as given (2026-11-09)
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: Which options? → A: Español, English and Sistema; Sistema by default, like the theme (assumed).
- Q: What is «Sistema»? → A: macOS's preferred language: Spanish if it starts with `es`, English otherwise (assumed).
- Q: What gets translated? → A: everything Atril writes: window, menu, Mac notices and error messages; never what Atril does not write: the terminal, what Claude says, Jira titles, file names or document contents (assumed).
- Q: Is a restart needed? → A: no: it changes at once, menu included (assumed).
- Q: An i18n library? → A: no: a Spanish → English dictionary and a `t()` function with `{variables}`; the Spanish text is the key, so nothing is left without text if a translation is missing (assumed).
- Q: (spec-reviewer) Who decides what «Sistema» is? → A: main, with macOS's preferred language; the window receives the language already resolved, so window and menu never disagree (assumed).
- Q: (spec-reviewer) What does `ui.json` store? → A: `language: 'system' | 'es' | 'en'`, default `system`; invalid values are discarded (assumed).
- Q: (spec-reviewer) What closes «everything»? → A: a test that looks, outside tests and the catalog, for literals with Spanish-specific letters (á é í ó ú ñ ü ¿ ¡ «) that do not go through `t()`; a text without accents escapes it: a named limit (assumed).
- Q: (spec-reviewer) An Atril error with git or Jira text inside? → A: Atril's part is translated and the foreign part travels intact in `{detail}` (assumed).
- Q: (spec-reviewer) And the criteria that quote Spanish phrases? → A: they describe the Spanish text; in English its catalog entry applies (assumed).

### Create repos (add-create-repo, 9 nov 2026)

- **Create repos from Atril** — Pau, 9 nov: «poder crear repositorios privados o públicos en
  GitHub, GitLab desde este sitio».
- **Tokens, not the CLIs** — Pau, 9 nov (decision log above).
- **SSH for the clone** (assumed): a token in a remote URL ends up in `.git/config` in clear.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| `gh repo create` / `glab repo create` | Pau chose tokens over the CLIs |
| Browser OAuth login | needs an OAuth app registered per forge and a redirect server; tokens work today |
| HTTPS clone with the token in the URL | the token would sit in `.git/config` in clear |

#### Decision log, answers as given (2026-11-09)
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: How does Atril connect to GitHub and GitLab? → A: with a token in Ajustes, stored encrypted and never shown again, like Jira — Pau, 9 nov: «Pensaba poner los tokens … de GitLab, GitHub y de Jira, no utilizar los GH» and «una vez que lo ponen, que ya no se puede visualizar».
- Q: Self-hosted GitLab? → A: configurable address, `https://gitlab.com` by default (assumed).
- Q: Repo owner? → A: the token's personal account; organisations and groups are out of this change (assumed).
- Q: Default visibility? → A: private; «Público» asks for confirmation with a second click that says anyone will be able to see it (assumed).
- Q: How is it cloned? → A: over SSH with the URL the forge returns; the token never enters a URL or a git command; if SSH fails it says so and shows the command to do it by hand (assumed).
- Q: Initialise the repo? → A: with a README, so it can be cloned and branches created at once (assumed).
- Q: (spec-reviewer) Who owns creating and cloning? → A: workspaces (`src/main/forge/**` falls under its `Governs:`): W49–W51 in `spec-workspaces.md`; settings keeps connections, cards and dialog (assumed).
- Q: (spec-reviewer) Which GitLab address is valid? → A: only `https://`, like Jira (assumed).
- Q: (spec-reviewer) And a 403, a 5xx or a network failure on connecting? → A: nothing is saved; «… ha rechazado el token ({status})» or «No se ha podido conectar con … ({detail})» (assumed).
- Q: (spec-reviewer) Which id does the repo take in Atril? → A: `registerRepo`'s; if taken, the free one it proposes; the folder uses the name the forge returns (assumed).
- Q: (spec-reviewer) Dialog with no connected forges? → A: it says «Conecta GitHub o GitLab en Ajustes» and Crear is disabled; «Clonar y añadir a Atril» starts unticked (assumed).

### Hook prefixes (translate-hook-prefixes, 9 nov 2026)

- **Found by add-language's review** (9 nov): S17 kept whole activity lines untranslated, which
  also kept Atril's own words Spanish. S17 is amended: what stays as written is Claude's part.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| The hook writes in the chosen language | it would need main's resolved language on disk, and old lines would stay in the old one |

#### Decision log, answers as given (2026-11-09)
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: Is it translated on write or on display? → A: on display: the hook does not know the resolved language (that is main's) and lines already written must change too; a single `localiseActivity` is used by the window and main (assumed).
- Q: What is left untouched? → A: what follows the prefix: paths, commands, descriptions and Claude's words, which travel as `{detail}` (assumed).

- Q: (spec-reviewer) Which prefixes? → A: exactly those `summarise.mjs` writes, listed in S27; they are recognised by their text, not by type (assumed).
- Q: (spec-reviewer) And a `✗` line without «falló» at the end? → A: it stays as it came (assumed).

### Connections (redesign-connections, 10 nov 2026)

- Pau, 10 nov: «diseño feísimo» of the GitLab card; minimalist design (memory design-taste-minimal).
- Check and save always enabled, with the error next to the field (assumed, 10 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| A step-by-step modal wizard | More screen for three fields; the expandable row stays where you are. |
| Leave «Guardar» disabled with a hint | It is exactly what looked broken. |

#### Decision log, answers as given (2026-11-10)
- Q: What does it look like? → A: a «Conexiones» section with one compact row per service (Jira, GitHub, GitLab):
  name, what it is for in one line, state («Sin conectar» or «Conectado · cuenta · sitio») and a
  «Conectar» or «Gestionar» button (assumed, from the queued design).
- Q: The form? → A: only on pressing Conectar (or Reemplazar), inside the row, in three numbered steps:
  1 · Crear el token (opens the page with the permissions already ticked and names them), 2 · Pegarlo
  (and address in GitLab and Jira), 3 · Comprobar y guardar (assumed).
- Q: The grey button that looked broken? → A: «Guardar y comprobar» is always enabled with primary style;
  if a field is missing, pressing it says which, next to the field, without calling anyone (assumed).
- Q: What is each one for? → A: Jira «Tus tareas y empezar trabajos»; GitHub and GitLab «Tus MR, revisar y
  crear repos» (assumed: the forge connection also brings the MRs).
- Q: Two columns? → A: yes, from 1100 px wide: Conexiones and Repos on the left, Apariencia and Idioma
  on the right (assumed).

- Q: (spec reviewer) Gaps → A, all (assumed):
  - **Gestionar.** A saved row shows «Gestionar». Unfolded, it shows Reemplazar and Borrar, and
    for Jira also the board. The token is never shown. S5 is amended to say so.
  - **The save button** is still called «Guardar y comprobar», as today, so as not to touch what already
    works.
    - It is always active, except during the check, when it says «Comprobando…».
    - If a field is missing, it says so next to that field and does not call main.
  - **Jira fields:** address, email and token, as today. GitLab: address and token. GitHub: token.
  - **Permissions.** They are named in visible text next to the create-token button:
    - Jira: «un token de API de Atlassian»;
    - GitHub: «con el permiso repo»;
    - GitLab: «con el permiso api».
    The URLs do not change (S7).
  - **Row state:**
    - «Sin conectar»;
    - «Conectado · {cuenta}», with « · {sitio}» after it only when there is a site (the Jira address or the
      GitLab one);
    - «Cargando…» while it arrives.
  - **Row button.** Conectar or Gestionar folds and unfolds the row, and carries `aria-expanded`. Its
    text does not change when opened.
  - **Two columns.**
    - The selector is `.ajustes`. Ajustes places Apariencia and what arrives as `children` (Idioma) in a
      right column, and Conexiones and Repos on the left.
    - The window width is measured. Below 1100 px, a single column in today's order.
    - The line from move-repos-to-settings saying «entre Jira y Apariencia» is superseded.
  - **The sketch and the photo** have no criterion: they are drawing and evidence.

### Notifications (Ajustes and Avisos) (notify-ui, 14 nov 2026)

- The settings file, the type table and `notify.*` are `notify-core`'s. The fold state of each group lives in `ui.json` `folded` under `ntf-agents`, `ntf-mr`, `ntf-account` (default unfolded) (assumed).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| «Guardar» button | the rest of Ajustes saves at once |

#### Decision log, answers as given (2026-11-14)
- Q: Does «Nada» save the notice in Avisos? → A: no; «Nada» neither interrupts nor saves: the card says «silenciado, no te avisa» (assumed).
- Q: Does «Cerrar su trabajo» close without asking? → A: no; it opens the usual confirmation (W136) for that job (assumed).
- Q: Where is each group's fold remembered? → A: in `ui.json` `folded`, with `ntf-agents`, `ntf-mr` and `ntf-account`, unfolded by default (assumed).

- Q: Split the change? → A: yes; this is the window half and waits for `notify-core` (assumed).
- Q: Are S37 and S43 split? → A: no; each is a card painted at once and one test walks the whole of it, with one assertion per promised thing. Ceiling: if a part changes alone, it is split then (assumed).

- Q: Which buttons does the example notice in «Así te llega» carry? → A: only those the real Mac notice carries (W177, W186–W188): «Responder» on ask, done and idle; «Reabrir» on stopped; «Arreglar con Claude» on ci; «Cerrar su trabajo» on merged. The ones invented in the sketch («Ver el plan», «Más tarde»…) no (assumed).
- Q: The days ticked in «Todo el día» with the accent? → A: no; in grey (`--text` on `--on-text`): white on `--run` does not reach contrast in dark (assumed).
- Q: How does the window know a job belongs to the same repo as the MR (V15)? → A: a small IPC call to main that reuses `closable` (W187's, which looks at the remotes); the window does not have the remotes. It widens the scope to `src/main/**` and `src/preload/**` only for that call (assumed).

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
- **S5** While a token is stored, its connection row shall show «Gestionar», whose body offers
  only Reemplazar and Borrar (and, for Jira, the board), never the token.
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

- **S11** While Ajustes is shown, the Repos card shall list every registered repo with its id, its path and, when its health is `ok`, a mode select offering «Auto · <detected mode>», «Worktree» and «In-place»; choosing «Worktree» or «In-place» shall store it as the repo's mode (W4), choosing «Auto» shall clear it.
  Proof: src/renderer/settings/repos.test.ts repos card lists and sets the mode
- **S12** When the person adds a repo from the card and its id is taken, the card shall ask for
  another id and register it with the one given.
  Proof: src/renderer/settings/repos.test.ts adding a repo asks for a free id
- **S13** If the folder the person picks is not a git repository, then the card shall say «Esa
  carpeta no es un repositorio git.» and register nothing.
  Proof: src/renderer/settings/repos.test.ts a folder that is not git is refused

### Language (add-language, 9 nov 2026)

- **S14** While Ajustes is shown, the Idioma card shall offer Español, English and Sistema, show
  the stored choice selected — Sistema when none was made — and store a new choice when picked.
  Proof: src/renderer/settings/language.test.ts language choice persists
- **S15** When the person picks English, the window shall show Atril's own texts in English at
  once — the rail, Trabajo, Tareas, Ajustes and the Nueva tarea dialog — without a restart.
  Proof: src/renderer/settings/language.test.ts the window switches language at once
- **S16** Every literal key passed to `t()` or `translate()` in `src/` shall have an English entry,
  no key shall be a template literal, and the catalog shall hold no entry that no call uses.
  Proof: src/preload/i18n.test.ts every text has its english
- **S17** While the language is English, texts Atril did not write — Claude's words and
  the path, command or description inside an activity line, a Jira title, a file name, the detail
  inside an error — shall be shown exactly as they came.
  Proof: src/renderer/settings/language.test.ts claude and jira text stay as written
- **S19** Outside tests and the catalog, no string literal or JSX text in `src/` containing á, é,
  í, ó, ú, ñ, ü, ¿, ¡ or « shall reach the person without going through `t()` or `translate()`.
  (Ceiling named: a Spanish text with none of these letters is caught only by S15's screens or by
  reading.)
  Proof: src/preload/i18n.test.ts no spanish text skips t

### Create repos (add-create-repo, 9 nov 2026)

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

### Hook prefixes (translate-hook-prefixes, 9 nov 2026)

- **S27** While the language is English, a line that is «Claude te necesita» or «Claude ha
  terminado», or starts with «Leyendo », «Editando », «Escribiendo », «Ejecutando », «Buscando »,
  «Lanzando un subagente: », «Te pregunta: », «Claude dice: » or «Le has escrito: », or has the
  shape «✗ … falló», shall show that part in English and the rest unchanged; any other line shall
  show as it came.
  Proof: src/preload/i18n.test.ts hook prefixes follow the language
- **S28** While the language is English, the activity feed, the workspace rows and main's
  needs-you notification body shall show the hook's lines through S27.
  Proof: src/renderer/settings/language.test.ts claude and jira text stay as written
  Proof: src/main/i18n.test.ts the notification body speaks the language

### Connections (redesign-connections, 10 nov 2026)

- **S29** While Ajustes is shown, a «Conexiones» section shall list Jira, GitHub and GitLab as rows, each
  with its name, its purpose line, its state («Cargando…», «Sin conectar», or «Conectado · {cuenta}» plus
  « · {sitio}» when a site is known) and one button with `aria-expanded` — «Conectar» when nothing is
  saved, «Gestionar» when it is — that folds and unfolds the row's body; no form shows until it is
  pressed. One test holds a case per clause.
  Proof: src/renderer/settings/connections.test.ts connections read as rows with one button
- **S30** When the person presses Conectar (or Reemplazar), the row shall open three numbered steps — the
  create-token button with visible text naming what to create (Jira «un token de API de Atlassian»,
  GitHub «con el permiso repo», GitLab «con el permiso api»), the fields (Jira: dirección, correo y
  token; GitLab: dirección y token; GitHub: token), and «Guardar y comprobar» — where «Guardar y
  comprobar» is disabled only while a check runs («Comprobando…») and, if a field is empty, says which
  next to that field without calling main. One test holds a case per clause.
  Proof: src/renderer/settings/connections.test.ts connect guides in three steps
- **S31** Ajustes shall group Conexiones and Repos in a left column and Apariencia, Idioma, Notificaciones and Cuándo in a right one, and `.ajustes` shall show them side by side while the window is at least 1100 px wide and as one column, left first, below that.
  Proof: src/renderer/settings/connections.test.ts settings use two columns when wide
### Plain errors (plain-errors, 11 nov 2026)

- **S32** If the Jira check's request throws (an HTTP status or a malformed address keep their own sentences), then Ajustes shall say what failed by cause — host not found (`ENOTFOUND`, `EAI_AGAIN`): «No encuentro {host}.»; a certificate code (starting `CERT_`, `ERR_TLS_`, `SELF_SIGNED`, `UNABLE_TO_`, `DEPTH_ZERO`): «El certificado de {host} no es válido.»; a timeout: «Jira no ha respondido en 10 s.»; anything else: «No responde nada en {origin}.» — each followed by «Revisa la dirección: la de tu Jira suele ser https://tuempresa.atlassian.net.», never with the exception name in the sentence, and under a folded «Ver detalle» the code read from `err.cause.code` when it matches `^[A-Z0-9_]+$`, else the exception's name.
  Proof: src/main/credentials/check.test.ts network failure names the cause and folds the code
  Proof: src/renderer/settings/settings.test.ts jira error folds its detail

### Damaged state files (state-files, 11 nov 2026)

- **S33** While `repos.json` is damaged (W148), the Repos card shall show «No puedo leer repos.json: está dañado. No puedo usar ni cambiar tus repos hasta que se arregle.» with its detail folded and «Mostrar en Finder», and shall not show «Aún no hay ninguno» nor «Añadir repo…».
  Proof: src/renderer/statefiles.test.ts the repos card shows a damaged list instead of empty

### Jira, GitHub and GitLab (net-errors, 11 nov 2026)

- **S34** If checking a GitHub or GitLab token gets an HTTP error or throws, then Ajustes shall show the W150 sentence for that forge — with «No se ha guardado.» after it — and the code under a folded «Ver detalle», never an exception name in the sentence; no fix button shows in Ajustes, where «Guardar y comprobar» already checks again. Jira keeps S32.
  Proof: src/main/credentials/forge.test.ts a forge check failure names the cause and folds the code

### Broken repos (repo-gone, 11 nov 2026)

- **S35** Each repo row shall offer «Quitar el repo»; a refusal shows under the row as a problem with «Cerrar aviso».
  Proof: src/renderer/settings/repos.test.ts any repo can be removed and a refusal can be dismissed
- **S36** A repo with health `missing` or `not-git` shall show «Carpeta no encontrada» or «No es un repo de git» instead of its mode select, and «Buscar la carpeta…».
  Proof: src/renderer/settings/repos.test.ts a broken repo can be found again

### Notifications (Ajustes and Avisos) (notify-ui, 14 nov 2026)

- **S37** Ajustes shall show «Notificaciones» after «Idioma» with the intro «Todo llega a Avisos. Aquí eliges qué más te interrumpe con un aviso del Mac.» and three groups — «Tus agentes» (ask, done, stopped, idle, radar, qa), «Tus MR» (review, comment, ci, cipass, merged, following, opened) and «Tu cuenta» (quota) — each row with its label, its example text from the sketch, the tag «nuevo» on stopped, idle, radar, qa, cipass and quota, and a radio group «Mac · Solo Avisos · Nada» checked at the stored value; a row at «Nada» is dimmed. One test renders the card and asserts each of these.
  Proof: src/renderer/settings/notifications.test.ts the card lists every type at its stored value
- **S38** When the person picks a position in a row (click, or ← → within the group, which moves and selects), Ajustes shall send `notify.set({ types: { [key]: value } })` and show the answered value; reopening Ajustes shows it.
  Proof: src/renderer/settings/notifications.test.ts a choice saves and survives reopening
  Proof: src/renderer/settings/notifications.test.ts arrows move the choice
- **S39** When the person presses «Todo al Mac», «Todo a Avisos» or «Silenciar» in a group header, Ajustes shall set every type of that group to `mac`, `list` or `mute` in one `notify.set` and leave the other groups unchanged.
  Proof: src/renderer/settings/notifications.test.ts a group setter changes only its group
- **S40** Each group header shall read «{n} tipos · {mac} al Mac» plus « · {list} solo en Avisos» when that count is not zero («1 tipo» in the singular), and fold or unfold its rows with `aria-expanded`, remembered in `ui.json` `folded`.
  Proof: src/renderer/settings/notifications.test.ts a group header counts and folds
- **S41** The `idle` row's title shall read «Lleva {m} min esperándote» with − and + buttons that change `idleMinutes` by 5 between 5 and 120 (− disabled at 5, + at 120), saving each change.
  Proof: src/renderer/settings/notifications.test.ts the waiting minutes step by five within bounds
- **S42** When a row is hovered or focused, the preview «Así te llega» shall show that type's example — title and body as in the sketch's `t`/`b` (e.g. «WEB-3535 te pregunta» / «¿Uso la tabla del BOE o la de la API?»), «{m}» filled — and the caption «Así te sale en el Mac: {label}» at `mac`, «{label}: solo en Avisos, sin globo ni sonido» at `list`, «{label}: silenciado, no te avisa» at `mute`, the banner dimmed when not `mac`.
  Proof: src/renderer/settings/notifications.test.ts the preview follows the hovered type
- **S43** The «Cuándo» card shall show three switches saved at once — «Respetar el modo foco» (`focus`), «Agrupar» («Un solo aviso del Mac por cada 2 min.», `group`) and «Horas de silencio» (`quiet.on`) — and, under the last, «de {from} a {to}» time inputs, a 24 h bar of the quiet span and day toggles L M X J V S D («Todo el día») that save `quiet.from`, `quiet.to` and `quiet.days`; while `quiet.on` is off those controls are `aria-disabled` and out of the tab order. One test renders the card and asserts each of these.
  Proof: src/renderer/settings/notifications.test.ts when-settings save and quiet fields follow their switch
- **S44** When the person presses «Probar un aviso», Ajustes shall call `notify.test(previewed type)` and say «Enviado: mira la esquina de tu pantalla.», or «macOS no lo dejará salir: arréglalo arriba.» when it answers `blocked`.
  Proof: src/renderer/settings/notifications.test.ts testing a notice says where it went
- **S45** If `notify.permission()` answers `blocked` when the card mounts or after «Volver a comprobar», then the card shall show, above everything, the problem «macOS no deja a Atril mostrar avisos.» / «Todo sigue llegando a Avisos, pero el Mac no te interrumpe aunque elijas «Mac».» with «Abrir Ajustes del Sistema» (W192) and «Volver a comprobar»; `allowed` and `unknown` show nothing.
  Proof: src/renderer/settings/notifications.test.ts a blocked Mac shows the problem with its fix
- **S46** If saving a change fails, then the card shall show «No he podido guardar tus avisos: el cambio se perderá al cerrar Atril.» with «Volver a intentar», which resends the same patch, and main's reason folded under «Ver detalle».
  Proof: src/renderer/settings/notifications.test.ts a failed save says so and retries

### Crash reports (crash-reports, 26 nov 2026)

- **S47** Ajustes shall show the «Fallos» card (crash R6) in the first column, after «Repos».
  Proof: src/renderer/crash/crash.test.tsx "the Fallos card asks before sending and shows the last send"
