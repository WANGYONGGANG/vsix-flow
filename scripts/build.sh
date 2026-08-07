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

echo "=== Build complete ==="
