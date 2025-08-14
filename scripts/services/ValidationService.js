/**
 * Validation Service - Centralized data validation logic
 * Handles scenario validation, story validation, and data integrity checks
 */
export class ValidationService {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Validate scenario data comprehensively
   * @param {Object} scenarioData - Scenario to validate
   * @returns {Object} Validation result with errors and warnings
   */
  validateScenario(scenarioData) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Basic structure validation
    this.validateScenarioStructure(scenarioData, result);
    
    // Plan validation
    this.validatePlan(scenarioData.plan, result);
    
    // Assets validation
    this.validateAssets(scenarioData.assets, result);
    
    // Business logic validation
    this.validateBusinessLogic(scenarioData, result);

    result.isValid = result.errors.length === 0;
    
    // Emit validation event
    this.eventBus.emit('validation:scenario-completed', {
      scenarioData,
      result
    });

    return result;
  }

  /**
   * Validate basic scenario structure
   * @param {Object} scenarioData - Scenario data
   * @param {Object} result - Validation result object
   */
  validateScenarioStructure(scenarioData, result) {
    if (!scenarioData || typeof scenarioData !== 'object') {
      result.errors.push('Scenario data must be a valid object');
      return;
    }

    // Required top-level properties
    const requiredProps = ['plan', 'assets'];
    requiredProps.forEach(prop => {
      if (!(prop in scenarioData)) {
        result.errors.push(`Missing required property: "${prop}"`);
      }
    });

    // Optional but recommended properties
    if (!scenarioData.title) {
      result.warnings.push('Scenario should have a title for better identification');
    }

    if (!scenarioData.description) {
      result.warnings.push('Scenario should have a description for clarity');
    }
  }

  /**
   * Validate plan section
   * @param {Object} plan - Plan data
   * @param {Object} result - Validation result object
   */
  validatePlan(plan, result) {
    if (!plan || typeof plan !== 'object') {
      result.errors.push('Plan section must be a valid object');
      return;
    }

    // Monthly expenses validation
    if (!('monthly_expenses' in plan)) {
      result.errors.push('Plan must include "monthly_expenses"');
    } else {
      const expenses = plan.monthly_expenses;
      if (typeof expenses !== 'number') {
        result.errors.push('Monthly expenses must be a number');
      } else {
        if (expenses <= 0) {
          result.errors.push('Monthly expenses must be greater than 0');
        } else if (expenses < 1000) {
          result.warnings.push('Monthly expenses seem unusually low (< $1,000)');
        } else if (expenses > 50000) {
          result.warnings.push('Monthly expenses seem unusually high (> $50,000)');
        }
      }
    }

    // Retirement age validation
    if ('retirement_age' in plan) {
      const age = plan.retirement_age;
      if (typeof age !== 'number') {
        result.warnings.push('Retirement age should be a number');
      } else if (age < 50 || age > 80) {
        result.warnings.push('Retirement age seems unusual (should be 50-80)');
      }
    }

    // Life expectancy validation
    if ('life_expectancy' in plan) {
      const lifeExp = plan.life_expectancy;
      if (typeof lifeExp !== 'number') {
        result.warnings.push('Life expectancy should be a number');
      } else if (lifeExp < 70 || lifeExp > 110) {
        result.warnings.push('Life expectancy seems unusual (should be 70-110)');
      }
    }
  }

  /**
   * Validate assets array
   * @param {Array} assets - Assets array
   * @param {Object} result - Validation result object
   */
  validateAssets(assets, result) {
    if (!Array.isArray(assets)) {
      result.errors.push('Assets must be an array');
      return;
    }

    if (assets.length === 0) {
      result.warnings.push('No assets defined - simulation may not be meaningful');
      return;
    }

    assets.forEach((asset, index) => {
      this.validateAsset(asset, index, result);
    });

    // Check for reasonable total asset value
    const totalValue = assets.reduce((sum, asset) => 
      sum + (asset.initial_value ?? asset.balance ?? 0), 0
    );

    if (totalValue === 0) {
      result.warnings.push('Total asset value is $0 - simulation may not be meaningful');
    } else if (totalValue < 10000) {
      result.warnings.push('Total asset value seems low for retirement planning');
    }
  }

  /**
   * Validate individual asset
   * @param {Object} asset - Asset object
   * @param {number} index - Asset index
   * @param {Object} result - Validation result object
   */
  validateAsset(asset, index, result) {
    const assetPrefix = `Asset ${index + 1}`;

    if (!asset || typeof asset !== 'object') {
      result.errors.push(`${assetPrefix}: Must be a valid object`);
      return;
    }

    // Value validation - support both 'initial_value' and 'balance' properties
    const assetValue = asset.initial_value ?? asset.balance;
    if (assetValue === undefined || assetValue === null) {
      result.errors.push(`${assetPrefix}: Missing asset value (expected "initial_value" or "balance")`);
    } else {
      const value = assetValue;
      if (typeof value !== 'number') {
        result.errors.push(`${assetPrefix}: Initial value must be a number`);
      } else if (value < 0) {
        result.errors.push(`${assetPrefix}: Initial value cannot be negative`);
      }
    }

    // Asset type validation
    if ('type' in asset) {
      const validTypes = ['401k', 'ira', 'roth_ira', 'savings', 'investment', 'pension', 'social_security'];
      if (!validTypes.includes(asset.type)) {
        result.warnings.push(`${assetPrefix}: Unknown asset type "${asset.type}"`);
      }
    } else {
      result.suggestions.push(`${assetPrefix}: Consider adding an asset type for better categorization`);
    }

    // Growth rate validation
    if ('annual_growth_rate' in asset) {
      const rate = asset.annual_growth_rate;
      if (typeof rate !== 'number') {
        result.warnings.push(`${assetPrefix}: Growth rate should be a number`);
      } else {
        if (rate < -0.5 || rate > 0.5) {
          result.warnings.push(`${assetPrefix}: Growth rate seems extreme (${(rate * 100).toFixed(1)}%)`);
        }
      }
    }

    // Min balance validation (emergency fund)
    if ('min_balance' in asset) {
      const minBalance = asset.min_balance;
      if (typeof minBalance !== 'number') {
        result.errors.push(`${assetPrefix}: min_balance must be a number`);
      } else if (minBalance < 0) {
        result.errors.push(`${assetPrefix}: min_balance cannot be negative`);
      } else {
        const assetValue = asset.initial_value ?? asset.balance ?? 0;
        if (minBalance > assetValue) {
          result.errors.push(`${assetPrefix}: min_balance ($${minBalance.toLocaleString()}) cannot exceed asset balance ($${assetValue.toLocaleString()})`);
        } else if (minBalance > 0) {
          const availableBalance = assetValue - minBalance;
          result.suggestions.push(`${assetPrefix}: Emergency fund of $${minBalance.toLocaleString()} reserved, $${availableBalance.toLocaleString()} available for withdrawal`);
        }
      }
    }

    // Name validation
    if (!asset.name) {
      result.suggestions.push(`${assetPrefix}: Consider adding a name for better identification`);
    }
  }

  /**
   * Validate business logic and relationships
   * @param {Object} scenarioData - Complete scenario data
   * @param {Object} result - Validation result object
   */
  validateBusinessLogic(scenarioData, result) {
    const { plan, assets } = scenarioData;

    if (!plan || !assets) return; // Already handled in structure validation

    // Check if assets can support expenses
    const totalAssets = assets.reduce((sum, asset) => sum + (asset.initial_value ?? asset.balance ?? 0), 0);
    const monthlyExpenses = plan.monthly_expenses || 0;
    const annualExpenses = monthlyExpenses * 12;

    if (totalAssets > 0 && annualExpenses > 0) {
      const yearsOfExpenses = totalAssets / annualExpenses;
      
      if (yearsOfExpenses < 1) {
        result.errors.push('Assets insufficient to cover even one year of expenses');
      } else if (yearsOfExpenses < 5) {
        result.warnings.push(`Assets may only last ${yearsOfExpenses.toFixed(1)} years without growth`);
      } else if (yearsOfExpenses > 100) {
        result.suggestions.push('Assets seem very high relative to expenses - consider higher expense estimates');
      }
    }

    // Retirement timeline validation
    if (plan.retirement_age && plan.life_expectancy) {
      const retirementYears = plan.life_expectancy - plan.retirement_age;
      if (retirementYears <= 0) {
        result.errors.push('Life expectancy must be greater than retirement age');
      } else if (retirementYears < 10) {
        result.warnings.push('Very short retirement period - consider adjusting ages');
      }
    }
  }

  /**
   * Validate story data structure
   * @param {Object} storyData - Story to validate
   * @returns {Object} Validation result
   */
  validateStory(storyData) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!storyData || typeof storyData !== 'object') {
      result.errors.push('Story data must be a valid object');
      result.isValid = false;
      return result;
    }

    // Required properties
    if (!storyData.chapters || !Array.isArray(storyData.chapters)) {
      result.errors.push('Story must have a "chapters" array');
    } else if (storyData.chapters.length === 0) {
      result.errors.push('Story must have at least one chapter');
    }

    // Metadata validation
    if (!storyData.metadata) {
      result.warnings.push('Story should have metadata section');
    } else {
      if (!storyData.metadata.title) {
        result.warnings.push('Story should have a title');
      }
      if (!storyData.metadata.description) {
        result.suggestions.push('Story should have a description');
      }
    }

    // Chapter validation
    if (storyData.chapters && Array.isArray(storyData.chapters)) {
      storyData.chapters.forEach((chapter, index) => {
        this.validateChapter(chapter, index, result);
      });
    }

    result.isValid = result.errors.length === 0;
    
    this.eventBus.emit('validation:story-completed', {
      storyData,
      result
    });

    return result;
  }

  /**
   * Validate individual chapter
   * @param {Object} chapter - Chapter object
   * @param {number} index - Chapter index
   * @param {Object} result - Validation result object
   */
  validateChapter(chapter, index, result) {
    const chapterPrefix = `Chapter ${index + 1}`;

    if (!chapter || typeof chapter !== 'object') {
      result.errors.push(`${chapterPrefix}: Must be a valid object`);
      return;
    }

    // Required properties
    if (!chapter.title) {
      result.errors.push(`${chapterPrefix}: Missing title`);
    }

    if (!chapter.scenario_key) {
      result.errors.push(`${chapterPrefix}: Missing scenario_key`);
    }

    // Narrative validation
    if (chapter.narrative) {
      if (!chapter.narrative.introduction) {
        result.suggestions.push(`${chapterPrefix}: Consider adding an introduction`);
      }
    } else {
      result.suggestions.push(`${chapterPrefix}: Consider adding narrative content`);
    }
  }

  /**
   * Quick validation for common use cases
   * @param {Object} data - Data to validate
   * @param {string} type - Type of validation ('scenario' or 'story')
   * @returns {boolean} True if valid
   */
  isValid(data, type = 'scenario') {
    const result = type === 'story' ? 
      this.validateStory(data) : 
      this.validateScenario(data);
    
    return result.isValid;
  }
}
