# Evals

Governs: evals/**

A small, fixed set of tasks that Claude Code runs through the Libretto flow in a throwaway sample repo, each run scored by deterministic checks, so a change in the skills, in `CLAUDE.md` or in the model reads as "x of N before, y of N after".

## Outcomes

### Agent harness evals (add-agent-harness-evals, 26 nov 2026)

- `node evals/run.mjs --model <m> [--tasks a,b] [--runs N] [--yes]` prints how many Claude runs it is about to make (tasks × N, on which model), asks `y/N` unless `--yes`, then runs each attempt headless in its own fresh git repo copied from `evals/sample/` and scored by five deterministic checks: `acceptance`, `files`, `spec`, `tests-first`, `gates`.
- It writes `evals/reports/<timestamp>-<model>.json` and `.md`: per task `x of N` runs passed, per check pass counts, the reason of each failed check, cost and duration per run.
- Three tasks ship: `add-coupon` (feature), `fix-rounding` (a bug), `add-stock-check` (feature with an error path).
- Nothing starts it by itself: not `pnpm test`, not the pre-commit hook, not CI.
- Proven once, by hand: 1 task × 2 runs on the cheapest model (`haiku`), and no more. Done on 26 nov 2026 with a negative result: 0 of 2, no skill called, so end to end against a real Claude is not yet proven (see Prior decisions).

## Scope boundaries

### Agent harness evals (add-agent-harness-evals, 26 nov 2026)

In: `evals/run.mjs` (I/O: copy, git, spawn claude, run `node --test`), `evals/score.mjs` (pure: checks, aggregate, transcript reader, report), `evals/sample/`, `evals/tasks/<id>/` (three), their tests, `.agents/specs/evals/spec.md`, one `evals/reports/` line in `.gitignore`, `evals/sample/**` and `evals/tasks/**` excluded from vitest's default include in `vitest.config.ts`, one line in `CLAUDE.md` saying the evals spend quota and are run only by hand.

Out, named so it is not added quietly:
- No `--compare` command, no history of reports, no dashboard (two reports side by side do it).
- No LLM-as-judge: every check is deterministic.
- No use of the Atril app, no entry in `bocetos/novedades.html` (dev tooling, nothing the person sees).
- No scheduled or CI run, no `package.json` script.
- No `--bare` mode or API-key path.
- No more than the one proof run of 1 task × 2 runs; the full set is for Pau to run when he chooses.
- A fourth task or another language for the sample.

Never scoped out: the run happens in a temp dir and never inside a real repo; nothing from the person's Claude config is copied into a report; a failure to run (claude missing, crashed, timed out) is a scored failure with its reason, never a thrown stack.

## Constraints

### Agent harness evals (add-agent-harness-evals, 26 nov 2026)

- Plain Node 24 `.mjs`, no new dependency, no build; `import process from 'node:process'` as `scripts/bundle-libretto.mjs` does; it must pass the repo's `pnpm lint`. Tests are `*.test.ts` under vitest, as `scripts/libretto-models.test.ts`.
- The sample repo has no dependencies: ESM, tests with `node:test`, `npm test` is `node --test`.
- Every text (code, comments, fixtures, task prompts, report) in English.
- The tests never call the real `claude`: a fake executable passed with `--claude` stands in. They use temp dirs only.
- Headless flags: `-p`, `--output-format stream-json --verbose`, `--model`, `--no-session-persistence` (so eval sessions never land in `~/.claude/projects`, which Atril's skills-usage reads), `--max-budget-usd` (default 3), a run timeout (default 20 minutes). Extra arguments after `--` go to claude as they are.
- Known side effect: the person's user-level hooks and memory tools run as in any session; `-- --setting-sources project,local` turns them off.
- `evals/reports/` is git-ignored.

## Prior decisions

### Agent harness evals (add-agent-harness-evals, 26 nov 2026)

Taken on 26 nov 2026, all marked `(assumed)` in the decision log above: real setup instead of `--bare`; bypassed permissions in a temp dir; `--model` required; `/libretto:libretto-attacca` as the prompt; tests-first read from the transcript; hidden acceptance tests; no `--compare`; no interview.

`ponytail:` ceilings: a run is judged by the first write order only (a sub-agent whose writes are absent from the stream makes `tests-first` fail with a reason, and the fallback is git order); the `spec` check treats any bullet containing `shall` as a criterion, so a Constraint written with `shall` fails the run and the reason quotes the line; runs go one after another, parallel runs when the full set takes too long and the quota allows.

Open finding (26 nov 2026): the one proof run (`add-coupon` × 2 on `haiku`) scored 0 of 2 with `skills called: none`: Claude solved the task directly in 15–22 s, so the claim that `/libretto:libretto-attacca` starts the flow under `-p` is unconfirmed. The checks, report and runner are proven against a fake `claude` only. `--command` is the knob to change the prefix, and the first report of any real comparison must show `skills called` for every run before its scores are believed. Nothing was re-run: Pau limited the proof to one run.

#### Alternatives that lost

| Considered | Why it lost |
|---|---|
| One `run.mjs` with everything inside | Scoring could only be tested by spawning processes; the ask wants the scoring tested first. |
| TypeScript with a loader or build | `tsconfig` does not cover `evals/`, and a loader is a new dependency for a script run by hand. |
| The Claude Agent SDK instead of spawning the CLI | A new dependency, and it would not exercise the CLI path the person actually uses. |
| Git history for `tests-first` | Libretto commits tests and code together, so commit order proves nothing; the write order does. |
| Parallel runs | Faster, but 3 concurrent full flows burn quota in a burst; sequential until the full set is too slow. |
| `--bare` plus explicit plugin flags | Auth is API-key only; the person uses OAuth, and the real setup is what is being compared. |

#### Decision log, answers as given (2026-11-26)
- Q: Run Claude with the person's real setup (plugins, hooks, global CLAUDE.md) or with `--bare` and explicit plugin/prompt flags? → A: real setup (assumed). `--bare` reads auth only from `ANTHROPIC_API_KEY`, never OAuth or keychain, and Pau signs in with OAuth; and the real setup is what a skills/CLAUDE.md/model change touches. If wrong: runs need an API key and `--plugin-dir`, one flag set in `run.mjs`.
- Q: Permissions for the headless run? → A: `--permission-mode bypassPermissions` inside a throwaway temp dir (assumed). The Libretto flow runs many different commands and an allowlist would score permission denials instead of the harness. If wrong: swap the flag for `acceptEdits` plus `--allowedTools` in one place.
- Q: Which model, and how many runs by default? → A: `--model` is required, no default, so a run can never silently use an expensive model; `--runs` defaults to 3 (assumed). If wrong: give `--model` a default.
- Q: How does the task start the flow? → A: the prompt is `/libretto:libretto-attacca <task prompt>` (assumed), because attacca never waits for a person, which a headless run cannot answer; `--command` overrides the prefix. If wrong: the first proof run shows the skill was not invoked, and only the prefix changes.
- Q: Where does "tests written before code" come from? → A: the order of Write/Edit/MultiEdit calls in the stream-json transcript, not git history (assumed): Libretto commits tests and code together, so commit order proves nothing. If wrong (sub-agent writes are not in the stream): the check reports "no write seen" and a git-order fallback is added.
- Q: Hidden acceptance tests? → A: yes, one `acceptance.test.js` per task, copied into the repo only after the run (assumed). The agent's own tests can be vacuous, so "the task was done" needs a test the agent never saw.
- Q: Compare two reports with a command? → A: no (assumed). Two Markdown reports side by side already read as "x of N before, y of N after"; add `--compare` when it is done by hand often.
- Q: Approach: a pure `score.mjs` plus an I/O `run.mjs` in plain `.mjs`, one file for everything, or TypeScript run through a loader? → A: pure `score.mjs` + I/O `run.mjs`, plain `.mjs` (assumed). One file loses the "scoring logic first, tested without spawning anything" the ask wants; TypeScript needs a loader or a build and `tsconfig` does not cover `evals/`. If wrong: rename to `.ts` and add `evals/` to a tsconfig.
- Q: After the cold review (review-spec) found gaps, how to go on? → A: "Corregir el documento primero (Recomendada)". Applied: killed and timed-out runs are scored from disk, only an unstartable claude fails all five (E4, E11, E14); `--permission-mode` and the defaults are asserted (E9); Proof format fixed (E1); a non-`y` answer aborts (E7); non-terminal refusal and numeric flags moved to E8; limits on `npm test` and acceptance (E10); process-group kill (E11); path normalisation, skills and `result` fields (E5); report location and version source (E6); E12 split from E15.
- Q: Interview? → A: zero questions; the request settled the shape and the rest is assumed above (autonomy rule of this repo).

## Task breakdown

## Verification criteria

### Agent harness evals (add-agent-harness-evals, 26 nov 2026)

- **E1** The `spec` check shall pass when the added text under `.agents/` holds at least one criterion line (a bullet containing `shall`) and every criterion line is followed, on its next non-empty line, by a `Proof:` line of the form `Proof: <path> "<test name>"` (a path, then the test name in double quotes); otherwise it shall fail and name what is missing (no criterion, or the criterion line without its Proof).
  Proof: evals/score.test.ts "the spec check wants shall criteria each followed by a Proof"
- **E2** The `tests-first` check shall pass when the first write to a test path (`test/`, `tests/`, `__tests__/` or `*.test.*`) comes before the first write to a source path (any other path outside `.agents/` and not `*.md` or `package.json`); it shall fail, with the reason, when no test is written, when no source is written, or when source comes first.
  Proof: evals/score.test.ts "tests come before source in the write order"
- **E3** The `files` check shall fail naming every expected file that does not exist; the `acceptance` check shall pass only when the hidden acceptance run exited 0 and fail naming its exit code otherwise; the `gates` check shall pass only when `npm test` on the final tree exited 0. One test holds one failing case per check.
  Proof: evals/score.test.ts "scores files, acceptance and gates from the evidence"
- **E4** A run shall pass only when all five checks pass, and the totals shall give, per task, `passed of N` and, per check, how many runs passed it; a run whose claude could not be started shall fail all five checks with the spawn error as the reason, while every other run, including one that timed out, was stopped by the budget or exited non-zero, shall be scored on all five checks from what is on disk.
  Proof: evals/score.test.ts "a run passes only when every check passes and totals read x of N"
- **E5** The transcript reader shall return the ordered paths of every Write, Edit and MultiEdit tool call, resolved against the run directory with both sides passed through `realpath` and made relative to it (a path outside the run directory is dropped), the names of the Skill tool calls in order, and `total_cost_usd`, `num_turns` and `duration_ms` of the `result` event (each `null` when there is no `result` event), and shall skip lines that are not JSON.
  Proof: evals/score.test.ts "reads the write order and the cost from a stream"
- **E6** The report writer shall create its output directory (`--out`, default `evals/reports/`) when missing and write there `<UTC timestamp>-<model>.json` and `.md`; the JSON holds the model, the claude version (read once with `claude --version`, after the confirmation and never on a refusal), the command prefix, the start time and every run's checks, reasons, cost, duration, skills called and `timedOut`, and the Markdown has a table with a table of `passed of N` per task and per check and the reason of every failed check.
  Proof: evals/score.test.ts "writes JSON and Markdown that show x of N per task"
- **E7** When the runner is asked to start, it shall print the number of runs (tasks × N), the model, that each run is a full Libretto flow that spends quota and that permissions are bypassed inside a temp dir, and shall start none until the answer is `y` or `yes` in any case; any other answer shall end it with exit 1, the line `aborted` and no claude call; with `--yes` it shall not ask.
  Proof: evals/run.test.ts "prints the run estimate and waits for a yes"
- **E8** If `--model` is missing, a `--tasks` id is unknown, `--runs` is not a positive integer, `--timeout` or `--max-budget-usd` is not a positive number, or stdin is not a terminal and `--yes` is absent, then the runner shall exit non-zero with a one-line message naming the problem and make no claude call; `--command`, `--claude`, `--keep` and `--out` are not validated and `--` passes what follows to claude.
  Proof: evals/run.test.ts "refuses to start without a model, with an unknown task, with bad numbers or without a terminal"
- **E9** The runner shall run each attempt in a fresh temp directory under the OS temp dir, copied from `evals/sample/`, with `git init` and one baseline commit, and shall spawn `claude` there with `-p`, `--output-format stream-json`, `--verbose`, `--model`, `--permission-mode bypassPermissions`, `--no-session-persistence`, `--max-budget-usd` (default 3, so the test asserts its value too) and the prompt `<command> <task prompt>` followed by the arguments given after `--`; it shall remove the directory afterwards unless `--keep` is given.
  Proof: evals/run.test.ts "runs each attempt in a fresh git repo with the headless flags"
- **E10** After a run the runner shall collect, without trusting the agent's account: the expected files that exist, the exit code of `npm test` on the final tree, the exit code of the task's hidden acceptance test copied in after that as `acceptance.test.js` at the repo root (each of the two limited to 2 minutes, an exceeded limit counting as a non-zero exit), and the added lines under `.agents/` from the baseline to the final working tree (commits, uncommitted and untracked files), so a proposal the agent landed and deleted still counts.
  Proof: evals/run.test.ts "collects the evidence from the final tree even when the proposal was landed"
- **E11** If a run exceeds the timeout (default 20 minutes), then the runner shall kill claude's whole process group so its descendants stop writing, mark the run `timedOut`, and score it from what is on disk; the test's fake claude starts a child process and the test asserts the child is gone.
  Proof: evals/run.test.ts "kills a run past the timeout and scores what is on disk"
- **E12** The repo shall have no `package.json` script, git hook or workflow (the scan skips `evals/`) that mentions `evals/run.mjs`.
  Proof: evals/run.test.ts "nothing in the repo starts the evals by itself"
- **E13** The sample repo shall pass its own `npm test` at baseline, at least three tasks shall exist, and for each task copying its acceptance test into the baseline repo shall make `node --test` exit non-zero.
  Proof: evals/fixtures.test.ts "the sample is green and every task starts red"
- **E14** If the `claude` binary cannot be started, then the runner shall record that run as failed in every check with the spawn error as the reason and carry on with the next run; if claude exits non-zero, then it shall record the exit code with the run and score it from what is on disk.
  Proof: evals/run.test.ts "a missing or failing claude is a scored failure, not a thrown stack"
- **E15** When `evals/run.mjs` is imported, it shall start nothing: `main()` runs only when the file is executed directly.
  Proof: evals/run.test.ts "importing the runner starts nothing"
