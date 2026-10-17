# Design System — Nubo (نوبو)

> Phase 2 deliverable. Derived from the founder's 7 reference images (Braun "systems 14" poster, frosted folder icon, dot network on a grid, "less but better" dot calendar, blurred "Contexts" screen, Carol palette folder tabs, "Grid Systems" poster).
> **Main rule from the founder: simple and practical first.** The references are inspiration, not rules.

---

## 1. Concept: Paper · Grid · Dot

Nubo looks like a well-printed Swiss calendar that you can touch.

| Principle | What it means in the UI | From reference |
|---|---|---|
| **Paper and ink** | Warm, slightly tinted paper backgrounds, near-black ink, **hairline rules** (1px). Almost no shadows | Braun poster, Grid Systems |
| **Grid as structure** | Hairline grids appear in heroes and calendars. Content snaps to a 4px base | Braun poster, Grid Systems, dot network |
| **The dot** | The universal unit: **days are dots**, status is a dot, staff are colored dots with an initial, today is the accent dot | "Less but better" calendar, dot network |
| **One accent** | Each theme has one accent color. It's used for the main action, the selected item, today, and one decorative element, and never on more than ~10% of the screen | Braun red line, orange "today" dot |
| **Big numerals** | Dates and counts are set very large (Persian digits, heavy weight) as visual anchors | Braun "13 14 15", "28 December" |
| **Frosted layers** | The only "depth" is frosted glass: bottom bar, sheets, sticky headers | Frosted folder icon |
| **Atmosphere** | Each business type has a generated artwork (cover) built from its motif: poster lines, blurred blobs, dot network, grid blocks, frosted cards, folder tabs, dot rows | Contexts, Carol tabs, all posters |
| **Folder tabs** | Category switchers look like divider tabs | Carol palette |

