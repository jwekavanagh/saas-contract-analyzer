import { useState } from "react";
import type {
  AutoRenewalClause,
  ContractAnalysis,
  PriceEscalatorClause,
  RenewalClause
} from "../analysis/contractAnalyzer";

interface SectionProps {
  title: string;
  description: string;
  summary: string;
  variant: "empty" | "info" | "alert";
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({
  title,
  description,
  summary,
  variant,
  isExpanded,
  onToggle,
  children
}: SectionProps) {
  return (
    <section
      className={`card result-card result-card--${variant} ${
        isExpanded ? "is-expanded" : ""
      }`}
    >
      <header
        className="card-header card-header-clickable"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="card-header-main">
          <h2>{title}</h2>
          <p className="card-subtitle">{description}</p>
        </div>
        <div className="card-summary-row">
          <p className="card-summary-text">{summary}</p>
          <div className="card-toggle-hint">
            <span className="card-toggle-text">
              {isExpanded ? "Hide details" : "Show details"}
            </span>
            <span className="card-chevron" aria-hidden="true">
              {isExpanded ? "−" : "+"}
            </span>
          </div>
        </div>
      </header>
      {isExpanded && <div className="card-body">{children}</div>}
    </section>
  );
}

function ClauseList({
  clauses,
  renderMeta
}: {
  clauses: { sentence: string }[];
  renderMeta?: (clause: any) => React.ReactNode;
}) {
  if (!clauses.length) {
    return <p className="muted">Nothing detected in this category.</p>;
  }

  return (
    <ol className="clause-list">
      {clauses.map((clause, index) => (
        <li key={index} className="clause-item">
          <p className="clause-text">{clause.sentence}</p>
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
    keyIssues,
    summary
  } = analysis;

  const [expanded, setExpanded] = useState<{
    renewal: boolean;
    escalators: boolean;
    auto: boolean;
    issues: boolean;
  }>({
    renewal: false,
    escalators: false,
    auto: false,
    issues: false
  });

  const renewalSummary = renewalClauses.length
    ? `${renewalClauses.length} renewal-related clause${renewalClauses.length > 1 ? "s" : ""} detected.`
    : "No explicit renewal term or end date detected.";

  const escalatorSummary = priceEscalators.length
    ? `${priceEscalators.length} price escalator clause${priceEscalators.length > 1 ? "s" : ""} detected.`
    : "No explicit price increase or escalator language detected.";

  const autoSummary = autoRenewalClauses.length
    ? `${autoRenewalClauses.length} auto-renewal clause${autoRenewalClauses.length > 1 ? "s" : ""} detected.`
    : "No automatic renewal language clearly detected.";

  const issuesSummary = keyIssues.length
    ? `${keyIssues.length} negotiation point${keyIssues.length > 1 ? "s" : ""} flagged.`
    : "No obvious issues surfaced. Review with counsel for confirmation.";

  const overallSummaryParts: string[] = [];
  if (renewalClauses.length) {
    overallSummaryParts.push(
      `${renewalClauses.length} renewal-related clause${renewalClauses.length > 1 ? "s" : ""}`
    );
  }
  if (priceEscalators.length) {
    overallSummaryParts.push(
      `${priceEscalators.length} price escalator clause${priceEscalators.length > 1 ? "s" : ""}`
    );
  }
  if (autoRenewalClauses.length) {
    overallSummaryParts.push(
      `${autoRenewalClauses.length} auto-renewal clause${autoRenewalClauses.length > 1 ? "s" : ""}`
    );
  }
  if (keyIssues.length) {
    overallSummaryParts.push(
      `${keyIssues.length} negotiation point${keyIssues.length > 1 ? "s" : ""} flagged`
    );
  }

  const overallSummary =
    overallSummaryParts.length > 0
      ? overallSummaryParts.join(" · ")
      : "No obvious renewal, pricing, auto-renewal or red-flag issues detected in this excerpt.";

  return (
    <>
      <div className="results-overview-bar">
        <span className="results-overview-label">Overview</span>
        <p className="results-overview-text">{overallSummary}</p>
      </div>
      <div className="results-grid">
        <Section
        title="Renewal & Term"
        description="Clauses that mention renewal dates, terms, or expiration."
        summary={renewalSummary}
        variant={renewalClauses.length ? "info" : "empty"}
        isExpanded={expanded.renewal}
        onToggle={() =>
          setExpanded((current) => ({ ...current, renewal: !current.renewal }))
        }
      >
        <ClauseList
          clauses={renewalClauses as RenewalClause[]}
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
      </Section>

        <Section
        title="Price Escalators"
        description="Clauses that mention fee increases, CPI adjustments, or other escalators."
        summary={escalatorSummary}
        variant={priceEscalators.length ? "info" : "empty"}
        isExpanded={expanded.escalators}
        onToggle={() =>
          setExpanded((current) => ({
            ...current,
            escalators: !current.escalators
          }))
        }
      >
        <ClauseList
          clauses={priceEscalators as PriceEscalatorClause[]}
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
      </Section>

        <Section
        title="Auto-Renewal"
        description="Clauses where the agreement renews automatically unless you take action."
        summary={autoSummary}
        variant={autoRenewalClauses.length ? "info" : "empty"}
        isExpanded={expanded.auto}
        onToggle={() =>
          setExpanded((current) => ({ ...current, auto: !current.auto }))
        }
      >
        <ClauseList
          clauses={autoRenewalClauses as AutoRenewalClause[]}
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
      </Section>

        <Section
        title="Red Flags & To-Dos"
        description="AI-highlighted negotiation points to review with counsel."
        summary={issuesSummary}
        variant={keyIssues.length ? "alert" : "empty"}
        isExpanded={expanded.issues}
        onToggle={() =>
          setExpanded((current) => ({ ...current, issues: !current.issues }))
        }
      >
        <p className="summary-text">{summary}</p>
        {keyIssues.length > 0 && (
          <ul className="issues-list">
            {keyIssues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        )}
      </Section>
      </div>
    </>
  );
}

