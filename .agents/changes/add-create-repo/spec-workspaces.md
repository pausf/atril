Targets: workspaces
Governs: src/main/forge/**

(A subset of the workspaces capability's own `Governs:`, which does not change.)

# workspaces — create a repo on a forge, clone it, register it

Vocabulary, decision log and the primary contract: `proposal.md` beside this file.

## Outcomes

- A repo created on GitHub or GitLab under the person's account, optionally cloned over SSH and
  registered as an Atril repo.

## Scope boundaries

**In:** validation, the create request, the clone and the registration. **Out:** the cards and
the dialog (proposal.md).

## Constraints

- The tokens come from the secret store in main only; registration is `registerRepo` (W1–W4).

## Prior decisions

- **SSH, never a token URL** (proposal.md).

## Task breakdown

- `src/main/forge/create.ts`: validate, create, clone, register.

## Verification criteria

- **W49** If the repo name is empty, longer than 100 characters, has a character other than
  letters, digits, `.`, `-` or `_`, or is `.` or `..`, then Atril shall answer «Nombre de repo no
  válido» and send no request; a name the forge refuses anyway shall come back as its `{detail}`.
  Proof: src/main/forge/create.test.ts an invalid name sends nothing
- **W50** When a repo is created, Atril shall send the forge's create request for the person's
  account with the name, description, visibility (private unless public was confirmed) and a
  README, and answer with the web link and the forge's own path for the repo; a refusal shall
  answer «{forge} no ha creado el repo: {detail}».
  Proof: src/main/forge/create.test.ts creates a private repo with a readme
- **W51** When cloning is asked, Atril shall refuse before cloning if `<folder>/<path>` exists;
  otherwise clone the SSH URL there and register it (with the suggested id when the derived one is
  taken); if the clone fails it shall register nothing and answer with the `git clone` command to
  run by hand; no command Atril runs shall contain the token.
  (One proof per path: success, failed clone, existing folder; the token check runs on all.)
  Proof: src/main/forge/create.test.ts clones over ssh and registers the repo
  Proof: src/main/forge/create.test.ts a failed clone registers nothing
  Proof: src/main/forge/create.test.ts an existing folder is not overwritten
