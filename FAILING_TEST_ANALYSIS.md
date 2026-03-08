# Failing Test Analysis

## Test: `sorts auto-renewal HIGH issues correctly with other HIGH issues`

**Location**: `src/analysis/contractAnalyzer.test.ts:508-527`

### Test Contract
```
This Agreement shall automatically renew unless either party provides written notice at least one hundred twenty (120) days prior to the end of the term.

Provider may increase fees by up to 15% per year without cap.
```

### Expected Behavior
The test expects **2 HIGH severity issues**:
1. ✅ Auto-renewal with 120-day notice (should be HIGH since 120 > 60)
2. ❌ Price escalator "15% per year without cap" (should be HIGH - uncapped and >10%)

### Actual Behavior
Only **1 HIGH issue** is found (the auto-renewal).

### Root Cause

The price escalator detection has a bug in the cap detection logic:

**File**: `src/analysis/severityConfig.ts:286`
```typescript
const hasCap = c.cap != null || /not exceed|cap|ceiling|maximum/i.test(c.sentence);
```

**Problem**: The regex `/cap/i` matches the word "cap" anywhere in the sentence, including in "**without cap**". This causes the system to incorrectly think there's a cap when the contract explicitly says "without cap".

### Impact

The price escalator clause "15% per year without cap" is:
- ✅ Detected as a price escalator
- ✅ Percentage extracted correctly (15%)
- ❌ Incorrectly flagged as having a cap (because "cap" appears in "without cap")
- ❌ Scored as "informational" instead of HIGH

Even though 15% > 10% (ESCALATOR_PCT_HIGH), the first condition `if (pct != null && !hasCap)` fails because `hasCap` is incorrectly `true`.

### Fix Required

The cap detection regex should exclude "without cap" and "no cap" patterns:

```typescript
const hasCap = c.cap != null || 
  /(?:not exceed|cap|ceiling|maximum)/i.test(c.sentence) &&
  !/(?:without|no)\s+cap/i.test(c.sentence);
```

Or more robustly:
```typescript
const hasCap = c.cap != null || 
  (/(?:not exceed|cap|ceiling|maximum)/i.test(c.sentence) &&
   !/(?:without|no)\s+(?:cap|ceiling|maximum)/i.test(c.sentence));
```

### Status

- **Unrelated to data ownership fix**: ✅ This is a pre-existing bug in price escalator detection
- **Test failure**: ❌ The test correctly identifies a bug that should be fixed
- **Impact**: Low - doesn't affect the data ownership fix, but should be addressed separately

### Recommendation

Fix this in a separate commit/PR focused on price escalator detection improvements.
