/**
 * Content Service - Manages scenarios, stories, and collections
 * Wraps the existing ContentManager with event-driven interface
 */
import { ContentManager } from '../content-manager.js';

export class ContentService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.contentManager = new ContentManager();
    this.isLoaded = false;
  }

  /**
   * Load all content and emit events
   * @returns {Promise<Object>} Content registry
   */
  async loadAllContent() {
    try {
      this.eventBus.emit('content:loading-started');
      
      const registry = await this.contentManager.discoverContent();
      this.isLoaded = true;
      
      // Emit specific content loaded events
      this.eventBus.emit('scenarios:loaded', this.getAllScenarios());
      this.eventBus.emit('stories:loaded', this.getAllStories());
      this.eventBus.emit('content:loaded', registry);
      
      // Emit any errors
      if (this.contentManager.registry.errors.length > 0) {
        this.eventBus.emit('content:errors', this.contentManager.registry.errors);
      }
      
      return registry;
      
    } catch (error) {
      this.eventBus.emit('content:loading-failed', error);
      throw error;
    }
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
    
    const scenario = this.contentManager.getScenario(scenarioKey);
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
    
    const story = this.contentManager.getStory(storyKey);
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
    const scenarios = this.contentManager.getAllScenarios();
    
    // ContentManager returns an object, convert to array with keys and flatten metadata
    if (scenarios && typeof scenarios === 'object' && !Array.isArray(scenarios)) {
      return Object.entries(scenarios).map(([key, scenario]) => {
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
          flattened.difficulty = scenario.metadata.difficulty || flattened.difficulty;
          flattened.author = scenario.metadata.author || flattened.author;
        }
        
        return flattened;
      });
    }
    
    return Array.isArray(scenarios) ? scenarios : [];
  }

  /**
   * Get all available stories
   * @returns {Array} Array of story objects with key property
   */
  getAllStories() {
    const stories = this.contentManager.getAllStories();
    
    // ContentManager returns an object, convert to array with keys and flatten metadata
    if (stories && typeof stories === 'object' && !Array.isArray(stories)) {
      return Object.entries(stories).map(([key, story]) => {
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
          flattened.difficulty = story.metadata.difficulty || flattened.difficulty;
          flattened.author = story.metadata.author || flattened.author;
        }
        
        return flattened;
      });
    }
    
    return Array.isArray(stories) ? stories : [];
  }

  /**
   * Get content summary
   * @returns {Object} Content summary
   */
  getContentSummary() {
    return this.contentManager.getContentSummary();
  }

  /**
   * Check if content has errors
   * @returns {boolean} True if there are content errors
   */
  hasErrors() {
    return this.contentManager.hasErrors();
  }

  /**
   * Get content errors
   * @returns {Array} Array of error objects
   */
  getErrors() {
    return this.contentManager.registry.errors;
  }

  /**
   * Refresh all content
   * @returns {Promise<Object>} Updated content registry
   */
  async refreshContent() {
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
