# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Always read DESIGN.md first

Before touching any UI file, read `DESIGN.md`. All colour, typography, spacing, shadow, and component decisions live there. Do not invent styles not already in the system.

## Commands

```bash
npm run dev          # Start dev server on port 3001
npm run build        # Generate Prisma client + Next.js build
npm run lint         # ESLint via next lint
npx tsc --noEmit     # Type-check without emitting
npx prisma studio    # Visual DB browser
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema changes to DB (no migration file)
npm run db:seed      # Seed DB via prisma/seed.ts
npm run db:reset     # Force-reset DB + re-seed (destructive)
```

No test framework is configured. Do not run `npm install` or add packages without asking.

## Architecture

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind CSS 4 · Prisma 6 · PostgreSQL (Neon)

### Three-layer pattern per module

Each feature module (HoursBoard, MoneyBoard, etc.) follows the same layered structure:

1. **Domain** (`src/domain/<module>.ts`) — Pure functions: formatters, date math, constants, types. No DB, no React. Importable anywhere.
2. **Server** (`src/server/queries/<module>.ts` + `src/server/actions/<module>.ts`) — Queries read from DB and return display types. Actions are `"use server"` form handlers that validate, mutate, and `revalidatePath`. Both use `requireUser()` for auth.
3. **UI** (`src/app/dashboard/<module>/page.tsx` + `src/components/features/<module>/`) — Server Component page fetches data and passes it to client components. Feature components live in their own folder.

### Auth flow

- `src/server/auth.ts` — scrypt password hashing, cookie-based sessions (`pc_session`), `getCurrentUser()` / `requireUser()`
- `src/middleware.ts` — Edge middleware checks cookie presence only (no DB call); redirects unauthenticated users to `/login`
- Server-side validation always goes through `requireUser()` inside Server Components/Actions

### Tailwind 4 (no config file)

Theme is defined via `@theme` in `src/app/globals.css`, not a `tailwind.config` file. Custom colours (`sage`, `sand`, `paper`, `ink`, `muted`, `faint`, etc.) and shadows (`shadow-card`, `shadow-btn`) are declared there. Use these — do not hardcode hex values.

### Key shared files

- `src/types/index.ts` — All shared TypeScript interfaces (display types passed from server to client)
- `src/lib/utils.ts` — `cn()` (clsx+twMerge), date helpers, formatting utilities
- `src/data/mockData.ts` — Module registry (`modules` array with `status: "active" | "coming-soon"`)
- `src/components/layout/AppShell.tsx` — Dashboard shell with mobile bottom-nav + desktop sidebar

### Currency system (MoneyBoard)

Each `MoneyEntry` stores its own `currency` (ISO 4217 code). The currency selector is URL-driven (`?currency=XXX`) — the server filters aggregates by currency. Domain helpers in `src/domain/moneyboard.ts` handle locale-aware formatting and parsing (`formatMoney`, `parseAmountInput`, `sanitizeAmountInput`, `getSeparators`).

## Active modules

- **HoursBoard** — `/dashboard/hoursboard` — shifts, pay periods, gross pay, award levels
- **MoneyBoard** — `/dashboard/moneyboard` — income/expense tracking, multi-currency, category breakdown

## Design constraints

- Palette: sage green primary (`#3E5B4D`), warm parchment backgrounds (`#F3EFE7`), sand accent (`#B2966A`)
- Font: Geist (UI) + Geist Mono (figures, labels, overlines)
- No generic blue SaaS. No heavy gradients. No neon. No glassmorphism.
- Calm, personal, scannable. The key number is always the biggest element.
- Mobile-first. Test at 375px width before adding desktop overrides.

## Adding a new module

1. Add domain logic to `src/domain/<module>.ts`
2. Add Prisma models to `prisma/schema.prisma`, run `npx prisma db push` + `npx prisma generate`
3. Add server queries/actions to `src/server/queries/<module>.ts` and `src/server/actions/<module>.ts`
4. Add display types to `src/types/index.ts`
5. Create page at `src/app/dashboard/<module>/page.tsx` (Server Component)
6. Create feature components in `src/components/features/<module>/`
7. Update `src/data/mockData.ts` → `modules` array: set `status: "active"` and wire up `href`

## When finished with a task

Summarise: what changed, what files were touched, what the next step is.
