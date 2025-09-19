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

    // Handle user scenario management
    this.eventBus.on('content:save-user-scenario', (data) => {
      try {
        this.saveUserScenario(data.key, data.scenario);
        this.eventBus.emit('content:user-scenario-saved', { key: data.key });
        // Refresh scenarios list
        this.eventBus.emit('scenarios:loaded', this.getAllScenarios());
      } catch (error) {
        this.eventBus.emit('content:user-scenario-error', { key: data.key, error: error.message });
      }
    });

    this.eventBus.on('content:delete-user-scenario', (scenarioKey) => {
      try {
        this.deleteUserScenario(scenarioKey);
        this.eventBus.emit('content:user-scenario-deleted', { key: scenarioKey });
        // Refresh scenarios list
        this.eventBus.emit('scenarios:loaded', this.getAllScenarios());
      } catch (error) {
        this.eventBus.emit('content:user-scenario-error', { key: scenarioKey, error: error.message });
      }
    });

    // Handle requests for scenarios for copying
    this.eventBus.on('content:get-all-scenarios-for-copy', () => {
      try {
        const scenarios = this.getScenariosForCopy();
        this.eventBus.emit('scenario-builder:ui-populate-copy-scenarios', scenarios);
      } catch (error) {
        console.error('Error getting scenarios for copy:', error);
      }
    });

    // Handle requests for specific scenario for copying
    this.eventBus.on('scenario-builder:load-scenario-for-copy', async (scenarioId) => {
      try {
        const [type, key] = scenarioId.split(':');
        let scenario;
        
        if (type === 'builtin') {
          scenario = await this.getScenario(key);
        } else if (type === 'custom') {
          scenario = this.getUserScenario(key);
        }
        
        if (scenario) {
          // Convert scenario to form data using the service
          this.eventBus.emit('scenario-builder:scenario-loaded-for-copy', scenario);
        }
      } catch (error) {
        console.error('Error loading scenario for copy:', error);
        this.eventBus.emit('scenario-builder:ui-show-error', { error: error.message });
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
   * Load scenario files and user scenarios
   */
  async loadScenarios() {
    // Load built-in scenarios from files
    await this.loadBuiltInScenarios();
    
    // Load user scenarios from localStorage
    this.loadUserScenarios();
  }

  /**
   * Load built-in scenario files
   */
  async loadBuiltInScenarios() {
    const scenarioFiles = [
      'data/scenarios/learning-journey-scenarios.json'
    ];

    for (const filePath of scenarioFiles) {
      try {
        console.log(`🔍 Loading built-in scenarios from: ${filePath}`);
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
              source: filePath,
              isBuiltIn: true
            };
            console.log(`✅ Loaded built-in scenario: ${key}`);
          } else {
            console.warn(`❌ Invalid built-in scenario: ${key}`);
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
      'data/stories/learning-journey.json'
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
    if (!scenario || typeof scenario !== 'object') {
      return false;
    }
    
    const hasValidPlan = !!scenario.plan;
    const hasValidAssets = !!(scenario.assets && Array.isArray(scenario.assets));
    const hasValidExpenses = typeof scenario.plan?.monthly_expenses === 'number';
    
    const isValid = hasValidPlan && hasValidAssets && hasValidExpenses;
    
    if (!isValid) {
      console.warn('❌ Scenario validation failed:', {
        hasValidPlan,
        hasValidAssets,
        hasValidExpenses,
        planExists: !!scenario.plan,
        assetsExists: !!scenario.assets,
        assetsIsArray: Array.isArray(scenario.assets),
        expensesType: typeof scenario.plan?.monthly_expenses,
        expensesValue: scenario.plan?.monthly_expenses
      });
    }
    
    return isValid;
  }

  /**
   * Basic story validation
   */
  validateStory(story) {
    if (!story || typeof story !== 'object') {
      return false;
    }
    
    return !!(story.metadata &&
              story.chapters &&
              Array.isArray(story.chapters));
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
      
      // Preserve registry metadata (isBuiltIn, isUserScenario)
      const registryInfo = this.registry.scenarios[key];
      if (registryInfo) {
        flattened.isBuiltIn = registryInfo.isBuiltIn;
        flattened.isUserScenario = registryInfo.isUserScenario;
        flattened.source = registryInfo.source;
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
   * Get stories as object (legacy compatibility)
   * @returns {Object} Stories as key-value object
   */
  getStories() {
    const storiesObject = {};
    this.stories.forEach((story, key) => {
      storiesObject[key] = story;
    });
    return storiesObject;
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
    const currentScenario = this.scenarios.get(currentScenarioKey);
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

  // ===== USER SCENARIO MANAGEMENT (localStorage) =====

  /**
   * Save a user scenario to localStorage
   * @param {string} key - Scenario key
   * @param {Object} scenario - Scenario data
   */
  saveUserScenario(key, scenario) {
    try {
      // Validate scenario before saving
      if (!this.validateScenario(scenario)) {
        throw new Error('Invalid scenario data');
      }

      // Get existing user scenarios
      const userScenarios = this.getUserScenariosFromStorage();
      
      // Add/update scenario
      userScenarios[key] = scenario;
      
      // Save back to localStorage
      localStorage.setItem('retirement-explorer-user-scenarios', JSON.stringify(userScenarios));
      
      // Update in-memory scenarios
      this.scenarios.set(key, scenario);
      this.registry.scenarios[key] = {
        title: scenario.metadata?.title || key,
        description: scenario.metadata?.description || '',
        tags: scenario.metadata?.tags || [],
        source: 'localStorage',
        isBuiltIn: false,
        isUserScenario: true
      };
      
      console.log(`💾 Saved user scenario: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to save user scenario ${key}:`, error);
      throw error;
    }
  }

  /**
   * Load user scenarios from localStorage
   */
  loadUserScenarios() {
    try {
      const userScenarios = this.getUserScenariosFromStorage();
      let loadedCount = 0;
      
      for (const [key, scenario] of Object.entries(userScenarios)) {
        if (this.validateScenario(scenario)) {
          this.scenarios.set(key, scenario);
          this.registry.scenarios[key] = {
            title: scenario.metadata?.title || key,
            description: scenario.metadata?.description || '',
            tags: scenario.metadata?.tags || [],
            source: 'localStorage',
            isBuiltIn: false,
            isUserScenario: true
          };
          loadedCount++;
        } else {
          console.warn(`❌ Invalid user scenario: ${key}`);
        }
      }
      
      if (loadedCount > 0) {
        console.log(`💾 Loaded ${loadedCount} user scenarios from localStorage`);
      }
    } catch (error) {
      console.error('❌ Failed to load user scenarios from localStorage:', error);
      // Don't throw - continue without user scenarios
    }
  }

  /**
   * Delete a user scenario from localStorage
   * @param {string} key - Scenario key
   */
  deleteUserScenario(key) {
    try {
      // Get existing user scenarios
      const userScenarios = this.getUserScenariosFromStorage();
      
      // Check if scenario exists and is user-created
      if (!userScenarios[key]) {
        throw new Error(`User scenario "${key}" not found`);
      }
      
      // Remove from storage
      delete userScenarios[key];
      localStorage.setItem('retirement-explorer-user-scenarios', JSON.stringify(userScenarios));
      
      // Remove from in-memory scenarios
      this.scenarios.delete(key);
      delete this.registry.scenarios[key];
      
      console.log(`🗑️ Deleted user scenario: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to delete user scenario ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get user scenarios from localStorage
   * @returns {Object} User scenarios object
   */
  getUserScenariosFromStorage() {
    try {
      const stored = localStorage.getItem('retirement-explorer-user-scenarios');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Failed to parse user scenarios from localStorage:', error);
      return {};
    }
  }

  /**
   * Get all user scenario keys
   * @returns {Array} Array of user scenario keys
   */
  getUserScenarioKeys() {
    const userScenarios = this.getUserScenariosFromStorage();
    return Object.keys(userScenarios);
  }

  /**
   * Check if a scenario is user-created
   * @param {string} key - Scenario key
   * @returns {boolean} True if user-created
   */
  isUserScenario(key) {
    return this.registry.scenarios[key]?.isUserScenario === true;
  }

  /**
   * Get storage usage info
   * @returns {Object} Storage usage information
   */
  getStorageInfo() {
    try {
      const userScenarios = this.getUserScenariosFromStorage();
      const dataSize = JSON.stringify(userScenarios).length;
      
      return {
        userScenarioCount: Object.keys(userScenarios).length,
        dataSizeBytes: dataSize,
        dataSizeKB: Math.round(dataSize / 1024 * 100) / 100,
        isStorageAvailable: typeof(Storage) !== "undefined"
      };
    } catch (error) {
      return {
        userScenarioCount: 0,
        dataSizeBytes: 0,
        dataSizeKB: 0,
        isStorageAvailable: false,
        error: error.message
      };
    }
  }

  /**
   * Get scenarios formatted for copy dropdown
   * @returns {Object} Scenarios organized by type
   */
  getScenariosForCopy() {
    const builtin = [];
    const custom = [];

    // Get built-in scenarios
    for (const [key, scenario] of this.scenarios.entries()) {
      builtin.push({
        key,
        title: scenario.metadata?.title || scenario.title || key,
        name: scenario.metadata?.title || scenario.title || key
      });
    }

    // Get custom scenarios
    const userScenarios = this.getUserScenariosFromStorage();
    for (const [key, scenario] of Object.entries(userScenarios)) {
      custom.push({
        key,
        title: scenario.metadata?.title || scenario.title || key,
        name: scenario.metadata?.title || scenario.title || key
      });
    }

    return { builtin, custom };
  }

  /**
   * Get a specific user scenario
   * @param {string} key - Scenario key
   * @returns {Object|null} User scenario or null if not found
   */
  getUserScenario(key) {
    try {
      const userScenarios = this.getUserScenariosFromStorage();
      return userScenarios[key] || null;
    } catch (error) {
      console.error('Error getting user scenario:', error);
      return null;
    }
  }
}
