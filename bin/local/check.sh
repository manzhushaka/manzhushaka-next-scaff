#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
