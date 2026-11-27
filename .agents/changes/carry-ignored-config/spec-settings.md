# carry-ignored-config · settings

Targets: settings

## Outcomes

In Ajustes → Repos each healthy repo row has a «Carried files» button. It opens a panel listing, one checkbox each, the repo's saved carry list (ticked) and the ignored files Atril suggests (unticked); ticking or unticking saves at once, and a field adds a typed path. A refusal says what happened and that nothing was saved.

## Scope boundaries

**In:** the button, the panel, its field and its `Problem` in `src/renderer/settings/Repos.tsx`; the mock in `src/renderer/mockApi.ts`; the panel's Spanish entries.
**Out (named):** reordering the list; editing an entry in place (untick and type); showing a file's size or contents; a panel for a broken repo.

**Never scoped out:** every control is a native, labelled checkbox, input or button, reachable by keyboard; the window never decides what is a valid path, main does (W480).

## Constraints

- The window sends ids and the list only; main answers the repos as listed or a refusal.
- Texts through `useT()`, Spanish entries in `i18n-es.ts`.

## Prior decisions

- (2026-11-27, carry-ignored-config) An unticked typed entry leaves the panel; a refusal keeps the typed text; a refusal's `Problem` has only «Close» (assumed, from the cold review). If wrong: only `Repos.tsx` changes.
- (2026-11-27, carry-ignored-config) Each change saves at once, no «Save» button (assumed: the mode select already saves on change). If wrong: only `Repos.tsx` changes.

## Task breakdown

- The button and the panel with its checkboxes and field.
- The refusal and the suggestion failure as a `Problem`.

## Verification criteria

- **W488** When the person presses «Carried files» on a healthy repo row, the card shall ask main for that repo's suggestions and show one labelled checkbox per path in the union of the saved list (ticked) and the suggestions (unticked), sorted, names only; ticking or unticking one shall send the whole new list to main and show the repos main answers; typing a path in «Add a file» and pressing «Add» (or Enter) shall send the list with that path added and empty the field; an unticked entry that is not a suggestion shall leave the panel; with nothing saved and nothing suggested it shall say «No ignored files found here. Type one to carry it.». One test holds every clause.
  Proof: src/renderer/settings/repos.test.ts the carried files of a repo are picked from suggestions or typed
- **W489** If main refuses the list or cannot list the suggestions, then the panel shall show a `Problem` with main's sentence, «Nothing was saved.» (for a refused list) or «The suggestions are not shown.» (for the listing), git's detail folded when there is one, and only a «Close» button (the panel itself is the fix); the checkboxes shall show the list as last saved and a typed path shall stay in the field. If `repos.json` is damaged, then the card shall show its S33 problem, as the mode select does. One test holds every clause.
  Proof: src/renderer/settings/repos.test.ts a refused carry list or suggestion failure says nothing was saved
