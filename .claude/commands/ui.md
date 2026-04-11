# UI Component Skill

When building UI for arb-workflow, always follow these rules.

## Required reading

Before writing any UI, read `design/DESIGN.md`. It contains the synthesized design system for this project (sourced from Linear, Kraken, and Figma design systems).

## ShadCN components to use

Components live in `src/@/components/ui/`. Import alias: `@/components/ui/*`

| Component | Import | Use for |
|-----------|--------|---------|
| `Button` | `@/components/ui/button` | All clickable actions — never raw `<button>` |
| `Badge` | `@/components/ui/badge` | Node type badges, status chips |
| `Card` | `@/components/ui/card` | Preview/summary sections, market cards |
| `Label` | `@/components/ui/label` | All form field labels — never raw `<label>` |

## Design references

Run these from project root to regenerate source design files:
```bash
npx getdesign@latest add kraken       # → design/kraken.md
npx getdesign@latest add linear.app   # → design/linear.md
npx getdesign@latest add figma        # → design/figma.md
```

The synthesized guide at `design/DESIGN.md` merges all three with our project's existing dark-terminal theme.

## Key patterns

### Form field
```tsx
<div>
  <Label htmlFor="field-id">Field Name</Label>
  <input id="field-id" type="text" placeholder="..." />
  <p className="mt-1 text-xs text-white/30">Hint text</p>
</div>
```

### Variable/template chips
```tsx
<Button
  variant="ghost" size="sm"
  className="font-mono text-xs border border-white/[0.08]"
  onClick={() => append('{{var}}')}
>
  {'{{var}}'}
</Button>
```

### Node preview box
```tsx
<Card className="bg-emerald-500/5 border-emerald-500/15 p-3">
  <p className="text-xs text-emerald-400/80">...</p>
</Card>
```

### Market / data card (hover state)
```tsx
<Card className="cursor-pointer transition-all hover:bg-white/[0.05] hover:border-white/[0.12] p-3">
  ...
</Card>
```

## Elevation model
- Dark surfaces: elevate via **luminance stepping** (increase bg opacity), not drop shadows
- Borders: always `rgba(255,255,255,0.05–0.12)` — never solid dark colors
- Dropdowns/popovers: `bg rgba(9,12,21,0.98)`, `box-shadow: 0 20px 60px rgba(0,0,0,0.8)`

## Colors
- Kalshi: emerald (`#4ade80`, `emerald-500`)
- Polymarket: blue (`#60a5fa`, `blue-400`)
- Discord: indigo (`#818cf8`, `indigo-400`)
- Email: red (`#f87171`, `red-400`)
- Primary CTA: cyan (`#06b6d4`, `cyan-500`)
- Data/prices: `font-mono text-emerald-400` for positive, always monospace
