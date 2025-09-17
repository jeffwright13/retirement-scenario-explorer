/**
 * Scenario Builder Service - Converts between form data and JSON schema
 * Provides validation, smart defaults, and template management
 */

export class ScenarioBuilderService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();
    console.log('🏗️ ScenarioBuilderService created');
  }

  setupEventListeners() {
    this.eventBus.on('scenario-builder:validate-form', (formData) => {
      const validation = this.validateFormData(formData);
      this.eventBus.emit('scenario-builder:validation-result', validation);
    });

    this.eventBus.on('scenario-builder:convert-to-json', (formData) => {
      try {
        const jsonScenario = this.convertFormToJson(formData);
        this.eventBus.emit('scenario-builder:json-ready', jsonScenario);
      } catch (error) {
        this.eventBus.emit('scenario-builder:conversion-error', { error: error.message });
      }
    });

    this.eventBus.on('scenario-builder:load-template', (templateName) => {
      const template = this.getTemplate(templateName);
      this.eventBus.emit('scenario-builder:template-loaded', template);
    });
  }

  /**
   * Get available scenario templates
   */
  getTemplates() {
    return {
      'simple-retirement': {
        name: 'Simple Retirement',
        description: 'Basic retirement with one investment account',
        icon: '🏠',
        formData: {
          title: 'My Retirement Plan',
          description: 'Simple retirement scenario',
          monthlyExpenses: 5000,
          durationYears: 30,
          inflationRate: 3,
          assets: [{
            name: 'Investment Portfolio',
            type: 'taxable',
            balance: 1000000,
            returnRate: 7,
            order: 1
          }],
          income: []
        }
      },
      'social-security': {
        name: 'With Social Security',
        description: 'Retirement plan including Social Security benefits',
        icon: '🏛️',
        formData: {
          title: 'Retirement with Social Security',
          description: 'Retirement scenario with Social Security starting at age 67',
          monthlyExpenses: 6000,
          durationYears: 30,
          inflationRate: 3,
          assets: [{
            name: 'Investment Portfolio',
            type: 'taxable',
            balance: 800000,
            returnRate: 7,
            order: 1
          }],
          income: [{
            name: 'Social Security',
            amount: 2500,
            startMonth: 84 // 7 years * 12 months
          }]
        }
      },
      'multiple-accounts': {
        name: 'Multiple Accounts',
        description: 'Complex scenario with 401k, IRA, and taxable accounts',
        icon: '📊',
        formData: {
          title: 'Multi-Account Strategy',
          description: 'Strategic withdrawal from multiple account types',
          monthlyExpenses: 7000,
          durationYears: 30,
          inflationRate: 3,
          assets: [
            {
              name: '401k',
              type: 'tax_deferred',
              balance: 600000,
              returnRate: 7,
              order: 1
            },
            {
              name: 'Roth IRA',
              type: 'tax_free',
              balance: 300000,
              returnRate: 7,
              order: 2
            },
            {
              name: 'Taxable Investments',
              type: 'taxable',
              balance: 400000,
              returnRate: 6,
              order: 3
            }
          ],
          income: [{
            name: 'Social Security',
            amount: 2800,
            startMonth: 84
          }]
        }
      }
    };
  }

  /**
   * Get specific template
   */
  getTemplate(templateName) {
    const templates = this.getTemplates();
    return templates[templateName] || null;
  }

  /**
   * Validate form data
   */
  validateFormData(formData) {
    const errors = [];
    const warnings = [];

    // Basic validation
    if (!formData.title || formData.title.trim() === '') {
      errors.push('Scenario title is required');
    }

    if (!formData.monthlyExpenses || formData.monthlyExpenses <= 0) {
      errors.push('Monthly expenses must be greater than 0');
    }

    if (!formData.durationYears || formData.durationYears <= 0) {
      errors.push('Duration must be greater than 0 years');
    }

    if (!formData.assets || formData.assets.length === 0) {
      errors.push('At least one asset account is required');
    }

    // Asset validation
    if (formData.assets) {
      formData.assets.forEach((asset, index) => {
        if (!asset.name || asset.name.trim() === '') {
          errors.push(`Asset ${index + 1}: Name is required`);
        }
        if (asset.balance === undefined || asset.balance === null) {
          errors.push(`Asset ${index + 1}: Balance is required`);
        }
        if (asset.returnRate < 0 || asset.returnRate > 50) {
          warnings.push(`Asset ${index + 1}: Return rate ${asset.returnRate}% seems unusual`);
        }
      });
    }

    // Income validation
    if (formData.income) {
      formData.income.forEach((income, index) => {
        if (!income.name || income.name.trim() === '') {
          errors.push(`Income ${index + 1}: Name is required`);
        }
        if (!income.amount || income.amount <= 0) {
          errors.push(`Income ${index + 1}: Amount must be greater than 0`);
        }
      });
    }

    // Financial logic warnings
    const totalAssets = formData.assets?.reduce((sum, asset) => sum + (asset.balance || 0), 0) || 0;
    const annualExpenses = (formData.monthlyExpenses || 0) * 12;
    const withdrawalRate = totalAssets > 0 ? (annualExpenses / totalAssets) * 100 : 0;

    if (withdrawalRate > 4) {
      warnings.push(`Withdrawal rate of ${withdrawalRate.toFixed(1)}% is above the recommended 4% rule`);
    }

    // Allow high withdrawal rates - users can create scenarios for testing purposes
    if (withdrawalRate > 15) {
      warnings.push(`Withdrawal rate of ${withdrawalRate.toFixed(1)}% is very high - scenario may deplete quickly`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      withdrawalRate: withdrawalRate.toFixed(1)
    };
  }

  /**
   * Convert form data to JSON schema format
   */
  convertFormToJson(formData) {
    const scenario = {
      metadata: {
        title: formData.title || 'Custom Scenario',
        description: formData.description || 'Created with Scenario Builder',
        tags: ['custom']
      },
      plan: {
        monthly_expenses: formData.monthlyExpenses,
        duration_months: formData.durationYears * 12,
        stop_on_shortfall: formData.stopOnShortfall !== false
      },
      assets: [],
      income: formData.income || [],
      order: [],
      rate_schedules: {}
    };

    // Add inflation if specified
    if (formData.inflationRate && formData.inflationRate > 0) {
      scenario.plan.inflation_rate = formData.inflationRate / 100;
    }

    // Add tax configuration
    if (formData.taxDeferredRate !== undefined || formData.taxableRate !== undefined || formData.taxFreeRate !== undefined) {
      scenario.plan.tax_config = {
        tax_deferred: (formData.taxDeferredRate || 22) / 100,
        taxable: (formData.taxableRate || 15) / 100,
        tax_free: (formData.taxFreeRate || 0) / 100
      };
    }

    // Create rate schedules using standard names that work with Monte Carlo variable ranges
    if (formData.assets && formData.assets.length > 0) {
      formData.assets.forEach(asset => {
        let scheduleKey;
        
        // Map asset types to standard rate schedule names used by Monte Carlo system
        const assetType = asset.type?.toLowerCase() || 'investment';
        const assetName = asset.name?.toLowerCase() || '';
        
        if (assetName.includes('ira') && !assetName.includes('roth')) {
          scheduleKey = 'ira_growth';
        } else if (assetName.includes('roth')) {
          scheduleKey = 'roth_growth';
        } else if (assetName.includes('savings') || assetType === 'savings') {
          scheduleKey = 'savings_growth';
        } else {
          // Default to investment_growth for stocks, bonds, and general investments
          scheduleKey = 'investment_growth';
        }
        
        // If schedule already exists, create unique variant
        if (scenario.rate_schedules[scheduleKey]) {
          scheduleKey = `${asset.name.toLowerCase().replace(/\s+/g, '_')}_growth`;
        }
        
        scenario.rate_schedules[scheduleKey] = {
          type: 'fixed',
          rate: asset.returnRate / 100 || 0
        };

        const jsonAsset = {
          name: asset.name,
          type: asset.type || 'taxable',
          balance: asset.balance,
          compounding: 'monthly',
          return_schedule: scheduleKey,
          market_dependent: asset.marketDependent !== undefined ? asset.marketDependent : this.getMarketDependency(asset),
          investment_type: asset.investmentType || 'mixed'
        };

        if (asset.returnRate) {
          jsonAsset.interest_rate = asset.returnRate / 100;
        } else {
          jsonAsset.interest_rate = 0;
        }

        if (asset.minBalance) {
          jsonAsset.min_balance = asset.minBalance;
        }

        if (asset.startMonth) {
          jsonAsset.start_month = asset.startMonth;
        }

        scenario.assets.push(jsonAsset);

        // Add to withdrawal order
        scenario.order.push({
          account: asset.name,
          order: asset.order || 1,
          weight: asset.weight
        });
      });
    }

    // Convert income
    if (formData.income) {
      scenario.income = formData.income.map(income => ({
        name: income.name,
        amount: income.amount,
        start_month: income.startMonth || 1,
        ...(income.stopMonth && { stop_month: income.stopMonth })
      }));
    }

    console.log('🏗️ ScenarioBuilderService: Converted form data to scenario JSON:', scenario);
    console.log('🏗️ Assets in scenario:', scenario.assets.map(a => `${a.name} (market_dependent: ${a.market_dependent})`));
    console.log('🏗️ Rate schedules created:', Object.keys(scenario.rate_schedules));
    return scenario;
  }

  /**
   * Determine if an asset should be subject to market volatility in Monte Carlo analysis
   */
  getMarketDependency(asset) {
    // Check if explicitly set by user
    if (asset.marketDependent !== undefined) {
      return asset.marketDependent;
    }

    // Use investment type if available
    if (asset.investmentType) {
      const investmentType = asset.investmentType.toLowerCase();
      
      // Stable investment types
      const STABLE_INVESTMENT_TYPES = ['savings', 'cd', 'money_market'];
      if (STABLE_INVESTMENT_TYPES.includes(investmentType)) {
        return false;
      }
      
      // Market-dependent investment types
      const MARKET_DEPENDENT_TYPES = ['stocks', 'bonds', 'mixed', 'real_estate'];
      if (MARKET_DEPENDENT_TYPES.includes(investmentType)) {
        return true;
      }
    }

    // Fallback to legacy keyword matching for backward compatibility
    const assetName = asset.name?.toLowerCase() || '';
    const STABLE_KEYWORDS = ['savings', 'cash', 'cd', 'certificate', 'money market'];
    const MARKET_DEPENDENT_KEYWORDS = ['stock', 'equity', 'investment', 'mutual', 'etf', 'reit', 'bond'];

    if (STABLE_KEYWORDS.some(keyword => assetName.includes(keyword))) {
      return false;
    }

    if (MARKET_DEPENDENT_KEYWORDS.some(keyword => assetName.includes(keyword))) {
      return true;
    }

    // Default: assume market-dependent for unknown types (conservative approach)
    return true;
  }

  /**
   * Convert JSON scenario to form data
   */
  convertJsonToForm(jsonScenario) {
    const formData = {
      title: jsonScenario.title || jsonScenario.metadata?.title || '',
      description: jsonScenario.description || jsonScenario.metadata?.description || '',
      monthlyExpenses: jsonScenario.plan?.monthly_expenses || 0,
      durationYears: Math.round((jsonScenario.plan?.duration_months || 360) / 12),
      inflationRate: (jsonScenario.plan?.inflation_rate || 0) * 100,
      stopOnShortfall: jsonScenario.plan?.stop_on_shortfall !== false,
      assets: [],
      income: []
    };

    // Convert assets
    if (jsonScenario.assets) {
      const orderMap = new Map();
      if (jsonScenario.order) {
        jsonScenario.order.forEach(order => {
          orderMap.set(order.account, { order: order.order, weight: order.weight });
        });
      }

      formData.assets = jsonScenario.assets.map((asset, index) => {
        const orderInfo = orderMap.get(asset.name) || { order: index + 1 };
        return {
          name: asset.name,
          type: asset.type || 'taxable',
          balance: asset.balance || 0,
          returnRate: (asset.interest_rate || 0) * 100,
          minBalance: asset.min_balance || 0,
          startMonth: asset.start_month || 0,
          order: orderInfo.order,
          weight: orderInfo.weight
        };
      });
    }

    // Convert income
    if (jsonScenario.income) {
      formData.income = jsonScenario.income.map(income => ({
        name: income.name,
        amount: income.amount,
        startMonth: income.start_month || 1,
        stopMonth: income.stop_month
      }));
    }

    return formData;
  }

  /**
   * Generate smart defaults based on partial form data
   */
  generateSmartDefaults(partialFormData) {
    const defaults = {
      durationYears: 30,
      inflationRate: 3,
      stopOnShortfall: true,
      assets: [{
        name: 'Investment Portfolio',
        type: 'taxable',
        balance: 1000000,
        returnRate: 7,
        order: 1
      }]
    };

    // Adjust defaults based on provided data
    if (partialFormData.monthlyExpenses) {
      // Suggest portfolio size based on 4% rule
      const suggestedPortfolio = (partialFormData.monthlyExpenses * 12) / 0.04;
      defaults.assets[0].balance = Math.round(suggestedPortfolio / 10000) * 10000; // Round to nearest 10k
    }

    return { ...defaults, ...partialFormData };
  }
}
