/**
 * Scenario Builder UI - Visual form-based scenario configuration
 * Eliminates JSON barrier with user-friendly widgets and validation
 */

export class ScenarioBuilderUI {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentFormData = null;
    this.currentValidation = null;
    
    this.setupEventListeners();
    this.initializeElements();
    console.log('🎨 ScenarioBuilderUI created');
  }

  initialize() {
    console.log('✅ ScenarioBuilderUI initialized');
  }

  setupEventListeners() {
    // UI control events
    this.eventBus.on('scenario-builder:ui-show-builder', () => {
      this.showBuilder();
    });

    this.eventBus.on('scenario-builder:ui-hide-builder', () => {
      this.hideBuilder();
    });

    this.eventBus.on('scenario-builder:ui-load-form', (formData) => {
      this.loadFormData(formData);
    });

    this.eventBus.on('scenario-builder:ui-update-validation', (validation) => {
      this.updateValidation(validation);
    });

    this.eventBus.on('scenario-builder:ui-show-error', (error) => {
      this.showError(error.error);
    });
  }

  initializeElements() {
    this.createBuilderModal();
    // Event listeners will be set up after modal is added to DOM
  }

  createBuilderModal() {
    // Create modal container
    this.modal = document.createElement('div');
    this.modal.id = 'scenario-builder-modal';
    this.modal.className = 'scenario-builder-modal hidden';
    
    this.modal.innerHTML = `
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
            <div class="template-grid" id="template-grid">
              <!-- Templates will be populated here -->
            </div>
          </div>

          <!-- Form Sections -->
          <form id="scenario-builder-form" class="scenario-form">
            <!-- Basic Information -->
            <div class="form-section">
              <h3>Basic Information</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="scenario-title">Scenario Title *</label>
                  <input type="text" id="scenario-title" name="title" required>
                  <div class="field-error" id="title-error"></div>
                </div>
                <div class="form-group">
                  <label for="scenario-description">Description</label>
                  <textarea id="scenario-description" name="description" rows="2"></textarea>
                </div>
              </div>
            </div>

            <!-- Financial Plan -->
            <div class="form-section">
              <h3>Financial Plan</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="monthly-expenses">Monthly Expenses *</label>
                  <div class="input-with-prefix">
                    <span class="prefix">$</span>
                    <input type="number" id="monthly-expenses" name="monthlyExpenses" min="0" step="100" required>
                  </div>
                  <div class="field-help">How much you need per month in retirement</div>
                  <div class="field-error" id="monthlyExpenses-error"></div>
                </div>
                <div class="form-group">
                  <label for="duration-years">Retirement Duration</label>
                  <div class="input-with-suffix">
                    <input type="number" id="duration-years" name="durationYears" min="1" max="50" value="30">
                    <span class="suffix">years</span>
                  </div>
                  <div class="field-help">How long your retirement should last</div>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="inflation-rate">Annual Inflation Rate</label>
                  <div class="input-with-suffix">
                    <input type="number" id="inflation-rate" name="inflationRate" min="0" max="10" step="0.1" value="3">
                    <span class="suffix">%</span>
                  </div>
                  <div class="field-help">Expected yearly increase in expenses</div>
                </div>
                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" id="stop-on-shortfall" name="stopOnShortfall" checked>
                    Stop simulation when money runs out
                  </label>
                </div>
              </div>
            </div>

            <!-- Tax Configuration Section -->
            <div class="form-section">
              <h3>Tax Configuration</h3>
              <div class="form-help">
                Configure tax rates for different account types to get accurate withdrawal projections.
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="tax-deferred-rate">Tax-Deferred Accounts</label>
                  <div class="input-with-suffix">
                    <input type="number" id="tax-deferred-rate" name="taxDeferredRate" min="0" max="50" step="1" value="22">
                    <span class="suffix">%</span>
                  </div>
                  <div class="field-help">Tax rate for traditional 401k, IRA withdrawals</div>
                </div>
                <div class="form-group">
                  <label for="taxable-rate">Taxable Accounts</label>
                  <div class="input-with-suffix">
                    <input type="number" id="taxable-rate" name="taxableRate" min="0" max="50" step="1" value="15">
                    <span class="suffix">%</span>
                  </div>
                  <div class="field-help">Capital gains tax rate for brokerage accounts</div>
                </div>
                <div class="form-group">
                  <label for="tax-free-rate">Tax-Free Accounts</label>
                  <div class="input-with-suffix">
                    <input type="number" id="tax-free-rate" name="taxFreeRate" min="0" max="50" step="1" value="0" readonly>
                    <span class="suffix">%</span>
                  </div>
                  <div class="field-help">Tax rate for Roth IRA, Roth 401k (always 0%)</div>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group full-width">
                  <div class="tax-preset-buttons">
                    <button type="button" class="btn btn-outline btn-small" data-preset="conservative">Conservative (12%, 0%, 0%)</button>
                    <button type="button" class="btn btn-outline btn-small" data-preset="moderate">Moderate (22%, 15%, 0%)</button>
                    <button type="button" class="btn btn-outline btn-small" data-preset="high-earner">High Earner (32%, 20%, 0%)</button>
                  </div>
                  <div class="field-help">Quick presets based on common tax situations</div>
                </div>
              </div>
            </div>

            <!-- Assets Section -->
            <div class="form-section">
              <h3>Assets & Accounts</h3>
              <div id="assets-container">
                <!-- Asset forms will be populated here -->
              </div>
              <button type="button" class="add-btn" id="add-asset-btn">+ Add Asset</button>
            </div>

            <!-- Income Section -->
            <div class="form-section">
              <h3>Income Sources</h3>
              <div id="income-container">
                <!-- Income forms will be populated here -->
              </div>
              <button type="button" class="add-btn" id="add-income-btn">+ Add Income Source</button>
            </div>

            <!-- Validation Summary -->
            <div class="validation-summary" id="validation-summary">
              <!-- Validation results will appear here -->
            </div>
          </form>
        </div>

        <div class="scenario-builder-footer">
          <div class="footer-left">
            <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
          </div>
          <div class="footer-right">
            <button type="button" class="btn btn-outline" id="preview-btn">Preview</button>
            <button type="button" class="btn btn-primary" id="save-btn">Create Scenario</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.setupFormEventListeners();
    this.populateTemplates();
  }

  populateTemplates() {
    const templateGrid = document.getElementById('template-grid');
    
    // Get templates from service (we'll emit event to get them)
    const templates = {
      'simple-retirement': {
        name: 'Simple Retirement',
        description: 'Basic retirement with one investment account',
        icon: '🏠'
      },
      'social-security': {
        name: 'With Social Security',
        description: 'Retirement plan including Social Security benefits',
        icon: '🏛️'
      },
      'multiple-accounts': {
        name: 'Multiple Accounts',
        description: 'Complex scenario with 401k, IRA, and taxable accounts',
        icon: '📊'
      }
    };

    templateGrid.innerHTML = Object.entries(templates).map(([key, template]) => `
      <div class="template-card" data-template="${key}">
        <div class="template-icon">${template.icon}</div>
        <div class="template-name">${template.name}</div>
        <div class="template-description">${template.description}</div>
      </div>
    `).join('');
  }

  setupFormEventListeners() {
    // Close button
    document.getElementById('scenario-builder-close').addEventListener('click', () => {
      this.eventBus.emit('scenario-builder:close');
    });

    // Cancel button
    document.getElementById('cancel-btn').addEventListener('click', () => {
      this.eventBus.emit('scenario-builder:close');
    });

    // Template selection
    document.getElementById('template-grid').addEventListener('click', (e) => {
      const templateCard = e.target.closest('.template-card');
      if (templateCard) {
        const templateName = templateCard.dataset.template;
        this.eventBus.emit('scenario-builder:template-selected', templateName);
        
        // Visual feedback
        document.querySelectorAll('.template-card').forEach(card => {
          card.classList.remove('selected');
        });
        templateCard.classList.add('selected');
      }
    });

    // Add asset button
    document.getElementById('add-asset-btn').addEventListener('click', () => {
      console.log('🏗️ Add Asset button clicked');
      this.eventBus.emit('scenario-builder:add-asset');
    });

    // Add income button
    document.getElementById('add-income-btn').addEventListener('click', () => {
      console.log('🏗️ Add Income button clicked');
      this.eventBus.emit('scenario-builder:add-income');
    });

    // Save button
    document.getElementById('save-btn').addEventListener('click', () => {
      this.collectFormData();
      this.eventBus.emit('scenario-builder:save-scenario');
    });

    // Preview button
    document.getElementById('preview-btn').addEventListener('click', () => {
      this.collectFormData();
      this.eventBus.emit('scenario-builder:preview-scenario');
    });

    // Form change detection
    document.getElementById('scenario-builder-form').addEventListener('input', () => {
      this.collectFormData();
    });

    // Close on overlay click
    this.modal.querySelector('.scenario-builder-overlay').addEventListener('click', () => {
      this.eventBus.emit('scenario-builder:close');
    });

    // Tax preset buttons
    document.querySelectorAll('.tax-preset-buttons button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.target.dataset.preset;
        this.applyTaxPreset(preset);
      });
    });
  }

  showBuilder() {
    this.modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  hideBuilder() {
    this.modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  loadFormData(formData) {
    this.currentFormData = formData;
    
    // Load basic information
    document.getElementById('scenario-title').value = formData.title || '';
    document.getElementById('scenario-description').value = formData.description || '';
    document.getElementById('monthly-expenses').value = formData.monthlyExpenses || '';
    document.getElementById('duration-years').value = formData.durationYears || 30;
    document.getElementById('inflation-rate').value = formData.inflationRate || 3;
    document.getElementById('stop-on-shortfall').checked = formData.stopOnShortfall !== false;
    
    // Load tax configuration
    document.getElementById('tax-deferred-rate').value = formData.taxDeferredRate || 22;
    document.getElementById('taxable-rate').value = formData.taxableRate || 15;
    document.getElementById('tax-free-rate').value = formData.taxFreeRate || 0;

    // Load assets
    this.renderAssets(formData.assets || []);
    
    // Load income
    this.renderIncome(formData.income || []);
  }

  renderAssets(assets) {
    const container = document.getElementById('assets-container');
    container.innerHTML = assets.map((asset, index) => `
      <div class="asset-form" data-index="${index}">
        <div class="form-row">
          <div class="form-group">
            <label>Asset Name *</label>
            <input type="text" name="assets[${index}].name" value="${asset.name || ''}" required>
          </div>
          <div class="form-group">
            <label>Account Type</label>
            <select name="assets[${index}].type">
              <option value="taxable" ${asset.type === 'taxable' ? 'selected' : ''}>Taxable</option>
              <option value="tax_deferred" ${asset.type === 'tax_deferred' ? 'selected' : ''}>Tax-Deferred (401k, IRA)</option>
              <option value="tax_free" ${asset.type === 'tax_free' ? 'selected' : ''}>Tax-Free (Roth)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Investment Type</label>
            <select name="assets[${index}].investmentType">
              <option value="stocks" ${asset.investmentType === 'stocks' ? 'selected' : ''}>Stocks/Equities</option>
              <option value="bonds" ${asset.investmentType === 'bonds' ? 'selected' : ''}>Bonds</option>
              <option value="mixed" ${asset.investmentType === 'mixed' || !asset.investmentType ? 'selected' : ''}>Mixed Portfolio</option>
              <option value="savings" ${asset.investmentType === 'savings' ? 'selected' : ''}>Savings/Cash</option>
              <option value="cd" ${asset.investmentType === 'cd' ? 'selected' : ''}>Certificate of Deposit</option>
              <option value="money_market" ${asset.investmentType === 'money_market' ? 'selected' : ''}>Money Market</option>
              <option value="real_estate" ${asset.investmentType === 'real_estate' ? 'selected' : ''}>Real Estate/REITs</option>
            </select>
          </div>
          <div class="form-group">
            <button type="button" class="remove-btn" data-type="asset" data-index="${index}">Remove</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Starting Balance *</label>
            <div class="input-with-prefix">
              <span class="prefix">$</span>
              <input type="number" name="assets[${index}].balance" value="${asset.balance || ''}" min="0" step="1000" required>
            </div>
          </div>
          <div class="form-group">
            <label>Expected Return Rate</label>
            <div class="input-with-suffix">
              <input type="number" name="assets[${index}].returnRate" value="${asset.returnRate || 7}" min="0" max="50" step="0.1">
              <span class="suffix">%</span>
            </div>
          </div>
          <div class="form-group">
            <label>Withdrawal Order</label>
            <input type="number" name="assets[${index}].order" value="${asset.order || index + 1}" min="1" max="10">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" name="assets[${index}].marketDependent" ${asset.marketDependent !== false ? 'checked' : ''}>
              Subject to market volatility (Monte Carlo analysis)
            </label>
            <small class="help-text">When checked, this asset will show variable returns in Monte Carlo simulations. Uncheck for stable assets like savings accounts.</small>
          </div>
        </div>
      </div>
    `).join('');

    // Add event listeners for remove buttons
    container.querySelectorAll('.remove-btn[data-type="asset"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.eventBus.emit('scenario-builder:remove-asset', index);
      });
    });
  }

  renderIncome(income) {
    const container = document.getElementById('income-container');
    container.innerHTML = income.map((inc, index) => `
      <div class="income-form" data-index="${index}">
        <div class="form-row">
          <div class="form-group">
            <label>Income Source Name *</label>
            <input type="text" name="income[${index}].name" value="${inc.name || ''}" required>
          </div>
          <div class="form-group">
            <label>Monthly Amount *</label>
            <div class="input-with-prefix">
              <span class="prefix">$</span>
              <input type="number" name="income[${index}].amount" value="${inc.amount || ''}" min="0" step="100" required>
            </div>
          </div>
          <div class="form-group">
            <button type="button" class="remove-btn" data-type="income" data-index="${index}">Remove</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Start Month</label>
            <input type="number" name="income[${index}].startMonth" value="${inc.startMonth || 1}" min="1" max="600">
            <div class="field-help">Month when income begins (1 = first month)</div>
          </div>
          <div class="form-group">
            <label>Stop Month (Optional)</label>
            <input type="number" name="income[${index}].stopMonth" value="${inc.stopMonth || ''}" min="1" max="600">
            <div class="field-help">Leave blank for permanent income</div>
          </div>
        </div>
      </div>
    `).join('');

    // Add event listeners for remove buttons
    container.querySelectorAll('.remove-btn[data-type="income"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.eventBus.emit('scenario-builder:remove-income', index);
      });
    });
  }

  collectFormData() {
    const form = document.getElementById('scenario-builder-form');
    const formData = new FormData(form);
    
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      monthlyExpenses: parseFloat(formData.get('monthlyExpenses')) || 0,
      durationYears: parseInt(formData.get('durationYears')) || 30,
      inflationRate: parseFloat(formData.get('inflationRate')) || 3,
      stopOnShortfall: formData.get('stopOnShortfall') === 'on',
      taxDeferredRate: parseFloat(formData.get('taxDeferredRate')) || 22,
      taxableRate: parseFloat(formData.get('taxableRate')) || 15,
      taxFreeRate: parseFloat(formData.get('taxFreeRate')) || 0,
      assets: [],
      income: []
    };

    // Collect assets
    const assetForms = document.querySelectorAll('.asset-form');
    assetForms.forEach((assetForm, index) => {
      const asset = {
        name: assetForm.querySelector(`input[name="assets[${index}].name"]`).value,
        type: assetForm.querySelector(`select[name="assets[${index}].type"]`).value,
        investmentType: assetForm.querySelector(`select[name="assets[${index}].investmentType"]`).value,
        balance: parseFloat(assetForm.querySelector(`input[name="assets[${index}].balance"]`).value) || 0,
        returnRate: parseFloat(assetForm.querySelector(`input[name="assets[${index}].returnRate"]`).value) || 7,
        order: parseInt(assetForm.querySelector(`input[name="assets[${index}].order"]`).value) || index + 1,
        marketDependent: assetForm.querySelector(`input[name="assets[${index}].marketDependent"]`).checked
      };
      data.assets.push(asset);
    });

    // Collect income
    const incomeForms = document.querySelectorAll('.income-form');
    incomeForms.forEach((incomeForm, index) => {
      const income = {
        name: incomeForm.querySelector(`input[name="income[${index}].name"]`).value,
        amount: parseFloat(incomeForm.querySelector(`input[name="income[${index}].amount"]`).value) || 0,
        startMonth: parseInt(incomeForm.querySelector(`input[name="income[${index}].startMonth"]`).value) || 1,
        stopMonth: parseInt(incomeForm.querySelector(`input[name="income[${index}].stopMonth"]`).value) || null
      };
      if (income.name && income.amount > 0) {
        data.income.push(income);
      }
    });

    this.currentFormData = data;
    this.eventBus.emit('scenario-builder:form-changed', data);
  }

  updateValidation(validation) {
    this.currentValidation = validation;
    
    // Clear previous validation
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-group').forEach(el => el.classList.remove('error'));

    const summary = document.getElementById('validation-summary');
    
    if (validation.isValid) {
      summary.innerHTML = `
        <div class="validation-success">
          <strong>✓ Scenario looks good!</strong>
          <div class="withdrawal-rate">Withdrawal rate: ${validation.withdrawalRate}%</div>
        </div>
      `;
    } else {
      summary.innerHTML = `
        <div class="validation-errors">
          <strong>Please fix the following issues:</strong>
          <ul>
            ${validation.errors.map(error => `<li>${error}</li>`).join('')}
          </ul>
        </div>
        ${validation.warnings.length > 0 ? `
          <div class="validation-warnings">
            <strong>Warnings:</strong>
            <ul>
              ${validation.warnings.map(warning => `<li>${warning}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      `;
    }

    // Update button states
    const saveBtn = document.getElementById('save-btn');
    const previewBtn = document.getElementById('preview-btn');
    
    if (validation.isValid) {
      saveBtn.disabled = false;
      previewBtn.disabled = false;
    } else {
      saveBtn.disabled = true;
      previewBtn.disabled = true;
    }
  }

  applyTaxPreset(preset) {
    const presets = {
      'conservative': { taxDeferred: 12, taxable: 0, taxFree: 0 },
      'moderate': { taxDeferred: 22, taxable: 15, taxFree: 0 },
      'high-earner': { taxDeferred: 32, taxable: 20, taxFree: 0 }
    };

    const config = presets[preset];
    if (config) {
      document.getElementById('tax-deferred-rate').value = config.taxDeferred;
      document.getElementById('taxable-rate').value = config.taxable;
      document.getElementById('tax-free-rate').value = config.taxFree;
      
      // Trigger form change event
      this.collectFormData();
    }
  }

  showError(message) {
    const summary = document.getElementById('validation-summary');
    summary.innerHTML = `
      <div class="validation-errors">
        <strong>Error:</strong> ${message}
      </div>
    `;
  }
}
