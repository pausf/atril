# push-guard-heredoc

Tracker: none (GitHub issue pausf/atril #7)
Targets: workspaces
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> Fix GitHub issue pausf/atril#7 (gh issue view 7 -R pausf/atril): in auto mode the push guard UPLOAD in resources/claude-hook.mjs asks on commands that only mention git push inside a heredoc body or a quoted string. Only a real git push, gh pr create or glab mr create invocation may ask; text inside heredoc bodies and quotes is not a command. Keep it simple, no shell parser dependency. Use criterion ids W420+. Run it through the Libretto flow, open a PR against main and do not merge it.

### The issue, in the reporter's words

- **#7** «In an automatic work, card-answer-lands asked twice to "confirm before pushing" for commands that push nothing. Each was a `python3 - <<'EOF' … EOF` that edited a test file, followed by `pnpm vitest`. The test text contained `git push`, and `UPLOAD` in `resources/claude-hook.mjs:16` matches any `git … push` within one command segment, heredoc bodies included. Every false question stops an unattended work until someone answers.» Expected: «Text inside a heredoc body or a quoted string is not read as a command. Only a real `git push` or `gh pr create` invocation asks.» Repro: «In an automatic work, run a Bash command whose heredoc body contains the words `git push`: the "Auto mode: confirm before pushing" question appears.»

## Reading

A bug: W59 promised «matches this regex» and said nothing about *where* in the command the match may sit, so a
word inside a heredoc body or a quote counted. Owner: `workspaces` (W59; `resources/claude-hook.mjs`). The fix
reads the command with heredoc bodies removed and quoted strings emptied, then applies the same regex. No parser.

## Decision log

### Session 2026-11-27
- Q: A quoted string is not a command, but `sh -c "git push"` and `bash -c 'git push origin x'` are (W59's own cases)? → A: the quoted argument that follows a `sh`, `bash` or `zsh` command and its flags, the last flag cluster ending in `c` (`-c`, `-lc`, `-ec`), is kept; every other quoted string is emptied (assumed; if wrong, `sh -c "git push"` stops asking, or a commit message mentioning push asks again).
- Q: Which `<<` opens a heredoc? → A: `<<` or `<<-` (never `<<<`), optional spaces, an optional quote and a delimiter starting with a letter or `_`; it only counts when a delimiter line follows (exactly the delimiter, leading tabs allowed for `<<-` only): then the lines between the opener's line and the delimiter line, delimiter included, are dropped. With no delimiter line nothing is dropped, so an unterminated or fake opener (`echo "a <<EOF"; git push`, `$((a << b))`) can never hide a push (assumed; if wrong, an unterminated heredoc body mentioning push asks, which fails towards asking). `\EOF` is not recognised.
- Q: Does `gh pr create` / `glab mr create` get the same treatment? → A: yes, one cleaned text for the one regex (assumed).
- Q: (phase 5) Which approach? → A: two `String.replace` passes over the command (heredoc bodies, then quotes), then the unchanged `UPLOAD` (assumed; rejected: a tokenizer, which the ask forbids as a parser dependency and is more code; testing the regex per line only, which fixes heredocs but not `git commit -m "… git push …"`). If wrong, the helper is replaced behind the same function.
- Q: (invocation) What did `/libretto-attacca` answer? → A: it carried this document past the stop into phase 6 and the push of the branch plus a PR against main, never a merge; the fresh reader's findings the run acted on are listed under «Reviewer findings acted on» at the end of this document (assumed).
- Q: Where does the helper live? → A: in `claude-hook.mjs` beside `UPLOAD`, covered through the hook cases in `agent.test.ts`; no new file (assumed; if wrong, move it next to `keepgoing.mjs`).

## Outcomes

- An automatic work running `python3 - <<'EOF' … git push … EOF` or `git commit -m "… git push …"` gets no question.
- A real `git push`, `gh pr create` or `glab mr create` still asks, wherever it sits: after a heredoc, after a quote, inside `sh -c "…"`.

## Scope boundaries

**In:** the cleaning of the command text before `UPLOAD` is tested, in `resources/claude-hook.mjs`; W59's text in the spec; new hook cases in `src/main/agent.test.ts`.

**Out:**
- A shell parser or a new dependency.
- Scripts the command runs (already W59's ceiling).
- Telling a command substitution (`$(git push)`) from text inside double quotes or an unquoted heredoc body.
- The wording or language of the question.

## Constraints

- The hook runs as `ELECTRON_RUN_AS_NODE=1 claude-hook.mjs`: plain Node, no dependency.
- The hook's other outputs, its state file and the ASK text stay byte for byte.
- Failing towards asking: anything the cleaning cannot read (an unbalanced quote, a heredoc opener with no delimiter line) stays in the text.

## Prior decisions

- (2026-11-27, push-guard-heredoc) Quoted strings are emptied except the argument of `sh|bash|zsh` with a `-…c` flag cluster; heredoc bodies are removed only when a delimiter line closes them (assumed). Ceiling: `"$(git push)"` and an unquoted heredoc body's `$(git push)` are expanded by the shell and are no longer seen; `sh -c "git commit -m 'git push'"` still asks; an unterminated heredoc body mentioning push asks; `\EOF` openers are not recognised; the upgrade is a real tokenizer.
- (2026-11-27, push-guard-heredoc) W59's earlier ceiling about a `push` word in a commit message (the spec's Q line near «Does the push stop in Automatic…» keeps the history) is superseded for quoted messages: at landing W59's text is replaced, not appended.

## Task breakdown

- Hook cases first: heredoc body, quoted string, `<<-`, unterminated heredoc, real push after a heredoc and after a quote.
- `commandText()` in the hook: remove heredoc bodies, empty quotes, then `UPLOAD.test`.
- W59's text in the spec.

## Verification criteria

- **W420** While the marker exists, the hook shall not read a heredoc body as part of the command W59 tests: for a `<<DELIM`, `<<-DELIM`, `<< DELIM`, `<<'DELIM'` or `<<"DELIM"` opener (DELIM starting with a letter or `_`, never `<<<`) followed by a line that is exactly DELIM (leading tabs allowed for `<<-` only), the lines between the opener's line and that delimiter line, and the delimiter line, are left out; an opener with no such line leaves the text as it is.
  Proof: src/main/agent.test.ts the hook ignores a push inside a heredoc body
- **W421** While the marker exists, the hook shall not read the inside of a quoted string (`'…'` or `"…"`) as part of the command W59 tests, except a quoted string that directly follows `sh`, `bash` or `zsh` (optionally by path) with any flags whose last cluster ends in `c`, such as `-c`, `-lc` or `-ec`.
  Proof: src/main/agent.test.ts the hook ignores a push inside a quoted string
- **W422** If a real `git push`, `gh pr create` or `glab mr create` stands outside every heredoc body and quoted string, including after a heredoc has ended, after a quoted string has closed, after a fake opener with no delimiter line, after an escaped quote (`\'`) outside any quote, or inside the `-c` argument of `sh`, `bash` or `zsh`, then the hook shall still print W59's question.
  Proof: src/main/agent.test.ts the hook still asks for a real push around heredocs and quotes
- **W59** *(amended)* While the marker `$ATRIL_HOME/auto/<session>` exists, the hook shall answer a PreToolUse for Bash whose command, once W420's heredoc bodies and W421's quoted strings are left out, matches `/\bgit\b[^;&|\n]*?\spush\b|\bgh\b[^;&|\n]*?\spr\s+create\b|\bglab\b[^;&|\n]*?\smr\s+create\b/` by printing exactly `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Modo automático: confirma antes de subir"}}`; for any other command or tool, or without the marker, it shall print nothing. Ceiling: a push inside a script the command calls is not seen; a `push` word after `git` in the same unquoted segment, a push word inside a `sh -c` argument, or in a heredoc with no delimiter line, only adds a question; `$(…)` inside double quotes or an unquoted heredoc body is not seen; whether a person's own bypass mode or allow rule overrides «ask» is the host's (unverified).
  Proof: src/main/agent.test.ts the hook asks before an automatic push

## Approach

### Summary

`commandText(command)` in `claude-hook.mjs` removes heredoc bodies that a delimiter line closes and empties quoted strings
(keeping the argument of `sh|bash|zsh -…c`), and `UPLOAD.test` runs on its result instead of the raw command. A line loop and
one regex replace, no parser.

### Technical context

Plain Node ESM run by Electron's Node (`resources/claude-hook.mjs`, line 203 is the only caller of `UPLOAD`). The hook is
exercised end to end by `src/main/agent.test.ts` (`runHooks`: each `CASES` payload is piped through the real hook in a real
tmux workspace, with and without the `auto/<session>` marker). Gates: `pnpm -s typecheck`, `lint`, `test`. Blast radius:
`resources/claude-hook.mjs`, `src/main/agent.test.ts`, `.agents/specs/workspaces/spec.md` (W59 and three new criteria);
`.agents/specs/README.md` carries W59's text too and is regenerated by `libretto wiki`.

### The approach

1. Heredoc pass, a line loop (not a regex over the whole text): split on `\n`; on a line matching
   `/(?<!<)<<(-?)[ \t]*(['"]?)([A-Za-z_]\w*)\2/` look ahead for the first line that equals the delimiter (`<<-`: after
   trimming leading tabs). Found: keep the opener's line, drop everything up to and including the delimiter line, and go on
   after it. Not found: drop nothing, so an unterminated or fake opener never hides anything. `\EOF` is not recognised.
2. Quote pass on the result: `text.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, (q, at, all) => …)`: the match is kept whole when
   the text before it ends with `/\b(?:ba|z)?sh\s+(?:-\S+\s+)*-\w*c\s+$/` (a `sh`/`bash`/`zsh`, by path or not, its flags,
   the last cluster ending in `c`), otherwise it becomes `''`.
3. `UPLOAD.test(commandText(command))` at line 203. `UPLOAD` itself is unchanged.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| A tokenizer / shell parser | The ask forbids a parser dependency; a hand-rolled one is far more code than the bug |
| Test `UPLOAD` per line | Fixes the issue's heredoc, but not a one-line `git commit -m "… git push …"` |
| Blank every quote, `-c` included | `sh -c "git push"` and `bash -c 'git push origin x'` are W59's own cases and must keep asking |

### Risks

| Risk | What catches it |
|---|---|
| A real push is hidden by an over-eager strip (a heredoc that is not one, an odd quote) | W422 cases: a push after a heredoc, after a quote, after `<<-`; unbalanced quotes stay in the text and keep asking |
| `$(git push)` inside double quotes or an unquoted heredoc body is no longer seen | Accepted, named as W59's ceiling; the guard is a convenience prompt, not a sandbox |
| Catastrophic regex backtracking on a long command | The patterns have no nested quantifiers over the same characters; a 100 KB heredoc case is not added (accepted) |

### Validation and rollback

Three new `it`s in `agent.test.ts`, one per criterion, over three case lists run through the real hook once (shared run):
- W420 `the hook ignores a push inside a heredoc body` (no ask): the issue's `python3 - <<'EOF'` followed by `pnpm vitest`; `cat <<EOF`; `<<"EOF"`; `<< EOF`; `<<-EOF` with a tab-indented delimiter. Red today.
- W421 `the hook ignores a push inside a quoted string` (no ask): `git commit -m "… git push …"`, `git commit -m '… gh pr create …'`, a multi-line quoted message. Red today.
- W422 `the hook still asks for a real push around heredocs and quotes` (asks): a push after a closed heredoc, after a quoted message (`git commit -m "x" && git push`), after `<<-`, `echo "a <<EOF"; git push`, an unterminated heredoc whose body says `git push`, `bash -lc "git push"`, `sh -ec 'gh pr create'`. These pass for the wrong reason on today's hook (it asks on everything), so the proof they carry is that they stay green once W420/W421 start passing: the run is done red-first for W420/W421 and then watched green for W422 after the fix.
Each list's rows are the cases that close that criterion; W59's own proof stays `the hook asks before an automatic push` and its existing rows must stay green. Rollback: one revert, nothing migrates.

### Complexity deliberately kept

The `sh -c` exception in the quote pass: without it W59's `sh -c "git push"` cases would stop asking. And the heredoc pass is a line loop rather than one regex because «only strip when a delimiter line exists» is a lookahead the regex would need backtracking for.

## Checklist

- [x] hook cases for heredoc bodies, quoted strings, `<<-`, an unterminated heredoc and real pushes after each, seen red; then `commandText()` in `claude-hook.mjs` makes them green · Closes: W420, W421, W422, W59

## Reviewer findings acted on

The fresh `spec-reviewer` read this document cold; this run (its author) amended it before phase 6. Each finding, what was done:
- W421 against the approach on `-c` (two readings) → both now say the same: a `sh|bash|zsh` command, its flags, the last cluster ending in `c`.
- `bash -lc` / `sh -ec` variants → covered by that rule, and cases for both.
- Unterminated heredoc against «failing towards asking», `echo "a <<EOF"; git push` → an opener with no delimiter line drops nothing (W420, Constraints, W422 case).
- Delimiter rules disagreeing, `<<<`, `$((a << b))` → one rule in the decision log, W420 and Approach step 1; the `<<<` guard is in the regex shown; `$((a << b))` is harmless without a delimiter line; `\EOF` named as unrecognised.
- One shared proof for three criteria → three tests, one per criterion, each with its rows listed under Validation.
- W59's ceiling against Prior decisions → ceiling text now names the `sh -c` and unterminated cases; the old ceiling is replaced at landing.
- No box for the spec text → not a box: the spec delta lands in phase 8 (`record-work`), as for every change; no code box can close it.
- (work-reviewer, phase 6→7) a stray escaped apostrophe outside quotes paired with a later one and hid a real push → fixed: `\x` is skipped by the quote pass; W422 gained the case; lesson written.
