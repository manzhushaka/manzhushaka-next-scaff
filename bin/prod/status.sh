#!/usr/bin/env bash
set -euo pipefail

for endpoint in "Web|http://127.0.0.1:3000" "API|http://127.0.0.1:4000/api/health"; do
  label="${endpoint%%|*}"
  url="${endpoint#*|}"
  if curl -fsS "$url" >/dev/null 2>&1; then
    echo "${label}: 在线"
  else
    echo "${label}: 未响应"
  fi
done
