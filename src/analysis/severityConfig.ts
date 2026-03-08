/**
 * Severity scoring config and rules.
 * Tune thresholds and reasons here without changing detection logic.
 */

export type Severity = "high" | "medium" | "low" | "informational";

export interface ScoredIssue {
  severity: Severity;
  reason: string;
  clauseText?: string;
  category: "renewal" | "price_escalator" | "auto_renewal" | "termination" | "data_ownership" | "general";
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

const NOTICE_DAYS_HIGH = 90;   // > this = high (involuntary lock-in)
const NOTICE_DAYS_MEDIUM = 60; // 61–90 = medium, ≤60 = low
const ESCALATOR_PCT_HIGH = 10;  // no cap or > this = high
const ESCALATOR_PCT_MEDIUM = 7; // 7–10% = medium, ≤7% = low (or CPI-linked)

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

/** Extract section reference from clause text (e.g., "Section 5.1", "Article 4") */
function extractSectionReference(text: string): string {
  if (!text || typeof text !== 'string') return "";
  const sectionMatch = text.match(/(?:Section|Article|Clause)\s+[\d.]+/i);
  if (sectionMatch) {
    return sectionMatch[0];
  }
  return "";
}

/** Extract key ownership phrase from clause (e.g., "Customer retains ownership") */
function extractOwnershipPhrase(text: string): string {
  if (!text || typeof text !== 'string') return "";
  // Look for patterns like "Customer retains ownership", "Customer owns", "retain all ownership"
  // Priority: patterns that include "Customer" as subject
  const customerPattern = /(?:the\s+)?customer\s+(?:retains?|shall\s+retain|owns?|shall\s+own)\s+(?:all\s+)?(?:rights\s+and\s+)?\bownership\b/i;
  const customerMatch = text.match(customerPattern);
  if (customerMatch) {
    let phrase = customerMatch[0].trim();
    // Normalize "The Customer" to "Customer"
    phrase = phrase.replace(/^the\s+/i, "");
    // Truncate if too long (shouldn't be, but just in case)
    if (phrase.length > 45) {
      phrase = phrase.substring(0, 42) + "...";
    }
    return phrase;
  }
  
  // Fallback: look for "retains ownership" or similar
  const retainPattern = /retains?\s+(?:all\s+)?(?:rights\s+and\s+)?\bownership\b/i;
  const retainMatch = text.match(retainPattern);
  if (retainMatch) {
    return retainMatch[0].trim();
  }
  
  // Last fallback: return first meaningful part
  return text.substring(0, Math.min(35, text.length)).trim();
}

/** Extract key license phrase from clause (e.g., "grants Provider a perpetual, irrevocable license") */
function extractLicensePhrase(text: string): string {
  if (!text || typeof text !== 'string') return "";
  // First, try to find "grants" followed by entity and license terms
  // Pattern: "grants [to] [entity] ... perpetual ... irrevocable ... license"
  // or "grants [to] [entity] ... irrevocable ... perpetual ... license"
  const grantPatterns = [
    /grants?\s+(?:to\s+)?(?:provider|apex|company|party|the\s+provider)\s+[^.]{0,50}?(?:perpetual|irrevocable)[^.]{0,30}?(?:irrevocable|perpetual)[^.]{0,30}?license/i,
    /grants?\s+(?:to\s+)?(?:provider|apex|company|party|the\s+provider)\s+[^.]{0,50}?(?:irrevocable|perpetual)[^.]{0,30}?(?:perpetual|irrevocable)[^.]{0,30}?license/i
  ];
  
  for (const pattern of grantPatterns) {
    const match = text.match(pattern);
    if (match) {
      let phrase = match[0].trim();
      // Simplify: extract "grants [entity] a perpetual, irrevocable license" part
      // Remove extra words in the middle, keep it concise
      const simplified = phrase.replace(/\s+/g, " "); // Normalize whitespace
      if (simplified.length > 75) {
        // Try to extract just the essential parts
        const essential = simplified.match(/grants?\s+(?:to\s+)?(?:provider|apex|company|party|the\s+provider)\s+(?:a\s+)?(?:perpetual|irrevocable)[^,]{0,20},?\s*(?:irrevocable|perpetual)[^,]{0,20},?\s*license/i);
        if (essential) {
          return essential[0].trim();
        }
        return simplified.substring(0, 72) + "...";
      }
      return simplified;
    }
  }
  
  // Try "is granted" or "granted" pattern (passive voice)
  const grantedPattern = /(?:is\s+)?granted\s+(?:an\s+)?(?:irrevocable,?\s+)?perpetual[^.]{0,30}?license/i;
  const grantedMatch = text.match(grantedPattern);
  if (grantedMatch && grantedMatch.index !== undefined) {
    let phrase = grantedMatch[0].trim();
    // Try to add entity context if available
    const beforeMatch = text.substring(Math.max(0, grantedMatch.index - 30), grantedMatch.index);
    const entityMatch = beforeMatch.match(/(?:provider|apex|company|party)\s+[^.]{0,20}$/i);
    if (entityMatch) {
      phrase = entityMatch[0].trim() + " " + phrase;
    }
    if (phrase.length > 65) {
      phrase = phrase.substring(0, 62) + "...";
    }
    return phrase;
  }
  
  // Fallback: look for "perpetual" and "irrevocable" near "license"
  const simpleMatch = text.match(/(?:perpetual|irrevocable)[^.]{0,25}?(?:irrevocable|perpetual)[^.]{0,25}?license/i);
  if (simpleMatch && simpleMatch.index !== undefined) {
    let phrase = simpleMatch[0].trim();
    // Try to add "grants" context if available nearby (within 50 chars before)
    const beforeText = text.substring(Math.max(0, simpleMatch.index - 50), simpleMatch.index);
    const grantContext = beforeText.match(/grants?[^.]{0,30}$/i);
    if (grantContext) {
      phrase = grantContext[0].trim() + " " + phrase;
    }
    if (phrase.length > 65) {
      phrase = phrase.substring(0, 62) + "...";
    }
    return phrase;
  }
  
  // Last fallback: return a short snippet mentioning license
  const licenseIndex = text.toLowerCase().indexOf("license");
  if (licenseIndex > 0 && licenseIndex < 50) {
    return text.substring(0, Math.min(licenseIndex + 20, text.length)).trim();
  }
  return text.substring(0, Math.min(40, text.length)).trim();
}

export interface ScoringInput {
  renewalClauses: RawRenewalClause[];
  priceEscalators: RawPriceEscalatorClause[];
  autoRenewalClauses: RawAutoRenewalClause[];
  fullText: string;
  dataOwnershipClauses: string[];
  perpetualIrrevocableLicenseClauses: string[];
}

export interface ScoringResult {
  issues: ScoredIssue[];
  renewalClauses: ScoredRenewalClause[];
  priceEscalators: ScoredPriceEscalatorClause[];
  autoRenewalClauses: ScoredAutoRenewalClause[];
}

export function scoreContractAnalysis(input: ScoringInput): ScoringResult {
  const { 
    renewalClauses, 
    priceEscalators, 
    autoRenewalClauses, 
    fullText,
    dataOwnershipClauses,
    perpetualIrrevocableLicenseClauses
  } = input;
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
        reason = `Auto-renewal notice period is ${c.noticePeriod} — easy to miss, may result in involuntary renewal. Market standard: 30-60 days.`;
      } else if (days > NOTICE_DAYS_MEDIUM) {
        severity = "medium";
        reason = `${c.noticePeriod} notice required — negotiate a shorter window if possible. Market standard: 30-60 days.`;
      } else {
        severity = "low";
        // For ≤30 days: better than market standard (shorter is better for customer)
        // For 31-60 days: within market standard
        if (days <= 30) {
          reason = `Notice period (${c.noticePeriod}) is within or better than market standard (30-60 days).`;
        } else {
          reason = `Standard notice period (${c.noticePeriod}) — within market standard (30-60 days).`;
        }
      }
    }
    issues.push({ severity, reason, clauseText: c.sentence, category: "auto_renewal" });
    return { ...c, severity, reason };
  });

  // --- Price escalators ---
  const scoredEscalators: ScoredPriceEscalatorClause[] = priceEscalators.map((c) => {
    const pct = parsePercent(c.percentage);
    // Read cap from the field set by the analyzer - don't re-detect it
    const hasCap = c.cap != null;
    const isCpi = /cpi|consumer price index/i.test(c.sentence);
    
    // Extract cap value if present (e.g., "not to exceed 8%") for display purposes only
    let capPct: number | null = null;
    if (hasCap) {
      // First, try to match explicit cap patterns including "capped at"
      const capMatch = c.sentence.match(/(?:not\s+to\s+exceed|ceiling|maximum|cap\s+of|capped\s+at|not\s+exceed)\s+(\d{1,2}(?:\.\d+)?)\s*%/i);
      if (capMatch) {
        capPct = parsePercent(capMatch[1] + "%");
      }
      // If no explicit cap value found, look for percentage that appears near cap keywords
      // This avoids incorrectly picking the base escalation rate when it's higher than the cap
      if (capPct == null) {
        // Find all cap-related keyword positions
        const capKeywords = /\b(?:cap|capped|ceiling|maximum|exceed|limit)\b/gi;
        const capKeywordPositions: number[] = [];
        let keywordMatch;
        while ((keywordMatch = capKeywords.exec(c.sentence)) !== null) {
          capKeywordPositions.push(keywordMatch.index);
        }
        
        // Find all percentage matches with their positions
        const percentPattern = /\b(\d{1,2}(?:\.\d+)?)\s*%/g;
        const percentMatches: Array<{ value: string; position: number; parsed: number }> = [];
        let percentMatch;
        while ((percentMatch = percentPattern.exec(c.sentence)) !== null) {
          const parsed = parsePercent(percentMatch[0]);
          if (parsed != null && percentMatch.index !== undefined) {
            percentMatches.push({
              value: percentMatch[0],
              position: percentMatch.index,
              parsed
            });
          }
        }
        
        // Find percentages that appear near cap keywords (within 30 characters)
        const capPercentages = percentMatches
          .filter(pm => capKeywordPositions.some(keywordPos => 
            Math.abs(pm.position - keywordPos) <= 30
          ))
          .map(pm => pm.parsed);
        
        // If we found percentages near cap keywords, use the smallest one (the cap is usually the limit)
        // If no percentages near cap keywords, don't guess - leave capPct as null
        if (capPercentages.length > 0) {
          capPct = Math.min(...capPercentages);
        }
      }
    }
    
    // Risk assessment is based on the base escalation rate, not the cap
    // The cap is a protective limit, not the actual risk
    const effectivePct = pct;
    
    let severity: Severity = "informational";
    let reason = "Price increase clause detected.";
    if (effectivePct != null && !hasCap) {
      severity = "high";
      reason = "Uncapped price increase — no ceiling on annual raises. Market standard: 3-5% or CPI-linked.";
    } else if (effectivePct != null && effectivePct > ESCALATOR_PCT_HIGH) {
      severity = "high";
      reason = `Increase of ${c.percentage} per year — high exposure; negotiate a lower rate. Market standard: 3-5% or CPI-linked.`;
    } else if (effectivePct != null && effectivePct >= ESCALATOR_PCT_MEDIUM && effectivePct <= ESCALATOR_PCT_HIGH) {
      severity = "medium";
      reason = `Escalator of ${c.percentage}${capPct != null ? ` (capped at ${capPct}%)` : ""} — reasonable but worth negotiating. Market standard: 3-5% or CPI-linked.`;
    } else if (hasCap && (isCpi || (effectivePct != null && effectivePct < ESCALATOR_PCT_MEDIUM))) {
      severity = "low";
      reason = isCpi ? "CPI-linked with a cap — standard. Market standard: 3-5% or CPI-linked." : `Escalator of ${c.percentage}${capPct != null ? ` (capped at ${capPct}%)` : ""} — low risk. Market standard: 3-5% or CPI-linked.`;
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
      reason: `Customer must give ${terminationNoticeDays} days' notice to terminate — long window increases risk of involuntary renewal. Market standard: 30-60 days.`,
      category: "termination"
    });
  } else if (terminationNoticeDays != null && terminationNoticeDays > NOTICE_DAYS_MEDIUM) {
    issues.push({
      severity: "medium",
      reason: `Customer must give ${terminationNoticeDays} days' notice to terminate — negotiate a shorter window if possible. Market standard: 30-60 days.`,
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

  // --- Data ownership contradiction detection ---
  // Flag HIGH if contract states Customer owns data but grants Provider a perpetual, irrevocable license
  // Note: We only flag if there's a perpetual irrevocable license. Reasonably scoped licenses
  // (limited to term/service provision) are not flagged, and the presence of both types
  // doesn't negate the problem of the perpetual irrevocable license.
  if (dataOwnershipClauses.length > 0 && perpetualIrrevocableLicenseClauses.length > 0) {
    issues.push({
      severity: "high",
      reason: "Contract states Customer owns its data but grants Provider a perpetual, irrevocable license over it — these may conflict. Review with counsel.",
      category: "data_ownership",
      clauseText: "One clause asserts Customer data ownership. Another grants a perpetual, irrevocable license over it."
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

  // Sort issues by severity: high → medium → low → informational
  // This ensures the most critical issues appear first in the UI
  issues.sort(compareBySeverity);

  return {
    issues,
    renewalClauses: scoredRenewal,
    priceEscalators: scoredEscalators,
    autoRenewalClauses: scoredAuto
  };
}
