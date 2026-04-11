#!/bin/bash
# playwright-test-runner.sh
# Self-healing test runner for display-compare
# Schedule: */35 * * * *

set -e

PROJECT_DIR="$HOME/dev/display-compare"
TEST_RUNS="$PROJECT_DIR/test_runs.md"
TESTS_DIR="$PROJECT_DIR/tests"

cd "$PROJECT_DIR"

echo "=== Playwright Test Runner ==="
echo "Run at: $(date -u '+%Y-%m-%d %H:%M UTC')"

# Start dev server if not running
if ! curl -s --max-time 3 http://localhost:3000 > /dev/null 2>&1; then
  echo "Starting dev server..."
  npx next dev -p 3000 > /tmp/dc-test.log 2>&1 &
  sleep 8
fi

# Run playwright tests
echo "Running tests..."
npx playwright test --reporter=line 2>&1 | tee /tmp/pw-output.txt
PW_EXIT=$?

# Parse results
PASS_COUNT=$(grep -c "✓" /tmp/pw-output.txt 2>/dev/null || echo "0")
FAIL_COUNT=$(grep -c "✗\|FAILED" /tmp/pw-output.txt 2>/dev/null || echo "0")

echo ""
echo "Results: $PASS_COUNT passed, $FAIL_COUNT failed (exit: $PW_EXIT)"

# Update test_runs.md with this run
{
  echo ""
  echo "## Run $(date -u '+%Y-%m-%d %H:%M UTC')"
  echo "**Pass:** $PASS_COUNT | **Fail:** $FAIL_COUNT"
  echo ""
  echo "Output saved to /tmp/pw-output.txt"
} >> "$TEST_RUNS"

# If failures exist, analyze and attempt fix
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "Analyzing failures..."
  # Extract failure names and details
  grep -A5 "FAILED" /tmp/pw-output.txt || true
fi

echo "Run complete."