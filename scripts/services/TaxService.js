/**
 * Tax Service - Handles tax calculations for retirement account withdrawals
 * Supports different account types and configurable tax rates
 */

export class TaxService {
  constructor(taxConfig = {}) {
    this.taxConfig = {
      // Default tax rates by account type
      tax_deferred: 0.22, // 22% marginal tax rate for traditional 401k/IRA
      taxable: 0.15,      // 15% capital gains rate for taxable accounts
      tax_free: 0.0,      // 0% for Roth IRA/401k
      
      // Override with user-provided config
      ...taxConfig
    };
  }

  /**
   * Calculate the gross withdrawal needed to net a specific amount after taxes
   * @param {number} netAmountNeeded - The after-tax amount needed for expenses
   * @param {string} accountType - 'tax_deferred', 'taxable', or 'tax_free'
   * @param {Object} options - Additional options for tax calculation
   * @returns {Object} - { grossWithdrawal, netAmount, taxOwed, effectiveTaxRate }
   */
  calculateGrossWithdrawal(netAmountNeeded, accountType, options = {}) {
    const taxRate = this.getTaxRate(accountType, options);
    
    if (taxRate === 0) {
      // Tax-free account - no additional withdrawal needed
      return {
        grossWithdrawal: netAmountNeeded,
        netAmount: netAmountNeeded,
        taxOwed: 0,
        effectiveTaxRate: 0,
        accountType
      };
    }

    // Calculate gross withdrawal needed: net / (1 - tax_rate)
    const grossWithdrawal = netAmountNeeded / (1 - taxRate);
    const taxOwed = grossWithdrawal - netAmountNeeded;

    return {
      grossWithdrawal,
      netAmount: netAmountNeeded,
      taxOwed,
      effectiveTaxRate: taxRate,
      accountType
    };
  }

  /**
   * Calculate taxes owed on a gross withdrawal amount
   * @param {number} grossWithdrawal - The total amount withdrawn
   * @param {string} accountType - Account type
   * @param {Object} options - Additional options
   * @returns {Object} - Tax calculation details
   */
  calculateTaxOnWithdrawal(grossWithdrawal, accountType, options = {}) {
    const taxRate = this.getTaxRate(accountType, options);
    const taxOwed = grossWithdrawal * taxRate;
    const netAmount = grossWithdrawal - taxOwed;

    return {
      grossWithdrawal,
      netAmount,
      taxOwed,
      effectiveTaxRate: taxRate,
      accountType
    };
  }

  /**
   * Get the applicable tax rate for an account type
   * @param {string} accountType - Account type
   * @param {Object} options - Additional options (future: income-based rates, state taxes)
   * @returns {number} - Tax rate as decimal (0.22 = 22%)
   */
  getTaxRate(accountType, options = {}) {
    // Future enhancement: could consider total income, state taxes, etc.
    return this.taxConfig[accountType] || 0;
  }

  /**
   * Update tax configuration
   * @param {Object} newConfig - New tax rates by account type
   */
  updateTaxConfig(newConfig) {
    this.taxConfig = { ...this.taxConfig, ...newConfig };
  }

  /**
   * Get current tax configuration
   * @returns {Object} - Current tax rates
   */
  getTaxConfig() {
    return { ...this.taxConfig };
  }

  /**
   * Calculate blended tax rate for multiple account withdrawals
   * @param {Array} withdrawals - Array of {amount, accountType} objects
   * @returns {number} - Weighted average tax rate
   */
  calculateBlendedTaxRate(withdrawals) {
    if (!withdrawals || withdrawals.length === 0) return 0;

    let totalAmount = 0;
    let totalTaxes = 0;

    for (const withdrawal of withdrawals) {
      const taxCalc = this.calculateTaxOnWithdrawal(withdrawal.amount, withdrawal.accountType);
      totalAmount += withdrawal.amount;
      totalTaxes += taxCalc.taxOwed;
    }

    return totalAmount > 0 ? totalTaxes / totalAmount : 0;
  }

  /**
   * Validate tax configuration
   * @param {Object} config - Tax configuration to validate
   * @returns {Object} - { isValid, errors }
   */
  static validateTaxConfig(config) {
    const errors = [];
    const validAccountTypes = ['tax_deferred', 'taxable', 'tax_free'];

    for (const [accountType, rate] of Object.entries(config)) {
      if (!validAccountTypes.includes(accountType)) {
        errors.push(`Invalid account type: ${accountType}`);
      }
      
      if (typeof rate !== 'number' || rate < 0 || rate >= 1) {
        errors.push(`Invalid tax rate for ${accountType}: ${rate}. Must be between 0 and 1.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Default tax service instance with standard rates
export const defaultTaxService = new TaxService();
