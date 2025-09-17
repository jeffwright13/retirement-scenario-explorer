/**
 * Tests for ScenarioBuilderUI.js
 */

import { jest } from '@jest/globals';
import { ScenarioBuilderUI } from '../../../scripts/ui/ScenarioBuilderUI.js';

describe('ScenarioBuilderUI', () => {
  let scenarioBuilderUI;
  let mockEventBus;

  beforeEach(() => {
    // Mock event bus
    mockEventBus = {
      on: jest.fn(),
      emit: jest.fn()
    };

    // Mock DOM methods
    document.body.innerHTML = '';
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    scenarioBuilderUI = new ScenarioBuilderUI(mockEventBus);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('Constructor', () => {
    test('should initialize with event bus', () => {
      expect(scenarioBuilderUI.eventBus).toBe(mockEventBus);
      expect(scenarioBuilderUI.currentFormData).toBeNull();
      expect(scenarioBuilderUI.currentValidation).toBeNull();
    });

    test('should set up event listeners', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario-builder:ui-show-builder', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario-builder:ui-hide-builder', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario-builder:ui-load-form', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario-builder:ui-update-validation', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('scenario-builder:ui-show-error', expect.any(Function));
    });

    test('should create modal in DOM', () => {
      const modal = document.getElementById('scenario-builder-modal');
      expect(modal).toBeTruthy();
      expect(modal.classList.contains('scenario-builder-modal')).toBe(true);
      expect(modal.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      scenarioBuilderUI.initialize();
      // Should not throw and should log success
      expect(console.log).toHaveBeenCalledWith('✅ ScenarioBuilderUI initialized');
    });
  });

  describe('Modal Management', () => {
    test('should show builder modal', () => {
      scenarioBuilderUI.showBuilder();
      
      const modal = document.getElementById('scenario-builder-modal');
      expect(modal.classList.contains('hidden')).toBe(false);
      expect(document.body.classList.contains('modal-open')).toBe(true);
    });

    test('should hide builder modal', () => {
      // First show it
      scenarioBuilderUI.showBuilder();
      
      // Then hide it
      scenarioBuilderUI.hideBuilder();
      
      const modal = document.getElementById('scenario-builder-modal');
      expect(modal.classList.contains('hidden')).toBe(true);
      expect(document.body.classList.contains('modal-open')).toBe(false);
    });
  });

  describe('Event Bus Integration', () => {
    test('should handle show builder event', () => {
      const showHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'scenario-builder:ui-show-builder')[1];
      const showSpy = jest.spyOn(scenarioBuilderUI, 'showBuilder');
      
      showHandler();
      
      expect(showSpy).toHaveBeenCalled();
    });

    test('should handle hide builder event', () => {
      const hideHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'scenario-builder:ui-hide-builder')[1];
      const hideSpy = jest.spyOn(scenarioBuilderUI, 'hideBuilder');
      
      hideHandler();
      
      expect(hideSpy).toHaveBeenCalled();
    });

    test('should handle load form event', () => {
      const loadHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'scenario-builder:ui-load-form')[1];
      const loadSpy = jest.spyOn(scenarioBuilderUI, 'loadFormData');
      const formData = { title: 'Test Scenario' };
      
      loadHandler(formData);
      
      expect(loadSpy).toHaveBeenCalledWith(formData);
    });

    test('should handle update validation event', () => {
      const validationHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'scenario-builder:ui-update-validation')[1];
      const validationSpy = jest.spyOn(scenarioBuilderUI, 'updateValidation');
      const validation = { isValid: true, errors: [] };
      
      validationHandler(validation);
      
      expect(validationSpy).toHaveBeenCalledWith(validation);
    });

    test('should handle show error event', () => {
      const errorHandler = mockEventBus.on.mock.calls.find(call => call[0] === 'scenario-builder:ui-show-error')[1];
      const errorSpy = jest.spyOn(scenarioBuilderUI, 'showError');
      const error = { error: 'Test error message' };
      
      errorHandler(error);
      
      expect(errorSpy).toHaveBeenCalledWith('Test error message');
    });
  });

  describe('Form Data Management', () => {
    test('should load form data into UI elements', () => {
      const formData = {
        title: 'Test Scenario',
        description: 'Test Description',
        monthlyExpenses: 5000,
        durationYears: 25,
        inflationRate: 2.5,
        stopOnShortfall: false,
        taxDeferredRate: 25,
        taxableRate: 18,
        taxFreeRate: 0,
        assets: [
          {
            name: 'Test Asset',
            type: 'taxable',
            investmentType: 'stocks',
            balance: 100000,
            returnRate: 8,
            order: 1,
            marketDependent: true
          }
        ],
        income: [
          {
            name: 'Social Security',
            amount: 2000,
            startMonth: 1,
            stopMonth: null
          }
        ]
      };

      scenarioBuilderUI.loadFormData(formData);

      expect(scenarioBuilderUI.currentFormData).toBe(formData);
      expect(document.getElementById('scenario-title').value).toBe('Test Scenario');
      expect(document.getElementById('scenario-description').value).toBe('Test Description');
      expect(document.getElementById('monthly-expenses').value).toBe('5000');
      expect(document.getElementById('duration-years').value).toBe('25');
      expect(document.getElementById('inflation-rate').value).toBe('2.5');
      expect(document.getElementById('stop-on-shortfall').checked).toBe(false);
      expect(document.getElementById('tax-deferred-rate').value).toBe('25');
      expect(document.getElementById('taxable-rate').value).toBe('18');
      expect(document.getElementById('tax-free-rate').value).toBe('0');
    });

    test('should handle empty form data with defaults', () => {
      const formData = {};

      scenarioBuilderUI.loadFormData(formData);

      expect(document.getElementById('scenario-title').value).toBe('');
      expect(document.getElementById('duration-years').value).toBe('30');
      expect(document.getElementById('inflation-rate').value).toBe('3');
      expect(document.getElementById('stop-on-shortfall').checked).toBe(true);
      expect(document.getElementById('tax-deferred-rate').value).toBe('22');
      expect(document.getElementById('taxable-rate').value).toBe('15');
      expect(document.getElementById('tax-free-rate').value).toBe('0');
    });

    test('should collect form data correctly', () => {
      // Set up form values
      document.getElementById('scenario-title').value = 'Collected Scenario';
      document.getElementById('scenario-description').value = 'Collected Description';
      document.getElementById('monthly-expenses').value = '6000';
      document.getElementById('duration-years').value = '35';
      document.getElementById('inflation-rate').value = '2.8';
      document.getElementById('stop-on-shortfall').checked = true;
      document.getElementById('tax-deferred-rate').value = '28';
      document.getElementById('taxable-rate').value = '20';
      document.getElementById('tax-free-rate').value = '0';

      scenarioBuilderUI.collectFormData();

      expect(scenarioBuilderUI.currentFormData.title).toBe('Collected Scenario');
      expect(scenarioBuilderUI.currentFormData.description).toBe('Collected Description');
      expect(scenarioBuilderUI.currentFormData.monthlyExpenses).toBe(6000);
      expect(scenarioBuilderUI.currentFormData.durationYears).toBe(35);
      expect(scenarioBuilderUI.currentFormData.inflationRate).toBe(2.8);
      expect(scenarioBuilderUI.currentFormData.stopOnShortfall).toBe(true);
      expect(scenarioBuilderUI.currentFormData.taxDeferredRate).toBe(28);
      expect(scenarioBuilderUI.currentFormData.taxableRate).toBe(20);
      expect(scenarioBuilderUI.currentFormData.taxFreeRate).toBe(0);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('scenario-builder:form-changed', scenarioBuilderUI.currentFormData);
    });
  });

  describe('Asset Management', () => {
    test('should render assets correctly', () => {
      const assets = [
        {
          name: 'Asset 1',
          type: 'taxable',
          investmentType: 'stocks',
          balance: 50000,
          returnRate: 7,
          order: 1,
          marketDependent: true
        },
        {
          name: 'Asset 2',
          type: 'tax_deferred',
          investmentType: 'bonds',
          balance: 75000,
          returnRate: 5,
          order: 2,
          marketDependent: false
        }
      ];

      scenarioBuilderUI.renderAssets(assets);

      const container = document.getElementById('assets-container');
      const assetForms = container.querySelectorAll('.asset-form');
      
      expect(assetForms).toHaveLength(2);
      
      // Check first asset
      const firstAsset = assetForms[0];
      expect(firstAsset.querySelector('input[name="assets[0].name"]').value).toBe('Asset 1');
      expect(firstAsset.querySelector('select[name="assets[0].type"]').value).toBe('taxable');
      expect(firstAsset.querySelector('select[name="assets[0].investmentType"]').value).toBe('stocks');
      expect(firstAsset.querySelector('input[name="assets[0].balance"]').value).toBe('50000');
      expect(firstAsset.querySelector('input[name="assets[0].returnRate"]').value).toBe('7');
      expect(firstAsset.querySelector('input[name="assets[0].order"]').value).toBe('1');
      expect(firstAsset.querySelector('input[name="assets[0].marketDependent"]').checked).toBe(true);
    });

    test('should handle empty assets array', () => {
      scenarioBuilderUI.renderAssets([]);

      const container = document.getElementById('assets-container');
      expect(container.innerHTML).toBe('');
    });

    test('should set up remove asset event listeners', () => {
      const assets = [{ name: 'Test Asset', balance: 50000 }];
      scenarioBuilderUI.renderAssets(assets);

      const removeBtn = document.querySelector('.remove-btn[data-type="asset"]');
      expect(removeBtn).toBeTruthy();
      
      // Simulate click
      removeBtn.click();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('scenario-builder:remove-asset', 0);
    });
  });

  describe('Income Management', () => {
    test('should render income correctly', () => {
      const income = [
        {
          name: 'Social Security',
          amount: 2000,
          startMonth: 1,
          stopMonth: null
        },
        {
          name: 'Pension',
          amount: 1500,
          startMonth: 12,
          stopMonth: 240
        }
      ];

      scenarioBuilderUI.renderIncome(income);

      const container = document.getElementById('income-container');
      const incomeForms = container.querySelectorAll('.income-form');
      
      expect(incomeForms).toHaveLength(2);
      
      // Check first income
      const firstIncome = incomeForms[0];
      expect(firstIncome.querySelector('input[name="income[0].name"]').value).toBe('Social Security');
      expect(firstIncome.querySelector('input[name="income[0].amount"]').value).toBe('2000');
      expect(firstIncome.querySelector('input[name="income[0].startMonth"]').value).toBe('1');
      expect(firstIncome.querySelector('input[name="income[0].stopMonth"]').value).toBe('');
      
      // Check second income
      const secondIncome = incomeForms[1];
      expect(secondIncome.querySelector('input[name="income[1].stopMonth"]').value).toBe('240');
    });

    test('should handle empty income array', () => {
      scenarioBuilderUI.renderIncome([]);

      const container = document.getElementById('income-container');
      expect(container.innerHTML).toBe('');
    });

    test('should set up remove income event listeners', () => {
      const income = [{ name: 'Test Income', amount: 1000 }];
      scenarioBuilderUI.renderIncome(income);

      const removeBtn = document.querySelector('.remove-btn[data-type="income"]');
      expect(removeBtn).toBeTruthy();
      
      // Simulate click
      removeBtn.click();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('scenario-builder:remove-income', 0);
    });
  });

  describe('Form Event Handlers', () => {
    test('should handle close button click', () => {
      const closeBtn = document.getElementById('scenario-builder-close');
      closeBtn.click();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('scenario-builder:close');
    });

    test('should handle cancel button click', () => {
      const cancelBtn = document.getElementById('cancel-btn');
      cancelBtn.click();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('scenario-builder:close');
    });

    test('should handle template selection', () => {
      const templateGrid = document.getElementById('template-grid');
      const templateCard = templateGrid.querySelector('.template-card');
      
      templateCard.click();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('scenario-builder:template-selected', expect.any(String));
      expect(templateCard.classList.contains('selected')).toBe(true);
    });

    test('should handle add asset button click', () => {
      const addAssetBtn = document.getElementById('add-asset-btn');
      addAssetBtn.click();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('scenario-builder:add-asset');
    });

    test('should handle add income button click', () => {
      const addIncomeBtn = document.getElementById('add-income-btn');
      addIncomeBtn.click();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('scenario-builder:add-income');
    });

    test('should handle save button click', () => {
      const collectSpy = jest.spyOn(scenarioBuilderUI, 'collectFormData');
      const saveBtn = document.getElementById('save-btn');
      
      saveBtn.click();
      
      expect(collectSpy).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('scenario-builder:save-scenario');
    });

    test('should handle preview button click', () => {
      const collectSpy = jest.spyOn(scenarioBuilderUI, 'collectFormData');
      const previewBtn = document.getElementById('preview-btn');
      
      previewBtn.click();
      
      expect(collectSpy).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('scenario-builder:preview-scenario');
    });

    test('should handle form input changes', () => {
      const collectSpy = jest.spyOn(scenarioBuilderUI, 'collectFormData');
      const form = document.getElementById('scenario-builder-form');
      const titleInput = document.getElementById('scenario-title');
      
      titleInput.value = 'New Title';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      expect(collectSpy).toHaveBeenCalled();
    });

    test('should handle overlay click to close', () => {
      const overlay = document.querySelector('.scenario-builder-overlay');
      overlay.click();
      
      expect(mockEventBus.emit).toHaveBeenCalledWith('scenario-builder:close');
    });
  });

  describe('Tax Preset Management', () => {
    test('should apply conservative tax preset', () => {
      scenarioBuilderUI.applyTaxPreset('conservative');
      
      expect(document.getElementById('tax-deferred-rate').value).toBe('12');
      expect(document.getElementById('taxable-rate').value).toBe('0');
      expect(document.getElementById('tax-free-rate').value).toBe('0');
    });

    test('should apply moderate tax preset', () => {
      scenarioBuilderUI.applyTaxPreset('moderate');
      
      expect(document.getElementById('tax-deferred-rate').value).toBe('22');
      expect(document.getElementById('taxable-rate').value).toBe('15');
      expect(document.getElementById('tax-free-rate').value).toBe('0');
    });

    test('should apply high-earner tax preset', () => {
      scenarioBuilderUI.applyTaxPreset('high-earner');
      
      expect(document.getElementById('tax-deferred-rate').value).toBe('32');
      expect(document.getElementById('taxable-rate').value).toBe('20');
      expect(document.getElementById('tax-free-rate').value).toBe('0');
    });

    test('should handle invalid tax preset gracefully', () => {
      const originalValues = {
        taxDeferred: document.getElementById('tax-deferred-rate').value,
        taxable: document.getElementById('taxable-rate').value,
        taxFree: document.getElementById('tax-free-rate').value
      };
      
      scenarioBuilderUI.applyTaxPreset('invalid-preset');
      
      // Values should remain unchanged
      expect(document.getElementById('tax-deferred-rate').value).toBe(originalValues.taxDeferred);
      expect(document.getElementById('taxable-rate').value).toBe(originalValues.taxable);
      expect(document.getElementById('tax-free-rate').value).toBe(originalValues.taxFree);
    });

    test('should trigger form change after applying preset', () => {
      const collectSpy = jest.spyOn(scenarioBuilderUI, 'collectFormData');
      
      scenarioBuilderUI.applyTaxPreset('moderate');
      
      expect(collectSpy).toHaveBeenCalled();
    });
  });

  describe('Validation Management', () => {
    test('should update validation with success state', () => {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        withdrawalRate: 4.2
      };

      scenarioBuilderUI.updateValidation(validation);

      const summary = document.getElementById('validation-summary');
      expect(summary.innerHTML).toContain('✓ Scenario looks good!');
      expect(summary.innerHTML).toContain('Withdrawal rate: 4.2%');
      
      const saveBtn = document.getElementById('save-btn');
      const previewBtn = document.getElementById('preview-btn');
      expect(saveBtn.disabled).toBe(false);
      expect(previewBtn.disabled).toBe(false);
    });

    test('should update validation with error state', () => {
      const validation = {
        isValid: false,
        errors: ['Monthly expenses are required', 'At least one asset is required'],
        warnings: ['Asset balance seems low']
      };

      scenarioBuilderUI.updateValidation(validation);

      const summary = document.getElementById('validation-summary');
      expect(summary.innerHTML).toContain('Please fix the following issues:');
      expect(summary.innerHTML).toContain('Monthly expenses are required');
      expect(summary.innerHTML).toContain('At least one asset is required');
      expect(summary.innerHTML).toContain('Warnings:');
      expect(summary.innerHTML).toContain('Asset balance seems low');
      
      const saveBtn = document.getElementById('save-btn');
      const previewBtn = document.getElementById('preview-btn');
      expect(saveBtn.disabled).toBe(true);
      expect(previewBtn.disabled).toBe(true);
    });

    test('should clear previous validation state', () => {
      // First set an error state
      document.querySelector('.form-group').classList.add('error');
      document.querySelector('.field-error').textContent = 'Previous error';
      
      const validation = {
        isValid: true,
        errors: [],
        warnings: []
      };

      scenarioBuilderUI.updateValidation(validation);

      expect(document.querySelector('.form-group').classList.contains('error')).toBe(false);
      expect(document.querySelector('.field-error').textContent).toBe('');
    });

    test('should store validation state', () => {
      const validation = { isValid: true, errors: [] };
      
      scenarioBuilderUI.updateValidation(validation);
      
      expect(scenarioBuilderUI.currentValidation).toBe(validation);
    });
  });

  describe('Error Handling', () => {
    test('should show error message', () => {
      const errorMessage = 'Something went wrong';
      
      scenarioBuilderUI.showError(errorMessage);
      
      const summary = document.getElementById('validation-summary');
      expect(summary.innerHTML).toContain('Error:');
      expect(summary.innerHTML).toContain(errorMessage);
    });
  });

  describe('Template Population', () => {
    test('should populate templates in grid', () => {
      const templateGrid = document.getElementById('template-grid');
      const templateCards = templateGrid.querySelectorAll('.template-card');
      
      expect(templateCards.length).toBeGreaterThan(0);
      
      // Check that templates have required attributes
      templateCards.forEach(card => {
        expect(card.dataset.template).toBeTruthy();
        expect(card.querySelector('.template-name')).toBeTruthy();
        expect(card.querySelector('.template-description')).toBeTruthy();
        expect(card.querySelector('.template-icon')).toBeTruthy();
      });
    });
  });

  describe('Form Data Collection Edge Cases', () => {
    test('should handle missing asset data gracefully', () => {
      // Create asset form with missing data
      const container = document.getElementById('assets-container');
      container.innerHTML = `
        <div class="asset-form" data-index="0">
          <input name="assets[0].name" value="">
          <select name="assets[0].type"><option value="taxable" selected></option></select>
          <select name="assets[0].investmentType"><option value="stocks" selected></option></select>
          <input name="assets[0].balance" value="">
          <input name="assets[0].returnRate" value="">
          <input name="assets[0].order" value="">
          <input name="assets[0].marketDependent" type="checkbox">
        </div>
      `;

      scenarioBuilderUI.collectFormData();

      expect(scenarioBuilderUI.currentFormData.assets).toHaveLength(1);
      expect(scenarioBuilderUI.currentFormData.assets[0].balance).toBe(0);
      expect(scenarioBuilderUI.currentFormData.assets[0].returnRate).toBe(7);
      expect(scenarioBuilderUI.currentFormData.assets[0].order).toBe(1);
    });

    test('should filter out invalid income entries', () => {
      // Create income form with invalid data
      const container = document.getElementById('income-container');
      container.innerHTML = `
        <div class="income-form" data-index="0">
          <input name="income[0].name" value="">
          <input name="income[0].amount" value="0">
          <input name="income[0].startMonth" value="1">
          <input name="income[0].stopMonth" value="">
        </div>
        <div class="income-form" data-index="1">
          <input name="income[1].name" value="Valid Income">
          <input name="income[1].amount" value="1000">
          <input name="income[1].startMonth" value="1">
          <input name="income[1].stopMonth" value="">
        </div>
      `;

      scenarioBuilderUI.collectFormData();

      // Should only include the valid income entry
      expect(scenarioBuilderUI.currentFormData.income).toHaveLength(1);
      expect(scenarioBuilderUI.currentFormData.income[0].name).toBe('Valid Income');
    });
  });

  describe('DOM Integration', () => {
    test('should handle missing DOM elements gracefully', () => {
      // Mock getElementById to return null for missing elements
      const originalGetElementById = document.getElementById;
      jest.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'scenario-title') return null;
        return originalGetElementById.call(document, id);
      });

      // Should throw when trying to access null element
      expect(() => {
        scenarioBuilderUI.loadFormData({ title: 'Test' });
      }).toThrow();
      
      // Restore original implementation
      document.getElementById.mockRestore();
    });

    test('should handle form submission prevention', () => {
      const form = document.getElementById('scenario-builder-form');
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      
      // Form should not actually submit (no action/method defined)
      const result = form.dispatchEvent(submitEvent);
      expect(result).toBe(true); // Event not prevented, but no actual submission
    });
  });
});
