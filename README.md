# SaaS Contract Analyzer

AI-powered tool for reviewing SaaS contracts. Paste raw contract text and the app flags renewal traps, price escalators, asymmetric clauses, and other negotiation risks.

## What it does

- Parses contract text into individual clauses
- Detects **renewal terms** and auto-renewal mechanics
- Flags **price escalator** language and fee increase triggers
- Extracts key metadata: notice periods, term lengths, percentages
- Surfaces a summary of detected issues

## How it works

React + Vite + TypeScript app. Analysis runs entirely in the browser via a heuristic pattern matcher in `src/analysis/contractAnalyzer.ts`. No data leaves the browser.

The analyzer currently handles renewal, auto-renewal, and price escalation detection well. The architecture is designed so the local heuristic engine can be swapped for an LLM-based analyzer for deeper clause-level reasoning.

## Testing & gap analysis

To stress-test the tool, I generated a realistic 11-section SaaS master agreement with **20+ deliberately seeded issues** spanning:

| Category | Example issues seeded |
|---|---|
| **Commercial / Financial** | Uncapped price increases, 3-month liability cap (vs. 12-month standard), "whichever is higher" interest clause, no refund on early termination |
| **Data & Privacy** | Perpetual irrevocable license to customer data contradicting ownership clause, vague breach notification timeline, 7-day data retrieval window, unrestricted cross-border data transfer |
| **Asymmetry** | One-sided indemnification, provider-only termination for convenience, provider-only assignment rights, liability cap carve-outs only benefiting provider |
| **Operational / SLA** | Unlimited maintenance exclusions from uptime calculations, 15% SLA credit cap, no severity-tiered support, revocable license grant |
| **Legal / Structural** | Unilateral amendment via website posting, mandatory arbitration with no carve-outs, 1-year confidentiality tail, force majeure covering cloud infrastructure failures |

### Current detection results

The analyzer correctly flags:
- 2 renewal-related clauses
- 1 price escalator clause
- 2 auto-renewal clauses

It does not yet surface the deeper red flags — asymmetric obligations, contradictory clauses, below-market terms, or regulatory risk. This is the expected gap for a heuristic/pattern-matching approach and the motivation for moving to LLM-based analysis.

### Planned improvements

- **Clause asymmetry detection** — identify who bears the obligation vs. who benefits in each clause
- **Cross-clause contradiction flagging** — e.g., data ownership statement vs. perpetual data license
- **Market benchmarking** — compare specific terms (liability caps, notice periods, data retrieval windows) against industry norms
- **Severity scoring** — rank issues by negotiation impact
- **LLM integration** — replace or augment the heuristic engine with an API call for deeper reasoning

## Getting started

```bash
npm install
npm run dev
```

Then open the local URL (typically `http://localhost:5173`).

## Built with

- React + TypeScript + Vite
- [Cursor](https://cursor.sh) (AI-assisted development)
- [Claude](https://claude.ai) (test contract generation, gap analysis, and roadmap)

## Disclaimer

This tool is for informational purposes only and does not constitute legal advice.
