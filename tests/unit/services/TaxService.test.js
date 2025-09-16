/**
 * Tax Service Unit Tests
 * Tests tax calculations for different account types and scenarios
 */

import { TaxService } from '../../../scripts/services/TaxService.js';

describe('TaxService', () => {
  let taxService;

  beforeEach(() => {
    taxService = new TaxService({
      tax_deferred: 0.22,  // 22% for traditional 401k/IRA
      taxable: 0.15,       // 15% capital gains
      tax_free: 0.0        // 0% for Roth
    });
  });

  describe('calculateGrossWithdrawal', () => {
    test('tax-free account requires no additional withdrawal', () => {
      const result = taxService.calculateGrossWithdrawal(1000, 'tax_free');
      
      expect(result.grossWithdrawal).toBe(1000);
      expect(result.netAmount).toBe(1000);
      expect(result.taxOwed).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
      expect(result.accountType).toBe('tax_free');
    });

    test('tax-deferred account requires additional withdrawal for taxes', () => {
      const result = taxService.calculateGrossWithdrawal(1000, 'tax_deferred');
      
      // Need to withdraw 1000 / (1 - 0.22) = 1282.05
      expect(result.grossWithdrawal).toBeCloseTo(1282.05, 2);
      expect(result.netAmount).toBe(1000);
      expect(result.taxOwed).toBeCloseTo(282.05, 2);
      expect(result.effectiveTaxRate).toBe(0.22);
      expect(result.accountType).toBe('tax_deferred');
    });

    test('taxable account with capital gains tax', () => {
      const result = taxService.calculateGrossWithdrawal(1000, 'taxable');
      
      // Need to withdraw 1000 / (1 - 0.15) = 1176.47
      expect(result.grossWithdrawal).toBeCloseTo(1176.47, 2);
      expect(result.netAmount).toBe(1000);
      expect(result.taxOwed).toBeCloseTo(176.47, 2);
      expect(result.effectiveTaxRate).toBe(0.15);
      expect(result.accountType).toBe('taxable');
    });

    test('unknown account type defaults to zero tax', () => {
      const result = taxService.calculateGrossWithdrawal(1000, 'unknown');
      
      expect(result.grossWithdrawal).toBe(1000);
      expect(result.netAmount).toBe(1000);
      expect(result.taxOwed).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
    });
  });

  describe('calculateTaxOnWithdrawal', () => {
    test('calculates tax on gross withdrawal from tax-deferred account', () => {
      const result = taxService.calculateTaxOnWithdrawal(1000, 'tax_deferred');
      
      expect(result.grossWithdrawal).toBe(1000);
      expect(result.taxOwed).toBe(220); // 22% of 1000
      expect(result.netAmount).toBe(780);
      expect(result.effectiveTaxRate).toBe(0.22);
    });

    test('calculates tax on gross withdrawal from taxable account', () => {
      const result = taxService.calculateTaxOnWithdrawal(1000, 'taxable');
      
      expect(result.grossWithdrawal).toBe(1000);
      expect(result.taxOwed).toBe(150); // 15% of 1000
      expect(result.netAmount).toBe(850);
      expect(result.effectiveTaxRate).toBe(0.15);
    });

    test('no tax on Roth withdrawals', () => {
      const result = taxService.calculateTaxOnWithdrawal(1000, 'tax_free');
      
      expect(result.grossWithdrawal).toBe(1000);
      expect(result.taxOwed).toBe(0);
      expect(result.netAmount).toBe(1000);
      expect(result.effectiveTaxRate).toBe(0);
    });
  });

  describe('calculateBlendedTaxRate', () => {
    test('calculates weighted average tax rate across multiple withdrawals', () => {
      const withdrawals = [
        { amount: 1000, accountType: 'tax_deferred' }, // 22% tax
        { amount: 500, accountType: 'taxable' },       // 15% tax
        { amount: 300, accountType: 'tax_free' }       // 0% tax
      ];
      
      const blendedRate = taxService.calculateBlendedTaxRate(withdrawals);
      
      // Expected: (1000*0.22 + 500*0.15 + 300*0) / 1800 = 295/1800 = 0.1639
      expect(blendedRate).toBeCloseTo(0.1639, 4);
    });

    test('returns zero for empty withdrawals', () => {
      expect(taxService.calculateBlendedTaxRate([])).toBe(0);
      expect(taxService.calculateBlendedTaxRate(null)).toBe(0);
    });

    test('handles single withdrawal', () => {
      const withdrawals = [{ amount: 1000, accountType: 'tax_deferred' }];
      const blendedRate = taxService.calculateBlendedTaxRate(withdrawals);
      
      expect(blendedRate).toBe(0.22);
    });
  });

  describe('updateTaxConfig', () => {
    test('updates tax rates', () => {
      taxService.updateTaxConfig({ tax_deferred: 0.25, taxable: 0.20 });
      
      const config = taxService.getTaxConfig();
      expect(config.tax_deferred).toBe(0.25);
      expect(config.taxable).toBe(0.20);
      expect(config.tax_free).toBe(0.0); // Should remain unchanged
    });

    test('partial updates preserve existing rates', () => {
      taxService.updateTaxConfig({ tax_deferred: 0.30 });
      
      const config = taxService.getTaxConfig();
      expect(config.tax_deferred).toBe(0.30);
      expect(config.taxable).toBe(0.15); // Original value preserved
      expect(config.tax_free).toBe(0.0);
    });
  });

  describe('validateTaxConfig', () => {
    test('validates correct tax configuration', () => {
      const config = {
        tax_deferred: 0.22,
        taxable: 0.15,
        tax_free: 0.0
      };
      
      const result = TaxService.validateTaxConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects invalid account types', () => {
      const config = {
        invalid_type: 0.22,
        tax_deferred: 0.15
      };
      
      const result = TaxService.validateTaxConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid account type: invalid_type');
    });

    test('rejects invalid tax rates', () => {
      const config = {
        tax_deferred: 1.5,  // > 1
        taxable: -0.1,      // < 0
        tax_free: 'invalid' // not a number
      };
      
      const result = TaxService.validateTaxConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('rejects tax rates at boundaries', () => {
      const config = {
        tax_deferred: 1.0,  // exactly 1 should be invalid (100% tax)
        taxable: 0.99       // valid
      };
      
      const result = TaxService.validateTaxConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid tax rate for tax_deferred: 1. Must be between 0 and 1.');
    });
  });

  describe('real-world scenarios', () => {
    test('high earner with 32% marginal rate', () => {
      const highEarnerTax = new TaxService({ tax_deferred: 0.32 });
      const result = highEarnerTax.calculateGrossWithdrawal(5000, 'tax_deferred');
      
      // Need 5000 / (1 - 0.32) = 7352.94
      expect(result.grossWithdrawal).toBeCloseTo(7352.94, 2);
      expect(result.taxOwed).toBeCloseTo(2352.94, 2);
    });

    test('retiree with low capital gains rate', () => {
      const retireeTax = new TaxService({ taxable: 0.0 }); // 0% capital gains for low income
      const result = retireeTax.calculateGrossWithdrawal(3000, 'taxable');
      
      expect(result.grossWithdrawal).toBe(3000);
      expect(result.taxOwed).toBe(0);
    });

    test('mixed withdrawal strategy', () => {
      // Withdraw from Roth first (tax-free), then taxable, then tax-deferred
      const rothResult = taxService.calculateGrossWithdrawal(2000, 'tax_free');
      const taxableResult = taxService.calculateGrossWithdrawal(1500, 'taxable');
      const deferredResult = taxService.calculateGrossWithdrawal(1000, 'tax_deferred');
      
      const totalGross = rothResult.grossWithdrawal + taxableResult.grossWithdrawal + deferredResult.grossWithdrawal;
      const totalNet = rothResult.netAmount + taxableResult.netAmount + deferredResult.netAmount;
      const totalTax = rothResult.taxOwed + taxableResult.taxOwed + deferredResult.taxOwed;
      
      expect(totalNet).toBe(4500); // Target net amount
      // Roth: 0 tax, Taxable: 1500/(1-0.15) = 1764.71 (264.71 tax), Deferred: 1000/(1-0.22) = 1282.05 (282.05 tax)
      expect(totalTax).toBeCloseTo(546.76, 2); // 264.71 + 282.05
      expect(totalGross).toBeCloseTo(5046.76, 2); // 2000 + 1764.71 + 1282.05
    });
  });

  describe('edge cases', () => {
    test('handles zero withdrawal amounts', () => {
      const result = taxService.calculateGrossWithdrawal(0, 'tax_deferred');
      
      expect(result.grossWithdrawal).toBe(0);
      expect(result.netAmount).toBe(0);
      expect(result.taxOwed).toBe(0);
    });

    test('handles very small amounts', () => {
      const result = taxService.calculateGrossWithdrawal(0.01, 'tax_deferred');
      
      expect(result.grossWithdrawal).toBeCloseTo(0.0128, 4);
      expect(result.netAmount).toBe(0.01);
      expect(result.taxOwed).toBeCloseTo(0.0028, 4);
    });

    test('handles very large amounts', () => {
      const result = taxService.calculateGrossWithdrawal(1000000, 'tax_deferred');
      
      expect(result.grossWithdrawal).toBeCloseTo(1282051.28, 2);
      expect(result.netAmount).toBe(1000000);
      expect(result.taxOwed).toBeCloseTo(282051.28, 2);
    });
  });
});
