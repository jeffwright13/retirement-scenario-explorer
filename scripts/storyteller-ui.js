/**
 * Enhanced Storyteller UI Extensions
 * Now supports story introductions and improved error handling
 * Maintains all existing functionality with new features
 */

export class StorytellerUI {
  constructor(uiManager) {
    this.ui = uiManager;
    this.storyElements = this.initializeStoryElements();
    this.setupStoryEventListeners();
  }

  // Initialize story-specific UI elements (enhanced)
  initializeStoryElements() {
    return {
      // Existing elements
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
      chapterCounter: document.getElementById('chapter-counter'),

      // NEW: Introduction elements (we'll add these to the HTML)
      storyIntroductionSection: document.getElementById('story-introduction-section'),
      storyIntroductionText: document.getElementById('story-introduction-text'),
      storyIntroductionDismiss: document.getElementById('story-introduction-dismiss'),

      // NEW: Error handling elements
      storyErrorSection: document.getElementById('story-error-section'),
      storyErrorText: document.getElementById('story-error-text'),
      storyErrorDismiss: document.getElementById('story-error-dismiss')
    };
  }

  // Setup story-specific event listeners (enhanced)
  setupStoryEventListeners() {
    // Existing callbacks
    this.onStoryStart = null;
    this.onStoryNext = null;
    this.onStoryPrevious = null;
    this.onStoryExit = null;

    // NEW: Introduction dismiss handler
    if (this.storyElements.storyIntroductionDismiss) {
      this.storyElements.storyIntroductionDismiss.addEventListener('click', () => {
        this.hideStoryIntroduction();
      });
    }

    // NEW: Error dismiss handler
    if (this.storyElements.storyErrorDismiss) {
      this.storyElements.storyErrorDismiss.addEventListener('click', () => {
        this.hideScenarioError();
      });
    }
  }

  // Show story mode UI (unchanged)
  enterStoryMode() {
    console.log('🎭 Entering story mode UI');

    if (this.ui.elements.gettingStartedPanel) {
      this.ui.elements.gettingStartedPanel.style.display = 'none';
    }

    if (this.storyElements.storyPanel) {
      this.storyElements.storyPanel.style.display = 'block';
      this.storyElements.storyPanel.classList.add('story-active');
    }

    document.body.classList.add('story-mode');
  }

  // Exit story mode UI (enhanced cleanup)
  exitStoryMode() {
    console.log('🎭 Exiting story mode UI');

    // Hide all story elements
    this.hideStoryIntroduction();
    this.hideScenarioError();
    this.hideStoryScenarioDetails();

    if (this.ui.elements.gettingStartedPanel) {
      this.ui.elements.gettingStartedPanel.style.display = 'block';
    }

    if (this.storyElements.storyPanel) {
      this.storyElements.storyPanel.style.display = 'none';
      this.storyElements.storyPanel.classList.remove('story-active');
    }

    document.body.classList.remove('story-mode');
    this.ui.resetToDefaultState();
  }

  // NEW: Display story metadata (description, author, etc.)
  displayStoryMetadata(metadata) {
    if (!metadata) return;
    
    console.log('📖 Displaying story metadata:', metadata.title);
    
    // Update story panel header with title and description
    const storyHeader = this.storyElements.storyPanel?.querySelector('.story-header h3');
    if (storyHeader && metadata.title) {
      storyHeader.textContent = `📚 ${metadata.title}`;
    }
    
    // Show description if available
    if (metadata.description) {
      // Create or update description element
      let descriptionElement = this.storyElements.storyPanel?.querySelector('.story-description');
      if (!descriptionElement) {
        descriptionElement = document.createElement('div');
        descriptionElement.className = 'story-description';
        descriptionElement.style.cssText = 'margin: 1rem 0; padding: 1rem; background: rgba(255,255,255,0.1); border-radius: 6px; font-style: italic;';
        
        // Insert after story header
        const storyHeader = this.storyElements.storyPanel?.querySelector('.story-header');
        if (storyHeader) {
          storyHeader.insertAdjacentElement('afterend', descriptionElement);
        }
      }
      descriptionElement.textContent = metadata.description;
    }
    
    // Show additional metadata (author, duration, difficulty)
    if (metadata.author || metadata.estimated_duration || metadata.difficulty) {
      let metaElement = this.storyElements.storyPanel?.querySelector('.story-meta');
      if (!metaElement) {
        metaElement = document.createElement('div');
        metaElement.className = 'story-meta';
        metaElement.style.cssText = 'margin: 0.5rem 0; font-size: 0.9em; opacity: 0.9;';
        
        const descElement = this.storyElements.storyPanel?.querySelector('.story-description');
        if (descElement) {
          descElement.insertAdjacentElement('afterend', metaElement);
        }
      }
      
      const metaParts = [];
      if (metadata.author) metaParts.push(`👤 ${metadata.author}`);
      if (metadata.estimated_duration) metaParts.push(`⏱️ ${metadata.estimated_duration}`);
      if (metadata.difficulty) metaParts.push(`📊 ${metadata.difficulty}`);
      
      metaElement.textContent = metaParts.join(' • ');
    }
  }

