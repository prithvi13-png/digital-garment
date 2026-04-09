Build a complete full-stack web application called “Digital Factory Management System” for a garment factory.

Tech stack:
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- Backend: Django + Django REST Framework
- Database: PostgreSQL
- Authentication: JWT using djangorestframework-simplejwt
- State management on frontend: use React Query or built-in fetch patterns with clean reusable hooks
- Forms: use React Hook Form + Zod validation on frontend
- Charts: use a lightweight chart library for dashboard visualizations
- Styling: premium, modern, clean SaaS-like admin UI, responsive for desktop/tablet/mobile
- Deployment-ready structure
- Clean, scalable, maintainable code
- Do not generate pseudo-code. Generate real working code with proper file structure.

Important:
- Build the backend and frontend as separate apps.
- Backend should expose REST APIs.
- Frontend should consume backend APIs.
- Keep the system practical and simple for factory supervisors and owners.
- Avoid over-engineering.
- Focus on usability, speed, clarity, and clean architecture.
- Generate all necessary files.
- Include setup instructions and environment variables.
- Include seed/sample data.
- Include validation, error handling, loading states, and empty states.
- Include meaningful comments only where useful.
- Use best practices.

==================================================
PRODUCT OVERVIEW
==================================================

This system is for a garment factory to digitize operations that are currently done using paper registers, Excel, phone calls, and manual coordination.

Phase-1 scope:
1. User authentication and role-based access
2. Order management
3. Production tracking
4. Management dashboard
5. Reports
6. Basic settings and master data

Primary business goal:
- Give factory owner complete visibility into production and order progress
- Help supervisors enter production data easily
- Track orders from creation to dispatch
- Identify delayed orders
- Show daily production summary and line performance
- Replace manual reporting

User roles:
1. Admin
   - Full access
   - Manage users
   - Manage orders
   - View dashboard and reports
   - Manage master settings
2. Supervisor
   - Login
   - View assigned/available orders
   - Enter daily production data
   - Update order stage if allowed
   - View limited dashboard/report access
3. Viewer
   - Read-only access
   - Can view dashboard and reports
   - Cannot edit data

==================================================
CORE BUSINESS FLOW
==================================================

End-to-end business flow:
1. Admin logs in
2. Admin creates an order for a buyer
3. Order has style name, quantity, delivery date, and current stage
4. Supervisor logs production entries daily for a line against an order
5. System aggregates produced quantities
6. System shows target vs achieved for each line/order/day
7. Order stage progresses through:
   Cutting -> Stitching -> QC -> Packing -> Dispatch
8. If order reaches Dispatch, status becomes Completed
9. If current date exceeds delivery date and order is not completed, mark as Delayed
10. Dashboard shows:
   - Total production today
   - Orders in progress
   - Delayed orders
   - Completed orders
   - Line performance
   - Recent production entries
11. Reports can be filtered by date range, line, order, buyer, stage, status
12. Export reports to CSV initially; structure code cleanly so PDF can be added later

==================================================
MASTER DATA / ENTITIES
==================================================

Create these backend models and corresponding admin/API/frontend support where relevant:

1. User
- Extend Django auth user or use custom user model
- Fields:
  - id
  - first_name
  - last_name
  - username
  - email
  - password
  - role: admin / supervisor / viewer
  - is_active
  - created_at
  - updated_at

2. Buyer
- id
- name
- company_name
- email (optional)
- phone (optional)
- address (optional)
- notes (optional)
- created_at
- updated_at

3. ProductionLine
- id
- name or line_number
- description (optional)
- is_active
- created_at
- updated_at

4. Order
- id
- order_code (human-friendly unique code, auto-generated like ORD-0001)
- buyer (FK to Buyer)
- style_name
- style_code (optional)
- quantity
- target_per_day (optional)
- delivery_date
- current_stage: cutting / stitching / qc / packing / dispatch
- status: pending / in_progress / completed / delayed
- priority: low / medium / high
- notes (optional)
- created_by (FK User)
- created_at
- updated_at

5. ProductionEntry
- id
- date
- production_line (FK to ProductionLine)
- supervisor (FK User)
- order (FK Order)
- target_qty
- produced_qty
- rejected_qty (default 0)
- remarks (optional)
- created_at
- updated_at

6. ActivityLog
- id
- user (FK User)
- action
- entity_type
- entity_id
- description
- created_at

Optional if needed for clean structure:
7. DashboardSnapshot service layer or serializers, but not necessarily a DB model

==================================================
BUSINESS RULES
==================================================

Implement these rules exactly:

1. Order status logic:
- New orders default to status = pending
- Once production starts or stage changes from initial state, status can become in_progress
- When current_stage == dispatch, status = completed
- If today > delivery_date and status != completed, status = delayed
- If delayed order is later dispatched, status becomes completed

