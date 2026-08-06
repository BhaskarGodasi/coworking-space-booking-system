# Responsive Guide

## Approach
CoWork Hub is designed with a **Mobile-First** approach. Base styles apply to mobile devices (phones), and Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) are used to scale the layout up for larger screens.

## Breakpoints
We use standard Tailwind CSS breakpoints:
- **Mobile (Default)**: `< 640px`. Single column layouts, stacked elements, hamburger menus.
- **Tablet (`sm`)**: `≥ 640px`. Two-column grids for cards, adjusted padding.
- **Laptop (`md`)**: `≥ 768px`. Standard desktop layouts, visible sidebars, horizontal navbars.
- **Desktop (`lg`)**: `≥ 1024px`. Wider content areas, complex multi-column dashboards.
- **Widescreen (`xl`)**: `≥ 1280px`. Max-width containment (`max-w-7xl`).

## Layout Strategies

### Public Pages (Landing, Space List)
- **Container**: Wrap content in a centralized container: `container mx-auto px-4 md:px-8`.
- **Grids**: 
  - Mobile: `grid-cols-1`
  - Tablet: `grid-cols-2`
  - Desktop: `grid-cols-3` or `grid-cols-4` (e.g., Space Cards).

### Dashboards
- **Sidebar**:
  - **Mobile**: Hidden by default, accessible via a bottom sheet or a hamburger menu drawer overlay.
  - **Desktop (`md+`)**: Fixed left sidebar, persistent, content area takes the remaining width (`w-64 flex-shrink-0` for sidebar, `flex-1` for content).
- **Tables**: Use horizontal scrolling (`overflow-x-auto`) for wide data tables on mobile devices to prevent layout breakage.

## Touch Targets
- Ensure all interactive elements (buttons, links) are at least `44px` tall on mobile for ease of tapping (WCAG AAA recommendation).
- Use `h-10` or `h-11` (40-44px) for standard buttons and inputs.
