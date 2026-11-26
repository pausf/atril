# fix-cdp-isolation

Tracker: none (GitHub issue pausf/atril#13, "An agent's real-app drive can attach to another Atril over CDP")
Kind: bug
Criteria: W320 and up
Targets: workspaces

## The ask (verbatim)

Fix dogfood issue #13 in pausf/atril (read it with gh): an agent's real-app drive attached over CDP to another, real Atril because the port was taken, and read real data. Make it impossible, not careful: a dev Atril with ATRIL_CDP_PORT set must fail loudly if the port is busy (never silently skip or share), and the snapshot/drive helpers must verify they talk to the instance they launched (e.g. a per-launch token on window) before reading anything.
FIRST: this work was created from a stale local checkout, so run git fetch origin and reset this branch onto origin/main before anything (it has no commits yet).
New criterion ids: W320 and up. Tests first; all in English. Open the PR against main and do not merge it.

## The report (issue #13, reporter's words)

While several works ran at once, one agent launched its dev Atril to take photos, but its CDP port was already taken by the Atril driving the works, so its Playwright script attached to that one and read the real person's data (the Skills screen with the real catalog). It noticed, deleted the photo before committing and switched to its own port. Make it impossible rather than careful: a dev Atril should refuse to start CDP on a busy port (fail loudly), and the snapshot/drive helpers should verify they are talking to the instance they launched (e.g. a per-launch token exposed on window) before reading anything.

- Observed: with `ATRIL_CDP_PORT` busy, `app.commandLine.appendSwitch('remote-debugging-port', …)` in `src/main/index.ts` is silently ignored by Chromium; the dev app starts anyway and `connectOverCDP` lands on whichever Atril owns the port.
- Expected: the second app refuses to start (loud), and a driver can prove it is attached to the app it launched.
- Seen before, three times, as prose lessons only: `add-pr-qa-pictures` · 6, `skills-dense` · real app, `repo-harness` · real app. Prose did not hold; this change moves it into code.

Phase 2 writes the contract, the approach and the checklist below this line.
