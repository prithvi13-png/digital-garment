# Digital Factory Management System

Full-stack garment factory management platform.

## Apps
- Backend: Django + DRF + PostgreSQL (`/backend`)
- Frontend: Next.js + TypeScript + Tailwind (`/frontend`)

## Recommended Live Architecture
- Frontend: Cloudflare Workers (OpenNext)
- Backend: Render Web Service (Django + Gunicorn)
- Database: Render PostgreSQL (managed)

## Quick Start

### 1) Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

### 2) Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend URL: `http://localhost:3000`
Backend URL: `http://localhost:8000`

## Seed Credentials
- Admin: `admin` / `Admin@123`
- Supervisor: `sup_amit` / `Supervisor@123`
- Supervisor: `sup_neha` / `Supervisor@123`
- Viewer: `viewer_raj` / `Viewer@123`

## Project Scope Implemented
- Auth + role-based access
- Buyers, lines, orders, production entries, users APIs and UI
- Order status/stage business rules
- Dashboard summary + line performance + activities
- Reports with filters and CSV exports
- Seed command and setup docs
