# Global Command Palette (Cmd+K)

## What changes
Add a keyboard-driven command palette that lets staff jump to any dashboard page, refresh data, toggle theme, or open common actions without reaching for the mouse. Press `Cmd+K` (or `Ctrl+K`) from anywhere inside the app to open a searchable overlay.

- Navigation: Overview, Room Types, Historical, Analysis, Website Analytics, Upload Data, Changelog.
- Actions: Refresh dashboard data, toggle light/dark theme, log out.
- Admin-only items (Upload, Changelog) are hidden for viewers.
- A small keyboard hint appears in the header so users discover the shortcut.

## Technical details
- Create `src/components/CommandPalette.tsx` using the existing `cmdk` dependency and the shadcn `CommandDialog`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, and `CommandShortcut` primitives.
- Register the `Cmd+K` / `Ctrl+K` listener in `App.tsx` (or a new provider) so it works across all routes. Close on `Escape` and backdrop click.
- Read `useAuth().isAdmin` to filter admin-only actions/routes.
- Use `useNavigate()` for route changes and the existing `window.dispatchEvent(new CustomEvent('app:refresh-data'))` plus `queryClient.invalidateQueries()` for refresh.
- Use the existing `ThemeProvider`/`next-themes` API for theme toggle (`setTheme`).
- Add a subtle "Cmd+K" badge in `DashboardLayout.tsx` next to the refresh/version area, hidden on small screens.
- Respect reduced motion: rely on the existing dialog animations (already handled by shadcn/Radix), no extra motion added.

## Out of scope
- No backend, auth, or data changes.
- No new dependencies (`cmdk` is already in `package.json`).
- No changes to existing page layouts or business logic.

## Verification
- TypeScript check passes (`tsgo`).
- Production build passes (`bun run build`).
- Preview: pressing `Cmd+K` opens the palette, typing filters items, selecting a route navigates, and the keyboard hint is visible in the header on desktop.
