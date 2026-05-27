# Visual Update Plan: Staggered Dashboard Entrance Animations & Card Hover Effects

## Goal
Add polished entrance animations and micro-interactions to the dashboard for a more premium, modern feel.

## Changes

### 1. `tailwind.config.ts`
- Add new keyframes: `fade-in-up`, `scale-in`, `progress-fill`
- Add new animation utilities: `animate-fade-in-up`, `animate-scale-in`, `animate-progress-fill`

### 2. `src/components/dashboard/KPICard.tsx`
- Add animated progress bar that fills from 0% to actual value on mount (1s ease-out)
- Add subtle card hover lift: `hover:-translate-y-1 hover:shadow-card-hover`
- Add `duration-300` transition for smooth hover feel

### 3. `src/pages/Dashboard.tsx`
- Apply staggered `animate-fade-in-up` with inline `animationDelay` to:
  - KPI cards (delay: 0ms, 100ms, 200ms, 300ms)
  - AnalysisSummary (delay: 400ms)
  - RevenueChart (delay: 500ms)
  - OtherIncomeSummary (delay: 600ms)
  - MonthProjectionSummary (delay: 700ms)
  - DailyDataTable (delay: 800ms)
- Add `opacity-0` initial state so animation starts hidden and fades in

## Impact
Dashboard sections no longer appear instantly all at once. Cards subtly lift on hover. Progress bars animate on load. Overall perception of quality and polish improves significantly.
