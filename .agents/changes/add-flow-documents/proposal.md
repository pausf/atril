Tracker: none

# add-flow-documents

## The ask, verbatim

Pau, 9 nov 2026:

> O es la spec o es el plan, si tú le das al libreto y le das encima del spec o del plan, que puedas ver lo que ha escrito la IA, ¿sabes? O si, por ejemplo, el plan lo ves bien y puedas modificarlo antes de que tire al siguiente, cosas de esas, ¿sabes?

## The reading

Not a bug; new work. In the Libretto panel, clicking a stage (spec, plan, checklist) opens what
the agent wrote — the change's `proposal.md` sections (contract, `## Approach`, `## Checklist`)
and any `spec-*.md` beside it — read from that workspace's worktree, which the panel already
watches. Editing is allowed while the agent waits for the person (needs-you), which is when
Libretto stops before code: the person changes the document, saves, and the agent reads the
saved file when it continues. While the agent is working the document is read-only, so the
two never write the same file at once.
