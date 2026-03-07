/**
 * Severity scoring config and rules.
 * Tune thresholds and reasons here without changing detection logic.
 */

export type Severity = "high" | "medium" | "low" | "informational";

export interface ScoredIssue {
  severity: Severity;
  reason: string;
  clauseText?: string;
  category: "renewal" | "price_escalator" | "auto_renewal" | "termination" | "general";
}

/** Notice period in days for comparison (normalized from "X days" or "X months") */
export function noticePeriodToDays(noticePeriod: string | undefined): number | null {
  if (!noticePeriod) return null;
  const match = noticePeriod.match(/(\d{1,3})\s*(day|days|month|months|year|years)/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("day")) return value;
  if (unit.startsWith("month")) return value * 30;
  if (unit.startsWith("year")) return value * 365;
  return null;
}

/** Parse percentage string to number (e.g. "8%" -> 8) */
export function parsePercent(pct: string | undefined): number | null {
  if (!pct) return null;
  const n = Number(pct.replace(/%/g, "").trim());
  return Number.isNaN(n) ? null : n;
}

/** Severity order for sorting */
export const SEVERITY_ORDER: Severity[] = ["high", "medium", "low", "informational"];

export function compareBySeverity(a: ScoredIssue, b: ScoredIssue): number {
  return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
}

// --- Configurable thresholds (tune here without touching detection) ---

const NOTICE_DAYS_HIGH = 60;   // > this = high (involuntary lock-in)
const NOTICE_DAYS_MEDIUM = 30; // 31–60 = medium, ≤30 = low
const ESCALATOR_PCT_HIGH = 10;  // no cap or > this = high
const ESCALATOR_PCT_MEDIUM = 5; // 5–10% = medium, CPI ≤5% = low

// --- Raw clause shapes (from detector; no severity yet) ---

export interface RawRenewalClause {
  sentence: string;
  renewalDate?: string;
  renewalTerm?: string;
}

export interface RawPriceEscalatorClause {
  sentence: string;
  percentage?: string;
  frequency?: string;
  cap?: string;
}

export interface RawAutoRenewalClause {
  sentence: string;
  noticePeriod?: string;
  cancellationMethod?: string;
}

export interface ScoredRenewalClause extends RawRenewalClause {
  severity: Severity;
  reason: string;
}

export interface ScoredPriceEscalatorClause extends RawPriceEscalatorClause {
  severity: Severity;
  reason: string;
}

export interface ScoredAutoRenewalClause extends RawAutoRenewalClause {
  severity: Severity;
  reason: string;
}

const WORD_NUMBERS: Record<string, number> = {
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
};

/** Extract customer termination/convenience notice (days) from text */
function getTerminationNoticeDays(text: string): number | null {
  const lower = text.toLowerCase();
  if (!lower.includes("terminat") && !lower.includes("cancel")) return null;
  const numbers: number[] = [];
  // "ninety (90) days' prior" or "90 days' prior"
  const withParens = text.matchAll(/(\d{1,3})\s*\(\s*\d+\s*\)\s*days?/gi);
  for (const m of withParens) numbers.push(Number(m[1]));
  const wordThenParen = text.match(/\b(thirty|forty|fifty|sixty|ninety)\s*\(\s*\d+\s*\)\s*days?/i);
  if (wordThenParen) {
    const n = WORD_NUMBERS[wordThenParen[1].toLowerCase()];
    if (n != null) numbers.push(n);
  }
  const plainDays = text.match(/\b(\d{1,3})\s*days?\s*['']?\s*(prior|before)/gi);
  if (plainDays) {
    for (const d of plainDays) {
      const n = d.match(/\d+/);
      if (n) numbers.push(Number(n[0]));
    }
  }
  return numbers.length ? Math.max(...numbers) : null;
}

/** One-sided termination: only one party can terminate for convenience */
function hasOneSidedTerminationForConvenience(text: string): boolean {
  const lower = text.toLowerCase();
  if (!lower.includes("terminat") || !lower.includes("convenience")) return false;
  const customerOnly = /customer\s+(shall not|may not|cannot).*terminat.*convenience/i.test(text) ||
    /(terminate|termination)\s+for\s+convenience.*(customer|party)\s+(shall|must|may)/i.test(text);
  return customerOnly;
}

export interface ScoringInput {
  renewalClauses: RawRenewalClause[];
  priceEscalators: RawPriceEscalatorClause[];
  autoRenewalClauses: RawAutoRenewalClause[];
  fullText: string;
}

export interface ScoringResult {
  issues: ScoredIssue[];
  renewalClauses: ScoredRenewalClause[];
  priceEscalators: ScoredPriceEscalatorClause[];
  autoRenewalClauses: ScoredAutoRenewalClause[];
}

