import { useMemo, useState } from "react";
import { analyzeContract, type ContractAnalysis } from "./analysis/contractAnalyzer";
import { AnalysisResults } from "./components/AnalysisResults";
import { ComparisonResults } from "./components/ComparisonResults";
import { ThemeToggle } from "./components/ThemeToggle";
import { PDFUpload } from "./components/PDFUpload";
import { compareContracts } from "./utils/contractComparison";

const SAMPLE_CONTRACT = `This Software as a Service Subscription Agreement (the "Agreement") is entered into as of January 1, 2026 (the "Effective Date") for an initial term of one (1) year (the "Initial Term").

Following the Initial Term, this Agreement shall automatically renew for successive one (1) year periods (each, a "Renewal Term") unless either party provides written notice of non-renewal at least sixty (60) days prior to the end of the then-current term.

The Subscription Fees for the Initial Term are set forth in the Order Form. For each Renewal Term, Provider may increase the Subscription Fees by the greater of (a) five percent (5%) over the then-current fees or (b) the percentage increase in the Consumer Price Index (CPI-U) published by the U.S. Bureau of Labor Statistics, not to exceed eight percent (8%) in any Renewal Term.

Either party may terminate this Agreement for cause upon thirty (30) days' written notice if the other party materially breaches this Agreement and fails to cure such breach within such thirty (30) day period. Customer shall not be entitled to terminate this Agreement for convenience during the Initial Term.

Customer may terminate this Agreement for convenience during any Renewal Term upon ninety (90) days' prior written notice, effective at the end of the then-current Renewal Term.`;

// Sample contracts for comparison mode - designed to show clear improvement
// Original: 120-day notice (HIGH), uncapped 12% escalator (HIGH), no termination for convenience (MEDIUM) = D grade
const SAMPLE_ORIGINAL_CONTRACT = `This Software as a Service Subscription Agreement (the "Agreement") is entered into as of January 1, 2026 (the "Effective Date") for an initial term of one (1) year (the "Initial Term").

Following the Initial Term, this Agreement shall automatically renew for successive one (1) year periods (each, a "Renewal Term") unless either party provides written notice of non-renewal at least one hundred twenty (120) days prior to the end of the then-current term.

The Subscription Fees for the Initial Term are set forth in the Order Form. For each Renewal Term, Provider may increase the Subscription Fees by up to twelve percent (12%) per year without any cap or maximum limit.

Either party may terminate this Agreement for cause upon thirty (30) days' written notice if the other party materially breaches this Agreement and fails to cure such breach within such thirty (30) day period.`;

// Revised: 30-day notice (LOW - resolved), 5% capped escalator (LOW - resolved), no termination for convenience (MEDIUM - unchanged) = B grade
const SAMPLE_REVISED_CONTRACT = `This Software as a Service Subscription Agreement (the "Agreement") is entered into as of January 1, 2026 (the "Effective Date") for an initial term of one (1) year (the "Initial Term").

Following the Initial Term, this Agreement shall automatically renew for successive one (1) year periods (each, a "Renewal Term") unless either party provides written notice of non-renewal at least thirty (30) days prior to the end of the then-current term.

The Subscription Fees for the Initial Term are set forth in the Order Form. For each Renewal Term, Provider may increase the Subscription Fees by up to five percent (5%) per year, not to exceed five percent (5%) in any Renewal Term.

Either party may terminate this Agreement for cause upon thirty (30) days' written notice if the other party materially breaches this Agreement and fails to cure such breach within such thirty (30) day period.`;

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

type AnalysisMode = "single" | "compare";

