Tracker: none
Queued: 2026-11-09

# translate-hook-prefixes

## The ask

Found by the work-reviewer of add-language (9 nov): the hook writes Atril's own words into activity
lines and notification bodies — «Claude dice: …», «Te pregunta: …», «Claude te necesita», «✗ …
falló» — and they stay Spanish in English mode, because those lines travel as they came (S17).

## The reading

Not a bug against the contract; a gap in it. The kind of each line is already stored (`says`,
`asks`, `fail`…), so the window and main can render the prefix in the current language from the
kind and keep only Claude's own words as `{detail}`.
