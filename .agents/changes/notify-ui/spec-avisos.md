# notify-ui — avisos

Targets: avisos

The Avisos screen's side of the new notice kinds.

## Verification criteria

- **V6** (amended) Opening a notice shall mark it read and: for `review`, `comment`, `ci`, `cipass`, `following` and `opened`, open its MR view when the MR is in the latest listing, otherwise say «Esta MR ya no está en la lista»; for `merged`, `closed` and `gone`, open the MR in its forge; for `ask`, `done`, `idle`, `stopped`, `qa`, `radar` and the stored legacy `agent`, open its workspace (for `qa`, its QA screen; for `radar`, the first of the two), or say «Ese trabajo ya no está» when it is gone; for `quota`, open nothing beyond marking it read.
  Proof: src/renderer/avisos/avisos.test.ts a notice opens what it is about
  Proof: src/renderer/avisos/avisos.test.ts merged, closed and gone open the forge
- **V13** The Avisos screen shall show, under the title of an `ask` or `done` notice that has a `detail`, that text localised as the needs-you body is (S28), as plain text; a notice without `detail` shows its title alone. (Bug 4.)
  Proof: src/renderer/avisos/avisos.test.ts a question keeps what it asked
- **V14** The Avisos screen shall give each kind its own label — «te pregunta», «ha terminado su turno», «se ha parado», «te espera», «choca con otro trabajo», «QA terminada», «La CI vuelve a pasar», «MR fusionada», «MR cerrada», plus today's — and the kind filter shall list every kind present in the stored notices.
  Proof: src/renderer/avisos/avisos.test.ts every kind has its label and its filter
- **V15** Where a `merged` or `closed` notice's MR branch matches a non-review workspace of the same repo, the notice row shall offer «Cerrar su trabajo», which opens that workspace's close confirmation (W136) without closing anything by itself; with no matching workspace the button is absent.
  Proof: src/renderer/avisos/avisos.test.ts a merged MR offers to close its work
