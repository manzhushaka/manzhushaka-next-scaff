#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
printf '即将执行 Prisma 迁移，目标由 DATABASE_URL 决定。确认继续请输入 APPLY： '
read -r confirmation
[[ "$confirmation" == "APPLY" ]] || { echo '已取消。'; exit 1; }
pnpm db:migrate
