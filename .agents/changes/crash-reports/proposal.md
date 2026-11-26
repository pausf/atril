# crash-reports

Tracker: none
Targets: crash
Durable decisions: the five in Prior decisions below

## The ask, verbatim

> «añadiría telemetría automática con los fallos se creen MR o PR en el proyecto oficial de github de atril» (Pau, 26 nov 2026). A la pregunta de cómo: «el fallo de logs se envía a un PR sin claude y al github oficial del proyecto de atril».

## Decision log

### Session 2026-11-26
- Q: ¿Issue o PR? → A: PR, sin Claude: una rama con un archivo de informe y un PR que lo propone, en el repo oficial `pausf/atril` (Pau).
- Q: ¿Con qué cuenta? → A: con el GitHub que la persona ya conectó en Atril (el token se lee en main, como en `forge/create.ts`); ningún token va dentro de la app (assumed: un token incrustado lo saca cualquiera; sin acceso al repo, el envío falla y se dice en Ajustes).
- Q: ¿Qué es un fallo? → A: lo que Atril no esperaba: una excepción o promesa rechazada sin capturar en main o en la ventana, un error de render de React y una ventana o proceso hijo que muere. Un `Problem` previsto (token caducado, red caída) no lo es (assumed).
- Q: ¿Qué lleva? → A: el mensaje, la traza, dónde pasó (main, ventana, proceso), la versión de Atril, de Electron y de macOS, y la hora; limpio de rutas, tokens, correos, direcciones y claves de Jira (assumed: Atril no tiene archivo de registro; añadirlo es otro cambio).
- Q: ¿Repetidos? → A: un fallo tiene una firma (SHA-256 del mensaje limpio con los números como `N` y la primera línea de la traza, 12 hex); una firma ya enviada no abre otro PR; como mucho 5 PR al día por Mac (assumed).
- Q: ¿Consentimiento? → A: apagado por defecto; en Ajustes, tarjeta «Fallos» con «Enviar los fallos a GitHub como PR»; la primera vez que se enciende, un diálogo dice qué se envía y qué se quita, con «Activar» y «Cancelar» (assumed: es información del Mac de la persona camino de un servicio externo).
- Q: ¿Y si el envío falla? → A: no se reintenta; la tarjeta enseña «No he podido enviar el último fallo: {motivo}.»; la firma no se marca como enviada, así que el siguiente igual lo vuelve a intentar (assumed).
- Q: (spec-reviewer) ¿Quién es dueño de `index.ts`, preload y `ui.json`? → A: workspaces, como en skills: su `Governs:` excluye `src/main/crash/** src/renderer/crash/**` y los campos de `ui.json` van como W216 en `spec-workspaces.md`; la tarjeta va en Ajustes tras «Repos» y lo apunta S47 en `spec-settings.md` (assumed).
- Q: (spec-reviewer) ¿La limpieza es completa? → A: no, es lo mejor posible, y el diálogo lo dice; además, el mensaje pierde todo texto entre comillas (`"…"`, `'…'`, `«…»`), que es donde un error suele repetir datos (títulos, contenido de archivos) (assumed).
- Q: (spec-reviewer) ¿«direcciones»? → A: de servidores: toda URL, IPv4, IPv6, `host:puerto` y `git@host:` pasan a `<url>`; el diálogo dice «direcciones de servidores» (assumed).
- Q: (spec-reviewer) ¿Y si `pausf/atril` se hace público? → A: ~~no se envía~~ → Pau, 26 nov: «pausf/atril lo haría público ahora» y «licencia MIT». Se envía igual y el diálogo dice que es público y que cualquiera puede leer el PR.
- Q: ¿Y quien no puede escribir en `pausf/atril`? → A: ~~su copia (fork)~~ → Pau, 26 nov: «crea PR pero no tiene que tener copia del repo, si no que se haga de otra manera». Atril abre un issue público con el informe (cualquiera puede en un repo público) y un GitHub Action del propio repo, `.github/workflows/fallos.yml`, lo convierte en rama, archivo y PR con su `GITHUB_TOKEN` (assumed: sin servidor que mantener; sin permiso de escritura no hay otra forma de que salga un PR).
- Q: ¿Cómo se evita el duplicado entre personas? → A: la firma va en el título («Fallo <firma>: …») y antes de enviar se busca un issue o PR con ella en `pausf/atril` en cualquier estado (assumed).
- Q: ¿Y si alguien abre a mano un issue con ese formato? → A: el robot lo convierte igual en un PR que solo añade `fallos/<firma>.md`; nada se fusiona solo (assumed: es spam que se cierra, sin riesgo para el código).
- Q: (spec-reviewer) ¿Tope de intentos? → A: el tope de 5 al día cuenta intentos, salgan bien o mal; una firma que falló no se reintenta en 24 h (assumed).
- Q: (spec-reviewer) ¿Un envío a medias? → A: se retoma: primero se buscan PR de esa rama (abiertos o cerrados) y, si hay, la firma queda enviada con su URL, sin otro PR (así tampoco dos Macs abren dos); rama ya creada o archivo ya en la rama se saltan (assumed).
- Q: (spec-reviewer) ¿La firma incluye la versión? → A: sí: un fallo que vuelve en otra versión vuelve a avisar (assumed).
- Q: (spec-reviewer) ¿Mensaje de un proceso muerto? → A: `{type} {reason} (exit {exitCode})`, sin traza; `clean-exit` y `killed` no cuentan (assumed: `killed` es salir de la app).
- Q: (spec-reviewer) ¿Tiempo máximo? → A: 20 s por petición con `AbortSignal.timeout`; `busy` se suelta siempre en `finally` (assumed: como `forge/create.ts`).
- Q: (spec-reviewer) ¿Qué hace main tras una excepción sin capturar? → A: la informa, la escribe con `console.error` y sigue, como hace Electron sin el diálogo (assumed).
- Q: (spec-reviewer) ¿Un fallo antes de `ready`? → A: espera en memoria (como mucho 5) a `app.whenReady()` y luego pasa por las puertas (assumed).
- Q: (spec-reviewer) ¿Menciones y bloques? → A: mensaje y traza van en bloques con una valla más larga que cualquier racha de comillas invertidas que contengan; el título pierde `@`, `` ` ``, `<`, `>`, `[` y `]` (assumed: dentro de un bloque no hay menciones ni enlaces).
- Q: (spec-reviewer) ¿Qué error se guarda? → A: el `message` de GitHub (200 caracteres) o `networkCode(err)`, nunca `err.message` (assumed: puede repetir la petición).
- Q: (spec-reviewer) ¿Cómo sabe la tarjeta si hay GitHub? → A: con `atril:settings:forge:status` que ya existe (assumed).
- Q: ¿Idioma de lo público? → A: Pau, 26 nov: «todo en inglés lo público, no lo llames fallos». Workflow, rama, carpeta, títulos e informe en inglés; la interfaz sigue en español por `t()`.
- Q: (work-reviewer) Gaps in the scrubber, a slow regex, a damaged ledger and ResizeObserver noise? → A: all fixed in R1, R4 and R5 (assumed). The pinned `actions/github-script` SHA was checked with `gh api`: v7.0.1.

## Outcomes

Cuando Atril falla de una forma que no esperaba y la persona lo ha activado, aparece solo un PR en `pausf/atril` con un archivo que describe el fallo, sin datos privados y sin gastar cuota de Claude; el mismo fallo en la misma versión no abre dos PR (aunque venga de dos Macs) y nada se envía sin haberlo activado y quien lo activa sabe que el PR es público.

## Scope

**In:** `.agents/specs/workspaces/spec.md` (`Governs:` excluye `src/main/crash/** src/renderer/crash/**`); `spec-workspaces.md` (W216) y `spec-settings.md` (S47); `src/main/crash/` nuevo (captura, limpieza, firma, envío) con sus tests; en `src/main/index.ts`, los ganchos de `process` y `app` y el IPC `atril:crash:report`; `src/preload/{api,index}.ts`; en la ventana, los ganchos de `window` y un límite de error de React en `src/renderer/crash/` y su uso en `src/renderer/main.tsx`; la tarjeta «Fallos» en `src/renderer/crash/` y una línea en `src/renderer/settings/Ajustes.tsx`; `UiState` (`crashReports`, `crashLast`) en `src/main/ui.ts`; `src/renderer/mockApi.ts`; `src/preload/i18n-en.ts`; `src/renderer/App.tsx` (solo la vista de foto `ajustes-fallos`); `bocetos/novedades.html`, `bocetos/fase1-nucleo.html`, la foto; la spec nueva `.agents/specs/crash/spec.md`.
**Out (nombrado):** que Claude arregle el fallo; garantizar que la limpieza quita todo (es lo mejor posible y se dice); issues; archivo de registro; reintentos y cola; GitLab; un servidor intermediario; enviar sin cuenta de GitHub; avisar a la persona de cada fallo en pantalla.

## Constraints

- Ninguna llamada a Claude; ninguna dependencia nueva.
- El token solo se lee en main y solo va a `api.github.com` con `redirect: 'error'`.
- Un fallo dentro del envío nunca se envía a sí mismo ni tumba la app.
- Textos por `t()` con entrada inglesa; colores por tokens; errores con `Problem`.
- Tests con `ATRIL_HOME` temporal y un `fetch` falso; nunca la red real.

## Prior decisions

- (2026-11-26, crash-reports) Un fallo se envía sin Claude como issue a `pausf/atril` y el workflow `crash-report.yml` del repo lo convierte en PR: rama `atril-crash/<firma>`, archivo `crash-reports/<firma>.md`, todo en inglés; quien envía no necesita permiso de escritura ni copia del repo.
- (2026-11-26, crash-reports) Se envía con la cuenta de GitHub conectada en Atril; nunca un token incrustado.
- (2026-11-26, crash-reports) Apagado por defecto; encenderlo pide confirmar qué se envía.
- (2026-11-26, crash-reports) Antes de salir del Mac, el informe se limpia de rutas, tokens, correos, direcciones y claves de Jira.
- (2026-11-26, crash-reports) Una firma, un PR; como mucho 5 PR al día — ponytail: tope fijo, configurable si alguien lo pide.

## Task breakdown

- Limpiar, firmar y escribir el informe.
- Enviar como PR con dedupe y tope.
- Captura en main y en la ventana.
- Tarjeta «Fallos» con consentimiento; foto y bocetos.

## Verification criteria

- **R1** The report builder shall turn `{ where, message, stack, at }` into markdown: a title line `# Crash: {first message line without @ ` < > [ ], at most 72 characters}`, then the fields `- Where:` (`main`, `window` or `process`), `- Atril:`, `- Electron:`, `- macOS:` and `- Time:`, all report text in English, then the message and the stack each in a fenced block whose fence is longer than any backtick run inside it; before that, message and stack shall be scrubbed, in this order: the home directory (spaces included) → `<path>`; `ghp_`, `gho_`, `ghs_`, `github_pat_`, `glpat-`, `xox?-`, `sk-ant-`, `AKIA` values, JWTs (`eyJ….….…`), `Bearer …`, `Basic …`, `token=…` and any run of 32 or more base64 or hex characters → `<token>`; e-mail addresses → `<email>`; every `scheme://…` URL, IPv4, IPv6, `host:port` and `git@host:` → `<url>`; every other absolute path (`/Users/`, `/home/`, `/private/`, `/var/`, `/tmp/`, `/Volumes/`, `C:\`) and `~/` path → `<path>`, except that a path containing `app.asar/` or `out/main/`, `out/preload/`, `out/renderer/` keeps the part from there on; Jira-like keys (`[A-Z][A-Z0-9]+-\d+`) → `<key>`; and, in message and stack, text between `"…"`, `'…'` or `«…»` → `<text>`; a bare hostname with two or more dots (labels not all digits) and any `github.com/…` or `gitlab.com/…` path → `<url>`; `password=`, `passwd=`, `secret=`, `api_key=`, `apikey=` values and `Authorization: <scheme> <value>` → `<token>`; an absolute path keeps going across spaces until a quote, `)`, `,`, a `:<digits>` line suffix or the end of the line, and `/etc/`, `/opt/`, `/usr/local/`, `C:/` and relative paths of two or more segments (`./a/b`, `a/b/c`) count as paths too; message and stack shall be cut to 4 000 characters each before scrubbing, and scrubbing a 16 KB adversarial string (`a-` repeated) shall take under 50 ms. One test holds one case per pattern.
  Proof: src/main/crash/report.test.ts "scrubs paths, tokens, mails, hosts and keys from a report"
- **R2** The signature shall be the first 12 hex characters of SHA-256 over the Atril version, a newline, the scrubbed message with every run of digits replaced by `N`, a newline, and the first stack line that starts with `at` (empty when none); two reports differing only in numbers or in later stack lines shall share it, and the same report under another version shall not.
  Proof: src/main/crash/report.test.ts "the same failure keeps one signature"
- **R3** When a report passes R4's gates, main shall use the saved GitHub token against `https://api.github.com` with `redirect: 'error'` and a 20 s timeout per request to: search issues and pull requests in `pausf/atril` in any state whose title holds the signature (`/search/issues?q=repo:pausf/atril+in:title+<signature>`), and if there is one, save the signature with its URL and stop; else open an issue in `pausf/atril` titled `Crash <signature>: <the report's title line without "# Crash: ">` whose body is the report followed by the line `<!-- atril-crash <signature> -->`, then save the signature with the issue URL in `$ATRIL_HOME/crash-sent.json` and `crashLast` `{ at, url }` in `ui.json`. Main shall make no other request (no branch, file, fork or PR). One test holds every clause.
  Proof: src/main/crash/send.test.ts "sends a new failure as a pull request to the official repo"
- **R8** The repo shall hold `.github/workflows/crash-report.yml`, triggered only on `issues` `opened`, with `permissions` exactly `contents: write`, `pull-requests: write` and `issues: write`, its job filtered by `if:` on a title starting with `Crash ` and a body containing `<!-- atril-crash ` (expressions cannot match a regex), and its script acting only when the title matches `^Crash [0-9a-f]{12}: ` and the body holds `<!-- atril-crash <that signature> -->`; its one step shall use `actions/github-script` pinned to a full commit SHA and, reading the issue only from `context.payload` (never `${{ github.event.issue.* }}` inside a `run:` or `script:`), shall skip a body over 65 536 characters, create `atril-crash/<signature>` from the default branch unless it exists, put `crash-reports/<signature>.md` with the issue body there unless it exists, open a PR to the default branch titled as the issue with the body `From #<issue>.` and comment the PR's URL on the issue. One test checks the file's text for each clause.
  Proof: src/main/crash/workflow.test.ts "the crash workflow turns a marked issue into a pull request safely"
- **R4** If `crashReports` is not `on`, no GitHub token is saved, the signature is already sent, the signature failed in the last 24 hours, 5 attempts were already made in the last 24 hours, or a send is running, then main shall make no request and record nothing; a `crash-sent.json` that is missing, unparsable or of the wrong shape shall be read as empty and rewritten, never stop sending. Every send that makes a request shall count as an attempt. One test holds a case per gate.
  Proof: src/main/crash/send.test.ts "sends nothing when off, without a token, repeated, recently failed, over the cap or busy"
- **R7** If a request throws, times out or answers non-2xx (other than the skipped existing branch or file), then main shall stop, save the signature as failed with its time and `crashLast` `{ at, error }` with GitHub's `message` (at most 200 characters) or `networkCode(err)`, never the raw error message, release `busy`, and neither report that failure nor let it escape as an uncaught error. One test holds a case for a throw, a hang past the (injected) timeout and a 403.
  Proof: src/main/crash/send.test.ts "a failed send records why, frees the sender and never reports itself"
- **R5** The hooks shall report as `where: 'main'` every `uncaughtException` and `unhandledRejection` (then `console.error` it and keep running), as `where: 'ventana'` what the app's own window sends on `atril:crash:report` (`{ message, stack }` strings, each cut to 16 KB; another sender or shape ignored), and as `where: 'proceso'` every `render-process-gone` and `child-process-gone` whose `reason` is neither `clean-exit` nor `killed`, with message `{type} {reason} (exit {exitCode})` and no stack; reports before `app.whenReady()` shall wait in memory (at most 5) and go through the gates after it. The window shall send its `error` and `unhandledrejection` events (except messages starting with `ResizeObserver loop`) and what a React error boundary around the app catches, and that boundary shall show «Algo ha fallado en esta pantalla.» with «Volver a cargar». One test holds the main clauses with fake `process` and `app`; another the window clauses.
  Proof: src/main/crash/hooks.test.ts "collects failures from main, the window and dead processes"
  Proof: src/renderer/crash/crash.test.tsx "the window reports its errors and the boundary offers a reload"
- **R6** When the person opens Ajustes, a card «Fallos» after «Repos» shall show «Si Atril falla de una forma que no esperaba, puede abrir un PR en el proyecto con el error, sin tus datos.» and a switch «Enviar los fallos a GitHub como PR», off by default; turning it on the first time shall open a dialog «¿Enviar los fallos a GitHub?» with «Se envía: el error, su traza, la versión de Atril y de macOS. Se quitan tus rutas, tokens, correos, direcciones de servidores, claves de Jira y lo que va entre comillas; la limpieza es automática y puede dejarse algo. Va con tu cuenta de GitHub como un issue en pausf/atril, que es público: cualquiera puede leerlo; el proyecto lo convierte en PR.», «Activar» (saves `crashReports: 'on'`) and «Cancelar» (leaves it off); without GitHub saved (`atril:settings:forge:status`), the card shall say «Conecta GitHub en Conexiones para enviarlos.»; the card shall show «Último fallo enviado: {hace}» linking `crashLast.url` (opened only when it starts with `https://github.com/pausf/atril/issues/` or `https://github.com/pausf/atril/pull/`), or «No he podido enviar el último fallo: {error}.». One test holds every clause.
  Proof: src/renderer/crash/crash.test.tsx "the Fallos card asks before sending and shows the last send"

## Approach

### Summary
`src/main/crash/report.ts` (limpiar, firmar, markdown) y `send.ts` (`createCrash({ store, fetch, now, ui })` con `report(raw)`: comprueba puertas, envía por la API REST de GitHub y guarda). `index.ts` engancha `process` y `app` y el IPC. En la ventana, `src/renderer/crash/` tiene el límite de error, los ganchos de `window` y la tarjeta.

### Technical context
Electron 45 + Node 24 + TS, React 19; vitest (node con `ATRIL_HOME` temporal y `fetch` falso; jsdom con `mockApi`). `credentials/store.ts` lee el token (`readSecret('github')`); `credentials/forge.ts` da `forgeApi('github', …)` con base y cabeceras; `forge/create.ts` es el patrón de petición con `redirect: 'error'`. `ui.ts` guarda `UiState`. No hay captura de errores hoy. Radio: unos 14 archivos.

### The approach
- **Limpieza:** una lista ordenada de `[RegExp, sustituto]`; primero tokens, luego correos, URLs, rutas (la ruta absoluta se corta en `app.asar/` u `out/` si aparece y se conserva desde ahí), luego claves; `os.homedir()` se pasa entero.
- **Envío:** `GET /search/issues?q=repo:pausf/atril+in:title+<sig>`; si no hay nada, `POST /repos/pausf/atril/issues` con título `Crash <sig>: …` y el informe más `<!-- atril-crash <sig> -->`. El workflow `crash-report.yml` (con `actions/github-script` fijado por SHA) hace la rama, el archivo y el PR con `GITHUB_TOKEN`.
- **Puertas:** `busy` booleano soltado en `finally`; `crash-sent.json` = `{ sent: { [sig]: url }, failed: { [sig]: at }, times: number[] }` con `times` (intentos) y `failed` podados a 24 h.
- **Ganchos:** `installCrashHooks({ proc, app, ipc, window, crash })` en `src/main/crash/hooks.ts`, para probarlos con dobles; `index.ts` solo lo llama.
- **Reentrada:** `report()` atrapa todo; los ganchos de `process` llaman `void crash.report(...)` y el envío no pasa nunca por esos ganchos (`try/catch` en todo el camino).
- **Ventana:** `ErrorBoundary` de clase (React no tiene otra forma) en `main.tsx`; `window.addEventListener('error'|'unhandledrejection')` manda `atril.crash.report`.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| Issue en vez de PR | Pau pidió PR |
| Token incrustado o de la app | cualquiera lo extrae y escribe en el repo |
| Servidor intermediario | infraestructura que mantener; con la cuenta de la persona basta para quien tiene acceso |
| Claude escribe el arreglo | gasta cuota sin pedirlo; Pau dijo «sin claude» |
| Encendido por defecto | manda datos del Mac a un servicio externo sin preguntar |

### Risks
| Risk | Mitigation |
|---|---|
| Datos privados en un PR | limpieza R1 con caso por patrón; consentimiento R6 |
| Bucle de fallos que llena el repo | firma R2, tope de 5 al día y `busy` (R4) |
| El envío tumba la app | todo el camino en `try/catch`; R4 lo prueba con un `fetch` que lanza |
| Quien no tiene acceso a `pausf/atril` | 404 = envío fallido visible en la tarjeta (R4, R6) |

### Validation and rollback
R1–R5 en node con `fetch` falso que registra cada petición; forzar rojo R1 quitando el patrón de rutas (el informe debe contener `/Users/`). R6 en jsdom. Foto de la tarjeta con el diálogo. Sin probar contra GitHub real (va a `bocetos/qa-final.html`). Rollback: un revert.

### Complexity deliberately kept
La limpieza por patrones y la firma: sin ellas, un PR filtra el disco de la persona y un bucle abre cien.

## Checklist

- [x] Informe: limpiar, firmar y markdown · Closes: R1, R2
- [x] Envío como PR con puertas y fallos, captura en main y ventana, IPC, preload y `ui.json` · waits on box 1 · Closes: R3, R4, R7, R5, R8, W216
- [x] Tarjeta «Fallos» con diálogo, textos en inglés, foto (vista `ajustes-fallos`) y bocetos · waits on box 2 · Closes: R6, S47
