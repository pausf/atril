# qa-to-mr · mr

Targets: mr

## Outcomes

- Un fallo al publicar en una MR trae, además de su frase, el código plegado y su arreglo (W150), también desde la QA.

## Scope boundaries

**In:** `src/main/forge/threads.ts` (`reply`), `src/main/forge/openmr.ts` (`remoteNaming` exportado). **Out:** el resto de la pantalla MR.

## Constraints

- El token no sale de main.

## Verification criteria

- **M21** (amended) When the person writes a reply and clicks Enviar, Atril shall post it once — GitHub `POST /repos/{o}/{r}/pulls/{n}/comments/{root}/replies` for a review thread and `POST /repos/{o}/{r}/issues/{n}/comments` for «General»; GitLab `POST /projects/:id/merge_requests/:iid/discussions/:id/notes` for a discussion and `POST /projects/:id/merge_requests/:iid/notes` for «General» — then show it in the thread; an empty reply shall not be sent, and a failure shall keep the text in the box with M6's message, answering also W150's `detail` and `fix` when the forge answered.
  Proof: src/main/forge/threads.test.ts a reply is posted once to the right place
