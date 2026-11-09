Tracker: none
Targets: settings
Durable decisions: the ones in Prior decisions below

# add-language

## The ask, verbatim

Pau, 9 nov 2026:

> Hazlo la versión en inglés, es decir, en ajustes que puedas elegir español o inglés. del sistema.

## The reading

Not a bug; new work. Atril's UI is Spanish only today. Ajustes gains a language choice —
Español, English, or «Sistema» (follow macOS, the default), like the theme choice (W35) — and
every visible string in the renderer, the app menu and the notifications comes from that
language. Libretto's own output (the agent's terminal) is out of reach: it is Claude's.

## Decision log

### Session 2026-11-09
- Q: «tu desarrollo todo sin parar … te dejo solo» stands → decisions taken with the recommended option, marked (assumed).
- Q: ¿Qué opciones? → A: Español, English y Sistema; Sistema por defecto, como el tema (assumed).
- Q: ¿Qué es «Sistema»? → A: el idioma preferido de macOS: español si empieza por `es`, inglés en cualquier otro caso (assumed).
- Q: ¿Qué se traduce? → A: todo lo que escribe Atril: ventana, menú, avisos del Mac y mensajes de error; nunca lo que no escribe Atril: la terminal, lo que dice Claude, títulos de Jira, nombres de archivo ni el contenido de los documentos (assumed).
- Q: ¿Hace falta reiniciar? → A: no: cambia al momento, menú incluido (assumed).
- Q: ¿Librería de i18n? → A: no: un diccionario español → inglés y una función `t()` con `{variables}`; el texto en español es la clave, así que nada se queda sin texto si falta una traducción (assumed).
- Q: (spec-reviewer) ¿Quién decide qué es «Sistema»? → A: main, con el idioma preferido de macOS; la ventana recibe el idioma ya resuelto, así ventana y menú nunca discrepan (assumed).
- Q: (spec-reviewer) ¿Qué guarda `ui.json`? → A: `language: 'system' | 'es' | 'en'`, por defecto `system`; lo inválido se descarta (assumed).
- Q: (spec-reviewer) ¿Qué cierra el «todo»? → A: un test que busca, fuera de los tests y del catálogo, literales con letras propias del español (á é í ó ú ñ ü ¿ ¡ «) que no pasen por `t()`; un texto sin tildes se le escapa: límite nombrado (assumed).
- Q: (spec-reviewer) ¿Un error de Atril con texto de git o Jira dentro? → A: se traduce lo de Atril y lo ajeno viaja intacto en `{detail}` (assumed).
- Q: (spec-reviewer) ¿Y los criterios que citan frases en español? → A: describen el texto en español; en inglés vale su entrada del catálogo (assumed).

## Outcomes

- Ajustes has an **Idioma** card: Español · English · Sistema. Choosing one switches the window,
  the app menu and new Mac notifications at once, and the choice survives restarts.
- What Atril did not write — the terminal, Claude's words, Jira titles, file names and contents —
  stays exactly as it came.

## Scope boundaries

**In:** the setting, the window's text, the menu, notifications, main's messages that reach the
window. **Out:** more languages, translating Jira or Claude, dates and numbers formatted per
locale beyond the time already shown, the sketches.

**Never scoped out:** a text with no English entry shows in Spanish rather than empty; the card is
keyboard-reachable like Apariencia.

## Constraints

- The setting lives in `ui.json` beside the theme (W35); no new dependency.
- Main owns the resolved language and the window takes it from main (`spec-workspaces.md`).
- Spanish stays the source of every text: it is the key.

## Prior decisions

- **English as well** — Pau, 9 nov: «Hazlo la versión en inglés, es decir, en ajustes que puedas
  elegir español o inglés. del sistema.»
- **Spanish text as the key** (assumed): no invented ids to keep in sync; a missing entry falls
  back to the Spanish it already has.

## Task breakdown

- `src/preload/i18n.ts` (shared by main and the window): `Lang`, `translate`, the English catalog.
- The setting in `ui.json`, its resolution (Sistema → macOS), the Idioma card.
- Every Atril text in the window and in main through `t()`.
- The menu rebuilt on change; notifications and main's messages in the current language.

## Verification criteria

- **S14** While Ajustes is shown, the Idioma card shall offer Español, English and Sistema, show
  the stored choice selected — Sistema when none was made — and store a new choice when picked.
  Proof: src/renderer/settings/language.test.ts language choice persists
