#!/usr/bin/env bash
set -euo pipefail

release_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
project_dir=$(cd "${release_dir}/.." && pwd)
source "${release_dir}/project.env"

out_dir="${release_dir}/out"
work_dir="${release_dir}/work"
bundle_dir="${work_dir}/bundle"
deploy_dir="${work_dir}/deploy"
rm -rf "${out_dir}" "${work_dir}"
mkdir -p "${out_dir}" "${bundle_dir}" "${deploy_dir}"

cd "${project_dir}"
corepack pnpm install --frozen-lockfile
corepack pnpm db:generate
NEXT_PUBLIC_BASE_PATH="/gateway/manzhushaka-next-scaff" \
NEXT_PUBLIC_API_URL="/gateway/manzhushaka-next-scaff" \
  corepack pnpm build

copy_tree() {
  local source=$1
  local target=$2
  mkdir -p "$(dirname "${target}")"
  cp -aL "${source}/." "${target}/"
}

copy_path() {
  local source=$1
  local target=$2
  if [[ -d ${source} ]]; then
    copy_tree "${source}" "${target}"
  else
    mkdir -p "$(dirname "${target}")"
    cp -aL "${source}" "${target}"
  fi
}

# pnpm deploy resolves the locked production graph for each backend process.
corepack pnpm deploy --filter @manzhushaka/api --prod --legacy \
  --config.node-linker=hoisted --config.auto-install-peers=false "${deploy_dir}/api"
corepack pnpm deploy --filter @manzhushaka/worker --prod --legacy \
  --config.node-linker=hoisted --config.auto-install-peers=false "${deploy_dir}/worker"
copy_tree "${deploy_dir}/api/node_modules" "${bundle_dir}/node_modules"
rm -rf "${bundle_dir}/node_modules/.bin" "${bundle_dir}/node_modules/.pnpm"

merge_dependency() {
  local source=$1
  local relative=$2
  local target="${bundle_dir}/node_modules/${relative}"
  if [[ ! -e ${target} ]]; then
    mkdir -p "$(dirname "${target}")"
    cp -aL "${source}" "${target}"
    return
  fi
  if [[ -f ${source}/package.json && -f ${target}/package.json ]]; then
    local source_version target_version
    source_version=$(node -p "require(process.argv[1]).version" "${source}/package.json")
    target_version=$(node -p "require(process.argv[1]).version" "${target}/package.json")
    [[ ${source_version} == "${target_version}" ]] || {
      echo "Runtime dependency version conflict for ${relative}: ${target_version} vs ${source_version}" >&2
      exit 1
    }
  fi
}

for entry in "${deploy_dir}/worker/node_modules"/*; do
  name=$(basename "${entry}")
  if [[ ${name} == @* ]]; then
    for scoped_entry in "${entry}"/*; do
      merge_dependency "${scoped_entry}" "${name}/$(basename "${scoped_entry}")"
    done
  else
    merge_dependency "${entry}" "${name}"
  fi
done
for entry in "${deploy_dir}/worker/node_modules"/.[!.]*; do
  [[ -e ${entry} ]] || continue
  name=$(basename "${entry}")
  [[ ${name} == .bin || ${name} == .pnpm ]] && continue
  merge_dependency "${entry}" "${name}"
done

compile_workspace_package() {
  local package_name=$1
  local compiled_dir="${work_dir}/compiled/${package_name}"
  corepack pnpm exec tsc "packages/${package_name}/src/index.ts" \
    --target ES2022 --module NodeNext --moduleResolution NodeNext \
    --esModuleInterop --skipLibCheck --declaration \
    --rootDir "packages/${package_name}/src" --outDir "${compiled_dir}"
  local package_dir="${bundle_dir}/node_modules/@manzhushaka/${package_name}"
  rm -rf "${package_dir}/src"
  cp -a "${compiled_dir}/index.js" "${package_dir}/index.js"
  if [[ -f ${compiled_dir}/index.d.ts ]]; then
    cp -a "${compiled_dir}/index.d.ts" "${package_dir}/index.d.ts"
  fi
  node - "${package_dir}/package.json" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const packageJson = JSON.parse(fs.readFileSync(file, 'utf8'));
packageJson.exports = { '.': './index.js' };
fs.writeFileSync(file, `${JSON.stringify(packageJson, null, 2)}\n`);
NODE
}

compile_workspace_package config
compile_workspace_package contracts
compile_workspace_package security
copy_tree "apps/api/dist" "${bundle_dir}/api/dist"
copy_tree "apps/worker/dist" "${bundle_dir}/worker/dist"
copy_tree "apps/web/.next/standalone" "${bundle_dir}/web"
mkdir -p "${bundle_dir}/web/apps/web/.next/static"
copy_tree "apps/web/.next/static" "${bundle_dir}/web/apps/web/.next/static"
styled_jsx_dir=$(find node_modules/.pnpm -type d -path '*/node_modules/styled-jsx' | LC_ALL=C sort | head -1)
[[ -n ${styled_jsx_dir} ]] || { echo "Next.js runtime dependency styled-jsx is missing." >&2; exit 1; }
copy_tree "${styled_jsx_dir}" "${bundle_dir}/web/node_modules/styled-jsx"
swc_helpers_dir=$(find node_modules/.pnpm -type d -path '*/node_modules/@swc/helpers' | LC_ALL=C sort | head -1)
[[ -n ${swc_helpers_dir} ]] || { echo "Next.js runtime dependency @swc/helpers is missing." >&2; exit 1; }
copy_tree "${swc_helpers_dir}" "${bundle_dir}/web/node_modules/@swc/helpers"
next_env_dir=$(find node_modules/.pnpm -type d -path '*/node_modules/@next/env' | LC_ALL=C sort | head -1)
[[ -n ${next_env_dir} ]] || { echo "Next.js runtime dependency @next/env is missing." >&2; exit 1; }
copy_tree "${next_env_dir}" "${bundle_dir}/web/node_modules/@next/env"
prisma_client_dir=$(find node_modules/.pnpm -type d -path '*/node_modules/.prisma/client' | LC_ALL=C sort | head -1)
[[ -n ${prisma_client_dir} ]] || { echo "Generated Prisma client is missing." >&2; exit 1; }
copy_tree "${prisma_client_dir}" "${bundle_dir}/node_modules/.prisma/client"
if [[ -d apps/web/public ]]; then
  copy_tree "apps/web/public" "${bundle_dir}/web/apps/web/public"