function App() {
  const [mode, setMode] = useState<AnalysisMode>("single");
  const [contractText, setContractText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [revisedText, setRevisedText] = useState("");
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [comparison, setComparison] = useState<ReturnType<typeof compareContracts> | null>(null);
  const [originalAnalysis, setOriginalAnalysis] = useState<ContractAnalysis | null>(null);
  const [revisedAnalysis, setRevisedAnalysis] = useState<ContractAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = useMemo(() => {
    if (mode === "single") {
      return contractText.trim().length > 40 && !isAnalyzing;
    } else {
      return (
        originalText.trim().length > 40 &&
        revisedText.trim().length > 40 &&
        !isAnalyzing
      );
    }
  }, [mode, contractText, originalText, revisedText, isAnalyzing]);

  const handleAnalyze = () => {
    setError(null);
    setComparison(null);

    if (mode === "single") {
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

      try {
        const result = analyzeContract(text);
        setAnalysis(result);
      } catch (e) {
        console.error(e);
        setError("Something went wrong while analyzing the contract.");
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      // Comparison mode
      const original = originalText.trim();
      const revised = revisedText.trim();

      if (!original || !revised) {
        setError("Please paste both the original and revised contract versions.");
        return;
      }

      if (!looksLikeContract(original)) {
        setError(
          "The original text does not look like a contract. Please paste contract language (we look for words like 'Agreement', 'Parties', 'Term', 'Fees')."
        );
        return;
      }

      if (!looksLikeContract(revised)) {
        setError(
          "The revised text does not look like a contract. Please paste contract language (we look for words like 'Agreement', 'Parties', 'Term', 'Fees')."
        );
        return;
      }

      setIsAnalyzing(true);

      try {
        const origAnalysis = analyzeContract(original);
        const revAnalysis = analyzeContract(revised);
        const comparisonResult = compareContracts(origAnalysis, revAnalysis);
        setOriginalAnalysis(origAnalysis);
        setRevisedAnalysis(revAnalysis);
        setComparison(comparisonResult);
        setAnalysis(null);
      } catch (e) {
        console.error(e);
        setError("Something went wrong while comparing the contracts.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleUseSample = () => {
    if (mode === "single") {
      setContractText(SAMPLE_CONTRACT);
      setAnalysis(null);
      setError(null);
    } else {
      setOriginalText(SAMPLE_ORIGINAL_CONTRACT);
      setRevisedText(SAMPLE_REVISED_CONTRACT);
      setComparison(null);
      setError(null);
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1>Redline</h1>
        </div>
        <div className="header-actions">
          <div className="header-badge">
            <span>AI-assisted review (non-legal advice)</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="app-main">
        <section className="input-panel card">
          <header className="card-header">
            <div className="mode-toggle-container">
              <h2>{mode === "single" ? "Contract Text" : "Compare Versions"}</h2>
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-toggle-button ${mode === "single" ? "active" : ""}`}
                  onClick={() => {
                    setMode("single");
                    setComparison(null);
                    setAnalysis(null);
                    setError(null);
                  }}
                >
                  Single Contract
                </button>
                <button
                  type="button"
                  className={`mode-toggle-button ${mode === "compare" ? "active" : ""}`}
                  onClick={() => {
                    setMode("compare");
                    setAnalysis(null);
                    setComparison(null);
                    setError(null);
                  }}
                >
                  Compare Versions
                </button>
              </div>
            </div>
            <p className="card-subtitle">
              {mode === "single"
                ? "Paste the relevant sections (term, fees, renewal) or the entire agreement."
                : "Paste the original and revised contract versions to see what changed."}
            </p>
          </header>
          <div className="card-body">
            {mode === "single" ? (
              <>
                <PDFUpload
                  onTextExtracted={(text) => {
                    setContractText(text);
                    setError(null);
                  }}
                  onError={(errorMsg) => setError(errorMsg)}
                />
                <textarea
                  className="contract-input"
                  placeholder="Paste contract language here (no formatting needed)..."
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                  rows={14}
                />
              </>
            ) : (
              <div className="comparison-inputs">
                <div className="comparison-input-group">
                  <label className="comparison-input-label">Original</label>
                  <PDFUpload
                    label="Drag PDF here or click to upload"
                    onTextExtracted={(text) => {
                      setOriginalText(text);
                      setError(null);
                    }}
                    onError={(errorMsg) => setError(errorMsg)}
                  />
                  <textarea
                    className="contract-input"
                    placeholder="Paste the original contract version..."
                    value={originalText}
                    onChange={(e) => setOriginalText(e.target.value)}
                    rows={12}
                  />
                </div>
                <div className="comparison-input-group">
                  <label className="comparison-input-label">Revised</label>
                  <PDFUpload
                    label="Drag PDF here or click to upload"
                    onTextExtracted={(text) => {
                      setRevisedText(text);
                      setError(null);
                    }}
                    onError={(errorMsg) => setError(errorMsg)}
                  />
                  <textarea
                    className="contract-input"
                    placeholder="Paste the revised contract version..."
                    value={revisedText}
                    onChange={(e) => setRevisedText(e.target.value)}
                    rows={12}
                  />
                </div>
              </div>
            )}
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
                {isAnalyzing
                  ? mode === "single"
                    ? "Analyzing…"
                    : "Comparing…"
                  : mode === "single"
                  ? "Analyze Contract"
                  : "Compare Versions"}
              </button>
              <button
                type="button"
                onClick={handleUseSample}
                className="ghost-button"
              >
                {mode === "single"
                  ? "Use sample SaaS contract"
                  : "Use sample contracts"}
              </button>
            </div>
            <p className="helper-text">
              This tool highlights negotiation points but does not replace review by legal
              counsel.
            </p>
          </footer>
        </section>

        <section className="results-panel">
          {comparison && originalAnalysis && revisedAnalysis ? (
            <ComparisonResults 
              comparison={comparison} 
              originalAnalysis={originalAnalysis}
              revisedAnalysis={revisedAnalysis}
            />
          ) : analysis ? (
            <AnalysisResults analysis={analysis} />
          ) : (
            <div className="welcome-panel">
              <p className="welcome-kicker">Welcome</p>
              <h2 className="welcome-title">Get to the point of your SaaS contracts.</h2>
              <ul className="welcome-points">
                <li>See renewal dates and lock-in terms at a glance.</li>
                <li>Catch price escalators and quiet year-over-year increases.</li>
                <li>Avoid surprise auto-renewals with long notice periods.</li>
                {mode === "compare" && (
                  <li>Compare contract versions to see what changed in negotiations.</li>
                )}
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

