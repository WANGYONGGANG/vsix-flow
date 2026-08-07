#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "=== Installing root dependencies ==="
npm install --silent 2>/dev/null || true

echo "=== Installing webapp dependencies ==="
cd webapp
pnpm install --no-frozen-lockfile --silent 2>/dev/null || npm install --legacy-peer-deps --silent 2>/dev/null

echo "=== Building webapp ==="
npx vite build

echo "=== Copying dist to root ==="
cd ..
rm -rf dist
cp -r webapp/dist ./dist

echo "=== Bundling API function ==="
npx esbuild api/index.ts --bundle --platform=node --target=node20 --format=cjs --outfile=dist/api/index.js --external:@vercel/node 2>/dev/null || cp api/index.js dist/api/index.js 2>/dev/null || true

echo "=== Build complete ==="
