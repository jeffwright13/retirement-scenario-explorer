/**
 * Mode Controller - Manages switching between Scenario and Story modes
 * Implements clean mode transitions without overlays
 */
export class ModeController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentMode = 'scenario'; // Default to scenario mode
    
    this.setupEventListeners();
    this.initializeUI();
    
    console.log('🎭 ModeController created');
  }

  /**
   * Initialize the mode controller
   */
  initialize() {
    console.log('🎭 Initializing Mode Controller');
    
    // Ensure UI elements are available before setting mode
    if (!this.scenarioContainer || !this.storyContainer) {
      console.warn('🎭 UI containers not found, re-initializing elements');
      this.initializeUI();
    }
    
    // Set initial mode and force UI update
    this.currentMode = null; // Reset to force update
    this.setMode('scenario');
    
    console.log('✅ Mode Controller initialized');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Mode switching events
    this.eventBus.on('mode:switch-to-scenario', () => this.setMode('scenario'));
    this.eventBus.on('mode:switch-to-story', () => this.setMode('story'));
    this.eventBus.on('mode:toggle', () => this.toggleMode());
    
    // Legacy story events for compatibility
    this.eventBus.on('story:exit', () => this.setMode('scenario'));
  }

  /**
   * Initialize UI elements and click handlers
   */
  initializeUI() {
    // Get mode toggle buttons
    this.scenarioModeBtn = document.getElementById('scenario-mode-btn');
    this.storyModeBtn = document.getElementById('story-mode-btn');
    
    // Get mode containers
    this.scenarioContainer = document.getElementById('scenario-mode-container');
    this.storyContainer = document.getElementById('story-mode-container');
    
    // Legacy story exit button
    this.storyExitBtn = document.getElementById('story-exit-btn');
    
    // Setup click handlers
    if (this.scenarioModeBtn) {
      this.scenarioModeBtn.addEventListener('click', () => {
        this.eventBus.emit('mode:switch-to-scenario');
      });
    }
    
    if (this.storyModeBtn) {
      this.storyModeBtn.addEventListener('click', () => {
        this.eventBus.emit('mode:switch-to-story');
      });
    }
    
    if (this.storyExitBtn) {
      this.storyExitBtn.addEventListener('click', () => {
        this.eventBus.emit('mode:switch-to-scenario');
      });
    }
    
    // Debug: Log which elements were found
    console.log('🎭 Mode UI elements initialized:', {
      scenarioModeBtn: !!this.scenarioModeBtn,
      storyModeBtn: !!this.storyModeBtn,
      scenarioContainer: !!this.scenarioContainer,
      storyContainer: !!this.storyContainer,
      storyExitBtn: !!this.storyExitBtn
    });
  }

  /**
   * Set the current mode
   * @param {string} mode - 'scenario' or 'story'
   */
  setMode(mode) {
    if (mode === this.currentMode) {
      console.log(`🎭 Already in ${mode} mode, forcing UI update`);
      this.updateModeUI(); // Force UI update even if same mode
      return;
    }
    
    console.log(`🎭 Switching to ${mode} mode`);
    
    const previousMode = this.currentMode;
    this.currentMode = mode;
    
    // Update UI
    this.updateModeUI();
    
    // Emit mode change events
    this.eventBus.emit('mode:changed', {
      previousMode,
      currentMode: mode
    });
    
    if (mode === 'scenario') {
      this.eventBus.emit('mode:scenario-entered');
    } else if (mode === 'story') {
      this.eventBus.emit('mode:story-entered');
    }
  }

  /**
   * Toggle between modes
   */
  toggleMode() {
    const newMode = this.currentMode === 'scenario' ? 'story' : 'scenario';
    this.setMode(newMode);
  }

  /**
   * Update the UI to reflect the current mode
   */
  updateModeUI() {
    // Update button states
    if (this.scenarioModeBtn && this.storyModeBtn) {
      this.scenarioModeBtn.classList.toggle('btn--mode-active', this.currentMode === 'scenario');
      this.storyModeBtn.classList.toggle('btn--mode-active', this.currentMode === 'story');
    }
    
    // Update container visibility
    if (this.scenarioContainer && this.storyContainer) {
      this.scenarioContainer.classList.toggle('active', this.currentMode === 'scenario');
      this.storyContainer.classList.toggle('active', this.currentMode === 'story');
    }
    
    // Update body class for any remaining CSS dependencies
    document.body.classList.toggle('scenario-mode', this.currentMode === 'scenario');
    document.body.classList.toggle('story-mode', this.currentMode === 'story');
    
    console.log(`🎭 UI updated for ${this.currentMode} mode`);
  }

  /**
   * Get the current mode
   * @returns {string} Current mode ('scenario' or 'story')
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Check if currently in scenario mode
   * @returns {boolean}
   */
  isScenarioMode() {
    return this.currentMode === 'scenario';
  }

  /**
   * Check if currently in story mode
   * @returns {boolean}
   */
  isStoryMode() {
    return this.currentMode === 'story';
  }
}
