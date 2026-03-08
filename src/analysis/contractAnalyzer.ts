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
  const percentRegex = /\b\d{1,2}(?:\.\d+)?\s*%/;
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
  // Look for notice periods specifically - these appear near "notice", "prior", "before", "cancel"
  // This helps avoid matching renewal terms like "one (1) year periods"
  const noticeContext = /(?:notice|prior|before|cancel|non-renewal).*?(?:\((\d{1,3})\)|(\d{1,3}))\s*(day|days|month|months)\b/i;
  const noticeMatch = sentence.match(noticeContext);
  if (noticeMatch) {
    const days = noticeMatch[1] || noticeMatch[2];
    const unit = noticeMatch[3];
    if (days && unit) {
      return `${days} ${unit}`;
    }
  }
  
  // Fallback: try to match numbers in parentheses like "(120) days" - prefer days/months over years
  const parensDaysRegex = /\((\d{1,3})\)\s*(day|days|month|months)\b/i;
  const parensDaysMatch = sentence.match(parensDaysRegex);
  if (parensDaysMatch) {
    return `${parensDaysMatch[1]} ${parensDaysMatch[2]}`;
  }
  
  // Fallback to regular pattern like "120 days" or "90 days" (prefer days/months)
  const daysRegex = /\b(\d{1,3})\s*(day|days|month|months)\b/i;
  const daysMatch = sentence.match(daysRegex);
  if (daysMatch) {
    return `${daysMatch[1]} ${daysMatch[2]}`;
  }
  
  return undefined;
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
 * Returns true only if both "perpetual" and "irrevocable" are present AND
 * the license is specifically to Customer Data (not software, IP, materials, etc.)
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
  
  if (!hasLicenseLanguage) {
    return false;
  }
  
  // FIRST: Explicitly exclude licenses to non-data materials (software, IP, materials, documentation, service)
  // These are standard grant-back clauses, not data ownership issues
  // Check if the license is specifically TO non-data items
  // We need to check what the license/grant/right is TO - if it's to software/IP/materials/etc., exclude it
  
  // Pattern 1: "license/grant/right to [non-data item]"
  // Matches: "license to software", "grant to intellectual property", "right to materials"
  const licenseToNonDataPattern1 = /\b(?:license|grant|right|rights|licenses)\s+(?:to|of|for|over|in)\s+(?:all\s+)?(?:the\s+)?(?:software|intellectual\s+property|ip\b|materials|works|products|services|technology|code|source\s+code|proprietary\s+information|trade\s+secrets|documentation|documents|service)/i;
  
  // Pattern 2: "license/grant/right to use [non-data item]"
  // Matches: "license to use the software", "grant to use intellectual property"
  const licenseToNonDataPattern2 = /\b(?:license|grant|right|rights|licenses)\s+(?:to|of|for|over|in)\s+(?:use|access|utilize)\s+(?:the\s+)?(?:software|intellectual\s+property|ip\b|materials|technology|code|source\s+code|documentation|service)/i;
  
  // Pattern 3: "license/grant/right to [entity]'s [non-data item]"
  // Matches: "license to Provider's intellectual property", "grant to Licensor's software"
  const licenseToNonDataPattern3 = /\b(?:license|grant|right|rights|licenses)\s+(?:to|of|for|over|in)\s+(?:provider|licensor|company|party)[\'s]?\s+(?:own\s+)?(?:intellectual\s+property|ip\b|software|technology|materials|code|source\s+code)/i;
  
  // Pattern 4: "is granted [a/an] license to [non-data item]"
  // Matches: "is granted a license to the software", "is granted an irrevocable license to intellectual property"
  const licenseToNonDataPattern4 = /(?:is\s+)?granted\s+(?:an?\s+)?(?:perpetual|irrevocable|non-exclusive|exclusive)?\s*(?:perpetual|irrevocable)?\s*(?:license|grant|right|rights)\s+(?:to|of|for|over|in)\s+(?:all\s+)?(?:the\s+)?(?:software|intellectual\s+property|ip\b|materials|works|products|services|technology|code|source\s+code|proprietary\s+information|trade\s+secrets|documentation|documents|service)/i;
  
  if (licenseToNonDataPattern1.test(sentence) || 
      licenseToNonDataPattern2.test(sentence) || 
      licenseToNonDataPattern3.test(sentence) ||
      licenseToNonDataPattern4.test(sentence)) {
    return false;
  }
  
  // SECOND: Check if the license is specifically TO Customer Data
  // Must have explicit reference to customer data, data submitted by customer, or similar
  // The license must be TO customer data, not just mention both "license" and "data" separately
  
  // Pattern 1: Direct references to customer data in the license context
  // Matches: "license to Customer data", "grant to Customer's data", "right to all Customer data"
  const customerDataPattern1 = /\b(?:license|grant|right|rights|licenses)\s+(?:to|for|over|in|to\s+use|to\s+access|to\s+process)\s+.*?(?:customer|customer's|the\s+customer's)\s+(?:data|information|content)/i;
  
  // Pattern 2: "all Customer data" or "Customer data" after license language
  // Matches: "license ... all Customer data", "granted ... Customer data"
  const customerDataPattern2 = /(?:license|grant|right|rights|licenses|granted).*?(?:all\s+)?(?:customer|customer's|the\s+customer's)\s+(?:data|information|content)/i;
  
  // Pattern 3: Customer grants...data
  // Matches: "Customer grants Provider ... data", "Customer hereby grants ... Customer data"
  const customerDataPattern3 = /customer.*grant.*(?:customer|customer's|the\s+customer's)?.*?(?:data|information|content)/i;
  
  // Pattern 4: Data submitted by customer
  // Matches: "license to data submitted by Customer", "grant to data provided by Customer"
  const customerDataPattern4 = /(?:license|grant|right|rights|licenses)\s+(?:to|for|over|in)\s+.*?data\s+(?:submitted|provided|uploaded|furnished|supplied)\s+(?:by|to)\s+(?:customer|the\s+customer)/i;
  
  // Pattern 5: "such data" when in context of customer data (handled by checking full contract context)
  // For now, we'll be conservative and require explicit customer data reference
  const customerDataPattern5 = /(?:license|grant|right|rights|licenses)\s+(?:to|for|over|in)\s+such\s+(?:data|information|content)/i;
  
  // Pattern 6: "all data" when it's clear from context it's customer data
  // Matches: "license to all data" when customer is mentioned nearby
  const customerDataPattern6 = /\b(?:license|grant|right|rights|licenses)\s+(?:to|for|over|in)\s+all\s+(?:data|information|content)(?:\s+(?:submitted|provided|uploaded|furnished|supplied)\s+(?:by|to)\s+(?:customer|the\s+customer))?/i;
  
  // Check if any customer data pattern matches
  const isLicenseToCustomerData = customerDataPattern1.test(sentence) ||
                                   customerDataPattern2.test(sentence) ||
                                   customerDataPattern3.test(sentence) ||
                                   customerDataPattern4.test(sentence) ||
                                   (customerDataPattern5.test(sentence) && lowered.includes("customer")) ||
                                   (customerDataPattern6.test(sentence) && lowered.includes("customer"));
  
  if (!isLicenseToCustomerData) {
    return false;
  }
  
  // Final check: Make sure we're not matching a license FROM customer TO provider's own data
  // Exclude patterns like "Customer grants Provider license to Provider's own data"
  const providerOwnDataPattern = /(?:license|grant|right|rights|licenses)\s+(?:to|for|over|in)\s+(?:provider|licensor)[\'s]?\s+(?:own\s+)?(?:data|information|content)/i;
  if (providerOwnDataPattern.test(sentence)) {
    return false;
  }
  
  return true;
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
      (lowered.includes("increase") && (lowered.includes("fee") || lowered.includes("fees") || lowered.includes("price") || lowered.includes("pricing"))) ||
      (lowered.includes("%") && lowered.includes("year")) ||
      lowered.includes("cpi") ||
      lowered.includes("consumer price index")
    ) {
      // Detect if there's a cap, but exclude negations like "without cap", "no cap", "uncapped"
      let hasCap = false;
      
      // First check for explicit negations - if found, definitely no cap
      const hasNegation = /\b(without|no|not|un)\s+(?:cap|ceiling|maximum|limit)\b/i.test(sentence) ||
                         /\buncapped\b/i.test(sentence);
      
      if (!hasNegation) {
        // Check for explicit cap indicators (not to exceed, ceiling, maximum)
        if (lowered.includes("not exceed") || 
            lowered.includes("not to exceed") ||
            lowered.includes("ceiling") || 
            lowered.includes("maximum")) {
          hasCap = true;
        }
        
        // Check for "cap" - only if no negation was found
        if (lowered.includes("cap")) {
          hasCap = true;
        }
      }
      
      rawEscalators.push({
        sentence,
        percentage: extractPercentage(sentence),
        frequency: extractFrequency(sentence),
        cap: hasCap ? "Capped" : undefined
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

