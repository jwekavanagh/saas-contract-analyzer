import type { ContractAnalysis } from "../analysis/contractAnalyzer";
import type { ScoredIssue, Severity } from "../analysis/severityConfig";
import { SEVERITY_ORDER } from "../analysis/severityConfig";

export interface IssueComparison {
  issue: ScoredIssue;
  status: "resolved" | "new" | "unchanged" | "improved" | "worsened";
  originalSeverity?: Severity;
  revisedSeverity?: Severity;
}

export interface ContractComparison {
  resolved: IssueComparison[];
  new: IssueComparison[];
  unchanged: IssueComparison[];
  improved: IssueComparison[];
  worsened: IssueComparison[];
  summary: {
    resolvedCount: number;
    newCount: number;
    unchangedCount: number;
    improvedCount: number;
    worsenedCount: number;
  };
}

/**
 * Normalizes issue text for comparison by removing extra whitespace and converting to lowercase
 */
function normalizeIssueText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Checks if two issues are likely the same issue based on reason, category, and clause text
 */
function areIssuesSimilar(issue1: ScoredIssue, issue2: ScoredIssue): boolean {
  // Must have same category
  if (issue1.category !== issue2.category) {
    return false;
  }

  // Must have same reason (normalized)
  const reason1 = normalizeIssueText(issue1.reason);
  const reason2 = normalizeIssueText(issue2.reason);
  if (reason1 !== reason2) {
    return false;
  }

  // If both have clause text, they should be similar
  if (issue1.clauseText && issue2.clauseText) {
    const clause1 = normalizeIssueText(issue1.clauseText);
    const clause2 = normalizeIssueText(issue2.clauseText);
    // Check if they share significant overlap (at least 60% similarity)
    const longer = clause1.length > clause2.length ? clause1 : clause2;
    const shorter = clause1.length > clause2.length ? clause2 : clause1;
    if (longer.includes(shorter) || shorter.length / longer.length > 0.6) {
      return true;
    }
  }

  // If only one has clause text, still consider them similar if reason and category match
  // (the clause text might have been reformatted)
  return true;
}

/**
 * Compares two contract analyses and returns a diff of the risk profiles
 */
export function compareContracts(
  original: ContractAnalysis,
  revised: ContractAnalysis
): ContractComparison {
  const resolved: IssueComparison[] = [];
  const newIssues: IssueComparison[] = [];
  const unchanged: IssueComparison[] = [];
  const improved: IssueComparison[] = [];
  const worsened: IssueComparison[] = [];

  // Get all issues from both versions for matching
  const allOriginalIssues = original.issues;
  const allRevisedIssues = revised.issues;

  // Filter to only high/medium severity issues for display (same as Red Flags)
  const originalHighMedium = allOriginalIssues.filter(
    (i) => i.severity === "high" || i.severity === "medium"
  );
  const revisedHighMedium = allRevisedIssues.filter(
    (i) => i.severity === "high" || i.severity === "medium"
  );

  // Track which revised issues have been matched
  const matchedRevised = new Set<number>();

  // For each original high/medium issue, try to find a match in all revised issues
  for (const origIssue of originalHighMedium) {
    let matched = false;

    for (let i = 0; i < allRevisedIssues.length; i++) {
      if (matchedRevised.has(i)) continue;

      if (areIssuesSimilar(origIssue, allRevisedIssues[i])) {
        matched = true;
        matchedRevised.add(i);

        const origSeverity = origIssue.severity;
        const revSeverity = allRevisedIssues[i].severity;

        // If the revised issue is still high/medium, check for severity changes
        if (revSeverity === "high" || revSeverity === "medium") {
          if (origSeverity === revSeverity) {
            unchanged.push({
              issue: allRevisedIssues[i],
              status: "unchanged",
              originalSeverity: origSeverity,
              revisedSeverity: revSeverity,
            });
          } else {
            const origIndex = SEVERITY_ORDER.indexOf(origSeverity);
            const revIndex = SEVERITY_ORDER.indexOf(revSeverity);

            if (revIndex > origIndex) {
              // Severity decreased (e.g., high -> medium) = improved
              improved.push({
                issue: allRevisedIssues[i],
                status: "improved",
                originalSeverity: origSeverity,
                revisedSeverity: revSeverity,
              });
            } else {
              // Severity increased (e.g., medium -> high) = worsened
              worsened.push({
                issue: allRevisedIssues[i],
                status: "worsened",
                originalSeverity: origSeverity,
                revisedSeverity: revSeverity,
              });
            }
          }
        }
        // If revised issue is low/informational, it's resolved (no longer high/medium)
        // We don't add it to resolved here because we only show high/medium in results
        break;
      }
    }

    // If no match found in revised, the issue was resolved
    if (!matched) {
      resolved.push({
        issue: origIssue,
        status: "resolved",
        originalSeverity: origIssue.severity,
      });
    }
  }

  // Any revised high/medium issues that weren't matched are new
  for (const revIssue of revisedHighMedium) {
    let wasInOriginal = false;
    for (const origIssue of allOriginalIssues) {
      if (areIssuesSimilar(origIssue, revIssue)) {
        wasInOriginal = true;
        break;
      }
    }
    if (!wasInOriginal) {
      newIssues.push({
        issue: revIssue,
        status: "new",
        revisedSeverity: revIssue.severity,
      });
    }
  }

  return {
    resolved,
    new: newIssues,
    unchanged,
    improved,
    worsened,
    summary: {
      resolvedCount: resolved.length,
      newCount: newIssues.length,
      unchangedCount: unchanged.length,
      improvedCount: improved.length,
      worsenedCount: worsened.length,
    },
  };
}
