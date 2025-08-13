/**
 * Event Bus - Central communication hub for loose coupling
 * Enables components to communicate without direct dependencies
 */
export class EventBus {
  constructor() {
    this.events = new Map();
    this.debugMode = false;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {function} callback - Event handler
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
    
    if (this.debugMode) {
      console.log(`📡 EventBus: Subscribed to '${event}'`);
    }
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.debugMode) {
      console.log(`📡 EventBus: Emitting '${event}'`, data);
    }

    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ EventBus: Error in handler for '${event}':`, error);
          // Emit error event for global error handling
          this.emit('system:error', { 
            originalEvent: event, 
            error, 
            data 
          });
        }
      });
    }
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   * @param {string} event - Event name
   * @param {function} callback - Event handler
   */
  once(event, callback) {
    const onceWrapper = (data) => {
      callback(data);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
    
    if (this.debugMode) {
      console.log(`📡 EventBus: Subscribed once to '${event}'`);
    }
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {function} callback - Event handler to remove
   */
  off(event, callback) {
    if (this.events.has(event)) {
      const callbacks = this.events.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        if (this.debugMode) {
          console.log(`📡 EventBus: Unsubscribed from '${event}'`);
        }
      }
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  removeAllListeners(event) {
    if (this.events.has(event)) {
      this.events.delete(event);
      if (this.debugMode) {
        console.log(`📡 EventBus: Removed all listeners for '${event}'`);
      }
    }
  }

  /**
   * Get list of all registered events
   * @returns {string[]} Array of event names
   */
  getEvents() {
    return Array.from(this.events.keys());
  }

  /**
   * Enable/disable debug logging
   * @param {boolean} enabled - Debug mode state
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`📡 EventBus: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
}
