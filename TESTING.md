# Testing Data Ownership Contradiction Detection

## Manual Testing (Recommended)

### Step 1: Start the Development Server
```bash
npm run dev
```

### Step 2: Test Each Contract

1. **Open the app** in your browser (usually `http://localhost:5173`)

2. **For each test case** in `test-contracts.md`:
   - Copy the contract text
   - Paste it into the contract input field
   - Click "Analyze Contract"
   - Check the "Red Flags & To-Dos" section

### Expected Results

#### ✅ Should Trigger HIGH Flag:
- **Test Case 1** (NovaCrest-style): Should show HIGH flag with message: "Contract states Customer owns its data but grants Provider a perpetual, irrevocable license over it — these may conflict. Review with counsel."
- **Test Case 2** (Apex-style): Same as above

#### ❌ Should NOT Trigger Flag:
- **Test Case 3** (Reasonably scoped): No data ownership contradiction flag
- **Test Case 4** (No ownership clause): No data ownership contradiction flag
- **Test Case 5** (Only perpetual): No data ownership contradiction flag
- **Test Case 6** (Only irrevocable): No data ownership contradiction flag

### Verification Checklist

- [ ] Test Case 1 triggers HIGH flag in Red Flags section
- [ ] Test Case 2 triggers HIGH flag in Red Flags section
- [ ] Test Case 3 does NOT trigger data ownership flag
- [ ] Test Case 4 does NOT trigger data ownership flag
- [ ] Test Case 5 does NOT trigger data ownership flag
- [ ] Test Case 6 does NOT trigger data ownership flag
- [ ] HIGH flags appear sorted by severity (high → medium → low)
- [ ] Flag reason is clear and actionable
- [ ] Both ownership and license clauses are shown in clauseText

## Automated Testing (Optional)

If you want to add automated tests, you can create a test file using a testing framework like Vitest:

```bash
npm install -D vitest @vitest/ui
```

Then create `src/analysis/contractAnalyzer.test.ts` with test cases.
