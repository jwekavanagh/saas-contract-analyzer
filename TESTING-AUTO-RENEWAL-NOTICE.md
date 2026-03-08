# Testing Guide - Auto-Renewal Notice Period Scoring

## Overview

This guide explains how to test the auto-renewal notice period scoring feature. The feature flags auto-renewal clauses with notice periods >60 days as HIGH severity in the Red Flags section.

## Quick Start

### Automated Testing
```bash
# Run all tests (including auto-renewal notice period tests)
npm run test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui
```

### Manual Browser Testing
```bash
# Start dev server
npm run dev

# Open http://localhost:5173
# Paste test contracts and verify Red Flags section
```

## Test Requirements

Based on the requirements, the following must be verified:

1. **Apex test contract (120 days)** → Should trigger HIGH flag
2. **Sample contract (60 days)** → Should NOT trigger HIGH flag (should be MEDIUM)
3. **Flag appears in Red Flags** → Alongside other high/medium issues, sorted normally

## Automated Tests

### Test Structure

The tests are located in `src/analysis/contractAnalyzer.test.ts` under the `Auto-Renewal Notice Period Scoring` describe block.

### Test Cases

#### Should Trigger HIGH Flag (>60 days)

1. **120-day notice period** - Flags as HIGH
   - Contract: "at least one hundred twenty (120) days prior"
   - Expected: HIGH severity, message contains "120 days", "easy to miss", "may result in involuntary renewal"

2. **90-day notice period** - Flags as HIGH
   - Contract: "at least ninety (90) days prior"
   - Expected: HIGH severity

3. **3-month notice period** - Flags as HIGH (converts to 90 days)
   - Contract: "at least three (3) months prior"
   - Expected: HIGH severity

4. **Appears in Red Flags** - Verifies HIGH issues appear in Red Flags section

#### Should NOT Trigger HIGH Flag (≤60 days)

1. **60-day notice period** - Should be MEDIUM, not HIGH
   - Contract: "at least sixty (60) days prior"
   - Expected: No HIGH issues, but MEDIUM issue present

2. **30-day notice period** - Should be LOW, not HIGH
   - Contract: "at least thirty (30) days prior"
   - Expected: No HIGH issues, but LOW issue present

3. **1-month notice period** - Should be LOW, not HIGH
   - Contract: "at least one (1) month prior"
   - Expected: No HIGH issues

#### Message Format

1. **Correct message format** - Verifies the message uses the new format:
   - "Auto-renewal notice period is X days — easy to miss, may result in involuntary renewal."
   - Not the old format: "Notice period (X days) exceeds 60 days..."

#### Integration

1. **Sorting with other issues** - Verifies auto-renewal HIGH issues sort correctly with other HIGH issues

## Manual Browser Testing

### Test Case 1: Apex Contract (120 days) - SHOULD TRIGGER HIGH

**Contract:**
```
This Software as a Service Agreement (the "Agreement") is entered into between Customer and Apex Technologies Inc.

Section 3.1 - Term and Renewal: This Agreement shall automatically renew for successive one (1) year periods (each, a "Renewal Term") unless either party provides written notice of non-renewal at least one hundred twenty (120) days prior to the end of the then-current term.
```

**Steps:**
1. Start dev server: `npm run dev`
2. Open http://localhost:5173
3. Paste the contract text above
4. Click "Analyze Contract"

**Expected Results:**
- [ ] Auto-renewal clause is detected (visible in "Auto-Renewal" detail panel)
- [ ] Notice period shows as "120 days" in the Auto-Renewal detail panel
- [ ] **HIGH severity flag appears in "Red Flags & To-Dos" section**
- [ ] Flag message: "Auto-renewal notice period is 120 days — easy to miss, may result in involuntary renewal."
- [ ] Flag has HIGH severity badge (red)
- [ ] Flag appears alongside other high/medium issues, sorted by severity

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

---

### Test Case 2: Sample Contract (60 days) - SHOULD NOT TRIGGER HIGH

**Contract:**
```
This Software as a Service Subscription Agreement (the "Agreement") is entered into as of January 1, 2026 (the "Effective Date") for an initial term of one (1) year (the "Initial Term").

Following the Initial Term, this Agreement shall automatically renew for successive one (1) year periods (each, a "Renewal Term") unless either party provides written notice of non-renewal at least sixty (60) days prior to the end of the then-current term.
```

**Steps:**
1. Paste the contract text above
2. Click "Analyze Contract"

