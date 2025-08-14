/**
 * Story UI - Handles DOM interactions and UI updates for Story Mode
 * Translates UI events to event bus messages and updates UI based on story state
 */
export class StoryUI {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentStory = null;
    this.currentChapter = null;
    
    this.initializeElements();
    this.setupEventListeners();
    
    console.log('📚 StoryUI created');
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    // Story panel elements
    this.storyPanel = document.getElementById('story-panel');
    this.storySelector = document.getElementById('story-selector');
    this.storyExitBtn = document.getElementById('story-exit-btn');
    
    // Story introduction section
    this.introductionSection = document.getElementById('story-introduction-section');
    this.introductionText = document.getElementById('story-introduction-text');
    this.introductionDismiss = document.getElementById('story-introduction-dismiss');
    
    // Story error section
    this.errorSection = document.getElementById('story-error-section');
    this.errorText = document.getElementById('story-error-text');
    this.errorDismiss = document.getElementById('story-error-dismiss');
    
    // Story progress
    this.progressSection = document.getElementById('story-progress');
    this.progressFill = document.getElementById('chapter-progress');
    this.progressText = document.getElementById('chapter-counter');
    
    // Story content
    this.storyNarrative = document.getElementById('story-narrative');
    this.chapterTitle = document.getElementById('story-chapter-title');
    this.storyIntroduction = document.getElementById('story-introduction');
    this.storySetup = document.getElementById('story-setup');
    
    // Navigation buttons
    this.prevButton = document.getElementById('story-prev-btn');
    this.nextButton = document.getElementById('story-next-btn');
    this.runSimulationBtn = document.getElementById('story-run-simulation');
    
    // Results sections
    this.resultsSection = document.getElementById('story-results');
    this.insightsSection = document.getElementById('story-insights');
    this.takeawaySection = document.getElementById('story-takeaway');
    this.cliffhangerSection = document.getElementById('story-cliffhanger');

