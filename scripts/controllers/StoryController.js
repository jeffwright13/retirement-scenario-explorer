/**
 * Story Controller - Manages story mode functionality
 * Handles story selection, chapter navigation, and story-driven simulation
 */
export class StoryController {
  constructor(contentService, simulationService, eventBus) {
    this.contentService = contentService;
    this.simulationService = simulationService;
    this.eventBus = eventBus;
    
    this.currentStory = null;
    this.currentChapter = null;
    this.isStoryMode = false;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Story mode events
    this.eventBus.on('story:toggle-mode', () => this.toggleStoryMode());
    this.eventBus.on('story:select', (storyKey) => this.selectStory(storyKey));
    this.eventBus.on('story:start', () => this.startStory());
    this.eventBus.on('story:next', () => this.nextChapter());
    this.eventBus.on('story:previous', () => this.previousChapter());
    this.eventBus.on('story:exit', () => this.exitStoryMode());
    
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
   * Enter story mode
   */
  enterStoryMode() {
    console.log('🎭 Entering story mode');
    this.isStoryMode = true;
    this.eventBus.emit('story:mode-entered');
  }

  /**
   * Exit story mode
   */
  exitStoryMode() {
    console.log('🎭 Exiting story mode in StoryController');
    console.log('🎭 Current story mode state:', this.isStoryMode);
    this.isStoryMode = false;
    this.currentStory = null;
    this.currentChapter = null;
    console.log('🎭 Emitting story:mode-exited event');
    this.eventBus.emit('story:mode-exited');
  }

  /**
   * Select and initialize a story
   * @param {string} storyKey - Story identifier
   */
  async selectStory(storyKey) {
    if (!storyKey) return;

    try {
      console.log(`📚 Starting story: ${storyKey}`);
      
      const story = await this.contentService.getStory(storyKey);
      this.currentStory = story;
      this.currentChapter = 0;
      
      // Emit story started event with introduction
      this.eventBus.emit('story:started', {
        story,
        introduction: story.metadata?.introduction,
        totalChapters: story.chapters.length
      });
      
      // Load first chapter
      await this.loadCurrentChapter();
      
    } catch (error) {
      console.error('Failed to start story:', error);
      this.eventBus.emit('error', `Failed to start story: ${error.message}`);
    }
  }

  /**
   * Start the current story (load first chapter)
   */
  async startStory() {
    if (!this.currentStory) {
      this.eventBus.emit('error', 'No story selected');
      return;
    }
    
    this.currentChapter = 0;
    await this.loadCurrentChapter();
  }

  /**
   * Navigate to next chapter
   */
  async nextChapter() {
    if (!this.canGoNext()) {
      console.log('📖 Already at last chapter');
      return;
    }
    
    this.currentChapter++;
    await this.loadCurrentChapter();
  }

  /**
   * Navigate to previous chapter
   */
  async previousChapter() {
    if (!this.canGoPrevious()) {
      console.log('📖 Already at first chapter');
      return;
    }
    
    this.currentChapter--;
    await this.loadCurrentChapter();
  }

  /**
   * Load the current chapter
   */
  async loadCurrentChapter() {
    if (!this.isValidChapter()) {
      console.error('Invalid chapter state');
      return;
    }

    const chapter = this.getCurrentChapterData();
    console.log(`📖 Loading chapter ${chapter.chapterNumber}: ${chapter.title}`);

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
          storyKey: this.currentStory.key,
          chapterNumber: chapter.chapterNumber
        }
      });
      
    } catch (error) {
      console.warn(`⚠️ Chapter scenario issue: ${error.message}`);
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
    if (!this.isValidChapter()) {
      this.eventBus.emit('error', 'No valid chapter to simulate');
      return;
    }

    const chapter = this.getCurrentChapterData();
    
    try {
      const scenario = await this.contentService.getScenario(chapter.scenario_key);
      
      // Run simulation with story context
      const context = {
        isStoryMode: true,
        storyKey: this.currentStory.key,
        chapter: chapter,
        chapterNumber: chapter.chapterNumber
      };
      
      const result = await this.simulationService.runSimulation(scenario, context);
      
      // Emit story-specific simulation complete event
      this.eventBus.emit('story:simulation-completed', {
        result,
        chapter,
        nextAction: this.getNextAction()
      });
      
      return result;
      
    } catch (error) {
      console.error('Story simulation failed:', error);
      this.eventBus.emit('story:simulation-failed', { error, chapter });
      throw error;
    }
  }

  /**
   * Get current chapter data with metadata
   * @returns {Object|null} Chapter data with additional metadata
   */
  getCurrentChapterData() {
    if (!this.isValidChapter()) return null;
    
    const chapter = this.currentStory.chapters[this.currentChapter];
    return {
      ...chapter,
      chapterNumber: this.currentChapter + 1,
      totalChapters: this.currentStory.chapters.length,
      isFirstChapter: this.currentChapter === 0,
      isLastChapter: this.currentChapter === this.currentStory.chapters.length - 1,
      storyTitle: this.currentStory.metadata?.title || 'Unknown Story'
    };
  }

  /**
   * Get next action for story progression
   * @returns {Object|null} Next action object
   */
  getNextAction() {
    const chapter = this.getCurrentChapterData();
    if (!chapter) return null;

    if (chapter.isLastChapter) {
      return {
        type: 'story_complete',
        title: 'Story Complete!',
        description: `You've completed "${chapter.storyTitle}".`,
        action: 'Exit Story Mode',
        buttonText: 'Exit Story'
      };
    }

    const nextChapter = this.currentStory.chapters[this.currentChapter + 1];
    return {
      type: 'next_chapter',
      title: `Next: ${nextChapter.title}`,
      description: nextChapter.narrative?.introduction || 'Continue your journey...',
      action: `Continue to Chapter ${this.currentChapter + 2}`,
      buttonText: 'Next Chapter'
    };
  }

  /**
   * Get current story progress
   * @returns {Object|null} Progress information
   */
  getProgress() {
    if (!this.isStoryMode || !this.currentStory) return null;

    return {
      storyTitle: this.currentStory.metadata?.title || 'Unknown',
      storyKey: this.currentStory.key,
      currentChapter: this.currentChapter + 1,
      totalChapters: this.currentStory.chapters.length,
      progress: ((this.currentChapter + 1) / this.currentStory.chapters.length) * 100,
      canGoNext: this.canGoNext(),
      canGoPrevious: this.canGoPrevious(),
      isComplete: this.currentChapter === this.currentStory.chapters.length - 1
    };
  }

  /**
   * Handle stories loaded event
   * @param {Array} stories - Available stories
   */
  handleStoriesLoaded(stories) {
    console.log(`📚 ${stories.length} stories available`);
    this.eventBus.emit('story:stories-available', stories);
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
