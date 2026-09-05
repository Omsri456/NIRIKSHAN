# NIRIKSHAN — Client

React + TypeScript frontend for the NIRIKSHAN MPLADS risk intelligence platform. Built with Vite, React Router, and Recharts. Data contracts are shared with the backend via the `@nirikshan/shared` workspace package (`../shared/types`).

## Setup

From the **repo root** (this is an npm workspace):

```bash
npm install
```

Start the backend first (see `../server/README.md` — briefly: `npm run seed` then `npm run dev` inside `server/`, listening on port 5000), then run the client:

```bash
cd client
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api/*` requests to `http://localhost:5000` (configured in `vite.config.ts`), so no CORS setup or `.env` is needed locally.

## Demo accounts

Seeded by `server`'s `npm run seed`, password `password123` for all:

| Email | Role |
|---|---|
| `ministry@nirikshan.gov.in` | Ministry (national scope) |
| `state.mh@nirikshan.gov.in` | State Authority (Maharashtra) |
| `district.mumbai@nirikshan.gov.in` | District Authority (Mumbai) |
| `mp@nirikshan.gov.in` | Member of Parliament |
| `admin@nirikshan.gov.in` | Administrator |

## Structure

```
src/
  api/          Typed HTTP clients per resource (auth, dashboard, works, risk, investigations)
  components/
    layout/     Sidebar, Topbar, AppLayout shell, ProtectedRoute guard
    ui/         Reusable primitives — StatCard, RiskBadge, RiskGauge, Pagination, loading/error/empty states
    charts/     Recharts-based trend chart + hand-built risk distribution & state table
  context/      AuthContext (session, login/logout)
  pages/        One component per route
  utils/        Formatting helpers (currency, date) and shared constants (role labels, risk colors)
  App.tsx       Route definitions
  index.css     Design tokens (colors, type, spacing)
  App.css       Shell + component styles
```

Every API response is typed against `shared/types/`, so a backend contract change should surface as a type error here rather than a silent runtime bug.

## Building

```bash
npm run build
```

Set `VITE_API_BASE_URL` (see `.env.example`) if the built app is served from a different origin than the API.
