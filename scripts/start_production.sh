#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Starting School Management System in Production Mode"
echo "=========================================================="

# 1. Environment validation
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set."
    exit 1
fi

if [ "$JWT_SECRET" = "change-me-in-production" ] || [ -z "$JWT_SECRET" ]; then
    echo "WARNING: JWT_SECRET is unset or using the default insecure value."
fi

# 2. Run Database Migrations
echo "==> Running database migrations to ensure schema is up-to-date..."
./venv/bin/alembic upgrade head || alembic upgrade head

# 3. Determine worker count (default to 4 or CPU count based)
WORKERS=${WEB_CONCURRENCY:-4}
PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}

echo "==> Starting ASGI server with $WORKERS worker processes on $HOST:$PORT..."
if command -v ./venv/bin/uvicorn >/dev/null 2>&1; then
    exec ./venv/bin/uvicorn app.main:app \
        --host "$HOST" \
        --port "$PORT" \
        --workers "$WORKERS" \
        --proxy-headers \
        --forwarded-allow-ips "*"
else
    exec uvicorn app.main:app \
        --host "$HOST" \
        --port "$PORT" \
        --workers "$WORKERS" \
        --proxy-headers \
        --forwarded-allow-ips "*"
fi
