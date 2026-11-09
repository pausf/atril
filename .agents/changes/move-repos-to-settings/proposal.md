Tracker: none

# move-repos-to-settings

## The ask, verbatim

Pau, 9 nov 2026:

> el diseño de erepos es raro

## The reading

Not a bug; a design change. Each registered repo fills the Trabajo sidebar with its name and
mode, a reason line, an Auto/Worktree/In-place switch and its own «+ trabajo» form, so a few
repos push the running work out of sight — and repos are configuration, touched once. Proposed
in `bocetos/repos.html`: Repos becomes a card in Ajustes (one row per repo: name, path, a mode
select whose reason is a tooltip, «Añadir repo…»); the sidebar keeps only «Trabajo en marcha»
under one «＋ Nuevo trabajo» that opens the own-task dialog with the text optional (text → the
Libretto flow; no text → plain Claude); with no repos, that dialog points to Ajustes → Repos.
