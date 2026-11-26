# add-agent-harness-evals

Tracker: none
Kind: new work (not a bug)

## Ask (verbatim)

Add evals for the agent harness (idea from CodelyTV's "Agent Harness en 15 minutos"): a small, fixed set of tasks run N times against a throwaway sample repo, each run scored by deterministic checks (tests pass, the expected files exist, the Libretto artifacts are there: proposal with EARS criteria and Proof lines, tests written before code, gates green), so that a change in the Libretto skills, in CLAUDE.md or in the model can be compared as "x of N before vs y of N after".
It lives as a script plus fixtures under evals/ (not inside the app), runs claude headless with a chosen model, writes a JSON + Markdown report, and never runs by itself: only by hand (it spends quota; print the estimated number of runs and ask for confirmation unless --yes). Start with 3 tasks. To prove it works, run it once with 1 task × 2 runs on the cheapest model, and no more.
If you need spec criteria, put them in a new capability `evals` (create .agents/specs/evals/spec.md with its Governs line). All in English. Tests for the scoring logic first.
