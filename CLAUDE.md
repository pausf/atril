# Atril

App de Mac (Electron + TypeScript + React 19, pnpm) que lleva cada tarea de Jira por el flujo Libretto
con agentes de Claude Code en tmux, y gestiona MRs de GitHub/GitLab. Remoto PRIVADO
`github.com/pausf/atril` (identidad git `pausf`, correo noreply).

## Dónde lo dejamos (10 nov 2026) — empieza por aquí

Las ramas van apiladas: cada una sale de la anterior y `main` no se ha movido. La última es
**`cost-per-work`**, aterrizada y subida el 10 nov (coste estimado a precio de API por trabajo). Ideas para después: `bocetos/ideas.html` (50, con ★ las favoritas).

1. Hechos el 10 nov: `add-subagents-view`, `add-subagent-detail` `add-doctor-install-terminal`, `restyle-mode-picker`, `fit-flow-panel`, `show-doc-buttons`, `adopt-grafito`, `expand-tour` y `redesign-connections`.
   Bocetos fase 2: `bocetos/fase2-nucleo.html` (6 diseños del panel; Pau eligió el 0) y `bocetos/fase2-app.html` (4 variantes minimalistas; Pau eligió Grafito, ya en la app como segunda paleta).
2. **Objetivo (Pau, 10 nov): mejorar la idea, no cambiarla** (flujo Libretto, puntuaciones, borradores…),
   para que una persona lleve **3 tareas a la vez sin perder el foco**. Orden de la cola (en
   `.agents/changes/`), elegido por eso: `add-qa-lab` (en curso; borrador en el scratchpad) (QA en vivo: Chrome, emuladores) → `pause-agent` → `open-work-from-mr` → `cost-per-work` → `mr-line-comments` →
   `work-history` → `first-run-setup` → `package-and-sign`. Los cuelgues de tests de tmux/git eran
   contención: arreglado con `maxWorkers: 4` (ver lessons).
3. Después, la lista de mejoras que se le dio a Pau el 9 nov. Ve una por una con el flujo Libretto:
   - Estado de la CI en la fila de la MR, y «Arreglar CI con Claude».
   - Abrir un trabajo desde una MR.
   - Coste y cuota por trabajo.
   - Historial de trabajos terminados.
   - Mover la tarea de Jira al abrir la MR.
   - Comentarios en la línea exacta.
   - Filtros en Tareas.
   - Modo foco.
   - Pausar un agente.
   - Plantillas de tarea.
   - Respuestas rápidas al agente.
   - Exportar el informe de un trabajo.

Sin probar con datos reales (necesita a Pau):
- Conectar la forja y ver MRs reales.
- Una puntuación real.
- Los borradores de Libretto en una MR real.
- El modo automático preguntando antes del push.
- El tablero de Jira.
- Responder desde un aviso del Mac.
- Que el selector de opciones de Claude Code acepte el número tecleado (respuestas rápidas).
- La QA en vivo con un Claude, un navegador y un emulador reales (solo probada con dobles).
- Que Esc pause a Claude sin eventos sueltos y que «Sigue donde lo dejaste.» se tome como mensaje nuevo.

## Cómo se trabaja aquí

- **Solo el flujo Libretto**, por cambio:
  - El contrato va en `.agents/changes/<cambio>/proposal.md`. Lleva Decision log, criterios EARS con `Proof:`, Approach y Checklist; las deltas de otras capacidades van en `spec-<cap>.md`.
  - Antes de construir, un spec-reviewer en frío.
  - El constructor escribe primero los tests en rojo.
  - Después, el work-reviewer en frío, los arreglos y las lecciones.
  - Por último, aterrizar.
- **Autonomía (Pau):** sigue sin preguntar. Toma la opción recomendada y apúntala con `(assumed)`. Push solo a pausf/atril.
- **Specs vivas** en `.agents/specs/{workspaces,work-inbox,flow-status,settings,mr,avisos}/spec.md`. Léelas antes de tocar código.
- **Puertas:** `pnpm -s typecheck`, `pnpm -s lint` y `pnpm -s test`, todas antes de cada commit, con un `if` que no deje commitear en rojo. **Nunca `pnpm build`.**
- **Comandos:** rg/fd/eza/bat, no grep/find/ls/cat.
- **Commits:** convencionales, sin `Co-Authored-By` ni atribución a IA.
- **Antes de cada push**, escanea identificadores de trabajo reales con
  `git grep -niE -f ~/.config/atril/work-identifiers.txt HEAD`.
  La lista vive fuera del repo a propósito: nunca la copies aquí. Debe salir vacío. Usa nombres de
  ejemplo (shop-web, WEB, SHOP, PF, OPS, acme).
- **Nunca** una carpeta llamada `secrets` (hay una regla de denegación global), ni leer `~/.atril/secrets.bin`. Los tokens solo viven en main.
- **No tocar:** los repos reales de Pau, sus sesiones de tmux por defecto ni `~/.claude.json`. Los tests usan su propio socket de tmux y un `ATRIL_HOME` temporal.
- **Cuota:** Pau cuida su cuota de Claude. Nada de llamadas automáticas a Claude: solo bajo demanda. Subagentes acotados, en Sonnet para lo mecánico, nunca Fable.
- **Cada función que aterriza** actualiza:
  - `bocetos/novedades.html`: sección, foto real en `bocetos/novedades/*.png` e historial;
  - `bocetos/fase1-nucleo.html` (el boceto).
- **Fotos de la app real** (solo en dev):
  ```
  ATRIL_HOME=$(mktemp -d) ATRIL_SNAPSHOT=$PWD/bocetos/novedades/x.png ATRIL_SNAPSHOT_VIEW=<vista> ATRIL_SNAPSHOT_DELAY_MS=6000 pnpm -s dev
  ```
  Lánzalo en segundo plano, espera a que exista el PNG y luego `pkill -f "electron-vite dev"`.
- **Textos:** todos pasan por `t()`/`useT()` y llevan su entrada en inglés en `src/preload/i18n-en.ts`. Los escaneos S16/S19 lo comprueban.
- **Colores** solo como tokens en `:root` y `[data-theme='dark']`.
- **Aterrizar:** `python3 scripts/land.py <cambio> "<Etiqueta>"`. Aplica `proposal.md` sobre su
  capacidad `Targets:` y cada `spec-<cap>.md` sobre `<cap>`. Los criterios `(amended)` sustituyen al
  existente. Luego, en el mismo commit: `git rm -r .agents/changes/<cambio>`, `libretto wiki` y
  `libretto land`.
- **Lecciones de los revisores** en `.agents/lessons.md`. Léelas: son los errores que ya se pagaron.
