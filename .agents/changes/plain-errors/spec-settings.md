# plain-errors · settings

Targets: settings

## Outcomes

- Conectar Jira con una dirección que no responde dice qué falló, sin el nombre de la excepción, con el código plegado en «Ver detalle».

## Scope boundaries

**In:** `src/main/credentials/check.ts`, `src/renderer/settings/Connection.tsx`, `src/renderer/settings/Ajustes.tsx`. **Out:** los errores de Forges.

## Constraints

- `err.message` nunca llega a la ventana; solo códigos de lista y el nombre de la excepción, en el detalle.

## Verification criteria

- **S32** If the Jira check's request throws (an HTTP status or a malformed address keep their own sentences), then Ajustes shall say what failed by cause — host not found (`ENOTFOUND`, `EAI_AGAIN`): «No encuentro {host}.»; a certificate code (starting `CERT_`, `ERR_TLS_`, `SELF_SIGNED`, `UNABLE_TO_`, `DEPTH_ZERO`): «El certificado de {host} no es válido.»; a timeout: «Jira no ha respondido en 10 s.»; anything else: «No responde nada en {origin}.» — each followed by «Revisa la dirección: la de tu Jira suele ser https://tuempresa.atlassian.net.», never with the exception name in the sentence, and under a folded «Ver detalle» the code read from `err.cause.code` when it matches `^[A-Z0-9_]+$`, else the exception's name.
  Proof: src/main/credentials/check.test.ts network failure names the cause and folds the code
  Proof: src/renderer/settings.test.ts jira error folds its detail

