#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Baseline Performance Test — 10 VUs, 2 minutes
# Establishes the P50/P95/P99 baseline before any optimizations.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/tests/performance/reports"
LOCUSTFILE="$PROJECT_ROOT/tests/performance/scripts/locustfile.py"

echo "=== Baseline Test: 10 VUs × 2 min ==="
echo "Host: http://127.0.0.1:8000"
echo "Report: $REPORTS_DIR/baseline_report.html"
echo ""

cd "$PROJECT_ROOT"
source venv/bin/activate

python -m locust \
    --headless \
    --users 10 \
    --spawn-rate 2 \
    --run-time 2m \
    --host http://127.0.0.1:8000 \
    --html "$REPORTS_DIR/baseline_report.html" \
    --csv "$REPORTS_DIR/baseline" \
    -f "$LOCUSTFILE" \
    2>&1 | tee "$REPORTS_DIR/baseline_stdout.txt"

echo ""
echo "✅ Baseline test complete."
echo "   HTML report : $REPORTS_DIR/baseline_report.html"
echo "   CSV stats   : $REPORTS_DIR/baseline_stats.csv"
echo "   Stdout log  : $REPORTS_DIR/baseline_stdout.txt"

