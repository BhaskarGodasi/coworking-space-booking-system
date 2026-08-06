# UI Design System

## Overview
This document serves as the single source of truth for the frontend UI Design System of CoWork Hub. It defines the visual language, branding elements, typography, and color palettes that ensure a cohesive, professional enterprise SaaS experience.

## Brand Identity
- **Application Name**: CoWork Hub
- **Tagline**: *Book Smarter. Work Better.*
- **Logo**: Minimal geometric "C" icon (Lucide-inspired).

## Typography
- **Primary Font**: Inter (sans-serif)
- **Hierarchy**:
  - `h1`: 2.5rem (40px), font-bold, leading-tight
  - `h2`: 2rem (32px), font-semibold, leading-tight
  - `h3`: 1.75rem (28px), font-semibold, leading-snug
  - `h4`: 1.5rem (24px), font-medium, leading-snug
  - `body-lg`: 1.125rem (18px), font-normal, leading-relaxed
  - `body`: 1rem (16px), font-normal, leading-relaxed
  - `small`: 0.875rem (14px), font-normal, leading-normal

## Color Palette
The color system relies on Tailwind CSS defaults for consistency, mapped to semantic roles.

### Neutral (Backgrounds, Borders, Text)
- **Base Neutral**: Slate / Zinc
- `background`: bg-zinc-50 (Light) / bg-zinc-950 (Dark)
- `foreground`: text-zinc-900 (Light) / text-zinc-50 (Dark)
- `muted`: bg-zinc-100 / text-zinc-500
- `border`: border-zinc-200 / border-zinc-800

### Brand Colors
- **Primary**: Indigo
  - `primary`: bg-indigo-600
  - `primary-foreground`: text-white
  - `primary-hover`: bg-indigo-700
- **Accent**: Emerald (used for success states and positive highlights)
  - `accent`: bg-emerald-600
  - `accent-foreground`: text-white

### Feedback/Semantic Colors
- **Success**: Emerald (e.g., Booked/Approved)
- **Warning**: Amber (e.g., Pending, Maintenance)
- **Danger**: Red (e.g., Rejected, Delete Actions)

## Icons
- **Icon Set**: Lucide (`lucide-react`)
- **Usage**: Use stroke-width `2`, consistent sizing (`w-4 h-4` for inline text, `w-5 h-5` for standard buttons/menus).

## Spacing & Layout
- Follow a strict 4px/8px scale (Tailwind default `spacing`).
- Standard content max-width for landing pages: `max-w-7xl`.
- Padding for standard sections: `py-12 md:py-24`.
