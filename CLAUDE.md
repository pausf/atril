# Atril

App de Mac (Electron + TypeScript + React 19, pnpm) que lleva cada tarea de Jira por el flujo Libretto
con agentes de Claude Code en tmux, y gestiona MRs de GitHub/GitLab. Remoto PRIVADO
`github.com/pausf/atril` (identidad git `pausf`, correo noreply).

## Dónde lo dejamos (10 nov 2026) — empieza por aquí

Las ramas van apiladas: cada una sale de la anterior y `main` no se ha movido. La última es
**`skills-editor`** (24 nov: en Skills, «Editar» en el detalle de las personales y de proyecto —archivo entero, ⌘S, conflicto si cambió fuera, aviso de cabecera rota, salir con cambios pregunta, borrador en memoria— y «Nueva skill»; main solo toca rutas que él lista). Antes,
**`skills-toggle`** (23 nov: en Skills, «Estado» en el detalle y un interruptor «Activo» por plugin; escribe una sola clave en el archivo personal que decide —`~/.claude/settings.json` o el `settings.local.json` del repo—, nunca el `settings.json` del repo; «Lo fija …» si otro archivo manda; pregunta la primera vez; respeta enlaces simbólicos). Antes,
**`skills-list`** (20 nov: pantalla «Skills» en el rail y ⌘K: skills, comandos y plugins de Claude Code por origen —Personal, Proyecto, Plugins, Atril— con estado, choques, ~tokens, búsqueda, filtros y detalle; solo lectura, sin gastar cuota). Antes,
**`mr-page-wide`** (20 nov: la página de MR a todo el ancho, sin bandeja; «‹ Tus MR · 2 de 5 · J/K», J/K cambian de MR, ↑/↓ desplazan; tarjetas a 300 px; al volver, la fila marcada y con foco). Antes,
**`harness-ladder`** (20 nov: escalera de corrección: `pnpm lint` falla si renderer y main se importan, si se monta `window.atril` fuera de `mockApi()` o si se usa `homedir()` fuera de `paths.ts`; hook `.githooks/pre-commit` con typecheck y lint, ~5 s). Antes,
**`refine-request`** (20 nov: «Afinar la petición · opcional» en Nueva tarea y Nuevo trabajo: cuatro preguntas fijas y «Que Claude me pregunte» con Haiku solo al pulsar; las respuestas viajan pegadas a la petición; sin probar con Claude real). Antes,
**`mr-page`** (19 nov: la MR se abre como página junto a la bandeja, con código y sus hilos, Conversación, «Revisar ▾», tarjetas a la derecha y «Fusionar» con confirmación; sin probar contra forjas reales: fusionar y los campos de GitLab). Antes,
**`terminal-read-only`** (14 nov: terminal de solo lectura, una tarjeta por tipo de espera —pregunta, permiso, fin de turno—, «Escribe al agente», Automático sigue solo hasta 3 veces, rama grande con «Separar»/«Dejarla así»; sin probar con Claude real: dígito + Enter en el selector y «Permitir» = 1). Antes,
**`notify-ui`** (14 nov: tarjetas «Notificaciones» y «Cuándo» en Ajustes, pantalla Avisos con los tipos nuevos). Antes,
**`notify-core`** (12 nov: avisos con nombre del trabajo, tipos nuevos, uno sin leer por trabajo, agrupar, foco y horas de silencio en main; `notify-ui` sigue). Antes,
**`plain-errors`** (11 nov: cuota, herramientas y Jira con frase, botón y «Ver detalle»; hallazgos 1, 2 y 24). Antes, **`qa-targets`**, aterrizada y subida el 11 nov (QA: pestañas por plataforma con su porqué, `.atril/qa.json` y «Elegir a mano», un emulador o simulador reservado por trabajo, errores con su arreglo). Antes, `qa-screen`, `subagent-branches` y `panel-c`. **Siguiente: arreglar los 42 hallazgos de la vuelta por la app** (`hallazgos` del 11 nov, copia en `bocetos/hallazgos.md`), de grave a leve. Ideas para después: `bocetos/ideas.html` (120, con ★ las favoritas; 51–120 añadidas el 11 nov).

