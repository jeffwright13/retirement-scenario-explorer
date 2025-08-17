# Custom Scenario Management Testing Guide

## Overview

This document outlines the testing strategy for localStorage-based custom scenario management functionality in the Retirement Scenario Explorer.

## Test Structure

### Unit Tests

#### `localStorage-scenario-operations.test.js` ✅ 
**Status: 10/10 tests passing**

Tests core localStorage operations:
- Basic CRUD operations (save, retrieve, delete, clear)
- Storage size calculations
- Error handling (JSON parsing, quota exceeded)
- Data validation and structure preservation

**Key Coverage:**
- Storage quota exceeded scenarios
- Corrupted data handling
- Metadata preservation
- Empty storage edge cases

#### `custom-scenario-management.test.js` ⚠️
**Status: Needs refactoring**

Original comprehensive test with mocking issues. Consider using the working localStorage operations test as a foundation for controller-level tests.

### Integration Tests

#### `scenario-selection-event-flow.test.js` ✅
**Status: 8/10 tests passing**

Tests event bus architecture compliance:
- Event-driven data flow validation
- UI state management through events
- Custom scenario management events
- Event sequence validation

**Minor Issues:**
- 2 tests need DOM mocking improvements
- Error handling test needs try-catch wrapper

#### `custom-scenario-ui-flow.test.js` ⚠️
**Status: Needs DOM environment setup**

UI workflow integration tests requiring proper jsdom setup.

### Test Fixtures

#### `custom-scenario-test-data.js` ✅
**Status: Complete**

Provides comprehensive test data:
- Sample custom scenarios (basic, aggressive, conservative)
- Large dataset for performance testing (50 scenarios)
- Mock localStorage utilities
- Helper functions for test setup

## Testing Strategy

### What We Test

1. **localStorage Operations**
   - Data persistence and retrieval
   - Error handling and edge cases
   - Storage quota management
   - Data integrity validation

2. **Event Bus Compliance**
   - Proper event-driven architecture
   - No direct parameter passing of business data
   - Controller state management
   - Event sequence validation

3. **UI Integration**
   - Modal management
   - Button interactions
   - Scenario selection flow
   - Visual feedback

4. **Error Scenarios**
   - Storage quota exceeded
   - Corrupted localStorage data
   - Missing DOM elements
   - Network/API failures

### What We Don't Test

1. **Browser-specific localStorage behavior** - Handled by browser testing
2. **CSS styling and layout** - Visual regression testing domain
3. **Performance under extreme load** - Load testing domain
4. **Cross-browser compatibility** - E2E testing domain

## Running Tests

```bash
# Run all custom scenario tests
npm test -- --testPathPatterns="custom-scenario|localStorage-scenario"

# Run specific test files
npm test -- tests/unit/localStorage-scenario-operations.test.js
npm test -- tests/integration/scenario-selection-event-flow.test.js

# Run with coverage
npm run test:coverage -- --testPathPatterns="custom-scenario"
```

## Test Maintenance

### When to Update Tests

1. **Adding new custom scenario features**
   - Add corresponding unit tests for new methods
   - Update integration tests for new event flows
   - Add test fixtures for new data structures

2. **Modifying localStorage schema**
   - Update data validation tests
   - Modify test fixtures
   - Verify backward compatibility

3. **Changing event bus architecture**
   - Update event flow integration tests
   - Verify architectural compliance tests
   - Check for event naming changes

### Test Data Management

- Use `custom-scenario-test-data.js` for consistent test scenarios
- Keep test data realistic but minimal
- Update fixtures when schema changes
- Use helper functions for test setup/teardown

### Mocking Guidelines

1. **localStorage**: Use stateful mocks that simulate real behavior
2. **DOM elements**: Mock only necessary properties and methods
3. **Event bus**: Provide simulation capabilities for testing flows
4. **Window functions**: Mock `confirm`, `alert`, etc. for user interactions

## Architectural Compliance Testing

### Critical Rules Tested

1. **Event Bus Architecture**: All data flow must go through event bus
2. **No Direct Parameter Passing**: Controllers store state from events
3. **State Access Pattern**: Methods access `this.currentData`, not parameters
4. **Event Naming Consistency**: Standard event naming conventions

### Validation Patterns

```javascript
// ✅ CORRECT: Event bus → Controller state → Method access
mockEventBus.on('scenario:selected', (data) => {
  this.currentScenario = data.scenario;
  this.processScenario(); // No parameters
});

// ❌ INCORRECT: Direct parameter passing
processScenario(scenarioData) { /* bypasses event bus */ }
```

## Future Enhancements

1. **E2E Tests**: Add Playwright tests for full user workflows
2. **Performance Tests**: Add tests for large scenario datasets
3. **Accessibility Tests**: Verify modal and UI accessibility
4. **Visual Regression**: Screenshot comparison for UI changes
5. **Cross-browser Tests**: Verify localStorage behavior across browsers

## Troubleshooting

### Common Test Failures

1. **Mock not working**: Check mock setup in `beforeEach`
2. **Event not firing**: Verify event bus simulation setup
3. **DOM element not found**: Check `document.getElementById` mock
4. **localStorage not persisting**: Ensure stateful mock implementation

### Debug Strategies

1. Add `console.log` in test handlers to trace execution
2. Use `jest.fn().mockImplementation()` for detailed mock behavior
3. Check mock call history with `.toHaveBeenCalledWith()`
4. Verify test isolation with proper cleanup in `beforeEach`

## Test Coverage Goals

- **Unit Tests**: >90% coverage for localStorage operations
- **Integration Tests**: >80% coverage for event flows
- **Error Handling**: 100% coverage for error scenarios
- **Architectural Compliance**: 100% coverage for event bus rules
