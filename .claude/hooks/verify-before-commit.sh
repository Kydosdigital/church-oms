#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash) — when a command contains `git commit`,
# nudge (not block) toward running the verification suite first. There is
# no dedicated PreCommit hook event, so this inspects the Bash command
# itself.
set -euo pipefail

cmd="$(jq -r '.tool_input.command // empty')"

if [[ -z "$cmd" ]]; then
  exit 0
fi

if echo "$cmd" | grep -Eq 'git[[:space:]]+commit'; then
  if [[ -z "${CHURCH_OMS_VERIFIED:-}" ]]; then
    echo "Reminder: before committing, run the verification suite — npx next typegen, npx tsc --noEmit, npx eslint ., npm test, npm run build. This hook does not block the commit; it's a reminder in case a step was skipped." >&2
  fi
fi

exit 0
