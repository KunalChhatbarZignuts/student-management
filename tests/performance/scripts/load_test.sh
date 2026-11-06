#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Load Test — Staged ramp: 10 → 25 → 50 → 100 VUs
# Simulates expected daily school usage across a full school day.
# Each stage runs for 2 minutes.  Abort if error rate > 5%.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/tests/performance/reports"
LOCUSTFILE="$PROJECT_ROOT/tests/performance/scripts/locustfile.py"

echo "=== Load Test: 10 → 25 → 50 → 100 VUs (staged) ==="
echo ""

run_stage() {
    local vus=$1
    local duration=$2
    local label=$3
    echo "--- Stage: $label ($vus VUs × $duration) ---"
    cd "$PROJECT_ROOT" && source venv/bin/activate && python -m locust \
        --headless \
        --users "$vus" \
        --spawn-rate 5 \
        --run-time "$duration" \
        --host http://127.0.0.1:8000 \
        --html "$REPORTS_DIR/load_${label}_report.html" \
        --csv "$REPORTS_DIR/load_${label}" \
        -f "$LOCUSTFILE" \
        2>&1 | tee "$REPORTS_DIR/load_${label}_stdout.txt"
    echo "✅ Stage $label done."
    sleep 10  # Cool-down between stages
}

run_stage 10  "2m" "10vus"
run_stage 25  "2m" "25vus"
run_stage 50  "2m" "50vus"
run_stage 100 "2m" "100vus"

echo ""
echo "✅ Load test complete. Reports in: $REPORTS_DIR/"

