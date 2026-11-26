# Crash

Governs: src/main/crash/** src/renderer/crash/** .github/workflows/crash-report.yml

What Atril does when it fails in a way it did not expect: it builds a report without private data
and, when the person has turned it on, proposes it as a pull request to the official repo.

## Outcomes

### Crash reports (crash-reports, 26 nov 2026)

When Atril fails in a way it did not expect and the person has turned it on, a PR appears by itself in `pausf/atril` with a file describing the failure, without private data and without spending Claude quota; the same failure in the same version does not open two PRs (even if it comes from two Macs), and nothing is sent unless it was turned on, and whoever turns it on knows the PR is public.

## Scope boundaries

## Constraints

### Crash reports (crash-reports, 26 nov 2026)

- No call to Claude; no new dependency.
- The token is read only in main and goes only to `api.github.com` with `redirect: 'error'`.
- A failure inside the sender never reports itself and never takes the app down.
- Texts through `t()` with an English entry; colors through tokens; errors with `Problem`.
- Tests with a temporary `ATRIL_HOME` and a fake `fetch`; never the real network.

## Prior decisions

### Crash reports (crash-reports, 26 nov 2026)

- (2026-11-26, crash-reports) A failure is sent without Claude as an issue to `pausf/atril` and the repo's `crash-report.yml` workflow turns it into a PR: branch `atril-crash/<firma>`, file `crash-reports/<firma>.md`, all in English; the sender needs neither write permission nor a copy of the repo.
- (2026-11-26, crash-reports) It is sent with the GitHub account connected in Atril; never an embedded token.
- (2026-11-26, crash-reports) Off by default; turning it on asks to confirm what is sent.
- (2026-11-26, crash-reports) Before leaving the Mac, the report is scrubbed of paths, tokens, e-mails, addresses and Jira keys.
- (2026-11-26, crash-reports) One signature, one PR; at most 5 PRs a day — ponytail: fixed cap, configurable if anyone asks.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| Issue instead of PR | Pau asked for a PR |
| Embedded or app-owned token | anyone can extract it and write to the repo |
| Intermediary server | infrastructure to maintain; the person's own account is enough for whoever has access |
| Claude writes the fix | spends quota without being asked; Pau said «sin claude» |
| On by default | sends data from the Mac to an external service without asking |

#### Decision log, answers as given (2026-11-26)
- Q: Issue or PR? → A: PR, without Claude: a branch with a report file and a PR that proposes it, in the official repo `pausf/atril` (Pau).
- Q: With which account? → A: with the GitHub the person already connected in Atril (the token is read in main, as in `forge/create.ts`); no token goes inside the app (assumed: anyone can extract an embedded token; without access to the repo, the send fails and Settings says so).
- Q: What is a failure? → A: what Atril did not expect: an uncaught exception or rejected promise in main or in the window, a React render error, and a window or child process that dies. An expected `Problem` (expired token, network down) is not one (assumed).
- Q: What does it carry? → A: the message, the stack, where it happened (main, window, process), the Atril, Electron and macOS versions, and the time; scrubbed of paths, tokens, e-mails, addresses and Jira keys (assumed: Atril has no log file; adding one is another change).
- Q: Repeats? → A: a failure has a signature (SHA-256 of the scrubbed message with numbers as `N` and the first line of the stack, 12 hex); an already-sent signature does not open another PR; at most 5 PRs a day per Mac (assumed).
- Q: Consent? → A: off by default; in Settings, a «Fallos» card with «Enviar los fallos a GitHub como PR»; the first time it is turned on, a dialog says what is sent and what is removed, with «Activar» and «Cancelar» (assumed: it is information from the person's Mac on its way to an external service).
- Q: And if the send fails? → A: no retry; the card shows «No he podido enviar el último fallo: {motivo}.»; the signature is not marked as sent, so the next occurrence tries again (assumed).
- Q: (spec-reviewer) Who owns `index.ts`, preload and `ui.json`? → A: workspaces, as in skills: its `Governs:` excludes `src/main/crash/** src/renderer/crash/**` and the `ui.json` fields go as W216 in `spec-workspaces.md`; the card goes in Settings after «Repos» and S47 in `spec-settings.md` records it (assumed).
- Q: (spec-reviewer) Is the scrubbing complete? → A: no, it is best effort, and the dialog says so; also, the message loses all text between quotes (`"…"`, `'…'`, `«…»`), which is where an error usually repeats data (titles, file contents) (assumed).
- Q: (spec-reviewer) What are «direcciones»? → A: server ones: every URL, IPv4, IPv6, `host:port` and `git@host:` becomes `<url>`; the dialog says «direcciones de servidores» (assumed).
- Q: (spec-reviewer) And if `pausf/atril` becomes public? → A: ~~it is not sent~~ → Pau, 26 nov: «pausf/atril lo haría público ahora» and «licencia MIT». It is sent anyway and the dialog says it is public and that anyone can read the PR.
- Q: And whoever cannot write to `pausf/atril`? → A: ~~their copy (fork)~~ → Pau, 26 nov: «crea PR pero no tiene que tener copia del repo, si no que se haga de otra manera». Atril opens a public issue with the report (anyone can in a public repo) and a GitHub Action in the repo itself, `.github/workflows/fallos.yml`, turns it into a branch, file and PR with its own `GITHUB_TOKEN` (assumed: no server to maintain; without write permission there is no other way for a PR to come out).
- Q: How is a duplicate between people avoided? → A: the signature goes in the title («Fallo <firma>: …») and before sending, an issue or PR carrying it is searched in `pausf/atril` in any state (assumed).
- Q: And if someone opens an issue by hand in that format? → A: the bot turns it into a PR anyway that only adds `fallos/<firma>.md`; nothing merges by itself (assumed: it is spam that gets closed, with no risk to the code).
- Q: (spec-reviewer) Cap on attempts? → A: the cap of 5 a day counts attempts, whether they succeed or fail; a signature that failed is not retried within 24 h (assumed).
- Q: (spec-reviewer) A half-done send? → A: it is resumed: first the PRs of that branch (open or closed) are searched and, if there is one, the signature is marked sent with its URL, with no other PR (so two Macs do not open two either); a branch already created or a file already on the branch is skipped (assumed).
- Q: (spec-reviewer) Does the signature include the version? → A: yes: a failure that returns in another version notifies again (assumed).
- Q: (spec-reviewer) Message of a dead process? → A: `{type} {reason} (exit {exitCode})`, no stack; `clean-exit` and `killed` do not count (assumed: `killed` is quitting the app).
- Q: (spec-reviewer) Maximum time? → A: 20 s per request with `AbortSignal.timeout`; `busy` is always released in `finally` (assumed: as in `forge/create.ts`).
- Q: (spec-reviewer) What does main do after an uncaught exception? → A: it reports it, writes it with `console.error` and keeps running, as Electron does without the dialog (assumed).
- Q: (spec-reviewer) A failure before `ready`? → A: it waits in memory (at most 5) for `app.whenReady()` and then goes through the gates (assumed).
- Q: (spec-reviewer) Mentions and blocks? → A: message and stack go in blocks with a fence longer than any run of backticks they contain; the title loses `@`, `` ` ``, `<`, `>`, `[` and `]` (assumed: inside a block there are no mentions or links).
- Q: (spec-reviewer) Which error is stored? → A: GitHub's `message` (200 characters) or `networkCode(err)`, never `err.message` (assumed: it may repeat the request).
- Q: (spec-reviewer) How does the card know whether GitHub is connected? → A: with the existing `atril:settings:forge:status` (assumed).
- Q: Language of the public side? → A: Pau, 26 nov: «todo en inglés lo público, no lo llames fallos». Workflow, branch, folder, titles and report in English; the interface stays in Spanish through `t()`.
- Q: (work-reviewer) Gaps in the scrubber, a slow regex, a damaged ledger and ResizeObserver noise? → A: all fixed in R1, R4 and R5 (assumed). The pinned `actions/github-script` SHA was checked with `gh api`: v7.0.1.

## Task breakdown

## Verification criteria

### Crash reports (crash-reports, 26 nov 2026)

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
