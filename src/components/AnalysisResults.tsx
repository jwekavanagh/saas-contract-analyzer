import { useState } from "react";
import type {
  AutoRenewalClause,
  ContractAnalysis,
  PriceEscalatorClause,
  RenewalClause
} from "../analysis/contractAnalyzer";
import type { Severity } from "../analysis/severityConfig";
import { generatePlaybook } from "../utils/playbookGenerator";
import { NegotiationPlaybook } from "./NegotiationPlaybook";

type SelectedTile = "renewal" | "escalators" | "auto" | "issues" | null;

interface SectionProps {
  title: string;
  description: string;
  summary: string;
  isSelected: boolean;
  onSelect: () => void;
}

function Section({
  title,
  description,
  summary,
  isSelected,
  onSelect
}: SectionProps) {
  return (
    <section
      className={`card result-card ${
        isSelected ? "is-selected" : ""
      }`}
    >
      <header
        className="card-header card-header-clickable"
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        <div className="card-header-content-row">
          <div className="card-header-main">
            <h2>{title}</h2>
            <p className="card-subtitle">{description}</p>
          </div>
          <div className="card-summary-row">
            <p className="card-summary-text">{summary}</p>
          </div>
        </div>
      </header>
    </section>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`severity-badge severity-badge--${severity}`} title={severity}>
      {severity}
    </span>
  );
}

function ClauseList({
  clauses,
  renderMeta,
  showSeverity
}: {
  clauses: Array<{ sentence: string; severity?: Severity; reason?: string }>;
  renderMeta?: (clause: any) => React.ReactNode;
  showSeverity?: boolean;
}) {
  if (!clauses.length) {
    return <p className="muted">Nothing detected in this category.</p>;
  }

  return (
    <ol className="clause-list">
      {clauses.map((clause, index) => (
        <li key={index} className="clause-item">
          <div className="clause-item-header">
            {showSeverity && "severity" in clause && clause.severity && (
              <SeverityBadge severity={clause.severity} />
            )}
            <p className="clause-text">{clause.sentence}</p>
          </div>
          {renderMeta && <div className="clause-meta">{renderMeta(clause)}</div>}
        </li>
      ))}
    </ol>
  );
}

