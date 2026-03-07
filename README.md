# SaaS Contract Analyzer

A lightweight React-based tool for quickly reviewing SaaS and other commercial contracts. Paste raw contract text and the app will highlight:

- renewal dates and terms
- price escalators / fee increase language
- auto-renewal clauses and notice periods

> This tool is for information only and is **not** legal advice.

## Getting started

From the `contract-analyzer` directory:

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`) in your browser.

## How it works

- The front-end is a React + Vite + TypeScript app.
- Contract analysis happens entirely in the browser via a heuristic analyzer:
  - text is split into sentences
  - simple patterns identify likely renewal, auto-renewal, and escalator clauses
  - basic metadata (dates, percentages, notice periods) is extracted where possible
- The UI surfaces:
  - sentences grouped by category
  - extracted metadata as chips
  - high-level issues / negotiation prompts

You can swap the local analyzer in `src/analysis/contractAnalyzer.ts` with a call to your preferred LLM/API if you want a more advanced “AI agent”.

