#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Soak Test — 30 VUs sustained for 15 minutes
# Detects memory leaks, connection exhaustion, and gradual performance drift.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/tests/performance/reports"
LOCUSTFILE="$PROJECT_ROOT/tests/performance/scripts/locustfile.py"

echo "=== Soak Test: 30 VUs × 15 min ==="
echo "Monitoring for memory leaks and connection exhaustion."
echo ""

cd "$PROJECT_ROOT"
source venv/bin/activate

python -m locust \
    --headless \
    --users 30 \
    --spawn-rate 3 \
    --run-time 15m \
    --host http://127.0.0.1:8000 \
    --html "$REPORTS_DIR/soak_report.html" \
    --csv "$REPORTS_DIR/soak" \
    -f "$LOCUSTFILE" \
    2>&1 | tee "$REPORTS_DIR/soak_stdout.txt"

echo ""
echo "✅ Soak test complete. Report: $REPORTS_DIR/soak_report.html"

