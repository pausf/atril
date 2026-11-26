#!/bin/sh
# PreToolUse guard for Bash: this repo is never built in a session. Reads the hook payload on stdin.
# JSON is parsed by node (already required) so the repo needs no jq.
exec node -e '
let s = ""
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  let p
  try { p = JSON.parse(s) } catch { return }
  const c = p && p.tool_name === "Bash" && p.tool_input && p.tool_input.command
  // ponytail: `pnpm [flags] [run] build` at a command position; `pnpm -C dir build`, `sh -c "pnpm build"` and other build entry points pass.
  if (typeof c === "string" && /(^|[;&|\n])\s*pnpm(\s+-\S+)*(\s+run(\s+-\S+)*)?\s+build(\s|$|[;&|])/.test(c)) {
    console.error("pnpm build is blocked: this repo is never built in a session (see CLAUDE.md).")
    process.exit(2)
  }
})'
