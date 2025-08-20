/**
 * Examples Service - Loads progressive learning examples
 * Provides curated scenarios for educational progression
 */
export class ExamplesService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.catalog = null;
    this.examples = new Map();
    
    console.log('📚 ExamplesService created');
  }

  /**
   * Load the examples catalog
   */
  async loadCatalog() {
    try {
      const response = await fetch('./data/examples/catalog.json');
      if (!response.ok) {
        throw new Error(`Failed to load catalog: ${response.status}`);
      }
      
      this.catalog = await response.json();
      this.eventBus.emit('examples:catalog-loaded', this.catalog);
      
      console.log(`📚 Loaded ${this.catalog.length} examples in catalog`);
      return this.catalog;
      
    } catch (error) {
      console.error('❌ Failed to load examples catalog:', error);
      this.eventBus.emit('examples:catalog-error', { error: error.message });
      throw error;
    }
  }

  /**
   * Load a specific example by ID
   */
  async loadExampleById(id) {
    try {
      // Check if already cached
      if (this.examples.has(id)) {
        return this.examples.get(id);
      }
      
      const response = await fetch(`./data/examples/${id}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load example ${id}: ${response.status}`);
      }
      
      const example = await response.json();
      this.examples.set(id, example);
      
      this.eventBus.emit('examples:example-loaded', { id, example });
      
      console.log(`📚 Loaded example: ${example.metadata.title}`);
      return example;
      
    } catch (error) {
      console.error(`❌ Failed to load example ${id}:`, error);
      this.eventBus.emit('examples:example-error', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get catalog by difficulty level
   */
  getCatalogByLevel(level) {
    if (!this.catalog) return [];
    return this.catalog.filter(item => item.level === level);
  }

  /**
   * Get all beginner examples
   */
  getBeginnerExamples() {
    return this.getCatalogByLevel('beginner');
  }

  /**
   * Get all intermediate examples
   */
  getIntermediateExamples() {
    return this.getCatalogByLevel('intermediate');
  }

  /**
   * Get all advanced examples
   */
  getAdvancedExamples() {
    return this.getCatalogByLevel('advanced');
  }

  /**
   * Get full catalog
   */
  getCatalog() {
    return this.catalog || [];
  }

  /**
   * Check if catalog is loaded
   */
  isCatalogLoaded() {
    return this.catalog !== null;
  }

  /**
   * Get example metadata by ID
   */
  getExampleMetadata(id) {
    if (!this.catalog) return null;
    return this.catalog.find(item => item.id === id);
  }
}
