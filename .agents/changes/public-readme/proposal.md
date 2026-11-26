# public-readme

Tracker: none
Kind: change (repo hygiene before going public; not a bug)

## Ask (verbatim)

Prepare Atril's repo to be public, in English: translate CLAUDE.md to English keeping every rule and command; write README.md (what Atril is — a Mac app that runs each Jira task through the Libretto flow with Claude Code agents in tmux and manages GitHub/GitLab MRs —, requirements, install from source with pnpm, dev, tests, the crash-report opt-in, license); add LICENSE (MIT, copyright 2026 pausf) and "license": "MIT" in package.json; add bocetos/ to .gitignore and untrack it with `git rm -r --cached bocetos` (the folder must stay on disk). Out: specs, lessons, code.
