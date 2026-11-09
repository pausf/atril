Tracker: none
Targets: settings
Durable decisions: the ones in Prior decisions below

# translate-hook-prefixes

## The ask

Found by the work-reviewer of add-language (9 nov): the hook writes Atril's own words into activity
lines and notification bodies — «Claude dice: …», «Te pregunta: …», «Claude te necesita», «✗ …
falló» — and they stay Spanish in English mode, because those lines travel as they came (S17).

## The reading

Not a bug against the contract; a gap in it. The window and main recognise the hook's Spanish
prefix in the line's text and render it in the current language, keeping the rest as `{detail}`.

## Decision log

### Session 2026-11-09
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Se traduce al escribir o al mostrar? → A: al mostrar: el hook no sabe el idioma resuelto (eso es de main) y las líneas ya escritas también deben cambiar; un único `localiseActivity` lo usan la ventana y main (assumed).
- Q: ¿Qué no se toca? → A: lo que va detrás del prefijo: rutas, comandos, descripciones y las palabras de Claude, que viajan como `{detail}` (assumed).

- Q: (spec-reviewer) ¿Qué prefijos? → A: exactamente los que escribe `summarise.mjs`, listados en S27; se reconocen por el texto, no por el tipo (assumed).
- Q: (spec-reviewer) ¿Y una línea `✗` sin «falló» al final? → A: se queda como vino (assumed).

## Outcomes

- In English, activity lines and needs-you notifications read «Reading x.php», «Claude says: …»,
  «Asks you: …», «✗ phpunit failed» — Atril's words translated, what follows exactly as written.

## Scope boundaries

**In:** the prefixes `resources/summarise.mjs` writes. **Out:** changing what the hook writes to
disk; translating Claude's words.

**Never scoped out:** a line that matches no known prefix shows exactly as it came.

## Constraints

- Every key passes through a literal `t()` call (S16).

## Prior decisions

- **Found by add-language's review** (9 nov): S17 kept whole activity lines untranslated, which
  also kept Atril's own words Spanish. S17 is amended: what stays as written is Claude's part.

## Task breakdown

- `src/preload/activity-i18n.ts`: `localiseActivity(text, t)`; used by the activity feed, the
  workspace rows and main's notification body.

## Verification criteria

- **S17** (amended) While the language is English, texts Atril did not write — Claude's words and
  the path, command or description inside an activity line, a Jira title, a file name, the detail
  inside an error — shall be shown exactly as they came.
  Proof: src/renderer/settings/language.test.ts claude and jira text stay as written
- **S27** While the language is English, a line that is «Claude te necesita» or «Claude ha
  terminado», or starts with «Leyendo », «Editando », «Escribiendo », «Ejecutando », «Buscando »,
  «Lanzando un subagente: », «Te pregunta: », «Claude dice: » or «Le has escrito: », or has the
  shape «✗ … falló», shall show that part in English and the rest unchanged; any other line shall
  show as it came.
  Proof: src/preload/i18n.test.ts hook prefixes follow the language
- **S28** While the language is English, the activity feed, the workspace rows and main's
  needs-you notification body shall show the hook's lines through S27.
  Proof: src/renderer/settings/language.test.ts claude and jira text stay as written
  Proof: src/main/i18n.test.ts the notification body speaks the language

## Approach

### Summary

A pure `localiseActivity(text, t)` with one literal `t()` per prefix; the renderer passes `useT()`'s
`t`, main passes its own. No change to the hook or to the files it writes.

### Technical context

Files: `src/preload/activity-i18n.ts`, `src/renderer/flow/ActivityFeed.tsx`,
`src/renderer/components/WorkspaceList.tsx`, `src/main/status.ts`, the catalog, the tests.

### The approach

- Order: longest prefixes first; `✗ … falló` matched as a whole.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| The hook writes in the chosen language | it would need main's resolved language on disk, and old lines would stay in the old one |

### Risks

| Risk | What catches it |
|---|---|
| summarise.mjs gains a prefix later and nobody adds it here | the line still shows (in Spanish); S27's test lists every prefix summarise writes |

### Validation and rollback

S27 seen red first; S17's test amended to keep Claude's words. Rollback: one revert.

### Complexity deliberately kept

None.

## Checklist

- [ ] localiseActivity in the feed, the rows and the notification body · Closes: S17, S27, S28
