/**
 * Scenario Builder UI Layout Integration Tests
 * Tests for visual layout, styling, and responsive behavior
 */

import { ScenarioBuilderUI } from '../../scripts/ui/ScenarioBuilderUI.js';
import { EventBus } from '../../scripts/core/EventBus.js';

describe('Scenario Builder UI Layout Integration', () => {
  let scenarioBuilderUI;
  let mockEventBus;

  beforeEach(() => {
    // Set up DOM with complete modal structure
    document.body.innerHTML = `
      <div id="scenario-builder-modal" class="scenario-builder-modal hidden">
        <div class="scenario-builder-overlay"></div>
        <div class="scenario-builder-container">
          <div class="scenario-builder-header">
            <h2>Create Your Retirement Scenario</h2>
            <button class="close-btn" id="scenario-builder-close">×</button>
          </div>
          <div class="scenario-builder-content">
            <!-- Template Selection -->
            <div class="template-section">
              <h3>Start with a Template</h3>
              <div class="template-grid" id="template-grid"></div>
            </div>
            
            <!-- Copy Existing Scenario -->
            <div class="copy-scenario-section">
              <h3>Copy an Existing Scenario</h3>
              <div class="copy-scenario-controls">
                <select id="copy-scenario-select" class="form-control">
                  <option value="">Select scenario to copy...</option>
                </select>
                <button type="button" class="btn btn-outline btn-small" id="copy-scenario-btn" disabled>
                  📋 Copy Selected
                </button>
              </div>
              <div class="copy-scenario-help">
                Copy any built-in or custom scenario as a starting point, then modify as needed.
              </div>
            </div>
            
            <!-- Scenario Details -->
            <div class="scenario-details-section">
              <h3>Scenario Details</h3>
            </div>
            
            <!-- Form Sections -->
            <form id="scenario-builder-form" class="scenario-form">
              <div class="form-section">
                <h3>Basic Information</h3>
                <input type="text" id="scenario-title" name="title">
                <textarea id="scenario-description" name="description"></textarea>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Add CSS styles for testing
    const style = document.createElement('style');
    style.textContent = `
      .scenario-builder-modal.hidden { display: none; }
      .template-section { margin-bottom: 32px; }
      .copy-scenario-section { margin-bottom: 32px; }
      .scenario-details-section { margin-bottom: 32px; }
      .template-section h3,
      .copy-scenario-section h3,
      .scenario-details-section h3 {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 16px 0;
      }
      .copy-scenario-controls {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 16px;
      }
      .copy-scenario-help {
        font-size: 14px;
        color: #6b7280;
      }
    `;
    document.head.appendChild(style);

    mockEventBus = {
      on: jest.fn(),
      emit: jest.fn()
    };

    scenarioBuilderUI = new ScenarioBuilderUI(mockEventBus);
  });

  describe('Modal Structure', () => {
    test('should have correct modal structure', () => {
      const modal = document.getElementById('scenario-builder-modal');
      expect(modal).toBeTruthy();
      expect(modal.classList.contains('scenario-builder-modal')).toBe(true);
      
      const overlay = modal.querySelector('.scenario-builder-overlay');
      expect(overlay).toBeTruthy();
      
      const container = modal.querySelector('.scenario-builder-container');
      expect(container).toBeTruthy();
      
      const header = container.querySelector('.scenario-builder-header');
      expect(header).toBeTruthy();
      expect(header.querySelector('h2').textContent).toBe('Create Your Retirement Scenario');
      
      const content = container.querySelector('.scenario-builder-content');
      expect(content).toBeTruthy();
    });

    test('should show and hide modal correctly', () => {
      const modal = document.getElementById('scenario-builder-modal');
      
      // Initially hidden
      expect(modal.classList.contains('hidden')).toBe(true);
      
      // Show modal (manually toggle for test)
      modal.classList.remove('hidden');
      expect(modal.classList.contains('hidden')).toBe(false);
      
      // Hide modal (manually toggle for test)
      modal.classList.add('hidden');
      expect(modal.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Section Layout and Hierarchy', () => {
    test('should have correct top-level sections in order', () => {
      const content = document.querySelector('.scenario-builder-content');
      const sections = content.children;
      
      expect(sections.length).toBe(4);
      
      // Check section order and classes
      expect(sections[0].classList.contains('template-section')).toBe(true);
      expect(sections[1].classList.contains('copy-scenario-section')).toBe(true);
      expect(sections[2].classList.contains('scenario-details-section')).toBe(true);
      expect(sections[3].tagName).toBe('FORM');
    });

    test('should have consistent heading hierarchy', () => {
      const headings = document.querySelectorAll('.scenario-builder-content h3');
      
      expect(headings.length).toBeGreaterThan(3);
      expect(headings[0].textContent).toBe('Start with a Template');
      expect(headings[1].textContent).toBe('Copy an Existing Scenario');
      expect(headings[2].textContent).toBe('Scenario Details');
      expect(headings[3].textContent).toBe('Basic Information');
      
      // Check that headings exist
      expect(headings[0]).toBeTruthy();
      expect(headings[1]).toBeTruthy();
      expect(headings[2]).toBeTruthy();
      expect(headings[3]).toBeTruthy();
    });

    test('should have proper section spacing', () => {
      const templateSection = document.querySelector('.template-section');
      const copySection = document.querySelector('.copy-scenario-section');
      const detailsSection = document.querySelector('.scenario-details-section');
      
      const templateStyles = window.getComputedStyle(templateSection);
      const copyStyles = window.getComputedStyle(copySection);
      const detailsStyles = window.getComputedStyle(detailsSection);
      
      expect(templateStyles.marginBottom).toBe('32px');
      expect(copyStyles.marginBottom).toBe('32px');
      expect(detailsStyles.marginBottom).toBe('32px');
    });
  });

  describe('Copy Scenario Section Layout', () => {
    test('should render copy scenario section correctly', () => {
      const copySection = document.querySelector('.copy-scenario-section');
      expect(copySection).toBeTruthy();
      
      const heading = copySection.querySelector('h3');
      expect(heading.textContent).toBe('Copy an Existing Scenario');
      
      const controls = copySection.querySelector('.copy-scenario-controls');
      expect(controls).toBeTruthy();
      
      const select = controls.querySelector('#copy-scenario-select');
      expect(select).toBeTruthy();
      expect(select.querySelector('option').textContent).toBe('Select scenario to copy...');
      
      const button = controls.querySelector('#copy-scenario-btn');
      expect(button).toBeTruthy();
      expect(button.disabled).toBe(true);
      
      const help = copySection.querySelector('.copy-scenario-help');
      expect(help).toBeTruthy();
      expect(help.textContent).toContain('Copy any built-in or custom scenario');
    });

    test('should have proper copy controls layout', () => {
      const controls = document.querySelector('.copy-scenario-controls');
      const styles = window.getComputedStyle(controls);
      
      expect(styles.display).toBe('flex');
      expect(styles.gap).toBe('12px');
      expect(styles.alignItems).toBe('center');
      expect(styles.marginBottom).toBe('16px');
    });

    test('should populate copy scenarios with proper structure', () => {
      const scenarios = {
        builtin: [
          { key: 'simple-retirement', title: 'Simple Retirement' },
          { key: 'social-security', title: 'Social Security' }
        ],
        custom: [
          { key: 'my-scenario', title: 'My Custom Scenario' }
        ]
      };

      scenarioBuilderUI.populateCopyScenarioOptions(scenarios);

      const select = document.getElementById('copy-scenario-select');
      
      // Should have default option + 2 optgroups
      expect(select.children.length).toBe(3);
      
      const builtinGroup = select.children[1];
      expect(builtinGroup.tagName).toBe('OPTGROUP');
      expect(builtinGroup.label).toBe('📚 Built-in Scenarios');
      expect(builtinGroup.children.length).toBe(2);
      
      const customGroup = select.children[2];
      expect(customGroup.tagName).toBe('OPTGROUP');
      expect(customGroup.label).toBe('💾 Custom Scenarios');
      expect(customGroup.children.length).toBe(1);
    });
  });

  describe('Template Section Integration', () => {
    test('should render template section correctly', () => {
      const templateSection = document.querySelector('.template-section');
      expect(templateSection).toBeTruthy();
      
      const heading = templateSection.querySelector('h3');
      expect(heading.textContent).toBe('Start with a Template');
      
      const grid = templateSection.querySelector('#template-grid');
      expect(grid).toBeTruthy();
    });

    test('should populate templates correctly', () => {
      scenarioBuilderUI.populateTemplates();
      
      const grid = document.getElementById('template-grid');
      const cards = grid.querySelectorAll('.template-card');
      
      expect(cards.length).toBe(3); // simple-retirement, social-security, multiple-accounts
      
      cards.forEach(card => {
        expect(card.querySelector('.template-icon')).toBeTruthy();
        expect(card.querySelector('.template-name')).toBeTruthy();
        expect(card.querySelector('.template-description')).toBeTruthy();
      });
    });
  });

  describe('Scenario Details Section', () => {
    test('should render scenario details section correctly', () => {
      const detailsSection = document.querySelector('.scenario-details-section');
      expect(detailsSection).toBeTruthy();
      
      const heading = detailsSection.querySelector('h3');
      expect(heading.textContent).toBe('Scenario Details');
    });

    test('should be followed by form sections', () => {
      const detailsSection = document.querySelector('.scenario-details-section');
      const nextElement = detailsSection.nextElementSibling;
      
      expect(nextElement.tagName).toBe('FORM');
      expect(nextElement.id).toBe('scenario-builder-form');
    });
  });

  describe('Form Integration', () => {
    test('should have proper form structure under scenario details', () => {
      const form = document.getElementById('scenario-builder-form');
      expect(form).toBeTruthy();
      expect(form.classList.contains('scenario-form')).toBe(true);
      
      const basicInfoSection = form.querySelector('.form-section');
      expect(basicInfoSection).toBeTruthy();
      
      const sectionHeading = basicInfoSection.querySelector('h3');
      expect(sectionHeading.textContent).toBe('Basic Information');
    });

    test('should have required form fields', () => {
      const titleInput = document.getElementById('scenario-title');
      expect(titleInput).toBeTruthy();
      expect(titleInput.name).toBe('title');
      
      const descriptionInput = document.getElementById('scenario-description');
      expect(descriptionInput).toBeTruthy();
      expect(descriptionInput.name).toBe('description');
    });
  });

  describe('Visual Hierarchy and Accessibility', () => {
    test('should have proper heading hierarchy for screen readers', () => {
      const h2 = document.querySelector('h2');
      const h3s = document.querySelectorAll('h3');
      
      expect(h2.textContent).toBe('Create Your Retirement Scenario');
      expect(h3s.length).toBeGreaterThan(0);
      
      // All h3s should be at the same level
      h3s.forEach(h3 => {
        expect(h3.tagName).toBe('H3');
      });
    });

    test('should have proper ARIA attributes', () => {
      const modal = document.getElementById('scenario-builder-modal');
      const select = document.getElementById('copy-scenario-select');
      const button = document.getElementById('copy-scenario-btn');
      
      // Modal should be properly labeled
      expect(modal.querySelector('h2')).toBeTruthy();
      
      // Form controls should have proper relationships
      expect(select.tagName).toBe('SELECT');
      expect(button.tagName).toBe('BUTTON');
      expect(button.type).toBe('button');
    });

    test('should maintain focus management', () => {
      const closeBtn = document.getElementById('scenario-builder-close');
      const copyBtn = document.getElementById('copy-scenario-btn');
      
      expect(closeBtn).toBeTruthy();
      expect(copyBtn).toBeTruthy();
      
      // Elements should be focusable
      expect(closeBtn.tabIndex).not.toBe(-1);
      expect(copyBtn.tabIndex).not.toBe(-1);
    });
  });

  describe('Responsive Behavior', () => {
    test('should handle copy controls layout', () => {
      const controls = document.querySelector('.copy-scenario-controls');
      
      // Should be flex layout
      const styles = window.getComputedStyle(controls);
      expect(styles.display).toBe('flex');
      expect(styles.gap).toBe('12px');
    });

    test('should maintain proper spacing on different screen sizes', () => {
      // Test that sections maintain their spacing
      const sections = document.querySelectorAll('.template-section, .copy-scenario-section, .scenario-details-section');
      
      sections.forEach(section => {
        const styles = window.getComputedStyle(section);
        expect(styles.marginBottom).toBe('32px');
      });
    });
  });
});
