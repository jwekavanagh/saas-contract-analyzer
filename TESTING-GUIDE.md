# Complete Testing Guide - Data Ownership Contradiction Detection

## Overview

This guide covers all testing approaches for the data ownership contradiction detection feature, from automated unit tests to manual browser testing.

## Quick Start

### Automated Testing
```bash
# Install dependencies (if not already done)
npm install

# Run all tests
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
# Use BROWSER-TEST-CHECKLIST.md for step-by-step testing
```

## Test Structure

### 1. Automated Unit Tests (`src/analysis/contractAnalyzer.test.ts`)

**Coverage:**
- ✅ Positive tests (should trigger HIGH flag): 4 cases
- ✅ Negative tests (should not trigger): 5 cases
- ✅ Edge cases: 9 cases
- ✅ Integration tests: 2 cases

**Test Categories:**

#### Should Trigger HIGH Flag
1. NovaCrest-style contradiction
2. Apex-style contradiction (reversed word order)
3. Clauses in different sections
4. Alternative phrasing ("owns" instead of "retains ownership")

#### Should NOT Trigger Flag
1. Reasonably scoped license
2. No ownership clause
3. Only perpetual (not irrevocable)
4. Only irrevocable (not perpetual)
5. License for different subject matter

#### Edge Cases
1. Clauses split across sentences
2. Multiple ownership clauses
3. Multiple license clauses
4. "Information" instead of "data"
5. "Content" instead of "data"
6. "Customer's data" phrasing
7. "its data" phrasing
8. "Grant" instead of "license"
9. "Rights" instead of "license"

#### Integration Tests
1. Sorting by severity
2. Red Flags section visibility

### 2. Manual Browser Testing (`BROWSER-TEST-CHECKLIST.md`)

**12 test cases** covering:
- All automated test scenarios
- UI/UX verification
- Real-world contract variations
- Integration with other features

## Running Tests

### Option 1: Automated Tests Only

```bash
npm run test:run
```

**Expected Output:**
```
✓ Should Trigger HIGH Flag (4 tests)
  ✓ detects NovaCrest-style contradiction
  ✓ detects Apex-style contradiction
  ✓ detects contradiction when clauses are in different sections
  ✓ detects ownership with "owns" instead of "retains ownership"

✓ Should NOT Trigger Flag (5 tests)
  ✓ does not flag reasonably scoped license
  ✓ does not flag when no ownership clause exists
  ...

Test Files  1 passed (1)
     Tests  20 passed (20)
```

### Option 2: Browser Testing Only

1. Start dev server: `npm run dev`
2. Open http://localhost:5173
3. Follow `BROWSER-TEST-CHECKLIST.md`
4. Check each test case manually

### Option 3: Both (Recommended)

1. Run automated tests: `npm run test:run`
2. Fix any failures
3. Run browser tests: `npm run dev` + follow checklist
4. Verify UI behavior matches test expectations

## Test Files Reference

| File | Purpose |
|------|---------|
| `src/analysis/contractAnalyzer.test.ts` | Automated unit tests |
| `BROWSER-TEST-CHECKLIST.md` | Manual browser testing checklist |
| `test-contracts.md` | All test contract examples |
| `run-tests.sh` / `run-tests.bat` | Test runner scripts |
| `vitest.config.ts` | Test configuration |

## Interpreting Test Results

### Automated Tests

**Passing Test:**
```
✓ detects NovaCrest-style contradiction
```
✅ Feature works as expected

**Failing Test:**
```
✗ detects NovaCrest-style contradiction
  Expected: 1
  Received: 0
```
❌ Feature not detecting correctly - needs investigation

### Browser Tests

**Checklist Item:**
- [x] HIGH severity flag appears
- [x] Flag reason is correct
- [ ] Flag shows both clauses

✅ = Pass, ❌ = Fail, ⚠️ = Needs attention

## Common Issues & Solutions

### Issue: Tests fail with "Cannot find module"

**Solution:**
```bash
npm install
npm install -D vitest @vitest/ui
```

### Issue: Tests pass but browser doesn't show flag

**Possible Causes:**
1. Sentence splitting issue - clause split across sentences
2. Pattern matching too strict - unusual phrasing not matched
3. UI filtering - check Red Flags section, not detail views

**Debug:**
1. Check browser console for errors
2. Verify contract text matches test cases exactly
3. Check if clauses are in same sentence

### Issue: False positives (flag appears when it shouldn't)

**Possible Causes:**
1. Pattern too broad - matches unintended text
2. Context missing - doesn't check for data-specific license

**Debug:**
1. Review detected clauses in issue details
2. Check if both "perpetual" AND "irrevocable" are present
3. Verify ownership clause actually mentions data

## Adding New Test Cases

### For Automated Tests

Add to `src/analysis/contractAnalyzer.test.ts`:

```typescript
it('describes the test case', () => {
  const contract = `Your test contract text here`;
  
  const result = analyzeContract(contract);
  const dataOwnershipIssues = result.issues.filter(
    issue => issue.category === 'data_ownership' && issue.severity === 'high'
  );
  
  expect(dataOwnershipIssues.length).toBeGreaterThan(0); // or .toBe(0) for negative test
});
```

### For Browser Tests

Add to `BROWSER-TEST-CHECKLIST.md`:

```markdown
## Test Case X: Description

**Contract:**
\`\`\`
Your test contract text
\`\`\`

**Expected Results:**
- [ ] Expected behavior 1
- [ ] Expected behavior 2

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________
```

## Continuous Integration

To add tests to CI/CD:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm run test:run
```

## Test Coverage Goals

- ✅ **Unit Tests:** 20+ test cases covering all scenarios
- ✅ **Edge Cases:** 9+ edge cases tested
- ✅ **Integration:** 2+ integration tests
- ✅ **Manual Testing:** 12+ browser test cases

## Next Steps After Testing

1. **If all tests pass:**
   - ✅ Feature is ready for production
   - Document any known limitations
   - Monitor for false positives/negatives in production

2. **If tests fail:**
   - Review failure messages
   - Check pattern matching logic
   - Update detection functions if needed
   - Re-run tests

3. **If edge cases found:**
   - Add new test cases
   - Update detection patterns
   - Document edge case behavior

## Support

For issues or questions:
1. Check test output for specific error messages
2. Review `TESTING-ASSESSMENT.md` for known limitations
3. Check browser console for runtime errors
4. Review detection patterns in `contractAnalyzer.ts`
