# redesign-connections

Tracker: none
Targets: settings
Durable decisions: the two in Prior decisions below

## The ask, verbatim

> GitLab / Para crear repos desde Atril. / Dirección https://gitlab.com / Token / Crear token en GitLab
> diseño feisimo

## Reading

Ajustes muestra GitHub y GitLab (y Jira) como formularios abiertos de ancho completo aunque no estén
conectados, con «Guardar y comprobar» gris que parece roto, un texto que se queda corto (la conexión
también trae las MR) y sin decir qué permisos pide el token.

## Diseño propuesto (assumed, 10 nov)

- Una sección «Conexiones» con una fila compacta por servicio: icono, nombre, estado
  («Sin conectar» / «Conectado como x · gitlab.com») y un botón «Conectar» o «Gestionar».
- «Conectar» despliega en la propia fila tres pasos numerados: 1 · Crear el token (abre la página con
  los permisos ya marcados y los nombra: `api`, `read_user`…), 2 · Pegar el token (y la dirección solo
  en GitLab, con gitlab.com por defecto), 3 · Comprobar, que se activa al pegar y dice qué ha visto.
- Para qué sirve, en una línea por servicio: «Tus MR, revisar y crear repos».
- Ajustes en dos columnas en pantallas anchas (Conexiones y Repos a la izquierda, Apariencia e Idioma a la derecha).

## Decision log

### Session 2026-11-10
- Q: ¿Cómo se ve? → A: una sección «Conexiones» con una fila compacta por servicio (Jira, GitHub, GitLab):
  nombre, para qué sirve en una línea, estado («Sin conectar» o «Conectado · cuenta · sitio») y un botón
  «Conectar» o «Gestionar» (assumed, del diseño encolado).
- Q: ¿El formulario? → A: solo al pulsar Conectar (o Reemplazar), dentro de la fila, en tres pasos
  numerados: 1 · Crear el token (abre la página con los permisos ya marcados y los nombra), 2 · Pegarlo
  (y dirección en GitLab y Jira), 3 · Comprobar y guardar (assumed).
- Q: ¿El botón gris que parecía roto? → A: «Comprobar y guardar» está siempre activo con estilo primario;
  si falta un campo, al pulsarlo dice cuál, junto al campo, sin llamar a nadie (assumed).
- Q: ¿Para qué sirve cada uno? → A: Jira «Tus tareas y empezar trabajos»; GitHub y GitLab «Tus MR, revisar y
  crear repos» (assumed: la conexión de forja también trae las MR).
- Q: ¿Dos columnas? → A: sí, desde 1100 px de ancho: Conexiones y Repos a la izquierda, Apariencia e Idioma
  a la derecha (assumed).

## Outcomes

- Ajustes abre con tres filas de conexión que se leen de un vistazo y no ocupan media pantalla.
- Conectar guía en tres pasos y dice qué permisos hacen falta; nada parece deshabilitado sin motivo.
- Gestionar enseña Reemplazar y Borrar (y el tablero en Jira) sin mostrar nunca el token (S5).
- En una ventana ancha, Ajustes usa dos columnas.

## Scope boundaries

**In:** la presentación de las tarjetas de Jira, GitHub y GitLab, sus textos y el layout de Ajustes.
**Out:** cómo se guardan o comprueban los tokens (S1–S4, S20 no cambian); nuevas forjas; OAuth.
**Never scoped out:** el token nunca se muestra (S3, S5); teclado y foco en las filas y formularios;
errores visibles junto al campo.

## Prior decisions

- Pau, 10 nov: «diseño feísimo» de la tarjeta de GitLab; diseño minimalista (memoria design-taste-minimal).
- Comprobar y guardar siempre activo, con el error junto al campo (assumed, 10 nov).

## Verification criteria

- **S29** While Ajustes is shown, a «Conexiones» section shall list Jira, GitHub and GitLab as rows, each
  with its name, its purpose line, its state («Sin conectar» or «Conectado · {cuenta} · {sitio}») and one
  button — «Conectar» when nothing is saved, «Gestionar» when it is — and no form until that button is
  pressed.
  Proof: src/renderer/settings/connections.test.ts connections read as rows with one button
- **S30** When the person presses Conectar (or Reemplazar), the row shall open three numbered steps — the
  create-token button naming the permissions (Jira: token de API; GitHub: `repo`; GitLab: `api`), the
  fields (GitLab and Jira also the address), and «Comprobar y guardar» — where «Comprobar y guardar» is
  never disabled for missing input and, if a field is empty, says which next to it without calling main.
  Proof: src/renderer/settings/connections.test.ts connect guides in three steps
- **S31** While the window is at least 1100 px wide, Ajustes shall lay out Conexiones and Repos in one
  column and Apariencia and Idioma in another.
  Proof: src/renderer/settings/connections.test.ts settings use two columns when wide

## Checklist

- [ ] the three connection rows with Conectar/Gestionar and the three-step form · Closes: S29, S30
- [ ] two columns when wide; sketch and photo · waits on box 1 · Closes: S31
