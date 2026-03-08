import type { ScoredIssue } from "../analysis/severityConfig";

export interface PlaybookItem {
  issue: string;
  counterPosition: string;
}

export interface NegotiationPlaybook {
  mustAddress: PlaybookItem[];
  worthNegotiating: PlaybookItem[];
}

/**
 * Maps issue reasons to specific, actionable counter-positions.
 * These are hardcoded templates designed to be negotiation-ready.
 */
function getCounterPosition(issue: ScoredIssue): string {
  const { reason, category } = issue;
  const lowerReason = reason.toLowerCase();

  // Auto-renewal issues
  if (category === "auto_renewal") {
    // High severity: "Auto-renewal notice period is {period} — easy to miss, may result in involuntary renewal."
    if (lowerReason.includes("easy to miss") || lowerReason.includes("involuntary renewal")) {
      // Extract notice period if possible, but default to 30-60 days
      const daysMatch = reason.match(/(\d+)\s*(?:days?|months?)/i);
      if (daysMatch) {
        const days = parseInt(daysMatch[1]);
        if (days > 60) {
          return "Request reduction to 30-60 days notice period";
        }
      }
      return "Request reduction to 30-60 days notice period";
    }
    // Medium severity: "{period} notice required — negotiate a shorter window if possible."
    if (lowerReason.includes("negotiate a shorter window")) {
      return "Request reduction to 30 days or less";
    }
    return "Request clear, written cancellation process with reasonable notice period (30 days or less)";
  }

  // Price escalator issues
  if (category === "price_escalator") {
    // High severity: "Uncapped price increase — no ceiling on annual raises."
    if (lowerReason.includes("uncapped") || lowerReason.includes("no ceiling")) {
      return "Request annual cap of 3-5% or CPI, whichever is lower";
    }
    // High severity: "Increase up to {percentage} per year — high exposure; negotiate a lower cap."
    if (lowerReason.includes("high exposure") || lowerReason.includes("negotiate a lower cap")) {
      return "Request reduction to 3-5% annual cap or CPI";
    }
    // Medium severity: "Escalator capped at {percentage} — reasonable but worth negotiating."
    if (lowerReason.includes("reasonable but worth negotiating")) {
      return "Request reduction to 3-5% annual cap";
    }
    return "Request clear pricing terms with reasonable annual increase cap (3-5% or CPI)";
  }

  // Termination issues
  if (category === "termination") {
    // High severity: "Customer must give {days} days' notice to terminate — long window increases risk of involuntary renewal."
    if (lowerReason.includes("long window") || lowerReason.includes("involuntary renewal")) {
      return "Request reduction to 30 days notice for termination for convenience";
    }
    // High severity: "Termination for convenience appears one-sided — confirm your right to exit without cause."
    if (lowerReason.includes("one-sided") || lowerReason.includes("one sided") || lowerReason.includes("confirm your right")) {
      return "Request mutual right to terminate for convenience with 30 days notice";
    }
    // Medium severity: "No explicit 'termination for convenience' language — confirm how you can exit before the end of the term."
    if (lowerReason.includes("no explicit") || lowerReason.includes("confirm how you can exit")) {
      return "Request explicit termination for convenience clause with 30 days notice";
    }
    return "Request clear termination for convenience rights with reasonable notice period (30 days)";
  }

  // Data ownership issues
  if (category === "data_ownership") {
    // High severity: "Contract states Customer owns its data but grants Provider a perpetual, irrevocable license over it — these may conflict. Review with counsel."
    return "Request license scoped to service delivery and term only — remove perpetual and irrevocable language, or clarify that license terminates upon contract end";
  }

  // Renewal issues (usually low severity, but handle if they appear)
  if (category === "renewal") {
    return "Review renewal terms and ensure clear end date and renewal process";
  }

  // Generic fallback based on severity
  if (issue.severity === "high") {
    return "Request modification to align with standard market terms";
  }

  return "Request clarification or modification to reduce risk";
}

/**
 * Generates a structured negotiation playbook from scored issues.
 * HIGH severity issues go into "Must address before signing"
 * MEDIUM severity issues go into "Worth negotiating"
 */
export function generatePlaybook(issues: ScoredIssue[]): NegotiationPlaybook {
  const highIssues = issues.filter((i) => i.severity === "high");
  const mediumIssues = issues.filter((i) => i.severity === "medium");

  const mustAddress: PlaybookItem[] = highIssues.map((issue) => ({
    issue: issue.reason,
    counterPosition: getCounterPosition(issue)
  }));

  const worthNegotiating: PlaybookItem[] = mediumIssues.map((issue) => ({
    issue: issue.reason,
    counterPosition: getCounterPosition(issue)
  }));

  return {
    mustAddress,
    worthNegotiating
  };
}

/**
 * Formats the playbook as plain text for copying.
 */
export function formatPlaybookAsText(playbook: NegotiationPlaybook): string {
  const lines: string[] = [];
  
  lines.push("NEGOTIATION PLAYBOOK");
  lines.push("=".repeat(50));
  lines.push("");

  if (playbook.mustAddress.length > 0) {
    lines.push("MUST ADDRESS BEFORE SIGNING");
    lines.push("-".repeat(50));
    lines.push("");
    playbook.mustAddress.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.issue}`);
      lines.push(`   Counter-position: ${item.counterPosition}`);
      lines.push("");
    });
  }

  if (playbook.worthNegotiating.length > 0) {
    if (playbook.mustAddress.length > 0) {
      lines.push("");
    }
    lines.push("WORTH NEGOTIATING");
    lines.push("-".repeat(50));
    lines.push("");
    playbook.worthNegotiating.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.issue}`);
      lines.push(`   Counter-position: ${item.counterPosition}`);
      lines.push("");
    });
  }

  if (playbook.mustAddress.length === 0 && playbook.worthNegotiating.length === 0) {
    lines.push("No high or medium priority issues to address.");
  }

  return lines.join("\n");
}
