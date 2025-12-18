#!/bin/bash
# Test verification script for CI/CD
# Ensures all tests pass before merging

set -e

echo "🧪 Running 30x30 Test Suite..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
FAILED=0

# 1. Lint
echo "📝 Running linter..."
if pnpm lint; then
  echo -e "${GREEN}✓ Lint passed${NC}"
else
  echo -e "${RED}✗ Lint failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# 2. Unit Tests
echo "🧪 Running unit tests..."
if pnpm test --run; then
  echo -e "${GREEN}✓ Unit tests passed${NC}"
else
  echo -e "${RED}✗ Unit tests failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# 3. Build
echo "🏗️  Building application..."
if pnpm build; then
  echo -e "${GREEN}✓ Build succeeded${NC}"
else
  echo -e "${RED}✗ Build failed${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

# 4. E2E Tests (only if not in minimal CI mode)
if [ "$SKIP_E2E" != "true" ]; then
  echo "🌐 Running E2E tests..."
  if pnpm test:e2e; then
    echo -e "${GREEN}✓ E2E tests passed${NC}"
  else
    echo -e "${RED}✗ E2E tests failed${NC}"
    FAILED=$((FAILED + 1))
  fi
  echo ""
else
  echo -e "${YELLOW}⊘ E2E tests skipped (SKIP_E2E=true)${NC}"
  echo ""
fi

# Summary
echo "════════════════════════════════════════"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ $FAILED test suite(s) failed${NC}"
  exit 1
fi