export function AnalysisResults({ analysis }: { analysis: ContractAnalysis }) {
  const {
    renewalClauses,
    priceEscalators,
    autoRenewalClauses,
    issues,
    summary
  } = analysis;

  const [selectedTile, setSelectedTile] = useState<SelectedTile>(null);
  const [showPlaybook, setShowPlaybook] = useState(false);

  const highCount = issues.filter((i) => i.severity === "high").length;
  const mediumCount = issues.filter((i) => i.severity === "medium").length;
  
  // Red Flags only shows high and medium severity issues
  const redFlagsIssues = issues.filter((i) => i.severity === "high" || i.severity === "medium");
  const redFlagsSummaryParts: string[] = [];
  if (highCount) redFlagsSummaryParts.push(`${highCount} high`);
  if (mediumCount) redFlagsSummaryParts.push(`${mediumCount} medium`);
  const redFlagsBreakdown = redFlagsSummaryParts.length
    ? redFlagsSummaryParts.join(" · ")
    : "No high-priority issues detected.";

  const renewalSummary = renewalClauses.length
    ? `${renewalClauses.length} renewal-related clause${renewalClauses.length > 1 ? "s" : ""} detected.`
    : "No explicit renewal term or end date detected.";

  const escalatorSummary = priceEscalators.length
    ? `${priceEscalators.length} price escalator clause${priceEscalators.length > 1 ? "s" : ""} detected.`
    : "No explicit price increase or escalator language detected.";

  const autoSummary = autoRenewalClauses.length
    ? `${autoRenewalClauses.length} auto-renewal clause${autoRenewalClauses.length > 1 ? "s" : ""} detected.`
    : "No automatic renewal language clearly detected.";

  const issuesSummary =
    redFlagsIssues.length > 0
      ? redFlagsBreakdown
      : "No high-priority issues detected.";

  const overallSummaryParts: string[] = [];
  if (renewalClauses.length) {
    overallSummaryParts.push(
      `${renewalClauses.length} renewal clause${renewalClauses.length > 1 ? "s" : ""}`
    );
  }
  if (priceEscalators.length) {
    overallSummaryParts.push(
      `${priceEscalators.length} escalator clause${priceEscalators.length > 1 ? "s" : ""}`
    );
  }
  if (autoRenewalClauses.length) {
    overallSummaryParts.push(
      `${autoRenewalClauses.length} auto-renewal clause${autoRenewalClauses.length > 1 ? "s" : ""}`
    );
  }
  if (redFlagsIssues.length > 0) {
    overallSummaryParts.push(redFlagsBreakdown);
  }

  const overallSummary =
    overallSummaryParts.length > 0
      ? overallSummaryParts.join(" · ")
      : "No renewal, pricing, or auto-renewal clauses detected in this excerpt.";

  return (
    <div className="results-layout">
      <div className="results-overview-bar">
        <span className="results-overview-label">Overview</span>
        <p className="results-overview-text">{overallSummary}</p>
      </div>
      <div className="results-grid">
        <Section
            title="Renewal & Term"
            description="Clauses that mention renewal dates, terms, or expiration."
            summary={renewalSummary}
            isSelected={selectedTile === "renewal"}
            onSelect={() =>
              setSelectedTile((t) => (t === "renewal" ? null : "renewal"))
            }
          />
          <Section
            title="Price Escalators"
            description="Clauses that mention fee increases, CPI adjustments, or other escalators."
            summary={escalatorSummary}
            isSelected={selectedTile === "escalators"}
            onSelect={() =>
              setSelectedTile((t) => (t === "escalators" ? null : "escalators"))
            }
          />
          <Section
            title="Auto-Renewal"
            description="Clauses where the agreement renews automatically unless you take action."
            summary={autoSummary}
            isSelected={selectedTile === "auto"}
            onSelect={() =>
              setSelectedTile((t) => (t === "auto" ? null : "auto"))
            }
          />
          <Section
            title="Red Flags & To-Dos"
            description="Prioritized issues by risk. Start with high, then medium."
            summary={issuesSummary}
            isSelected={selectedTile === "issues"}
            onSelect={() =>
              setSelectedTile((t) => (t === "issues" ? null : "issues"))
            }
          />
      </div>
      {selectedTile !== null && (
        <section className="results-detail-panel" aria-label="Detail view">
          {selectedTile === "renewal" ? (
            <div className="detail-panel-inner">
              <h3 className="detail-panel-title">Renewal & Term</h3>
              <ClauseList
              clauses={renewalClauses}
              showSeverity
              renderMeta={(clause: RenewalClause) => (
                <div className="meta-row">
                  {clause.renewalDate && (
                    <span className="tag">
                      Renewal / end date: <strong>{clause.renewalDate}</strong>
                    </span>
                  )}
                  {clause.renewalTerm && (
                    <span className="tag">
                      Renewal term: <strong>{clause.renewalTerm}</strong>
                    </span>
                  )}
                </div>
              )}
            />
            </div>
          ) : selectedTile === "escalators" ? (
            <div className="detail-panel-inner">
              <h3 className="detail-panel-title">Price Escalators</h3>
              <ClauseList
              clauses={priceEscalators}
              showSeverity
              renderMeta={(clause: PriceEscalatorClause) => (
                <div className="meta-row">
                  {clause.percentage && (
                    <span className="tag">
                      Increase: <strong>{clause.percentage}</strong>
                    </span>
                  )}
                  {clause.frequency && (
                    <span className="tag">
                      Frequency: <strong>{clause.frequency}</strong>
                    </span>
                  )}
                  {clause.cap && (
                    <span className="tag">
                      Cap: <strong>{clause.cap}</strong>
                    </span>
                  )}
                </div>
              )}
            />
            </div>
          ) : selectedTile === "auto" ? (
            <div className="detail-panel-inner">
              <h3 className="detail-panel-title">Auto-Renewal</h3>
              <ClauseList
              clauses={autoRenewalClauses}
              showSeverity
              renderMeta={(clause: AutoRenewalClause) => (
                <div className="meta-row">
                  {clause.noticePeriod && (
                    <span className="tag">
                      Notice period: <strong>{clause.noticePeriod}</strong>
                    </span>
                  )}
                  {clause.cancellationMethod && (
                    <span className="tag">
                      How to cancel: <strong>{clause.cancellationMethod}</strong>
                    </span>
                  )}
                </div>
              )}
            />
            </div>
          ) : (
            <div className="detail-panel-inner">
              <h3 className="detail-panel-title">Red Flags & To-Dos</h3>
              {redFlagsIssues.length > 0 ? (
                <>
                  {!showPlaybook && (
                    <div className="playbook-button-container">
                      <button
                        type="button"
                        onClick={() => setShowPlaybook(true)}
                        className="primary-button"
                      >
                        Generate Negotiation Playbook
                      </button>
                    </div>
                  )}
                  {showPlaybook ? (
                    <>
                      <div className="playbook-back-container">
                        <button
                          type="button"
                          onClick={() => setShowPlaybook(false)}
                          className="ghost-button"
                        >
                          ← Back to issues
                        </button>
                      </div>
                      <NegotiationPlaybook playbook={generatePlaybook(redFlagsIssues)} />
                    </>
                  ) : (
                    <ul className="issues-list-by-severity">
                      {redFlagsIssues.map((issue, idx) => (
                        <li key={idx} className={`issues-list-item issues-list-item--${issue.severity}`}>
                          <SeverityBadge severity={issue.severity} />
                          <div className="issues-list-item-content">
                            <p className="issues-list-item-reason">{issue.reason}</p>
                            {issue.clauseText && (
                              <p className="issues-list-item-clause">{issue.clauseText}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="muted">No high-priority issues detected.</p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
