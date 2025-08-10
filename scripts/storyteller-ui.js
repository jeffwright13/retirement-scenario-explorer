/**
 * Storyteller UI Extensions
 * Extends the existing UIManager to support story mode
 * Maintains separation of concerns - pure UI logic
 */

export class StorytellerUI {
  constructor(uiManager) {
    this.ui = uiManager; // Reference to existing UIManager
    this.storyElements = this.initializeStoryElements();
    this.setupStoryEventListeners();
  }

  // Initialize story-specific UI elements
  initializeStoryElements() {
    return {
      storyModeToggle: document.getElementById('story-mode-toggle'),
      storySelector: document.getElementById('story-selector'),
      storyPanel: document.getElementById('story-panel'),
      storyProgress: document.getElementById('story-progress'),
      storyNarrative: document.getElementById('story-narrative'),
      storyChapterTitle: document.getElementById('story-chapter-title'),
      storyIntroduction: document.getElementById('story-introduction'),
      storySetup: document.getElementById('story-setup'),
      storyKeyTakeaway: document.getElementById('story-key-takeaway'),
      storyTakeawaySection: document.getElementById('story-takeaway-section'),
      storyNavigation: document.getElementById('story-navigation'),
      storyPrevBtn: document.getElementById('story-prev-btn'),
      storyNextBtn: document.getElementById('story-next-btn'),
      storyExitBtn: document.getElementById('story-exit-btn'),
      chapterProgress: document.getElementById('chapter-progress'),
      chapterCounter: document.getElementById('chapter-counter')
    };
  }

  // Setup story-specific event listeners
  setupStoryEventListeners() {
    // These callbacks will be set by the main app
    this.onStoryStart = null;
    this.onStoryNext = null;
    this.onStoryPrevious = null;
    this.onStoryExit = null;
  }

  // Show story mode UI
  enterStoryMode() {
    console.log('🎭 Entering story mode UI');
    
    // Hide regular scenario selector
    if (this.ui.elements.gettingStartedPanel) {
      this.ui.elements.gettingStartedPanel.style.display = 'none';
    }
    
    // Show story panel
    if (this.storyElements.storyPanel) {
      this.storyElements.storyPanel.style.display = 'block';
      this.storyElements.storyPanel.classList.add('story-active');
    }

    // Update body class for story-specific styling
    document.body.classList.add('story-mode');
  }

  // Exit story mode UI
  exitStoryMode() {
    console.log('🎭 Exiting story mode UI');
    
    // Show regular scenario selector
    if (this.ui.elements.gettingStartedPanel) {
      this.ui.elements.gettingStartedPanel.style.display = 'block';
    }
    
    // Hide story panel
    if (this.storyElements.storyPanel) {
      this.storyElements.storyPanel.style.display = 'none';
      this.storyElements.storyPanel.classList.remove('story-active');
    }

    // Remove story mode styling
    document.body.classList.remove('story-mode');
    
    // Reset to normal UI state
    this.ui.resetToDefaultState();
  }

  // Populate story selector dropdown
  populateStorySelector(stories) {
    if (!this.storyElements.storySelector) return;

    this.storyElements.storySelector.innerHTML = '<option value="">Choose a Story...</option>';
    
    for (const [storyKey, storyMeta] of Object.entries(stories)) {
      const option = document.createElement('option');
      option.value = storyKey;
      option.textContent = `${storyMeta.title} (${storyMeta.chapterCount} chapters, ${storyMeta.duration})`;
      this.storyElements.storySelector.appendChild(option);
    }
  }

  // Update story chapter display
  updateChapterDisplay(chapterData) {
    if (!chapterData) return;

    // Update chapter title
    if (this.storyElements.storyChapterTitle) {
      this.storyElements.storyChapterTitle.textContent = chapterData.title;
    }

    // Update narrative content
    this.updateNarrativeContent(chapterData.narrative);

    // Update progress indicators
    this.updateStoryProgress(chapterData);

    // Update navigation buttons
    this.updateStoryNavigation(chapterData);

    // Show story content sections
    if (this.storyElements.storyNarrative) {
      this.storyElements.storyNarrative.style.display = 'block';
    }
    if (this.storyElements.storyProgress) {
      this.storyElements.storyProgress.style.display = 'block';
    }
    if (this.storyElements.storyNavigation) {
      this.storyElements.storyNavigation.style.display = 'flex';
    }

    // Hide takeaway initially
    if (this.storyElements.storyTakeawaySection) {
      this.storyElements.storyTakeawaySection.style.display = 'none';
    }
  }

  // Update narrative content sections
  updateNarrativeContent(narrative) {
    if (this.storyElements.storyIntroduction && narrative.introduction) {
      this.storyElements.storyIntroduction.textContent = narrative.introduction;
    }

    if (this.storyElements.storySetup && narrative.setup) {
      this.storyElements.storySetup.textContent = narrative.setup;
    }

    if (this.storyElements.storyKeyTakeaway && narrative.key_takeaway) {
      this.storyElements.storyKeyTakeaway.textContent = narrative.key_takeaway;
    }
  }