    console.log('📚 Story UI elements initialized:', {
      storyPanel: !!this.storyPanel,
      storySelector: !!this.storySelector,
      progressSection: !!this.progressSection,
      storyNarrative: !!this.storyNarrative
    });
  }

  /**
   * Setup event listeners for UI interactions
   */
  setupEventListeners() {
    // Story selection
    if (this.storySelector) {
      this.storySelector.addEventListener('change', (e) => {
        if (e.target.value) {
          this.eventBus.emit('story:select', e.target.value);
        }
      });
    }

    // Navigation buttons
    if (this.prevButton) {
      this.prevButton.addEventListener('click', () => {
        this.eventBus.emit('story:previous');
      });
    }

    if (this.nextButton) {
      this.nextButton.addEventListener('click', () => {
        this.eventBus.emit('story:next');
      });
    }

    // Run simulation button
    if (this.runSimulationBtn) {
      this.runSimulationBtn.addEventListener('click', () => {
        this.eventBus.emit('story:run-simulation');
      });
    }

    // Dismiss buttons
    if (this.introductionDismiss) {
      this.introductionDismiss.addEventListener('click', () => {
        this.hideIntroduction();
      });
    }

    if (this.errorDismiss) {
      this.errorDismiss.addEventListener('click', () => {
        this.hideError();
      });
    }

    // Story engine events
    this.eventBus.on('story-engine:story-loaded', (data) => this.handleStoryLoaded(data));
    this.eventBus.on('story-engine:chapter-changed', (data) => this.handleChapterChanged(data));
    this.eventBus.on('story-engine:simulation-completed', (data) => this.handleSimulationCompleted(data));
    this.eventBus.on('story-engine:story-completed', () => this.handleStoryCompleted());
    
    // Content loading events
    this.eventBus.on('stories:loaded', (stories) => this.populateStorySelector(stories));
  }

  /**
   * Populate the story selector dropdown
   * @param {Array} stories - Available stories
   */
  populateStorySelector(stories) {
    if (!this.storySelector) return;

    // Clear existing options
    this.storySelector.innerHTML = '<option value="">Choose Your Journey...</option>';

    stories.forEach(story => {
      const option = document.createElement('option');
      option.value = story.key;
      option.textContent = story.title || story.key;
      this.storySelector.appendChild(option);
    });

    console.log(`📚 Populated story selector with ${stories.length} stories`);
  }

  /**
   * Handle story loaded event
   * @param {Object} data - Story loaded data
   */
  handleStoryLoaded(data) {
    this.currentStory = data.story;
    
    // Show story introduction if available
    if (this.currentStory.metadata.introduction) {
      this.showIntroduction(this.currentStory.metadata.introduction);
    }

    // Update progress
    this.updateProgress(data.totalChapters, 1);
    
    // Hide results initially
    this.hideResults();
    
    console.log(`📚 Story loaded: ${data.story.metadata.title}`);
  }

  /**
   * Handle chapter changed event
   * @param {Object} data - Chapter change data
   */
  handleChapterChanged(data) {
    this.currentChapter = data.chapter;
    
    // Update chapter content
    this.updateChapterContent(data.chapter);
    
    // Update progress
    this.updateProgress(data.progress.total, data.progress.current);
    
    // Update navigation buttons
    this.updateNavigationButtons(data.chapterIndex, data.progress.total);
    
    // Hide results until simulation runs
    this.hideResults();
    
    console.log(`📚 Chapter changed: ${data.chapter.title}`);
  }

  /**
   * Handle simulation completed event
   * @param {Object} data - Simulation results data
   */
  handleSimulationCompleted(data) {
    // Show results section
    this.showResults();
    
    // Update insights with processed narrative
    this.eventBus.emit('story:request-processed-narrative');
    
    console.log(`📚 Simulation completed for chapter ${data.chapterIndex + 1}`);
  }

  /**
   * Handle story completed event
   */
  handleStoryCompleted() {
    // Show completion message
    this.showCompletionMessage();
    
    // Disable next button
    if (this.nextButton) {
      this.nextButton.disabled = true;
      this.nextButton.textContent = 'Story Complete';
    }
    
    console.log('📚 Story completed');
  }

  /**
   * Update chapter content in the UI
   * @param {Object} chapter - Chapter data
   */
  updateChapterContent(chapter) {
    // Update chapter title
    if (this.chapterTitle) {
      this.chapterTitle.textContent = chapter.title;
    }

    // Update introduction
    if (this.storyIntroduction && chapter.narrative?.introduction) {
      this.storyIntroduction.textContent = chapter.narrative.introduction;
    }

    // Update setup
    if (this.storySetup && chapter.narrative?.setup) {
      this.storySetup.textContent = chapter.narrative.setup;
    }

    // Show run simulation button
    if (this.runSimulationBtn) {
      this.runSimulationBtn.style.display = 'block';
      this.runSimulationBtn.disabled = false;
      this.runSimulationBtn.textContent = 'Run This Scenario';
    }
  }

  /**
   * Update processed narrative content (called after simulation)
   * @param {Object} narrative - Processed narrative content
   */
  updateProcessedNarrative(narrative) {
    // Update insights
    if (this.insightsSection && narrative.insights) {
      const insightsList = narrative.insights.map(insight => 
        `<li>${insight}</li>`
      ).join('');
      this.insightsSection.innerHTML = `<ul>${insightsList}</ul>`;
    }

    // Update key takeaway
    if (this.takeawaySection && narrative.key_takeaway) {
      this.takeawaySection.textContent = narrative.key_takeaway;
    }

    // Update cliffhanger
    if (this.cliffhangerSection && narrative.cliff_hanger) {
      this.cliffhangerSection.textContent = narrative.cliff_hanger;
    }
  }

  /**
   * Update progress indicator
   * @param {number} total - Total chapters
   * @param {number} current - Current chapter
   */
  updateProgress(total, current) {
    const percentage = Math.round((current / total) * 100);
    
    if (this.progressFill) {
      this.progressFill.style.width = `${percentage}%`;
    }
    
    if (this.progressText) {
      this.progressText.textContent = `Chapter ${current} of ${total}`;
    }
  }

  /**
   * Update navigation button states
   * @param {number} chapterIndex - Current chapter index (0-based)
   * @param {number} totalChapters - Total number of chapters
   */
  updateNavigationButtons(chapterIndex, totalChapters) {
    // Previous button
    if (this.prevButton) {
      this.prevButton.disabled = chapterIndex === 0;
    }

    // Next button
    if (this.nextButton) {
      this.nextButton.disabled = chapterIndex >= totalChapters - 1;
      this.nextButton.textContent = chapterIndex >= totalChapters - 1 ? 'Story Complete' : 'Next Chapter →';
    }
  }

  /**
   * Show story introduction
   * @param {string} introduction - Introduction text
   */
  showIntroduction(introduction) {
    if (this.introductionSection && this.introductionText) {
      this.introductionText.textContent = introduction;
      this.introductionSection.style.display = 'block';
    }
  }

  /**
   * Hide story introduction
   */
  hideIntroduction() {
    if (this.introductionSection) {
      this.introductionSection.style.display = 'none';
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    if (this.errorSection && this.errorText) {
      this.errorText.textContent = message;
      this.errorSection.style.display = 'block';
    }
  }

  /**
   * Hide error message
   */
  hideError() {
    if (this.errorSection) {
      this.errorSection.style.display = 'none';
    }
  }

  /**
   * Show results section
   */
  showResults() {
    if (this.resultsSection) {
      this.resultsSection.style.display = 'block';
    }
  }

  /**
   * Hide results section
   */
  hideResults() {
    if (this.resultsSection) {
      this.resultsSection.style.display = 'none';
    }
  }

  /**
   * Show completion message
   */
  showCompletionMessage() {
    // Could show a modal or special section for story completion
    console.log('📚 Story completion UI update');
  }

  /**
   * Reset UI to initial state
   */
  reset() {
    this.currentStory = null;
    this.currentChapter = null;
    
    // Reset selector
    if (this.storySelector) {
      this.storySelector.value = '';
    }
    
    // Hide sections
    this.hideIntroduction();
    this.hideError();
    this.hideResults();
    
    // Reset progress
    this.updateProgress(1, 0);
    
    // Clear content
    if (this.chapterTitle) this.chapterTitle.textContent = '';
    if (this.storyIntroduction) this.storyIntroduction.textContent = '';
    if (this.storySetup) this.storySetup.textContent = '';
    
    console.log('📚 Story UI reset');
  }
}
