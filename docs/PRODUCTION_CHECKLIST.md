# Production Deployment & Operation Guide

This guide details the steps and best practices for deploying the **Student Management System** to production.

---

## 1. System Architecture Overview

```
                      ┌──────────────────────────────┐
                      │   Cloudflare / Load Balancer │
                      │      (SSL Termination)       │
                      └──────────────┬───────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼                                       ▼
    ┌──────────────────────────┐            ┌──────────────────────────┐
    │  Admin Frontend (NextJS) │            │ Student Portal (NextJS)  │
    │   Port 3000 / Vercel     │            │   Port 3001 / Vercel     │
    └────────────┬─────────────┘            └────────────┬─────────────┘
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     │ (HTTPS REST API / WSS)
                                     ▼
                      ┌──────────────────────────────┐
                      │    FastAPI Backend Server    │
                      │  (Uvicorn Multi-worker: 8000)│
                      └──────────────┬───────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼                                       ▼
    ┌──────────────────────────┐            ┌──────────────────────────┐
    │ PostgreSQL Database      │            │  LiveKit Video Server    │
    │ (Supabase/RDS/Cloud SQL) │            │   (WebRTC Classroom)     │
    └──────────────────────────┘            └──────────────────────────┘
```

---

## 2. Production Environment Variables Checklist

### Backend (`.env` / Hosting Environment)

| Variable | Description | Recommended Production Value |
| :--- | :--- | :--- |
| `PROJECT_NAME` | Service Name | `"School Management System"` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+psycopg://user:pass@host:5432/dbname?sslmode=require` |
| `JWT_SECRET` | Strong secret for signing tokens | Minimum 64-character random string (`openssl rand -hex 32`) |
| `ACCESS_TOKEN_MINUTES` | Access token lifespan | `15` |
| `REFRESH_TOKEN_DAYS` | Refresh token lifespan | `7` |
| `COOKIE_SECURE` | Enforces HTTPS-only cookies | `true` |
| `CORS_ORIGINS` | Permitted client origins | `["https://admin.yourdomain.com", "https://portal.yourdomain.com"]` |
| `EMAIL_BACKEND` | Delivery engine | `"smtp"` |
| `SMTP_HOST` | Production SMTP host | e.g. `smtp.sendgrid.net` or `email-smtp.us-east-1.amazonaws.com` |
| `SMTP_PORT` | SMTP port | `587` (TLS) or `465` (SSL) |
| `SMTP_TLS` | Transport Layer Security | `true` |
| `RAZORPAY_KEY_ID` | Live Razorpay Key ID | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Live Razorpay Secret | Secret key from Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification secret | Secret configured in webhook settings |
| `LIVEKIT_URL` | LiveKit cloud/self-hosted URL | `wss://livekit.yourdomain.com` |
| `LIVEKIT_API_KEY` | LiveKit API Key | LiveKit production key |
| `LIVEKIT_API_SECRET` | LiveKit API Secret | LiveKit production secret |
| `HUGGINGFACE_API_TOKEN` | AI inference token | Token with read permissions |
| `AI_FALLBACK_DETERMINISTIC` | High-availability fallback | `true` |

---

## 3. Database Preparation & Migration

1. **Verify Connection**:
   Ensure PostgreSQL 15+ is running with SSL enabled.
2. **Execute Head Migration**:
   ```bash
   alembic upgrade head
   ```
3. **Verify Current Migration**:
   ```bash
   alembic current
   # Expected output: 09392ae07224 (head)
   ```
4. **Seed Super Admin**:
   ```bash
   SEED_SUPER_ADMIN_EMAIL="superadmin@yourdomain.com" \
   SEED_SUPER_ADMIN_PASSWORD="YourStrongSecurePassword123!" \
   python scripts/seed_super_admin.py
   ```

---

## 4. Health & Monitoring Probes

Configure your load balancer or container health checks with:
- **Liveness Probe**: `GET /health` (Response: `{"status": "ok", ...}`)
- **Readiness Probe**: `GET /health/ready` (Verifies DB connection; returns HTTP 200 `{"status": "ready", "database": "connected"}` or HTTP 503 if disconnected)

---

## 5. Security & Hardening Features

- **OWASP Headers**: Automatically injected on all HTTP responses:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (when `COOKIE_SECURE=True`)
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Rate Limiting**: slowapi rate limiter active across auth, sensitive APIs, and public endpoints.
- **Connection Pooling**: Pre-ping heartbeat (`pool_pre_ping=True`) with 300s recycling to prevent stale connection drops.
