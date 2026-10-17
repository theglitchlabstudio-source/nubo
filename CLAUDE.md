# Nubo — project rules for AI assistants

Multi-tenant, Persian-first appointment booking platform by GlitchLab Studio.
Read `docs/ARCHITECTURE.md` (system design) and `docs/DESIGN.md` (visual system) before larger changes.

## Commands
- `npm run dev` — local dev server (http://localhost:5173)
- `npm test` — domain unit tests (slot engine, state machine, Jalali, Persian input)
- `npm run typecheck` / `npm run build` — build outputs `dist/` (GitHub Pages base `/nubo/`)

## Rules
- Code, identifiers and docs in English. UI text in Persian.
- `src/domain/` is pure TypeScript: no React, no storage, no `Date.now()` inside (pass `now`).
- Screens never import `src/data/adapters/*`; they use `src/data/hooks.ts` and the `data` adapter from `src/data`.
- All date math goes through `src/lib/time.ts` (UTC instants, Tehran timezone, Jalali only for display).
- Show numbers with Persian digits (`toFa`, `formatToman`); accept any digit system in inputs (`toEn`, `normalizeMobile`).
- Use Tailwind logical utilities (`ms-`, `pe-`, `start-`, `end-`) so RTL keeps working.
- Colors come from theme tokens (`bg-paper`, `text-ink`, `bg-accent`, `border-line`…), never hard-coded per screen.
- The "Powered by GlitchLab Studio" footer stays on every public page, on every plan.
- Every tenant-owned record has `tenantId`; the mock adapter enforces isolation — keep it that way.

## Where things live
- `src/features/public` — business page, booking wizard, tracking page
- `src/features/dashboard` — business dashboard (`/b/:slug/admin`)
- `src/features/hub` — super admin (`/hub`)
- `src/seed` — templates, demo businesses, official holidays (`node scripts/gen-holidays.mjs` regenerates)
- `src/theme` — 7 business identities, palette derivation, generated cover art
