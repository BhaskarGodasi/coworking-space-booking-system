# Theme Guide

## Light and Dark Mode
The application supports both Light and Dark modes. The theme preference is persisted in `localStorage` and respects the system preference by default.

### Implementation
- We use Tailwind's `class` strategy for dark mode.
- A global `ThemeProvider` context wraps the application to inject the `dark` class onto the root `<html>` element.

### CSS Variables (index.css)
Theme colors are managed via CSS variables to allow seamless switching between light and dark modes without redefining classes everywhere.

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --primary: 243 75% 59%; /* Indigo-600 */
    --primary-foreground: 0 0% 100%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --border: 240 5.9% 90%;
    /* ... other variables mapped to shadcn/ui defaults */
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --primary: 243 75% 59%; /* Indigo-600 */
    --primary-foreground: 0 0% 100%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --border: 240 3.7% 15.9%;
  }
}
```

### Usage
Always use the semantic Tailwind classes provided by the theme configuration:
- Use `bg-background text-foreground` for main page containers.
- Use `bg-card text-card-foreground` for card surfaces.
- Use `bg-muted text-muted-foreground` for secondary/tertiary text and backgrounds.
- Do NOT hardcode colors (e.g., avoid `bg-white dark:bg-black`), rely on semantic variables.

## Animations
Keep animations subtle and professional:
- **Hover States**: Add subtle background changes or elevation (e.g., `transition-colors hover:bg-muted`, `transition-shadow hover:shadow-md`).
- **Loading**: Use `animate-pulse` for skeleton loaders.
- **Dialogs**: Use fade and slight slide-up animations for entry.
