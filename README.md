# UVM-Asset-Map
Consolidated records of UVMS programs across different colleges; repository holds data and sources usage and visualization.

## Layout

| Path | What |
|---|---|
| `data/*.csv` | Raw asset-map exports (never edited) |
| `data/processed/` | Cleaned CSVs with added `keywords`, `audience`, `audience_primary`, `region_category`, `asset_category` columns, plus `enrichment.json` (source of truth for those columns) |
| `prompts/enrich_assets.md` | Standardized prompt + controlled vocabularies used to generate `enrichment.json` |
| `scripts/build_data.py` | Cleans raw CSVs, merges enrichment, writes processed CSVs and `web/public/assets.json` |
| `web/` | React + Cytoscape.js viewer (search, drill-down hierarchy, keyword exploration) |
| `docs/decisions.md` | Why things are the way they are |

## Data pipeline

```sh
uv run scripts/build_data.py              # rebuild processed CSVs + viewer JSON
uv run scripts/build_data.py --dump-rows  # rows + keyword vocabulary to feed the enrichment prompt
uv run pytest                             # pipeline + enrichment schema tests
```

New or changed programs: add them to the raw CSV, run `--dump-rows`, apply `prompts/enrich_assets.md`
to the rows marked `"enriched": false`, add the results to `data/processed/enrichment.json`, rebuild.
The build exits non-zero if any row is missing enrichment.

## Viewer

```sh
cd web
npm install
npm run dev     # http://localhost:5173/UVM-Asset-Map/
npm test
npm run build   # static site in web/dist
```

Pushing to `main` runs both test suites and deploys `web/dist` to GitHub Pages
(`.github/workflows/pages.yml`; enable Pages → Source: GitHub Actions in repo settings).
