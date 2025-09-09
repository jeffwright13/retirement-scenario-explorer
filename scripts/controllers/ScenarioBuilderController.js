/**
 * Scenario Builder Controller - Orchestrates visual scenario creation workflow
 * Follows strict event bus architecture for all data flow
 */

export class ScenarioBuilderController {
  constructor(eventBus, scenarioBuilderService, scenarioBuilderUI) {
    this.eventBus = eventBus;
    this.scenarioBuilderService = scenarioBuilderService;
    this.scenarioBuilderUI = scenarioBuilderUI;
    this.currentFormData = null;
    this.currentValidation = null;
    this.isBuilderOpen = false;
    
    this.setupEventListeners();
    console.log('🏗️ ScenarioBuilderController created');
  }

  initialize() {
    console.log('✅ ScenarioBuilderController initialized');
  }

  setupEventListeners() {
    // Builder lifecycle events
    this.eventBus.on('scenario-builder:open', (data) => {
      this.openBuilder(data);
    });

    this.eventBus.on('scenario-builder:close', () => {
      this.closeBuilder();
    });

    this.eventBus.on('scenario-builder:template-selected', (templateName) => {
      this.loadTemplate(templateName);
    });

    // Form data events
    this.eventBus.on('scenario-builder:form-changed', (formData) => {
      this.handleFormChange(formData);
    });

    this.eventBus.on('scenario-builder:save-scenario', () => {
      this.saveScenario();
    });

    this.eventBus.on('scenario-builder:preview-scenario', () => {
      this.previewScenario();
    });

    this.eventBus.on('scenario-builder:add-asset', () => {
      this.addAsset();
    });

    this.eventBus.on('scenario-builder:add-income', () => {
      this.addIncome();
    });

    // Service response events
    this.eventBus.on('scenario-builder:validation-result', (validation) => {
      this.currentValidation = validation;
      this.eventBus.emit('scenario-builder:ui-update-validation', validation);
    });

    this.eventBus.on('scenario-builder:template-loaded', (template) => {
      this.currentFormData = template.formData;
      this.eventBus.emit('scenario-builder:ui-load-form', template.formData);
      this.validateCurrentForm();
    });

    this.eventBus.on('scenario-builder:json-ready', (jsonScenario) => {
      this.handleJsonReady(jsonScenario);
    });

    this.eventBus.on('scenario-builder:conversion-error', (error) => {
      this.eventBus.emit('scenario-builder:ui-show-error', error);
    });

    // Integration with existing workflow
    this.eventBus.on('workflow:step-changed', (step) => {
      if (step.stepNumber === 1 && this.isBuilderOpen) {
        // Close builder if user navigates away from step 1
        this.closeBuilder();
      }
    });
  }

  /**
   * Open the scenario builder
   */
  openBuilder(data = {}) {
    console.log('🏗️ Opening scenario builder', data);
    this.isBuilderOpen = true;
    
    if (data.editScenario) {
      // Load existing scenario for editing
      this.loadExistingScenario(data.editScenario);
    } else if (data.template) {
      // Load specific template
      this.loadTemplate(data.template);
    } else {
      // Start with default template
      this.loadTemplate('simple-retirement');
    }

    this.eventBus.emit('scenario-builder:ui-show-builder');
  }

  /**
   * Close the scenario builder
   */
  closeBuilder() {
    console.log('🏗️ Closing scenario builder');
    this.isBuilderOpen = false;
    this.currentFormData = null;
    this.currentValidation = null;
    
    this.eventBus.emit('scenario-builder:ui-hide-builder');
  }

  /**
   * Load a template
   */
  loadTemplate(templateName) {
    console.log('🏗️ Loading template:', templateName);
    this.eventBus.emit('scenario-builder:load-template', templateName);
  }

  /**
   * Load existing scenario for editing
   */
  loadExistingScenario(scenarioData) {
    console.log('🏗️ Loading existing scenario for editing');
    // Convert JSON scenario to form data
    this.eventBus.emit('scenario-builder:convert-json-to-form', scenarioData);
  }

  /**
   * Handle form data changes
   */
  handleFormChange(formData) {
    this.currentFormData = formData;
    this.validateCurrentForm();
  }

  /**
   * Validate current form data
   */
  validateCurrentForm() {
    if (this.currentFormData) {
      this.eventBus.emit('scenario-builder:validate-form', this.currentFormData);
    }
  }

