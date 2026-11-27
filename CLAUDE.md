# Atril

Mac app (Electron + TypeScript + React 19, pnpm) that takes each Jira task through the Libretto flow
with Claude Code agents in tmux, and manages GitHub/GitLab MRs. Remote `github.com/pausf/atril`
(public, MIT; git identity `pausf`, noreply email). History lives in `git log` and
`.agents/specs/`, not here. `bocetos/` (design sketches) is local-only and gitignored: the references to it
below point at files on Pau's disk, not in the repo.

## Last landed

`finished-means-finished` (27 Nov, issue #4, W332–W336): a merged work reads `done` in main whatever an older hook
left in its state file: no Up next chip, no idle reminder, no automatic Go on, no notice on the merge; its card and header say «Merged».

Before it, `work-vs-main` (26 Nov, issues #11, #10, #8, W300–W313): a new work fetches and branches from origin's default branch
(`--no-track`); size, panel and radar count from the merge-base with it; a merged PR (notice or ancestry) reads "Merged"
and leaves the clash check; rows say when two works take the same new criterion ids.

Before that, `fix-cdp-isolation` (26 Nov, W320–W331): a dev Atril on `ATRIL_CDP_PORT` owns that port by a launch token
or exits; a drive attaches only through `attachVerified` in `scripts/cdp-drive.mjs`.

## Next

1. Fix the 42 findings from the tour of the app (11 Nov, `bocetos/hallazgos.md`), most severe first.
2. Goal: improve the idea, don't change it, so one person can run 3 tasks at once without losing focus.
   Queue: Libretto inside Atril (live code panel, QA screen per platform, questions in a bubble,
   better MRs); then the ★ ideas in `bocetos/ideas.html`.
3. At the end: end-to-end QA of Atril itself (real app with Playwright, fake forges and Jira) and a guided
   list for Pau with his real accounts (`bocetos/qa-final.html`).

## Untested with real data

- A real forge: listing MRs, a score, Libretto drafts, publishing a draft on its line, merging (GitHub
  squash, GitLab), GitLab fields (`detailed_merge_status`, `has_conflicts`, `target_branch`), reviewers, old-side threads.
- Crash reports against real GitHub; plugin commands against the real `claude` CLI; refine-request with real Claude.
- Claude Code's option selector taking a typed digit + Enter (quick replies, "Allow" = 1); a card answer reading Sent within 4 s (W339); Esc pausing Claude
  cleanly; "Pick up where you left off." read as a new message; a lens review reading the request as context.
- Live QA with a real agent, browser and emulator (only doubles so far); "Start" sending
  `/libretto:write-spec <name>`; "Pass to Jira"; the Jira board; auto mode asking before a push; replying from a Mac notice.
- Fewer go-on cards: real Claude Code honouring `{"decision":"block"}` on Stop and sending `stop_hook_active` and
  `cwd`; the cap of 5 cutting for real; the last transcript text written before Stop arrives.
- `pnpm dist` and the installed `.dmg` (`bocetos/instalar.html` §4).
- `openmr.test.ts` and `pause.test.ts` sometimes fail in the full suite under git load: look in the QA round.

## Working rules

- **Only the Libretto flow**, per change. The contract is `.agents/changes/<change>/proposal.md` (Decision
  log, EARS criteria with `Proof:`, Approach, Checklist; other capabilities' deltas in `spec-<cap>.md`). A cold
  spec-reviewer before building; the builder writes tests first, red; then a cold work-reviewer, fixes, lessons; then land.
- **Autonomy:** don't ask; take the recommended option and mark it `(assumed)`. Push only to pausf/atril.
- **Specs** in `.agents/specs/<capability>/spec.md`: read them before touching code. Read `.agents/lessons.md` too.
- **Gates:** `pnpm -s typecheck`, `pnpm -s lint`, `pnpm -s test`, all before each commit, behind an `if` that refuses
  a red commit. `.githooks/pre-commit` runs typecheck and lint (`pnpm run prepare` turns hooks on).
- **Enforced, not written:** `.githooks/pre-push` refuses a push that carries a work identifier (the list is
  `~/.config/atril/work-identifiers.txt`, outside the repo: never copy it here; use example names shop-web, WEB, SHOP,
  PF, OPS, acme). `pnpm build` is denied by the PreToolUse guard registered in `.claude/settings.json`.
- rg/fd/eza/bat, not grep/find/ls/cat. Conventional commits, no `Co-Authored-By` or AI attribution.
- Never a folder called `secrets` (a global deny rule); never read `~/.atril/secrets.bin`. Tokens live only in main.
- Don't touch Pau's real repos, his default tmux sessions or `~/.claude.json`. Tests use their own tmux socket and a temp `ATRIL_HOME`.
- **Quota:** no automatic Claude calls, on demand only. Subagents scoped, Sonnet for mechanical work, never Fable.
- **Evals (by hand only):** `node evals/run.mjs --model <m>` runs the Libretto flow headless on 3 fixed tasks and scores each run (spec: `.agents/specs/evals/spec.md`). It spends real quota: never start it from a hook, a test or CI, and never without Pau's go-ahead.
- **Each function that lands** is driven in the real app (Playwright) first, then updates `bocetos/novedades.html`
  (section, real photo in `bocetos/novedades/*.png`, history) and `bocetos/fase1-nucleo.html`.
- **Photos:** `ATRIL_HOME=$(mktemp -d) ATRIL_SNAPSHOT=$PWD/bocetos/novedades/x.png ATRIL_SNAPSHOT_VIEW=<view>
  ATRIL_SNAPSHOT_DELAY_MS=6000 pnpm -s dev` in the background; wait for the PNG; stop it with `pkill -f "$PWD/node_modules"`
  (other worktrees run theirs). Never `screencapture` the whole screen: only Atril's window (`page.screenshot` over CDP, or
  `screencapture -l <windowid>`). To drive it: an unlikely port and a fresh token (16–128 chars `A-Za-z0-9_-`) as
  `ATRIL_CDP_PORT`/`ATRIL_LAUNCH_TOKEN` (a busy port makes Atril exit 1); attach only with `attachVerified` from
  `scripts/cdp-drive.mjs`, never raw `connectOverCDP`.
- **Fake `claude` in tests:** Atril puts your login shell's PATH first, so a fake only in `PATH` loses and the real one
  runs (spends quota). Launch with `SHELL` pointing at a fake shell that, with `-ilc`, prepends the doubles folder.
- **Errors:** never a bare "error 500". Say what happened, what you can't do because of it, and one button that fixes
  it (Terminal with the command, token page, Settings, "Check again"); the code only under a folded "See detail". Catalog: `bocetos/errores.html`.
- **Texts** go through `t()`/`useT()`; the key is the English text and its Spanish entry lives in
  `src/preload/i18n-es.ts` (scans S16/S19). **Colours** only as tokens in `:root` and `[data-theme='dark']`.
- **Landing:** `python3 scripts/land.py <change> "<Label>"`, then in the same commit `git rm -r .agents/changes/<change>`,
  `libretto wiki`, `libretto land`. `(amended)` criteria replace the existing one.
