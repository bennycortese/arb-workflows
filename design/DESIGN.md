# arb-workflow Design System

Synthesized from Linear, Kraken, and Figma design systems — adapted for our dark trading-terminal aesthetic.
Source files: `design/linear.md`, `design/kraken.md`, `design/figma.md`

---

## 1. Visual Theme

**Dark terminal, precise and data-forward.** Inspired by Linear's darkness-as-canvas philosophy, with Kraken's structured component language and Figma's typographic precision. The background is a deep navy (not pure black) — content emerges through carefully calibrated luminance steps rather than color variation.

---

## 2. Color System

### Backgrounds (lightest = most elevated)
| Token | Value | Use |
|-------|-------|-----|
| `--background` | `hsl(222, 26%, 5%)` | Page canvas |
| `--card` | `hsl(222, 22%, 8%)` | Cards, panels |
| Surface 3 | `rgba(255,255,255,0.03)` | Slightly elevated |
| Surface 4 | `rgba(255,255,255,0.05)` | Hover / active states |

### Borders
| Token | Value | Use |
|-------|-------|-----|
| Border default | `rgba(255,255,255,0.07)` | Cards, inputs |
| Border subtle | `rgba(255,255,255,0.05)` | Dividers |
| Border strong | `rgba(255,255,255,0.12)` | Active/focus states |

### Accent colors
| Role | Color | Use |
|------|-------|-----|
| Primary (cyan/teal) | `#06b6d4` / `#2dd4bf` | CTAs, focus rings, links |
| Kalshi | `#4ade80` emerald | Kalshi node, YES price |
| Polymarket | `#60a5fa` blue | Polymarket node |
| Discord | `#818cf8` indigo | Discord node |
| Email | `#f87171` red | Email node |
| Success/positive | `#34d399` | Price up, confirmed |
| Muted | `rgba(255,255,255,0.25–0.45)` | Secondary text |

### Text hierarchy (Linear-style luminance steps)
| Level | Value | Use |
|-------|-------|-----|
| Primary | `rgba(255,255,255,0.92)` | Headings, active labels |
| Secondary | `rgba(255,255,255,0.65)` | Body text, descriptions |
| Tertiary | `rgba(255,255,255,0.40)` | Field labels, hints |
| Quaternary | `rgba(255,255,255,0.22)` | Placeholders, timestamps |

---

## 3. Typography

Font stack: `Inter Variable` → `Inter` → `system-ui` (already loaded via `--font-inter`)
Mono: `SF Mono` → `Fira Code` → `Courier New` (use for tickers, prices, IDs, code)

### Scale
| Role | Size | Weight | Letter-spacing | Use |
|------|------|--------|----------------|-----|
| Display | 48px | 600 | -0.04em | Hero headings |
| Heading | 20px | 600 | -0.02em | Section titles |
| Subheading | 15px | 590 | -0.01em | Card headers |
| Body | 13–14px | 400 | normal | Descriptions |
| Label | 10px | 600 | +0.08em uppercase | Field labels |
| Mono data | 11–12px | 500 | normal | Prices, tickers |
| Tiny | 10px | 510 | +0.05em | Overlines, badges |

**Key rules (from Linear):**
- Never use `font-weight: 700` in UI chrome — max is 600
- Negative letter-spacing on headings, positive on ALL-CAPS labels
- Display text compresses tracking as size increases

---

## 4. Component Patterns

### Buttons (ShadCN `Button` component)
Use existing variants in `src/@/components/ui/button.tsx`:
- `primary` — teal CTA
- `outline` — secondary action
- `ghost` — subtle/tertiary
- `kalshi` / `polymarket` — node-specific accents

**Sizing:** 12px border-radius (Kraken rule: "12px is the max for buttons, no pill shapes on CTAs")

