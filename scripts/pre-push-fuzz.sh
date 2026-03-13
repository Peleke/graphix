#!/bin/bash
# Pre-push hook: Run quick Schemathesis fuzz test
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/run-fuzz.sh" --quick