  // Update story progress indicators
  updateStoryProgress(chapterData) {
    // Chapter counter
    if (this.storyElements.chapterCounter) {
      this.storyElements.chapterCounter.textContent = 
        `Chapter ${chapterData.chapterNumber} of ${chapterData.totalChapters}`;
    }

    // Progress bar
    if (this.storyElements.chapterProgress) {
      const progressPercent = (chapterData.chapterNumber / chapterData.totalChapters) * 100;
      this.storyElements.chapterProgress.style.width = `${progressPercent}%`;
    }
  }

  // Update story navigation buttons
  updateStoryNavigation(chapterData) {
    // Previous button
    if (this.storyElements.storyPrevBtn) {
      this.storyElements.storyPrevBtn.disabled = chapterData.isFirstChapter;
      this.storyElements.storyPrevBtn.onclick = () => {
        if (this.onStoryPrevious) this.onStoryPrevious();
      };
    }

    // Next button
    if (this.storyElements.storyNextBtn) {
      if (chapterData.isLastChapter) {
        this.storyElements.storyNextBtn.textContent = 'Complete Story';
        this.storyElements.storyNextBtn.classList.add('btn-complete');
      } else {
        this.storyElements.storyNextBtn.textContent = 'Next Chapter';
        this.storyElements.storyNextBtn.classList.remove('btn-complete');
      }
      
      this.storyElements.storyNextBtn.onclick = () => {
        if (this.onStoryNext) this.onStoryNext();
      };
    }

    // Exit button
    if (this.storyElements.storyExitBtn) {
      this.storyElements.storyExitBtn.onclick = () => {
        if (this.onStoryExit) this.onStoryExit();
      };
    }
  }

  // Override insights display for story mode
  showStoryInsights(insights, chapterData) {
    if (!this.ui.elements.simulationInsights) return;

    // Use story-provided insights instead of hardcoded ones
    this.ui.elements.insightsList.innerHTML = '';
    
    insights.forEach(insight => {
      const li = document.createElement('li');
      li.textContent = insight;
      this.ui.elements.insightsList.appendChild(li);
    });

    // Add story-specific styling
    this.ui.elements.simulationInsights.classList.add('story-insights');
    this.ui.elements.simulationInsights.style.display = 'block';

    // Show the takeaway section after simulation
    if (this.storyElements.storyTakeawaySection) {
      this.storyElements.storyTakeawaySection.style.display = 'block';
    }
  }

  // Override next scenario suggestion for story mode
  showStoryNextAction(actionData) {
    if (!this.ui.elements.nextScenarioSuggestion || !actionData) return;

    const suggestion = this.ui.elements.nextScenarioSuggestion;
    
    // Update content based on story action type
    if (actionData.type === 'next_chapter') {
      this.ui.elements.nextScenarioDescription.textContent = actionData.description;
      this.ui.elements.loadNextScenarioBtn.textContent = actionData.action;
      this.ui.elements.loadNextScenarioBtn.onclick = () => {
        if (this.onStoryNext) this.onStoryNext();
      };
    } else if (actionData.type === 'story_complete') {
      this.ui.elements.nextScenarioDescription.textContent = actionData.description;
      this.ui.elements.loadNextScenarioBtn.textContent = actionData.action;
      this.ui.elements.loadNextScenarioBtn.onclick = () => {
        if (this.onStoryExit) this.onStoryExit();
      };
    }

    // Add story-specific styling
    suggestion.classList.add('story-action');
    suggestion.style.display = 'block';
  }

  // Hide story-specific elements when simulation runs
  hideStoryElements() {
    // Temporarily hide story narrative during simulation
    if (this.storyElements.storyNarrative) {
      this.storyElements.storyNarrative.classList.add('hidden-during-simulation');
    }
  }

  // Show story elements after simulation
  showStoryElements() {
    if (this.storyElements.storyNarrative) {
      this.storyElements.storyNarrative.classList.remove('hidden-during-simulation');
    }
  }

  // Event listener registration for external components
  onStoryModeToggle(callback) {
    if (this.storyElements.storyModeToggle) {
      this.storyElements.storyModeToggle.addEventListener('click', callback);
    }
  }

  onStorySelection(callback) {
    if (this.storyElements.storySelector) {
      this.storyElements.storySelector.addEventListener('change', callback);
    }
  }

  // Set story event callbacks
  setStoryCallbacks(callbacks) {
    this.onStoryStart = callbacks.onStoryStart;
    this.onStoryNext = callbacks.onStoryNext;
    this.onStoryPrevious = callbacks.onStoryPrevious; 
    this.onStoryExit = callbacks.onStoryExit;
  }

  // Get current story UI state
  getStoryUIState() {
    return {
      inStoryMode: document.body.classList.contains('story-mode'),
      selectedStory: this.storyElements.storySelector?.value || null,
      narrativeVisible: !this.storyElements.storyNarrative?.classList.contains('hidden-during-simulation')
    };
  }

  // Utility: Show story loading state
  setStoryLoading(isLoading) {
    if (this.storyElements.storyPanel) {
      if (isLoading) {
        this.storyElements.storyPanel.classList.add('loading');
      } else {
        this.storyElements.storyPanel.classList.remove('loading');
      }
    }
  }
}