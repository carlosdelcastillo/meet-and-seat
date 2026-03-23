# CLAUDE.md — Meet & Seat

Project context and conventions for Claude Code. Read this before making any changes.

---

## What this project is

**Meet & Seat** is a workspace booking platform for reserving meeting rooms and desks. It is a pre-launch project, actively in development, not yet in production.

---

## Repository layout

```shell
meet-and-seat/
├── docker-compose.yml          # PostgreSQL 16 + backend + frontend
├── backend/                    # FastAPI app (Python 3.13)
│   ├── app/
│   │   ├── adapters/inbound/api/v1/
│   │   │   ├── routes/         # FastAPI routers (bookings, users, dashboard, brand, auth)
│   │   │   ├── schemas/        # Pydantic request/response models
│   │   │   └── middleware/     # JWT auth, error mapping
│   │   ├── application/
│   │   │   ├── commands/       # Write use cases (CreateBooking, UpdateUser, …)
│   │   │   └── queries/        # Read use cases (GetDashboard, ListResources, …)
│   │   ├── domain/
│   │   │   ├── entities.py     # User, Booking, Resource, BrandSettings
│   │   │   ├── value_objects.py# TimeSlot, HexColor
│   │   │   ├── exceptions.py   # Domain exceptions
│   │   │   └── ports/          # Abstract interfaces (repositories, stats reader)
│   │   └── infrastructure/
│   │       ├── persistence/
│   │       │   ├── orm_models.py        # SQLAlchemy models
│   │       │   ├── repositories/        # SQLAlchemy implementations
│   │       │   ├── stats_reader.py      # Dashboard + user stats queries
│   │       │   ├── database.py          # Async engine, session factory
│   │       │   ├── seed.py              # Demo data seeded on first run
│   │       │   └── migrations/          # Alembic (not run at startup, for future use)
│   │       ├── security/        # JWT encode/decode, password hashing
│   │       └── di/              # Dependency injection factory functions
│   ├── tests/
│   │   ├── unit/                # Domain + application layer tests (mocked repos)
│   │   └── integration/         # Full API tests via TestClient + SQLite in-memory
│   ├── requirements.txt         # Production deps only
│   ├── requirements-dev.txt     # -r requirements.txt + pytest/ruff/bandit/httpx/aiosqlite
│   ├── pyproject.toml           # pytest config, bandit config, requires-python = ">=3.13"
│   ├── .python-version          # 3.13 (pyenv/mise)
│   └── Dockerfile               # python:3.13-slim
└── frontend/                   # React 19 + TypeScript + Vite
    ├── src/
    │   ├── components/
    │   │   ├── booking/         # BookingCalendar, BookingCard, BookingForm, BookingTimeline, MonthCalendar
    │   │   ├── dashboard/       # StatsCards, MyStatsPanel, charts (Recharts), TopUsersTable
    │   │   ├── admin/           # ResourceManager, UserManager, BrandingPanel
    │   │   └── ui/              # Modal, Toast, Spinner, TimePicker
    │   ├── context/             # AuthContext, BrandContext, ThemeContext
    │   ├── hooks/               # useBookings, useResources, useDashboard, useHolidays
    │   ├── pages/               # BookingsPage, MyBookingsPage, DashboardPage, LoginPage, AdminPage
    │   ├── utils/
    │   │   ├── dates.ts         # todayStr, getMonday, getWeekDays, formatDate, formatTime
    │   │   ├── holidays.ts      # OpenHolidays API fetch, deduplication, formatHoliday
    │   │   ├── apiErrors.ts     # translateApiError — maps backend error strings to i18n keys
    │   │   └── md5.ts           # Gravatar hash
    │   ├── i18n/
    │   │   └── locales/         # es.json, en.json, ca.json
    │   ├── api/client.ts        # Typed fetch wrapper, attaches JWT from localStorage
    │   └── types/index.ts       # Shared TypeScript interfaces
    ├── tests/
    │   ├── unit/                # Vitest + Testing Library
    │   └── e2e/                 # Playwright (login, booking flows)
    └── public/favicon.svg       # SVG favicon: meeting table top-view, teal background
```

---

## Architecture — backend

Strict **hexagonal architecture**. The dependency rule flows inward only:

```
HTTP → Adapter → Application (handler) → Domain ← Infrastructure
```

- **Domain** (`entities`, `value_objects`, `exceptions`, `ports`) has zero external imports. All business rules live here.
- **Application** (`commands/`, `queries/`) contains handlers that orchestrate domain + ports. No FastAPI, no SQLAlchemy.
- **Adapters** (`routes/`, `schemas/`, `middleware/`) translate HTTP ↔ application layer.
- **Infrastructure** implements the ports (repositories, stats reader, security).
- **DI** (`infrastructure/di/`) provides factory functions injected via FastAPI `Depends`.

Every new use case = new Command or Query class + Handler class. Never put business logic in routes.

---

## Database

- PostgreSQL 16 in production (Docker), SQLite + aiosqlite in tests.
- Schema created via `Base.metadata.create_all` on startup (idempotent for new DBs).
- **No Alembic at startup** — the project hasn't launched, so schema changes require `docker compose down -v` to wipe the volume and recreate. The Alembic migration at `migrations/versions/0001_initial_schema.py` is kept for future use only.
- When the schema changes locally: `docker compose down -v && docker compose up --build`.

### Key indexes on `bookings`

