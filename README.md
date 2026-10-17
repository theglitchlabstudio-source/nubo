# Nubo (نوبو) — by GlitchLab Studio

Multi-tenant, Persian-first online booking for Iranian small businesses: barbershops, beauty salons, psychologists, dentists, clinics, gyms and private tutors.

- **Demo:** GitHub Pages (after enabling Pages — see below)
- **Design:** [`docs/DESIGN.md`](docs/DESIGN.md) · **Architecture:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## What's in the MVP
- Branded public booking page per business, with 7 visual identities (one per business type)
- Booking wizard on a Jalali dot calendar, tracking page (cancel, accept a proposed time, add to calendar)
- Business dashboard: inbox (approve / reject / propose time), day/week/list calendar, manual bookings, customers, services, staff, working hours with split shifts, official holidays (overridable), booking rules with manual / auto / smart confirmation, branding with live preview, link + printable QR, stats, message outbox, AI assistant placeholder (Pro)
- Hub: tenants, plans and feature flags, subscriptions, "open as" any business, create from template, theme library, audit log, demo reset, backup / restore

All data lives in the visitor's browser (IndexedDB). It's a demo and sales tool; real shared bookings need the Phase 4 backend (PocketBase on a VPS).

## Demo PINs
| Who | PIN |
|---|---|
| Business owner | 1111 |
| Secretary | 2222 |
| Hub (super admin) | 1234 |

## Develop
```bash
npm install
npm run dev     # http://localhost:5173
npm test
npm run build
```

## Deploy (GitHub Pages)
1. Repo **Settings → Pages → Source: GitHub Actions** (one time). Free Pages needs a public repo.
2. Push to `main`. The workflow in `.github/workflows/deploy.yml` tests, builds and publishes.
3. The site is served at `https://<user>.github.io/nubo/`.
