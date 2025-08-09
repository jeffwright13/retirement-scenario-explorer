/**
 * Scenario Management Module
 * Handles scenario discovery, loading, and data processing
 * No UI manipulation - pure data layer
 */

export class ScenarioManager {
  constructor() {
    this.discoveredScenarios = {};
    this.registeredFiles = new Set(); // Track what we've found
    
    // Smart discovery patterns - common scenario naming
    this.discoveryPatterns = [
      // Inflation scenarios
      'inflation-none.json', 'inflation-0pct.json', 'inflation-zero.json',
      'inflation-3pct.json', 'inflation-low.json', 'inflation-normal.json',
      'inflation-70s.json', 'inflation-high.json', 'inflation-8pct.json',
      
      // Personal scenarios  
      'personal.json', 'personal-test.json', 'my-scenario.json', 'portfolio.json',
      
      // Advanced scenarios
      'sequence-crash-2008.json', 'sequence-returns.json', 'market-crash.json',
      'ssdi-approved.json', 'disability.json', 'early-retirement.json',
      
      // Template scenarios
      'template.json', 'blank-template.json', 'example.json', 'sample.json',
      'basic.json', 'simple.json', 'starter.json'
    ];
  }

  // Smart auto-discovery with pattern matching and user registration
  async discoverScenarios() {
    console.log('🔍 Smart scenario discovery starting...');
    this.discoveredScenarios = {};
    
    // Try all discovery patterns
    await this.discoverByPatterns();
    
    // Try any user-registered files  
    await this.discoverRegisteredFiles();
    
    console.log(`🎉 Discovery complete! Found ${Object.keys(this.discoveredScenarios).length} scenarios`);
    console.log(`📁 Discovered files: ${Array.from(this.registeredFiles).join(', ')}`);
    
    return this.discoveredScenarios;
  }

  // Try common scenario file patterns
  async discoverByPatterns() {
    for (const filename of this.discoveryPatterns) {
      await this.tryLoadScenario(filename);
    }
  }

  // Try any files the user has registered
  async discoverRegisteredFiles() {
    for (const filename of this.registeredFiles) {
      if (!this.discoveryPatterns.includes(filename)) {
        await this.tryLoadScenario(filename);
      }
    }
  }

