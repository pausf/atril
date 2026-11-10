# fit-flow-panel

Tracker: none

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

## Pau, 10 nov, más tarde

- Cinco diseños alternativos en `bocetos/fase2-nucleo.html`; recomendado el 3 (Zen) con Archivos y
  «También» plegables.
- Pau: «vamos a probar el 3 en fase 2 … con el diseño 3 y con el diseño 1» → `bocetos/fase2-app.html`,
  la app entera con selector Zen / Partitura.
- Q: ¿Los dos en la app real con un ajuste? → A: «probar en el boceto». Se construye solo el elegido,
  con datos y presentación separados; la segunda vista y su ajuste, solo si se echa de menos.
