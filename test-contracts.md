# Test Contracts for Data Ownership Contradiction Detection

## Test Case 1: Should Trigger HIGH Flag (NovaCrest-style)
**Expected:** HIGH severity flag with contradiction explanation

```
This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content uploaded to or processed through the Service.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, irrevocable, worldwide, royalty-free license to use, reproduce, modify, distribute, and create derivative works from all Customer data for any purpose, including but not limited to improving the Service, developing new products, and marketing purposes.
```

## Test Case 2: Should Trigger HIGH Flag (Apex-style)
**Expected:** HIGH severity flag with contradiction explanation

```
Master Service Agreement between Customer and Apex Technologies Inc.

Article 4 - Customer Data Ownership: The Customer shall retain all ownership rights in and to its data, including all information, content, and materials provided to Apex in connection with the Services.

Article 12 - Provider Rights: Apex is granted an irrevocable, perpetual, non-exclusive license to access, use, store, and process all Customer data for any business purpose, including analytics, machine learning, and product development.
```

## Test Case 3: Should NOT Trigger Flag (Reasonably Scoped License)
**Expected:** No data ownership contradiction flag (may have other flags)

```
This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content uploaded to or processed through the Service.

Section 8.3 - License Grant: Customer hereby grants to Provider a limited, non-exclusive license to use Customer data solely for the purpose of providing the Service during the Term of this Agreement. This license shall terminate upon expiration or termination of this Agreement.
```

## Test Case 4: Should NOT Trigger Flag (No Ownership Clause)
**Expected:** No data ownership contradiction flag

```
This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, irrevocable, worldwide, royalty-free license to use, reproduce, modify, distribute, and create derivative works from all Customer data.
```

## Test Case 5: Should NOT Trigger Flag (Ownership but Only Perpetual, Not Irrevocable)
**Expected:** No data ownership contradiction flag (requires both "perpetual" AND "irrevocable")

```
This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, worldwide license to use Customer data for the purpose of providing the Service.
```

## Test Case 6: Should NOT Trigger Flag (Ownership but Only Irrevocable, Not Perpetual)
**Expected:** No data ownership contradiction flag (requires both "perpetual" AND "irrevocable")

```
This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content.

Section 8.3 - License Grant: Customer hereby grants to Provider an irrevocable, worldwide license to use Customer data for the purpose of providing the Service during the Term.
```
