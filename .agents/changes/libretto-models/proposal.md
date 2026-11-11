# libretto-models

Tracker: none
Targets: workspaces
Durable decisions: the one in Prior decisions below

## The ask, verbatim

> https://claude.dev/blog/which-claude-model-should-you-build-with/ podemos utilzar esto de alguna manera?
> haz todas

Del artículo: «Keep small models on work where a mistake is cheap to spot… Keep code edits and judgment calls on the main model»; tareas de agente repetidas (revisar, investigar) → Sonnet 5.5 `medium`.

## Decision log

### Session 2026-11-11
- Q: (revisión en frío) ¿Qué es «ya tiene modelo»? → A: una línea del frontmatter que empieza por `model:`; un agente de la lista sin frontmatter (`---` al principio) se deja igual (assumed).
- Q: (revisión en frío) ¿Cómo se reescribe la copia actual? → A: aplicando `pinModels` a `resources/libretto/agents/*.md` tal como están, sin re-empaquetar desde el repo de Libretto: la versión copiada sigue siendo `171db90`.
- Q: (revisión en frío) ¿Y la spec que dice que la copia es `171db90`? → A: pasa a decir «`171db90` más las líneas `model:` de Atril».
- Q: ¿Dónde se fija el modelo de los subagentes de Libretto? → A: al empaquetar Libretto dentro de Atril (`scripts/bundle-libretto.mjs`), no en la copia a mano: la copia se regenera y perdería el cambio (assumed).
- Q: ¿Cuáles? → A: los que leen y opinan sin editar código — `converge-reader`, `review-lens-reliability`, `review-lens-security`, `spec-reviewer`, `work-reviewer` — pasan a `sonnet`; los que ya traen modelo de Libretto lo conservan (`review-lens-design: sonnet`, `review-lens-intent` y `review-lens-tests: haiku`); `spec-writer` escribe el contrato y se queda en el modelo de la sesión (assumed).

## Outcomes

- Las revisiones de Libretto que lanzan los agentes de Atril corren en Sonnet: la mitad de precio que Opus, como recomienda el artículo para tareas repetidas.

## Scope boundaries

**In:** `scripts/bundle-libretto.mjs`, una función `pinModels` en `scripts/libretto-models.mjs` con su test, y la copia `resources/libretto/agents/*.md` reescrita con esa función. **Out:** cambiar Libretto en su propio repo; elegir modelo por tarea en tiempo de ejecución; medir modelos con tareas reales.

## Constraints

- No se toca el contenido de los agentes salvo la línea `model:` del frontmatter.
- La versión de Libretto copiada no cambia (no se re-empaqueta desde otra referencia).

## Prior decisions

- Atril fija el modelo de los subagentes de Libretto que solo leen y opinan; un modelo que trae Libretto manda. La copia en `resources/libretto/` es Libretto `171db90` más esas líneas `model:`; nada más difiere.

## Verification criteria

- **W151** When Libretto is bundled, every agent whose file name (without `.md`) is in Atril's list (`converge-reader`, `review-lens-reliability`, `review-lens-security`, `spec-reviewer`, `work-reviewer`) and whose leading `---` frontmatter has no line starting with `model:` shall get `model: sonnet` as the frontmatter's last line; an agent that has one keeps it.
  Proof: scripts/libretto-models.test.ts reviewers get sonnet unless libretto chose
- **W153** Any agent outside the list, or without a leading frontmatter, shall be left byte-for-byte as it was, and running the function a second time shall change nothing.
  Proof: scripts/libretto-models.test.ts other agents and a second run change nothing
- **W152** The committed copy in `resources/libretto/agents/` shall be that function's output over the `171db90` copy: the five listed agents carry `model: sonnet`, `review-lens-design` keeps `sonnet`, `review-lens-intent` and `review-lens-tests` keep `haiku`, and `spec-writer` has no `model:` line — read from the files themselves.
  Proof: src/main/packaging.test.ts bundled reviewers run on sonnet

## Approach

### Summary

Una función pura sobre el texto del agente; el script la aplica a la carpeta preparada antes de copiar; la copia actual se reescribe una vez con la misma función.

### Technical context

Node ESM en `scripts/`, vitest recoge `scripts/*.test.ts`. `packaging.test.ts` ya comprueba la copia de Libretto.

### The approach

`pinModels(text, name)` busca el bloque `---…---` inicial; si `name` está en la lista y no hay `^model:`, añade `model: sonnet` antes del `---` de cierre. `bundle-libretto.mjs` la aplica a `stage/agents/*.md` antes de copiar (sin test propio: el script lee el repo real de Libretto; lo cubre la función y la copia). La copia de hoy se reescribe una vez con `node -e` llamando a `pinModels` sobre cada archivo.

### The alternatives it beat

| Considered | Why it lost |
|---|---|
| Editar `resources/libretto` a mano | el siguiente empaquetado lo borra |
| `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` al lanzar el agente | también movería subagentes que editan código |
| Haiku para todos los revisores | el artículo reserva Haiku para lo que se comprueba barato (buscar, leer logs); revisar es juicio |

### Risks

| Risk | Mitigation |
|---|---|
| Una revisión en Sonnet se le escapa algo que Opus vería | el artículo: subir el esfuerzo antes de cambiar de modelo; si se ve en la práctica, se quita de la lista |

### Validation and rollback

Test de la función y de la copia. Un revert.

### Complexity deliberately kept

Ninguna.

## Checklist

- [x] `pinModels` con sus tests y el script que la usa · Closes: W151, W153
- [x] la copia actual reescrita y comprobada · Closes: W152
