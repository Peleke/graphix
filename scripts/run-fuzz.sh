#!/bin/bash
set -euo pipefail

# Input validation functions
validate_port() {
  local port="$1"
  if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
    echo "❌ Invalid port: $port (must be 1-65535)"
    exit 1
  fi
}

validate_host() {
  local host="$1"
  # Basic validation: no special shell characters, reasonable length
  # Escape special regex chars: ; & | ` $ ( )
  if [[ "$host" =~ [\;\&\|\`\$\(\)] ]] || [ ${#host} -gt 253 ]; then
    echo "❌ Invalid host: $host (contains invalid characters or too long)"
    exit 1
  fi
}

# Defaults (from packages/server/src/config/server.ts)
PORT="${PORT:-3002}"
HOST="${HOST:-localhost}"
QUICK=false

# Validate defaults
validate_port "$PORT"
validate_host "$HOST"

while [[ $# -gt 0 ]]; do
  case $1 in
    --quick)
      QUICK=true
      shift
      ;;
    --port)
      PORT="$2"
      validate_port "$PORT"
      shift 2
      ;;
    --host)
      HOST="$2"
      validate_host "$HOST"
      shift 2
      ;;
    *)
      echo "❌ Unknown option: $1"
      echo "Usage: $0 [--quick] [--port PORT] [--host HOST]"
      exit 1
      ;;
  esac
done

# Build URLs after validation
BASE_URL="http://${HOST}:${PORT}/api"
SPEC_URL="${BASE_URL}/docs/spec.json"

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
