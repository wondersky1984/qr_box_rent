# qr_box_rent
оплата и отпирание ячеек

---

## LockBox – QR Rental Platform

LockBox is a full-stack web product for managing QR-driven locker rentals with multi-locker carts, OTP-based auth, YooKassa payments, and rich RBAC tooling for managers and admins.

## Tech Stack
- **Backend:** NestJS (TypeScript), Prisma ORM, PostgreSQL, Pino logging
- **Frontend:** React + Vite, TailwindCSS, React Query, Zustand
- **Infrastructure:** Docker Compose (app + Postgres + Nginx), Nginx static hosting + API proxy

## Features
- Locker grid with real-time aware statuses: free, held, occupied, frozen, out of order
- Multi-locker cart with per-locker tariff selection, 10-minute hold logic, YooKassa order payments
- OTP authentication with refresh tokens in httpOnly cookies
- Rental management: active timers, manual open controls, extension payments
- Manager console for instant open/freeze/unfreeze actions with audit logging
- Admin audit screen, CSV export, tariff and locker CRUD endpoints
- Mockable payments and OTP for local development

## Prerequisites
- Node.js 20+
- npm 9+
- PostgreSQL 14+ (only for manual/local development)

## Environment Variables
Copy the provided examples and adjust as needed:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Key vars:
- `DATABASE_URL` – Prisma connection string (`postgresql://user:pass@host:port/db?schema=public`)
- `JWT_*` – secrets and TTLs for access/refresh tokens
- `MOCK_PAYMENTS` – `true` to enable mock YooKassa flows & OTP visibility in logs
- `CORS_ORIGIN` – comma-separated origins allowed by the API
- `VITE_API_URL` – frontend proxy target (usually `http://localhost:3000` during dev)

When running through Docker Compose the backend automatically overrides `DATABASE_URL`, `BASE_URL`, and `CORS_ORIGIN` for the container network.

## Local Development

### 1. Install dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Database setup
1. Start PostgreSQL (or update `DATABASE_URL` to match your instance).
2. Apply schema & generate Prisma client:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   npm run generate
   npm run seed
   ```

### 3. Run services
- **Backend:** `npm run dev` (NestJS watch mode on port 3000)
- **Frontend:** from `frontend/`, run `npm run dev` (Vite on port 5173, proxied to backend via `/api`)

Mock credentials (seeded):
- User: `+7 000 000 0001`
- Manager: `+7 000 000 0002`
- Admin: `+7 000 000 0003`
- Default OTP (with `MOCK_OTP_CODE=1234`): `1234`

### 4. Useful npm scripts
- Backend: `npm run build`, `npm run start:prod`, `npm run migrate`, `npm run seed`
- Frontend: `npm run build`, `npm run preview`

## Docker Compose
Builds the full stack (Postgres, NestJS app, Nginx hosting the built frontend).

```bash
# from repository root
cp .env.example .env
# (optional) adjust secrets / YooKassa keys / payment mode

docker compose up --build
```

Services:
- **db** – PostgreSQL 15 (`localhost:5432`)
- **app** – NestJS backend (`http://localhost:3000` inside the network; proxied by nginx)
- **nginx** – Serves the React build + proxies `/api` → backend (`http://localhost:8080`)

The backend container executes `prisma migrate deploy` and automatically falls back to `prisma db push` if migrations are missing.

## File Structure Highlights
```
backend/
  src/modules/…    # Auth, lockers, cart, orders, payments, manager/admin, etc.
  prisma/schema.prisma
  scripts/seed.ts
frontend/
  src/pages/…      # Locker grid, rentals dashboard, manager/admin screens
  src/components/…
  Dockerfile       # Produces nginx image with built assets
shared/
  (reserved for future shared utilities)
```

## Locker Driver Abstraction
By default a mock driver logs open commands. Replace `MockLockerDriver` in `LockerDriverModule` with an HTTP/BLE/MQTT implementation and expose any required environment through `configuration.ts`.

## Payment Integration Notes
- For production set `MOCK_PAYMENTS=false` and provide real YooKassa credentials.
- Configure the webhook endpoint at `POST /api/yookassa/webhook`; set `YOOKASSA_WEBHOOK_SECRET` if signature validation is required.

## Admin & Manager
- Manager routes under `/api/manager` require role `MANAGER` or `ADMIN`.
- Admin auditing & tariff/locker CRUD require role `ADMIN`.
- All admin/manager actions are written to `AuditLog` with actor metadata.

## Health & Monitoring
- Backend exposes `GET /health` (proxied via Nginx).
- Audit events accessible through `/api/admin/audit` & `/api/admin/audit/export` (CSV).

## Next Steps
- Hook in a real locker driver implementation.
- Add background jobs (e.g., NestJS Scheduler) for periodic hold/expiry cleanup if running outside request flow.
- Integrate WebSocket/SSE channels for real-time locker status without polling.
