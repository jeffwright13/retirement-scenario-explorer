/**
 * Story Engine Service - Core business logic for story mode functionality
 * Handles story progression, content rendering, and interactive features
 */
export class StoryEngineService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentStory = null;
    this.currentChapterIndex = 0;
    this.storyData = {};
    this.simulationResults = {};
    
    console.log('📖 StoryEngineService created');
  }

  /**
   * Load a story from story data
   * @param {string} storyKey - Key of the story to load
   * @param {Object} storyData - Complete story data object
   */
  loadStory(storyKey, storyData) {
    if (!storyData[storyKey]) {
      throw new Error(`Story '${storyKey}' not found in story data`);
    }

    this.currentStory = storyData[storyKey];
    this.currentChapterIndex = 0;
    this.storyData = storyData;
    this.simulationResults = {};

    console.log(`📖 Loaded story: ${this.currentStory.metadata.title}`);
    
    // Emit story loaded event
    this.eventBus.emit('story-engine:story-loaded', {
      storyKey,
      story: this.currentStory,
      totalChapters: this.currentStory.chapters.length
    });

    return this.currentStory;
  }

  /**
   * Get the current chapter
   * @returns {Object|null} Current chapter data
   */
  getCurrentChapter() {
    if (!this.currentStory || !this.currentStory.chapters) {
      return null;
    }

    return this.currentStory.chapters[this.currentChapterIndex] || null;
  }

  /**
   * Navigate to a specific chapter
   * @param {number} chapterIndex - Zero-based chapter index
   * @returns {Object|null} Chapter data or null if invalid
   */
  goToChapter(chapterIndex) {
    if (!this.currentStory || !this.currentStory.chapters) {
      return null;
    }

    if (chapterIndex < 0 || chapterIndex >= this.currentStory.chapters.length) {
      console.warn(`📖 Invalid chapter index: ${chapterIndex}`);
      return null;
    }

    this.currentChapterIndex = chapterIndex;
    const chapter = this.getCurrentChapter();

    console.log(`📖 Navigated to chapter ${chapterIndex + 1}: ${chapter.title}`);

    // Emit chapter changed event
    this.eventBus.emit('story-engine:chapter-changed', {
      chapterIndex,
      chapter,
      progress: this.getProgress()
    });

    return chapter;
  }

  /**
   * Navigate to the next chapter
   * @returns {Object|null} Next chapter data or null if at end
   */
  nextChapter() {
    if (!this.currentStory) return null;

    const nextIndex = this.currentChapterIndex + 1;
    if (nextIndex >= this.currentStory.chapters.length) {
      console.log('📖 Reached end of story');
      this.eventBus.emit('story-engine:story-completed');
      return null;
    }

    return this.goToChapter(nextIndex);
  }

  /**
   * Navigate to the previous chapter
   * @returns {Object|null} Previous chapter data or null if at beginning
   */
  previousChapter() {
    if (!this.currentStory) return null;

    const prevIndex = this.currentChapterIndex - 1;
    if (prevIndex < 0) {
      console.log('📖 Already at beginning of story');
      return null;
    }

    return this.goToChapter(prevIndex);
  }

  /**
   * Get story progress information
   * @returns {Object} Progress data
   */
  getProgress() {
    if (!this.currentStory) {
      return { current: 0, total: 0, percentage: 0 };
    }

    const current = this.currentChapterIndex + 1;
    const total = this.currentStory.chapters.length;
    const percentage = Math.round((current / total) * 100);

    return { current, total, percentage };
  }

  /**
   * Run simulation for current chapter's scenario
   * @returns {Promise} Simulation promise
   */
  async runChapterSimulation() {
    const chapter = this.getCurrentChapter();
    if (!chapter || !chapter.scenario_key) {
      console.warn('📖 No scenario key found for current chapter');
      return null;
    }

    console.log(`📖 Running simulation for scenario: ${chapter.scenario_key}`);

    // Emit simulation request
    this.eventBus.emit('simulation:run-scenario', {
      scenarioKey: chapter.scenario_key,
      source: 'story-mode'
    });

    // Return a promise that resolves when simulation completes
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Simulation timeout'));
      }, 30000); // 30 second timeout

      const handleResults = (data) => {
        if (data.scenarioKey === chapter.scenario_key) {
          clearTimeout(timeout);
          this.simulationResults[chapter.scenario_key] = data.results;
          
          // Emit story-specific simulation results
          this.eventBus.emit('story-engine:simulation-completed', {
            chapterIndex: this.currentChapterIndex,
            scenarioKey: chapter.scenario_key,
            results: data.results
          });
          
          resolve(data.results);
        }
      };

      const handleError = (error) => {
        if (error.scenarioKey === chapter.scenario_key) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      // Listen for simulation results
      this.eventBus.once('simulation:results', handleResults);
      this.eventBus.once('simulation:error', handleError);
    });
  }

  /**
   * Process template variables in story content
   * @param {string} content - Content with template variables
   * @param {Object} simulationResults - Results to use for variable substitution
   * @returns {string} Processed content
   */
  processTemplateVariables(content, simulationResults = null) {
    if (!content) return '';

    let processedContent = content;
    const results = simulationResults || this.getChapterSimulationResults();

    if (results) {
      // Replace common template variables
      const variables = {
        'duration_years': Math.round((results.duration_months || 0) / 12),
        'duration_months': results.duration_months || 0,
        'final_balance': this.formatCurrency(results.final_balance || 0),
        'total_withdrawn': this.formatCurrency(results.total_withdrawn || 0),
        'success_rate': results.success_rate ? `${results.success_rate}%` : 'N/A'
      };

      // Replace template variables in the format {{variable_name}}
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedContent = processedContent.replace(regex, value);
      });
    }

    return processedContent;
  }

  /**
   * Get simulation results for current chapter
   * @returns {Object|null} Simulation results
   */
  getChapterSimulationResults() {
    const chapter = this.getCurrentChapter();
    if (!chapter || !chapter.scenario_key) {
      return null;
    }

    return this.simulationResults[chapter.scenario_key] || null;
  }

  /**
   * Get processed narrative content for current chapter
   * @returns {Object|null} Processed narrative content
   */
  getProcessedNarrative() {
    const chapter = this.getCurrentChapter();
    if (!chapter || !chapter.narrative) {
      return null;
    }

    const results = this.getChapterSimulationResults();
    const narrative = { ...chapter.narrative };

    // Process template variables in all narrative fields
    if (narrative.introduction) {
      narrative.introduction = this.processTemplateVariables(narrative.introduction, results);
    }
    if (narrative.setup) {
      narrative.setup = this.processTemplateVariables(narrative.setup, results);
    }
    if (narrative.key_takeaway) {
      narrative.key_takeaway = this.processTemplateVariables(narrative.key_takeaway, results);
    }
    if (narrative.cliff_hanger) {
      narrative.cliff_hanger = this.processTemplateVariables(narrative.cliff_hanger, results);
    }

    // Process insights array
    if (narrative.insights && Array.isArray(narrative.insights)) {
      narrative.insights = narrative.insights.map(insight => 
        this.processTemplateVariables(insight, results)
      );
    }

    return narrative;
  }

  /**
   * Check if story allows chapter jumping
   * @returns {boolean}
   */
  allowsChapterJumping() {
    return this.currentStory?.story_settings?.allow_chapter_jumping !== false;
  }

  /**
   * Check if story has auto-advance enabled
   * @returns {boolean}
   */
  hasAutoAdvance() {
    return this.currentStory?.story_settings?.auto_advance === true;
  }

  /**
   * Get story metadata
   * @returns {Object|null} Story metadata
   */
  getStoryMetadata() {
    return this.currentStory?.metadata || null;
  }

  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount) {
    if (typeof amount !== 'number') return '$0';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Reset story engine state
   */
  reset() {
    this.currentStory = null;
    this.currentChapterIndex = 0;
    this.storyData = {};
    this.simulationResults = {};
    
    console.log('📖 Story engine reset');
    this.eventBus.emit('story-engine:reset');
  }

  /**
   * Get current story state for debugging
   * @returns {Object} Current state
   */
  getState() {
    return {
      hasStory: !!this.currentStory,
      storyTitle: this.currentStory?.metadata?.title,
      currentChapterIndex: this.currentChapterIndex,
      totalChapters: this.currentStory?.chapters?.length || 0,
      progress: this.getProgress(),
      hasSimulationResults: Object.keys(this.simulationResults).length > 0
    };
  }
}
