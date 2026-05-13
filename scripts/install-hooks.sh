#!/usr/bin/env bash
# Installs git hooks into .git/hooks so this clone runs blog validation
# before each commit. Idempotent — safe to re-run.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_DIR="$ROOT/.git/hooks"
mkdir -p "$HOOK_DIR"

cat > "$HOOK_DIR/pre-commit" <<'HOOK'
#!/usr/bin/env bash
# Auto-installed by scripts/install-hooks.sh
set -e
node "$(git rev-parse --show-toplevel)/scripts/check-frontmatter.js"
HOOK

chmod +x "$HOOK_DIR/pre-commit"
echo "Installed pre-commit hook → $HOOK_DIR/pre-commit"
