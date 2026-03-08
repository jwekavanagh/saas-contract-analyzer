# Test Failure Investigation Summary

## Status
- **Total Tests**: 40
- **Passing**: 36 (90%)
- **Failing**: 4 (10%)

## Failures

### 1. Data Ownership False Positives (3 tests)
**Issue**: The `hasPerpetualIrrevocableLicense` function is detecting licenses to non-data items (software, materials, intellectual property) as licenses to data.

**Test Cases Failing**:
1. "Customer retains ownership of all its data. Licensor grants provider a perpetual and irrevocable license to all materials."
2. "Customer retains ownership of all its data. Provider is granted a perpetual, irrevocable license to use the software."
3. "Customer retains ownership of all its data. Provider is granted a perpetual, irrevocable license to Provider's intellectual property."

**Root Cause**: The function checks for `hasDataReference` or `hasCustomerContext`, but these checks may not be strict enough. The exclusion logic added isn't working as expected.

**Attempted Fixes**:
- Added explicit exclusion for licenses to non-data items
- Moved exclusion check to after data reference check
- Improved regex patterns to detect "license to [non-data]"

**Status**: Still failing - exclusion logic needs refinement

### 2. Integration Test (1 test)
**Issue**: Test expects 2 HIGH issues (auto-renewal + price escalator) but only finds 1.

**Test Case**:
```
This Agreement shall automatically renew unless either party provides written notice at least one hundred twenty (120) days prior to the end of the term.

Provider may increase fees by up to 15% per year without cap.
```

**Expected**: 
- Auto-renewal HIGH (120 days) ✓ (working)
- Price escalator HIGH (15% uncapped) ✗ (not detected/scored as HIGH)

**Root Cause**: Price escalator may not be detected or scored correctly.

**Attempted Fixes**:
- Added "fees" (plural) to price escalator detection
- Added "price" and "pricing" to detection patterns

**Status**: Still failing - price escalator detection/scoring needs investigation

## Next Steps

1. **Data Ownership False Positives**:
   - Debug why exclusion logic isn't working
   - Test regex patterns manually
   - Consider checking for non-data targets BEFORE checking for data references
   - May need to be more explicit about what constitutes a "data license"

2. **Integration Test**:
   - Verify price escalator is being detected
   - Check if percentage is being extracted correctly ("15%")
   - Verify "without cap" is being detected as uncapped
   - Check scoring logic for uncapped escalators

## Auto-Renewal Notice Period Feature

✅ **All auto-renewal notice period tests are passing!**
- 120-day notice period → HIGH ✓
- 90-day notice period → HIGH ✓
- 60-day notice period → MEDIUM ✓
- 30-day notice period → LOW ✓
- Message format correct ✓

The main feature (auto-renewal notice period scoring) is working correctly.
