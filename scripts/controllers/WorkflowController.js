/**
 * WorkflowController - Manages guided workflow progression via EventBus
 * Maintains strict EventBus architecture compliance
 */

export class WorkflowController {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentStep = 1;
    this.completedSteps = new Set();
    this.stepStates = {
      1: { status: 'active', unlocked: true },
      2: { status: 'locked', unlocked: false },
      3: { status: 'locked', unlocked: false }
    };
    
    console.log('🔄 WorkflowController created');
  }

  /**
   * Initialize the WorkflowController
   */
  initialize() {
    console.log('🔄 Initializing WorkflowController');
    
    this.setupEventListeners();
    this.setupUIEventListeners();
    this.updateWorkflowDisplay();
    
    console.log('✅ WorkflowController initialized');
  }

  /**
   * Set up EventBus event listeners
   */
  setupEventListeners() {
    // Listen for scenario selection completion
    this.eventBus.on('scenario:selected', (data) => {
      this.handleScenarioSelected(data);
    });

    // Listen for simulation completion
    this.eventBus.on('simulation:completed', (data) => {
      if (!data?.context?.isMonteCarlo) {
        this.handleSimulationCompleted(data);
      }
    });

    // Listen for Monte Carlo completion
    this.eventBus.on('montecarlo:analysis-completed', (data) => {
      this.handleMonteCarloCompleted(data);
    });

    // Listen for workflow step activation requests
    this.eventBus.on('workflow:activate-step', (data) => {
      this.activateStep(data.step);
    });
  }

  /**
   * Set up UI event listeners for workflow step clicks
   */
  setupUIEventListeners() {
    // Add click listeners to workflow steps
    for (let step = 1; step <= 3; step++) {
      const stepElement = document.getElementById(`workflow-step-${step}`);
      if (stepElement) {
        stepElement.addEventListener('click', () => {
          if (this.stepStates[step].unlocked) {
            this.activateStep(step);
          }
        });
      }
    }

    // Step navigation buttons
    this.setupStepNavigationButtons();
  }

  /**
   * Set up step navigation button event listeners
   */
  setupStepNavigationButtons() {
    // Step 1 navigation
    const step1Next = document.getElementById('step-1-next');
    if (step1Next) {
      step1Next.addEventListener('click', () => {
        if (this.stepStates[2].unlocked) {
          this.activateStep(2);
        }
      });
    }

    // Step 2 navigation
    const step2Prev = document.getElementById('step-2-prev');
    const step2Next = document.getElementById('step-2-next');
    
    if (step2Prev) {
      step2Prev.addEventListener('click', () => {
        this.activateStep(1);
      });
    }
    
    if (step2Next) {
      step2Next.addEventListener('click', () => {
        if (this.stepStates[3].unlocked) {
          this.activateStep(3);
        }
      });
    }

    // Step 3 navigation
    const step3Prev = document.getElementById('step-3-prev');
    const step3Complete = document.getElementById('step-3-complete');
    
    if (step3Prev) {
      step3Prev.addEventListener('click', () => {
        this.activateStep(2);
      });
    }
    
    if (step3Complete) {
      step3Complete.addEventListener('click', () => {
        this.handleWorkflowComplete();
      });
    }
  }

  /**
   * Handle scenario selection - unlocks step 2
   */
  handleScenarioSelected(data) {
    console.log('🔄 WorkflowController: Scenario selected, unlocking step 2');
    
    this.completeStep(1);
    this.unlockStep(2);
    this.updateGuidanceText('Great! Now test your scenario to see how it performs.');
    
    // Enable step 1 next button
    const step1Next = document.getElementById('step-1-next');
    if (step1Next) {
      step1Next.disabled = false;
    }
    
    // Emit workflow progression event
    this.eventBus.emit('workflow:step-completed', {
      step: 1,
      nextStep: 2,
      completedSteps: Array.from(this.completedSteps)
    });
  }

  /**
   * Handle simulation completion - unlocks step 3
   */
  handleSimulationCompleted(data) {
    console.log('🔄 WorkflowController: Simulation completed, unlocking step 3');
    
    this.completeStep(2);
    this.unlockStep(3);
    this.updateGuidanceText('Excellent! Now run Monte Carlo analysis to understand your risk.');
    
    // Enable step 2 next button
    const step2Next = document.getElementById('step-2-next');
    if (step2Next) {
      step2Next.disabled = false;
    }
    
    // Emit workflow progression event
    this.eventBus.emit('workflow:step-completed', {
      step: 2,
      nextStep: 3,
      completedSteps: Array.from(this.completedSteps)
    });
  }

  /**
   * Handle Monte Carlo completion - workflow complete
   */
  handleMonteCarloCompleted(data) {
    console.log('🔄 WorkflowController: Monte Carlo completed, workflow finished');
    
    this.completeStep(3);
    this.updateGuidanceText('🎉 Complete! You\'ve analyzed your retirement scenario from all angles.');
    
    // Enable step 3 complete button
    const step3Complete = document.getElementById('step-3-complete');
    if (step3Complete) {
      step3Complete.disabled = false;
    }
    
    // Emit workflow completion event
    this.eventBus.emit('workflow:completed', {
      completedSteps: Array.from(this.completedSteps)
    });
  }

  /**
   * Complete a workflow step
   */
  completeStep(step) {
    this.completedSteps.add(step);
    this.stepStates[step].status = 'completed';
    this.updateStepDisplay(step);
    this.updateProgressBar();
  }

  /**
   * Unlock a workflow step
   */
  unlockStep(step) {
    this.stepStates[step].unlocked = true;
    this.stepStates[step].status = 'unlocked';
    this.updateStepDisplay(step);
    
    // Emit step unlocked event
    this.eventBus.emit('workflow:step-unlocked', {
      step: step,
      stepStates: { ...this.stepStates }
    });
  }

  /**
   * Activate a workflow step (navigate to it)
   */
  activateStep(step) {
    if (!this.stepStates[step].unlocked) {
      console.warn(`🔄 Cannot activate locked step ${step}`);
      return;
    }

    console.log(`🔄 Activating workflow step ${step}`);
    
    // Update current step
    const previousStep = this.currentStep;
    this.currentStep = step;
    
    // Update step displays
    this.updateAllStepDisplays();
    this.showStepPanel(step);
    
    // Update guidance based on step
    this.updateGuidanceForStep(step);
    
    // Emit step activation event
    this.eventBus.emit('workflow:step-activated', {
      step: step,
      previousStep: previousStep,
      stepStates: { ...this.stepStates }
    });
  }

  /**
   * Update display for a specific step
   */
  updateStepDisplay(step) {
    const stepElement = document.getElementById(`workflow-step-${step}`);
    const statusElement = document.getElementById(`step-${step}-status`);
    
    if (!stepElement || !statusElement) return;

    const state = this.stepStates[step];
    
    // Remove all status classes
    stepElement.classList.remove('active', 'completed', 'locked');
    
    // Add appropriate classes
    if (step === this.currentStep && state.unlocked) {
      stepElement.classList.add('active');
    } else if (this.completedSteps.has(step)) {
      stepElement.classList.add('completed');
    } else if (!state.unlocked) {
      stepElement.classList.add('locked');
    }
    
    // Update status indicator
    const statusIndicator = statusElement.querySelector('.status-indicator');
    if (statusIndicator) {
      if (this.completedSteps.has(step)) {
        statusIndicator.textContent = '✅';
        statusIndicator.className = 'status-indicator completed';
      } else if (step === this.currentStep && state.unlocked) {
        statusIndicator.textContent = '🔄';
        statusIndicator.className = 'status-indicator in-progress';
      } else if (state.unlocked) {
        statusIndicator.textContent = '⏸️';
        statusIndicator.className = 'status-indicator pending';
      } else {
        statusIndicator.textContent = '🔒';
        statusIndicator.className = 'status-indicator locked';
      }
    }
  }

  /**
   * Update all step displays
   */
  updateAllStepDisplays() {
    for (let step = 1; step <= 3; step++) {
      this.updateStepDisplay(step);
    }
  }

  /**
   * Show the panel for a specific step
   */
  showStepPanel(step) {
    // Hide all panels
    for (let i = 1; i <= 3; i++) {
      const panel = document.getElementById(`step-${i}-panel`);
      if (panel) {
        panel.classList.remove('active');
      }
    }
    
    // Show target panel
    const targetPanel = document.getElementById(`step-${step}-panel`);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }
  }

  /**
   * Update progress bar
   */
  updateProgressBar() {
    const progressFill = document.getElementById('workflow-progress-fill');
    if (progressFill) {
      const progress = (this.completedSteps.size / 3) * 100;
      progressFill.style.width = `${progress}%`;
    } else {
      console.warn('🔄 Progress fill element not found');
    }
  }

  /**
   * Update guidance text
   */
  updateGuidanceText(text) {
    const guidanceElement = document.querySelector('.guidance-text');
    if (guidanceElement) {
      guidanceElement.innerHTML = text;
    }
  }

  /**
   * Update guidance for specific step
   */
  updateGuidanceForStep(step) {
    const guidanceTexts = {
      1: '🎯 <strong>Step 1:</strong> Choose a scenario that matches your retirement situation.',
      2: '📊 <strong>Step 2:</strong> Run the analysis to see your month-by-month projection.',
      3: '🎲 <strong>Step 3:</strong> Test against market volatility with Monte Carlo analysis.'
    };
    
    this.updateGuidanceText(guidanceTexts[step] || '');
  }

  /**
   * Initialize workflow display
   */
  updateWorkflowDisplay() {
    this.updateAllStepDisplays();
    this.updateProgressBar();
    this.showStepPanel(this.currentStep);
    this.updateGuidanceForStep(this.currentStep);
  }

  /**
   * Handle workflow completion
   */
  handleWorkflowComplete() {
    console.log('🎉 WorkflowController: User acknowledged workflow completion');
    
    // Emit completion acknowledgment event
    this.eventBus.emit('workflow:completion-acknowledged', {
      completedSteps: Array.from(this.completedSteps),
      timestamp: Date.now()
    });
    
    // Update guidance to suggest next actions
    this.updateGuidanceText('🎉 Great job! Try different scenarios or export your results.');
  }

  /**
   * Get current workflow state (for debugging/export)
   */
  getWorkflowState() {
    return {
      currentStep: this.currentStep,
      completedSteps: Array.from(this.completedSteps),
      stepStates: { ...this.stepStates }
    };
  }
}
