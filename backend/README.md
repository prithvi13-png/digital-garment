# Digital Factory Management System - Backend

Django + DRF backend for garment factory operations.

## Tech Stack
- Django 5
- Django REST Framework
- PostgreSQL
- JWT (`djangorestframework-simplejwt`)
- `django-filter`
- Gunicorn + WhiteNoise (production server/static files)

## Prerequisites
- Python 3.11+
- PostgreSQL 14+

## 1) Install
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 2) Configure Environment
```bash
cp .env.example .env
```

Set a strong `SECRET_KEY` (32+ chars). Example generator:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Database config options:
- Option A: fill `POSTGRES_*` variables
- Option B: set `DATABASE_URL` (takes precedence)

## 3) Run Database Migrations
```bash
python manage.py migrate
```

## 4) Seed Sample Data
```bash
python manage.py seed_data
```

## 5) Start Server
```bash
python manage.py runserver
```

Base API URL: `http://localhost:8000/api/v1/`
Health URL: `http://localhost:8000/api/v1/health/`

## Seed Credentials
- Admin: `admin` / `Admin@123`
- Supervisor: `sup_amit` / `Supervisor@123`
- Supervisor: `sup_neha` / `Supervisor@123`
- Viewer: `viewer_raj` / `Viewer@123`

## Core Endpoints
- Auth
  - `POST /api/v1/auth/login/`
  - `POST /api/v1/auth/refresh/`
  - `GET /api/v1/auth/me/`
- Users
  - `GET|POST /api/v1/users/`
  - `GET|PATCH|DELETE /api/v1/users/{id}/`
- Buyers
  - `GET|POST /api/v1/buyers/`
  - `GET|PATCH|DELETE /api/v1/buyers/{id}/`
- Production lines
  - `GET|POST /api/v1/lines/`
  - `GET|PATCH|DELETE /api/v1/lines/{id}/`
- Orders
  - `GET|POST /api/v1/orders/`
  - `GET|PATCH|DELETE /api/v1/orders/{id}/`
  - `GET /api/v1/orders/{id}/production-summary/`
- Production entries
  - `GET|POST /api/v1/production-entries/`
  - `GET|PATCH|DELETE /api/v1/production-entries/{id}/`
- Dashboard
  - `GET /api/v1/dashboard/summary/`
  - `GET /api/v1/dashboard/line-performance/`
  - `GET /api/v1/dashboard/recent-activities/`
- Reports
  - `GET /api/v1/reports/production/`
  - `GET /api/v1/reports/orders/`
  - `GET /api/v1/reports/export/production-csv/`
  - `GET /api/v1/reports/export/orders-csv/`

## Useful Commands
```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py createsuperuser
```

## Production Recommendation
- Frontend: Cloudflare Workers (Next.js via OpenNext)
- Backend API: Render Web Service (`render.yaml` included)
- Database: Render PostgreSQL (managed, auto `DATABASE_URL`)

This gives you:
- simple deployment and rollback
- managed PostgreSQL backups
- clean CORS setup with your Cloudflare frontend domain

## Production Deploy (Backend on Render)
1. Push repo to GitHub.
2. In Render, create Blueprint from this repo (`render.yaml` at root).
3. Update these env vars in Render:
   - `ALLOWED_HOSTS` -> your backend domain(s), comma-separated
   - `CORS_ALLOWED_ORIGINS` -> Cloudflare frontend origin(s), comma-separated
   - `CSRF_TRUSTED_ORIGINS` -> same frontend origin(s) with `https://`
4. Keep `DEBUG=False` and `DJANGO_ENV=production`.
5. After first deploy, run seed once using Render Shell:
   ```bash
   python manage.py seed_data
   ```
6. API goes live at:
   - `https://<your-backend-domain>/api/v1/`
   - `https://<your-backend-domain>/api/v1/health/`

## Production Env Variables
Use `backend/.env.example` as reference. Important keys:
- `DATABASE_URL` (managed Postgres URL)
- `SECRET_KEY`
- `DEBUG=False`
- `DJANGO_ENV=production`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `SECURE_SSL_REDIRECT=True`
- `SESSION_COOKIE_SECURE=True`
- `CSRF_COOKIE_SECURE=True`

## Notes
- Order status is auto-synced by stage, delivery date, and production activity.
- CSV exports are implemented for production and orders reports.
- CORS is controlled via `CORS_ALLOWED_ORIGINS`.
