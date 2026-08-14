# Instant month switching on Room Types

## What changes
Switching months on the Room Types page currently clears the page and shows loading placeholders while the new month is fetched. This update makes month switching feel instant:

- The current month's figures stay on screen while the new month loads, instead of blanking out.
- While the new data is in flight, the content dims very slightly so it's clear it's refreshing — no layout jump.
- The next and previous months are quietly pre-loaded in the background, so most switches show new numbers immediately with no wait at all.
- Opening the month dropdown pre-loads the months you can see, so the one you pick is usually already cached.
- Users who prefer reduced motion get no dim transition, just the swap.

No number, formula, or layout change — same values and formatting.

## Technical details
- `src/pages/RoomTypes.tsx`: add `placeholderData: (prev) => prev` to the `['roomTypes', 'summary', month]` query so the previous month's result renders while the new key fetches; use `isPlaceholderData` to apply an `opacity-60 transition-opacity` wrapper class (skipped when `usePrefersReducedMotion()` is true). Keep the existing skeleton only for the true first load (`isLoading` with no cached data).
- Extract the existing `queryFn` body into a `fetchRoomTypeSummary(month: string | null)` helper in the same file so it can be reused for prefetching.
- Add a `useEffect` that calls `queryClient.prefetchQuery` for the adjacent months (previous/next entries in `availableMonths` from `MonthContext`) whenever `selectedMonth` changes, with a `staleTime` matching the main query so it doesn't refetch immediately.
- `src/components/MonthSelector.tsx`: accept an optional `onPrefetchMonth?: (month: string) => void` prop, fired on `SelectItem` `onMouseEnter`/`onFocus` and on dropdown open; Room Types passes a handler that prefetches that month. Other pages pass nothing, so their behaviour is unchanged.

## Out of scope
- No backend, query-shape, or business-logic changes.
- Dashboard already loads all months in one core query, so it is untouched.

## Verification
- TypeScript check passes (`tsgo`).
- Production build passes.
- Preview: switching months on Room Types keeps the old figures visible with a brief dim, and re-switching to an adjacent month is instant.
