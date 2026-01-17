#!/bin/bash
#
# Pre-push hook: Run Schemathesis API fuzz testing
# This script runs property-based testing against the OpenAPI spec
# using the schemathesis/schemathesis:stable Docker image.
#
# The hook will:
# - Check if the server is running (default: localhost:3002, override with GRAPHIX_SERVER_URL)
# - Run quick fuzz tests (~100 examples) if server is available
# - Warn but allow push if server is not running
#
# To install: cp scripts/pre-push-fuzz.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push

set -e

# Configuration
SERVER_URL="${GRAPHIX_SERVER_URL:-http://localhost:3002}"
SPEC_ENDPOINT="/api/docs/spec.json"
MAX_EXAMPLES=100
TIMEOUT=120

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Pre-push: Schemathesis API Fuzz Testing ===${NC}"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Warning: Docker not found. Skipping API fuzz tests.${NC}"
    echo "Install Docker to enable property-based API testing."
    exit 0
fi

# Check if server is running
echo "Checking if server is running at ${SERVER_URL}..."
if ! curl -s --max-time 5 "${SERVER_URL}/health" > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Server not running at ${SERVER_URL}${NC}"
    echo "Start the server with 'bun run dev' to enable pre-push API fuzz testing."
    echo "Skipping fuzz tests - push will continue."
    exit 0
fi

echo -e "${GREEN}Server is running. Starting fuzz tests...${NC}"

# Run Schemathesis via Docker
# Using host.docker.internal to access host machine from Docker on macOS/Windows
# On Linux, use --network="host" instead
DOCKER_EXTRA_ARGS=""
if [[ "$(uname)" == "Linux" ]]; then
    DOCKER_EXTRA_ARGS="--network=host"
    API_URL="${SERVER_URL}${SPEC_ENDPOINT}"
else
    # macOS/Windows - use host.docker.internal
    # Extract port from SERVER_URL
    PORT=$(echo "$SERVER_URL" | sed -E 's/.*:([0-9]+).*/\1/')
    API_URL="http://host.docker.internal:${PORT}${SPEC_ENDPOINT}"
fi

echo "Running Schemathesis with ${MAX_EXAMPLES} examples (quick mode)..."
echo ""

docker run --rm \
    ${DOCKER_EXTRA_ARGS} \
    schemathesis/schemathesis:stable \
    run "${API_URL}" \
    --hypothesis-max-examples=${MAX_EXAMPLES} \
    --hypothesis-deadline=${TIMEOUT}000 \
    --checks=all \
    --stateful=links \
    --validate-schema=true \
    --dry-run=false

RESULT=$?

if [ $RESULT -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=== API fuzz tests passed! ===${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}=== API fuzz tests failed! ===${NC}"
    echo "Fix the issues above before pushing."
    echo ""
    echo "To run more detailed tests locally:"
    echo "  bun run test:fuzz"
    echo ""
    echo "To skip this hook (not recommended):"
    echo "  git push --no-verify"
    exit 1
fi
