/**
 * Quick test script for data ownership contradiction detection
 * Run with: node test-ownership-detection.js
 */

// Import the analyzer (note: this requires building or using ts-node)
// For now, this is a manual verification script

const testContracts = {
  shouldTrigger: [
    {
      name: "NovaCrest-style (should trigger HIGH)",
      text: `This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content uploaded to or processed through the Service.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, irrevocable, worldwide, royalty-free license to use, reproduce, modify, distribute, and create derivative works from all Customer data for any purpose, including but not limited to improving the Service, developing new products, and marketing purposes.`
    },
    {
      name: "Apex-style (should trigger HIGH)",
      text: `Master Service Agreement between Customer and Apex Technologies Inc.

Article 4 - Customer Data Ownership: The Customer shall retain all ownership rights in and to its data, including all information, content, and materials provided to Apex in connection with the Services.

Article 12 - Provider Rights: Apex is granted an irrevocable, perpetual, non-exclusive license to access, use, store, and process all Customer data for any business purpose, including analytics, machine learning, and product development.`
    }
  ],
  shouldNotTrigger: [
    {
      name: "Reasonably scoped license (should NOT trigger)",
      text: `This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content uploaded to or processed through the Service.

Section 8.3 - License Grant: Customer hereby grants to Provider a limited, non-exclusive license to use Customer data solely for the purpose of providing the Service during the Term of this Agreement. This license shall terminate upon expiration or termination of this Agreement.`
    },
    {
      name: "No ownership clause (should NOT trigger)",
      text: `This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, irrevocable, worldwide, royalty-free license to use, reproduce, modify, distribute, and create derivative works from all Customer data.`
    },
    {
      name: "Only perpetual, not irrevocable (should NOT trigger)",
      text: `This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, worldwide license to use Customer data for the purpose of providing the Service.`
    }
  ]
};

console.log("=".repeat(60));
console.log("Data Ownership Contradiction Detection - Test Cases");
console.log("=".repeat(60));
console.log("\nTo test manually:");
console.log("1. Run: npm run dev");
console.log("2. Open http://localhost:5173");
console.log("3. Paste each test contract and verify results");
console.log("\nExpected Results:");
console.log("\n✅ SHOULD TRIGGER HIGH FLAG:");
testContracts.shouldTrigger.forEach((test, i) => {
  console.log(`  ${i + 1}. ${test.name}`);
});
console.log("\n❌ SHOULD NOT TRIGGER FLAG:");
testContracts.shouldNotTrigger.forEach((test, i) => {
  console.log(`  ${i + 1}. ${test.name}`);
});
console.log("\n" + "=".repeat(60));
console.log("\nTest contracts are also available in test-contracts.md");
console.log("=".repeat(60));
