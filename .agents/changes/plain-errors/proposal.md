# plain-errors

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> Abre un agente nuevo. Y que ese agente nuevo compruebe la app y mire y vaya apuntando fallos, cosas de diseño que ve mal, etcétera, etcétera, y tú lo vas solventando.

Hallazgos 1, 2 y 24 de `bocetos/hallazgos.md` (11 nov): el pie dice «api.anthropic.com respondió 429» sin botón; el doctor espera para siempre a una herramienta colgada; Ajustes dice «No se ha podido conectar con Jira (TypeError).».

## Decision log

### Session 2026-11-11
- Q: (revisión en frío) ¿Y un 401 después de una lectura buena? → A: W37 manda: se quedan los últimos valores con su antigüedad (assumed).
- Q: (revisión en frío) ¿Qué errores de Jira son «no responde»? → A: solo los que lanza `fetch`; los estados HTTP y la dirección mal escrita conservan su frase; el tiempo agotado dice «Jira no ha respondido en 10 s.» (assumed).
- Q: ¿Cómo se ve un error en el pie, que es una sola línea? → A: la frase y un botón en la misma línea, y «Ver detalle» plegado al lado; sin la caja grande de `Problem` (assumed: si Pau quiere la caja, cabe encima del pie).
- Q: ¿Qué arregla un fallo del llavero o del token? → A: «Abrir Claude Code», que abre Terminal con `claude` (la persona inicia sesión ahí); el resto, «Volver a comprobar» (assumed).
- Q: ¿Cuánto espera el doctor? → A: 5 s por herramienta, como proponía el hallazgo 2 (assumed).

## Outcomes

- El pie nunca enseña un código HTTP ni un host como frase: dice qué pasa en castellano, trae su botón y el código va en «Ver detalle».
- Una herramienta que no contesta a su `--version` sale como «no responde» a los 5 s, con su botón de instalar, en vez de «Comprobando…» para siempre.
- Conectar Jira con una dirección que no responde dice qué falló (no encuentro la dirección, certificado, no responde) sin «TypeError», y el código va en «Ver detalle».

## Scope boundaries

**In:** `src/main/usage.ts`, `src/renderer/components/Footer.tsx`, `src/main/doctor.ts`, `src/main/credentials/check.ts` y donde Ajustes pinta su error (`Connection.tsx`, `Ajustes.tsx`), los tipos de `src/preload/api.ts`, la IPC `atril:usage:fix`.

**Out:** los errores de «Quitar», la terminal que no engancha y los trabajos parados (hallazgos 7, 8, 10, 11, 31): van en el siguiente cambio, con la fila del trabajo. Reintentos automáticos nuevos (W37 ya espacia los de la cuota). Los errores de Forges (GitHub/GitLab): ya dicen la causa.

## Constraints

- El token OAuth sigue sin salir de main (W18): la frase y el detalle son textos fijos o un número de estado.
- `err.message` de la red nunca llega a la ventana (puede llevar la petición); solo códigos de una lista (`ENOTFOUND`…) y el nombre de la excepción, en el detalle.
- Textos por `t()` con su entrada inglesa; colores por tokens.

## Prior decisions

- Un error de lectura que el usuario no puede leer como frase es un error suelto (regla de Pau, 11 nov, `bocetos/errores.html`): qué pasó, qué no puedes hacer, un botón, y el código plegado en «Ver detalle». Aquí se aplica al pie, al doctor y a Ajustes.

## Task breakdown

- La cuota: cada fallo con frase, arreglo y detalle; el pie lo pinta.
- El doctor: tiempo límite.
- Jira: frase por causa y detalle.

## Verification criteria

- **W20** (amended) If the usage cannot be read and there is no earlier good read, then the footer shall show one sentence per cause — no Claude Code session in the keychain or credentials unreadable, token rejected (401), too many requests (429), no network or no answer, any other status or an unreadable body — that names neither `api.anthropic.com` nor a status code; a button «Abrir Claude Code» for the keychain and token causes, which opens Terminal running `claude`, and «Volver a comprobar» for the rest, which reads the usage again; and the technical reason (the status code, or the failing step) only inside a folded «Ver detalle»; if opening Terminal fails, the footer shall show that reason in place of the sentence. After a good read, W37 holds for every cause: the last values stay with their age. The footer test asserts the text outside the `<details>` element, one case per cause in the main test.
  Proof: src/main/usage.test.ts each failure says what happened with its fix and detail apart
  Proof: src/renderer/footer.test.ts usage error shows its fix and folds the detail
- **W127** If a tool's version command has not finished after 5 s, then the doctor shall kill it and report that tool with the problem «no responde en 5 s» and its install command, and the other tools as they answered; the kill is the runner's `timeoutMs` (SIGKILL, code 124).
  Proof: src/main/doctor.test.ts a hung tool is reported after 5 s

## Approach

### Summary

Los tres sitios devuelven ya `{ error: string }`. Se añade `detail` (y en la cuota `fix`) al lado; la frase cambia a una por causa. La ventana pinta la frase, el botón y un `<details>` con el detalle.

### Technical context

TypeScript, vitest (jsdom en el renderer, `@testing-library/react`). Seis archivos de código y tres de test. Puertas: `pnpm -s typecheck`, `lint`, `test`.

### The approach

- `UsageResult` error pasa a `{ error: string; detail: string; fix: 'retry' | 'claude' }`. `readUsage` devuelve una frase por causa; `detail` lleva «HTTP 429», «llavero: código N», «sin red», etc. `createUsage` no cambia (W37 sigue mostrando el último bueno).
- IPC `atril:usage:fix` → `inTerminal('claude', run)`; «Volver a comprobar» llama a `usage.get()`, que ya relee.
- Footer: si error, `<span>{error}</span> <button className="link">{fix}</button> <details><summary>Ver detalle</summary><code>{detail}</code></details>`.
- Doctor: `run(tool, versionArgs, { timeoutMs: 5000 })`; código 124 → `t('no responde en 5 s')`.
- `checkJira` y `JiraSaveResult`: `{ error, detail? }`. `ConnectSteps` recibe `detail` y lo pliega bajo la frase. Ajustes guarda el detalle junto al error.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| La caja `Problem` en el pie | ocupa cuatro líneas en una barra de una; tapa la terminal |
| Mapear el error en la ventana a partir de la frase | la frase ya viene traducida; main sabe la causa |

### Risks

| Risk | Mitigation |
|---|---|
| Un `claude` lento de verdad (primer arranque) cae en 5 s | sale «no responde en 5 s» con su «Instalar»; el resto de la app sigue (W21) |
| El detalle filtra la petición | solo códigos de lista y estados numéricos; el test del token (W18) sigue en verde |

### Validation and rollback

Tests nuevos en rojo primero. `footer.test.ts` tiene que fallar con el pie de hoy (enseña el texto crudo). Un revert, nada migra.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] la cuota: frase, arreglo y detalle por causa, en main y en el pie, con la IPC del arreglo · Closes: W20
- [x] el doctor con tiempo límite · Closes: W127
- [x] Jira: frase por causa y detalle plegado en Ajustes · Closes: S32
