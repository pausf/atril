Targets: workspaces
Governs: src/main/** src/preload/** src/renderer/ui.tsx

(A subset of the workspaces capability's own `Governs:`, which does not change.)

# workspaces — main speaks the chosen language

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- `ui.json` keeps the language choice beside the theme; main resolves it and owns the result for
  the menu, notifications, its messages and the window.

## Scope boundaries

**In:** storing, resolving, the menu rebuild, `t()` in main. **Out:** anything in the window.

## Constraints

- Same `ui.json` and `atril:ui:*` IPC as the theme (W35).

## Prior decisions

- **One source for Sistema** (assumed, proposal.md decision log): main.

## Task breakdown

- `ui.ts` stores and cleans `language`; `lang.ts` holds the resolved language; index.ts sets it at
  startup and on change and rebuilds the menu.

## Verification criteria

- **W47** The `language` in `ui.json` shall survive a restart when it is `system`, `es` or `en`,
  and shall read as `system` when missing or anything else.
  Proof: src/main/i18n.test.ts the language choice survives a restart
- **W48** When the language resolves to English — chosen, or Sistema on a Mac whose first
  preferred language does not start with `es` — main shall build the menu, the notification texts
  and its own messages in English, keeping any `{detail}` as it came.
  Proof: src/main/i18n.test.ts main speaks the chosen language
