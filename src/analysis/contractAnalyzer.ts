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

/**
 * Detects if a sentence contains data ownership language (Customer owns/retains ownership of data)
 */
function hasDataOwnershipLanguage(sentence: string): boolean {
  const lowered = sentence.toLowerCase();
  
  // Must have ownership keyword
  const hasOwnershipKeyword = lowered.includes("ownership") || 
                              lowered.includes("owns") || 
                              lowered.includes("own");
  
  if (!hasOwnershipKeyword) {
    return false;
  }
  
  // FIRST: Check for provider ownership - if provider owns, this is NOT customer ownership
  // This must be checked before pattern matching to prevent false positives like
  // "Provider retains ownership of all customer data"
  const providerOwnershipPattern = /provider.*(\bowns?\b|\bownership\b|\bretains?\s+ownership|shall\s+(\bown\b|\bretain\s+ownership))/i;
  if (providerOwnershipPattern.test(sentence)) {
    return false;
  }
  
  // Look for patterns like "Customer retains ownership", "Customer owns", "Customer shall retain ownership"
  // Also check for "its data", "customer data", "data ownership"
  // Note: Patterns that match "ownership of customer data" are safe because provider ownership
  // is checked first, so "Provider retains ownership of customer data" will return false before
  // these patterns are evaluated.
  const ownershipPatterns = [
    /customer\s+(\bretains?\b|shall\s+retain|\bowns?\b|shall\s+\bown\b)\s+(all\s+)?\bownership\b/i,
    /\bownership\b\s+(of|in|to)\s+(customer|customer's|its|the\s+customer's)\s+(data|information|content)/i,
    /(customer|customer's|its|the\s+customer's)\s+(data|information|content)\s+.*\bownership\b/i,
    /customer\s+\bretains?\b\s+(all\s+)?(rights\s+and\s+)?\bownership\b/i,
    /\bownership\b\s+of\s+(all\s+)?(customer|customer's|its)\s+(data|information|content)/i
  ];
  
  // Check if any pattern matches
  if (ownershipPatterns.some(pattern => pattern.test(sentence))) {
    return true;
  }
  
  // Fallback: Check for ownership + data + customer reference, but require semantic alignment
  // Ownership must be attributed to customer, not just that both words appear
  const hasDataKeyword = lowered.includes("data") || 
                        lowered.includes("information") || 
                        lowered.includes("content");
  const hasCustomerReference = lowered.includes("customer") || 
                              (lowered.includes("party") && !lowered.includes("provider"));
  
  if (!hasDataKeyword || !hasCustomerReference) {
    return false;
  }
  
  // Check that ownership is attributed to customer, not provider or other third-party entities
  // Look for patterns where customer is the subject of ownership
  // Use word boundaries to prevent false matches like "owner" or "autonomous"
  
  // First, exclude sentences where third-party entities (licensor, company, vendor, etc.) own customer data
  // These patterns check for third-party entities before ownership verbs
  const thirdPartyOwnershipPatterns = [
    /\b(licensor|company|vendor|supplier|contractor|third[- ]?party|entity|organization)\b.*(\bowns?\b|\bownership\b|\bretains?\s+ownership).*customer/i,
    /\b(licensor|company|vendor|supplier|contractor|third[- ]?party|entity|organization)\b.*(\bowns?\b|\bownership\b).*(customer|customer's|its)\s+(data|information|content)/i
  ];
  
  // If a third-party entity owns customer data, this is NOT customer ownership
  if (thirdPartyOwnershipPatterns.some(pattern => pattern.test(sentence))) {
    return false;
  }
  
  // Check for patterns where customer is the subject of ownership
  // Only use patterns that require "customer" to appear BEFORE the ownership verb
  // This ensures customer is the subject, not a third-party entity
  // Patterns 2 and 4 are removed because they match ownership verbs before "customer",
  // which could incorrectly match "Licensor owns customer data"
  
  // First, check for negations between "customer" and ownership verbs
  // Exclude sentences like "Customer does not retain ownership" or "Customer shall not own"
  const negationPatterns = [
    /customer.*\b(does\s+not|do\s+not|did\s+not|shall\s+not|will\s+not|may\s+not|cannot|can\s+not|doesn'?t|don'?t|didn'?t|won'?t|shan'?t|mayn'?t)\b.*(\bowns?\b|\bownership\b|\bretains?\s+ownership)/i,
    /customer.*\b(does\s+not|do\s+not|did\s+not|shall\s+not|will\s+not|may\s+not|cannot|can\s+not|doesn'?t|don'?t|didn'?t|won'?t|shan'?t|mayn'?t)\b.*(data|information|content).*(\bowns?\b|\bownership\b)/i
  ];
  
  // If a negation appears between customer and ownership, this is NOT customer ownership
  if (negationPatterns.some(pattern => pattern.test(sentence))) {
    return false;
  }
  
  const customerOwnershipPatterns = [
    /customer.*(\bowns?\b|\bownership\b|\bretains?\s+ownership|shall\s+(\bown\b|\bretain\s+ownership))/i,
    /customer.*(data|information|content).*(\bowns?\b|\bownership\b)/i
  ];
  
  // Note: Provider ownership is already checked at the beginning of the function,
  // so we don't need to check again here.
  
  // If we have customer ownership patterns, it's likely customer ownership
  return customerOwnershipPatterns.some(pattern => pattern.test(sentence));
}

/**
 * Detects if a sentence contains a perpetual, irrevocable license to customer data
 * Returns true only if both "perpetual" and "irrevocable" are present
 */
function hasPerpetualIrrevocableLicense(sentence: string): boolean {
  const lowered = sentence.toLowerCase();
  
  // Must have both "perpetual" and "irrevocable" (in any order)
  // Check for word boundaries to match complete words and exclude negations
  // Use regex with word boundaries to avoid matching negated terms like "non-perpetual"
  
  // Find all occurrences of "perpetual" and "irrevocable" in the sentence
  const perpetualMatches: number[] = [];
  const perpetualRegex = /\bperpetual\b/gi;
  let match;
  while ((match = perpetualRegex.exec(sentence)) !== null) {
    perpetualMatches.push(match.index);
  }
  
  const irrevocableMatches: number[] = [];
  const irrevocableRegex = /\birrevocable\b/gi;
  while ((match = irrevocableRegex.exec(sentence)) !== null) {
    irrevocableMatches.push(match.index);
  }
  
  // Check if any of the matched "perpetual" or "irrevocable" words are negated
  // Only check the immediate context (up to 20 characters before) for negations
  // This prevents false negatives when a sentence has both negated and non-negated occurrences
  const checkIfNegated = (wordIndex: number, sentence: string): boolean => {
    const contextStart = Math.max(0, wordIndex - 20);
    const context = sentence.substring(contextStart, wordIndex);
    // Check for negations immediately before the word
    return /\b(no|non|not|never)[- ]?$/i.test(context);
  };
  
  // Check if we have at least one non-negated "perpetual" and one non-negated "irrevocable"
  const hasNonNegatedPerpetual = perpetualMatches.some(index => !checkIfNegated(index, sentence));
  const hasNonNegatedIrrevocable = irrevocableMatches.some(index => !checkIfNegated(index, sentence));
  
  const hasPerpetual = perpetualMatches.length > 0 && hasNonNegatedPerpetual;
  const hasIrrevocable = irrevocableMatches.length > 0 && hasNonNegatedIrrevocable;
  
  if (!hasPerpetual || !hasIrrevocable) {
    return false;
  }
  
  // Should also mention license, grant, or right
  const hasLicenseLanguage = lowered.includes("license") || 
                             lowered.includes("grant") || 
                             lowered.includes("right") ||
                             lowered.includes("rights") ||
                             lowered.includes("licenses");
  
  // Must explicitly mention data, information, content, or customer context
  // This prevents false positives from licenses to other materials (software, IP, etc.)
  const hasDataReference = lowered.includes("data") || 
                          lowered.includes("information") || 
                          lowered.includes("content") ||
                          lowered.includes("customer data") ||
                          lowered.includes("customer's data") ||
                          lowered.includes("customer information");
  
  // Check for customer context - if license is granted BY customer or TO customer data
  // Only match if data is explicitly mentioned to avoid false positives on non-data licenses
  const hasCustomerContext = lowered.includes("customer") && (
    lowered.includes("customer data") ||
    lowered.includes("customer's data") ||
    lowered.includes("customer information") ||
    // Customer grants...data (requires data/information/content in the grant context)
    /customer.*grant.*(data|information|content)/i.test(sentence) ||
    // ...grants to customer data (requires data/information/content in the grant context)
    /grant.*customer.*(data|information|content)/i.test(sentence)
  );
  
  // Require explicit data reference OR customer context
  // Do NOT match licenses to other materials (software, IP, etc.) even if provider is mentioned
  return hasLicenseLanguage && (hasDataReference || hasCustomerContext);
}

/**
 * Checks if a license clause is reasonably scoped (not perpetual/irrevocable)
 * Returns true if the license is limited to the term, service provision, etc.
 * 
 * Note: This function is currently unused but kept for potential future enhancements
 * where we might want to distinguish between different license types.
 */
function isReasonablyScopedLicense(sentence: string): boolean {
  const lowered = sentence.toLowerCase();
  
  // If it's perpetual and irrevocable, it's not reasonably scoped
  if (hasPerpetualIrrevocableLicense(sentence)) {
    return false;
  }
  
  // Check for reasonable scoping language
  const scopingPatterns = [
    /during\s+the\s+term/i,
    /for\s+the\s+purpose\s+of\s+providing/i,
    /solely\s+for\s+the\s+purpose/i,
    /limited\s+to\s+the\s+provision/i,
    /while\s+this\s+agreement\s+is\s+in\s+effect/i,
    /during\s+the\s+term\s+of\s+this\s+agreement/i
  ];
  
  return scopingPatterns.some(pattern => pattern.test(sentence));
}

export function analyzeContract(text: string): ContractAnalysis {
  const sentences = splitSentences(text);
  const loweredText = text.toLowerCase();

  const rawRenewal: Array<{ sentence: string; renewalDate?: string; renewalTerm?: string }> = [];
  const rawEscalators: Array<{ sentence: string; percentage?: string; frequency?: string; cap?: string }> = [];
  const rawAutoRenewal: Array<{ sentence: string; noticePeriod?: string; cancellationMethod?: string }> = [];
  const dataOwnershipClauses: string[] = [];
  const perpetualIrrevocableLicenseClauses: string[] = [];

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

    // Data ownership clauses
    if (hasDataOwnershipLanguage(sentence)) {
      dataOwnershipClauses.push(sentence);
    }

    // Perpetual irrevocable license clauses
    if (hasPerpetualIrrevocableLicense(sentence)) {
      perpetualIrrevocableLicenseClauses.push(sentence);
    }
    // Note: Reasonably scoped licenses are detected by isReasonablyScopedLicense() but not collected
    // since they're only used to exclude sentences from being flagged as perpetual/irrevocable.
    // The scoring logic only needs to check if perpetual irrevocable licenses exist.
  }

  const scored = scoreContractAnalysis({
    renewalClauses: rawRenewal,
    priceEscalators: rawEscalators,
    autoRenewalClauses: rawAutoRenewal,
    fullText: text,
    dataOwnershipClauses,
    perpetualIrrevocableLicenseClauses
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

