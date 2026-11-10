# redesign-connections

Tracker: none
Queued: 2026-11-10

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