fi

while IFS= read -r path || [[ -n ${path} ]]; do
  path=${path%%#*}
  path=$(printf '%s' "${path}" | tr -d '[:space:]')
  [[ -z ${path} ]] && continue
  [[ ${path} != /* && ${path} != *..* && -e ${path} ]] || {
    echo "Invalid or missing source-manifest entry: ${path}" >&2
    exit 1
  }
  copy_path "${path}" "${bundle_dir}/${path}"
done < "${SOURCE_MANIFEST:-.release/source-manifest.txt}"

cat > "${bundle_dir}/run.sh" <<'RUN_SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

app_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
node_bin=/home/middleware/node/current/bin/node
if [[ ! -x ${node_bin} ]]; then
  node_bin=$(command -v node)
fi
export NODE_ENV=${NODE_ENV:-production}
api_port=${API_PORT:-4000}
web_port=${WEB_PORT:-3000}
tsx_bin="${app_dir}/node_modules/tsx/dist/cli.mjs"

pids=()
stop_children() {
  trap - TERM INT EXIT
  for pid in "${pids[@]}"; do
    kill "${pid}" 2>/dev/null || true
  done
  wait || true
}
trap stop_children TERM INT EXIT

API_PORT="${api_port}" "${node_bin}" "${tsx_bin}" "${app_dir}/api/dist/main.js" & pids+=("$!")
"${node_bin}" "${tsx_bin}" "${app_dir}/worker/dist/main.js" & pids+=("$!")
(
  cd "${app_dir}/web/apps/web"
  PORT="${web_port}" HOSTNAME=127.0.0.1 exec "${node_bin}" server.js
) & pids+=("$!")

while :; do
  for pid in "${pids[@]}"; do
    if ! kill -0 "${pid}" 2>/dev/null; then
      wait "${pid}" || status=$?
      status=${status:-0}
      stop_children
      exit "${status}"
    fi
  done
  sleep 1
done
RUN_SCRIPT
chmod 0755 "${bundle_dir}/run.sh"

find "${bundle_dir}" -type l -print -quit | grep -q . && {
  echo "Runtime package contains a symbolic link." >&2
  exit 1
}
while IFS= read -r -d '' linked_file; do
  replacement="${linked_file}.release-copy.$$"
  cp -p "${linked_file}" "${replacement}"
  mv "${replacement}" "${linked_file}"
done < <(find "${bundle_dir}" -type f -links +1 -print0)
find "${bundle_dir}" -type f -print | sed "s#^${bundle_dir}/##" | LC_ALL=C sort > "${bundle_dir}/.release-manifest"
tar -C "${bundle_dir}" -czf "${out_dir}/release.tar.gz" .

max_archive_mib=${MAX_RELEASE_ARCHIVE_MIB:-150}
archive_bytes=$(wc -c < "${out_dir}/release.tar.gz" | tr -d '[:space:]')
bundle_kib=$(du -sk "${bundle_dir}" | awk '{print $1}')
archive_kib=$(( (archive_bytes + 1023) / 1024 ))
archive_mib=$(( (archive_bytes + 1024 * 1024 - 1) / (1024 * 1024) ))
echo "Release bundle size: ${bundle_kib} KiB"
echo "Release archive size: ${archive_kib} KiB (${archive_mib} MiB); limit: ${max_archive_mib} MiB"
(( archive_bytes <= max_archive_mib * 1024 * 1024 )) || {
  echo "Release archive exceeds ${max_archive_mib} MiB." >&2
  exit 1
}
(
  cd "${out_dir}"
  sha256sum release.tar.gz > release.tar.gz.sha256
  tar -tzf release.tar.gz | sed 's#^\./##' | LC_ALL=C sort > release-manifest.txt
  sha256sum release-manifest.txt > release-manifest.txt.sha256
)
