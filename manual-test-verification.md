# Manual Test Verification Results

## Test Case 1: NovaCrest-style (SHOULD TRIGGER HIGH)

**Contract:**
```
Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content uploaded to or processed through the Service.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, irrevocable, worldwide, royalty-free license to use, reproduce, modify, distribute, and create derivative works from all Customer data for any purpose...
```

**Expected Detection:**
- ✅ `hasDataOwnershipLanguage()` should match: "Customer retains ownership" + "data"
- ✅ `hasPerpetualIrrevocableLicense()` should match: "perpetual" + "irrevocable" + "license" + "data"
- ✅ Should create HIGH severity issue

**Verification:**
- Ownership pattern: `/customer\s+(retains?|shall\s+retain|owns?|shall\s+own)\s+(all\s+)?ownership/i` matches "Customer retains ownership"
- License check: Has "perpetual" ✓, Has "irrevocable" ✓, Has "license" ✓, Has "data" ✓
- Result: **SHOULD TRIGGER** ✓

---

## Test Case 2: Apex-style (SHOULD TRIGGER HIGH)

**Contract:**
```
Article 4 - Customer Data Ownership: The Customer shall retain all ownership rights in and to its data...

Article 12 - Provider Rights: Apex is granted an irrevocable, perpetual, non-exclusive license to access, use, store, and process all Customer data...
```

**Expected Detection:**
- ✅ `hasDataOwnershipLanguage()` should match: "Customer shall retain" + "ownership" + "data"
- ✅ `hasPerpetualIrrevocableLicense()` should match: "irrevocable" + "perpetual" + "license" + "data" (order doesn't matter)
- ✅ Should create HIGH severity issue

**Verification:**
- Ownership pattern: `/customer\s+(retains?|shall\s+retain|owns?|shall\s+own)\s+(all\s+)?ownership/i` matches "Customer shall retain...ownership"
- License check: Has "perpetual" ✓, Has "irrevocable" ✓, Has "license" ✓, Has "data" ✓
- Result: **SHOULD TRIGGER** ✓

---

## Test Case 3: Reasonably Scoped License (SHOULD NOT TRIGGER)

**Contract:**
```
Section 5.1 - Data Ownership: Customer retains ownership of all its data...

Section 8.3 - License Grant: Customer hereby grants to Provider a limited, non-exclusive license to use Customer data solely for the purpose of providing the Service during the Term...
```

**Expected Detection:**
- ✅ `hasDataOwnershipLanguage()` should match: "Customer retains ownership" + "data"
- ❌ `hasPerpetualIrrevocableLicense()` should NOT match (no "perpetual" or "irrevocable")
- ✅ `isReasonablyScopedLicense()` should match: "during the Term"
- ❌ Should NOT create data ownership issue

**Verification:**
- Ownership: Matches ✓
- License: Missing "perpetual" ✗, Missing "irrevocable" ✗
- Result: **SHOULD NOT TRIGGER** ✓

---

## Test Case 4: No Ownership Clause (SHOULD NOT TRIGGER)

**Contract:**
```
Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, irrevocable, worldwide, royalty-free license to use Customer data...
```

**Expected Detection:**
- ❌ `hasDataOwnershipLanguage()` should NOT match (no ownership statement)
- ✅ `hasPerpetualIrrevocableLicense()` should match
- ❌ Should NOT create data ownership issue (needs both ownership AND license)

**Verification:**
- Ownership: No ownership keyword ✗
- License: Matches ✓
- Result: **SHOULD NOT TRIGGER** ✓ (needs both)

---

## Test Case 5: Only Perpetual (SHOULD NOT TRIGGER)

**Contract:**
```
Section 5.1 - Data Ownership: Customer retains ownership of all its data...

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, worldwide license to use Customer data...
```

**Expected Detection:**
- ✅ `hasDataOwnershipLanguage()` should match
- ❌ `hasPerpetualIrrevocableLicense()` should NOT match (has "perpetual" but missing "irrevocable")
- ❌ Should NOT create data ownership issue

**Verification:**
- Ownership: Matches ✓
- License: Has "perpetual" ✓, Missing "irrevocable" ✗
- Result: **SHOULD NOT TRIGGER** ✓ (requires BOTH perpetual AND irrevocable)

---

## Test Case 6: Only Irrevocable (SHOULD NOT TRIGGER)

**Contract:**
```
Section 5.1 - Data Ownership: Customer retains ownership of all its data...

Section 8.3 - License Grant: Customer hereby grants to Provider an irrevocable, worldwide license to use Customer data during the Term...
```

**Expected Detection:**
- ✅ `hasDataOwnershipLanguage()` should match
- ❌ `hasPerpetualIrrevocableLicense()` should NOT match (has "irrevocable" but missing "perpetual")
- ❌ Should NOT create data ownership issue

**Verification:**
- Ownership: Matches ✓
- License: Missing "perpetual" ✗, Has "irrevocable" ✓
- Result: **SHOULD NOT TRIGGER** ✓ (requires BOTH perpetual AND irrevocable)

---

## Summary

All test cases pass logic verification:
- ✅ Test 1: Triggers (ownership + perpetual irrevocable)
- ✅ Test 2: Triggers (ownership + perpetual irrevocable, reversed order)
- ✅ Test 3: Does not trigger (reasonably scoped license)
- ✅ Test 4: Does not trigger (no ownership clause)
- ✅ Test 5: Does not trigger (only perpetual)
- ✅ Test 6: Does not trigger (only irrevocable)

**Next Step:** Test in browser UI by running `npm run dev` and pasting each contract.
