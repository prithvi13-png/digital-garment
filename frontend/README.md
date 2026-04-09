# Digital Factory Management System - Frontend

Next.js admin UI for factory owners, supervisors, and viewers.

## Tech Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- React Query
- React Hook Form + Zod
- Recharts
- OpenNext + Cloudflare Workers

## Prerequisites
- Node.js 20+
- Backend running at `http://localhost:8000` (or your configured host)

## 1) Install
```bash
cd frontend
npm install
```

## 2) Configure Environment
```bash
cp .env.example .env.local
```

Set:
- `NEXT_PUBLIC_API_BASE_URL` (must include `/api/v1`)

Example:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

## 3) Start Development Server
```bash
npm run dev
```

App URL: `http://localhost:3000`

## 4) Production Build
```bash
npm run build
npm run start
```

## Cloudflare Deploy (Recommended)
1. Login to Cloudflare:
   ```bash
   npx wrangler login
   ```
2. Set production API URL in Cloudflare project env:
   - `NEXT_PUBLIC_API_BASE_URL=https://<your-backend-domain>/api/v1`
3. Deploy:
   ```bash
   npm run deploy
   ```
4. Attach your custom domain in Cloudflare dashboard (for example `factory.your-domain.com`).
5. Add this exact frontend origin to backend env:
   - `CORS_ALLOWED_ORIGINS`
   - `CSRF_TRUSTED_ORIGINS`

## Scripts
```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run start
npm run preview
npm run deploy
npm run cf-typegen
```

## Login Accounts (from backend seed)
- Admin: `admin` / `Admin@123`
- Supervisor: `sup_amit` / `Supervisor@123`
- Supervisor: `sup_neha` / `Supervisor@123`
- Viewer: `viewer_raj` / `Viewer@123`

## Key Features
- JWT auth with refresh flow
- Auth-protected routes and role-aware navigation
- Dashboard KPIs, line-performance chart, recent entries/activity
- Buyers, lines, orders, production entries, users management screens
- Reports with filtering and CSV export
- Loading/error/empty states, pagination, confirm delete actions

## Notes
- If backend URL changes, update `NEXT_PUBLIC_API_BASE_URL`.
- Frontend expects backend routes under `/api/v1/`.
- Cloudflare config lives in `wrangler.jsonc` and `open-next.config.ts`.
