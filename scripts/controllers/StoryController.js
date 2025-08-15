/**
 * Story Controller - Manages story mode functionality
 * Orchestrates StoryEngineService and StoryUI for complete story experience
 */
export class StoryController {
  constructor(contentService, simulationService, storyEngineService, storyUI, eventBus) {
    this.contentService = contentService;
    this.simulationService = simulationService;
    this.storyEngineService = storyEngineService;
    this.storyUI = storyUI;
    this.eventBus = eventBus;
    
    this.isStoryMode = false;
    this.currentStory = null;
    this.currentChapter = 0;
    this.storyProgress = null;
    
    this.setupEventListeners();
    console.log('🎭 StoryController created with new architecture');
  }

  /**
   * Initialize the story controller
   */
  initialize() {
    console.log('📚 Initializing Story Controller');
    // Controller is already set up via constructor
  }

  setupEventListeners() {
    // Story mode events (compatible with new ModeController)
    this.eventBus.on('story:toggle-mode', () => this.toggleStoryMode());
    this.eventBus.on('story:select', (storyKey) => this.selectStory(storyKey));
    this.eventBus.on('story:start', () => this.startStory());
    this.eventBus.on('story:next', () => this.nextChapter());
    this.eventBus.on('story:previous', () => this.previousChapter());
    this.eventBus.on('story:exit', () => this.exitStoryMode());
    
    // Mode controller events
    this.eventBus.on('mode:story-entered', () => this.handleModeEntered());
    this.eventBus.on('mode:scenario-entered', () => this.handleModeExited());
    
    // Story engine events
    this.eventBus.on('story:run-simulation', () => this.runChapterSimulation());
    this.eventBus.on('story:request-processed-narrative', () => this.sendProcessedNarrative());
    
    // Content events
    this.eventBus.on('stories:loaded', (stories) => this.handleStoriesLoaded(stories));
  }

  /**
   * Toggle story mode on/off
   */
  toggleStoryMode() {
    if (this.isStoryMode) {
      this.exitStoryMode();
    } else {
      this.enterStoryMode();
    }
  }

  /**
   * Enter story mode (now delegates to ModeController)
   */
  enterStoryMode() {
    console.log('🎭 Entering story mode via ModeController');
    this.eventBus.emit('mode:switch-to-story');
  }
  
  /**
   * Handle mode entered from ModeController
   */
  handleModeEntered() {
    console.log('🎭 Story mode entered via ModeController');
    this.isStoryMode = true;
    // Legacy event for backward compatibility
    this.eventBus.emit('story:mode-entered');
  }

  /**
   * Exit story mode (now delegates to ModeController)
   */
  exitStoryMode() {
    console.log('🎭 Exiting story mode via ModeController');
    this.eventBus.emit('mode:switch-to-scenario');
  }
  
  /**
   * Handle mode exited from ModeController
   */
  handleModeExited() {
    console.log('🎭 Story mode exited via ModeController');
    this.isStoryMode = false;
    this.currentStory = null;
    this.currentChapter = null;
    // Legacy event for backward compatibility
    this.eventBus.emit('story:mode-exited');
  }

  /**
   * Select a story
   */
  selectStory(storyKey) {
    console.log(` Selecting story: ${storyKey}`);
    
    try {
      // Load story from content service
      const stories = this.contentService.getStories();
      if (!stories[storyKey]) {
        throw new Error(`Story '${storyKey}' not found`);
      }
      
      // Use story engine to load the story
      this.storyEngineService.loadStory(storyKey, stories);
      
      // Start with first chapter
      this.startStory();
      
      console.log(` Story selected and loaded: ${stories[storyKey].metadata.title}`);
      this.eventBus.emit('story:selected', { storyKey, story: stories[storyKey] });
      
    } catch (error) {
      console.error(' Error selecting story:', error);
      this.eventBus.emit('story:error', { message: error.message });
    }
  }

