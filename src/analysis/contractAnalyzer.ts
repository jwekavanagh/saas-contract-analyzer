export interface RenewalClause {
  sentence: string;
  renewalDate?: string;
  renewalTerm?: string;
}

export interface PriceEscalatorClause {
  sentence: string;
  percentage?: string;
  frequency?: string;
  cap?: string;
}

export interface AutoRenewalClause {
  sentence: string;
  noticePeriod?: string;
  cancellationMethod?: string;
}

export interface ContractAnalysis {
  renewalClauses: RenewalClause[];
  priceEscalators: PriceEscalatorClause[];
  autoRenewalClauses: AutoRenewalClause[];
  keyIssues: string[];
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

  const renewalClauses: RenewalClause[] = [];
  const priceEscalators: PriceEscalatorClause[] = [];
  const autoRenewalClauses: AutoRenewalClause[] = [];
  const keyIssues: string[] = [];

  for (const sentence of sentences) {
    const lowered = sentence.toLowerCase();

    // Renewal clauses and dates
    if (
      lowered.includes("renew") ||
      lowered.includes("renewal") ||
      lowered.includes("expiration") ||
      lowered.includes("term of this agreement")
    ) {
      renewalClauses.push({
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
      priceEscalators.push({
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
      autoRenewalClauses.push({
        sentence,
        noticePeriod: extractNoticePeriod(sentence),
        cancellationMethod: extractCancellationMethod(sentence)
      });
    }
  }

  // High-level issues
  if (autoRenewalClauses.length === 0) {
    keyIssues.push("No explicit auto-renewal clause found.");
  } else {
    const anyLongNotice = autoRenewalClauses.some((c) => {
      if (!c.noticePeriod) return false;
      const match = c.noticePeriod.match(/(\d{1,3})\s*(day|days|month|months)/i);
      if (!match) return false;
      const value = Number(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.startsWith("day")) {
        return value > 60;
      }
      if (unit.startsWith("month")) {
        return value > 2;
      }
      return false;
    });
    if (anyLongNotice) {
      keyIssues.push(
        "Auto-renewal notice period appears long; consider negotiating a shorter window (e.g. 30–60 days)."
      );
    }
  }

  if (priceEscalators.length === 0) {
    keyIssues.push("No explicit price escalator clause found; verify that pricing is stable over the term.");
  } else {
    const anyHighIncrease = priceEscalators.some((c) => {
      if (!c.percentage) return false;
      const num = Number(c.percentage.replace("%", "").trim());
      return !Number.isNaN(num) && num > 7;
    });
    if (anyHighIncrease) {
      keyIssues.push(
        "One or more price escalators exceed ~7% per year; consider negotiating a lower cap or CPI-based adjustment."
      );
    }
  }

  if (!loweredText.includes("termination for convenience")) {
    keyIssues.push(
      "No 'termination for convenience' language detected; confirm how you can exit the agreement before the end of the term."
    );
  }

  const summaryParts: string[] = [];
  if (renewalClauses.length) {
    summaryParts.push(
      `Detected ${renewalClauses.length} renewal-related clause${renewalClauses.length > 1 ? "s" : ""}.`
    );
  }
  if (autoRenewalClauses.length) {
    summaryParts.push(
      `${autoRenewalClauses.length} clause${autoRenewalClauses.length > 1 ? "s" : ""} mention automatic renewal.`
    );
  }
  if (priceEscalators.length) {
    summaryParts.push(
      `${priceEscalators.length} clause${priceEscalators.length > 1 ? "s" : ""} mention fee increases or escalators.`
    );
  }

  const summary =
    summaryParts.length > 0
      ? summaryParts.join(" ")
      : "No obvious renewal, auto-renewal, or price escalator clauses were detected. Review the agreement manually.";

  return {
    renewalClauses,
    priceEscalators,
    autoRenewalClauses,
    keyIssues,
    summary
  };
}

