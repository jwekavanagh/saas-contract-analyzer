import type { ContractComparison, IssueComparison } from "../utils/contractComparison";
import type { Severity } from "../analysis/severityConfig";
import type { ContractAnalysis } from "../analysis/contractAnalyzer";
import { SeverityBadge } from "./AnalysisResults";
import { RiskScore } from "./RiskScore";

interface ComparisonSectionProps {
  title: string;
  description: string;
  issues: IssueComparison[];
  emptyMessage: string;
  statusClass: string;
}

function ComparisonSection({
  title,
  description,
  issues,
  emptyMessage,
  statusClass,
}: ComparisonSectionProps) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <section className={`card result-card comparison-section comparison-section--${statusClass}`}>
      <header className="card-header">
        <div className="card-header-content-row">
          <div className="card-header-main">
            <h2>{title}</h2>
            <p className="card-subtitle">{description}</p>
          </div>
          <div className="card-summary-row">
            <p className="card-summary-text">{issues.length} issue{issues.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </header>
      <div className="card-body">
        <ul className="issues-list-by-severity">
          {issues.map((item, idx) => (
            <li
              key={idx}
              className={`issues-list-item issues-list-item--${item.issue.severity} comparison-item`}
            >
              <SeverityBadge severity={item.issue.severity} />
              <div className="issues-list-item-content">
                {item.originalSeverity && item.revisedSeverity && item.originalSeverity !== item.revisedSeverity && (
                  <div className="severity-change-indicator">
                    <SeverityBadge severity={item.originalSeverity} />
                    <span className="severity-change-arrow">→</span>
                    <SeverityBadge severity={item.revisedSeverity} />
                  </div>
                )}
                <p className="issues-list-item-reason">{item.issue.reason}</p>
                {item.issue.clauseText && (
                  <p className="issues-list-item-clause">{item.issue.clauseText}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ComparisonResults({ 
  comparison,
  originalAnalysis,
  revisedAnalysis
}: { 
  comparison: ContractComparison;
  originalAnalysis: ContractAnalysis;
  revisedAnalysis: ContractAnalysis;
}) {
  const { resolved, new: newIssues, unchanged, improved, worsened, summary } = comparison;

  const hasChanges =
    summary.resolvedCount > 0 ||
    summary.newCount > 0 ||
    summary.improvedCount > 0 ||
    summary.worsenedCount > 0;

  const overviewParts: string[] = [];
  if (summary.resolvedCount > 0) {
    overviewParts.push(`${summary.resolvedCount} resolved`);
  }
  if (summary.newCount > 0) {
    overviewParts.push(`${summary.newCount} new risk${summary.newCount !== 1 ? "s" : ""}`);
  }
  if (summary.improvedCount > 0) {
    overviewParts.push(`${summary.improvedCount} improved`);
  }
  if (summary.worsenedCount > 0) {
    overviewParts.push(`${summary.worsenedCount} worsened`);
  }
  if (summary.unchangedCount > 0) {
    overviewParts.push(`${summary.unchangedCount} unchanged`);
  }

  const overviewText =
    overviewParts.length > 0
      ? overviewParts.join(" · ")
      : "No issues detected in either version.";

  return (
    <div className="results-layout">
      <div className="risk-score-comparison">
        <RiskScore analysis={originalAnalysis} label="Original" />
        <RiskScore analysis={revisedAnalysis} label="Revised" />
      </div>
      <div className="results-overview-bar">
        <span className="results-overview-label">Comparison Overview</span>
        <p className="results-overview-text">{overviewText}</p>
      </div>
      <div className="results-grid comparison-grid">
        {summary.resolvedCount > 0 && (
          <ComparisonSection
            title="✅ Resolved"
            description="Issues that were flagged in the original but are no longer present."
            issues={resolved}
            emptyMessage="No resolved issues."
            statusClass="resolved"
          />
        )}
        {summary.newCount > 0 && (
          <ComparisonSection
            title="⚠️ New Risks"
            description="Issues that were not flagged in the original but appear in the revised version."
            issues={newIssues}
            emptyMessage="No new risks."
            statusClass="new"
          />
        )}
        {summary.improvedCount > 0 && (
          <ComparisonSection
            title="📈 Improved"
            description="Issues that decreased in severity (e.g., HIGH → MEDIUM)."
            issues={improved}
            emptyMessage="No improved issues."
            statusClass="improved"
          />
        )}
        {summary.worsenedCount > 0 && (
          <ComparisonSection
            title="📉 Worsened"
            description="Issues that increased in severity (e.g., MEDIUM → HIGH)."
            issues={worsened}
            emptyMessage="No worsened issues."
            statusClass="worsened"
          />
        )}
        {summary.unchangedCount > 0 && (
          <ComparisonSection
            title="➡️ Unchanged"
            description="Issues that remain at the same severity level."
            issues={unchanged}
            emptyMessage="No unchanged issues."
            statusClass="unchanged"
          />
        )}
        {!hasChanges && summary.unchangedCount === 0 && (
          <div className="welcome-panel">
            <p className="welcome-kicker">No Issues Detected</p>
            <h2 className="welcome-title">Both versions appear clean.</h2>
            <p className="welcome-tagline">
              No high or medium severity issues were found in either the original or revised contract.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
