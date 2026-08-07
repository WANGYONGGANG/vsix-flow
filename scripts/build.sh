#!/bin/bash
set -e

cd "$(dirname "$0")/.."

# Install dependencies
npm install 2>/dev/null
cd webapp && npm install --legacy-peer-deps 2>/dev/null && cd ..

# Build webapp
cd webapp && npx vite build && cd ..

# Prepare dist directory at root
rm -rf dist
cp -r webapp/dist dist

# Bundle API function into dist/api/
mkdir -p dist/api
npx esbuild api/index.ts --bundle --platform=node --target=node20 --format=cjs \
  --outfile=dist/api/index.js --external:@vercel/node

echo "Build complete: dist/ (static) + dist/api/index.js (function)"
