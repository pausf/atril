# skills-dense

Tracker: none
Targets: skills

## The ask, verbatim

> The Skills screen is confusing with many skills (Pau has 169: 153 on, 14 off, ~40 from plugins). Today each one is a big card, three per row, ~150 px tall, so the list is ~57 rows of scrolling, and every card repeats «Personal · Activa» badges that the group header and the filter already say. Make it scannable at 150+ items, keeping the minimal grey + one accent style:
> - A dense list instead of cards: one row per skill (name, one-line description, last used, on/off state), ~36 px, so a screen shows 20+ rows. Badges only when they add information (a clash, off, a plugin name).
> - Groups by origin (Personal, Project, each plugin) collapsible with their counts; plugins collapsed by default so a plugin's 40 skills do not drown the personal ones.
> - Sort: most recently used first by default, with name as the alternative.
> - The four tiles act as filters (click «Sin usar en 30 días» shows only those, click again clears).
> - Keyboard: ↑/↓ moves through rows, Enter opens the detail, / focuses search.
> Keep every existing feature (search, Todas/Activas/Apagadas, repo selector, detail, toggle, editor, plugins, usage). Skills criteria use K ids: continue after the last one. Tests first; drive it in the real app with a seeded catalog of 150+ example skills (no real names) before landing; UI texts through t() with Spanish in i18n-es.ts; all in English.

(Pau, 26 Nov 2026.) Not a bug: a change of how something built works. Checked: there is no `i18n-es.ts`; the Spanish text is the key passed to `t()` and the English lives in `src/preload/i18n-en.ts`.