### Cards (ShadCN `Card`)
```
bg: rgba(255,255,255,0.025)
border: 1px solid rgba(255,255,255,0.06)
radius: 12px
shadow: inset 0 1px 0 rgba(255,255,255,0.04)
hover: bg → rgba(255,255,255,0.04), border → rgba(255,255,255,0.09)
```

### Badges (ShadCN `Badge`)
Node-type badges use existing `badge-kalshi`, `badge-polymarket`, `badge-discord`, `badge-email` CSS classes.
Data badges (prices, counts): `bg: rgba(accent,0.1)`, `color: accent`, `border: 1px solid rgba(accent,0.2)`, `radius: 6px`

### Labels (ShadCN `Label`)
`10px / weight 600 / +0.08em tracking / uppercase / color: rgba(255,255,255,0.40)`
Margin-bottom: 6px. Never use `<label>` raw — always use the component.

### Form inputs
Styled globally in `globals.css`. Do not re-style — just apply. Focus ring: `1px ring-ring` (cyan).

### Preview/summary boxes (bottom of node configs)
Use `Card` with a colored left-border glow:
```
bg: rgba(accent,0.05)
border: 1px solid rgba(accent,0.15)
radius: 10px
padding: 12px
```

### Variable chips (template builders in Discord/Email nodes)
Use `Button` variant `ghost` size `sm` with `font-mono`:
```
bg: rgba(255,255,255,0.05)
border: 1px solid rgba(255,255,255,0.08)
hover: bg → rgba(255,255,255,0.09)
text: rgba(255,255,255,0.5) → hover rgba(255,255,255,0.8)
```

---

## 5. Elevation Model (Linear-style luminance stepping)

Do NOT use colored or dark drop shadows on dark surfaces — they're invisible.
Instead, increase background luminance and/or add a subtle white border.

| Layer | Surface bg | Border | Shadow |
|-------|-----------|--------|--------|
| Canvas | `hsl(222,26%,5%)` | — | — |
| Card | `hsl(222,22%,8%)` | `rgba(255,255,255,0.07)` | `inset 0 1px 0 rgba(255,255,255,0.04)` |
| Elevated (dropdown/popover) | `rgba(9,12,21,0.98)` | `rgba(255,255,255,0.09)` | `0 20px 60px rgba(0,0,0,0.8)` |
| Tooltip | `rgba(9,12,21,0.97)` | `rgba(255,255,255,0.12)` | `0 8px 32px rgba(0,0,0,0.7)` |

---

## 6. Spacing

8px base grid. Key values: `4px 6px 8px 10px 12px 14px 16px 20px 24px 32px`.
Node config panels use `space-y-4` (16px between sections).
Label to input gap: `6px`. Section header to content: `12px`.

---

## 7. Node-specific patterns

Each node config follows this structure:
1. Fields in `space-y-4` container
2. Each field: `Label` → `input/select/textarea` → optional hint `p.text-xs.text-white/30`
3. Preview box at bottom using `Card` tinted to the node's accent color

Node headers are not changing — they use the existing icon + badge pattern.

---

## 8. Key Rules for AI/Codegen

1. **Always import from ShadCN** — `Label`, `Button`, `Badge`, `Card` from `@/components/ui/*`
2. **Elevation via luminance** — never `box-shadow: 0 4px 8px rgba(0,0,0,0.5)` on dark cards
3. **Borders are always semi-transparent white** — never solid dark borders on dark backgrounds
4. **No raw `<label>` tags** — always use the `Label` component
5. **No raw `<button>` for UI actions** — use `Button` variant
6. **Colors are semantic** — use the accent color of the node (emerald=Kalshi, blue=Poly, indigo=Discord, red=Email)
7. **Mono font for data** — prices, tickers, IDs, timestamps always `font-mono`
8. **Inter for UI chrome** — headings, labels, descriptions
9. **Max font-weight 600** — never 700 in UI elements (only in display headings)
10. **Negative tracking on headings** — `tracking-tight` or `-0.02em`
