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
  // Common abbreviations that end with a period (case-insensitive)
  // Legal/business: U.S., Inc., Corp., Ltd., LLC, L.P., Co., etc.
  // Titles: Dr., Mr., Mrs., Ms., Prof., etc.
  // References: No., Vol., Art., Sec., etc.
  // Latin: e.g., i.e., etc., vs., approx.
  // Other: govt., misc.
  const abbreviations = new Set([
    'u.s.', 'inc.', 'corp.', 'ltd.', 'llc.', 'l.p.', 'co.',
    'dr.', 'mr.', 'mrs.', 'ms.', 'prof.',
    'no.', 'vol.', 'art.', 'sec.',
    'e.g.', 'i.e.', 'etc.', 'vs.', 'approx.', 'govt.', 'misc.'
  ]);
  
  // Helper to check if a period at position i is part of an abbreviation
  const isAbbreviationPeriod = (text: string, i: number): boolean => {
    // Look back up to 15 characters to find abbreviation patterns
    const lookbackStart = Math.max(0, i - 15);
    const context = text.substring(lookbackStart, i + 1);
    const contextLower = context.toLowerCase();
    
    // Normalize context by removing spaces for matching
    const normalizedContext = contextLower.replace(/\s+/g, '');
    
    // First, check if we've already completed an abbreviation (look back only)
    for (const abbrev of abbreviations) {
      const normalizedAbbrev = abbrev.replace(/\s+/g, '');
      // Check if the normalized abbreviation appears at the end of normalized context
      // Also handle abbreviations that might appear with or without a period (like "llc" vs "llc.")
      if (normalizedContext.endsWith(normalizedAbbrev)) {
        return true;
      }
      // Handle case where abbreviation in set has period but text might not, or vice versa
      if (normalizedAbbrev.endsWith('.') && normalizedContext.endsWith(normalizedAbbrev.slice(0, -1))) {
        return true;
      }
      if (!normalizedAbbrev.endsWith('.') && normalizedContext.endsWith(normalizedAbbrev + '.')) {
        return true;
      }
    }
    
    // For multi-period abbreviations like "U.S.", we need to look ahead
    // Check if this period is followed by a capital letter and then another period
    if (i > 0 && /[A-Za-z]/.test(text[i - 1])) {
      let lookAhead = i + 1;
      // Skip whitespace
      while (lookAhead < text.length && /\s/.test(text[lookAhead])) {
        lookAhead++;
      }
      
      // Check if there's a capital letter followed by another period
      // This pattern (letter. CapitalLetter.) indicates a multi-period abbreviation
      if (lookAhead < text.length && /[A-Z]/.test(text[lookAhead])) {
        let nextPeriod = lookAhead + 1;
        // Skip whitespace before next period
        while (nextPeriod < text.length && /\s/.test(text[nextPeriod])) {
          nextPeriod++;
        }
        if (nextPeriod < text.length && text[nextPeriod] === '.') {
          // We have pattern like "U. S." or "U.S." - this is definitely a multi-period abbrev
          // Extract the full abbreviation to verify it matches our list
          const fullAbbrev = text.substring(Math.max(0, i - 2), nextPeriod + 1)
            .toLowerCase()
            .replace(/\s+/g, '');
          for (const abbrev of abbreviations) {
            const normalizedAbbrev = abbrev.replace(/\s+/g, '');
            if (fullAbbrev === normalizedAbbrev || normalizedAbbrev.startsWith(fullAbbrev)) {
              return true;
            }
          }
          // Even if not in our list, pattern "X. Y." is likely an abbreviation
          return true;
        }
      }
      
      // Check for single-letter abbreviations followed by capital letter (e.g., "J. Smith")
      // But only if it's NOT part of a multi-period abbreviation (checked above)
      if (lookAhead < text.length && /[A-Z]/.test(text[lookAhead])) {
        // Single letter + period + capital letter is likely an initial
        return true;
      }
    }
    
    return false;
  };
  
  const sentences: string[] = [];
  let currentSentence = '';
  let i = 0;
  
  while (i < text.length) {
    const char = text[i];
    currentSentence += char;
    
    // Check for sentence-ending punctuation
    if (char === '.' || char === '!' || char === '?') {
      // Look ahead past whitespace to see what comes next
      let j = i + 1;
      const whitespace: string[] = [];
      
      // Collect whitespace (including newlines)
      while (j < text.length && /\s/.test(text[j])) {
        whitespace.push(text[j]);
        j++;
      }
      
      // If we're at the end of text, this is definitely a sentence end
      if (j >= text.length) {
        sentences.push(currentSentence.trim());
        currentSentence = '';
        i = j;
        continue;
      }
      
      const nextChar = text[j];
      const hasNewline = whitespace.includes('\n');
      const isCapitalLetter = /[A-Z]/.test(nextChar);
      
      // For periods, check if it's an abbreviation
      if (char === '.') {
        const isAbbrev = isAbbreviationPeriod(text, i);
        
        if (isAbbrev) {
          // Check if this is a multi-period abbreviation in progress
          // (e.g., "U." followed by "S." - the capital letter is part of the abbrev)
          let isMultiPeriodInProgress = false;
          if (isCapitalLetter && !hasNewline) {
            // Look ahead to see if there's another period coming (multi-period abbrev)
            let checkNext = j + 1;
            while (checkNext < text.length && /\s/.test(text[checkNext])) {
              checkNext++;
            }
            if (checkNext < text.length && text[checkNext] === '.') {
              // The capital letter is followed by a period - it's part of the abbreviation
              isMultiPeriodInProgress = true;
            }
          }
          
          // For abbreviations, we need to be more careful about splitting
          // Only split if it's clearly the end of a sentence
          if (hasNewline) {
            // Newline is a strong signal - split here
            sentences.push(currentSentence.trim());
            currentSentence = '';
            i = j; // Skip the whitespace
            continue;
          } else if (isCapitalLetter && !isMultiPeriodInProgress) {
            // Abbreviation followed by capital letter - check if it's a new sentence
            // First, check if the capital letter word is a common sentence starter
            let wordEnd = j + 1;
            while (wordEnd < text.length && /[A-Za-z]/.test(text[wordEnd])) {
              wordEnd++;
            }
            const firstWord = text.substring(j, wordEnd).toLowerCase();
            const sentenceStarters = ['the', 'this', 'that', 'these', 'those', 'a', 'an', 'each', 'every', 'some', 'any', 'all'];
            
            // If the word after the abbreviation is a common sentence starter, it's likely a new sentence
            if (sentenceStarters.includes(firstWord)) {
              sentences.push(currentSentence.trim());
              currentSentence = '';
              i = j; // Skip the whitespace
              continue;
            }
            
            // Otherwise, look ahead to see what comes after the capital letter word
            let lookAhead = wordEnd;
            // Skip whitespace after the word
            while (lookAhead < text.length && /\s/.test(text[lookAhead])) {
              lookAhead++;
            }
            
            // Check what comes after the capital letter word
            if (lookAhead < text.length) {
              const afterWord = text[lookAhead];
              // Common prepositions/articles that indicate continuing proper noun phrases
              const continuingWords = ['of', 'the', 'a', 'an', 'in', 'on', 'at', 'for', 'and', 'or'];
              // Common verbs that often follow proper nouns in the same sentence
              const continuingVerbs = ['increased', 'decreased', 'expanded', 'declined', 'rose', 'fell', 
                'grew', 'shrank', 'improved', 'worsened', 'changed', 'remained', 'stayed', 'continued',
                'started', 'ended', 'began', 'stopped', 'reached', 'exceeded', 'dropped', 'climbed'];
              
              // Extract the next word to check if it's a continuing word
              let nextWordEnd = lookAhead;
              while (nextWordEnd < text.length && /[A-Za-z]/.test(text[nextWordEnd])) {
                nextWordEnd++;
              }
              const nextWord = text.substring(lookAhead, nextWordEnd).toLowerCase();
              
              // If followed by a continuing word (preposition/article) or verb, it's continuing
              if (continuingWords.includes(nextWord) || continuingVerbs.includes(nextWord)) {
                // Continuing word or verb - don't split
                i++;
                continue;
              }
              
              // If followed by lowercase letter that's NOT a continuing word or verb,
              // it could be a new sentence, but be conservative with proper nouns
              // Only split if we're confident it's a new sentence (e.g., followed by another sentence starter pattern)
              if (/[a-z]/.test(afterWord)) {
                // Look further ahead to see the context
                let furtherAhead = nextWordEnd;
                while (furtherAhead < text.length && /\s/.test(text[furtherAhead])) {
                  furtherAhead++;
                }
                // If the next word after the lowercase word is a sentence starter, it's likely a new sentence
                if (furtherAhead < text.length) {
                  let sentenceStartCheck = furtherAhead;
                  let sentenceStartEnd = sentenceStartCheck + 1;
                  while (sentenceStartEnd < text.length && /[A-Za-z]/.test(text[sentenceStartEnd])) {
                    sentenceStartEnd++;
                  }
                  const potentialStarter = text.substring(sentenceStartCheck, sentenceStartEnd).toLowerCase();
                  if (sentenceStarters.includes(potentialStarter)) {
                    // Pattern like "Inc. Sales increased. The company..." - split at the abbreviation
                    sentences.push(currentSentence.trim());
                    currentSentence = '';
                    i = j; // Skip the whitespace
                    continue;
                  }
                }
                // Otherwise, be conservative - proper nouns often continue sentences
                // Don't split on lowercase words after proper nouns unless very confident
                i++;
                continue;
              }
              // If followed by punctuation (comma, etc.), it's continuing
              // Otherwise, it's likely continuing - don't split
            }
          }
          
          // Abbreviation in middle of sentence, multi-period abbrev in progress, or
          // abbreviation followed by proper noun - don't split
          i++;
          continue;
        }
        // Not an abbreviation - check if it's a sentence boundary
        if (isCapitalLetter || hasNewline) {
          sentences.push(currentSentence.trim());
          currentSentence = '';
          i = j; // Skip the whitespace
          continue;
        }
        // Period not followed by capital - might be decimal, ellipsis, etc. - don't split
        i++;
        continue;
      }
      
      // For ! and ?, always split (these are always sentence boundaries)
      if (char === '!' || char === '?') {
        sentences.push(currentSentence.trim());
        currentSentence = '';
        i = j; // Skip the whitespace
        continue;
      }
    }
    
    i++;
  }
  
  // Add any remaining text
  if (currentSentence.trim().length > 0) {
    sentences.push(currentSentence.trim());
  }
  
  return sentences.filter((s) => s.length > 0);
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