  // NEW: Display chapter content (introduction, setup, insights, etc.)
  displayChapterContent(chapter) {
    if (!chapter || !chapter.narrative) return;
    
    console.log('📖 Displaying chapter content:', chapter.title);
    
    const narrative = chapter.narrative;
    
    // Update chapter title
    if (this.storyElements.storyChapterTitle) {
      this.storyElements.storyChapterTitle.textContent = chapter.title;
    }
    
    // Create or update chapter content area
    let chapterContentArea = this.storyElements.storyPanel?.querySelector('.chapter-content');
    if (!chapterContentArea) {
      chapterContentArea = document.createElement('div');
      chapterContentArea.className = 'chapter-content';
      chapterContentArea.style.cssText = 'margin: 1.5rem 0; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 4px solid rgba(255,255,255,0.3);';
      
      // Insert before story navigation
      const storyNavigation = this.storyElements.storyNavigation;
      if (storyNavigation) {
        storyNavigation.insertAdjacentElement('beforebegin', chapterContentArea);
      }
    }
    
    // Build chapter content HTML
    let contentHTML = '';
    
    if (narrative.introduction) {
      contentHTML += `<div class="narrative-section">
        <h4>📖 Introduction</h4>
        <p style="line-height: 1.6; margin-bottom: 1rem;">${narrative.introduction}</p>
      </div>`;
    }
    
    if (narrative.setup) {
      contentHTML += `<div class="narrative-section">
        <h4>⚙️ Setup</h4>
        <p style="line-height: 1.6; margin-bottom: 1rem;">${narrative.setup}</p>
      </div>`;
    }
    
    if (narrative.key_takeaway) {
      contentHTML += `<div class="narrative-section">
        <h4>💡 Key Takeaway</h4>
        <p style="line-height: 1.6; margin-bottom: 1rem; font-weight: 500; background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 6px;">${narrative.key_takeaway}</p>
      </div>`;
    }
    
    if (narrative.cliff_hanger) {
      contentHTML += `<div class="narrative-section">
        <h4>🎬 What's Next?</h4>
        <p style="line-height: 1.6; margin-bottom: 1rem; font-style: italic; color: rgba(255,255,255,0.9);">${narrative.cliff_hanger}</p>
      </div>`;
    }
    
    chapterContentArea.innerHTML = contentHTML;
    
    // Scroll to chapter content
    chapterContentArea.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  // NEW: Update chapter progress
  updateChapterProgress(chapter, story) {
    if (!story || !story.chapters) return;
    
    const currentChapterIndex = story.chapters.findIndex(ch => ch.title === chapter.title);
    const totalChapters = story.chapters.length;
    
    // Update progress bar
    if (this.storyElements.chapterProgress) {
      const progressPercent = ((currentChapterIndex + 1) / totalChapters) * 100;
      this.storyElements.chapterProgress.style.width = `${progressPercent}%`;
    }
    
    // Update chapter counter
    if (this.storyElements.chapterCounter) {
      this.storyElements.chapterCounter.textContent = `Chapter ${currentChapterIndex + 1} of ${totalChapters}`;
    }
  }

  // NEW: Show story introduction
  showStoryIntroduction(introductionText) {
    if (!introductionText || !this.storyElements.storyIntroductionSection) {
      return;
    }

    console.log('📖 Showing story introduction');

    // Set introduction text
    if (this.storyElements.storyIntroductionText) {
      this.storyElements.storyIntroductionText.textContent = introductionText;
    }

    // Show introduction section
    this.storyElements.storyIntroductionSection.style.display = 'block';
    this.storyElements.storyIntroductionSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  // NEW: Hide story introduction
  hideStoryIntroduction() {
    if (this.storyElements.storyIntroductionSection) {
      this.storyElements.storyIntroductionSection.style.display = 'none';
    }
  }

  // Show story scenario details when chapter loads
  showStoryScenarioDetails(scenarioData, metadata) {
    const detailsSection = document.getElementById('story-scenario-details');
    if (detailsSection && scenarioData) {
      detailsSection.style.display = 'block';

      // Populate description
      const descElement = document.getElementById('story-scenario-description');
      if (descElement) {
        descElement.textContent = metadata?.description || 'Scenario loaded from story chapter';
      }

      // Show key assumptions (reuse existing logic)
      this.ui.showKeyAssumptions(scenarioData);
      this.copyAssumptionsToStorySection();

      // Show JSON
      const jsonElement = document.getElementById('story-scenario-json-preview');
      if (jsonElement) {
        jsonElement.textContent = JSON.stringify(scenarioData, null, 2);
      }
    }
  }

  // Copy assumptions from main UI to story section
  copyAssumptionsToStorySection() {
    const mainAssumptions = document.getElementById('key-assumptions-list');
    const storyAssumptions = document.getElementById('story-key-assumptions-list');
    const storyAssumptionsSection = document.getElementById('story-key-assumptions');

    if (mainAssumptions && storyAssumptions && storyAssumptionsSection) {
      storyAssumptions.innerHTML = mainAssumptions.innerHTML;
      storyAssumptionsSection.style.display = 'block';
    }
  }

  // Hide story scenario details when exiting story mode
  hideStoryScenarioDetails() {
    const detailsSection = document.getElementById('story-scenario-details');
    if (detailsSection) {
      detailsSection.style.display = 'none';
    }
  }

  // NEW: Show scenario error with helpful message
  showScenarioError(errorMessage) {
    console.warn('⚠️ Showing scenario error:', errorMessage);

    if (this.storyElements.storyErrorSection && this.storyElements.storyErrorText) {
      this.storyElements.storyErrorText.textContent = `Scenario loading issue: ${errorMessage}`;
      this.storyElements.storyErrorSection.style.display = 'block';
    }
  }

  // NEW: Hide scenario error
  hideScenarioError() {
    if (this.storyElements.storyErrorSection) {
      this.storyElements.storyErrorSection.style.display = 'none';
    }
  }

  // Populate story selector dropdown (enhanced with introduction info)
  populateStorySelector(stories) {
    if (!this.storyElements.storySelector) return;

    this.storyElements.storySelector.innerHTML = '<option value="">Choose a Story...</option>';

    for (const [storyKey, storyMeta] of Object.entries(stories)) {
      const option = document.createElement('option');
      option.value = storyKey;

      // Enhanced option text with introduction indicator
      let optionText = `${storyMeta.title} (${storyMeta.chapterCount} chapters, ${storyMeta.duration})`;
      if (storyMeta.introduction) {
        optionText += ' 📖'; // Indicate introduction available
      }

      option.textContent = optionText;
      this.storyElements.storySelector.appendChild(option);
    }
  }

  // Update story chapter display (enhanced)
  updateChapterDisplay(chapterData) {
    if (!chapterData) return;

    console.log(`📖 Updating chapter display: ${chapterData.title}`);

    // Hide any previous errors or introductions
    this.hideScenarioError();

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

  // Update narrative content sections (unchanged)
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

  // Update story progress indicators (unchanged)
  updateStoryProgress(chapterData) {
    if (this.storyElements.chapterCounter) {
      this.storyElements.chapterCounter.textContent =
        `Chapter ${chapterData.chapterNumber} of ${chapterData.totalChapters}`;
    }

    if (this.storyElements.chapterProgress) {
      const progressPercent = (chapterData.chapterNumber / chapterData.totalChapters) * 100;
      this.storyElements.chapterProgress.style.width = `${progressPercent}%`;
    }
  }

  // Update story navigation buttons (enhanced)
  updateStoryNavigation(chapterData) {
    // Previous button
    if (this.storyElements.storyPrevBtn) {
      this.storyElements.storyPrevBtn.disabled = chapterData.isFirstChapter;
      this.storyElements.storyPrevBtn.onclick = () => {
        if (this.onStoryPrevious) this.onStoryPrevious();
      };
    }

    // Next button with enhanced text
    if (this.storyElements.storyNextBtn) {
      if (chapterData.isLastChapter) {
        this.storyElements.storyNextBtn.textContent = 'Complete Story 🎉';
        this.storyElements.storyNextBtn.classList.add('btn-complete');
      } else {
        this.storyElements.storyNextBtn.textContent = `Next: Chapter ${chapterData.chapterNumber + 1} →`;
        this.storyElements.storyNextBtn.classList.remove('btn-complete');
      }

      this.storyElements.storyNextBtn.onclick = () => {
        if (this.onStoryNext) this.onStoryNext();
      };
    }

    // Exit button
    if (this.storyElements.storyExitBtn) {
      this.storyElements.storyExitBtn.onclick = () => {
        console.log('🚪 Exit Story button clicked');
        if (this.onStoryExit) {
          console.log('🚪 Calling onStoryExit callback');
          this.onStoryExit();
        } else {
          console.error('🚪 No onStoryExit callback set!');
        }
      };
    } else {
      console.error('🚪 Exit Story button not found in DOM!');
    }
  }

  // Override insights display for story mode (enhanced)
  showStoryInsights(insights, chapterData) {
    if (!this.ui.elements.simulationInsights) return;

    console.log('📊 Showing story insights:', insights);

    // Clear previous insights
    this.ui.elements.insightsList.innerHTML = '';

    // Add story-provided insights
    insights.forEach(insight => {
      const li = document.createElement('li');
      li.textContent = insight;
      li.classList.add('story-insight'); // For potential styling
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

  // Override next scenario suggestion for story mode (enhanced)
  showStoryNextAction(actionData) {
    if (!this.ui.elements.nextScenarioSuggestion || !actionData) return;

    console.log('📈 Showing story next action:', actionData);

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

  // Hide story-specific elements during simulation (enhanced)
  hideStoryElements() {
    if (this.storyElements.storyNarrative) {
      this.storyElements.storyNarrative.classList.add('hidden-during-simulation');
    }

    // Also hide introduction and errors during simulation
    this.hideStoryIntroduction();
    this.hideScenarioError();
  }

  // Show story elements after simulation (enhanced)
  showStoryElements() {
    if (this.storyElements.storyNarrative) {
      this.storyElements.storyNarrative.classList.remove('hidden-during-simulation');
    }
  }

  // Event listener registration for external components (unchanged)
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

  // Set story event callbacks (unchanged)
  setStoryCallbacks(callbacks) {
    this.onStoryStart = callbacks.onStoryStart;
    this.onStoryNext = callbacks.onStoryNext;
    this.onStoryPrevious = callbacks.onStoryPrevious;
    this.onStoryExit = callbacks.onStoryExit;
  }

  // Get current story UI state (enhanced)
  getStoryUIState() {
    return {
      inStoryMode: document.body.classList.contains('story-mode'),
      selectedStory: this.storyElements.storySelector?.value || null,
      narrativeVisible: !this.storyElements.storyNarrative?.classList.contains('hidden-during-simulation'),
      introductionVisible: this.storyElements.storyIntroductionSection?.style.display !== 'none',
      hasError: this.storyElements.storyErrorSection?.style.display !== 'none'
    };
  }

  // Utility: Show story loading state (enhanced)
  setStoryLoading(isLoading) {
    if (this.storyElements.storyPanel) {
      if (isLoading) {
        this.storyElements.storyPanel.classList.add('loading');
      } else {
        this.storyElements.storyPanel.classList.remove('loading');
      }
    }

    // Disable navigation during loading
    if (this.storyElements.storyPrevBtn) {
      this.storyElements.storyPrevBtn.disabled = isLoading;
    }
    if (this.storyElements.storyNextBtn) {
      this.storyElements.storyNextBtn.disabled = isLoading;
    }
  }

  // NEW: Utility methods for better UX

  // Scroll to story content
  scrollToStoryContent() {
    if (this.storyElements.storyNarrative) {
      this.storyElements.storyNarrative.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  // Show content loading indicator
  showContentLoading(message = 'Loading content...') {
    // You could implement a loading overlay here
    console.log(`🔄 ${message}`);
  }

  // Hide content loading indicator
  hideContentLoading() {
    console.log('✅ Content loading complete');
  }
}
