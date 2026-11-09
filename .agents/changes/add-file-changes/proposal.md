Tracker: none
Queued: 2026-11-09

# add-file-changes

## The ask, verbatim

Pau, 9 nov 2026:

> tamoen molaria un seccion en flujo de libreto donde se pueda ver lo cambios de fichero ue se va haciendo sbes? ponlo en fase 1 para verlo

## The reading

Not a bug; new work. A «Cambios» section in the Libretto panel lists the files the workspace has
changed against its base commit (committed and uncommitted, as `git diff --numstat <base>` plus
untracked files), each with its status and +/− line counts, updated live while the agent works.
Clicking a file opens its diff, read-only, in the same large modal as the flow documents. Sketched
in `bocetos/fase1-nucleo.html`.

Pau, after the sketch: «los cambios se deberia ver en el momento de contruir no? y que se pueda
abrir en modal y ver los cambios» → the section shows from the Construir stage on, and
«Construir» itself becomes a button (like Spec and Plan) that opens the changes modal.
