# Student Management System - Student Portal

The learner and guardian portal for the Student Management System, serving **STUDENT** and **PARENT** roles. Built with Next.js (App Router), TypeScript, Material UI v6, TanStack Query v5, Axios, and Zustand.

---

## Roles & Route Access Matrix

| Role | Permitted Areas |
| :--- | :--- |
| **STUDENT** | Dashboard, My Profile, Marks & Grades, Attendance Records, Fee Details |
| **PARENT** | Dashboard, My Children (with child switcher), Marks, Attendance, Fee Details, Profile |
| **STAFF / ADMIN** | **Blocked.** Displays *"You don't have access to this portal"* and initiates instant logout. |

---

## Auth Architecture

- **Access Token:** Kept strictly in memory inside the Zustand store (`accessToken`). Never written to `localStorage` or `sessionStorage`.
- **Refresh Token:** First-party `httpOnly`, `SameSite=Strict` cookie (`refresh_token`).
- **Next.js Proxy Rewrite:** Next.js proxies all `/api/*` browser calls to the backend (`http://localhost:8000`).
- **Single-Flight Refresh:** Axios response interceptor prevents duplicate refresh requests on concurrent 401s.
- **Multi-Tab Sync:** Active sessions coordinate logout using the browser `BroadcastChannel` API.

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
- `NEXT_PUBLIC_APP_NAME`: Display portal title (default: `Student Portal`)

### 3. Run Development Server
```bash
npm run dev
```
Runs at: [http://localhost:3001](http://localhost:3001) (port 3001 to run alongside admin-frontend)

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
