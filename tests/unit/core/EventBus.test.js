/**
 * EventBus Unit Tests
 */

import { EventBus } from '../../../scripts/core/EventBus.js';

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('emit re-entrancy (ISSUES.md #11)', () => {
    test('should call every once() listener even when an earlier one unsubscribes during the same emit', () => {
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();

      eventBus.once('test:event', firstCallback);
      eventBus.once('test:event', secondCallback);

      eventBus.emit('test:event', 'payload');

      expect(firstCallback).toHaveBeenCalledWith('payload');
      expect(secondCallback).toHaveBeenCalledWith('payload');
    });

    test('should call a regular listener even when an earlier handler calls off() on itself mid-emit', () => {
      const laterCallback = jest.fn();
      const selfUnsubscribing = (data) => {
        eventBus.off('test:event', selfUnsubscribing);
      };

      eventBus.on('test:event', selfUnsubscribing);
      eventBus.on('test:event', laterCallback);

      eventBus.emit('test:event', 'payload');

      expect(laterCallback).toHaveBeenCalledWith('payload');
    });
  });
});
