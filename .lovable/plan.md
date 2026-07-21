## Performance: Preconnect to the Supabase backend on initial HTML

### Problem
The first data request on any page (auth check, dashboard fetch, changelog bell, etc.) has to open a fresh TLS connection to the Supabase project host. That handshake — DNS → TCP → TLS — typically costs 150–400ms on mobile before a single byte of API response comes back. Right now the browser only starts that handshake when the JS bundle runs and Supabase is called.

### Change
Add two resource hints to `index.html`'s `<head>` pointing at the Supabase project host:

```html
<link rel="preconnect" href="https://vkmvhpltdocfksdezwqp.supabase.co" crossorigin />
<link rel="dns-prefetch" href="https://vkmvhpltdocfksdezwqp.supabase.co" />
```

`preconnect` warms up DNS + TCP + TLS in parallel with JS parsing. `dns-prefetch` is the safe fallback for older browsers that ignore preconnect. `crossorigin` is required because Supabase requests are CORS.

### Expected impact
- First Supabase request (auth session check on `/`, dashboard fetch after login) returns 100–300ms sooner on cold loads.
- Measurable improvement in LCP on the Dashboard for users on slower networks (the web-vitals logger already in place will show it).
- Zero JS cost, zero bundle change, no visual change.

### Technical details
- File touched: `index.html` only. Two `<link>` tags inserted in `<head>`.
- Host is the project's Supabase URL, hardcoded (same value already baked into `VITE_SUPABASE_URL`).
- No effect on functionality — hints are advisory to the browser.

### Out of scope
- No code changes, no routing/auth changes, no design changes.
- Not adding preconnect for other origins (fonts, R2) — none are hot-path today.
