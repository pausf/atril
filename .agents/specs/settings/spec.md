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

### Conexiones (redesign-connections, 10 nov 2026)

- Ajustes abre con tres filas de conexión que se leen de un vistazo y no ocupan media pantalla.
- Conectar guía en tres pasos y dice qué permisos hacen falta; nada parece deshabilitado sin motivo.
- Gestionar enseña Reemplazar y Borrar (y el tablero en Jira) sin mostrar nunca el token (S5).
- En una ventana ancha, Ajustes usa dos columnas.

### Errores claros (plain-errors, 11 nov 2026)

- Conectar Jira con una dirección que no responde dice qué falló, sin el nombre de la excepción, con el código plegado en «Ver detalle».

### Archivos de estado dañados (state-files, 11 nov 2026)

- Con `repos.json` dañado, Ajustes → Repos dice cuál y qué no puedes hacer, con «Mostrar en Finder», en vez de «Aún no hay ninguno».

### Jira, GitHub y GitLab (net-errors, 11 nov 2026)

- Conectar GitHub o GitLab dice la causa sin el nombre de la excepción, con el código plegado, como Jira (S32).

### Repos rotos (repo-gone, 11 nov 2026)

- Ajustes → Repos marca un repo roto y deja buscar su carpeta o quitarlo; cualquier repo se puede quitar.

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

### Conexiones (redesign-connections, 10 nov 2026)

**In:** la presentación de las tarjetas de Jira, GitHub y GitLab, sus textos y el layout de Ajustes.
**Out:** cómo se guardan o comprueban los tokens (S1–S4, S20 no cambian); nuevas forjas; OAuth.
**Never scoped out:** el token nunca se muestra (S3, S5); teclado y foco en las filas y formularios;
errores visibles junto al campo.

### Errores claros (plain-errors, 11 nov 2026)

**In:** `src/main/credentials/check.ts`, `src/renderer/settings/Connection.tsx`, `src/renderer/settings/Ajustes.tsx`. **Out:** los errores de Forges.

### Archivos de estado dañados (state-files, 11 nov 2026)

**In:** `src/renderer/settings/Repos.tsx`. **Out:** reparar el archivo.

### Jira, GitHub y GitLab (net-errors, 11 nov 2026)

**In:** `src/main/credentials/forge.ts`, `src/renderer/settings/Forges.tsx`, `src/renderer/settings/Connection.tsx`. **Out:** Jira (ya hecho en S32).

### Repos rotos (repo-gone, 11 nov 2026)

**In:** `src/renderer/settings/Repos.tsx`. **Out:** clonar de nuevo.

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

### Errores claros (plain-errors, 11 nov 2026)

- `err.message` nunca llega a la ventana; solo códigos de lista y el nombre de la excepción, en el detalle.

### Archivos de estado dañados (state-files, 11 nov 2026)

- La ventana pide mostrar el archivo por nombre, nunca por ruta.

### Jira, GitHub y GitLab (net-errors, 11 nov 2026)

- `err.message` nunca llega a la ventana.

### Repos rotos (repo-gone, 11 nov 2026)

- La ventana manda solo ids; el diálogo de carpeta lo abre main.

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
- Q: ¿Qué opciones? → A: Español, English y Sistema; Sistema por defecto, como el tema (assumed).
- Q: ¿Qué es «Sistema»? → A: el idioma preferido de macOS: español si empieza por `es`, inglés en cualquier otro caso (assumed).
- Q: ¿Qué se traduce? → A: todo lo que escribe Atril: ventana, menú, avisos del Mac y mensajes de error; nunca lo que no escribe Atril: la terminal, lo que dice Claude, títulos de Jira, nombres de archivo ni el contenido de los documentos (assumed).
- Q: ¿Hace falta reiniciar? → A: no: cambia al momento, menú incluido (assumed).
- Q: ¿Librería de i18n? → A: no: un diccionario español → inglés y una función `t()` con `{variables}`; el texto en español es la clave, así que nada se queda sin texto si falta una traducción (assumed).
- Q: (spec-reviewer) ¿Quién decide qué es «Sistema»? → A: main, con el idioma preferido de macOS; la ventana recibe el idioma ya resuelto, así ventana y menú nunca discrepan (assumed).
- Q: (spec-reviewer) ¿Qué guarda `ui.json`? → A: `language: 'system' | 'es' | 'en'`, por defecto `system`; lo inválido se descarta (assumed).
- Q: (spec-reviewer) ¿Qué cierra el «todo»? → A: un test que busca, fuera de los tests y del catálogo, literales con letras propias del español (á é í ó ú ñ ü ¿ ¡ «) que no pasen por `t()`; un texto sin tildes se le escapa: límite nombrado (assumed).
- Q: (spec-reviewer) ¿Un error de Atril con texto de git o Jira dentro? → A: se traduce lo de Atril y lo ajeno viaja intacto en `{detail}` (assumed).
- Q: (spec-reviewer) ¿Y los criterios que citan frases en español? → A: describen el texto en español; en inglés vale su entrada del catálogo (assumed).

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

