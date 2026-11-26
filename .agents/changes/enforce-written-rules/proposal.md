# enforce-written-rules

Tracker: none
Targets: workspaces
Durable decisions: the four in Prior decisions below

## Ask (verbatim)

Turn written rules into enforced ones, and trim CLAUDE.md (idea from "Agent Harness en 15 minutos": context only suggests, verification enforces).

1. Pre-push hook: add .githooks/pre-push that runs the work-identifier scan CLAUDE.md describes (git grep -niE -f ~/.config/atril/work-identifiers.txt over what is being pushed, ignoring the pnpm-lock.yaml integrity line) and refuses the push on a match. If that list file does not exist (any other contributor), the hook does nothing. Never copy the list into the repo. `pnpm run prepare` already points git at .githooks.
2. Claude Code guard: a project PreToolUse hook in .claude/settings.json that denies `pnpm build` (and `pnpm run build`) with a one-line reason; keep it tiny and testable.
3. Trim CLAUDE.md: the "Where we left off" history of ~20 landed branches is loaded into every agent session. Keep only what is current (the latest landed change, what is next, what is untested with real data) and the working rules; drop the per-branch history (git log and .agents/specs already hold it). Remove any rule now enforced by 1 or 2 from the prose, pointing to the hook instead.

Tests first for the hooks (a small script test is enough). All in English. Out: evals, changing Libretto skills.

## Reading

Not a bug: new enforcement (two hooks) plus a docs trim. The lessons ledger backs it: `harness-ladder` already moved rules from prose to lint and pre-commit; this continues that ladder (prose is the last rung, a hook is a higher one).

## Decision log