2. Production rules:
- produced_qty cannot be negative
- target_qty cannot be negative
- rejected_qty cannot be negative
- rejected_qty cannot exceed produced_qty unless explicitly justified; simplest approach: rejected_qty <= produced_qty
- A production entry must belong to one order and one line
- Supervisor role should only create/update production entries, not delete orders
- Admin can manage all data

3. Dashboard calculations:
- Today production = sum(produced_qty) for current day
- Total rejected today = sum(rejected_qty) for current day
- Orders in progress = count(status=in_progress)
- Delayed orders = count(status=delayed)
- Completed orders = count(status=completed)
- Line performance = grouped aggregate by line for selected date range
- Recent activities = latest ActivityLog items

4. Filters:
- Reports and listing pages must support filtering by:
  - date range
  - buyer
  - order
  - line
  - stage
  - status
  - supervisor where relevant

==================================================
BACKEND REQUIREMENTS
==================================================

Create a Django backend with clean modular structure.

Recommended backend app structure:
- accounts
- buyers
- production_lines
- orders
- production
- dashboard
- reports
- common or core

Need:
- settings for development
- environment variable support using python-dotenv or django-environ
- CORS support for frontend
- DRF configuration
- JWT auth
- pagination
- filtering using django-filter
- proper serializers
- viewsets or APIViews where appropriate
- URL versioning under /api/v1/

Create all migrations.

Create a custom user model.

Use PostgreSQL config through environment variables.

Implement role-based permissions:
- Admin: full access
- Supervisor: limited CRUD on production entries, read access to orders/buyers/lines/dashboard/reports
- Viewer: read-only

Create API endpoints:

Auth:
- POST /api/v1/auth/login/
- POST /api/v1/auth/refresh/
- GET /api/v1/auth/me/

Users:
- GET /api/v1/users/
- POST /api/v1/users/
- GET /api/v1/users/{id}/
- PATCH /api/v1/users/{id}/
- DELETE /api/v1/users/{id}/

Buyers:
- GET /api/v1/buyers/
- POST /api/v1/buyers/
- GET /api/v1/buyers/{id}/
- PATCH /api/v1/buyers/{id}/
- DELETE /api/v1/buyers/{id}/

Production lines:
- GET /api/v1/lines/
- POST /api/v1/lines/
- GET /api/v1/lines/{id}/
- PATCH /api/v1/lines/{id}/
- DELETE /api/v1/lines/{id}/

Orders:
- GET /api/v1/orders/
- POST /api/v1/orders/
- GET /api/v1/orders/{id}/
- PATCH /api/v1/orders/{id}/
- DELETE /api/v1/orders/{id}/
- GET /api/v1/orders/{id}/production-summary/

Production entries:
- GET /api/v1/production-entries/
- POST /api/v1/production-entries/
- GET /api/v1/production-entries/{id}/
- PATCH /api/v1/production-entries/{id}/
- DELETE /api/v1/production-entries/{id}/

Dashboard:
- GET /api/v1/dashboard/summary/
- GET /api/v1/dashboard/line-performance/
- GET /api/v1/dashboard/recent-activities/

Reports:
- GET /api/v1/reports/production/
- GET /api/v1/reports/orders/
- GET /api/v1/reports/export/production-csv/
- GET /api/v1/reports/export/orders-csv/

Backend implementation expectations:
- Use serializers with validation
- Use model managers or service layer if necessary for status updates
- Auto-generate order_code
- Automatically recalculate order status where needed
- Log key actions to ActivityLog:
  - login optional
  - order created
  - order updated
  - production entry created
  - production entry updated
  - buyer created
  - user created

Add sample seed command or fixtures:
- 1 admin user
- 2 supervisors
- 1 viewer
- 3 buyers
- 3 lines
- 5 orders
- 10+ production entries

Provide backend README with:
- setup
- migrations
- seed data
- runserver
- environment variables

==================================================
FRONTEND REQUIREMENTS
==================================================

Create a premium admin-style frontend using Next.js App Router + TypeScript + Tailwind.

Frontend must include:
- Login page
- Auth-protected routes
- Role-based navigation visibility
- Responsive sidebar + topbar
- Modern dashboard cards
- Data tables with filters/search
- Reusable form components
- Toast notifications
- Confirm dialogs for destructive actions
- Loading skeletons
- Error states
- Empty states

Pages required:

1. Login
- Username/email + password
- Validation
- Store JWT securely in a practical way
- Handle refresh token flow
- Redirect by role after login

2. Dashboard
Show:
- KPI cards:
  - Today production
  - Rejected today
  - Orders in progress
  - Delayed orders
  - Completed orders
- Charts:
  - Line performance
  - Daily production trend
- Recent activities
- Recent orders
- Quick actions

3. Buyers
- List page with search/filter
- Create buyer modal/page
- Edit buyer
- Delete buyer
- View buyer details with linked orders

4. Production Lines
- List page
- Create/edit/delete line
- Active/inactive toggle

5. Orders
- List page with filters:
  - buyer
  - stage
  - status
  - priority
  - delivery date
