#!/bin/bash
#
# Run Schemathesis API Fuzz Testing
# Usage: ./scripts/run-fuzz.sh [max_examples]
#
# Arguments:
#   max_examples - Maximum number of test examples per endpoint (default: 500)

set -e

MAX_EXAMPLES="${1:-500}"
SERVER_URL="${GRAPHIX_SERVER_URL:-http://localhost:3002}"
SPEC_ENDPOINT="/api/docs/spec.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Schemathesis API Fuzz Testing ===${NC}"
echo "Max examples per endpoint: ${MAX_EXAMPLES}"
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is required but not installed.${NC}"
    echo "Install Docker from https://docker.com"
    exit 1
fi

# Check if server is running
echo "Checking if server is running at ${SERVER_URL}..."
if ! curl -s --max-time 5 "${SERVER_URL}/health" > /dev/null 2>&1; then
    echo -e "${RED}Error: Server not running at ${SERVER_URL}${NC}"
    echo ""
    echo "Please start the server first:"
    echo "  bun run dev"
    echo ""
    exit 1
fi

echo -e "${GREEN}Server is running. Verifying OpenAPI spec...${NC}"

# Verify spec is accessible
if ! curl -s --max-time 10 "${SERVER_URL}${SPEC_ENDPOINT}" > /dev/null 2>&1; then
    echo -e "${RED}Error: OpenAPI spec not accessible at ${SERVER_URL}${SPEC_ENDPOINT}${NC}"
    exit 1
fi

echo "OpenAPI spec verified. Starting fuzz tests..."
echo ""

# Determine Docker network mode based on OS
DOCKER_EXTRA_ARGS=""
if [[ "$(uname)" == "Linux" ]]; then
    DOCKER_EXTRA_ARGS="--network=host"
    API_URL="${SERVER_URL}${SPEC_ENDPOINT}"
else
    # macOS/Windows - use host.docker.internal
    API_URL="http://host.docker.internal:3000${SPEC_ENDPOINT}"
fi

# Run Schemathesis
docker run --rm \
    ${DOCKER_EXTRA_ARGS} \
    schemathesis/schemathesis:stable \
    run "${API_URL}" \
    --hypothesis-max-examples=${MAX_EXAMPLES} \
    --hypothesis-deadline=120000 \
    --checks=all \
    --stateful=links \
    --validate-schema=true

RESULT=$?

echo ""
if [ $RESULT -eq 0 ]; then
    echo -e "${GREEN}=== All fuzz tests passed! ===${NC}"
else
    echo -e "${RED}=== Fuzz tests failed ===${NC}"
    echo ""
    echo "Common issues:"
    echo "  - Schema violations: Response doesn't match OpenAPI spec"
    echo "  - Server errors: 5xx responses to valid requests"
    echo "  - Invalid request handling: Missing 4xx for bad input"
    echo ""
    echo "Run with more examples for thorough testing:"
    echo "  bun run test:fuzz"
fi

exit $RESULT
