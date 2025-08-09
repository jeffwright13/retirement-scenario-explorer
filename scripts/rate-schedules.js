/**
 * Rate Schedule System - Prototype
 * Handles time-varying rates with fluent pipeline interface
 */

export class RateScheduleManager {
  constructor() {
    this.schedules = new Map();
  }

  // Register a rate schedule
  addSchedule(name, schedule) {
    this.schedules.set(name, new RateSchedule(schedule));
  }

  // Get rate for specific month
  getRate(scheduleName, month) {
    const schedule = this.schedules.get(scheduleName);
    if (!schedule) {
      throw new Error(`Rate schedule '${scheduleName}' not found`);
    }
    return schedule.getRateForMonth(month);
  }

  // Bulk register from JSON
  loadSchedules(schedulesConfig) {
    for (const [name, config] of Object.entries(schedulesConfig)) {
      this.addSchedule(name, config);
    }
  }
}

export class RateSchedule {
  constructor(config) {
    this.config = config;
    this.cache = new Map(); // Cache calculated rates for performance
  }

  getRateForMonth(month) {
    // Check cache first
    if (this.cache.has(month)) {
      return this.cache.get(month);
    }

    let rate;
    
    // Handle different rate types
    if (this.config.type) {
      rate = this.calculateTypedRate(month);
    } else if (this.config.pipeline) {
      rate = this.calculatePipelineRate(month);
    } else {
      throw new Error('Invalid rate schedule configuration');
    }

    // Cache the result
    this.cache.set(month, rate);
    return rate;
  }

  calculateTypedRate(month) {
    switch (this.config.type) {
      case 'fixed':
        return this.config.rate;
        
      case 'sequence':
        return this.calculateSequenceRate(month);
        
      case 'map':
        return this.calculateMapRate(month);
        
      default:
        throw new Error(`Unknown rate type: ${this.config.type}`);
    }
  }

  calculateSequenceRate(month) {
    const startYear = this.config.start_year || 0;
    const currentYear = Math.floor(month / 12);
    const yearIndex = currentYear - startYear;
    
    if (yearIndex < 0 || yearIndex >= this.config.values.length) {
      // Outside sequence range - use default or last value
      return this.config.default_rate || this.config.values[this.config.values.length - 1] || 0;
    }
    
    return this.config.values[yearIndex];
  }

  calculateMapRate(month) {
    const currentYear = Math.floor(month / 12) + 2025; // Assuming start year 2025
    
    for (const period of this.config.periods) {
      if (currentYear >= period.start_year && currentYear <= period.stop_year) {
        return period.rate;
      }
    }
    
    // No matching period - use default
    return this.config.default_rate || 0;
  }

  calculatePipelineRate(month) {
    let rate = 0;
    
    for (const step of this.config.pipeline) {
      rate = this.applyPipelineStep(rate, step, month);
    }
    
    return rate;
  }

  applyPipelineStep(currentRate, step, month) {
    const [operation, params] = Object.entries(step)[0];
    
    switch (operation) {
      case 'start_with':
        return params;
        
      case 'add':
        return currentRate + params;
        
      case 'multiply':
        return currentRate * params;
        
      case 'add_noise':
        // Simple noise - in real version would use proper random generation
        const noise = (Math.random() - 0.5) * 2 * params.std_dev;
        return currentRate + noise;
        
      case 'add_trend':
        const years = Math.floor(month / 12);
        return currentRate + (params.annual_change * years);
        
      case 'add_cycles':
        const cycleYear = Math.floor(month / 12) % params.period;
        if (cycleYear === 0) {
          return currentRate + params.amplitude; // Boom
        } else if (cycleYear === Math.floor(params.period / 2)) {
          return currentRate + params.amplitude * -1; // Bust
        }
        return currentRate;
        
      case 'overlay_sequence':
        const year = Math.floor(month / 12) + 2025;
        if (params[year]) {
          return params[year]; // Override with specific value
        }
        return currentRate;
        
      case 'clamp':
        return Math.max(params.min, Math.min(params.max, currentRate));
        
      case 'floor':
        return Math.max(params, currentRate);
        
      case 'ceiling':
        return Math.min(params, currentRate);
        
      default:
        console.warn(`Unknown pipeline operation: ${operation}`);
        return currentRate;
    }
  }
}