The artwork is **generated in code** (SVG, seeded by business name). It always matches the theme colors, weighs almost nothing, works offline, and has no licensing issues. Real photos uploaded by a business are shown in the gallery and as the cover when present. (Stock photo sites aren't reachable from the build environment, and generated art fits these references better anyway.)

---

## 2. Tokens

All colors are CSS variables set at runtime by `<ThemeScope>` (see ARCHITECTURE §7). Tailwind utilities map to them (`bg-paper`, `text-ink`, `border-line`, `bg-accent` …).

| Token | Role |
|---|---|
| `--paper` | Page background |
| `--surface` | Cards, inputs, sheets |
| `--surface-2` | Pressed and hover states, subtle fills |
| `--ink` | Main text and icons, "filled" dots |
| `--muted` | Secondary text |
| `--line` | Hairlines and borders (ink at ~12%) |
| `--accent` | The one accent |
| `--accent-ink` | Text on accent (white or black, chosen automatically for contrast) |
| `--accent-soft` | Accent mixed into paper at ~14% (selected backgrounds) |
| `--glass` | Frosted layer background (paper at ~72% + `backdrop-blur`) |
| `--radius` | Theme corner radius |

Status colors are fixed across themes so they stay recognizable: pending = amber `#E0A100`, confirmed = green `#2F9E6A`, proposed = blue `#3A7BD5`, rejected/cancelled/expired = muted grey, completed = ink, no-show = red `#D64545`. Status is **always a dot plus a word**, never color alone.

### Typography

One family: **Vazirmatn** (variable, bundled). Persian digits everywhere in the UI.

| Style | Size / weight | Use |
|---|---|---|
| Numeral XL | 64–96 / 800, tight | Day number on the date step, today's count |
| Display | 32–40 / 800 | Business name on the cover, page heroes |
| H1 | 24 / 750 | Page titles |
| H2 | 18 / 700 | Section titles |
| Body | 16 / 400, line-height 1.75 | Default text. **Inputs are always 16px** so iOS doesn't zoom |
| Small | 14 / 400 | Secondary info |
| Label | 12 / 600, muted, letter-spaced for Latin | Field labels, column headers (like the poster's "y d m") |

### Spacing and sizes

- 4px base. Page gutter **20px** on phones, 32px on desktop.
- **Touch targets ≥ 44px.** Primary buttons 52px tall on phones.
- Bottom tab bar 64px + safe-area inset.
- Max content width: public page 1120px, dashboard 1280px.

### Motion

Subtle and quick. All of it respects `prefers-reduced-motion`.

| Token | Value | Use |
|---|---|---|
| fast | 160ms | Press feedback, color changes |
| base | 240ms | Step changes, list items |
| slow | 380ms | Sheets, page transitions |
| ease | `cubic-bezier(.2,.8,.2,1)` | Everything that isn't a spring |
| spring | stiffness 420, damping 36 | Sheets, selection indicators |

Micro-interactions:
- Buttons and dots shrink slightly when pressed (scale .96).
- The **selection indicator glides** between items (segmented controls, tabs, bottom nav).
- The selected day dot fills with the accent from the center.
- Wizard steps slide in the reading direction (right → left for "next" in RTL).
- On booking success, a dot expands into a ring and a check mark draws itself.
- New requests in the inbox slide in and briefly pulse.

---

## 3. Seven business identities

Same system, different personality. Each identity sets: palette, natural mode (light or dark), radius, and cover motif. Owners can change the accent color and switch light or dark; the motif follows.

| Type | Identity | Mode | Paper / Ink | Accent | Radius | Motif (cover artwork) |
|---|---|---|---|---|---|---|
| Barbershop | **سیگنال · Signal** | Dark | Charcoal `#141414` / bone `#F0EEE9` | Signal red `#E5321D` | 6 | **Poster**: giant numerals, vertical ruler with ticks, one red horizontal line (Braun poster) |
| Beauty salon | **پیونی · Peony** | Light | Beige `#F4EEE6` / cocoa `#2B2220` | Cherry `#C4573F` | 18 | **Tabs**: stacked folder dividers in peony, cherry, carolina, steel, beige (Carol palette) |
| Psychologist | **آرامش · Calm** | Light | Cream `#F3EBDD` / slate `#2A2A33` | Indigo `#5B63B7` | 22 | **Blobs**: soft blurred color fields, orange, sun, sky, lavender (Contexts) |
| Dental clinic | **شفاف · Frost** | Light | Cool white `#F5F6F8` / graphite `#16181D` | Carolina `#2E86AB` | 16 | **Glass**: overlapping frosted cards (frosted folder) |
| General clinic | **گرید · Grid** | Light | Grain `#E9E6DF` / ink `#121212` | Grid blue `#1D4ED8` | 2 | **Grid**: hairline grid with solid blue blocks (Grid Systems poster) |
| Gym | **ولت · Volt** | Dark | Night `#111210` / chalk `#EDEDE8` | Orange `#F26A1B` | 12 | **Dots**: rows of filled dots with one orange "today", like a streak (Less but better) |
| Private tutor | **شبکه · Network** | Light | Fog `#E6E6E4` / ink `#1F1F1F` | Tomato `#E8643C` | 14 | **Network**: multicolor dots joined by lines on a grid (dot network) |

The Nubo product itself (landing, Hub) uses **Nubo Paper**: paper `#ECEAE5`, ink `#141414`, accent orange `#F2611D`. The logo is the wordmark «نوبو» followed by an orange dot.

The business dashboard uses the tenant's palette in its light form with neutral surfaces, so it always feels like *their* tool while staying readable.

---

## 4. Components (key ones)

| Component | Notes |
|---|---|
| **DotCalendar** (Jalali) | 7 columns, Saturday first. Past days are small hollow dots, available days are filled ink dots, today has an accent ring, the selected day is filled accent, closed/holiday days are hairline-crossed. Big numeral header showing the selected day. Month switch slides |
| **SlotGrid** | Times grouped as صبح / ظهر / عصر (morning / noon / evening). Pills on a 3-column grid on phones and 6 on desktop. Selected = accent fill |
| **Bottom tab bar** (phone dashboard) | Frosted. امروز · تقویم · [+ new booking, raised accent dot] · مشتریان · بیشتر. A badge on Today shows the pending count |
| **Sidebar** (desktop dashboard and Hub) | Hairline right border (RTL start), logo on top, grouped links, active link has a gliding accent bar |
| **Sheet** | Bottom sheet on phones (drag handle, swipe down to close), centered panel on desktop. Frosted backdrop |
| **Folder tabs** | Service categories on the public page, sections in settings |
| **StatusPill** | Dot + word |
| **Avatar dot** | Circle in the staff color with the first letter. Staff photos replace it when uploaded |
| **Cover** | Generated motif + business name in Display weight + tagline, on a hairline grid |
| **Stat** | Big numeral + small label + optional sparkline of dots |
| **Empty state** | A small composition of dots and a helpful sentence. Never a dead end |
| **Toast** | Ink pill at the bottom, slides up, auto-dismiss |

---

## 5. Layouts

### Phone (primary)
- **Public page:** cover (60% of viewport height), then info sections stacked, and a sticky frosted bottom bar with «رزرو نوبت» (book an appointment).
- **Booking wizard:** full screen, a progress line of dots at the top, one decision per screen, a sticky bottom action button.
- **Dashboard:** top bar (business logo + name + quick actions), content, bottom tab bar. Secondary pages live under «بیشتر» (More).
- **Hub:** same pattern with its own tab bar.

### Desktop (≥ 1024px)
- **Public page:** two columns: the business story on one side, a **sticky booking panel** on the other, so customers book without leaving the page.
- **Dashboard:** sidebar + content. The Today page becomes a 3-column board (requests · agenda · stats). The calendar uses the full width with staff columns.
- **Hub:** sidebar + table views.

---

## 6. Accessibility and practicality checklist

- Contrast AA for text. Accent text color is chosen automatically.
- Status is never color-only.
- Every interactive element is ≥ 44px and has a visible focus ring (accent, 2px offset).
- Persian, Arabic and Latin digits are accepted in every number or phone field.
- Reduced motion turns off slides and springs (fades only).
- Works with one hand: primary actions sit in the bottom third of the screen on phones.
