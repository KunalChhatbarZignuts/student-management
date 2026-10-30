# Student Management System - Admin Frontend

The administrative frontend for the Student Management System, serving **SUPER_ADMIN**, **ADMIN**, and **TEACHER** roles. Built with Next.js (App Router), TypeScript, Material UI v6, TanStack Query v5, Axios, Zustand, and MUI X DataGrid.

---

## Roles & Route Access Matrix

| Role | Permitted Areas |
| :--- | :--- |
| **SUPER_ADMIN** | All pages: Dashboard, Students, Teachers, User Accounts, Bulk Import, Applications, Parent Linking, Audit Logs |
| **ADMIN** | Dashboard, Students, Teachers, Bulk Import, Applications, Parent Linking, Audit Logs |
| **TEACHER** | Dashboard, My Classes, Report Missing Student, Profile & Security |
| **STUDENT / PARENT** | **Blocked.** Displays *"You don't have access to this portal"* and initiates instant logout. |

---

## Auth Architecture

- **Access Token:** Kept strictly in memory inside the Zustand store (`accessToken`). Never written to `localStorage`, `sessionStorage`, or readable cookies.
- **Refresh Token:** Sent by the FastAPI backend as an `httpOnly`, `SameSite=Strict` cookie (`refresh_token`).
- **Next.js Proxy Rewrite:** Next.js proxies all `/api/*` browser calls to the backend (`http://localhost:8000`), ensuring the refresh cookie remains first-party and eliminating CORS issues.
- **Single-Flight Refresh:** Axios response interceptor uses a mutex queue so concurrent 401 requests trigger **only a single refresh call**, queueing dependent requests and retrying once refreshed.
- **Multi-Tab Sync:** Active sessions coordinate logout using the browser `BroadcastChannel` API.
- **Two-Factor Authentication:** Mandatory 6-digit OTP verification screen during login when 2FA is enabled.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Key variables:
- `API_URL`: Backend URL (default: `http://localhost:8000`)
- `NEXT_PUBLIC_APP_NAME`: Display portal title

### 3. Run Development Server
```bash
npm run dev
```
Runs at: [http://localhost:3000](http://localhost:3000)

### 4. Run Test Suite
```bash
npm run test
```
Executes Vitest, React Testing Library, and MSW tests.

### 5. Production Build
```bash
npm run build
npm run start
```

---

## OpenAPI Types Generation
When the FastAPI backend is running, generate TypeScript types matching the backend models via:
```bash
npx openapi-typescript http://localhost:8000/openapi.json -o src/lib/api-types.ts
```

