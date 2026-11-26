# Atril

A Mac app that runs each Jira task through the Libretto flow with Claude Code agents in tmux, and manages your GitHub/GitLab merge requests.

The goal is simple: one person carrying three tasks at once without losing focus. Atril shows what each agent is doing, asks you only when it needs you, and keeps the MRs you own or review in one place.

> Early software. Many flows have only been tested against doubles, not against real forges, Jira or Claude. Expect rough edges.

## What it does

- **Tasks to jobs.** Pick a Jira task (or write your own) and Atril starts a Claude Code agent for it in a tmux session, in its own git worktree, following the Libretto flow: spec, plan, build, review, land.
- **Focus.** One row per job with its step, its state and what it is waiting for (a question, a permission, the end of a turn). The terminal is read-only; you answer from Atril.
- **Merge requests.** Lists of your MRs and the ones awaiting your review, CI status, a review page with code and threads, scores, and merge, for GitHub and GitLab.
- **Skills.** Browse, toggle, edit and install the Claude Code skills, commands and plugins on your machine.
- **QA.** Per-job QA reports against a browser, an iOS simulator or an Android emulator.

Tokens (Jira, GitHub, GitLab) are stored and used only in the Electron main process.

## Requirements

- macOS
- [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io)
- `git` and `tmux`
- [Claude Code](https://claude.com/claude-code), signed in, with the Libretto plugin installed
- Optional: a Jira account, a GitHub or GitLab token, Xcode (iOS) or the Android SDK (Android)

## Install from source

```sh
git clone https://github.com/pausf/atril.git
cd atril
pnpm install
pnpm run rebuild   # compiles node-pty against Electron
pnpm dev
```

To package a `.dmg`: `pnpm dist`.

## Develop

```sh
pnpm dev         # run the app with hot reload
pnpm typecheck
pnpm lint
pnpm test
```

`pnpm install` enables the `.githooks/pre-commit` hook (typecheck and lint). Tests use their own tmux socket and a temporary `ATRIL_HOME`, so they never touch your real sessions or data. Project conventions and the contribution flow are in [CLAUDE.md](CLAUDE.md); living specs are in `.agents/specs/`.

## Crash reports (opt-in)

Off by default. In Settings → "Failures" you can turn on "Send failures to GitHub as a PR". The first time, a dialog tells you what is sent.

When Atril fails in a way it did not expect, it builds a report (message, stack trace, where it happened, Atril/Electron/macOS versions, time), scrubs paths, tokens, emails, server addresses and Jira keys on your Mac, and opens an issue titled `Crash <signature>:` in this repository with your connected GitHub account. A workflow in `.github/workflows/crash-report.yml` turns it into a pull request adding `crash-reports/<signature>.md`. The issue and the PR are **public**. The scrubbing is best effort, not a guarantee. Nothing is sent unless you turn it on, the same failure is reported once, and at most 5 reports a day leave your Mac.

## License

[MIT](LICENSE) © 2026 pausf
