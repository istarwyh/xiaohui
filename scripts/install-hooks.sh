#!/usr/bin/env bash
# Installs git hooks into .git/hooks so this clone runs quality checks
# before each commit and push. Idempotent — safe to re-run.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_DIR="$ROOT/.git/hooks"
NODE_BIN_DIR="$(dirname "$(command -v node)")"
mkdir -p "$HOOK_DIR"

# ---------------------------------------------------------------------------
# pre-commit: fast checks that run on each commit
#   1. Frontmatter date autofill for staged markdown (content/)
#   2. Frontmatter validation for staged markdown (content/)
#   3. TypeScript type-check (only when .ts/.tsx are staged)
#   4. Prettier --check on staged code files (ts/tsx/scss/json/js/mjs)
# ---------------------------------------------------------------------------
cat > "$HOOK_DIR/pre-commit" <<'HOOK'
#!/usr/bin/env bash
# Auto-installed by scripts/install-hooks.sh
set -e
HOOK
printf 'export PATH=%q:"$PATH"\n\n' "$NODE_BIN_DIR" >> "$HOOK_DIR/pre-commit"
cat >> "$HOOK_DIR/pre-commit" <<'HOOK'

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# 1. Frontmatter date autofill
node "$ROOT/scripts/fill-staged-frontmatter-dates.js"

# 2. Frontmatter validation
node "$ROOT/scripts/check-frontmatter.js"

# Snapshot staged files once
STAGED=$(git diff --cached --name-only --diff-filter=ACMR)

# 3. TypeScript type-check
TS_STAGED=$(printf '%s\n' "$STAGED" | grep -E '\.(ts|tsx)$' || true)
if [ -n "$TS_STAGED" ]; then
  echo "→ tsc --noEmit"
  npx --no-install tsc --noEmit
fi

# 4. Prettier --check on staged code files
PRETTIER_STAGED=$(printf '%s\n' "$STAGED" | grep -E '\.(ts|tsx|scss|json|js|mjs)$' || true)
if [ -n "$PRETTIER_STAGED" ]; then
  echo "→ prettier --check (staged)"
  printf '%s\n' "$PRETTIER_STAGED" | xargs npx --no-install prettier --check
fi

echo "✓ pre-commit checks passed"
HOOK
chmod +x "$HOOK_DIR/pre-commit"
echo "Installed pre-commit hook → $HOOK_DIR/pre-commit"

# ---------------------------------------------------------------------------
# pre-push: full repo check before pushing to remote
# ---------------------------------------------------------------------------
cat > "$HOOK_DIR/pre-push" <<'HOOK'
#!/usr/bin/env bash
# Auto-installed by scripts/install-hooks.sh
set -e
HOOK
printf 'export PATH=%q:"$PATH"\n\n' "$NODE_BIN_DIR" >> "$HOOK_DIR/pre-push"
cat >> "$HOOK_DIR/pre-push" <<'HOOK'

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "→ tsc --noEmit (full)"
npx --no-install tsc --noEmit

echo "→ npm test"
npm test --silent

echo "✓ pre-push checks passed"
HOOK
chmod +x "$HOOK_DIR/pre-push"
echo "Installed pre-push hook → $HOOK_DIR/pre-push"
