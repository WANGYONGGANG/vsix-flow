#!/bin/bash
set -e
cd "$(dirname "$0")/.."

PORT=${PORT:-5000}
exec npx tsx scripts/server.ts
