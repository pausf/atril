# net-errors · workspaces

Targets: workspaces

## Outcomes

- Una sola tabla en main traduce cada estado HTTP y cada causa de red de Jira, GitHub y GitLab a una frase con su arreglo.

## Scope boundaries

**In:** `src/main/net-problem.ts`. **Out:** quién la pinta (inbox, mr, settings).

## Constraints

- Ni números de estado ni nombres de excepción en la frase.

## Verification criteria

- **W150** When a request to Jira, GitHub or GitLab gets an HTTP error or throws, `net-problem` shall answer one sentence naming the service — 401: «{service} ha rechazado tu token.»; 403: «{service} no te deja ver esto con ese token.»; 404: «{service} no encuentra esa dirección.»; 429: «{service} pide esperar: demasiadas consultas.»; 500–599: «{service} está fallando ahora mismo.»; any other status: «{service} ha contestado algo que no esperaba.»; a thrown `ENOTFOUND` or `EAI_AGAIN`: «No encuentro {service}.»; a certificate code (as S32): «El certificado de {service} no es válido.»; a timeout: «{service} no ha respondido a tiempo.»; a `SyntaxError` (a body that is not JSON): «{service} ha contestado algo que no entiendo.»; anything else: «No llego a {service}: ¿hay conexión?» — with `detail` `HTTP <n>` or the code (from `err.cause.code` when it matches `^[A-Z0-9_]+$`, else the exception's name), and `fix: 'settings'` for 401, 403, 404, a host not found and a certificate code (the person fixes the token or the address), `fix: 'retry'` otherwise. No sentence contains a status number or an exception name.
  Proof: src/main/net-problem.test.ts each status and network cause has its sentence and fix (one case per row)