  // Attempt to load a scenario file
  async tryLoadScenario(filename) {
    try {
      console.log(`🔍 Trying: ${filename}`);
      const response = await fetch(`data/scenarios/${filename}`);
      
      if (response.ok) {
        const scenarioData = await response.json();
        
        // Extract scenario key and data from self-contained file
        const scenarioKey = Object.keys(scenarioData)[0];
        const scenario = scenarioData[scenarioKey];
        
        if (scenario && scenario.metadata) {
          this.discoveredScenarios[scenarioKey] = {
            filename: filename,
            ...scenario
          };
          this.registeredFiles.add(filename);
          console.log(`✅ Found: ${scenarioKey} (${scenario.metadata.title})`);
          return true;
        } else {
          console.warn(`⚠️ Invalid format in ${filename}: missing metadata`);
          return false;
        }
      } else {
        // File doesn't exist - not an error, just debug info
        console.log(`📁 Not found: ${filename}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error loading ${filename}:`, error.message);
      return false;
    }
  }

  // Get all discovered scenarios
  getDiscoveredScenarios() {
    return this.discoveredScenarios;
  }

  // Get a specific scenario by key
  getScenario(scenarioKey) {
    return this.discoveredScenarios[scenarioKey] || null;
  }

  // Group scenarios by tags for dropdown organization
  groupScenariosByTag(scenarios = this.discoveredScenarios) {
    const groups = {
      'Learning Examples': [],
      'Templates': [],
      'Advanced': [],
      'Personal': []
    };
    
    for (const [key, scenario] of Object.entries(scenarios)) {
      const tags = scenario.metadata.tags || [];
      
      if (tags.includes('template')) {
        groups['Templates'].push([key, scenario]);
      } else if (tags.includes('personal')) {
        groups['Personal'].push([key, scenario]);
      } else if (tags.includes('advanced')) {
        groups['Advanced'].push([key, scenario]);
      } else {
        groups['Learning Examples'].push([key, scenario]);
      }
    }
    
    return groups;
  }

  // Extract clean scenario data for simulation (removes metadata)
  getSimulationData(scenarioKey) {
    const scenario = this.getScenario(scenarioKey);
    if (!scenario) {
      return null;
    }

    return {
      title: scenario.metadata.title,
      plan: scenario.plan,
      assets: scenario.assets,
      income: scenario.income,
      order: scenario.order
    };
  }

  // Load discussion file for a scenario
  async loadDiscussion(scenario) {
    if (!scenario.metadata.discussion_file) {
      return null;
    }
    
    try {
      const response = await fetch(`data/${scenario.metadata.discussion_file}`);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.error(`Failed to load discussion:`, error);
    }
    return null;
  }

  // Validate scenario format
  validateScenario(scenarioData) {
    const errors = [];

    // Check required top-level fields
    if (!scenarioData.plan) {
      errors.push('Missing "plan" section');
    }
    if (!scenarioData.assets || !Array.isArray(scenarioData.assets)) {
      errors.push('Missing or invalid "assets" array');
    }
    if (!scenarioData.order || !Array.isArray(scenarioData.order)) {
      errors.push('Missing or invalid "order" array');
    }

    // Check plan details
    if (scenarioData.plan) {
      if (typeof scenarioData.plan.monthly_expenses !== 'number') {
        errors.push('Plan must have numeric "monthly_expenses"');
      }
      if (typeof scenarioData.plan.duration_months !== 'number') {
        errors.push('Plan must have numeric "duration_months"');
      }
    }

    // Check assets
    if (scenarioData.assets) {
      scenarioData.assets.forEach((asset, index) => {
        if (!asset.name) {
          errors.push(`Asset ${index + 1} missing "name"`);
        }
        if (typeof asset.balance !== 'number') {
          errors.push(`Asset "${asset.name}" must have numeric "balance"`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Convert legacy scenario format if needed
  convertLegacyScenario(scenarioData) {
    // Convert legacy withdrawal_priority to new order format
    if (scenarioData.withdrawal_priority && !scenarioData.order) {
      console.warn("⚠️ Converting legacy 'withdrawal_priority' to 'order' format");
      scenarioData.order = scenarioData.withdrawal_priority.map((item) => ({
        account: item.account,
        order: item.priority,
      }));
      delete scenarioData.withdrawal_priority;
    }

    return scenarioData;
  }

  // Public API: Register a new scenario file for discovery
  registerScenarioFile(filename) {
    if (!filename.endsWith('.json')) {
      filename += '.json';
    }
    
    this.registeredFiles.add(filename);
    console.log(`📝 Registered new scenario file: ${filename}`);
    console.log(`💡 Run refreshScenarios() to discover it!`);
  }

  // Public API: Re-run discovery (useful after adding new files)
  async refreshDiscovery() {
    console.log('🔄 Refreshing scenario discovery...');
    return await this.discoverScenarios();
  }

  // Add a new scenario file to the discovery list
  addScenarioFile(filename) {
    console.warn('⚠️ addScenarioFile() is deprecated. Use registerScenarioFile() instead.');
    return this.registerScenarioFile(filename);
  }

  // Get metadata for all scenarios (for listing/searching)
  getScenarioMetadata() {
    const metadata = {};
    for (const [key, scenario] of Object.entries(this.discoveredScenarios)) {
      metadata[key] = scenario.metadata;
    }
    return metadata;
  }

  // Search scenarios by tag
  searchByTag(tag) {
    const results = {};
    for (const [key, scenario] of Object.entries(this.discoveredScenarios)) {
      if (scenario.metadata.tags && scenario.metadata.tags.includes(tag)) {
        results[key] = scenario;
      }
    }
    return results;
  }
}