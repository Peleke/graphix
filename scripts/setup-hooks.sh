#!/bin/bash
#
# Setup Git Hooks
# This script installs the pre-push hook for Schemathesis API fuzz testing
#
# Usage: ./scripts/setup-hooks.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="${PROJECT_ROOT}/.git/hooks"

echo "Setting up git hooks..."

# Create pre-push hook
cat > "${HOOKS_DIR}/pre-push" << 'HOOKEOF'
#!/bin/bash
#
# Pre-push git hook
# Runs Schemathesis API fuzz testing before push
#
# This hook calls the versioned script in scripts/pre-push-fuzz.sh
# to ensure the hook logic is tracked in version control.

SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
HOOK_SCRIPT="${SCRIPT_DIR}/scripts/pre-push-fuzz.sh"

if [ -f "$HOOK_SCRIPT" ]; then
    exec "$HOOK_SCRIPT" "$@"
else
    echo "Warning: pre-push-fuzz.sh not found at ${SCRIPT_DIR}/scripts/pre-push-fuzz.sh"
    echo "Skipping API fuzz tests."
    exit 0
fi
HOOKEOF

chmod +x "${HOOKS_DIR}/pre-push"

echo "Git hooks installed successfully!"
echo ""
echo "Installed hooks:"
echo "  - pre-push: Schemathesis API fuzz testing (runs on git push)"
echo ""
echo "To skip hooks temporarily: git push --no-verify"
