import { useMemo, useState } from "react";
import { analyzeContract, type ContractAnalysis } from "./analysis/contractAnalyzer";
import { AnalysisResults } from "./components/AnalysisResults";

const SAMPLE_CONTRACT = `This Software as a Service Subscription Agreement (the "Agreement") is entered into as of January 1, 2026 (the "Effective Date") for an initial term of one (1) year (the "Initial Term").

Following the Initial Term, this Agreement shall automatically renew for successive one (1) year periods (each, a "Renewal Term") unless either party provides written notice of non-renewal at least sixty (60) days prior to the end of the then-current term.

The Subscription Fees for the Initial Term are set forth in the Order Form. For each Renewal Term, Provider may increase the Subscription Fees by the greater of (a) five percent (5%) over the then-current fees or (b) the percentage increase in the Consumer Price Index (CPI-U) published by the U.S. Bureau of Labor Statistics, not to exceed eight percent (8%) in any Renewal Term.

Either party may terminate this Agreement for cause upon thirty (30) days' written notice if the other party materially breaches this Agreement and fails to cure such breach within such thirty (30) day period. Customer shall not be entitled to terminate this Agreement for convenience during the Initial Term.

Customer may terminate this Agreement for convenience during any Renewal Term upon ninety (90) days' prior written notice, effective at the end of the then-current Renewal Term.`;

function looksLikeContract(text: string): boolean {
  const normalized = text.toLowerCase();
  const lengthOk = text.length > 120;

  const coreMarkers = ["agreement", "contract"];
  const partyMarkers = ["party", "parties", "customer", "client", "vendor", "provider"];
  const termMarkers = ["term", "effective date", "initial term", "renewal", "renewal term"];
  const commercialMarkers = ["fee", "fees", "subscription", "services", "license", "order form"];

  const hasCore = coreMarkers.some((k) => normalized.includes(k));
  const hasParties = partyMarkers.some((k) => normalized.includes(k));

  const signals =
    Number(hasCore) +
    Number(hasParties) +
    termMarkers.filter((k) => normalized.includes(k)).length +
    commercialMarkers.filter((k) => normalized.includes(k)).length;

  return lengthOk && hasCore && signals >= 3;
}

function App() {
  const [contractText, setContractText] = useState("");
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = useMemo(
    () => contractText.trim().length > 40 && !isAnalyzing,
    [contractText, isAnalyzing]
  );

  const handleAnalyze = () => {
    setError(null);
    const text = contractText.trim();

    if (!text) {
      setError("Paste a contract excerpt or use the sample to get started.");
      return;
    }

    if (!looksLikeContract(text)) {
      setAnalysis(null);
      setError(
        "This text does not look like a contract. Please paste contract language (we look for words like 'Agreement', 'Parties', 'Term', 'Fees')."
      );
      return;
    }

    setIsAnalyzing(true);

    // Synchronous "AI" analysis – you could swap this out for an API call.
    try {
      const result = analyzeContract(text);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
      setError("Something went wrong while analyzing the contract.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUseSample = () => {
    setContractText(SAMPLE_CONTRACT);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1>SaaS Contract Analyzer</h1>
          <p className="subtitle">
            Paste a SaaS or commercial contract and let the analyzer surface key
            renewal terms, price escalators, and auto-renewal traps.
          </p>
        </div>
        <div className="header-badge">
          <span className="badge-dot" />
          <span>AI-assisted review (non-legal advice)</span>
        </div>
      </header>

      <main className="app-main">
        <section className="input-panel card">
          <header className="card-header">
            <h2>Contract Text</h2>
            <p className="card-subtitle">
              Paste the relevant sections (term, fees, renewal) or the entire agreement.
            </p>
          </header>
          <div className="card-body">
            <textarea
              className="contract-input"
              placeholder="Paste contract language here (no formatting needed)..."
              value={contractText}
              onChange={(e) => setContractText(e.target.value)}
              rows={14}
            />
            {error && <p className="error-text">{error}</p>}
          </div>
          <footer className="card-footer">
            <div className="button-row">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="primary-button"
              >
                {isAnalyzing ? "Analyzing…" : "Analyze Contract"}
              </button>
              <button
                type="button"
                onClick={handleUseSample}
                className="ghost-button"
              >
                Use sample SaaS contract
              </button>
            </div>
            <p className="helper-text">
              This tool highlights negotiation points but does not replace review by legal
              counsel.
            </p>
          </footer>
        </section>

        <section className="results-panel">
          {analysis ? (
            <AnalysisResults analysis={analysis} />
          ) : (
            <div className="welcome-panel">
              <p className="welcome-kicker">Welcome</p>
              <h2 className="welcome-title">Get to the point of your SaaS contracts.</h2>
              <p className="welcome-tagline">
                Paste the term, pricing, and renewal sections and we will spotlight the few
                clauses that actually need your attention.
              </p>
              <ul className="welcome-points">
                <li>See renewal dates and lock-in terms at a glance.</li>
                <li>Catch price escalators and quiet year-over-year increases.</li>
                <li>Avoid surprise auto-renewals with long notice periods.</li>
              </ul>
              <p className="welcome-footnote">
                This is a fast first pass, not legal advice — use it to aim your human review
                at the right sections.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;

