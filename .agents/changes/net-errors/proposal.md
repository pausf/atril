# net-errors

Tracker: none
Targets: work-inbox
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> busca todos lo posibles fallos es decir intentar cargarte la aplicacion para arreglar lo que fall

Hallazgos 19, 24, 25 y 27 de `bocetos/romper.md` y puntos 4–5 de la auditoría (`bocetos/hallazgos.md`): Jira con 403/404/500/429 dice siempre «ha rechazado el token»; un 401 dice «Conecta Jira en Ajustes» aunque ya está conectado; las MRs con la forja caída enseñan «GitLab ha respondido 500» y debajo «Ninguna MR.»; conectar GitLab enseña «(SyntaxError)», «(UND_ERR_SOCKET)» o «(TypeError)».

## Decision log

### Session 2026-11-11
- Q: (revisión en frío) ¿Quién gobierna `net-problem.ts`? → A: workspaces (`src/main/**`): su criterio es W150 en `spec-workspaces.md`; inbox, mr y settings lo citan.
- Q: (revisión en frío) ¿Una dirección que no existe o un certificado malo? → A: «Abrir Ajustes», porque la arregla la persona.
- Q: (revisión en frío) ¿Y la lista de MRs con una forja caída? → A: el problema de cada forja caída va encima de las secciones; cada sección enseña sus filas, y «Ninguna MR.» solo sale si ninguna forja falló (assumed).
- Q: (revisión en frío) ¿Y el Jira de Ajustes (S32)? → A: se queda como está; S34 es solo para GitHub y GitLab. En Ajustes no hay botón de arreglo: el formulario ya trae «Guardar y comprobar» (assumed).
- Q: ¿Una frase por servicio o una ayuda común? → A: una ayuda común en main (`src/main/net-problem.ts`) para Jira, GitHub y GitLab, con frase por estado y por causa de red (assumed).
- Q: ¿Qué botones? → A: «Volver a comprobar» para lo pasajero (429, 5xx, red) y «Abrir Ajustes» para lo que arregla la persona (401, 403, 404) (assumed).
- Q: ¿Y los hilos, puntuaciones y comentarios en línea, que también usan estas frases? → A: toman las frases nuevas (sin códigos), sin botón nuevo: van en el rediseño de la MR (assumed).
- Q: (constructor) ¿Qué código lleva un timeout? → A: el nombre de la excepción, `TimeoutError` (W150); `networkCode` deja de traducirlo a `timeout`, y `UND_ERR_CONNECT_TIMEOUT` también cuenta como timeout (assumed).
- Q: (constructor) ¿Y si falla el puente con main al leer Tareas? → A: «No llego a Jira: ¿hay conexión?» con «Volver a comprobar» y el nombre de la excepción en el detalle, nunca su mensaje (assumed).
- Q: (constructor) ¿Y un id de tablero no válido o una configuración sin columnas? → A: se quedan con su texto de antes tras «No puedo leer el tablero:», sin detalle; no son fallos de red (assumed).

## Outcomes

- Tareas y MR dicen qué falló de verdad (token, permiso, dirección, saturado, caído, sin red) con su botón y el código plegado.
- Con la lista de MRs fallida no sale «Ninguna MR.».
- Conectar GitHub o GitLab dice la causa sin nombres de excepción, como ya hace Jira (S32).

## Scope boundaries

**In:** `src/main/net-problem.ts` (nuevo), `src/main/jira/inbox.ts`, `src/main/forge/mrs.ts` (`statusText`, `networkText`, la lista), `src/main/credentials/forge.ts`, `src/renderer/inbox/Inbox.tsx`, `src/renderer/mr/MrScreen.tsx`, `src/renderer/settings/Forges.tsx` y `Connection.tsx`, i18n. **Out:** botones en hilos, puntuaciones, lentes y comentarios en línea (rediseño de la MR); el tablero de Jira en Libretto; GitHub contra un servidor propio.

## Constraints

