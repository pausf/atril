# add-repo-by-path · settings

Targets: settings

## Verification criteria

- **W444** While the Repos card is shown and `repos.json` is readable, the card shall show beside «＋ Add repo…» a text field labelled «Path of a git repo» with the placeholder `~/code/my-repo` and a button «Add this path», disabled while the field is blank after trimming, and shall keep both visible while the id prompt (S12) or the picker's error line is showing; pressing the button or Enter in the field shall send the typed text to `repos.addPath`, and whenever a repo is registered — straight from `addPath` or after the id prompt (W446) — the list shall refresh and the field shall empty. While `repos.json` is damaged (S33) neither the field nor the button shall show. One test holds every clause.
  Proof: src/renderer/settings/repos.test.ts "a repo can be added by typing its path"
- **W445** When `repos.addPath` answers a `PathProblem`, the card shall show a `Problem` titled with its `what`, «Nothing was added.» under it, one button — «Choose a folder…» opening the same picker as «＋ Add repo…» for `fix: 'pick'`, «Install Xcode tools» running the git install for `fix: 'git'` — and `detail` folded under «Show detail»; the field shall keep its text; typing in it, a repo being registered, or starting an add by the picker shall remove the problem, and starting an add by the typed path shall remove the picker's error line; an answer for text that was edited after it was sent shall be dropped. One test holds every clause.
  Proof: src/renderer/settings/repos.test.ts "a typed path that cannot be added says what happened and offers one fix"
- **W446** When `repos.addPath` answers `id-taken`, the card shall ask for another id as S12 does and register the path main returned, never the text typed, with the id given; the proof makes main's path differ from the typed text.
  Proof: src/renderer/settings/repos.test.ts "a typed path whose id is taken asks for another and registers the resolved path"
- **W447** If `repos.addPath` answers a `StateProblem` (`repos.json` damaged, W148), then the card shall show S33's problem with its detail folded and «Show in Finder», and shall show neither the field nor the button.
  Proof: src/renderer/settings/repos.test.ts "a typed path while repos.json is damaged shows the damaged-file problem"
