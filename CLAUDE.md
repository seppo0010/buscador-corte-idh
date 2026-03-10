# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Unofficial search engine for Inter-American Court of Human Rights (Corte IDH) jurisprudence. The project scrapes PDF case documents from corteidh.or.cr, extracts and structures the text, builds a client-side full-text search index, and serves it via a React web app deployed to GitHub Pages.

## Pipeline Stages

The project is a numbered multi-stage ETL pipeline. Run all stages end-to-end with:
```bash
./run.sh
```

Individual stages:
```bash
node 0-scraping/index.js              # Scrape PDFs from corteidh.or.cr
bash 1-extract/convertall.sh          # Convert PDFs to text (requires pdftotext/poppler)
python3 2-structure/build.py          # Parse text into structured JSON
node 3-index/index.js                 # Build MiniSearch index → data.json.gz
```

## Web App (4-web/)

```bash
cd 4-web
npm start          # Dev server
npm run build      # Production build (sets REACT_APP_DATE env var)
npm test           # Jest tests
npm run deploy     # Deploy to GitHub Pages
```

## Architecture

**Data flow:**
```
corteidh.or.cr → PDFs (data/) → .txt files (data/) → structured JSON (data/) → data.json.gz (4-web/public/) → React UI
```

**Search pipeline:**
- `3-index/index.js` builds a MiniSearch index from all structured JSON files, serializes and gzips it to `4-web/public/data.json.gz`
- The React app loads the compressed index at startup, decompresses with Pako, and runs searches in a Web Worker (`search.worker.ts`) to avoid blocking the UI thread

**Frontend key files:**
- `4-web/src/App.tsx` — main component, state management, search orchestration
- `4-web/src/search.worker.ts` — MiniSearch queries run off main thread via workerize-loader
- `4-web/src/Caso.ts` — TypeScript interface for case/opinion records
- `4-web/src/Highlighter.tsx` — highlights matching search terms in results
- `4-web/src/cadh.txt` — list of CADH articles used for article-based filtering

**Scraping:**
- Uses `puppeteer-real-browser` (anti-bot detection/Turnstile bypass) to scrape two pages: `casos_sentencias.cfm` and `opiniones_consultivas.cfm`
- Downloads PDFs matching `seriec_*.pdf` (cases) or `seriea_*.pdf` (advisory opinions)

**Data structuring (`2-structure/build.py`):**
- Parses extracted text to identify case name, date, and body
- Detects references to CADH articles within case text for filtering

**Environment variables:**
- `DATA_DIR` — shared data directory across stages (default: `"data"`)
- `REACT_APP_DATE` — injected at build time to display build date in UI
- `PUBLIC_URL` — React deployment path

## Deployment

Runs fully in Docker (see `Dockerfile`): base image includes Puppeteer, poppler-utils, Python 3, and Node.js. The web app deploys to GitHub Pages via `gh-pages`.