### Hook prefixes (translate-hook-prefixes, 9 nov 2026)

- **Found by add-language's review** (9 nov): S17 kept whole activity lines untranslated, which
  also kept Atril's own words Spanish. S17 is amended: what stays as written is Claude's part.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| The hook writes in the chosen language | it would need main's resolved language on disk, and old lines would stay in the old one |

#### Decision log, answers as given (2026-11-09)
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Se traduce al escribir o al mostrar? → A: al mostrar: el hook no sabe el idioma resuelto (eso es de main) y las líneas ya escritas también deben cambiar; un único `localiseActivity` lo usan la ventana y main (assumed).
- Q: ¿Qué no se toca? → A: lo que va detrás del prefijo: rutas, comandos, descripciones y las palabras de Claude, que viajan como `{detail}` (assumed).

- Q: (spec-reviewer) ¿Qué prefijos? → A: exactamente los que escribe `summarise.mjs`, listados en S27; se reconocen por el texto, no por el tipo (assumed).
- Q: (spec-reviewer) ¿Y una línea `✗` sin «falló» al final? → A: se queda como vino (assumed).

### Conexiones (redesign-connections, 10 nov 2026)

- Pau, 10 nov: «diseño feísimo» de la tarjeta de GitLab; diseño minimalista (memoria design-taste-minimal).
- Comprobar y guardar siempre activo, con el error junto al campo (assumed, 10 nov).

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Un asistente modal paso a paso | Más pantalla para tres campos; la fila desplegable se queda donde estás. |
| Dejar «Guardar» deshabilitado con una pista | Es justo lo que parecía roto. |

#### Decision log, answers as given (2026-11-10)
- Q: ¿Cómo se ve? → A: una sección «Conexiones» con una fila compacta por servicio (Jira, GitHub, GitLab):
  nombre, para qué sirve en una línea, estado («Sin conectar» o «Conectado · cuenta · sitio») y un botón
  «Conectar» o «Gestionar» (assumed, del diseño encolado).
- Q: ¿El formulario? → A: solo al pulsar Conectar (o Reemplazar), dentro de la fila, en tres pasos
  numerados: 1 · Crear el token (abre la página con los permisos ya marcados y los nombra), 2 · Pegarlo
  (y dirección en GitLab y Jira), 3 · Comprobar y guardar (assumed).
- Q: ¿El botón gris que parecía roto? → A: «Guardar y comprobar» está siempre activo con estilo primario;
  si falta un campo, al pulsarlo dice cuál, junto al campo, sin llamar a nadie (assumed).
- Q: ¿Para qué sirve cada uno? → A: Jira «Tus tareas y empezar trabajos»; GitHub y GitLab «Tus MR, revisar y
  crear repos» (assumed: la conexión de forja también trae las MR).
- Q: ¿Dos columnas? → A: sí, desde 1100 px de ancho: Conexiones y Repos a la izquierda, Apariencia e Idioma
  a la derecha (assumed).

