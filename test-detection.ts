/**
 * Test script for data ownership contradiction detection
 * Run with: npx tsx test-detection.ts
 * Or compile and run: npx tsc test-detection.ts && node test-detection.js
 */

import { analyzeContract } from './src/analysis/contractAnalyzer';

interface TestCase {
  name: string;
  contract: string;
  shouldTrigger: boolean;
  description: string;
}

const testCases: TestCase[] = [
  {
    name: "NovaCrest-style (should trigger HIGH)",
    contract: `This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content uploaded to or processed through the Service.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, irrevocable, worldwide, royalty-free license to use, reproduce, modify, distribute, and create derivative works from all Customer data for any purpose, including but not limited to improving the Service, developing new products, and marketing purposes.`,
    shouldTrigger: true,
    description: "Has ownership clause + perpetual irrevocable license"
  },
  {
    name: "Apex-style (should trigger HIGH)",
    contract: `Master Service Agreement between Customer and Apex Technologies Inc.

Article 4 - Customer Data Ownership: The Customer shall retain all ownership rights in and to its data, including all information, content, and materials provided to Apex in connection with the Services.

Article 12 - Provider Rights: Apex is granted an irrevocable, perpetual, non-exclusive license to access, use, store, and process all Customer data for any business purpose, including analytics, machine learning, and product development.`,
    shouldTrigger: true,
    description: "Has ownership clause + perpetual irrevocable license (reversed order)"
  },
  {
    name: "Reasonably scoped license (should NOT trigger)",
    contract: `This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content uploaded to or processed through the Service.

Section 8.3 - License Grant: Customer hereby grants to Provider a limited, non-exclusive license to use Customer data solely for the purpose of providing the Service during the Term of this Agreement. This license shall terminate upon expiration or termination of this Agreement.`,
    shouldTrigger: false,
    description: "Has ownership clause but only reasonably scoped license"
  },
  {
    name: "No ownership clause (should NOT trigger)",
    contract: `This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, irrevocable, worldwide, royalty-free license to use, reproduce, modify, distribute, and create derivative works from all Customer data.`,
    shouldTrigger: false,
    description: "Has perpetual irrevocable license but no ownership clause"
  },
  {
    name: "Only perpetual, not irrevocable (should NOT trigger)",
    contract: `This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, worldwide license to use Customer data for the purpose of providing the Service.`,
    shouldTrigger: false,
    description: "Has ownership + perpetual license but NOT irrevocable"
  },
  {
    name: "Only irrevocable, not perpetual (should NOT trigger)",
    contract: `This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content.

Section 8.3 - License Grant: Customer hereby grants to Provider an irrevocable, worldwide license to use Customer data for the purpose of providing the Service during the Term.`,
    shouldTrigger: false,
    description: "Has ownership + irrevocable license but NOT perpetual"
  }
];

function runTests() {
  console.log("=".repeat(70));
  console.log("Data Ownership Contradiction Detection - Test Suite");
  console.log("=".repeat(70));
  console.log();

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    console.log(`Description: ${testCase.description}`);
    
    try {
      const result = analyzeContract(testCase.contract);
      
      // Check for data ownership contradiction issues
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === "data_ownership" && issue.severity === "high"
      );
      
      const triggered = dataOwnershipIssues.length > 0;
      const expected = testCase.shouldTrigger;
      
      if (triggered === expected) {
        console.log(`✅ PASS: ${triggered ? "Flag triggered (as expected)" : "No flag (as expected)"}`);
        if (triggered) {
          console.log(`   Reason: ${dataOwnershipIssues[0].reason}`);
          if (dataOwnershipIssues[0].clauseText) {
            console.log(`   Clauses: ${dataOwnershipIssues[0].clauseText.substring(0, 100)}...`);
          }
        }
        passed++;
      } else {
        console.log(`❌ FAIL: Expected ${expected ? "flag to trigger" : "no flag"}, but got ${triggered ? "flag triggered" : "no flag"}`);
        if (triggered) {
          console.log(`   Found issue: ${dataOwnershipIssues[0].reason}`);
        } else {
          console.log(`   No data ownership issues found. Total issues: ${result.issues.length}`);
        }
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
    
    console.log();
  }

  console.log("=".repeat(70));
  console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
  console.log("=".repeat(70));
  
  return failed === 0;
}

// Run tests
const success = runTests();
process.exit(success ? 0 : 1);
