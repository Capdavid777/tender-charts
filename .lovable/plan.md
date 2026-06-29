## Smooth chart entry animations

Every chart in the app currently renders instantly with no transition, which makes page loads feel abrupt.

### What changes
1. **Dashboard RevenueChart** – Add `isAnimationActive` and `animationDuration` to the `<Bar>` so daily bars grow upward on mount.
2. **Room Types charts** – Add animation to the Pie segments (donut grows) and the horizontal Bar chart (bars slide in).
3. **Historical Line charts** – Add `animationDuration` to the Revenue and Occupancy trend lines so they draw smoothly left-to-right.

### Why this matters
- Matches the polished skeleton-to-content flow already built for the dashboard.
- Gives users a visual cue that data has refreshed after month selection or upload.
- Zero risk — purely additive Recharts props, no logic or data changes.

### Scope
- Only touches chart components (`RevenueChart.tsx`, `RoomTypes.tsx`, `Historical.tsx`).
- No backend, no state, no API changes.