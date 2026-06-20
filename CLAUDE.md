# Project Core — Claude Instructions

## Always read DESIGN.md first

Before touching any UI file, read `DESIGN.md`. All colour, typography, spacing, shadow, and component decisions live there. Do not invent styles not already in the system.

## General rules

- Make small, focused changes. Do not rewrite unrelated files.
- Keep components in `src/components/` reusable and single-purpose.
- Keep UI mobile-first. Test at 375px width mentally before adding desktop overrides.
- Use mock data in `src/data/mockData.ts` until real data is explicitly requested.
- Do not add backend, database, or real authentication until explicitly requested.
- Do not run `npm install`, `npm run build`, or any tests unless explicitly asked.
- Do not install new packages without asking first.

## Project structure

```
src/
  app/             # Next.js App Router pages and layouts
  components/
    ui/            # Reusable primitives: Button, Card, Badge, StatCard
    layout/        # AppShell (nav + page wrapper)
    features/      # Module-specific components
      hoursboard/  # HoursBoard components
  data/            # mockData.ts — all mock data lives here
  lib/             # utils.ts — formatting helpers
  types/           # index.ts — shared TypeScript types
```

## Active modules

- **HoursBoard** — `/dashboard/hoursboard` — shifts, pay periods, gross pay
- All other modules are Coming Soon placeholders

## Design constraints

- Palette: sage green primary (`#3E5B4D`), warm parchment backgrounds (`#F3EFE7`), sand accent (`#B2966A`)
- Font: Geist (UI) + Geist Mono (figures, labels, overlines)
- No generic blue SaaS. No heavy gradients. No neon. No glassmorphism.
- Calm, personal, scannable. The key number is always the biggest element.

## Adding a new module

1. Add it to `src/data/mockData.ts` → `modules` array with `status: "coming-soon"`
2. Add a type to `src/types/index.ts` if needed
3. Create `src/app/dashboard/<module>/page.tsx`
4. Create components in `src/components/features/<module>/`
5. When ready, change status to `"active"` and wire up the link

## When finished with a task

Summarise: what changed, what files were touched, what the next step is.
