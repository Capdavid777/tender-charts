
# Reserved Suites Illovo - Enhanced Revenue Dashboard

## Overview
A professional, corporate-styled revenue dashboard for Reserved Suites Illovo that improves upon the current Excel-upload workflow with better visuals, alerts, and a simple authentication layer.

---

## Core Features

### 1. Simple Authentication
- **Single shared login page** with password protection
- Clean professional login screen with your company branding
- Session persistence so staff stay logged in

### 2. Dashboard Overview (Home Page)
**Enhanced KPI Cards** showing:
- Revenue to Date (with progress ring toward target)
- Occupancy Rate (percentage with target comparison)
- Average Room Rate (ADR with breakeven indicator)
- Target Variance (how far from goal)

**Daily Revenue Chart** - Interactive bar chart showing:
- Daily revenue vs daily target line
- Color-coded bars (green when above target, red when below)
- Hover tooltips with exact figures

**Alert Banner** - Prominent notification when:
- Revenue is more than 20% behind target
- Occupancy drops below threshold
- Customizable alert thresholds

### 3. Room Types Page
**Summary Cards:**
- Number of active room types
- Revenue month-to-date
- Weighted ADR
- Average occupancy

**Interactive Charts:**
- Revenue breakdown by room type (pie/donut chart)
- Occupancy vs ADR comparison (grouped bar chart)
- Click on room type for detailed breakdown

### 4. Historical Trends Page
**Trend Charts:**
- Annual revenue trend (line chart with data points)
- Occupancy trend over years
- Interactive - hover for exact values

**Data Table:**
- Year-by-year summary (Rooms Sold, Occupancy %, Revenue, Avg Rate)
- Sortable columns
- Export to CSV option

### 5. Excel Upload (Improved)
**Enhanced Upload Experience:**
- Drag-and-drop file upload zone
- File format validation before processing
- Preview of data before confirming import
- Clear error messages if format issues detected
- Success confirmation with summary of imported data

---

## Design & User Experience

### Visual Style
- **Professional corporate theme** with clean layout
- Consistent color palette (matching your brand - navy/dark tones with gold/amber accents for highlights)
- Clear typography and generous whitespace
- Responsive design for desktop and tablet viewing

### Navigation
- Clean top navigation with Overview, Room Types, Historical tabs
- Month/year selector for date range filtering
- "Last Updated" timestamp always visible
- Logout option in header

---

## Technical Approach

### Backend (Lovable Cloud)
- **Database** to store uploaded revenue data, targets, and room information
- **Authentication** using single shared password
- **File processing** for Excel uploads

### What Staff Will Experience
1. Log in with shared password
2. See current month's performance at a glance with alerts
3. Navigate between views for detailed analysis
4. Upload new Excel data when needed with clear feedback
5. Data automatically populates all charts and KPIs

---

## Alerts System
Configurable alerts that appear on dashboard when:
- Revenue falls below X% of target
- Occupancy drops below threshold
- Performance significantly worse than same period last year

---

## Summary
This enhanced dashboard keeps your familiar Excel workflow while adding:
- ✅ Professional, polished visual design
- ✅ Simple password protection
- ✅ Automated alerts for staff awareness
- ✅ Better data visualization
- ✅ Improved upload experience with validation