- Q: (revisor de spec) Holguras → A, todas (assumed):
  - **Gestionar.** Una fila guardada enseña «Gestionar». Al desplegarla aparecen Reemplazar y Borrar, y
    en Jira también el tablero. El token no se muestra nunca. S5 se enmienda para decirlo.
  - **El botón de guardar** se sigue llamando «Guardar y comprobar», como hoy, para no tocar lo que ya
    funciona.
    - Está activo siempre, salvo durante la comprobación, en la que dice «Comprobando…».
    - Si falta un campo, lo dice junto a ese campo y no llama a main.
  - **Campos de Jira:** dirección, correo y token, como hoy. GitLab: dirección y token. GitHub: token.
  - **Permisos.** Se nombran en texto visible junto al botón de crear el token:
    - Jira: «un token de API de Atlassian»;
    - GitHub: «con el permiso repo»;
    - GitLab: «con el permiso api».
    Las URL no cambian (S7).
  - **Estado de la fila:**
    - «Sin conectar»;
    - «Conectado · {cuenta}», con « · {sitio}» detrás solo cuando hay sitio (la dirección de Jira o la de
      GitLab);
    - «Cargando…» mientras llega.
  - **Botón de la fila.** Conectar o Gestionar pliega y despliega la fila, y lleva `aria-expanded`. Su
    texto no cambia al abrirla.
  - **Dos columnas.**
    - El selector es `.ajustes`. Ajustes coloca Apariencia y lo que llega como `children` (Idioma) en una
      columna derecha, y Conexiones y Repos en la izquierda.
    - Se mide el ancho de la ventana. Por debajo de 1100 px, una sola columna en el orden de hoy.
    - Queda superada la línea de move-repos-to-settings que dice «entre Jira y Apariencia».
  - **El boceto y la foto** no tienen criterio: son dibujo y evidencia.

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

### Conexiones (redesign-connections, 10 nov 2026)

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
- **S31** Ajustes shall group Conexiones and Repos in a left column and Apariencia and Idioma in a right
  one, and `.ajustes` shall show them side by side while the window is at least 1100 px wide and as one
  column, left first, below that.
  Proof: src/renderer/settings/connections.test.ts settings use two columns when wide

### Errores claros (plain-errors, 11 nov 2026)

- **S32** If the Jira check's request throws (an HTTP status or a malformed address keep their own sentences), then Ajustes shall say what failed by cause — host not found (`ENOTFOUND`, `EAI_AGAIN`): «No encuentro {host}.»; a certificate code (starting `CERT_`, `ERR_TLS_`, `SELF_SIGNED`, `UNABLE_TO_`, `DEPTH_ZERO`): «El certificado de {host} no es válido.»; a timeout: «Jira no ha respondido en 10 s.»; anything else: «No responde nada en {origin}.» — each followed by «Revisa la dirección: la de tu Jira suele ser https://tuempresa.atlassian.net.», never with the exception name in the sentence, and under a folded «Ver detalle» the code read from `err.cause.code` when it matches `^[A-Z0-9_]+$`, else the exception's name.
  Proof: src/main/credentials/check.test.ts network failure names the cause and folds the code
  Proof: src/renderer/settings/settings.test.ts jira error folds its detail

### Archivos de estado dañados (state-files, 11 nov 2026)

- **S33** While `repos.json` is damaged (W148), the Repos card shall show «No puedo leer repos.json: está dañado. No puedo usar ni cambiar tus repos hasta que se arregle.» with its detail folded and «Mostrar en Finder», and shall not show «Aún no hay ninguno» nor «Añadir repo…».
  Proof: src/renderer/statefiles.test.ts the repos card shows a damaged list instead of empty

### Jira, GitHub y GitLab (net-errors, 11 nov 2026)

- **S34** If checking a GitHub or GitLab token gets an HTTP error or throws, then Ajustes shall show the W150 sentence for that forge — with «No se ha guardado.» after it — and the code under a folded «Ver detalle», never an exception name in the sentence; no fix button shows in Ajustes, where «Guardar y comprobar» already checks again. Jira keeps S32.
  Proof: src/main/credentials/forge.test.ts a forge check failure names the cause and folds the code

### Repos rotos (repo-gone, 11 nov 2026)

- **S35** Each repo row shall offer «Quitar el repo»; a refusal shows under the row as a problem with «Cerrar aviso».
  Proof: src/renderer/settings/repos.test.ts any repo can be removed and a refusal can be dismissed
- **S36** A repo with health `missing` or `not-git` shall show «Carpeta no encontrada» or «No es un repo de git» instead of its mode select, and «Buscar la carpeta…».
  Proof: src/renderer/settings/repos.test.ts a broken repo can be found again