| Index | Columns | Rationale |
|---|---|---|
| `ix_bookings_resource_id` | `resource_id` | FK lookup |
| `ix_bookings_user_id` | `user_id` | FK lookup |
| `ix_bookings_booking_date` | `booking_date` | Date filter |
| `ix_bookings_resource_date` | `resource_id, booking_date` | Calendar view (most frequent query) |
| `ix_bookings_user_date` | `user_id, booking_date` | Personal stats by period |
| `uq_booking_resource_user_date` | `resource_id, user_id, booking_date` | Unique constraint (also acts as index) |

---

## API conventions

- All routes under `/api/v1/`
- Auth: `Authorization: Bearer <jwt>` on every protected route
- JWT payload: `{ sub: user_id, role: "admin"|"user" }`
- Errors: `{ "detail": "<message>" }` — backend error strings are mapped to i18n keys in `frontend/src/utils/apiErrors.ts`
- Admin-only routes use `require_admin` dependency

### Main endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | — | Returns token + user |
| POST | `/auth/register` | — | Creates user |
| GET | `/auth/me` | user | Current user profile |
| GET | `/resources` | user | Active resources list |
| POST | `/resources` | admin | Create resource |
| GET | `/bookings?date=YYYY-MM-DD` | user | Bookings for date (all resources) |
| POST | `/bookings` | user | Create booking (`for_user_id` admin only) |
| PUT | `/bookings/{id}` | user | Update own booking (admin = any) |
| DELETE | `/bookings/{id}` | user | Delete own booking (admin = any) |
| GET | `/bookings/user/{user_id}` | admin | All bookings for a user |
| DELETE | `/bookings/user/{user_id}` | admin | Delete all bookings for a user |
| GET | `/dashboard` | user | Org stats + personal stats for current user |
| GET | `/users` | admin | User list |
| POST | `/users` | admin | Create user |
| PUT | `/users/{id}` | admin | Update user (role, is_active, password…) |
| DELETE | `/users/{id}` | admin | Delete user |
| GET | `/brand` | — | Brand settings |
| PUT | `/brand` | admin | Update brand settings |

---

## Frontend conventions

### State management
No global store. Each page/feature uses a custom hook:
- `useBookings` — fetch by date, by user, create, update, delete, delete all user bookings
- `useResources` — list resources
- `useDashboard` — fetch `/dashboard`
- `useHolidays(yearMonths[])` — fetch from OpenHolidays API, cached in state

### i18n
- `useTranslation()` returns `t(key, vars?)` — supports `{name}` interpolation
- Keys live in `src/i18n/locales/{es,en,ca}.json`
- Always add new keys to all 3 locales simultaneously
- API error strings are translated via `translateApiError(message, t)` in every catch block

### Error handling pattern
```typescript
try {
  await someApiCall();
} catch (err) {
  setError(err instanceof Error ? translateApiError(err.message, t) : t('common.error'));
  // or for toast-based pages:
  showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
}
```

### Booking calendar flow
1. `BookingCalendar` owns `selectedDate` and `weekStart` state
2. `fetchByDate(selectedDate)` fires on date change and on `refreshKey` prop change
3. Clicking an occupied timeline slot → expands that resource card (shows `BookingCard` list below)
4. Clicking a free slot → opens `BookingForm` pre-filled with that time
5. After creating a booking → increment `refreshKey` (no `window.location.reload()`)
6. Month calendar picker calls `onSelectDay(date, weekStart)` — sets both independently

### CSS variables (key ones)
```
--color-primary      #0F766E  (dark teal)
--color-accent       #2DD4BF  (light teal)
--color-danger       red
--color-text
--color-text-secondary
--color-text-muted
--color-surface
--color-border
--color-hover
--font-display       Outfit
```

---

## Running locally

### Full stack (Docker Compose)
```bash
docker compose up --build
# Frontend: http://localhost
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
```

The frontend Nginx config is templated (`nginx.conf.template`). The `BACKEND_URL` env var is injected at container start via the official nginx image's envsubst mechanism. Docker Compose sets `BACKEND_URL=http://backend:8000`. In standalone Docker, set it to whatever host the backend is reachable at.

### Backend only
```bash
cd backend
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
export MAS_DATABASE_URL=postgresql+asyncpg://meetandseat:meetandseat@localhost:5432/meetandseat
export MAS_SECRET_KEY=dev-secret-key
export MAS_CORS_ORIGINS=http://localhost:5173
uvicorn app.main:app --reload
```

### Frontend only
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

---

## Running tests

```bash
# Backend — from /backend with venv active
ruff check .
bandit -r app/ -q
MAS_DATABASE_URL=sqlite+aiosqlite:///./test.db \
  MAS_SECRET_KEY=test-secret \
  MAS_CORS_ORIGINS=http://localhost \
  pytest tests/ -v

# Frontend unit tests — from /frontend
npm test

# E2E (requires stack running at localhost:5173 + localhost:8000)
npx playwright test --reporter=list
```

All results as of last run: ruff ✅ · bandit ✅ · pytest 75/75 ✅ · vitest 25/25 ✅ · playwright 3/3 ✅

---

## Seed data

`app/infrastructure/persistence/seed.py` runs on every startup but is idempotent (checks for existing data before inserting). It creates:
- 1 admin user (`admin@meetandseat.com` / `Admin123!`)
- Several regular users with Spanish names
- 5 meeting rooms + 5 desks with realistic metadata
- ~50 demo bookings spread across recent weekdays

---

## Default credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@meetandseat.com` | `Admin123!` |
| User | `ana.garcia@meetandseat.com` | `User123!` |
