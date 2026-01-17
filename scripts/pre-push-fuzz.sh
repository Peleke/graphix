#!/bin/bash
# Pre-push hook: Run quick Schemathesis fuzz test
set -euo pipefail
exec ./scripts/run-fuzz.sh --quick
