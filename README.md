# Meet & Seat

> Workspace booking platform — reserve meeting rooms and desks, manage resources, and track occupancy in real time.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python)
![Stack](https://img.shields.io/badge/FastAPI-0.135-009688?style=flat-square&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)

---

## Screenshots

### Login

![Login](docs/screenshots/01-login.png)

### Booking calendar — weekly view with timeline and holiday indicators

![Bookings](docs/screenshots/02-bookings.png)

### My bookings — manage your reservations with edit and delete

![My Bookings](docs/screenshots/04-my-bookings.png)

### Dashboard — occupancy stats, peak hours, and top users

![Dashboard](docs/screenshots/03-dashboard.png)

### Admin panel — branding, resources, and user management

![Admin](docs/screenshots/05-admin.png)

### Profile — personal data, password change, and calendar sync

![Profile](docs/screenshots/06-profile.png)

---

## Features

- **Room & desk booking** with conflict detection and 15-minute time slots
- **Weekly calendar view** with public holiday indicators (live from [OpenHolidays API](https://openholidaysapi.org))
- **Admin panel** — manage resources, users, and branding from a single interface
- **Analytics dashboard** — occupancy rate, peak hours, bookings by department, top users
- **User profile** — edit name and department, change password, Gravatar photo support
- **Calendar sync** — subscribe your bookings to Outlook, Google Calendar or Apple Calendar via iCal feed (read-only, ±12 months window)
- **Multi-language** — Spanish, English, Catalan
- **Light / dark / system theme**
- **Gravatar support** with automatic initials fallback
- **Fully containerised** — one command to run everything

---

## Calendar sync (iCal)

Each user can generate personal iCal subscription URLs from their profile page. The feeds are read-only and cover a rolling ±12-month window.

| Feed | URL | Contents |
| --- | --- | --- |
| My bookings | `/api/v1/calendar/{token}/me.ics` | Bookings made by the authenticated user |
| Meeting rooms | `/api/v1/calendar/{token}/rooms.ics` | All room bookings across the organisation |
| Desks | `/api/v1/calendar/{token}/desks.ics` | All desk bookings across the organisation |

Tokens are permanent and scoped per user. They can be regenerated from the profile page at any time — regenerating invalidates the previous URLs.

**Adding to Outlook 365 (web):** Calendar → Add calendar → Subscribe from web → paste URL.

---

## Tech Stack

### Backend

| Layer | Technology |
| --- | --- |
| Runtime | Python 3.13 |
| Framework | FastAPI + Uvicorn |
| ORM | SQLAlchemy 2 (async) |
| Database | PostgreSQL 16 via asyncpg |
| Auth | JWT (python-jose) + bcrypt |
| Calendar | icalendar (iCal / RFC 5545) |
| Architecture | Hexagonal (ports & adapters) |
| Linting | Ruff · Bandit |
| Tests | pytest-asyncio |

### Frontend

| Layer | Technology |
| --- | --- |
| UI | React 19 + TypeScript |
| Routing | React Router v7 |
| Charts | Recharts |
| Icons | Lucide React |
| Build | Vite 8 |
| Unit tests | Vitest + Testing Library |
| E2E tests | Playwright |

---

## Getting Started

### Quick start (demo / local testing)

The only prerequisite is [Docker](https://docs.docker.com/get-docker/) with Docker Compose.

```bash
git clone https://github.com/carlosdelcastillo/meet-and-seat.git
cd meet-and-seat
docker compose up --build
```

Once the containers are up, open <http://localhost> and log in with one of these accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@meetandseat.com` | `Admin123!` |
| User | `ana.garcia@meetandseat.com` | `User123!` |

The database seeds demo data automatically on first run — no extra steps needed. This includes
1 admin, 8 regular users, 5 meeting rooms, 5 desks, and ~50 sample bookings spread across the
current week.

| Service | URL |
| --- | --- |
| Frontend | <http://localhost> |
| Backend API | <http://localhost:8000> |
| Interactive API docs | <http://localhost:8000/docs> |

> **Note:** The bundled `docker-compose.yml` is intentionally configured for convenience — it uses
> a local PostgreSQL container and a placeholder secret key. **Do not use it in production.**

---

### Production deployment

The recommended production setup separates the application tier from the database and terminates
TLS at the edge.

#### Infrastructure overview

- **Database** — Use a managed PostgreSQL service (AWS RDS, Supabase, Neon, Railway Postgres, etc.).
  Do not run PostgreSQL as a container on the same host as the application.
- **Backend** — Deploy the `backend/` image to any container platform (Fly.io, Railway, Render,
  AWS ECS, GKE, etc.) with at least one replica. The image already uses Gunicorn with multiple
  workers (`MAS_WORKERS`).
- **Frontend** — The `frontend/` image builds a static bundle served by Nginx. Put a CDN
  (Cloudflare, AWS CloudFront) in front of it for best performance.
- **HTTPS** — Terminate TLS at the edge (Cloudflare Proxy, a load balancer, or a self-hosted
  reverse proxy such as Caddy or Traefik with automatic Let's Encrypt certificates). Never expose
  the backend directly on port 8000.

#### Required secrets

Set these in your deployment platform's secret store — never commit them:

| Variable | Production value |
| --- | --- |
| `MAS_SECRET_KEY` | Random 64-byte hex string: `openssl rand -hex 64` |
| `MAS_DATABASE_URL` | Connection string to your managed PostgreSQL instance |
| `MAS_CORS_ORIGINS` | Your frontend origin, e.g. `https://meetandseat.example.com` |
| `BACKEND_URL` | Internal URL the Nginx frontend uses to proxy `/api` requests |

#### Minimal single-server setup (VPS / on-premise)

For a low-cost single-server deployment, override Compose with a production file and add Caddy for
automatic HTTPS:

```yaml
# docker-compose.prod.yml — adapt to your environment
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: meetandseat
      POSTGRES_USER: meetandseat
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  backend:
    build: ./backend
    restart: unless-stopped
    depends_on: [db]
    environment:
      MAS_DATABASE_URL: postgresql+asyncpg://meetandseat:${DB_PASSWORD}@db:5432/meetandseat
      MAS_SECRET_KEY: ${SECRET_KEY}
      MAS_CORS_ORIGINS: https://meetandseat.example.com
      MAS_WORKERS: 4

  frontend:
    build: ./frontend
    restart: unless-stopped
    environment:
      BACKEND_URL: http://backend:8000

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on: [frontend, backend]

volumes:
  pgdata:
  caddy_data:
```

```text
# Caddyfile
meetandseat.example.com {
    reverse_proxy frontend:80
}
```

Store `DB_PASSWORD` and `SECRET_KEY` in a `.env` file that is **not** committed to version control,
and pass it with `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d`.

---

### Local development

#### Backend development

```bash
cd backend
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

# Requires a running PostgreSQL instance
export MAS_DATABASE_URL=postgresql+asyncpg://meetandseat:meetandseat@localhost:5432/meetandseat
export MAS_SECRET_KEY=dev-secret-key
export MAS_CORS_ORIGINS=http://localhost:5173

uvicorn app.main:app --reload
```

#### Frontend development

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

---

## Project Structure

```shell
meet-and-seat/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── adapters/          # HTTP routes, schemas, middleware
│   │   ├── application/       # Commands, queries, handlers
│   │   ├── domain/            # Entities, value objects, ports
│   │   └── infrastructure/    # DB, repos, security, DI, seed
│   └── tests/
│       ├── unit/
│       └── integration/
└── frontend/
    └── src/
        ├── components/        # UI components by feature
        ├── hooks/             # Data-fetching hooks
        ├── pages/             # Route-level components
        ├── utils/             # Dates, MD5, holidays, API errors
        └── i18n/              # es · en · ca translations
```

---

## Architecture

The backend follows **Hexagonal Architecture** (ports & adapters):

```txt
HTTP Request
    │
    ▼
Adapter (FastAPI route)
    │
    ▼
Application (Command / Query handler)
    │
    ▼
Domain (Entities, value objects, business rules)
    │
    ▼
Infrastructure (SQLAlchemy repo, security, external APIs)
```

Domain logic has zero framework dependencies — it can be tested in isolation and swapped to a different transport or database without touching business rules.

---

## Environment Variables

#### Backend

| Variable | Description | Default |
| --- | --- | --- |
| `MAS_DATABASE_URL` | PostgreSQL async connection string | `postgresql+asyncpg://...` |
| `MAS_SECRET_KEY` | JWT signing secret | ⚠️ Change in production |
| `MAS_CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost` |
| `MAS_WORKERS` | Gunicorn worker count | `4` |
| `MAS_LOG_LEVEL` | Log level (`debug`/`info`/`warning`/`error`) | `info` |

#### Frontend

| Variable | Description | Default |
| --- | --- | --- |
| `BACKEND_URL` | Internal URL of the backend (nginx proxy target) | `http://backend:8000` |

---

## Running Tests

```bash
# Backend — linting + security scan + tests
cd backend
ruff check .
bandit -r app/ -q
pytest tests/ -v

# Frontend unit tests
cd frontend
npm test

# E2E tests (requires running stack at localhost)
npx playwright test --reporter=list
```
