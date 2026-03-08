# Redline

AI-powered SaaS contract analyzer. Paste contract text or upload a PDF, get a risk grade, prioritized flags with market benchmarks, and a negotiation playbook — all in the browser.

## Features

- **Risk grade** (A–F) at the top of every analysis — instantly communicates overall contract risk
- **Severity scoring** — every detected issue tagged as high, medium, low, or informational with a plain-language reason
- **Market benchmarks** inline with flags — "120-day notice period. Market standard: 30-60 days."
- **Negotiation playbook** — one click generates a structured brief with counter-positions grouped by "Must address before signing" and "Worth negotiating"
- **Contract comparison** — paste original and revised versions side by side, see what improved (Resolved), what got worse (New risks), and what's unchanged, with a grade for each version
- **PDF upload** — drag and drop or click to upload, text extracted in-browser via pdf.js
- **Data ownership contradiction detection** — flags when a contract asserts Customer owns data but grants Provider a perpetual irrevocable license over it
- **Light / dark mode** — respects OS preference, toggleable
- **Zero data transmission** — everything runs client-side, nothing leaves the browser

## How it works

React + Vite + TypeScript. No backend.

1. **Detection** (`src/analysis/contractAnalyzer.ts`): heuristic pattern matching finds renewal, auto-renewal, price escalator, termination, and data ownership contradiction clauses.
2. **Scoring** (`src/analysis/severityConfig.ts`): assigns severity and reason to each finding. Thresholds (>60 days notice = high, uncapped escalator = high, data ownership contradiction = high) live in config, separate from detection logic.
3. **UI**: Red Flags shows only high and medium issues. Category cards show all detections. The negotiation playbook maps each flag to a specific counter-position.

The architecture is designed so the heuristic engine can be swapped for an LLM-based analyzer.

## Testing & gap analysis

To stress-test the tool, I generated two realistic SaaS master agreements with **20+ deliberately seeded issues** spanning commercial/financial, data & privacy, asymmetry, operational/SLA, and legal/structural categories.

### What Redline catches

- Auto-renewal with aggressive notice periods (>60 days → high)
- Uncapped or high-percentage price escalators (>10% → high)
- One-sided termination for convenience
- Missing termination for convenience language
- Data ownership contradictions (ownership assertion + perpetual irrevocable license)
- Negation-aware cap detection ("without cap" correctly treated as uncapped)

### What it doesn't catch yet

Asymmetric indemnification, below-market liability caps, vague breach notification timelines, overbroad force majeure, unilateral amendment clauses, and other issues requiring semantic understanding or cross-clause reasoning beyond pattern matching.

### Planned improvements

- Clause asymmetry detection
- Additional contradiction patterns beyond data ownership
- LLM integration for deeper reasoning

## Getting started

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Testing

```bash
npm run test        # watch mode
npm run test:run    # CI mode
npm run test:ui     # with UI
```

40 automated tests covering detection, scoring, edge cases, and integration.

## Built with

- React + TypeScript + Vite
- [Cursor](https://cursor.sh) (AI-assisted development)
- [Claude](https://claude.ai) (test contract generation, requirements, gap analysis, roadmap)

## Disclaimer

This tool is for informational purposes only and does not constitute legal advice.
