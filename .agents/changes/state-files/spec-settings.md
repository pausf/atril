# state-files · settings

Targets: settings

## Outcomes

- Con `repos.json` dañado, Ajustes → Repos dice cuál y qué no puedes hacer, con «Mostrar en Finder», en vez de «Aún no hay ninguno».

## Scope boundaries

**In:** `src/renderer/settings/Repos.tsx`. **Out:** reparar el archivo.

## Constraints

- La ventana pide mostrar el archivo por nombre, nunca por ruta.

## Verification criteria

- **S33** While `repos.json` is damaged (W148), the Repos card shall show «No puedo leer repos.json: está dañado. No puedo usar ni cambiar tus repos hasta que se arregle.» with its detail folded and «Mostrar en Finder», and shall not show «Aún no hay ninguno» nor «Añadir repo…».
  Proof: src/renderer/statefiles.test.ts the repos card shows a damaged list instead of empty
