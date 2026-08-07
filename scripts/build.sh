#!/bin/bash
set -e

echo "=== Installing dependencies ==="
npm install
cd webapp && npm install --legacy-peer-deps && cd ..

echo "=== Building webapp ==="
cd webapp && npx vite build && cd ..

echo "=== Copying webapp dist to root ==="
# Copy webapp dist files to root for Vercel static serving
cp -r webapp/dist/* ./

echo "=== Bundling API function ==="
npx esbuild api/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=cjs \
  --outfile=api/index.js \
  --external:@vercel/node

echo "=== Build complete ==="
echo "Static files at root, API function at api/index.js"
