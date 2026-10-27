---
name: Aero Dark Glass
colors:
  surface: '#11131c'
  surface-dim: '#11131c'
  surface-bright: '#373942'
  surface-container-lowest: '#0b0e16'
  surface-container-low: '#191b24'
  surface-container: '#1d1f28'
  surface-container-high: '#272a33'
  surface-container-highest: '#32343e'
  on-surface: '#e1e1ee'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e1e1ee'
  inverse-on-surface: '#2e3039'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#b4c5ff'
  on-secondary: '#002a78'
  secondary-container: '#0053db'
  on-secondary-container: '#cdd7ff'
  tertiary: '#faf3ff'
  on-tertiary: '#3c0091'
  tertiary-container: '#e1d2ff'
  on-tertiary-container: '#6d3bd7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#11131c'
  on-background: '#e1e1ee'
  surface-variant: '#32343e'
typography:
  display-hero:
    fontFamily: Geist
    fontSize: 56px
    fontWeight: '600'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-mono-sm:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.05em
  label-ui:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-sm: 0.75rem
  gutter-lg: 2rem
  margin: 1.5rem
  margin-sm: 1rem
  margin-lg: 3rem
  space-xxs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4rem
---

## Brand & Style

This design system establishes an atmospheric, high-performance browser interface centered around aero-dark glassmorphism. It targets digital power users, developers, creative technologists, and privacy-conscious professionals seeking an immersive, distraction-free environment. 

The aesthetic combines deep obsidian and midnight voids with luminous cyan and electric blue refraction. Interactive elements appear as physical optical layers: multi-layered frosted glass panels, hairline specular edges (simulating incident directional light), and ambient glow diffusion behind panels. The emotional response is weightless, hyper-engineered, fluid, and premium—evoking the precision of specialized instrumentation without visual clutter.

## Colors

The palette is engineered specifically for dark, optically dynamic surfaces:

- **Primary (`#00F0FF`)**: Luminous Cyan. Used for active navigation indicators, progress bars, tab focus rings, link accents, and primary action glows.
- **Secondary (`#2563EB`)**: Electric Cobalt. Delivers grounded energy for structural highlights, selection fills, gradients, and secondary controls.
- **Tertiary (`#8B5CF6`)**: Deep Plasma Purple. Injected into ambient background orbs and subtle mesh gradients to introduce chromatic depth behind glass layers.
- **Neutral (`#060810`)**: Deep Obsidian Void. The fundamental canvas tone upon which light meshes and glass strata sit.

### Chromatic & Glass Alpha Tokens
- `canvas-mesh-blue`: `rgba(37, 99, 235, 0.12)`
- `canvas-mesh-cyan`: `rgba(0, 240, 255, 0.08)`
- `glass-surface-base`: `rgba(10, 16, 30, 0.65)`
- `glass-surface-floating`: `rgba(14, 22, 42, 0.78)`
- `glass-surface-subtle`: `rgba(255, 255, 255, 0.03)`
- `glass-border-standard`: `rgba(255, 255, 255, 0.08)`
- `glass-border-highlight`: `rgba(0, 240, 255, 0.35)`
- `text-primary`: `#F8FAFC`
- `text-secondary`: `#94A3B8`
- `text-muted`: `#475569`

## Typography

Typography prioritizes legibility, high contrast against variable refractive backgrounds, and technical precision:

- **Primary UI & Display (`Geist`)**: Delivers crisp geometric geometry, tight letterforms, and uniform tracking at varied scales. Used across headings, tabs, omnibox inputs, dialogs, and primary browser controls.
- **Technical & Utility (`Space Mono`)**: Used sparingly for security certificates, protocol badges (e.g., `https://`, TLS version), load latency metrics, telemetry, and shortcut keys.

### Optical Rules
- Headlines over translucent glass surfaces must maintain an 85%+ luminance contrast ratio against blurred underlays.
- Subtle inner drop-shadows or text protection overlays are forbidden; legibility is governed strictly by weight (`500`–`600`) and the `text-primary` token.

## Layout & Spacing

The layout model is structured around a flexible 12-column adaptive grid for content views (Speed Dial, Settings, History) and a modular anchored framing model for native browser chrome (Tab Bar, Omnibox Bar, Inspector panels).

### Breakpoints & Adaptations
- **Desktop (>= 1280px)**: 12 columns, `margin-lg` (3rem), `gutter-lg` (2rem). Browser chrome floats as a docked glass bar or top horizontal ribbon. Speed dial tiles render in a 4-to-6 column matrix.
- **Tablet (768px – 1279px)**: 8 columns, `margin` (1.5rem), `gutter` (1.25rem). Speed dial condenses to 3 columns. Tab management collapses into a side-docked or scrolling horizontal capsule bar.
- **Mobile (< 768px)**: 4 columns, `margin-sm` (1rem), `gutter-sm` (0.75rem). The omnibox docks to the bottom edge with bottom-sheet modals for history, tabs, and extensions.

### Spacing Rhythm
Component layouts follow a strict 4px/8px incremental base rhythm. Vertical rhythm between glass containers must stay consistently at `space-lg` to prevent visual border merging.

## Elevation & Depth

Visual hierarchy is communicated through physical refraction, backdrop blur radius, and directional rim lighting rather than traditional dark shadow drop.

### Glass Stratum Levels

1. **Level 0 (Canvas Base)**:
   - Background: `#060810` enriched with two or more radial ambient glow orbs (`rgba(0, 240, 255, 0.08)` and `rgba(37, 99, 235, 0.12)` blurred with `filter: blur(120px)`).
   - No border, no backdrop filter.

