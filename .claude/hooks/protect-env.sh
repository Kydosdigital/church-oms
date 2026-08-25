#!/usr/bin/env bash
# PreToolUse hook (matcher: Bash) — blocks commands that would print or
# exfiltrate env files / the Supabase service-role key.
set -euo pipefail

cmd="$(jq -r '.tool_input.command // empty')"

if [[ -z "$cmd" ]]; then
  exit 0
fi

# Block reading .env* files directly.
if echo "$cmd" | grep -Eq '\.env(\.[A-Za-z0-9._-]+)?\b' \
   && echo "$cmd" | grep -Eq '\b(cat|less|more|head|tail|cp|scp|curl|echo)\b'; then
  echo "Blocked: this command appears to read or move an .env file. Church OMS's service-role key and other secrets must never be read, printed, or committed. If you need an env var's *name* (not its value), check .env.example instead." >&2
  exit 2
fi

# Block anything that looks like it's trying to print the service-role key.
if echo "$cmd" | grep -Eiq 'SUPABASE_SERVICE_ROLE_KEY'; then
  echo "Blocked: command references SUPABASE_SERVICE_ROLE_KEY. This key bypasses Row-Level Security entirely and must never be printed, logged, or committed." >&2
  exit 2
fi

exit 0