- `err.message` nunca llega a la ventana; solo códigos de lista (`ENOTFOUND`…), el nombre de la excepción o `HTTP <n>`, y solo en el detalle.
- Los tokens no salen de main.

## Prior decisions

- Un fallo de red o de un servicio dice la causa por estado o por código, con «Volver a comprobar» si es pasajero y «Abrir Ajustes» si lo arregla la persona; el código, plegado.

## Verification criteria

- **I3** (amended) If no Jira token is saved, then the inbox shall show "Conecta Jira en Ajustes" with a link, and shall never ask for the token anywhere but Ajustes; a saved token the API rejects follows I29.
  Proof: src/renderer/inbox/inbox.test.ts inbox without a jira token links to ajustes
- **I18** (amended) If reading the picked board fails, then the inbox shall fall back to the status-category groups and show «No puedo leer el tablero: {W150 sentence}» with the W150 detail folded.
  Proof: src/main/jira/board.test.ts board failure falls back to the status groups
- **I29** While Jira is connected and reading the tasks fails (including a 401 or 403), Tareas shall show the W150 problem with «No puedo enseñarte tus tareas.» under it, its button («Volver a comprobar» reads again; «Abrir Ajustes» opens Ajustes) and the detail folded — never «Conecta Jira en Ajustes», which stays for Jira not connected.
  Proof: src/main/jira/inbox.test.ts a jira failure says its cause and fix
  Proof: src/renderer/inbox/inbox.test.ts a connected jira failure shows its problem and button

## Approach

### Summary

`netProblem(service, failure)` en un archivo nuevo; `jira/inbox.ts`, `forge/mrs.ts` y `credentials/forge.ts` lo usan. La ventana pinta `Problem` con dos arreglos posibles.

### Technical context

Main: `net-problem.ts`, `jira/inbox.ts`, `forge/mrs.ts`, `credentials/forge.ts`. Ventana: `Inbox.tsx`, `MrScreen.tsx`, `Forges.tsx`/`Connection.tsx` (el `detail` plegado ya existe para Jira, S32). Tipos en `src/preload/api.ts`. Tests: `net-problem.test.ts` (nuevo), `jira/inbox.test.ts`, `forge/mrs.test.ts`, `credentials/forge.test.ts`, `inbox/inbox.test.ts`, `mr/mrscreen.test.ts`, `settings/settings.test.ts`.

### The approach

- `netProblem(service: string, f: { status: number } | { error: unknown })` → `{ error, detail, fix }`.
- `statusText`/`networkText` en `mrs.ts` pasan a devolver la frase de `netProblem` (los que lanzan `Failure` siguen igual, sin código en la frase).
- La lista de MRs devuelve `{ error, detail, fix }` por forja; `MrScreen` lo pinta con `Problem` y no enseña «Ninguna MR.» con error.
- `InboxResult` con `error: 'failed'` gana `detail` y `fix`; `'unconfigured'` queda solo para Jira sin conectar.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Una frase por pantalla | tres copias que divergen; ya pasaba con «ha rechazado el token» |
| Reintentos automáticos | gastan cuota de la API de la persona sin que lo pida; «Volver a comprobar» es un clic |

### Risks

| Risk | Mitigation |
|---|---|
| Un 404 de una URL mal construida por Atril culpa a la persona | el detalle lleva `HTTP 404`; el test de la lista usa las URLs reales |

### Validation and rollback

Tests rojos primero; la app real con un servidor local que contesta 401, 403, 404, 429, 500 y cierra la conexión (Jira y GitLab apuntan a `https://127.0.0.1:<puerto>`). Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] `net-problem` con su tabla y su test · Closes: W150 (spec-workspaces.md)
- [x] Tareas con la causa y su botón · waits on box 1 · Closes: I29
- [x] la lista de MRs con su problema y sin «Ninguna MR.» · waits on box 1 · Closes: M38
- [x] conectar GitHub o GitLab con la causa plegada · waits on box 1 · Closes: S34
