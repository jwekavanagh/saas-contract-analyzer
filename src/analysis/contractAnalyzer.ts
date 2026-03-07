import {
  scoreContractAnalysis,
  type ScoredIssue,
  type ScoredRenewalClause,
  type ScoredPriceEscalatorClause,
  type ScoredAutoRenewalClause
} from "./severityConfig";

export type { ScoredIssue } from "./severityConfig";

export type RenewalClause = ScoredRenewalClause;
export type PriceEscalatorClause = ScoredPriceEscalatorClause;
export type AutoRenewalClause = ScoredAutoRenewalClause;

export interface ContractAnalysis {
  renewalClauses: RenewalClause[];
  priceEscalators: PriceEscalatorClause[];
  autoRenewalClauses: AutoRenewalClause[];
  issues: ScoredIssue[];
  summary: string;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function extractDate(sentence: string): string | undefined {
  const monthDateYear =
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i;
  const numericDate = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/;

  return (
    sentence.match(monthDateYear)?.[0] ?? sentence.match(numericDate)?.[0]
  );
}

function extractPercentage(sentence: string): string | undefined {
  const percentRegex = /\b\d{1,2}(?:\.\d+)?\s*%\b/;
  return sentence.match(percentRegex)?.[0];
}

function extractFrequency(sentence: string): string | undefined {
  const lowered = sentence.toLowerCase();
  if (lowered.includes("per year") || lowered.includes("annually")) {
    return "Annual";
  }
  if (lowered.includes("per month") || lowered.includes("monthly")) {
    return "Monthly";
  }
  if (lowered.includes("per quarter") || lowered.includes("quarterly")) {
    return "Quarterly";
  }
  return undefined;
}

function extractNoticePeriod(sentence: string): string | undefined {
  const noticeRegex =
    /\b(\d{1,3})\s*(day|days|month|months|year|years)\b(?![^\(]*\))/i;
  const match = sentence.match(noticeRegex);
  if (!match) return undefined;
  return `${match[1]} ${match[2]}`;
}

function extractCancellationMethod(sentence: string): string | undefined {
  const lowered = sentence.toLowerCase();
  if (lowered.includes("written notice")) return "Written notice";
  if (lowered.includes("email")) return "Email";
  if (lowered.includes("portal")) return "Customer portal";
  if (lowered.includes("ticket")) return "Support ticket";
  return undefined;
}

export function analyzeContract(text: string): ContractAnalysis {
  const sentences = splitSentences(text);
  const loweredText = text.toLowerCase();

  const rawRenewal: Array<{ sentence: string; renewalDate?: string; renewalTerm?: string }> = [];
  const rawEscalators: Array<{ sentence: string; percentage?: string; frequency?: string; cap?: string }> = [];
  const rawAutoRenewal: Array<{ sentence: string; noticePeriod?: string; cancellationMethod?: string }> = [];

  for (const sentence of sentences) {
    const lowered = sentence.toLowerCase();

    // Renewal clauses and dates
    if (
      lowered.includes("renew") ||
      lowered.includes("renewal") ||
      lowered.includes("expiration") ||
      lowered.includes("term of this agreement")
    ) {
      rawRenewal.push({
        sentence,
        renewalDate: extractDate(sentence),
        renewalTerm: lowered.includes("one (1) year")
          ? "1 year"
          : lowered.includes("two (2) years")
          ? "2 years"
          : lowered.includes("three (3) years")
          ? "3 years"
          : undefined
      });
    }

    // Price escalators
    if (
      lowered.includes("escalat") ||
      (lowered.includes("increase") && lowered.includes("fee")) ||
      (lowered.includes("%") && lowered.includes("year")) ||
      lowered.includes("cpi") ||
      lowered.includes("consumer price index")
    ) {
      rawEscalators.push({
        sentence,
        percentage: extractPercentage(sentence),
        frequency: extractFrequency(sentence),
        cap: lowered.includes("cap") || lowered.includes("not exceed")
          ? "Capped"
          : undefined
      });
    }

    // Auto-renewal
    if (
      lowered.includes("auto-renew") ||
      lowered.includes("automatically renew") ||
      lowered.includes("shall automatically renew") ||
      lowered.includes("automatic renewal")
    ) {
      rawAutoRenewal.push({
        sentence,
        noticePeriod: extractNoticePeriod(sentence),
        cancellationMethod: extractCancellationMethod(sentence)
      });
    }
  }

  const scored = scoreContractAnalysis({
    renewalClauses: rawRenewal,
    priceEscalators: rawEscalators,
    autoRenewalClauses: rawAutoRenewal,
    fullText: text
  });

  const summaryParts: string[] = [];
  if (scored.renewalClauses.length) {
    summaryParts.push(
      `Detected ${scored.renewalClauses.length} renewal-related clause${scored.renewalClauses.length > 1 ? "s" : ""}.`
    );
  }
  if (scored.autoRenewalClauses.length) {
    summaryParts.push(
      `${scored.autoRenewalClauses.length} clause${scored.autoRenewalClauses.length > 1 ? "s" : ""} mention automatic renewal.`
    );
  }
  if (scored.priceEscalators.length) {
    summaryParts.push(
      `${scored.priceEscalators.length} clause${scored.priceEscalators.length > 1 ? "s" : ""} mention fee increases or escalators.`
    );
  }

  const summary =
    summaryParts.length > 0
      ? summaryParts.join(" ")
      : "No obvious renewal, auto-renewal, or price escalator clauses were detected. Review the agreement manually.";

  return {
    renewalClauses: scored.renewalClauses,
    priceEscalators: scored.priceEscalators,
    autoRenewalClauses: scored.autoRenewalClauses,
    issues: scored.issues,
    summary
  };
}

