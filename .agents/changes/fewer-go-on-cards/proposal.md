# fewer-go-on-cards

Tracker: GitHub issue #7 (pausf/atril) — «Too many 'Finished its turn · Go on' cards». Type: bug (label `dogfood`).

## The ask, verbatim

> Fix GitHub issue #7 (pausf/atril): too many «Ha terminado su turno · Sigue» cards. Today every Claude Code Stop event becomes a needs-you turn-end wait (src/main/status.ts kindOfWait, the hook command in src/main/agent.ts), and the person has to press «Sigue» again and again. Goal: the person only sees a card when the agent really needs them.
>
> What to build:
> 1. Keep going on its own: when the agent tries to stop while its change in .agents/changes/<change>/proposal.md still has open boxes under ## Checklist, and it has no pending question or permission, the Stop hook answers {"decision":"block","reason":"..."} so Claude Code continues by itself. Respect stop_hook_active from the hook input so it never loops forever, and cap it (say 5 blocks in a row per session), after which it falls back to today's card.
> 2. A question written in prose (the last assistant message ends with a question to the person, e.g. «¿Hago push…?») shows as a question card, not a plain «Sigue».
> 3. A finished change (no open boxes, or the agent says it is done) shows as done, not "needs you".
> 4. The same turn end must not notify twice (seen twice in a row in the dev log).
>
> Constraints: no Claude calls from Atril to decide any of this (deterministic rules only); tests first; the hook stays a tiny shell command; update the flow-status/workspaces spec criteria through the Libretto flow. Out: changing Automático's 3-press limit beyond what item 1 needs.

## Observed vs expected (issue #7, reporter's words)

- Observed: every Claude Code Stop event becomes a needs-you `turn-end` card. Most are not a real wait: the agent stopped mid-task with open boxes; the agent asks in prose ("Shall I push?") so it shows as a turn end with a plain «Go on»; the same turn end is notified twice in a row (dev log, two works).
- Expected: a card only when the agent really needs the person.
- Out of this change: the agent waiting on its own background shell (issue #5).
