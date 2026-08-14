# Curve Craft

Turn any CSV or Excel file into a publication-ready chart — 100% in the browser, no server, no upload.

**Live:** https://curve-craft-csv.vercel.app

## Features

- 12+ chart types — line, bar, scatter, area, box, violin, bubble, donut, treemap, heatmap and more
- CSV, TSV, and Excel (`.xlsx`/`.xls`) import, including every sheet in a multi-tab workbook
- Manual data entry with configurable rows/columns
- Formula columns via a spreadsheet-style expression engine
- Trendlines, error bars, reference lines, and fit statistics
- Free-form text and arrow annotations — draggable, resizable, and rotatable directly on the chart
- Full style controls: axis fonts, tick density, legend position, chart borders, log scales
- Data cleaning: column rename/delete, blank-fill, row edit/delete
- Undo/redo
- Export to PNG, SVG, PDF, or CSV at custom resolution
- Save/load a project as a single `.curvecraft.json` file
- Mobile-native editor shell alongside the desktop layout

## Why it's private

Parsing, charting, and rendering all happen in your browser using Plotly.js and SheetJS. Your data never touches a server — there's no upload endpoint to touch.

## Tech stack

React 18 + TypeScript + Vite, Tailwind CSS, Plotly.js (CDN, SRI-pinned), deployed as a static site on Vercel.

## Development

```bash
cd frontend
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Project structure

```
frontend/
  src/
    components/   # UI — chart area, panels, toolbar, mobile shell
    lib/           # CSV/Excel parsing, analysis, overlays, export, project I/O
    types/          # Shared AppState / annotation / column types
```
