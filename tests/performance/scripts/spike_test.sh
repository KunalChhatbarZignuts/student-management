#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Spike Test — Sudden jump from 10 → 150 VUs for 30s, then back to 10
# Measures how quickly the system recovers from a sudden traffic spike.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/tests/performance/reports"
LOCUSTFILE="$PROJECT_ROOT/tests/performance/scripts/locustfile.py"

echo "=== Spike Test: 10 VUs → 150 VUs (60s) → 10 VUs (30s recovery) ==="
echo ""

cd "$PROJECT_ROOT"
source venv/bin/activate

# Phase 1: steady baseline
echo "--- Phase 1: Baseline (10 VUs × 30s) ---"
python -m locust \
    --headless --users 10 --spawn-rate 2 --run-time 30s \
    --host http://127.0.0.1:8000 \
    --html "$REPORTS_DIR/spike_phase1_report.html" \
    --csv "$REPORTS_DIR/spike_phase1" \
    -f "$LOCUSTFILE" 2>&1 | tee "$REPORTS_DIR/spike_phase1_stdout.txt"

# Phase 2: spike
echo "--- Phase 2: Spike (150 VUs × 60s) ---"
python -m locust \
    --headless --users 150 --spawn-rate 50 --run-time 60s \
    --host http://127.0.0.1:8000 \
    --html "$REPORTS_DIR/spike_peak_report.html" \
    --csv "$REPORTS_DIR/spike_peak" \
    -f "$LOCUSTFILE" 2>&1 | tee "$REPORTS_DIR/spike_peak_stdout.txt"

# Phase 3: recovery
echo "--- Phase 3: Recovery (10 VUs × 30s) ---"
python -m locust \
    --headless --users 10 --spawn-rate 2 --run-time 30s \
    --host http://127.0.0.1:8000 \
    --html "$REPORTS_DIR/spike_recovery_report.html" \
    --csv "$REPORTS_DIR/spike_recovery" \
    -f "$LOCUSTFILE" 2>&1 | tee "$REPORTS_DIR/spike_recovery_stdout.txt"

echo ""
echo "✅ Spike test complete. Reports in: $REPORTS_DIR/"

