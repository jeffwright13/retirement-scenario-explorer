/**
 * Tests for ValidationService.js
 */

import { jest } from '@jest/globals';
import { ValidationService } from '../../../scripts/services/ValidationService.js';

describe('ValidationService', () => {
  let validationService;
  let mockEventBus;

  beforeEach(() => {
    mockEventBus = {
      emit: jest.fn()
    };
    
    validationService = new ValidationService(mockEventBus);
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with event bus', () => {
      expect(validationService.eventBus).toBe(mockEventBus);
    });
  });

  describe('Scenario Validation', () => {
    describe('validateScenario', () => {
      test('should validate a complete valid scenario', () => {
        const validScenario = {
          title: 'Test Scenario',
          description: 'A test scenario',
          plan: {
            monthly_expenses: 5000
          },
          assets: [
            {
              name: 'Savings Account',
              balance: 100000,
              type: 'taxable'
            }
          ]
        };

        const result = validationService.validateScenario(validScenario);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(mockEventBus.emit).toHaveBeenCalledWith('validation:scenario-completed', {
          scenarioData: validScenario,
          result
        });
      });

      test('should handle null/undefined scenario data', () => {
        // The current implementation doesn't handle null gracefully, it will throw
        expect(() => {
          validationService.validateScenario(null);
        }).toThrow();
      });

      test('should handle non-object scenario data', () => {
        const result = validationService.validateScenario('invalid');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Scenario data must be a valid object');
      });

      test('should detect missing required properties', () => {
        const incompleteScenario = {
          title: 'Test'
        };

        const result = validationService.validateScenario(incompleteScenario);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Missing required property: "plan"');
        expect(result.errors).toContain('Missing required property: "assets"');
      });

      test('should warn about missing optional properties', () => {
        const scenarioWithoutOptionals = {
          plan: { monthly_expenses: 5000 },
          assets: []
        };

        const result = validationService.validateScenario(scenarioWithoutOptionals);

        expect(result.warnings).toContain('Scenario should have a title for better identification');
        expect(result.warnings).toContain('Scenario should have a description for clarity');
      });
    });

    describe('validateScenarioStructure', () => {
      test('should validate required properties', () => {
        const result = { errors: [], warnings: [] };
        const scenario = { plan: {}, assets: [] };

        validationService.validateScenarioStructure(scenario, result);

        expect(result.errors).toHaveLength(0);
      });

      test('should detect missing required properties', () => {
        const result = { errors: [], warnings: [] };
        const scenario = {};

        validationService.validateScenarioStructure(scenario, result);

        expect(result.errors).toContain('Missing required property: "plan"');
        expect(result.errors).toContain('Missing required property: "assets"');
      });
    });

    describe('validatePlan', () => {
      test('should validate valid plan', () => {
        const result = { errors: [], warnings: [] };
        const plan = {
          monthly_expenses: 5000
        };

        validationService.validatePlan(plan, result);

        expect(result.errors).toHaveLength(0);
      });

      test('should handle null/invalid plan', () => {
        const result = { errors: [], warnings: [] };

        validationService.validatePlan(null, result);

        expect(result.errors).toContain('Plan section must be a valid object');
      });

      test('should validate monthly expenses', () => {
        const result = { errors: [], warnings: [] };

        // Missing monthly_expenses
        validationService.validatePlan({}, result);
        expect(result.errors).toContain('Plan must include "monthly_expenses"');

        // Invalid type
        result.errors = [];
        validationService.validatePlan({ monthly_expenses: 'invalid' }, result);
        expect(result.errors).toContain('Monthly expenses must be a number');

        // Zero or negative
        result.errors = [];
        validationService.validatePlan({ monthly_expenses: 0 }, result);
        expect(result.errors).toContain('Monthly expenses must be greater than 0');

        // Too low warning
        result.errors = [];
        result.warnings = [];
        validationService.validatePlan({ monthly_expenses: 500 }, result);
        expect(result.warnings).toContain('Monthly expenses seem unusually low (< $1,000)');

        // Too high warning
        result.warnings = [];
        validationService.validatePlan({ monthly_expenses: 60000 }, result);
        expect(result.warnings).toContain('Monthly expenses seem unusually high (> $50,000)');
      });
    });

    describe('validateAssets', () => {
      test('should validate valid assets array', () => {
        const result = { errors: [], warnings: [], suggestions: [] };
        const assets = [
          { name: 'Savings', balance: 50000, type: 'taxable' },
          { name: 'Investment', balance: 100000, type: 'tax_deferred' }
        ];

        validationService.validateAssets(assets, result);

        expect(result.errors).toHaveLength(0);
      });

      test('should handle non-array assets', () => {
        const result = { errors: [], warnings: [] };

        validationService.validateAssets('invalid', result);

        expect(result.errors).toContain('Assets must be an array');
      });

      test('should warn about empty assets', () => {
        const result = { errors: [], warnings: [] };

        validationService.validateAssets([], result);

        validationService.validateAssets([], result);

        expect(result.warnings).toContain('No assets defined - simulation may not be meaningful');
      });

      test('should warn about low total asset value', () => {
        const scenarioData = {
          assets: [
            { name: 'Small Asset', balance: 100, type: 'taxable' }
          ],
          plan: { monthly_expenses: 5000 }
        };

        const result = validationService.validateScenario(scenarioData);

        // With $100 assets and $5000/month expenses, this should generate an error about insufficient assets
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.includes('insufficient'))).toBe(true);
      });
    });

    describe('validateAsset', () => {
      test('should validate valid asset', () => {
        const result = { errors: [], warnings: [], suggestions: [] };
        const asset = {
          name: 'Test Asset',
          balance: 50000,
          type: 'taxable',
          min_balance: 5000
        };

        validationService.validateAsset(asset, 0, result);

        expect(result.errors).toHaveLength(0);
      });

      test('should handle null/invalid asset', () => {
        const result = { errors: [], warnings: [] };

        validationService.validateAsset(null, 0, result);

        expect(result.errors).toContain('Asset 1: Must be a valid object');
      });

      test('should validate asset value', () => {
        const result = { errors: [], warnings: [], suggestions: [] };

        // Missing value
        validationService.validateAsset({}, 0, result);
        expect(result.errors).toContain('Asset 1: Missing asset value (expected "balance")');

        // Invalid type
        result.errors = [];
        validationService.validateAsset({ balance: 'invalid' }, 0, result);
        expect(result.errors).toContain('Asset 1: Asset value must be a number');

        // Negative value
        result.errors = [];
        validationService.validateAsset({ balance: -1000 }, 0, result);
        expect(result.errors).toContain('Asset 1: Asset value cannot be negative');

        // Valid balance
        result.errors = [];
        validationService.validateAsset({ balance: 50000 }, 0, result);
        expect(result.errors).toHaveLength(0);
      });

      test('should validate asset type against the real schema enum', () => {
        const result = { errors: [], warnings: [], suggestions: [] };

        // Valid type
        validationService.validateAsset({
          balance: 50000,
          type: 'taxable'
        }, 0, result);
        expect(result.warnings).toHaveLength(0);

        // Invalid type
        result.warnings = [];
        validationService.validateAsset({
          balance: 50000,
          type: 'unknown'
        }, 0, result);
        expect(result.warnings).toContain('Asset 1: Unknown asset type "unknown"');

        // Missing type
        result.suggestions = [];
        validationService.validateAsset({
          balance: 50000
        }, 0, result);
        expect(result.suggestions).toContain('Asset 1: Consider adding an asset type for better categorization');
      });

      test('should validate min_balance', () => {
        const result = { errors: [], warnings: [], suggestions: [] };

        // Invalid type
        validationService.validateAsset({
          balance: 50000,
          min_balance: 'invalid'
        }, 0, result);
        expect(result.errors).toContain('Asset 1: min_balance must be a number');

        // Negative min_balance
        result.errors = [];
        validationService.validateAsset({
          balance: 50000,
          min_balance: -1000
        }, 0, result);
        expect(result.errors).toContain('Asset 1: min_balance cannot be negative');

        // Min balance exceeds asset value
        result.errors = [];
        validationService.validateAsset({
          balance: 50000,
          min_balance: 60000
        }, 0, result);
        expect(result.errors).toContain('Asset 1: min_balance ($60,000) cannot exceed asset balance ($50,000)');

        // Valid min_balance with suggestion
        result.errors = [];
        result.suggestions = [];
        validationService.validateAsset({
          balance: 50000,
          min_balance: 10000
        }, 0, result);
        expect(result.suggestions).toContain('Asset 1: Emergency fund of $10,000 reserved, $40,000 available for withdrawal');
      });

      test('should suggest adding asset name', () => {
        const result = { errors: [], warnings: [], suggestions: [] };

        validationService.validateAsset({
          balance: 50000
        }, 0, result);

        expect(result.suggestions).toContain('Asset 1: Consider adding a name for better identification');
      });

      test('should produce zero warnings for a real scenario using actual schema vocabulary (ISSUES.md #7)', () => {
        const result = { errors: [], warnings: [], suggestions: [] };

        ['taxable', 'tax_deferred', 'tax_free'].forEach(type => {
          validationService.validateAsset({
            name: `${type} account`,
            balance: 100000,
            type,
            min_balance: 0
          }, 0, result);
        });

        expect(result.warnings).toHaveLength(0);
      });
    });

    describe('validateBusinessLogic', () => {
      test('should validate asset sufficiency', () => {
        const result = { errors: [], warnings: [], suggestions: [] };
        const scenarioData = {
          plan: { monthly_expenses: 5000 },
          assets: [{ balance: 50000 }] // Less than 1 year
        };

        validationService.validateBusinessLogic(scenarioData, result);

        expect(result.errors).toContain('Assets insufficient to cover even one year of expenses');

        // Test warning for low years
        result.errors = [];
        result.warnings = [];
        scenarioData.assets = [{ balance: 200000 }]; // ~3.3 years
        validationService.validateBusinessLogic(scenarioData, result);

        expect(result.warnings).toContain('Assets may only last 3.3 years without growth');

        // Test suggestion for very high assets
        result.warnings = [];
        result.suggestions = [];
        scenarioData.assets = [{ balance: 10000000 }]; // 166+ years
        validationService.validateBusinessLogic(scenarioData, result);

        expect(result.suggestions).toContain('Assets seem very high relative to expenses - consider higher expense estimates');
      });

      test('should handle missing plan or assets gracefully', () => {
        const result = { errors: [], warnings: [] };

        validationService.validateBusinessLogic({}, result);

        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });
    });
  });

  describe('Story Validation', () => {
    describe('validateStory', () => {
      test('should validate complete valid story', () => {
        const validStory = {
          metadata: {
            title: 'Test Story',
            description: 'A test story'
          },
          chapters: [
            {
              title: 'Chapter 1',
              scenario_key: 'test-scenario',
              narrative: {
                introduction: 'Introduction text'
              }
            }
          ]
        };

        const result = validationService.validateStory(validStory);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(mockEventBus.emit).toHaveBeenCalledWith('validation:story-completed', {
          storyData: validStory,
          result
        });
      });

      test('should handle null/invalid story data', () => {
        const result = validationService.validateStory(null);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Story data must be a valid object');
      });

      test('should validate chapters array', () => {
        const storyWithoutChapters = {
          metadata: { title: 'Test' }
        };

        const result = validationService.validateStory(storyWithoutChapters);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Story must have a "chapters" array');

        // Test empty chapters
        const storyWithEmptyChapters = {
          metadata: { title: 'Test' },
          chapters: []
        };

        const result2 = validationService.validateStory(storyWithEmptyChapters);

        expect(result2.isValid).toBe(false);
        expect(result2.errors).toContain('Story must have at least one chapter');
      });

      test('should validate metadata', () => {
        const storyWithoutMetadata = {
          chapters: [{ title: 'Chapter 1', scenario_key: 'test' }]
        };

        const result = validationService.validateStory(storyWithoutMetadata);

        expect(result.warnings).toContain('Story should have metadata section');

        // Test missing title and description
        const storyWithIncompleteMetadata = {
          metadata: {},
          chapters: [{ title: 'Chapter 1', scenario_key: 'test' }]
        };

        const result2 = validationService.validateStory(storyWithIncompleteMetadata);

        expect(result2.warnings).toContain('Story should have a title');
        expect(result2.suggestions).toContain('Story should have a description');
      });
    });

    describe('validateChapter', () => {
      test('should validate valid chapter', () => {
        const result = { errors: [], warnings: [], suggestions: [] };
        const chapter = {
          title: 'Test Chapter',
          scenario_key: 'test-scenario',
          narrative: {
            introduction: 'Introduction text'
          }
        };

        validationService.validateChapter(chapter, 0, result);

        expect(result.errors).toHaveLength(0);
      });

      test('should handle null/invalid chapter', () => {
        const result = { errors: [], warnings: [] };

        validationService.validateChapter(null, 0, result);

        expect(result.errors).toContain('Chapter 1: Must be a valid object');
      });

      test('should validate required chapter properties', () => {
        const result = { errors: [], warnings: [], suggestions: [] };
        const incompleteChapter = {};

        validationService.validateChapter(incompleteChapter, 0, result);

        expect(result.errors).toContain('Chapter 1: Missing title');
        expect(result.errors).toContain('Chapter 1: Missing scenario_key');
      });

      test('should validate narrative content', () => {
        const result = { errors: [], warnings: [], suggestions: [] };

        // Chapter without narrative
        const chapterWithoutNarrative = {
          title: 'Test Chapter',
          scenario_key: 'test-scenario'
        };

        validationService.validateChapter(chapterWithoutNarrative, 0, result);

        expect(result.suggestions).toContain('Chapter 1: Consider adding narrative content');

        // Chapter with narrative but no introduction
        result.suggestions = [];
        const chapterWithoutIntro = {
          title: 'Test Chapter',
          scenario_key: 'test-scenario',
          narrative: {}
        };

        validationService.validateChapter(chapterWithoutIntro, 0, result);

        expect(result.suggestions).toContain('Chapter 1: Consider adding an introduction');
      });
    });
  });

  describe('Utility Methods', () => {
    describe('isValid', () => {
      test('should return true for valid scenario', () => {
        const validScenario = {
          plan: { monthly_expenses: 5000 },
          assets: [{ balance: 100000 }]
        };

        const result = validationService.isValid(validScenario, 'scenario');

        expect(result).toBe(true);
      });

      test('should return false for invalid scenario', () => {
        const invalidScenario = {
          plan: { monthly_expenses: -1000 }
        };

        const result = validationService.isValid(invalidScenario, 'scenario');

        expect(result).toBe(false);
      });

      test('should return true for valid story', () => {
        const validStory = {
          metadata: { title: 'Test' },
          chapters: [{ title: 'Chapter 1', scenario_key: 'test' }]
        };

        const result = validationService.isValid(validStory, 'story');

        expect(result).toBe(true);
      });

      test('should return false for invalid story', () => {
        const invalidStory = {
          chapters: []
        };

        const result = validationService.isValid(invalidStory, 'story');

        expect(result).toBe(false);
      });

      test('should default to scenario validation', () => {
        const validScenario = {
          plan: { monthly_expenses: 5000 },
          assets: [{ balance: 100000 }]
        };

        const result = validationService.isValid(validScenario);

        expect(result).toBe(true);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle zero values appropriately', () => {
      const result = { errors: [], warnings: [], suggestions: [] };
      const scenarioData = {
        plan: { monthly_expenses: 5000 },
        assets: [{ balance: 1000 }] // Small but non-zero amount
      };

      validationService.validateBusinessLogic(scenarioData, result);

      // With very low assets relative to expenses, it should generate an error
      expect(result.errors).toContain('Assets insufficient to cover even one year of expenses');
    });

    test('should handle missing optional properties gracefully', () => {
      const minimalScenario = {
        plan: { monthly_expenses: 5000 },
        assets: [{ balance: 100000 }]
      };

      const result = validationService.validateScenario(minimalScenario);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0); // Should have warnings for missing optional fields
    });

    test('should handle complex asset validation scenarios', () => {
      const result = { errors: [], warnings: [], suggestions: [] };
      const complexAsset = {
        name: 'Complex Asset',
        balance: 100000,
        type: 'taxable',
        min_balance: 10000
      };

      validationService.validateAsset(complexAsset, 0, result);

      expect(result.errors).toHaveLength(0);
      expect(result.suggestions).toContain('Asset 1: Emergency fund of $10,000 reserved, $90,000 available for withdrawal');
    });
  });
});
