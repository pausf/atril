# net-errors · mr

Targets: mr

## Outcomes

- Con la forja caída o el token rechazado, la lista de MRs dice la causa con su botón y no enseña «Ninguna MR.».

## Scope boundaries

**In:** `src/main/forge/mrs.ts`, `src/renderer/mr/MrScreen.tsx`. **Out:** hilos, puntuaciones, lentes y comentarios en línea (solo toman la frase nueva).

## Constraints

- Ningún número de estado ni nombre de excepción en la frase.

## Verification criteria

- **M6** (amended) If one of a forge's requests fails, then the screen shall keep every MR that forge did return and the other forge's MRs, and show above the sections, per failed forge, its W150 problem with «No puedo enseñarte tus MRs de {forge}.» under it, its button («Volver a comprobar» loads again; «Abrir Ajustes» opens Ajustes) and the detail folded; while any forge failed, an empty section shows no «Ninguna MR.».
  Proof: src/main/forge/mrs.test.ts one forge failing keeps the other
  Proof: src/renderer/mr/mrscreen.test.ts a failed list shows its problem and no empty sections
- **M38** `statusText` and `networkText` shall return the W150 sentence, so a failure in threads, scores or line comments shows no status number nor exception name.
  Proof: src/main/forge/mrs.test.ts status and network texts carry no codes