- **S15** When the person picks English, the window shall show Atril's own texts in English at
  once — the rail, Trabajo, Tareas, Ajustes and the Nueva tarea dialog — without a restart.
  Proof: src/renderer/settings/language.test.ts the window switches language at once
- **S16** Every literal key passed to `t()` or `translate()` in `src/` shall have an English entry,
  no key shall be a template literal, and the catalog shall hold no entry that no call uses.
  Proof: src/preload/i18n.test.ts every text has its english
- **S17** While the language is English, texts Atril did not write — an activity line, a Jira
  title, a file name, the detail inside an error — shall be shown exactly as they came.
  Proof: src/renderer/settings/language.test.ts claude and jira text stay as written
- **S19** Outside tests and the catalog, no string literal or JSX text in `src/` containing á, é,
  í, ó, ú, ñ, ü, ¿, ¡ or « shall reach the person without going through `t()` or `translate()`.
  (Ceiling named: a Spanish text with none of these letters is caught only by S15's screens or by
  reading.)
  Proof: src/preload/i18n.test.ts no spanish text skips t

## Approach

### Summary

`src/preload/i18n.ts` exports `type Lang = 'es' | 'en'`, `type LangChoice = Lang | 'system'`,
`resolveLang(choice, systemLocale)` and `translate(lang, es, vars?)`; `src/preload/i18n-en.ts`
holds the catalog (Spanish → English). Main stores `language` in `ui.json`, resolves Sistema with
`app.getPreferredSystemLanguages()[0]`, keeps the result in `src/main/lang.ts` (`setLang`, `t`),
rebuilds the menu and answers `ui.get()` with the resolved `lang` beside the stored choice; the
window's `useT()` (from `UiProvider`) uses that `lang`. The extraction of every literal is
mechanical and comes after the mechanism is proven.

### Technical context

TypeScript, React 19, Electron. Files: `src/preload/{i18n,i18n-en}.ts` (+test),
`tsconfig.web.json` (include them), `src/preload/api.ts` (`UiState.language`), `src/main/{lang,
ui, menu, index}.ts` (+ `src/main/i18n.test.ts`), `src/renderer/ui.tsx` (`useT`),
`src/renderer/settings/Language.tsx` (+ `language.test.ts`), then every renderer component and
main module that returns text. Gates: typecheck, lint, test.

### The approach

- `translate`: `en` → `EN[es] ?? es`, then `{name}` replaced from `vars`.
- Sistema is resolved once, in main; the window never reads `navigator.language`.
- Main messages: modules call `t()` from `lang.ts` at the moment they build the message — module
  constants such as `REPLY_GONE` become functions; a message with foreign text puts it in
  `{detail}`, which `translate` never touches.
- On `atril:ui:set` with a `language`, main resolves it, calls `setLang`, rebuilds the menu and
  returns the new state with `lang`; the window re-renders from it.
- Tests: main's `lang` defaults to `es` until set; the mock answers `ui.get()` with
  `language: 'system'` and `lang: 'es'` (a Spanish Mac), so existing Spanish assertions stay valid.
- S16 and S19 scan `src/**/*.{ts,tsx}` except tests, `i18n-en.ts` and `mockApi.ts`.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| i18next / react-intl | a dependency and a key scheme for two languages and ~200 strings |
| Invented ids (`settings.title`) | two files to keep in sync per text; a missing id shows nothing |
| Translating Jira titles or Claude's output | not Atril's words; and it would need a model call |

### Risks

| Risk | What catches it |
|---|---|
| A text missed in the extraction stays Spanish in English mode | S16 catches every `t()` without English; a text never wrapped is caught only by reading — S15's screens catch the main ones |
| Interpolated texts built by concatenation | they become one `t()` with `{vars}` |

### Validation and rollback

S14–S18 seen red first; S16 is the gate that keeps the catalog honest later. Rollback: one revert.

### Complexity deliberately kept

- Two `t` entry points (window hook, main module) over one `translate`: main has no React.

## Checklist

- [ ] the language mechanism: translate, the setting in ui.json and its resolution in main, main's language and menu, the window's useT and the Idioma card · Closes: S14, W47, W48
- [ ] every Atril text in the window and in main through t() with its English · waits on box 1 · Closes: S15, S16, S17, S19
