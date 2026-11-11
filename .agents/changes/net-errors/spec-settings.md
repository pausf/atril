# net-errors · settings

Targets: settings

## Outcomes

- Conectar GitHub o GitLab dice la causa sin el nombre de la excepción, con el código plegado, como Jira (S32).

## Scope boundaries

**In:** `src/main/credentials/forge.ts`, `src/renderer/settings/Forges.tsx`, `src/renderer/settings/Connection.tsx`. **Out:** Jira (ya hecho en S32).

## Constraints

- `err.message` nunca llega a la ventana.

## Verification criteria

- **S34** If checking a GitHub or GitLab token gets an HTTP error or throws, then Ajustes shall show the W150 sentence for that forge — with «No se ha guardado.» after it — and the code under a folded «Ver detalle», never an exception name in the sentence; no fix button shows in Ajustes, where «Guardar y comprobar» already checks again. Jira keeps S32.
  Proof: src/main/credentials/forge.test.ts a forge check failure names the cause and folds the code
