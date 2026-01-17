#!/bin/bash
set -euo pipefail
PORT="${PORT:-3002}"
HOST="${HOST:-localhost}"
BASE_URL="http://${HOST}:${PORT}/api"
SPEC_URL="${BASE_URL}/docs/spec.json"
QUICK=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --quick) QUICK=true; shift ;;
    --port) PORT="$2"; BASE_URL="http://${HOST}:${PORT}/api"; SPEC_URL="${BASE_URL}/docs/spec.json"; shift 2 ;;
    --host) HOST="$2"; BASE_URL="http://${HOST}:${PORT}/api"; SPEC_URL="${BASE_URL}/docs/spec.json"; shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

echo "🔍 Schemathesis Fuzz Testing"
echo "Server: ${BASE_URL}"
echo "Spec: ${SPEC_URL}"

# Check if server is running
if ! curl -sf "${BASE_URL}/health" > /dev/null 2>&1; then
  echo "❌ Server not running at ${BASE_URL}"
  echo "   Start server first: bun run dev"
  exit 1
fi

# Run Schemathesis via Docker
MAX_EXAMPLES=$([ "$QUICK" = true ] && echo "10" || echo "50")
docker run --rm --network host \
  -v "$(pwd)/schemathesis.toml:/app/schemathesis.toml:ro" \
  schemathesis/schemathesis:stable \
  run \
  --config /app/schemathesis.toml \
  --base-url "${BASE_URL}" \
  --hypothesis-max-examples "${MAX_EXAMPLES}" \
  "${SPEC_URL}"