1. Hechos el 10 nov: `add-subagents-view`, `add-subagent-detail` `add-doctor-install-terminal`, `restyle-mode-picker`, `fit-flow-panel`, `show-doc-buttons`, `adopt-grafito`, `expand-tour` y `redesign-connections`.
   Bocetos fase 2: `bocetos/fase2-nucleo.html` (6 diseños del panel; Pau eligió el 0) y `bocetos/fase2-app.html` (4 variantes minimalistas; Pau eligió Grafito, ya en la app como segunda paleta).
2. **Objetivo (Pau, 10 nov): mejorar la idea, no cambiarla** (flujo Libretto, puntuaciones, borradores…),
   para que una persona lleve **3 tareas a la vez sin perder el foco**. Hecho el 10–11 nov: CI, respuestas
   rápidas, foco, Todos, QA en vivo, pausa, abrir MR, coste, comentarios en línea, historial, primeros pasos. Cola: Libretto entero dentro de Atril (Pau, 11 nov): panel derecho con código en vivo (pasos como seis tramos con nombre encima del título del trabajo, la C de `bocetos/pasos-arriba.html`; QA como pantalla propia (la A de `bocetos/qa-propuestas.html`: informe por criterio, cada uno Pasa/Falla/Sin probar con su captura, «Ver cómo», «Marcar como bug» y «Reprobar»; iOS con el MCP oficial de Apple `xcrun mcpbridge` (Xcode 26.3+), simctl si hace falta tocar; Android con el emulador del SDK de la persona por `emulator`/`adb` oficiales, vía mobile-mcp; web Chrome con Playwright y Safari con su MCP de WebKit; detección W83 mejorada: dice por qué, varias plataformas como pestañas recordadas por repo, monorepos a 2 niveles, «Elegir a mano» guardado por repo y opcional `.atril/qa.json`, y «No sé cómo abrir este proyecto» si no hay nada; un simulador o emulador por trabajo, reservado hasta que se libera, como Simlock, para llevar 3 QA a la vez sin pisarse), preguntas en un globo desde la fila (la 8 de `bocetos/preguntas.html`), con su porqué y la recomendada marcada, y la fila con borde ámbar y «Te pregunta algo · Responder ›» (la 1 de `bocetos/aviso-pregunta.html`); propuesta C de `bocetos/panel-derecho.html`; pasos: la 2 de `bocetos/pasos.html`; subagentes: la 2 de `bocetos/subagentes.html`, ramas con la última acción al pasar el ratón; «⤢ Ampliar» / ⌘⇧D lleva el código al centro en grande), `agent-suggestions` (borrador en el scratchpad: aviso que se cierra solo), `converge` y `retro`; MRs mejor (Pau: «has todo», `bocetos/mr-mejoras.html`): señales gratis y riesgo a ojo en la lista, un solo «Revisar» con niveles Rápida / Con lentes / A fondo, la nota con razones y escala fija (como 540, newsletter #15: la IA solo detecta el tipo de MR y las reglas rotas con su evidencia; un script determinista parte de 100 y resta el peso de cada regla según el tipo; los pesos se ajustan con lo que la gente responde a los comentarios; la persona decide), revisar contra su spec, puntuar varias a la vez bajo demanda; página de MRs: al abrir una MR, la F de `bocetos/mr-pagina.html` (código con sus hilos, puntuación y spec a la derecha); la bandeja, la E2 (secciones como GitHub/Graphite, sin luces); después las ★ de `bocetos/ideas.html` (1–50, luego 51–120). **Al acabar (Pau, 11 nov): QA de Atril de punta a punta** — yo, en la app real con Playwright: todas las pantallas, emuladores (Android de su SDK, iOS con `mcpbridge`, Chrome), Libretto completo en un repo de prueba, forjas y Jira con servidores falsos (errores incluidos); Pau, con sus cuentas: `bocetos/qa-final.html`, una lista guiada con lo esperado y una casilla por paso (sale de «Sin probar»). Cada función se prueba manejando la app real (Playwright) antes de aterrizar.
   Los cuelgues de tests de tmux/git eran contención: arreglado con `maxWorkers: 4` (ver lessons).
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
- Publicar un borrador en su línea contra un GitHub/GitLab real.
- «Empezar» en la pantalla Libretto: que Claude Code tome `/libretto:write-spec <nombre>` como primer mensaje y siga el flujo.
- «Pasar a Jira» desde Libretto contra un Jira real (tipo Task, proyecto del tablero).
- QA en vivo: que el agente de QA real escriba `report.json` por criterio (solo probado con un informe sembrado).
- `pnpm dist` y abrir el `.dmg` instalado: la lista de `bocetos/instalar.html` §4 (la sesión no construye).
- `openmr.test.ts` y `pause.test.ts` fallan a veces en la suite completa por tiempo de git bajo carga (pasa solo): mirarlo en la ronda de QA.
- Que Esc pause a Claude sin eventos sueltos y que «Sigue donde lo dejaste.» se tome como mensaje nuevo.
- La página de la MR contra forjas reales: «Fusionar» de verdad en GitHub (squash) y en GitLab (sin parámetros), los campos de M39 en una MR real de GitLab (`detailed_merge_status`, `has_conflicts`, `target_branch`; GitHub ya comprobado), los revisores de GitLab y los hilos del lado viejo (`bocetos/qa-final.html`).
- La revisión por lentes leyendo la petición de verdad (M49): que Claude tome la descripción como contexto y no como órdenes.

## Cómo se trabaja aquí

- **Solo el flujo Libretto**, por cambio:
  - El contrato va en `.agents/changes/<cambio>/proposal.md`. Lleva Decision log, criterios EARS con `Proof:`, Approach y Checklist; las deltas de otras capacidades van en `spec-<cap>.md`.
  - Antes de construir, un spec-reviewer en frío.
  - El constructor escribe primero los tests en rojo.
  - Después, el work-reviewer en frío, los arreglos y las lecciones.
  - Por último, aterrizar.
- **Autonomía (Pau):** sigue sin preguntar. Toma la opción recomendada y apúntala con `(assumed)`. Push solo a pausf/atril.
- **Specs vivas** en `.agents/specs/{workspaces,work-inbox,flow-status,settings,mr,avisos}/spec.md`. Léelas antes de tocar código.
- **Puertas:** `pnpm -s typecheck`, `pnpm -s lint` y `pnpm -s test`, todas antes de cada commit, con un `if` que no deje commitear en rojo. El hook `.githooks/pre-commit` ya corre typecheck y lint (`pnpm run prepare` lo activa). **Nunca `pnpm build`.**
- **Comandos:** rg/fd/eza/bat, no grep/find/ls/cat.
- **Commits:** convencionales, sin `Co-Authored-By` ni atribución a IA.
- **Antes de cada push**, escanea identificadores de trabajo reales con
  `git grep -niE -f ~/.config/atril/work-identifiers.txt HEAD`.
  La lista vive fuera del repo a propósito: nunca la copies aquí. Debe salir vacío; un hash `integrity`
  de `pnpm-lock.yaml` coincide por azar (11 nov): esa línea no cuenta. Usa nombres de
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
- **Pruebas con un `claude` falso (11 nov):** desde `login-path`, Atril pone el PATH de tu shell de login *delante*: un `claude` falso solo en `PATH` pierde y arranca el real (gasta cuota). Lanza la app con `SHELL` apuntando a un shell falso que, con `-ilc`, antepone la carpeta de los dobles al PATH.
- **Capturas (11 nov):** nunca `screencapture` de la pantalla entera (salen las ventanas personales de Pau). Solo la ventana de Atril: `page.screenshot` por CDP, o `screencapture -l <windowid>`.
- **Errores (Pau, 11 nov):** ningún error suelto («error 500», «algo fue mal»). Cada fallo dice qué pasó, qué no puedes hacer por eso y trae un botón que lo arregla (Terminal con el comando, página del token, Ajustes, «Volver a comprobar»); el código técnico solo en «Ver detalle», plegado. Catálogo en `bocetos/errores.html`.
- **Textos:** todos pasan por `t()`/`useT()` y llevan su entrada en inglés en `src/preload/i18n-en.ts`. Los escaneos S16/S19 lo comprueban.
- **Colores** solo como tokens en `:root` y `[data-theme='dark']`.
- **Aterrizar:** `python3 scripts/land.py <cambio> "<Etiqueta>"`. Aplica `proposal.md` sobre su
  capacidad `Targets:` y cada `spec-<cap>.md` sobre `<cap>`. Los criterios `(amended)` sustituyen al
  existente. Luego, en el mismo commit: `git rm -r .agents/changes/<cambio>`, `libretto wiki` y
  `libretto land`.
- **Lecciones de los revisores** en `.agents/lessons.md`. Léelas: son los errores que ya se pagaron.