**Expected Results:**
- [ ] Auto-renewal clause is detected (visible in "Auto-Renewal" detail panel)
- [ ] Notice period shows as "60 days" in the Auto-Renewal detail panel
- [ ] **NO HIGH severity flag appears in "Red Flags & To-Dos" for auto-renewal**
- [ ] If a flag appears, it should be MEDIUM severity (not HIGH)
- [ ] MEDIUM flag message: "60 days notice required — negotiate a shorter window if possible."

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

---

### Test Case 3: Edge Case - 90 Days (Should Trigger HIGH)

**Contract:**
```
This Agreement shall automatically renew unless either party provides written notice at least ninety (90) days prior to the end of the term.
```

**Expected Results:**
- [ ] HIGH severity flag appears
- [ ] Message contains "90 days"

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

---

### Test Case 4: Edge Case - 30 Days (Should NOT Trigger HIGH)

**Contract:**
```
This Agreement shall automatically renew unless either party provides written notice at least thirty (30) days prior to the end of the term.
```

**Expected Results:**
- [ ] NO HIGH severity flag appears
- [ ] LOW severity flag appears (if any)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

---

### Test Case 5: Integration - Multiple Issues

**Contract:**
```
This Agreement shall automatically renew unless either party provides written notice at least one hundred twenty (120) days prior to the end of the term.

Provider may increase fees by up to 15% per year without cap.
```

**Expected Results:**
- [ ] Auto-renewal HIGH flag appears
- [ ] Price escalator HIGH flag appears
- [ ] Both flags appear in Red Flags section
- [ ] Flags are sorted by severity (all HIGH issues together)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

---

## Running the Tests

### Option 1: Run All Tests
```bash
npm run test:run
```

**Expected Output:**
```
✓ Auto-Renewal Notice Period Scoring
  ✓ Should Trigger HIGH Flag (>60 days)
    ✓ flags 120-day notice period as HIGH
    ✓ flags 90-day notice period as HIGH
    ✓ flags 3-month notice period as HIGH (90 days)
    ✓ appears in Red Flags section when HIGH
  ✓ Should NOT Trigger HIGH Flag (≤60 days)
    ✓ does not flag 60-day notice period as HIGH (should be MEDIUM)
    ✓ does not flag 30-day notice period as HIGH (should be LOW)
    ✓ does not flag 1-month notice period as HIGH
  ✓ Message Format
    ✓ uses correct message format for HIGH severity
  ✓ Integration with Other Issues
    ✓ sorts auto-renewal HIGH issues correctly with other HIGH issues

Test Files  1 passed (1)
     Tests  X passed (X)
```

### Option 2: Run Tests in Watch Mode
```bash
npm run test
```

### Option 3: Run Tests with UI
```bash
npm run test:ui
```

## Verification Checklist

Before considering the feature complete, verify:

- [ ] All automated tests pass
- [ ] 120-day notice period triggers HIGH flag
- [ ] 60-day notice period does NOT trigger HIGH flag (is MEDIUM)
- [ ] Message format matches: "Auto-renewal notice period is X days — easy to miss, may result in involuntary renewal."
- [ ] Flag appears in Red Flags section (not just in Auto-Renewal detail)
- [ ] Flag sorts correctly with other high/medium issues
- [ ] Browser testing confirms UI behavior matches test expectations

## Troubleshooting

### Issue: Tests pass but browser doesn't show HIGH flag

**Possible Causes:**
1. Notice period not extracted correctly
2. Days conversion failing (e.g., "120 days" not converting to 120)
3. Condition logic issue

**Debug Steps:**
1. Check browser console for errors
2. Verify notice period appears in Auto-Renewal detail panel
3. Check if `noticePeriodToDays()` is working correctly
4. Verify the condition `days > 60` is being evaluated

### Issue: 60 days triggers HIGH when it shouldn't

**Possible Causes:**
1. Condition should be `>` not `>=`
2. Days conversion issue

**Debug Steps:**
1. Check `NOTICE_DAYS_HIGH` constant (should be 60)
2. Verify condition is `days > NOTICE_DAYS_HIGH` (not `>=`)
3. Test with exactly 60 days

### Issue: Message format is wrong

**Possible Causes:**
1. Old message format still in code
2. String interpolation issue

**Debug Steps:**
1. Check `severityConfig.ts` line 270
2. Verify message uses new format
3. Check for typos in message string

## Test Coverage

The automated tests cover:
- ✅ Positive cases (>60 days = HIGH)
- ✅ Negative cases (≤60 days = not HIGH)
- ✅ Edge cases (90 days, 30 days, months conversion)
- ✅ Message format verification
- ✅ Integration with other issues
- ✅ Red Flags section visibility

## Next Steps

After all tests pass:
1. ✅ Feature is ready for production
2. Document any known limitations
3. Monitor for false positives/negatives in production
