# fit-flow-panel

Tracker: none
Queued: 2026-11-09

## The ask, verbatim

> la barra de la derecha donde el flujo , cambios est con scroll, hay alguna manera de hacer que sea mas visible tda esa barra sin scroll

## Reading

El panel de Libretto (etapas, checklist, Cambios, Subagentes) no cabe y obliga a hacer scroll. Que
quepa a la vista: más compacto, secciones plegables o repartir el alto, sin perder nada.

## Diseño acordado (Pau, 10 nov: «si»)

1. Etapas en una sola fila: seis iconos unidos, la actual resaltada con su nombre debajo; las ya
   alcanzadas siguen abriendo Spec/Plan/Construir; nombre accesible en cada icono.
2. Checklist, Cambios, Otros cambios y Subagentes como `FoldSection` con su cuenta en la cabecera;
   «Otros cambios» plegado por defecto; el estado se recuerda.
3. Cambios con tope de 8 archivos y «+N más» que abre el modal del diff.

Descartado: Subagentes como pestaña (deja de verse de un vistazo). Orden: justo después de
add-doctor-install-terminal, antes de expand-tour (assumed: el «si» respondía a la propuesta).
