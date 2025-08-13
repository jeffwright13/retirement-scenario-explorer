/**
 * Content Service - Manages scenarios, stories, and collections
 * Pure event-driven content management without legacy dependencies
 */

export class ContentService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.scenarios = new Map();
    this.stories = new Map();
    this.registry = {
      scenarios: {},
      stories: {},
      errors: []
    };
    this.isLoaded = false;
    
    // Set up EventBus request handlers
    this.setupEventHandlers();
  }

  /**
   * Set up EventBus request handlers
   */
  setupEventHandlers() {
    // Handle requests for specific scenarios
    this.eventBus.on('content:get-scenario', async (scenarioKey) => {
      try {
        const scenario = await this.getScenario(scenarioKey);
        this.eventBus.emit('content:scenario-data', { scenarioKey, scenario });
      } catch (error) {
        this.eventBus.emit('content:scenario-error', { scenarioKey, error: error.message });
      }
    });

    // Handle requests for specific stories
    this.eventBus.on('content:get-story', async (storyKey) => {
      try {
        const story = await this.getStory(storyKey);
        this.eventBus.emit('content:story-data', { storyKey, story });
      } catch (error) {
        this.eventBus.emit('content:story-error', { storyKey, error: error.message });
      }
    });
  }

  /**
   * Load all content and emit events
   * @returns {Promise<Object>} Content registry
   */
  async loadAllContent() {
    try {
      this.eventBus.emit('content:loading-started');
      
      // Load scenarios and stories in parallel
      await Promise.all([
        this.loadScenarios(),
        this.loadStories()
      ]);
      
      this.isLoaded = true;
      
      // Emit specific content loaded events
      this.eventBus.emit('scenarios:loaded', this.getAllScenarios());
      this.eventBus.emit('stories:loaded', this.getAllStories());
      this.eventBus.emit('content:loaded', this.registry);
      
      // Emit any errors
      if (this.registry.errors.length > 0) {
        this.eventBus.emit('content:errors', this.registry.errors);
      }
      
      console.log(`✅ Content loaded: ${this.scenarios.size} scenarios, ${this.stories.size} stories`);
      return this.registry;
      
    } catch (error) {
      this.eventBus.emit('content:loading-failed', error);
      throw error;
    }
  }

  /**
   * Load scenario files
   */
  async loadScenarios() {
    const scenarioFiles = [
      'data/scenarios/jeffs-learning-journey-scenarios.json'
    ];

    for (const filePath of scenarioFiles) {
      try {
        console.log(`🔍 Loading scenarios from: ${filePath}`);
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`Failed to load ${filePath}: ${response.status}`);
        }

        const data = await response.json();
        
        // Process each scenario in the file
        for (const [key, scenario] of Object.entries(data)) {
          if (key.startsWith('$')) continue; // Skip schema references
          
          if (this.validateScenario(scenario)) {
            this.scenarios.set(key, scenario);
            this.registry.scenarios[key] = {
              title: scenario.metadata?.title || key,
              description: scenario.metadata?.description || '',
              tags: scenario.metadata?.tags || [],
              source: filePath
            };
            console.log(`✅ Loaded scenario: ${key}`);
          } else {
            console.warn(`❌ Invalid scenario: ${key}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to load ${filePath}:`, error);
        this.registry.errors.push({
          type: 'scenario_load_error',
          file: filePath,
          error: error.message
        });
      }
    }
  }

  /**
   * Load story files
   */
  async loadStories() {
    const storyFiles = [
      'data/stories/jeffs-learning-journey.json'
    ];

    for (const filePath of storyFiles) {
      try {
        console.log(`🔍 Loading stories from: ${filePath}`);
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`Failed to load ${filePath}: ${response.status}`);
        }

        const data = await response.json();
        
        // Process each story in the file
        for (const [key, story] of Object.entries(data)) {
          if (key.startsWith('$')) continue; // Skip schema references
          
          if (this.validateStory(story)) {
            this.stories.set(key, story);
            this.registry.stories[key] = {
              title: story.metadata?.title || key,
              description: story.metadata?.description || '',
              tags: story.metadata?.tags || [],
              source: filePath
            };
            console.log(`✅ Loaded story: ${key}`);
          } else {
            console.warn(`❌ Invalid story: ${key}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to load ${filePath}:`, error);
        this.registry.errors.push({
          type: 'story_load_error',
          file: filePath,
          error: error.message
        });
      }
    }
  }

  /**
   * Basic scenario validation
   */
  validateScenario(scenario) {
    return scenario.plan &&
           scenario.assets &&
           Array.isArray(scenario.assets) &&
           typeof scenario.plan.monthly_expenses === 'number';
  }

  /**
   * Basic story validation
   */
  validateStory(story) {
    return story.metadata &&
           story.chapters &&
           Array.isArray(story.chapters);
  }

  /**
   * Get a specific scenario by key
   * @param {string} scenarioKey - Scenario identifier
   * @returns {Promise<Object>} Scenario data
   */
  async getScenario(scenarioKey) {
    if (!this.isLoaded) {
      await this.loadAllContent();
    }
    
    const scenario = this.scenarios.get(scenarioKey);
    if (!scenario) {
      throw new Error(`Scenario "${scenarioKey}" not found`);
    }
    
    this.eventBus.emit('scenario:accessed', { key: scenarioKey, scenario });
    return scenario;
  }

  /**
   * Get a specific story by key
   * @param {string} storyKey - Story identifier
   * @returns {Promise<Object>} Story data
   */
  async getStory(storyKey) {
    if (!this.isLoaded) {
      await this.loadAllContent();
    }
    
    const story = this.stories.get(storyKey);
    if (!story) {
      throw new Error(`Story "${storyKey}" not found`);
    }
    
    this.eventBus.emit('story:accessed', { key: storyKey, story });
    return story;
  }

  /**
   * Get all available scenarios
   * @returns {Array} Array of scenario objects with key property
   */
  getAllScenarios() {
    // Convert Map to array with keys and flatten metadata
    return Array.from(this.scenarios.entries()).map(([key, scenario]) => {
      // Flatten metadata to root level for UI compatibility
      const flattened = {
        ...scenario,
        key: key
      };
      
      // If metadata exists, merge it to root level
      if (scenario.metadata) {
        flattened.title = scenario.metadata.title || flattened.title;
        flattened.description = scenario.metadata.description || flattened.description;
        flattened.tags = scenario.metadata.tags || flattened.tags;
      }
      
      return flattened;
    });
  }

  /**
   * Get all available stories
   * @returns {Array} Array of story objects with key property
   */
  getAllStories() {
    // Convert Map to array with keys and flatten metadata
    return Array.from(this.stories.entries()).map(([key, story]) => {
      // Flatten metadata to root level for UI compatibility
      const flattened = {
        ...story,
        key: key
      };
      
      // If metadata exists, merge it to root level
      if (story.metadata) {
        flattened.title = story.metadata.title || flattened.title;
        flattened.description = story.metadata.description || flattened.description;
        flattened.tags = story.metadata.tags || flattened.tags;
      }
      
      return flattened;
    });
  }

  /**
   * Get content summary
   * @returns {Object} Content summary
   */
  getContentSummary() {
    return {
      scenarios: this.scenarios.size,
      stories: this.stories.size,
      errors: this.registry.errors.length,
      registry: this.registry
    };
  }

  /**
   * Check if content has errors
   * @returns {boolean} True if there are content errors
   */
  hasErrors() {
    return this.registry.errors.length > 0;
  }

  /**
   * Get content errors
   * @returns {Array} Array of error objects
   */
  getErrors() {
    return this.registry.errors;
  }

  /**
   * Refresh all content
   * @returns {Promise<Object>} Updated content registry
   */
  async refreshContent() {
    // Clear existing content
    this.scenarios.clear();
    this.stories.clear();
    this.registry = {
      scenarios: {},
      stories: {},
      errors: []
    };
    this.isLoaded = false;
    
    return await this.loadAllContent();
  }

  /**
   * Search scenarios by criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} Matching scenarios
   */
  searchScenarios(criteria = {}) {
    const scenarios = this.getAllScenarios();
    
    if (!criteria || Object.keys(criteria).length === 0) {
      return scenarios;
    }

    return scenarios.filter(scenario => {
      // Search by title
      if (criteria.title) {
        const titleMatch = scenario.title?.toLowerCase().includes(criteria.title.toLowerCase());
        if (!titleMatch) return false;
      }

      // Search by description
      if (criteria.description) {
        const descMatch = scenario.description?.toLowerCase().includes(criteria.description.toLowerCase());
        if (!descMatch) return false;
      }

      // Search by tags
      if (criteria.tags && Array.isArray(criteria.tags)) {
        const scenarioTags = scenario.tags || [];
        const hasMatchingTag = criteria.tags.some(tag => 
          scenarioTags.some(scenarioTag => 
            scenarioTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }

  /**
   * Get scenarios by category/tag
   * @param {string} category - Category to filter by
   * @returns {Array} Scenarios in category
   */
  getScenariosByCategory(category) {
    return this.searchScenarios({ tags: [category] });
  }

  /**
   * Get recommended next scenarios based on current scenario
   * @param {string} currentScenarioKey - Current scenario key
   * @returns {Array} Recommended scenarios
   */
  getRecommendedScenarios(currentScenarioKey) {
    const currentScenario = this.contentManager.getScenario(currentScenarioKey);
    if (!currentScenario) return [];

    // Simple recommendation logic - scenarios with similar tags
    const currentTags = currentScenario.tags || [];
    if (currentTags.length === 0) return [];

    const allScenarios = this.getAllScenarios();
    const recommendations = allScenarios
      .filter(scenario => scenario.key !== currentScenarioKey)
      .map(scenario => {
        const scenarioTags = scenario.tags || [];
        const commonTags = currentTags.filter(tag => scenarioTags.includes(tag));
        return {
          ...scenario,
          relevanceScore: commonTags.length
        };
      })
      .filter(scenario => scenario.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3); // Top 3 recommendations

    return recommendations;
  }
}
