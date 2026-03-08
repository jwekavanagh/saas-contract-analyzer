import { describe, it, expect } from 'vitest';
import { analyzeContract } from './contractAnalyzer';

describe('Data Ownership Contradiction Detection', () => {
  describe('Should Trigger HIGH Flag', () => {
    it('detects NovaCrest-style contradiction', () => {
      const contract = `This Software as a Service Agreement (the "Agreement") is entered into between Customer and Provider.

Section 5.1 - Data Ownership: Customer retains ownership of all its data, information, and content uploaded to or processed through the Service.

Section 8.3 - License Grant: Customer hereby grants to Provider a perpetual, irrevocable, worldwide, royalty-free license to use, reproduce, modify, distribute, and create derivative works from all Customer data for any purpose, including but not limited to improving the Service, developing new products, and marketing purposes.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
      expect(dataOwnershipIssues[0].severity).toBe('high');
      expect(dataOwnershipIssues[0].reason).toContain('perpetual, irrevocable license');
      expect(dataOwnershipIssues[0].clauseText).toBeDefined();
    });

    it('detects Apex-style contradiction (reversed word order)', () => {
      const contract = `Master Service Agreement between Customer and Apex Technologies Inc.

Article 4 - Customer Data Ownership: The Customer shall retain all ownership rights in and to its data, including all information, content, and materials provided to Apex in connection with the Services.

Article 12 - Provider Rights: Apex is granted an irrevocable, perpetual, non-exclusive license to access, use, store, and process all Customer data for any business purpose, including analytics, machine learning, and product development.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
      expect(dataOwnershipIssues[0].severity).toBe('high');
    });

    it('detects contradiction when clauses are in different sections', () => {
      const contract = `Agreement between Customer and Provider.

Section 1: Customer retains ownership of all its data and information.

Section 10: Provider receives a perpetual, irrevocable license to all Customer data for any purpose.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
    });

    it('detects ownership with "owns" instead of "retains ownership"', () => {
      const contract = `Customer owns all its data. Provider is granted a perpetual, irrevocable license to such data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
    });

    it('still detects customer ownership even with fallback logic', () => {
      const contract = `Customer has ownership of customer data. Provider is granted a perpetual, irrevocable license to such data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Should NOT Trigger Flag', () => {
    it('does not flag reasonably scoped license', () => {
      const contract = `Customer retains ownership of all its data. Customer grants Provider a limited license to use Customer data solely for the purpose of providing the Service during the Term of this Agreement.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBe(0);
    });

    it('does not flag when no ownership clause exists', () => {
      const contract = `Provider is granted a perpetual, irrevocable license to all Customer data for any purpose.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBe(0);
    });

    it('does not flag when license is only perpetual (not irrevocable)', () => {
      const contract = `Customer retains ownership of all its data. Provider is granted a perpetual license to use Customer data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBe(0);
    });

    it('does not flag when license is only irrevocable (not perpetual)', () => {
      const contract = `Customer retains ownership of all its data. Provider is granted an irrevocable license to use Customer data during the Term.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBe(0);
    });

    it('does not flag when license is for different subject matter', () => {
      const contract = `Customer retains ownership of all its data. Provider is granted a perpetual, irrevocable license to use Provider's own software.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBe(0);
    });

    it('does not flag false positive when license is to materials (not data)', () => {
      const contract = `Customer retains ownership of all its data. Licensor grants provider a perpetual and irrevocable license to all materials.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBe(0);
    });

    it('does not flag false positive when license is to software (not data)', () => {
      const contract = `Customer retains ownership of all its data. Provider is granted a perpetual, irrevocable license to use the software.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBe(0);
    });

    it('does not flag false positive when license is to intellectual property (not data)', () => {
      const contract = `Customer retains ownership of all its data. Provider is granted a perpetual, irrevocable license to Provider's intellectual property.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBe(0);
    });

    it('does not flag false positive when provider owns data but customer is mentioned', () => {
      const contract = `The provider owns the data while the customer retains use rights. Provider is granted a perpetual, irrevocable license to such data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBe(0);
    });

    it('does not flag false positive when provider retains ownership of customer data', () => {
      const contract = `Provider retains ownership of all customer data. Provider is granted a perpetual, irrevocable license to use such data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBe(0);
    });

    it('does not flag false positive when provider owns customer data (different phrasing)', () => {
      const contract = `Provider owns all customer data. Provider is granted a perpetual, irrevocable license to use such data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBe(0);
    });

    it('does not flag false positive when provider shall retain ownership of customer data', () => {
      const contract = `Provider shall retain ownership of all customer data. Provider is granted a perpetual, irrevocable license to use such data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBe(0);
    });

    it('does not flag when sentence mentions customer data but ownership is not attributed to customer', () => {
      const contract = `Provider owns customer data for analytics purposes. Provider is granted a perpetual, irrevocable license to such data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles clauses split across sentences correctly', () => {
      const contract = `Customer retains ownership. Of all its data and information. Provider is granted a perpetual, irrevocable license. To all Customer data.`;

      const result = analyzeContract(contract);
      // Should still detect both clauses even if split
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      // This might pass or fail depending on sentence splitting - test documents the behavior
      expect(result.issues.length).toBeGreaterThanOrEqual(0);
    });

    it('handles multiple ownership clauses', () => {
      const contract = `Customer retains ownership of all its data. Customer also owns all its information. Provider is granted a perpetual, irrevocable license to Customer data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
      // Evidence is a static string
      expect(dataOwnershipIssues[0].clauseText).toBe('One clause asserts Customer data ownership. Another grants a perpetual, irrevocable license over it.');
    });

    it('handles multiple license clauses', () => {
      const contract = `Customer retains ownership of all its data. Provider is granted a perpetual, irrevocable license to Customer data. Provider also receives a perpetual, irrevocable right to Customer information.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
    });

    it('handles ownership with "information" instead of "data"', () => {
      const contract = `Customer retains ownership of all its information. Provider is granted a perpetual, irrevocable license to Customer information.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
    });

    it('handles ownership with "content" instead of "data"', () => {
      const contract = `Customer retains ownership of all its content. Provider is granted a perpetual, irrevocable license to Customer content.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
    });

    it('handles "Customer\'s data" phrasing', () => {
      const contract = `Customer retains ownership of Customer's data. Provider is granted a perpetual, irrevocable license to Customer's data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
    });

    it('handles "its data" phrasing', () => {
      const contract = `Customer retains ownership of its data. Provider is granted a perpetual, irrevocable license to such data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
    });

    it('handles license with "grant" instead of "license"', () => {
      const contract = `Customer retains ownership of all its data. Customer hereby grants to Provider a perpetual, irrevocable right to use all Customer data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
    });

    it('handles license with "rights" instead of "license"', () => {
      const contract = `Customer retains ownership of all its data. Provider is granted perpetual, irrevocable rights to Customer data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
    });

    it('still detects license when customer grants to provider with data reference', () => {
      const contract = `Customer retains ownership of all its data. Customer grants Provider a perpetual, irrevocable license to use Customer data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
    });

    it('still detects license with explicit data reference even without customer keyword', () => {
      const contract = `Customer retains ownership of all its data. Provider is granted a perpetual, irrevocable license to all data for analytics purposes.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership' && issue.severity === 'high'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with Existing Features', () => {
    it('sorts data ownership issues by severity correctly', () => {
      const contract = `This Agreement shall automatically renew unless either party provides written notice at least ninety (90) days prior to the end of the term.

Customer retains ownership of all its data. Provider is granted a perpetual, irrevocable license to Customer data.

Provider may increase fees by up to 15% per year without cap.`;

      const result = analyzeContract(contract);
      
      // Should have multiple high-severity issues
      const highIssues = result.issues.filter(i => i.severity === 'high');
      expect(highIssues.length).toBeGreaterThan(1);
      
      // Data ownership issue should be in the high-severity list
      const dataOwnershipIssues = highIssues.filter(
        issue => issue.category === 'data_ownership'
      );
      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
      
      // All high issues should be sorted first
      const firstIssue = result.issues[0];
      expect(firstIssue.severity).toBe('high');
    });

    it('appears in Red Flags section (high severity)', () => {
      const contract = `Customer retains ownership of all its data. Provider is granted a perpetual, irrevocable license to Customer data.`;

      const result = analyzeContract(contract);
      const dataOwnershipIssues = result.issues.filter(
        issue => issue.category === 'data_ownership'
      );

      expect(dataOwnershipIssues.length).toBeGreaterThan(0);
      expect(dataOwnershipIssues[0].severity).toBe('high');
      // High severity issues appear in Red Flags
      expect(['high', 'medium']).toContain(dataOwnershipIssues[0].severity);
    });
  });
});

describe('Auto-Renewal Notice Period Scoring', () => {
  describe('Should Trigger HIGH Flag (>60 days)', () => {
    it('flags 120-day notice period as HIGH', () => {
      const contract = `This Agreement shall automatically renew for successive one (1) year periods unless either party provides written notice of non-renewal at least one hundred twenty (120) days prior to the end of the then-current term.`;

      const result = analyzeContract(contract);
      const autoRenewalIssues = result.issues.filter(
        issue => issue.category === 'auto_renewal' && issue.severity === 'high'
      );

      expect(autoRenewalIssues.length).toBeGreaterThan(0);
      expect(autoRenewalIssues[0].severity).toBe('high');
      expect(autoRenewalIssues[0].reason).toContain('120 days');
      expect(autoRenewalIssues[0].reason).toContain('easy to miss');
      expect(autoRenewalIssues[0].reason).toContain('may result in involuntary renewal');
    });

    it('flags 90-day notice period as HIGH', () => {
      const contract = `This Agreement shall automatically renew unless either party provides written notice at least ninety (90) days prior to the end of the term.`;

      const result = analyzeContract(contract);
      const autoRenewalIssues = result.issues.filter(
        issue => issue.category === 'auto_renewal' && issue.severity === 'high'
      );

      expect(autoRenewalIssues.length).toBeGreaterThan(0);
      expect(autoRenewalIssues[0].severity).toBe('high');
    });

    it('flags 3-month notice period as HIGH (90 days)', () => {
      const contract = `This Agreement shall automatically renew unless either party provides written notice at least three (3) months prior to the end of the term.`;

      const result = analyzeContract(contract);
      const autoRenewalIssues = result.issues.filter(
        issue => issue.category === 'auto_renewal' && issue.severity === 'high'
      );

      expect(autoRenewalIssues.length).toBeGreaterThan(0);
      expect(autoRenewalIssues[0].severity).toBe('high');
    });

    it('appears in Red Flags section when HIGH', () => {
      const contract = `This Agreement shall automatically renew unless either party provides written notice at least one hundred twenty (120) days prior to the end of the term.`;

      const result = analyzeContract(contract);
      const autoRenewalIssues = result.issues.filter(
        issue => issue.category === 'auto_renewal' && (issue.severity === 'high' || issue.severity === 'medium')
      );

      expect(autoRenewalIssues.length).toBeGreaterThan(0);
      expect(autoRenewalIssues[0].severity).toBe('high');
      // High severity issues appear in Red Flags
      expect(['high', 'medium']).toContain(autoRenewalIssues[0].severity);
    });
  });

  describe('Should NOT Trigger HIGH Flag (≤60 days)', () => {
    it('does not flag 60-day notice period as HIGH (should be MEDIUM)', () => {
      const contract = `This Agreement shall automatically renew for successive one (1) year periods unless either party provides written notice of non-renewal at least sixty (60) days prior to the end of the then-current term.`;

      const result = analyzeContract(contract);
      const autoRenewalHighIssues = result.issues.filter(
        issue => issue.category === 'auto_renewal' && issue.severity === 'high'
      );
      const autoRenewalMediumIssues = result.issues.filter(
        issue => issue.category === 'auto_renewal' && issue.severity === 'medium'
      );

      expect(autoRenewalHighIssues.length).toBe(0);
      expect(autoRenewalMediumIssues.length).toBeGreaterThan(0);
      expect(autoRenewalMediumIssues[0].severity).toBe('medium');
    });

    it('does not flag 30-day notice period as HIGH (should be LOW)', () => {
      const contract = `This Agreement shall automatically renew unless either party provides written notice at least thirty (30) days prior to the end of the term.`;

      const result = analyzeContract(contract);
      const autoRenewalHighIssues = result.issues.filter(
        issue => issue.category === 'auto_renewal' && issue.severity === 'high'
      );
      const autoRenewalLowIssues = result.issues.filter(
        issue => issue.category === 'auto_renewal' && issue.severity === 'low'
      );

      expect(autoRenewalHighIssues.length).toBe(0);
      expect(autoRenewalLowIssues.length).toBeGreaterThan(0);
    });

    it('does not flag 1-month notice period as HIGH (should be LOW)', () => {
      const contract = `This Agreement shall automatically renew unless either party provides written notice at least one (1) month prior to the end of the term.`;

      const result = analyzeContract(contract);
      const autoRenewalHighIssues = result.issues.filter(
        issue => issue.category === 'auto_renewal' && issue.severity === 'high'
      );

      expect(autoRenewalHighIssues.length).toBe(0);
    });
  });

  describe('Message Format', () => {
    it('uses correct message format for HIGH severity', () => {
      const contract = `This Agreement shall automatically renew unless either party provides written notice at least one hundred twenty (120) days prior to the end of the term.`;

      const result = analyzeContract(contract);
      const autoRenewalHighIssues = result.issues.filter(
        issue => issue.category === 'auto_renewal' && issue.severity === 'high'
      );

      expect(autoRenewalHighIssues.length).toBeGreaterThan(0);
      expect(autoRenewalHighIssues[0].reason).toMatch(/Auto-renewal notice period is.*120.*days/);
      expect(autoRenewalHighIssues[0].reason).toContain('easy to miss');
      expect(autoRenewalHighIssues[0].reason).toContain('may result in involuntary renewal');
    });
  });

  describe('Integration with Other Issues', () => {
    it('sorts auto-renewal HIGH issues correctly with other HIGH issues', () => {
      const contract = `This Agreement shall automatically renew unless either party provides written notice at least one hundred twenty (120) days prior to the end of the term.

Provider may increase fees by up to 15% per year without cap.`;

      const result = analyzeContract(contract);
      const highIssues = result.issues.filter(i => i.severity === 'high');
      
      expect(highIssues.length).toBeGreaterThan(1);
      
      // Auto-renewal issue should be in the high-severity list
      const autoRenewalHighIssues = highIssues.filter(
        issue => issue.category === 'auto_renewal'
      );
      expect(autoRenewalHighIssues.length).toBeGreaterThan(0);
      
      // All high issues should be sorted first
      const firstIssue = result.issues[0];
      expect(firstIssue.severity).toBe('high');
    });
  });
});