  /**
   * Start the current story
   */
  startStory() {
    console.log(' Starting story');
    
    // Navigate to first chapter using story engine
    const firstChapter = this.storyEngineService.goToChapter(0);
    
    if (firstChapter) {
      this.eventBus.emit('story:started', { 
        story: this.storyEngineService.currentStory, 
        chapter: firstChapter 
      });
    } else {
      console.warn(' No chapters found in story');
    }
  }

  /**
   * Navigate to next chapter
   */
  nextChapter() {
    console.log(' Navigating to next chapter');
    
    const nextChapter = this.storyEngineService.nextChapter();
    
    if (nextChapter) {
      console.log(` Advanced to chapter: ${nextChapter.title}`);
    } else {
      console.log(' Reached end of story or no story active');
    }
  }

  /**
   * Navigate to previous chapter
   */
  previousChapter() {
    console.log(' Navigating to previous chapter');
    
    const previousChapter = this.storyEngineService.previousChapter();
    
    if (previousChapter) {
      console.log(` Went back to chapter: ${previousChapter.title}`);
    } else {
      console.log(' Reached start of story or no story active');
    }
  }

  /**
   * Load the current chapter
   */
  async loadCurrentChapter() {
    if (!this.isValidChapter()) {
      console.error('Invalid chapter state');
      return;
    }

    const chapter = this.storyEngineService.getCurrentChapter();
    console.log(` Loading chapter ${chapter.chapterNumber}: ${chapter.title}`);

    // Emit chapter loaded event
    this.eventBus.emit('chapter:loaded', chapter);

    // Try to load the associated scenario
    try {
      const scenario = await this.contentService.getScenario(chapter.scenario_key);
      
      // Emit scenario loaded with story context
      this.eventBus.emit('scenario:loaded', {
        scenario,
        chapter,
        context: {
          isStoryMode: true,
          storyKey: this.storyEngineService.currentStory.key,
          chapterNumber: chapter.chapterNumber
        }
      });
      
    } catch (error) {
      console.warn(` Chapter scenario issue: ${error.message}`);
      this.eventBus.emit('chapter:scenario-error', {
        chapter,
        error: error.message
      });
    }
  }

  /**
   * Run simulation for current chapter
   */
  async runChapterSimulation() {
    console.log(' Running chapter simulation');
    
    try {
      await this.storyEngineService.runChapterSimulation();
    } catch (error) {
      console.error(' Simulation error:', error);
      this.eventBus.emit('story:error', { message: 'Simulation failed: ' + error.message });
    }
  }

  /**
   * Send processed narrative to UI
   */
  sendProcessedNarrative() {
    const narrative = this.storyEngineService.getProcessedNarrative();
    if (narrative && this.storyUI) {
      this.storyUI.updateProcessedNarrative(narrative);
    }
  }

  /**
   * Handle stories loaded
   */
  handleStoriesLoaded(stories) {
    console.log(' Stories loaded in StoryController');
    // Stories are now available for selection via StoryUI
  }

  /**
   * Check if current chapter state is valid
   * @returns {boolean} True if valid
   */
  isValidChapter() {
    return this.currentStory && 
           this.currentChapter !== null &&
           this.currentChapter >= 0 && 
           this.currentChapter < this.currentStory.chapters.length;
  }

  /**
   * Check if can navigate to next chapter
   * @returns {boolean} True if can go next
   */
  canGoNext() {
    return this.currentStory && 
           this.currentChapter < this.currentStory.chapters.length - 1;
  }

  /**
   * Check if can navigate to previous chapter
   * @returns {boolean} True if can go previous
   */
  canGoPrevious() {
    return this.currentStory && this.currentChapter > 0;
  }

  /**
   * Get all available stories
   * @returns {Array} Available stories
   */
  getAvailableStories() {
    return this.contentService.getAllStories();
  }

  /**
   * Check if currently in story mode
   * @returns {boolean} True if in story mode
   */
  isInStoryMode() {
    return this.isStoryMode;
  }

  /**
   * Get current story
   * @returns {Object|null} Current story object
   */
  getCurrentStory() {
    return this.currentStory;
  }

  /**
   * Get current chapter index
   * @returns {number|null} Current chapter index
   */
  getCurrentChapterIndex() {
    return this.currentChapter;
  }
}