  /**
   * Save the scenario
   */
  saveScenario() {
    if (!this.currentFormData) {
      this.eventBus.emit('scenario-builder:ui-show-error', { 
        error: 'No scenario data to save' 
      });
      return;
    }

    if (!this.currentValidation?.isValid) {
      this.eventBus.emit('scenario-builder:ui-show-error', { 
        error: 'Please fix validation errors before saving' 
      });
      return;
    }

    console.log('🏗️ Saving scenario');
    this.eventBus.emit('scenario-builder:convert-to-json', this.currentFormData);
  }

  /**
   * Preview the scenario (convert and run simulation)
   */
  previewScenario() {
    if (!this.currentFormData) {
      this.eventBus.emit('scenario-builder:ui-show-error', { 
        error: 'No scenario data to preview' 
      });
      return;
    }

    if (!this.currentValidation?.isValid) {
      this.eventBus.emit('scenario-builder:ui-show-error', { 
        error: 'Please fix validation errors before previewing' 
      });
      return;
    }

    console.log('🏗️ Previewing scenario');
    // Convert to JSON and run simulation
    this.eventBus.emit('scenario-builder:convert-to-json', this.currentFormData);
  }

  /**
   * Handle JSON conversion completion
   */
  handleJsonReady(jsonScenario) {
    console.log('🏗️ JSON scenario ready:', jsonScenario);
    
    // Generate unique key for the scenario
    const timestamp = Date.now();
    const title = jsonScenario.metadata?.title || jsonScenario.title || 'Custom Scenario';
    const scenarioKey = `custom_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}`;
    
    // Save as custom scenario
    this.eventBus.emit('content:save-user-scenario', {
      key: scenarioKey,
      scenario: jsonScenario
    });

    // Select the new scenario
    this.eventBus.emit('scenario:select', scenarioKey);

    // Close the builder
    this.closeBuilder();

    // Show success message
    this.eventBus.emit('ui:show-notification', {
      type: 'success',
      message: `Scenario "${jsonScenario.title}" created successfully!`
    });

    // Advance to next workflow step
    this.eventBus.emit('workflow:advance-step');
  }

  /**
   * Get current builder state
   */
  getState() {
    return {
      isOpen: this.isBuilderOpen,
      formData: this.currentFormData,
      validation: this.currentValidation
    };
  }

  /**
   * Add asset to current form
   */
  addAsset() {
    console.log('🏗️ Adding new asset');
    if (!this.currentFormData) {
      console.log('❌ No current form data');
      return;
    }

    const newAsset = {
      name: `Asset ${this.currentFormData.assets.length + 1}`,
      type: 'taxable',
      balance: 100000,
      returnRate: 7,
      order: this.currentFormData.assets.length + 1
    };

    this.currentFormData.assets.push(newAsset);
    console.log('✅ Asset added, total assets:', this.currentFormData.assets.length);
    this.eventBus.emit('scenario-builder:ui-load-form', this.currentFormData);
    this.validateCurrentForm();
  }

  /**
   * Remove asset from current form
   */
  removeAsset(index) {
    if (!this.currentFormData || !this.currentFormData.assets) return;

    this.currentFormData.assets.splice(index, 1);
    
    // Reorder remaining assets
    this.currentFormData.assets.forEach((asset, i) => {
      asset.order = i + 1;
    });

    this.eventBus.emit('scenario-builder:ui-load-form', this.currentFormData);
    this.validateCurrentForm();
  }

  /**
   * Add income source to current form
   */
  addIncome() {
    console.log('🏗️ Adding new income');
    if (!this.currentFormData) {
      console.log('❌ No current form data');
      return;
    }

    const newIncome = {
      name: `Income ${this.currentFormData.income.length + 1}`,
      amount: 2000,
      startMonth: 1
    };

    this.currentFormData.income.push(newIncome);
    console.log('✅ Income added, total income sources:', this.currentFormData.income.length);
    this.eventBus.emit('scenario-builder:ui-load-form', this.currentFormData);
    this.validateCurrentForm();
  }

  /**
   * Remove income source from current form
   */
  removeIncome(index) {
    if (!this.currentFormData || !this.currentFormData.income) return;

    this.currentFormData.income.splice(index, 1);
    this.eventBus.emit('scenario-builder:ui-load-form', this.currentFormData);
    this.validateCurrentForm();
  }
}