- Create order form
- Edit order form
- Order details page
  Show:
  - order info
  - buyer info
  - current stage
  - status badge
  - production summary
  - related production entries
- Ability to update stage
- Visual stage progression UI

6. Production Entries
- List page with filters:
  - date
  - line
  - supervisor
  - order
- Create production entry form
- Edit production entry form
- Delete production entry for admin only
- Fast-entry UX for supervisors
- Show computed efficiency in row/detail view

7. Reports
- Production report page
- Orders report page
- Filter controls
- Summary cards
- Export CSV buttons

8. Users
- Admin only
- List/create/edit users
- Assign roles
- Activate/deactivate user

9. Profile / Me
- Show logged-in user info
- Logout

UI style expectations:
- Premium but practical
- White/gray base with blue/teal accents
- Soft shadows
- Rounded cards
- Clean tables
- Good spacing
- Factory-friendly clarity
- No flashy unnecessary animations

Frontend architecture:
- app/ routes structured cleanly
- components/
  - layout
  - ui
  - forms
  - tables
  - charts
  - status badges
- lib/
  - api client
  - auth helpers
  - constants
  - utilities
- hooks/
- types/
- services/ optional if useful

Use reusable types matching backend schema.

Implement protected route middleware or layout guard.

Implement API client with token refresh handling.

Implement role-aware navigation:
Admin sees:
- Dashboard
- Buyers
- Lines
- Orders
- Production Entries
- Reports
- Users
Supervisor sees:
- Dashboard
- Orders
- Production Entries
- Reports
Viewer sees:
- Dashboard
- Orders
- Reports

==================================================
FORM DETAILS
==================================================

Order create/edit form fields:
- buyer
- style_name
- style_code
- quantity
- target_per_day
- delivery_date
- current_stage
- priority
- notes

Buyer form:
- name
- company_name
- email
- phone
- address
- notes

Production entry form:
- date
- production_line
- supervisor
- order
- target_qty
- produced_qty
- rejected_qty
- remarks

User form:
- first_name
- last_name
- username
- email
- password on create
- role
- is_active

Add frontend validation for all forms using Zod.

==================================================
SPECIAL UX REQUIREMENTS
==================================================

1. Dashboard should feel immediately useful to a factory owner.
2. Production entry form should be quick and easy for repeated daily usage.
3. Order list should clearly highlight delayed orders.
4. Status badges:
- Pending: gray
- In Progress: blue
- Completed: green
- Delayed: red
5. Stage badges:
- Cutting
- Stitching
- QC
- Packing
- Dispatch
6. Add useful empty state messages.
7. Add confirmation before deleting any record.
8. Add pagination on long lists.
9. Add debounced search where useful.
10. Make entire UI mobile responsive.

==================================================
NON-FUNCTIONAL REQUIREMENTS
==================================================

- Clean code
- Strong typing on frontend
- Serializer validation on backend
- Proper error responses
- No hardcoded secrets
- .env.example files for frontend and backend
- README for both apps
- CORS configured safely for development
- Use timezone-aware date handling
- Use consistent API response shapes where practical
- Code should run locally without manual guesswork
- Do not skip imports
- Do not leave TODO placeholders for critical logic

==================================================
DELIVERABLES EXPECTED FROM YOU
==================================================

Generate:
1. Complete backend Django project
2. Complete frontend Next.js project
3. All models, serializers, views, urls, permissions, utilities
4. JWT authentication flow
5. Seed/sample data
6. Responsive UI pages
7. API integration
8. CSV export support
9. README files
10. .env.example files
11. Requirements.txt for backend
12. package.json dependencies for frontend
13. Clear local setup steps
14. Reasonable dummy/sample data in UI if needed through seed
15. A polished final structure with no missing essential files

==================================================
SUGGESTED FILE STRUCTURE
==================================================

Use a clean file structure like this or better:

backend/
  manage.py
  config/
  apps/
    accounts/
    buyers/
    production_lines/
    orders/
    production/
    dashboard/
    reports/
    core/
  requirements.txt
  .env.example
  README.md

frontend/
  src/
    app/
    components/
    hooks/
    lib/
    types/
  public/
  package.json
  .env.example
  README.md

==================================================
IMPLEMENTATION ORDER
==================================================

Build in this order:
1. Backend project setup
2. Custom user model and auth
3. Buyers, lines, orders, production models
4. Serializers, permissions, APIs
5. Dashboard aggregation APIs
6. Reports APIs and CSV exports
7. Seed data
8. Frontend setup and layout
9. Auth integration
10. Dashboard UI
11. CRUD pages
12. Reports UI
13. Final polish

==================================================
FINAL INSTRUCTION
==================================================

Return the full implementation in a structured way, file by file, with complete code.
Do not summarize only.
Do not omit important files.
Do not leave gaps in authentication, permissions, filters, validation, or API integration.
Make the result practical and runnable.
This is a real project starter, not a demo toy app.