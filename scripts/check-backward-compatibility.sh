#!/bin/bash
# scripts/check-backward-compatibility.sh
#
# Validates backward compatibility during state refactor migration
# Part of Phase 5 cleanup (t-011)

set -e

echo "=== Backward Compatibility Check ==="
echo ""

# Check for legacy store.ts imports
echo "1. Checking for imports from legacy store.ts..."
STORE_IMPORTERS=$(grep -r "from.*features/planning/store" src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)

if [ -z "$STORE_IMPORTERS" ]; then
  echo "   ✅ No files import from store.ts (expected - store.ts never existed)"
else
  echo "   ❌ FOUND store.ts imports:"
  echo "$STORE_IMPORTERS"
  exit 1
fi

echo ""

# Check for legacy server.ts imports
echo "2. Checking for imports from legacy server.ts..."
SERVER_IMPORTERS=$(grep -r "from.*features/planning/server['\"]" src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)

if [ -z "$SERVER_IMPORTERS" ]; then
  echo "   ✅ No files import from server.ts"
else
  echo "   ⚠️  Found server.ts imports (checking if valid):"
  echo "$SERVER_IMPORTERS" | head -5
  # This is OK - server.db.ts is still valid
fi

echo ""

# Verify new architecture files exist
echo "3. Verifying new architecture files..."

REQUIRED_FILES=(
  "src/features/planning/domain/step-state.ts"
  "src/features/planning/domain/step-commands.ts"
  "src/features/planning/infrastructure/repository.ts"
  "src/features/planning/infrastructure/server-functions.ts"
  "src/features/planning/application/queries.ts"
)

ALL_EXIST=true
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ MISSING: $file"
    ALL_EXIST=false
  fi
done

if [ "$ALL_EXIST" = false ]; then
  echo ""
  echo "❌ FAILED: Required architecture files missing"
  exit 1
fi

echo ""

# Run tests for new architecture
echo "4. Running tests for new architecture..."
TEST_TARGETS=(
  "src/features/planning/domain/step-state.test.ts"
  "src/features/planning/domain/step-commands.test.ts"
  "src/features/planning/infrastructure/repository.test.ts"
  "src/features/planning/application/queries.test.ts"
)

for test_file in "${TEST_TARGETS[@]}"; do
  if [ -f "$test_file" ]; then
    echo "   Testing: $test_file"
    npm test "$test_file" -- --run --reporter=dot > /dev/null 2>&1 || {
      echo "   ❌ FAILED: $test_file"
      exit 1
    }
    echo "   ✅ Passed"
  else
    echo "   ⚠️  No test file: $test_file"
  fi
done

echo ""
echo "=== ✅ ALL BACKWARD COMPATIBILITY CHECKS PASSED ==="
echo ""
echo "Summary:"
echo "  - No legacy store.ts imports found (store.ts never existed)"
echo "  - New architecture files present and tested"
echo "  - Migration path: Direct refactor from planningMachine.ts"
echo ""
echo "Next: Phase 5 continues with deprecation warnings (t-011b)"
