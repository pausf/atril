Targets: settings
Governs: src/main/credentials/** src/renderer/settings/**

# settings — pick the Jira board

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- The Jira card in Ajustes gains **Tablero**: a search field that lists the boards whose name
  matches, and the chosen one shown as "Tablero: <nombre>" with Cambiar.

## Scope boundaries

**In:** searching boards by name, picking one, remembering it. **Out:** several boards.

## Constraints

- `GET /rest/agile/1.0/board?name=<q>&maxResults=50`, in main, with the saved Jira creds.
- The board id and name are stored with the account metadata, never inside the token blob.

## Prior decisions

- **One board, picked by the person** — proposal.md decision log (assumed).

## Task breakdown

- Board search IPC and the Tablero field in the Jira card.

## Verification criteria

- **S9** When the person searches and picks a board in Ajustes, Atril shall store its id and
  name, and show it on the Jira card.
  Proof: src/renderer/settings/settings.test.ts picks a board and keeps it
- **S10** When the Jira token is replaced, Atril shall keep the picked board; when it is
  deleted, Atril shall forget the board too.
  Proof: src/main/credentials/store.test.ts board survives replacing the token and is forgotten on delete