### Session 2026-11-26
- Q: What does the pre-push scan read: the tree of each pushed commit, or the diff of every commit in the push? → A: the tree of each pushed commit, as CLAUDE.md's `git grep … HEAD` does today (assumed). If wrong: an identifier added and removed again inside one push goes through; scan `git log -p remote..local` as well.
- Q: What does "ignoring the integrity line" cover? → A: only `pnpm-lock.yaml` lines that contain `integrity:`; any other line of the lock file is scanned (assumed). If wrong: a work package name in the lock file would slip through if the whole file were excluded.
- Q: A blank line in the list file: `git grep -f` treats it as an empty pattern that matches every line. → A: blank lines are dropped before scanning; a list with no pattern left behaves like a missing list (assumed).
- Q: The scan itself fails (an invalid pattern in the list). → A: the hook fails closed: refuse the push and say the scan failed (assumed). A guard that says nothing on error is a guard that is off.
- Q: How does the Claude Code guard deny? → A: exit 2 with one line on stderr (assumed): it needs no JSON output and a test asserts it directly.
- Q: Which commands does the guard deny? → A: `pnpm` running the script `build`: `pnpm build`, `pnpm run build`, option flags in between (`pnpm -s build`), at the start of the command or after `;`, `&&`, `||`, `|` or a newline (assumed). Not denied: a command that only mentions it (`git commit -m "never pnpm build"`), `pnpm builder`, other build entry points. If wrong in the first direction a rephrased command costs one retry; the second is named in Scope.
- Q: A payload the guard cannot parse, or a tool that is not Bash. → A: the guard lets it through (assumed): Claude Code always sends JSON, and a guard that breaks the session on a surprise teaches people to remove it.
- Q: How big may CLAUDE.md be after the trim? → A: at most 7000 bytes, tested (assumed; it is 14474 today). Without a number the history grows back one landing at a time.
- Q: Language of CLAUDE.md? → A: English, all of it (the ask says all in English; the repo is public).
- Q: How is the guard written? (fork, phase 5) → A: a `.sh` file that reads the payload with `node -e` (assumed). Rejected: a `.mjs` file (one more JS file inside `eslint .`'s scope, which needs its globals declared as `package-and-sign` found for `.cjs`); `permissions.deny` rules in settings.json (native and zero code, but the reason shown is generic, the ask names a hook, and a deny rule cannot be run without a live Claude Code). If wrong: the guard moves into a `.mjs` with an eslint block, nothing else changes.
- Q: (spec-reviewer) Which `pnpm … build` shapes does the guard deny, exactly? → A: `pnpm` at a command position, then flags that take no argument, optionally `run` and more such flags, then `build` (assumed). `pnpm -C dir build`, `pnpm --filter x build`, `(pnpm build)`, `$(pnpm build)`, `env X=1 pnpm build` and `sh -c "pnpm build"` pass: named in Scope Out. `echo "a; pnpm build"` and a multi-line commit message with a line that starts `pnpm build` are denied: a false deny, also named. If wrong: widen the regex; nothing else changes.
- Q: (spec-reviewer) Is the registration proved? → A: yes, the test asserts the entry under `hooks.PreToolUse` has `matcher: "Bash"` and a hook of `type: "command"`, not only the command text (assumed).
- Q: (spec-reviewer) Does the hook print `path:line` or git's own output? → A: git's own output, `<sha>:path:line:text` (assumed), so the person sees what matched.
- Q: (spec-reviewer) One test or several per criterion? → A: one `it` per criterion holding every clause (assumed).
- Q: (spec-reviewer) A tag object, a sha the clone cannot resolve, a list that exists but cannot be read. → A: each is a failed scan and refuses the push (assumed): W232.
- Q: (spec-reviewer) What makes CLAUDE.md's size test strong enough? → A: it also asserts the three state sections (`## Last landed`, `## Next`, `## Untested with real data`), and that neither `Where we left off` nor the old Spanish title `Dónde lo dejamos` is left (assumed).
- Q: (spec-reviewer) Where do the lessons entry and the `Governs:` line belong? → A: in box 3 and its commit; they close no criterion (assumed). The reason the guard prints says this repo is never built in a session.
- Q: (user, 2026-11-26) The parallel change `fewer-go-on-cards` already takes W217–W224 in `workspaces`. → A: renumber mine to W230 and up.

## Outcomes

- A push whose commits carry a work identifier is refused by `.githooks/pre-push` on the contributor's machine that has the list; on any other machine the hook does nothing.
- A Claude Code session in this repo cannot run `pnpm build`: the tool call is denied with one line saying why.
- `CLAUDE.md` is a short brief: what landed last, what comes next, what is untested with real data, and the working rules that no hook enforces; the two enforced rules are one-line pointers.

## Scope boundaries

**In:** `.githooks/pre-push` (new); `.claude/settings.json` and its guard script under `.claude/` (new); `CLAUDE.md` rewritten in English; `src/main/harness.test.ts` (new cases); `.agents/lessons.md` (one entry naming the written rules these hooks replace); the `Governs:` line of `workspaces` gains `.claude/** CLAUDE.md` (edited in the landing commit, since `land.py` does not touch it).

**Out (named):**
- Scanning the diff of every commit in a push: only the tip tree of each pushed ref is scanned. Brought back by an identifier that was added and removed inside one push.
- Other ways to build (`pnpm dist`, `pnpm exec electron-vite build`, `npx …`): the ask names `pnpm build` and `pnpm run build`. Brought back by a session that runs one.
- Preventing `git push --no-verify`: that is the person's own escape hatch.
- A CI copy of the scan (the list must not leave the machine).
- Guard false negatives: `pnpm -C dir build`, `pnpm --filter x build`, `(pnpm build)`, `$(pnpm build)`, `env X=1 pnpm build`, `sh -c "pnpm build"`. Brought back by a session that gets one through; this repo is not a monorepo.
- Guard false denies: `echo "a; pnpm build"` and a multi-line commit message with a line starting `pnpm build`. Costs one rephrased command.
- Evals, changes to Libretto skills, any change to `pre-commit`.

**Never scoped out here:** the list is read, never copied, logged or written anywhere by the hook; a scan error refuses the push; the guard's reason is one line a person can act on.

## Constraints

- POSIX `sh`, git as the only dependency of the pre-push hook; no dependency added to the repo.
- The list lives at `$HOME/.config/atril/work-identifiers.txt`. Tests point `HOME` at a temp folder and never read the real list.
- `pnpm run prepare` already sets `core.hooksPath` to `.githooks` (W213); the new hook must be executable in git.
- The existing `pre-commit` and its test stay as they are.
- The guard is a `.sh` file with its JavaScript inline (`node -e`), so `eslint .` has nothing new to lint; `node` is already a requirement of the repo.

## Prior decisions

- (2026-11-26, enforce-written-rules) A rule moves from prose to the highest rung that holds it (harness-ladder, 2026-11-19): the work-identifier scan becomes a pre-push hook, the `pnpm build` ban a PreToolUse guard; CLAUDE.md keeps a one-line pointer to each and never the command.
- (2026-11-26, enforce-written-rules) The tip tree of each pushed ref is what is scanned, not the history: ceiling named in Scope, upgrade is `git log -p`.
- (2026-11-26, enforce-written-rules) Fail closed on a failed scan, fail open on an unreadable guard payload.
- (2026-11-26, enforce-written-rules) The per-branch history in CLAUDE.md goes: git log and `.agents/specs` already hold it. The lesson «a pnpm-lock `integrity` hash can match by chance» is kept as the filter in the hook, not as prose.

## Task breakdown

- Pre-push hook with its tests (missing list, blank list, match, no match, delete push, integrity line, invalid pattern).
- Claude Code guard in `.claude/settings.json` with its tests, run as settings.json names it.
- Trim and translate CLAUDE.md, with its size test.
- Lessons entry and the `Governs:` line.

## Verification criteria

- **W230** If a commit being pushed has, in its tree, a line that matches (case-insensitively) a pattern of `$HOME/.config/atril/work-identifiers.txt`, then `.githooks/pre-push` shall exit non-zero and print git's own matching lines (`<sha>:path:line:text`), and a real `git push` with `core.hooksPath` set to `.githooks` shall fail. This covers any pushed ref, not only the checked-out one, and a line of `pnpm-lock.yaml` that does not contain `integrity:`.
  Proof: src/main/harness.test.ts the pre-push hook refuses a work identifier
- **W231** While `$HOME/.config/atril/work-identifiers.txt` is missing or has no non-blank line, or when no pushed tree matches it, or when the push only deletes a ref, or when the only matches are `pnpm-lock.yaml` lines that contain `integrity:`, `.githooks/pre-push` shall exit 0.
  Proof: src/main/harness.test.ts the pre-push hook lets clean pushes through
- **W232** If the scan fails (a pattern in the list that is not a valid regular expression, a list that exists but cannot be read, or a pushed sha git cannot scan), then `.githooks/pre-push` shall exit non-zero and say, on one line, that the work-identifier scan failed.
  Proof: src/main/harness.test.ts the pre-push hook refuses when the scan itself fails
- **W233** When Claude Code is about to run a Bash command that runs the pnpm script `build` (`pnpm build`, `pnpm run build`, flags that take no argument between the words such as `pnpm -s build`, at the start of the command or after `;`, `&&`, `||`, `|` or a newline), the PreToolUse hook that `.claude/settings.json` registers (under `hooks.PreToolUse`, matcher `Bash`, type `command`), run as that file names it, shall exit 2 with a one-line reason on stderr that says this repo is never built in a session.
  Proof: src/main/harness.test.ts the build guard denies pnpm build
- **W234** While the Bash command has no `pnpm` at a command position followed by `build` as W233 reads it (`pnpm -s typecheck`, `pnpm test`, `pnpm builder`, `git commit -m "never pnpm build"`), or the tool is not Bash, or the payload is not JSON, the guard shall exit 0 and print nothing.
  Proof: src/main/harness.test.ts the build guard lets everything else through
- **W235** `CLAUDE.md` shall be at most 7000 bytes, shall name `.githooks/pre-push` and `.claude/settings.json`, shall have the sections `## Last landed`, `## Next` and `## Untested with real data`, and shall not contain the scan command (`git grep -niE`), `Where we left off` nor `Dónde lo dejamos`.
  Proof: src/main/harness.test.ts CLAUDE.md stays a short brief that points at the hooks

## Approach

### Summary
Two small shell scripts and one JSON file, each proved by cases added to the existing `src/main/harness.test.ts`: `.githooks/pre-push` scans the tip tree of every pushed ref against the private list; `.claude/hooks/no-build.sh`, registered in `.claude/settings.json`, denies `pnpm build`; `CLAUDE.md` is rewritten short, in English, pointing at both.

### Technical context
POSIX `sh`, git (for `git grep`), node (already required) for the guard's JSON. Tests: vitest, `src/main/harness.test.ts` (already holds the `pre-commit` and `prepare` proofs, spawns `sh` with `spawnSync`, uses temp dirs). Gates: `pnpm -s typecheck`, `pnpm -s lint`, `pnpm -s test`; `pre-commit` runs the first two. Nothing generated. Blast radius: 3 new files (`.githooks/pre-push`, `.claude/settings.json`, `.claude/hooks/no-build.sh`), 4 edited (`CLAUDE.md`, `src/main/harness.test.ts`, `.agents/lessons.md`, the `Governs:` line of `.agents/specs/workspaces/spec.md`), plus the change folder.

### The approach
- **Pre-push (W230–W232).** Git feeds the hook `<local ref> <local sha> <remote ref> <remote sha>` per ref on stdin. The hook: exit 0 if `$HOME/.config/atril/work-identifiers.txt` is missing; copy it to a temp file without blank lines (`sed '/^[[:space:]]*$/d'`; a blank pattern matches every line) and exit 0 if that is empty; for each stdin line whose local sha is not all zeros, run `git grep -niE -f <patterns> <sha>`. Exit 1 of `git grep` is no match; 0 is a match; anything above is the scan failing → print one line («pre-push: the work-identifier scan failed») and exit 1. On a match, drop `<sha>:pnpm-lock.yaml:<n>:` lines that contain `integrity:` (`grep -v`); if any line is left, print them and exit 1 after the loop (all refs are reported). The temp file is removed by a `trap`. The hook never writes the list or its patterns anywhere else.
- **Guard (W233–W234).** `.claude/settings.json` registers one `PreToolUse` entry, matcher `Bash`, command `sh "$CLAUDE_PROJECT_DIR/.claude/hooks/no-build.sh"`. The script is `node -e` over stdin: parse the JSON; if `tool_name` is `Bash` and `tool_input.command` is a string matching `/(^|[;&|\n])\s*pnpm(\s+-\S+)*(\s+run(\s+-\S+)*)?\s+build(\s|$|[;&|])/`, write one line to stderr and `process.exit(2)`; any other case (other tool, parse error) exits 0 silently. Each repetition in the regex starts with `\s+-`, so there is no nested ambiguity and no catastrophic backtracking.
- **CLAUDE.md (W235).** Rewritten in English by hand, ≤ 7000 bytes: current state (last landed change, next, untested with real data) and the working rules that no hook enforces. The two enforced rules become one line each naming `.githooks/pre-push` (the list path stays, the command goes) and `.claude/settings.json`. The per-branch history is dropped.
- **Tests, written first and seen red.** A helper builds a temp git repo with a commit; `HOME` points at a temp folder holding the list. W230: identifier in the tip of `other` while the checked-out branch is clean and stdin names `other`'s sha; case differs from the list; a non-integrity `pnpm-lock.yaml` line; and a real `git push` to a bare repo with `core.hooksPath` set to the repo's `.githooks` (this also proves the executable bit and the stdin format). W231: no list, a list of blank lines, no match, a delete push, an integrity-only lock match. W232: a list holding `(`, a list with mode 000, and a stdin sha that git cannot resolve (the hook treats a non-zero `sed` as a failed scan too). Each criterion is one `it` holding all its clauses. W233/W234: the test reads the `Bash` entry out of `.claude/settings.json`, asserts its matcher and type, and runs its command with `sh -c`, `CLAUDE_PROJECT_DIR` set to the repo root, payloads on stdin. W235: reads `CLAUDE.md`.

### The alternatives it beat
| Considered | Why it lost |
|---|---|
| Guard as a `.mjs` file | one more JS file under `eslint .`; the globals block `.cjs` needed in package-and-sign would repeat |
| `permissions.deny` rules | generic reason, cannot be run without a live Claude Code, and the ask names a hook |
| Scan every commit's diff (`git log -p remote..local`) | the rule today is a tree scan; the diff scan needs the remote sha to exist locally and handles new branches badly. Comes back if an identifier added and removed inside one push is ever seen |
| Exclude `pnpm-lock.yaml` from the scan altogether | would let a real name in a lock line through; only the `integrity:` lines are noise |
| husky / lefthook for the hook | `harness-ladder` already decided: a dependency for a few lines of shell |
| Parse the Bash command with a full shell parser | the guard's cost would exceed the rule's; the regex names its ceiling |

### Risks
| Risk | Mitigation |
|---|---|
| `pre-push` not executable: git silently skips it | W230's test does a real `git push` with `core.hooksPath` set; forced red by `chmod -x` |
| A blank line in the list matches every line and blocks every push (or hides the real failure) | W231's list of blank lines; forced red by removing the `sed` |
| `git grep` exit codes confused: a bad pattern read as «no match» lets the push through | W232 (`(` in the list); forced red by treating every non-zero as no match |
| A test reads the contributor's real list or `$HOME` | every case sets `HOME` to a temp folder; the hook is only ever run with that env |
| The guard misses `pnpm -C dir build`, `pnpm --filter x build`, `pnpm exec …`, `pnpm dist`; or denies `echo "a; pnpm build"` | named in Scope and Decision log; no mitigation, accepted: this repo is not a monorepo and a false deny costs one rephrased command |
| The guard silently stops denying when `settings.json` is renamed or reshaped | W233's test takes the entry (matcher `Bash`, type `command`) and its command out of `settings.json` itself, so a broken registration fails it |
| `git grep` slow on a large tree | measured in phase 6 and noted in the Decision log; Atril's tree is small |

### Validation and rollback
`pnpm -s typecheck`, `pnpm -s lint`, `pnpm -s test` (the new cases in `src/main/harness.test.ts`). Forced red on purpose, per the risks: `chmod -x` the hook; drop the `sed`; treat every `git grep` failure as no match; break the guard regex; delete the `settings.json` entry. Rollback: one revert; `git config --unset core.hooksPath` is not needed (pre-commit stays).

### Complexity deliberately kept
- `node -e` inside the guard: a JSON parser without a new dependency or a new JS file in lint's scope.
- The blank-line strip in the hook: without it one stray newline in the list blocks every push.

## Checklist

- [ ] `.githooks/pre-push` with its tests written first and seen red (real `git push`, blank list, invalid pattern, integrity line) · Closes: W230, W231, W232
- [ ] `.claude/settings.json` and `.claude/hooks/no-build.sh` with their tests written first and seen red, run as settings.json names the command · Closes: W233, W234
- [ ] `CLAUDE.md` rewritten short and in English with its size and sections test, plus the lessons entry and the `Governs:` line (landing hygiene, no criterion) · waits on boxes 1 and 2 · Closes: W235