export function scoreContractAnalysis(input: ScoringInput): ScoringResult {
  const { renewalClauses, priceEscalators, autoRenewalClauses, fullText } = input;
  const issues: ScoredIssue[] = [];
  const lowered = fullText.toLowerCase();

  const terminationNoticeDays = getTerminationNoticeDays(fullText);
  const oneSidedT4C = hasOneSidedTerminationForConvenience(fullText);

  // --- Auto-renewal notice ---
  const scoredAuto: ScoredAutoRenewalClause[] = autoRenewalClauses.map((c) => {
    const days = noticePeriodToDays(c.noticePeriod);
    let severity: Severity = "informational";
    let reason = "Auto-renewal clause detected.";
    if (days != null) {
      if (days > NOTICE_DAYS_HIGH) {
        severity = "high";
        reason = `Notice period (${c.noticePeriod}) exceeds ${NOTICE_DAYS_HIGH} days — easy to miss, results in involuntary renewal.`;
      } else if (days > NOTICE_DAYS_MEDIUM) {
        severity = "medium";
        reason = `${c.noticePeriod} notice required — negotiate a shorter window if possible.`;
      } else {
        severity = "low";
        reason = `Standard notice period (${c.noticePeriod}).`;
      }
    }
    issues.push({ severity, reason, clauseText: c.sentence, category: "auto_renewal" });
    return { ...c, severity, reason };
  });

  // --- Price escalators ---
  const scoredEscalators: ScoredPriceEscalatorClause[] = priceEscalators.map((c) => {
    const pct = parsePercent(c.percentage);
    const hasCap = c.cap != null || /not exceed|cap|ceiling|maximum/i.test(c.sentence);
    const isCpi = /cpi|consumer price index/i.test(c.sentence);
    let severity: Severity = "informational";
    let reason = "Price increase clause detected.";
    if (pct != null && !hasCap) {
      severity = "high";
      reason = "Uncapped price increase — no ceiling on annual raises.";
    } else if (pct != null && pct > ESCALATOR_PCT_HIGH) {
      severity = "high";
      reason = `Increase up to ${c.percentage} per year — high exposure; negotiate a lower cap.`;
    } else if (pct != null && pct >= ESCALATOR_PCT_MEDIUM && pct <= ESCALATOR_PCT_HIGH) {
      severity = "medium";
      reason = `Escalator capped at ${c.percentage} — reasonable but worth negotiating.`;
    } else if (hasCap && (isCpi || (pct != null && pct <= ESCALATOR_PCT_MEDIUM))) {
      severity = "low";
      reason = isCpi ? "CPI-linked with a cap — standard." : `Capped at ${c.percentage} — low risk.`;
    }
    issues.push({ severity, reason, clauseText: c.sentence, category: "price_escalator" });
    return { ...c, severity, reason };
  });

  // --- Renewal terms ---
  const scoredRenewal: ScoredRenewalClause[] = renewalClauses.map((c) => {
    const severity: Severity = "low";
    const reason = c.renewalTerm ? `Renewal term: ${c.renewalTerm}.` : "Renewal or term language detected.";
    issues.push({ severity, reason, clauseText: c.sentence, category: "renewal" });
    return { ...c, severity, reason };
  });

  // --- Termination for convenience ---
  if (terminationNoticeDays != null && terminationNoticeDays > NOTICE_DAYS_HIGH) {
    issues.push({
      severity: "high",
      reason: `Customer must give ${terminationNoticeDays} days’ notice to terminate — long window increases risk of involuntary renewal.`,
      category: "termination"
    });
  }
  if (oneSidedT4C) {
    issues.push({
      severity: "high",
      reason: "Termination for convenience appears one-sided — confirm your right to exit without cause.",
      category: "termination"
    });
  }
  if (
    lowered.includes("terminat") &&
    !lowered.includes("termination for convenience") &&
    !lowered.includes("terminate for convenience")
  ) {
    issues.push({
      severity: "medium",
      reason: "No explicit 'termination for convenience' language — confirm how you can exit before the end of the term.",
      category: "termination"
    });
  }

  // --- Missing clauses (informational) ---
  if (autoRenewalClauses.length === 0) {
    issues.push({
      severity: "informational",
      reason: "No explicit auto-renewal clause found.",
      category: "general"
    });
  }
  if (priceEscalators.length === 0) {
    issues.push({
      severity: "informational",
      reason: "No explicit price escalator found; verify pricing is stable over the term.",
      category: "general"
    });
  }

  issues.sort(compareBySeverity);

  return {
    issues,
    renewalClauses: scoredRenewal,
    priceEscalators: scoredEscalators,
    autoRenewalClauses: scoredAuto
  };
}