2. **Level 1 (Docked Chrome & Sidebars)**:
   - Background: `rgba(10, 16, 30, 0.65)`.
   - Backdrop filter: `blur(20px) saturate(180%)`.
   - Border: 1px solid `rgba(255, 255, 255, 0.08)`.
   - Shadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`.

3. **Level 2 (Floating Panels & Omnibox Bar)**:
   - Background: `rgba(14, 22, 42, 0.78)`.
   - Backdrop filter: `blur(32px) saturate(200%)`.
   - Border: 1px solid `rgba(255, 255, 255, 0.12)`.
   - Specular highlight: Linear gradient border (top-to-bottom: `rgba(255, 255, 255, 0.25)` tapering to `rgba(255, 255, 255, 0.02)`).
   - Shadow: `0 16px 48px -8px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(0, 240, 255, 0.1)`.

4. **Level 3 (Modals, Context Popovers & Active Overlays)**:
   - Background: `rgba(18, 28, 54, 0.88)`.
   - Backdrop filter: `blur(48px) saturate(220%)`.
   - Border: 1px solid `rgba(0, 240, 255, 0.3)`.
   - Shadow: `0 24px 64px -12px rgba(0, 0, 0, 0.8), 0 0 24px 0 rgba(0, 240, 255, 0.15)`.

## Shapes

The shape system leverages balanced, ergonomic radii that soften high-contrast specular borders while preserving an engineered, technical feel:

- **Base Radius (`0.5rem` / 8px)**: Segmented controls, context menu items, badges, and inline buttons.
- **Container Radius (`rounded-lg`, `1rem` / 16px)**: Speed dial cards, dropdown flyouts, floating Omnibox bar, tab items.
- **Dialog & Hero Surface Radius (`rounded-xl`, `1.5rem` / 24px)**: Main browser workspace containers, modal dialogs, and expanded settings panels.
- **Pill (`9999px`)**: URL security badges, active search suggestions, state toggles, and omnibox query pills.

## Components

### 1. Omnibox (Search & Address Bar)
- **Resting**: Height 44px, pill or `rounded-lg` silhouette. `rgba(14, 22, 42, 0.6)` background, `blur(24px)`, 1px border of `rgba(255, 255, 255, 0.1)`. Protocol (`https://`) rendered in `text-muted`, main domain in `text-primary` (`font-weight: 500`).
- **Focus**: Border switches to `1px solid rgba(0, 240, 255, 0.5)`. Ambient outer glow `0 0 20px rgba(0, 240, 255, 0.2)`. Expands seamlessly into an attached glass popover showing top hits, bookmark queries, and tab transitions.

### 2. Speed Dial Tiles
- Constructed with `rounded-lg` (16px) glass cards.
- Background: `rgba(255, 255, 255, 0.03)` with `blur(16px)` and 1px border `rgba(255, 255, 255, 0.07)`.
- **Hover**: Rises 3px (`transform: translateY(-3px)`), background shifts to `rgba(0, 240, 255, 0.06)`, border illuminates to `rgba(0, 240, 255, 0.35)`, subtle internal cyan gradient sheen. Favicon/app icon floats over a soft radial glow.

### 3. Tabs (Desktop Strip)
- Inactive tabs: Borderless, semi-transparent text `text-secondary`, slight background hover `rgba(255, 255, 255, 0.04)`.
- Active tab: Raised frosted glass surface (`rgba(14, 22, 42, 0.85)`), hairline top edge highlight `rgba(0, 240, 255, 0.6)`, soft bottom connection into the active viewport canvas.

### 4. Buttons
- **Primary**: Background `linear-gradient(135deg, #00F0FF 0%, #2563EB 100%)`, text `#060810` (weight 600), subtle cyan shadow glow `0 0 16px rgba(0, 240, 255, 0.35)`.
- **Secondary (Glass)**: Background `rgba(255, 255, 255, 0.05)`, border `1px solid rgba(255, 255, 255, 0.12)`, text `text-primary`. Hover intensifies border to `rgba(255, 255, 255, 0.3)`.
- **Icon Buttons**: Circular or `0.5rem` rounded square, 36x36px. Transparent baseline with `rgba(255, 255, 255, 0.08)` hover state and cyan tint on press.

### 5. Input Fields & Search Queries
- Inset look using `rgba(6, 8, 16, 0.6)`, interior shadow `inset 0 2px 4px rgba(0, 0, 0, 0.5)`.
- 1px border `rgba(255, 255, 255, 0.1)`, transitioning to `rgba(0, 240, 255, 0.4)` upon activation.

### 6. Chips & Badges
- Compact padding (`0.25rem 0.625rem`), font `label-mono-sm`.
- Security Badges (EV / TLS): Background `rgba(0, 240, 255, 0.1)`, text `#00F0FF`, border `1px solid rgba(0, 240, 255, 0.25)`.
- Trackers Blocked / Shield Badges: Luminous electric blue tint with animated counter update glow.

### 7. Checkboxes & Switches
- **Switch Track**: 44x24px, pill-shaped, background `rgba(255, 255, 255, 0.1)`. Checked state transitions to `#2563EB` with `#00F0FF` thumb border.
- **Checkbox**: 18x18px, `roundedness: 1` (4px). Unchecked: `1px solid rgba(255, 255, 255, 0.2)` over transparent glass. Checked: Filled with `#00F0FF`, checkmark icon in `#060810`.