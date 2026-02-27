

## Recommendation: Keep Both, But Rename for Clarity

The two metrics actually tell different stories, and both are useful:

- **Simple Average ADR** (Dashboard): "What was the typical daily rate?" — matches your spreadsheet calculations and is intuitive for day-to-day monitoring.
- **Weighted ADR** (Room Types): "What did we actually earn per room sold?" — accounts for volume differences across days, giving a more accurate revenue-per-key metric.

### Proposed Changes

1. **Dashboard ADR card** — Keep the simple average calculation. Rename subtitle to clarify: `"Simple avg across days"` so it's obvious what it represents.

2. **Room Types Weighted ADR card** — Keep the revenue ÷ rooms sold calculation. Update subtitle to: `"Revenue ÷ rooms sold"`.

3. **No formula changes** — Both calculations stay as they are, preserving consistency with your spreadsheet.

This is a small labeling update to `Dashboard.tsx` and `RoomTypes.tsx` subtitles only.

