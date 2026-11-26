# english-source

Tracker: none
Kind: change (refactor of an existing behaviour; not a bug)

## Ask (verbatim)

Make English the source language of Atril's UI. Today every t()/useT() key is the Spanish text and src/preload/i18n-en.ts maps it to English. Flip it: every key in the code becomes its English text, and a new Spanish catalog (src/preload/i18n-es.ts) maps English → Spanish, so a Mac in Spanish (or «Español» in Ajustes → Idioma) still shows exactly today's Spanish, and English shows today's English. Do it with a script, not by hand, keep {placeholders} intact, keep the S16/S19 i18n scans and every existing test passing (tests that assert Spanish text should keep running in Spanish), and add a test that fails if a key in code is missing from the Spanish catalog. Out: translating specs, docs or test names.

## Reading

English becomes the source language of Atril's UI texts: the string in `t()`/`useT()` is the English text, and Spanish is a catalog (`src/preload/i18n-es.ts`, English → Spanish) instead of English being the catalog. A person sees exactly what they see today in either language. Nothing visible changes; the repo becomes readable to English contributors (the repo is public, MIT). Not a bug.

Targets: settings
Durable decisions: the two in Prior decisions below

## Decision log

### Session 2026-11-26
- Q: two Spanish texts translate to the same English («Volver» and «Atrás» are both «Back»; 16 groups, 17 extra keys, found by reading `i18n-en.ts`): flipping the map loses one of them → A: keep today's Spanish exact: the extra keys get a context suffix `Back@@nav` that English display strips; the suffix is chosen from a small table in the script (assumed; if wrong, a pair of Spanish texts collapses into one and the Spanish screen changes, which the equivalence check would show)
- Q: who writes the Spanish catalog → A: the script, from the current `i18n-en.ts` (key = old Spanish, value = old English), so the Spanish cannot drift while flipping (assumed)
- Q: hook lines (`resources/summarise.mjs`) and main's stored activity lines are Spanish data → A: they stay Spanish; `localiseActivity` keeps matching them and now returns English keys (assumed; translating the hook is out)
- Q: identical words (`Git`, `OK`) → A: still get an ES entry, so the "key missing from the Spanish catalog" test is strict with no allow-list (assumed)
- Q: (phase 5 fork) how to rewrite 1,100 call sites → A: TypeScript-AST script, not regex (assumed; if wrong, an escaped quote or multi-line call is missed and the scan test names it). Rejected: regex like the scan's `KEY` (misses nothing today only because the scan is allowed to fail loudly, a rewrite is not), and flipping only at lookup, leaving Spanish keys in code (does not make English the source, which is the ask)
- Q: (phase 5 fork) how to keep both Spanish texts of a colliding pair → A: context suffix in the key (assumed). Rejected: a second `t(key, vars, ctx)` argument (every signature and the `useT` hook change for 17 keys), and accepting the loss (breaks «exactly today's Spanish»)
- Q: `i18n-en.ts` → A: deleted at the end of the flip, nothing else imports it (assumed)

## Outcomes

- Every literal key in `t()`, `useT()` and `translate()` in `src/` is the English text. `src/preload/i18n-es.ts` holds `ES: Record<string, string>`, English → Spanish, one entry per key.
- In Spanish (Mac in Spanish, or «Español» in Ajustes → Idioma) the person sees the same Spanish as before the change; in English, the same English. Placeholders (`{n}`, `{detail}`) are untouched and `{detail}` stays untranslated.
- A test fails the day a key in code has no Spanish entry (and when an entry has no caller).
- The flip is done by a script that reads the current catalog and rewrites call sites through the TypeScript AST; it ends with an equivalence check: for every old key, `old es` equals `ES[new key]` and `old EN[key]` equals the new key without its context suffix.

## Scope boundaries

**In:** `src/preload/i18n.ts` (`translate` reads `ES`), new `src/preload/i18n-es.ts`, deletion of `src/preload/i18n-en.ts`; every `t()`/`useT()`/`translate()` call with a literal key in `src/**` (main, renderer, preload, tests that pass keys); `src/preload/activity-i18n.ts` (matches Spanish hook lines, returns English keys); `src/preload/i18n.test.ts` and `src/main/i18n.test.ts` (keys flipped, the missing-from-Spanish test); `CLAUDE.md` line on «Textos»; the settings spec's lines «a text with no English entry shows in Spanish rather than empty» and «Every text through `useT()` with its English entry», amended by hand at landing; the S19 scan's file filter (`i18n-en.ts` out, `i18n-es.ts` in).
Ownership: `src/preload/i18n-es.ts` is governed by the settings spec like `i18n-en.ts` was (S16/S19 live there), though `src/preload/**` is in workspaces' `Governs:`; unchanged by this change.

**Out (named):** translating specs, docs or test names (the ask); the hook `resources/summarise.mjs` and the Spanish activity lines main stores (every `// i18n-ignore` line in `status.ts`, `notify.ts` and `activity-i18n.ts` keeps its Spanish literal; only the `t()` keys beside them flip); Claude prompts (`LESSONS_NOTE`, `CONTINUE`, `SPLIT`) and demo data marked `// i18n-ignore`; a third language; any rewording of an English text; i18n libraries.

**Never scoped out:** the Spanish a person sees stays byte-identical, including punctuation and `{placeholders}`; a missing Spanish entry never shows an empty string (falls back to the English key).

## Constraints

- `t()` keys stay literals (S16: no template literals); the AST walk finds `t(`, `translate(lang, `, and `useT()`'s `t`.
- Colliding English texts need distinct keys; the context suffix is `@@word`, matched as `/@@\w+$/`, and no real English text ends that way.
- Tests assert Spanish through the Spanish Mac mock (`language: 'es'`); they must stay green unmodified except where they pass a Spanish key to `t()`/`translate()`.
- A test that flakes under load (`openmr.test.ts`, `pause.test.ts`) and passes alone counts as green, and is reported as such.
- Gates: `pnpm -s typecheck`, `pnpm -s lint`, `pnpm -s test` (the hook runs the first two). Never `pnpm build`.
- Comment density as in neighbouring files; `ponytail:` comments in English.

## Prior decisions

- add-language (9 nov 2026): no i18n library, a dictionary and `t()` with `{variables}`; main owns the resolved language. Unchanged. What flips is which side is the key: before, a missing English entry showed the Spanish; now a missing Spanish entry shows the English (the test makes it impossible to ship).
- S19 stays as written. **Ceiling named:** it cannot see an English text that skips `t()` (no accents to catch), so a new untranslated English literal is caught only by S15's screens or by reading. Upgrade path if it bites: an ESLint rule on JSX text nodes.
- Context suffix `@@word` (26 nov 2026): English display strips it; it exists only to keep two Spanish texts apart and is never shown.
- Every Decision-log answer above, 26 nov 2026, was assumed (Pau's standing rule: don't stop to ask).

## Task breakdown

1. The flip script (throwaway, in the scratchpad): reads `EN`, resolves collisions with the context table, rewrites call sites by AST, writes `i18n-es.ts`, prints the equivalence report.
2. `i18n.ts`, `activity-i18n.ts`, and the tests' own keys.
3. New tests: key missing from `ES`, context-suffix pair, English-is-the-key.
4. Delete `i18n-en.ts`; update `CLAUDE.md`.
5. Run the scan tests, then the full suite.

## Verification criteria

- **S48** The `translate` function shall return, for language `es`, the entry of `ES` for the key (with its `{placeholders}` replaced), and for `en` the key itself without any context suffix; a key with no `ES` entry shall show as the English text, suffix stripped, in either language.
  Proof: src/preload/i18n.test.ts english is the key and spanish is the catalog
- **S49** Where two Spanish texts share one English text, the two keys shall differ by a context suffix, English shall show both without it, and Spanish shall show each its own text.
  Proof: src/preload/i18n.test.ts same english two spanish
- **S16** (amended) Every literal key passed to `t()` or `translate()` in `src/` shall have a Spanish entry in `ES` with the same `{placeholders}` as the key, no key shall be a template literal, and the catalog shall hold no entry that no call uses.
  Ceiling named: one test holds the four promises, in four separate `expect`s (missing, placeholders, template literal, unused), each forced red once before it is believed.
  Proof: src/preload/i18n.test.ts every text has its spanish
- **S50** While the language is Spanish, the rail, Trabajo, Tareas, Ajustes and the Nueva tarea dialog shall show the Spanish they showed before English became the source, asserted as literal Spanish strings.
  Ceiling named: this samples five screens; the whole-catalog proof is the script's equivalence report (old Spanish equals `ES[new key]` for all ~1,110 keys), which is pasted into the commit message of box 1 because the script is throwaway.
  Proof: src/renderer/settings/language.test.ts the window shows spanish after the flip

## Approach

### Summary

One throwaway Node script flips the whole UI in a single pass: it loads the current `EN` map, picks a unique English key per Spanish key, rewrites every `t()`/`translate()` call site through the TypeScript compiler API, and writes `i18n-es.ts`. A final equivalence check against the old catalog proves nothing visible moved. `translate` then reads `ES` for `es` and strips the context suffix for `en`.

### Technical context

TypeScript 5 with `typescript` already a devDependency (AST via `ts.createSourceFile`), vitest 5, Electron main + React renderer + preload. Call sites: ~1,100 keys over about 90 files in `src/main`, `src/renderer`, `src/preload` plus the tests that pass keys. Generated: nothing. Gates: typecheck, lint, full vitest (`maxWorkers: 4`). Blast radius: most of `src/**` by one mechanical edit, plus `i18n.ts`, `activity-i18n.ts`, `i18n.test.ts`, `main/i18n.test.ts`, `CLAUDE.md`, one new file, one deleted.

### The approach

1. Script, run from the repo root with `node --experimental-strip-types`, in the scratchpad (not committed).
2. Build `key map`: for each `[es, en]` of `EN`, new key = `en`; when several `es` share an `en`, the first in file order keeps it plain and the others get `en@@<word>` from a table written in the script (reviewed in the diff of `i18n-es.ts`).
3. Walk every `.ts/.tsx` under `src/` with the TS AST; a call whose callee is `t` or `translate` (second argument for `translate`) with a string-literal key is rewritten at that node's range, keeping the quote style the file's neighbours use and escaping as needed. A key not in `EN` (a test's own fixture, or anything else) aborts the script with the list and a non-zero exit; nothing is guessed and no file is written.
4. Emit `src/preload/i18n-es.ts` (`ES[newKey] = oldEs`), identity entries included.
5. Equivalence check inside the script: for every old key, old Spanish equals `ES[new]`, and old English equals `new` without suffix; for the AST rewrite, the multiset of old keys found equals that of new keys.
6. By hand, small: `translate`, `activity-i18n.ts` (matches Spanish data, returns English keys; the `i18n-ignore` Spanish literals stay), the two i18n tests (incl. the S19 file filter), `CLAUDE.md`; delete `i18n-en.ts`.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Regex rewrite, reusing the scan's `KEY` | Escaped quotes, multi-line calls and `translate(lang, …)` are where regex mis-edits silently; a rewrite cannot fail loudly the way a scan can |
| Flip only at lookup (`EN` stays, code keeps Spanish) | Leaves Spanish as the source in code, which is what the ask removes |
| `t(key, vars, ctx)` third argument for collisions | Changes three signatures and the hook for 17 keys; the suffix is invisible to callers |
| Accept the 17 lost distinctions | Breaks «exactly today's Spanish» on, e.g., «Atrás» showing «Volver» |

### Risks

| Risk | What catches it |
|---|---|
| A call site is missed and keeps a Spanish key | `every text has its spanish` fails: the key is missing from `ES` |
| A Spanish text changes in the flip | The script's equivalence check, run before commit, and the existing Spanish-asserting renderer and main tests |
| The suffix leaks into English | `same english two spanish` asserts both shown without it |
| A mid-string quote breaks a file | typecheck in the pre-commit hook; the AST printer path only edits literal ranges |
| An English key accidentally equals an unrelated Spanish key used as a lookup elsewhere | none found: the only non-`t()` Spanish matching is in `activity-i18n.ts` and `status.ts`, listed in Scope; unmitigated beyond reading, accepted |

### Validation and rollback

Gates: typecheck, lint, full suite. New tests: three in `i18n.test.ts`, one in `language.test.ts`. The `every text has its spanish` test would pass for the wrong reason if its regex missed a call form; force it red by deleting one `ES` entry and by restoring one Spanish key in code, and see both fail. Rollback: one revert; nothing is persisted (`ui.json` keeps `language`, not texts).

### Complexity deliberately kept

The `@@word` suffix is the one non-obvious piece: it looks like noise next to `t('Back@@nav')`, and the simpler thing, plain keys, silently merges «Volver» and «Atrás». It gets a `ponytail:` comment in `translate`.

## Checklist

- [x] The flip, end to end: script run, every `t()`/`translate()` key in `src/` English, `i18n-es.ts` written, `translate` reading `ES`, `activity-i18n.ts` returning English keys, `i18n-en.ts` deleted, the two i18n test files on English keys with the new missing-from-Spanish and same-english-two-spanish cases, equivalence report clean, typecheck and lint green · Closes: S48, S49, S16
- [ ] Spanish window unchanged and the gates: the S50 case in `language.test.ts`, the two forced-red checks (delete one `ES` entry; put one Spanish key back in code), `CLAUDE.md` «Textos» line pointing at `i18n-es.ts`, full suite green · waits on box 1 · Closes: S50
