/**
 * Copy Scenario Workflow Integration Tests
 * Tests the complete flow of copying existing scenarios
 */

import { ScenarioBuilderController } from '../../scripts/controllers/ScenarioBuilderController.js';
import { ScenarioBuilderService } from '../../scripts/services/ScenarioBuilderService.js';
import { ScenarioBuilderUI } from '../../scripts/ui/ScenarioBuilderUI.js';
import { ContentService } from '../../scripts/services/ContentService.js';
import { EventBus } from '../../scripts/core/EventBus.js';

describe('Copy Scenario Workflow Integration', () => {
  let eventBus;
  let contentService;
  let scenarioBuilderService;
  let scenarioBuilderUI;
  let scenarioBuilderController;
  let mockScenarios;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="scenario-builder-modal" class="hidden">
        <div class="scenario-builder-content">
          <div class="copy-scenario-section">
            <select id="copy-scenario-select">
              <option value="">Select scenario to copy...</option>
            </select>
            <button id="copy-scenario-btn" disabled>Copy Selected</button>
          </div>
          <form id="scenario-builder-form">
            <input type="text" id="scenario-title" name="title">
            <textarea id="scenario-description" name="description"></textarea>
            <input type="number" id="monthly-expenses" name="monthlyExpenses">
            <input type="number" id="duration-years" name="durationYears">
            <input type="number" id="inflation-rate" name="inflationRate">
            <input type="checkbox" id="stop-on-shortfall" name="stopOnShortfall">
            <input type="number" id="tax-deferred-rate" name="taxDeferredRate">
            <input type="number" id="taxable-rate" name="taxableRate">
            <input type="number" id="tax-free-rate" name="taxFreeRate">
            <div id="assets-container"></div>
            <div id="income-container"></div>
            <div id="validation-summary"></div>
          </form>
        </div>
      </div>
    `;

    // Mock scenarios data
    mockScenarios = {
      builtin: [
        {
          key: 'simple-retirement',
          title: 'Simple Retirement',
          name: 'Simple Retirement'
        },
        {
          key: 'social-security',
          title: 'Social Security Planning',
          name: 'Social Security Planning'
        }
      ],
      custom: [
        {
          key: 'my-custom-scenario',
          title: 'My Custom Scenario',
          name: 'My Custom Scenario'
        }
      ]
    };

    // Initialize components
    eventBus = new EventBus();
    contentService = new ContentService(eventBus);
    scenarioBuilderService = new ScenarioBuilderService(eventBus);
    scenarioBuilderUI = new ScenarioBuilderUI(eventBus);
    scenarioBuilderController = new ScenarioBuilderController(
      eventBus, 
      scenarioBuilderService, 
      scenarioBuilderUI
    );

    // Mock ContentService methods
    jest.spyOn(contentService, 'getScenariosForCopy').mockReturnValue(mockScenarios);
    jest.spyOn(contentService, 'getScenario').mockResolvedValue({
      metadata: {
        title: 'Simple Retirement',
        description: 'A basic retirement scenario'
      },
      plan: {
        monthly_expenses: 5000,
        duration_months: 360,
        inflation_rate: 0.03,
        stop_on_shortfall: true
      },
      tax_config: {
        tax_deferred: 0.22,
        taxable: 0.15,
        tax_free: 0
      },
      assets: [{
        name: 'Investment Portfolio',
        type: 'investment',
        investment_type: 'growth',
        balance: 500000,
        return_rate: 0.07,
        order: 1,
        market_dependent: true
      }],
      income: [{
        name: 'Social Security',
        amount: 2500,
        start_month: 1,
        stop_month: null
      }]
    });

    jest.spyOn(contentService, 'getUserScenario').mockReturnValue({
      metadata: {
        title: 'My Custom Scenario',
        description: 'My personalized retirement plan'
      },
      plan: {
        monthly_expenses: 6000,
        duration_months: 300,
        inflation_rate: 0.025
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Copy Workflow', () => {
    test('should complete full copy workflow for builtin scenario', async () => {
      // Step 1: Request scenarios for copy
      eventBus.emit('scenario-builder:request-scenarios-for-copy');
      
      // Step 2: Populate dropdown
      eventBus.emit('scenario-builder:ui-populate-copy-scenarios', mockScenarios);
      
      // Verify dropdown is populated
      const select = document.getElementById('copy-scenario-select');
      expect(select.children.length).toBeGreaterThan(1);
      
      // Step 3: Select a scenario
      select.value = 'builtin:simple-retirement';
      select.dispatchEvent(new Event('change'));
      
      // Verify copy button is enabled
      const copyBtn = document.getElementById('copy-scenario-btn');
      expect(copyBtn.disabled).toBe(false);
      
      // Step 4: Click copy button
      copyBtn.click();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Step 5: Verify form is populated with copied data
      expect(document.getElementById('scenario-title').value).toBe('Copy of Simple Retirement');
      expect(document.getElementById('scenario-description').value).toBe('A basic retirement scenario');
      expect(document.getElementById('monthly-expenses').value).toBe('5000');
      expect(document.getElementById('duration-years').value).toBe('30');
      expect(document.getElementById('inflation-rate').value).toBe('3');
    });

    test('should complete full copy workflow for custom scenario', async () => {
      // Request and populate scenarios
      eventBus.emit('scenario-builder:request-scenarios-for-copy');
      eventBus.emit('scenario-builder:ui-populate-copy-scenarios', mockScenarios);
      
      // Select custom scenario
      const select = document.getElementById('copy-scenario-select');
      select.value = 'custom:my-custom-scenario';
      select.dispatchEvent(new Event('change'));
      
      // Click copy
      const copyBtn = document.getElementById('copy-scenario-btn');
      copyBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify custom scenario data is loaded
      expect(document.getElementById('scenario-title').value).toBe('Copy of My Custom Scenario');
      expect(document.getElementById('scenario-description').value).toBe('My personalized retirement plan');
      expect(document.getElementById('monthly-expenses').value).toBe('6000');
      expect(document.getElementById('duration-years').value).toBe('25'); // 300 months / 12
    });
  });

  describe('Event Bus Integration', () => {
    test('should emit correct events in proper sequence', () => {
      const emittedEvents = [];
      const originalEmit = eventBus.emit;
      eventBus.emit = jest.fn((event, data) => {
        emittedEvents.push(event);
        return originalEmit.call(eventBus, event, data);
      });

      // Trigger copy workflow
      eventBus.emit('scenario-builder:request-scenarios-for-copy');
      eventBus.emit('scenario-builder:copy-scenario', 'builtin:simple-retirement');

      // Verify event sequence
      expect(emittedEvents).toContain('scenario-builder:request-scenarios-for-copy');
      expect(emittedEvents).toContain('scenario-builder:copy-scenario');
      expect(emittedEvents).toContain('scenario-builder:load-scenario-for-copy');
    });

    test('should handle ContentService integration', () => {
      // Mock ContentService event handlers
      const contentServiceSpy = jest.spyOn(contentService, 'getScenariosForCopy');
      
      eventBus.emit('content:get-all-scenarios-for-copy');
      
      expect(contentServiceSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle scenario loading errors gracefully', async () => {
      // Mock error in scenario loading
      jest.spyOn(contentService, 'getScenario').mockRejectedValue(new Error('Scenario not found'));
      
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      eventBus.emit('scenario-builder:copy-scenario', 'builtin:nonexistent');
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(errorSpy).toHaveBeenCalled();
      
      errorSpy.mockRestore();
    });

    test('should handle empty scenarios list', () => {
      const emptyScenarios = { builtin: [], custom: [] };
      
      eventBus.emit('scenario-builder:ui-populate-copy-scenarios', emptyScenarios);
      
      const select = document.getElementById('copy-scenario-select');
      // Should only have the default option
      expect(select.children.length).toBe(1);
      expect(select.children[0].value).toBe('');
    });
  });

  describe('UI State Management', () => {
    test('should maintain proper UI state during copy workflow', () => {
      // Initial state
      const select = document.getElementById('copy-scenario-select');
      const copyBtn = document.getElementById('copy-scenario-btn');
      
      expect(copyBtn.disabled).toBe(true);
      
      // After populating scenarios
      eventBus.emit('scenario-builder:ui-populate-copy-scenarios', mockScenarios);
      expect(select.children.length).toBeGreaterThan(1);
      
      // After selecting scenario
      select.value = 'builtin:simple-retirement';
      select.dispatchEvent(new Event('change'));
      expect(copyBtn.disabled).toBe(false);
      
      // After copying
      copyBtn.click();
      // Button should remain enabled for potential re-use
      expect(copyBtn.disabled).toBe(false);
    });

    test('should reset UI state properly', () => {
      // Set up some state
      const select = document.getElementById('copy-scenario-select');
      const copyBtn = document.getElementById('copy-scenario-btn');
      
      eventBus.emit('scenario-builder:ui-populate-copy-scenarios', mockScenarios);
      select.value = 'builtin:simple-retirement';
      select.dispatchEvent(new Event('change'));
      
      // Reset
      scenarioBuilderUI.resetForm();
      
      // Verify reset state
      expect(select.value).toBe('');
      expect(copyBtn.disabled).toBe(true);
    });
  });
});
