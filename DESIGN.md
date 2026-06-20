# Project Core — Design System

**Concept:** Premium Personal OS — calm, private, glanceable.

---

## Principles

| Principle | Rule |
|---|---|
| Calm by default | Generous space, one thing at a time, nothing shouting for attention |
| Glanceable | The key number is always the biggest element on screen |
| Personal, not corporate | Warm tones, friendly copy. Feels like yours, not a tool you were issued |
| Honest empties | Coming-soon and empty states look intentional, never broken |

---

## Colour Tokens

| Token | Hex | Usage |
|---|---|---|
| `sage` | `#3E5B4D` | Primary brand, active states, CTAs |
| `sage-deep` | `#324A3E` | Hover state for sage |
| `sage-tint` | `#EEF2EE` | Active badge background, subtle sage fill |
| `sage-border` | `#D8E2DA` | Sage-tinted border |
| `sand` | `#B2966A` | Accent, decorative highlights |
| `sand-tint` | `#F1ECE2` | Coming-soon backgrounds, tinted fills |
| `amber` | `#A86B3D` | Payday soon, warm urgency |
| `paper` | `#F3EFE7` | Page background |
| `canvas` | `#E8E3D9` | Deeper background used in design specs |
| `surface` | `#FFFFFF` | Card surfaces, inputs |
| `ink` | `#23211C` | Primary text, headings |
| `muted` | `#574F44` | Secondary body text |
| `subtle` | `#776F63` | Descriptive text, captions |
| `faint` | `#857F74` | Labels, placeholder-adjacent |
| `ghost` | `#9A9486` | Labels, overline caps |
| `pale` | `#B3AC9E` | Inactive nav, disabled states |
| `border` | `#E2DCCF` | Default border |
| `border-soft` | `#ECE6DA` | Card borders, dividers |

---

## Typography

**Font stack:**
- UI & headings: `Geist` (weights 300–700)
- Figures & labels: `Geist Mono` (weights 400–600)

**Scale:**

| Role | Size | Weight | Notes |
|---|---|---|---|
| Hero figure | 40–46px | 600 | Mono, tight tracking (`-0.03em`) |
| Title | 22px | 600 | Sans, `tracking-tight` |
| Section heading | 17–19px | 600 | Sans |
| Body | 15px | 400 | Sans, `leading-relaxed` |
| Label / overline | 11px | 600 | Mono, `uppercase`, `tracking-[0.08–0.14em]` |
| Figures / money | 17–19px | 600 | Mono, sage coloured for positive values |
| Caption | 12–13px | 400 | Sans, `text-subtle` or `text-ghost` |

---

## Spacing

4-point base scale: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48`.

Use Tailwind's default spacing scale. Prefer `p-4`, `p-5`, `p-6`, `gap-2.5`, `gap-4`.

---

## Border Radius

| Context | Value |
|---|---|
| Full pill (badge) | `rounded-full` |
| Button / input | `rounded-[13px]` |
| Card (standard) | `rounded-[16–18px]` |
| Icon container | `rounded-[10–14px]` |
| Small element | `rounded-[8px]` |

---

## Elevation / Shadows

| Level | CSS | When to use |
|---|---|---|
| `sm` | `0 1px 2px rgba(41,38,33,0.05)` | Subtle lift |
| `md` (card) | `0 2px 10px rgba(41,38,33,0.06)` | Default cards |
| `lg` | `0 10px 28px rgba(41,38,33,0.10)` | Modal, floating panels |
| `btn` | `0 4px 12px rgba(62,91,77,0.22)` | Primary CTA button |
| `btn-lg` | `0 6px 16px rgba(62,91,77,0.24)` | Hero CTA |

Borders do most separation work. Shadows are soft and warm-tinted.

---

## Cards

- Background: `bg-white` or `bg-[#faf7f1]` for tinted
- Border: `border border-border-soft`
- Radius: `rounded-[18px]` (standard), `rounded-[14px]` (compact)
- Shadow: `shadow-card`
- Padding: `p-4` (mobile), `p-5` (desktop)
- Stat grid inside cards: divide with `border-border-soft`, cells use `bg-[#faf7f1]`

---

## Buttons

| Variant | Style |
|---|---|
| `primary` | `bg-sage text-white rounded-[13px] shadow-btn` |
| `secondary` | `bg-white text-ink border border-border rounded-[13px]` |
| `ghost` | `bg-transparent text-sage rounded-[11px]` |
| `icon` | `bg-white text-sage border border-border rounded-[11px] w-11 h-11` |

- Height: `h-10` (sm), `h-12` (md), `h-[52px]` (lg)
- Font: `font-semibold text-[14–15px]`
- Never use generic blue. Never use heavy gradients.

---

## Badges

| Variant | Background | Text |
|---|---|---|
| `active` | `bg-sage-tint` | `text-sage` with green dot |
| `coming-soon` | `bg-sand-tint` | `text-[#8a7a5c]` |
| `payday` | `bg-[#f5ede4]` | `text-amber` |

All badges: `rounded-full`, `text-[12px] font-semibold`, `px-3 py-1`.

---

## Mobile Layout Rules

- Page padding: `px-5 py-5`
- Bottom nav: `h-16`, fixed, `border-t border-border-soft bg-white`
- Active nav item: `text-sage font-semibold`
- Inactive nav item: `text-pale font-medium`
- Content area: `pb-20` to clear bottom nav
- Hero figures first, context below
- Max content width on mobile: full bleed to `px-5`

---

## Desktop Layout Rules

- Left rail nav: `w-[200px]`, sticky, `border-r border-border-soft bg-white`
- Logo in rail: `w-8 h-8 rounded-[9px] bg-sage` with app name
- Nav item active: `bg-sage-tint text-sage`
- Nav item inactive: `text-subtle hover:bg-paper`
- Page content: `px-8 py-8`, `max-w-2xl` for reading comfort
- Stat grid: `grid-cols-4` where space allows
