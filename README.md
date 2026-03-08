# Redline

AI-powered tool for reviewing SaaS contracts. Paste raw contract text and the app flags renewal traps, price escalators, and other negotiation risks, then **scores them by severity** so you can focus on the worst items first.

## What it does

- Parses contract text into individual clauses
- Detects **renewal terms** and auto-renewal mechanics
- Flags **price escalator** language and fee increase triggers
- **Detects data ownership contradictions** (e.g., Customer owns data but grants perpetual irrevocable license)
- Extracts key metadata: notice periods, term lengths, percentages
- **Scores each finding by severity** (high / medium / low / informational) with a plain-language reason
- Surfaces a **prioritized** Red Flags list and severity breakdown in the overview

## How it works

React + Vite + TypeScript app. Analysis runs entirely in the browser. No data leaves the browser.

1. **Detection**: `src/analysis/contractAnalyzer.ts` uses heuristic pattern matching to find renewal, auto-renewal, price escalator, termination-related language, and data ownership contradictions.
2. **Scoring**: `src/analysis/severityConfig.ts` assigns a severity level and reason to each finding. Rules and thresholds (e.g. >60 days notice = high, uncapped escalator = high, data ownership contradiction = high) live in this config so they can be tuned without touching detection logic.
3. **UI**: The **Red Flags & To-Dos** section is the primary action surface: issues are sorted high → medium → low → informational, each with a severity badge and reason. The overview bar shows a severity breakdown (e.g. "2 high · 1 medium · 1 low"). Category detail views show a severity badge on each clause.

The architecture is designed so the heuristic engine can be swapped or augmented with an LLM-based analyzer for deeper clause-level reasoning.

## Testing & gap analysis

To stress-test the tool, I generated a realistic 11-section SaaS master agreement with **20+ deliberately seeded issues** spanning:

| Category | Example issues seeded |
|---|---|
| **Commercial / Financial** | Uncapped price increases, 3-month liability cap (vs. 12-month standard), "whichever is higher" interest clause, no refund on early termination |
| **Data & Privacy** | Perpetual irrevocable license to customer data contradicting ownership clause, vague breach notification timeline, 7-day data retrieval window, unrestricted cross-border data transfer |
| **Asymmetry** | One-sided indemnification, provider-only termination for convenience, provider-only assignment rights, liability cap carve-outs only benefiting provider |
| **Operational / SLA** | Unlimited maintenance exclusions from uptime calculations, 15% SLA credit cap, no severity-tiered support, revocable license grant |
| **Legal / Structural** | Unilateral amendment via website posting, mandatory arbitration with no carve-outs, 1-year confidentiality tail, force majeure covering cloud infrastructure failures |

### Current detection and severity

The analyzer detects renewal, auto-renewal, price escalator, and data ownership contradiction clauses and scores them by risk. For example:

- **High**: e.g. auto-renewal notice >60 days, uncapped or >10% price increases, customer must give >60 days to terminate, one-sided termination for convenience, **data ownership contradiction** (Customer owns data but grants perpetual irrevocable license)
- **Medium**: e.g. 31–60 day notice, escalators capped 5–10%, no termination-for-convenience language
- **Low**: e.g. ≤30 day notice, CPI-linked escalator with ≤5% cap
- **Informational**: detected but no rule match, or missing-clause notes

The built-in sample contract triggers at least one high and one medium issue so you can see prioritization on first use.

It does not yet surface all deeper red flags: asymmetric obligations, below-market terms, or regulatory risk. That is the expected gap for a heuristic approach and the motivation for moving to LLM-based analysis.

### Planned improvements

- **Clause asymmetry detection**: identify who bears the obligation vs. who benefits in each clause
- **Additional contradiction detection**: expand beyond data ownership to other contradictory clause patterns
- **Market benchmarking**: compare specific terms (liability caps, notice periods, data retrieval windows) against industry norms
- **LLM integration**: replace or augment the heuristic engine with an API call for deeper reasoning

## Getting started

```bash
npm install
npm run dev
```

Then open the local URL (typically `http://localhost:5173`).

## Testing

### Automated Tests

```bash
# Run all tests
npm run test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui
```

### Manual Browser Testing

See `BROWSER-TEST-CHECKLIST.md` for step-by-step manual testing instructions.

### Test Coverage

- ✅ 20+ automated unit tests
- ✅ 12+ browser test cases
- ✅ Edge case coverage (alternative phrasing, multiple clauses, etc.)
- ✅ Integration tests with other features

See `TESTING-GUIDE.md` for complete testing documentation.

## Built with

- React + TypeScript + Vite
- [Cursor](https://cursor.sh) (AI-assisted development)
- [Claude](https://claude.ai) (test contract generation, gap analysis, and roadmap)

## Disclaimer

This tool is for informational purposes only and does not constitute legal advice.
