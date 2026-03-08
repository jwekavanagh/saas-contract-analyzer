# Browser Testing Checklist - Data Ownership Contradiction Detection

## Pre-Testing Setup

- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Run `npm run dev` to start the development server
- [ ] Open http://localhost:5173 in your browser
- [ ] Verify the app loads without errors

## Test Case 1: NovaCrest-style (SHOULD TRIGGER HIGH)

**Contract:**
```
This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content uploaded to or processed through the Service.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, irrevocable, worldwide, royalty-free license to use, reproduce, modify, distribute, and create derivative works from all Customer data for any purpose, including but not limited to improving the Service, developing new products, and marketing purposes.
```

**Expected Results:**
- [ ] HIGH severity flag appears in "Red Flags & To-Dos" section
- [ ] Flag reason: "Contract states Customer owns its data but grants Provider a perpetual, irrevocable license over it — these may conflict. Review with counsel."
- [ ] Flag shows both ownership and license clauses
- [ ] Flag appears with HIGH severity badge
- [ ] Flag is sorted correctly (high severity issues appear first)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

---

## Test Case 2: Apex-style (SHOULD TRIGGER HIGH)

**Contract:**
```
Master Service Agreement between Customer and Apex Technologies Inc.

Article 4 - Customer Data Ownership: The Customer shall retain all ownership rights in and to its data, including all information, content, and materials provided to Apex in connection with the Services.

Article 12 - Provider Rights: Apex is granted an irrevocable, perpetual, non-exclusive license to access, use, store, and process all Customer data for any business purpose, including analytics, machine learning, and product development.
```

**Expected Results:**
- [ ] HIGH severity flag appears
- [ ] Flag reason contains "perpetual, irrevocable license"
- [ ] Both clauses are shown

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

---

## Test Case 3: Reasonably Scoped License (SHOULD NOT TRIGGER)

**Contract:**
```
This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content uploaded to or processed through the Service.

Section 8.3 - License Grant: Customer hereby grants to Provider a limited, non-exclusive license to use Customer data solely for the purpose of providing the Service during the Term of this Agreement. This license shall terminate upon expiration or termination of this Agreement.
```

**Expected Results:**
- [ ] NO data ownership contradiction flag appears
- [ ] Other flags (if any) may appear, but not data ownership contradiction

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

---

## Test Case 4: No Ownership Clause (SHOULD NOT TRIGGER)

**Contract:**
```
This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, irrevocable, worldwide, royalty-free license to use, reproduce, modify, distribute, and create derivative works from all Customer data.
```

**Expected Results:**
- [ ] NO data ownership contradiction flag appears
- [ ] (Requires both ownership AND license to trigger)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

---

## Test Case 5: Only Perpetual (SHOULD NOT TRIGGER)

**Contract:**
```
This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, worldwide license to use Customer data for the purpose of providing the Service.
```

**Expected Results:**
- [ ] NO data ownership contradiction flag appears
- [ ] (Requires BOTH "perpetual" AND "irrevocable")

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

---

## Test Case 6: Only Irrevocable (SHOULD NOT TRIGGER)

**Contract:**
```
This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content.

Section 8.3 - License Grant: Customer hereby grants to Provider an irrevocable, worldwide license to use Customer data for the purpose of providing the Service during the Term.
```

**Expected Results:**
- [ ] NO data ownership contradiction flag appears
- [ ] (Requires BOTH "perpetual" AND "irrevocable")

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

---

## Edge Case Testing

### Test Case 7: Clauses in Different Sections

**Contract:**
```
Agreement between Customer and Provider.

Section 1: Customer retains ownership of all its data and information.

Section 10: Provider receives a perpetual, irrevocable license to all Customer data for any purpose.
```

**Expected Results:**
- [ ] HIGH flag appears (clauses can be in different sections)

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

### Test Case 8: Alternative Phrasing - "owns" instead of "retains ownership"

**Contract:**
```
Customer owns all its data. Provider is granted a perpetual, irrevocable license to such data.
```

**Expected Results:**
- [ ] HIGH flag appears

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

### Test Case 9: "Information" instead of "data"

**Contract:**
```
Customer retains ownership of all its information. Provider is granted a perpetual, irrevocable license to Customer information.
```

**Expected Results:**
- [ ] HIGH flag appears

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

### Test Case 10: "Content" instead of "data"

**Contract:**
```
Customer retains ownership of all its content. Provider is granted a perpetual, irrevocable license to Customer content.
```

**Expected Results:**
- [ ] HIGH flag appears

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

### Test Case 11: "Grant" instead of "license"

**Contract:**
```
Customer retains ownership of all its data. Customer hereby grants to Provider a perpetual, irrevocable right to use all Customer data.
```

**Expected Results:**
- [ ] HIGH flag appears

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

---

## Integration Testing

### Test Case 12: Multiple High-Severity Issues

**Contract:**
```
This Agreement shall automatically renew unless either party provides written notice at least ninety (90) days prior to the end of the term.

Customer retains ownership of all its data. Provider is granted a perpetual, irrevocable license to Customer data.

Provider may increase fees by up to 15% per year without cap.
```

**Expected Results:**
- [ ] Data ownership flag appears
- [ ] Auto-renewal flag appears (90 days notice)
- [ ] Price escalator flag appears (uncapped 15%)
- [ ] All flags are HIGH severity
- [ ] Flags are sorted correctly (all high severity issues together)
- [ ] Data ownership flag is visible in Red Flags section

**Actual Results:**
- [ ] Pass / [ ] Fail
- Notes: _________________________________________________

---

## UI/UX Verification

- [ ] Flag appears in "Red Flags & To-Dos" section (not just in detail views)
- [ ] Severity badge is clearly visible and correctly colored
- [ ] Reason text is readable and actionable
- [ ] Clause text shows both ownership and license clauses
- [ ] Flag is clickable/expandable if there's more detail
- [ ] Flag appears in correct severity order (high before medium before low)

---

## Summary

**Total Test Cases:** 12
**Passed:** _____
**Failed:** _____
**Notes:** _________________________________________________

**Overall Assessment:**
- [ ] All tests pass - Ready for production
- [ ] Some tests fail - Needs fixes
- [ ] Critical issues found - Needs major revision
