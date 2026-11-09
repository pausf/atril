#!/bin/sh
# Claude Code hook: claude-hook.sh <state>. No node, no jq: GUI-launched apps start with a bare PATH.
cat >/dev/null 2>&1
PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"
case "$1" in working | needs-you) ;; *) exit 0 ;; esac

if [ -n "$ATRIL_TMUX_SOCKET" ]; then
  session=$(tmux -L "$ATRIL_TMUX_SOCKET" display -p '#S' 2>/dev/null)
else
  session=$(tmux display -p '#S' 2>/dev/null)
fi
[ -n "$session" ] || exit 0

dir="${ATRIL_HOME:-$HOME/.atril}/state"
mkdir -p "$dir" || exit 0
tmp=$(mktemp "$dir/.tmp.XXXXXX") || exit 0
# mv is atomic on one filesystem: the watcher never reads a half-written file.
printf '{"state":"%s","at":%s}\n' "$1" "$(date +%s)" >"$tmp" && mv "$tmp" "$dir/$session.json"
