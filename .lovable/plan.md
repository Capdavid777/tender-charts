## Dark mode toggle for the dashboard

### What's true today
- `tailwind.config.ts` is set to `darkMode: ["class"]`.
- `src/index.css` already defines a complete `.dark` palette (navy background, gold primary, sidebar, charts, borders).
- Nothing ever adds the `dark` class: there is no theme provider and no toggle anywhere in `src`. The only `next-themes` usage is inside `src/components/ui/sonner.tsx`, which currently always falls back to `"system"` with no provider above it.

So the dark theme is fully designed but unreachable — this makes it work.

### What to build
1. **Theme provider** — wrap the app in `next-themes`' `ThemeProvider` (already a dependency via the sonner component) with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, and `disableTransitionOnChange`. Placed in `src/App.tsx` above `TooltipProvider` so both the toaster and the pages read it.
2. **Toggle control** — a small icon button (sun/moon from lucide, already used) in the `DashboardLayout` header, sitting next to the "What's New" bell so the existing header layout fixes stay intact. Cycles light → dark → system with an accessible label and tooltip.
3. **Contrast pass** — walk the dashboard, room types, historical, analysis and website analytics pages in dark mode and fix any spots that hardcode light-only colors (e.g. `bg-white`, `text-black`, literal hex) by swapping to the existing semantic tokens. Chart series already read from `--chart-*`, which are themed.
4. **No flash on load** — a tiny inline script in `index.html` that applies the stored/system theme class before React mounts, so a dark-mode user never sees a white flash.

### Out of scope
- No new colour design; uses the `.dark` palette already in `index.css`.
- No per-user persistence in the database — theme is stored in localStorage on the device.
- No changes to data fetching, targets, or business logic.

### Verification
Toggle in the header and confirm every page (including charts, tables, skeletons and dialogs) reads correctly in dark mode; reload to confirm the choice sticks with no white flash; set the OS to dark and confirm "system" follows it.
