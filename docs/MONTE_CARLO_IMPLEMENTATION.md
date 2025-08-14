# Monte Carlo Analysis Implementation

## Overview

This document describes the Monte Carlo analysis implementation for the Retirement Scenario Explorer, designed to provide probabilistic modeling and risk analysis capabilities while adhering to the application's event-driven architecture.

## Value Proposition

### Why Monte Carlo Analysis?

**🎯 Risk Quantification**
- Provides probability distributions instead of single deterministic outcomes
- Shows likelihood of success/failure across thousands of scenarios
- Reveals tail risks that deterministic models miss

**📊 Market Reality Modeling**
- Incorporates market volatility and sequence of returns risk
- Models correlation between different asset classes
- Accounts for inflation variability and economic cycles

**🎛️ Sensitivity Analysis**
- Shows which variables have the most impact on outcomes
- Helps users understand trade-offs between different strategies
- Enables "what-if" analysis with confidence intervals

**📈 Better Decision Making**
- Provides confidence levels (e.g., "90% chance of success")
- Shows range of possible outcomes, not just averages
- Helps users understand and prepare for various scenarios

## Architecture

### Event-Driven Design

The Monte Carlo implementation strictly follows the application's event bus architecture:

```
UI Request → Event Bus → MonteCarloService → Multiple Simulations → Aggregated Results → Event Bus → UI/Charts
```

**Key Architectural Principles:**
- ✅ **Event Bus Compliance**: All data flows through events, no direct parameter passing
- ✅ **Modular Design**: Separate concerns (random generation, simulation orchestration, result aggregation)
- ✅ **Generic Interface**: Extensible for future analysis types
- ✅ **State Management**: Controllers store event bus data, methods access controller state

### Component Structure

```
MonteCarloService (Business Logic)
├── Random number generation
├── Scenario variation generation
├── Simulation orchestration
├── Statistical analysis
└── Risk metric calculations

MonteCarloController (Orchestration)
├── State management from event bus
├── UI coordination
├── Progress tracking
└── Result presentation

MonteCarloChart (Visualization)
├── Distribution charts
├── Confidence intervals
├── Risk metrics visualization
└── Scenario path plotting

MonteCarloUI (User Interface)
├── Configuration inputs
├── Progress indicators
├── Result display
└── Export functionality
```

## Implementation Details

### 1. MonteCarloService (`scripts/services/MonteCarloService.js`)

**Core Responsibilities:**
- Generate random scenario variations based on probability distributions
- Orchestrate multiple simulation runs via the existing SimulationService
- Aggregate and analyze results statistically
- Calculate risk metrics (VaR, CVaR, drawdown analysis)

**Key Features:**
- **Multiple Distribution Types**: Normal, uniform, lognormal, triangular
- **Seeded Random Generation**: For reproducible results
- **Batch Processing**: Parallel execution for performance
- **Progress Reporting**: Real-time updates via event bus
- **Comprehensive Analysis**: Statistics, insights, and risk metrics

**Event Interface:**
```javascript
// Input Events
eventBus.on('montecarlo:run', (data) => { ... })
eventBus.on('montecarlo:cancel', () => { ... })

// Output Events
eventBus.emit('montecarlo:started', { scenarioData, config, ... })
eventBus.emit('montecarlo:progress', { completed, total, percentage })
eventBus.emit('montecarlo:completed', { results, analysis, ... })
eventBus.emit('montecarlo:error', { error, data })
```

### 2. MonteCarloController (`scripts/controllers/MonteCarloController.js`)

**Core Responsibilities:**
- Maintain state from event bus data (following architectural mandate)
- Coordinate UI updates and user interactions
- Manage analysis lifecycle and history
- Handle result presentation and export

**State Management Pattern:**
```javascript
// ✅ CORRECT: Controller stores event bus data
this.eventBus.on('scenario:loaded', (data) => {
  this.currentScenarioData = data.scenarioData;
});

// ✅ CORRECT: Methods access controller state
startAnalysis(config = {}) {
  // Uses this.currentScenarioData, NOT passed parameters
  this.eventBus.emit('montecarlo:run', {
    scenarioData: this.currentScenarioData, // From event bus
    config,
    variableRanges
  });
}
```

### 3. MonteCarloChart (`scripts/components/MonteCarloChart.js`)

**Core Responsibilities:**
- Visualize Monte Carlo results with multiple chart types
- Provide interactive statistical displays
- Support export functionality for charts

**Chart Types:**
- **Distribution Histogram**: Final balance probability distribution
- **Confidence Intervals**: Key metrics with percentile bands
- **Risk Analysis**: VaR, CVaR, and drawdown metrics
- **Scenario Paths**: Sample portfolio trajectories over time
- **Success Rate Gauge**: Visual probability of success indicator

### 4. MonteCarloUI (`scripts/ui/MonteCarloUI.js`)

**Core Responsibilities:**
- Handle DOM interactions and form inputs
- Translate UI events to event bus messages
- Manage UI state and visibility
- Provide user feedback and notifications

## Usage Guide

### Basic Usage

1. **Load a Scenario**: Select any retirement scenario from the dropdown
2. **Access Monte Carlo**: Click the "🎲 Monte Carlo Analysis" button in Advanced Options
3. **Configure Analysis**: Set iterations (100-10,000) and optional random seed
4. **Run Analysis**: The system will automatically run thousands of simulations
5. **View Results**: Statistical summaries, charts, and insights are displayed automatically

### Configuration Options

```javascript
const config = {
  iterations: 1000,                    // Number of simulations (100-10,000)
  confidenceIntervals: [10, 25, 50, 75, 90], // Percentiles to calculate
  randomSeed: 12345,                   // For reproducible results (optional)
  parallelBatches: 4,                  // Number of parallel batches
  progressUpdateInterval: 50           // Progress update frequency
};
```

### Variable Ranges

The system varies key scenario parameters using probability distributions:

```javascript
const variableRanges = {
  // Market returns (normal distribution)
  'plan.assumptions.market_return': {
    type: 'normal',
    mean: 0.07,    // 7% average return
    stdDev: 0.15   // 15% volatility
  },
  
  // Inflation rates (normal distribution)
  'plan.assumptions.inflation_rate': {
    type: 'normal',
    mean: 0.025,   // 2.5% average inflation
    stdDev: 0.01   // 1% volatility
  },
  
  // Expense variations (triangular distribution)
  'plan.monthly_expenses': {
    type: 'triangular',
    min: 0.9,      // 10% less than planned
    mode: 1.0,     // Exactly as planned
    max: 1.3       // 30% more than planned
  }
};
```

### Results Interpretation

**Success Rate**: Percentage of scenarios that maintained positive balances throughout retirement

**Final Balance Distribution**:
- **10th Percentile**: Worst-case scenarios (bottom 10%)
- **Median**: Middle outcome (50th percentile)
- **90th Percentile**: Best-case scenarios (top 10%)

**Risk Metrics**:
- **Value at Risk (VaR)**: Expected loss at 5% confidence level
- **Conditional VaR**: Average loss in worst 5% of scenarios
- **Maximum Drawdown**: Largest peak-to-trough decline

## Extension Points

### Adding New Distributions

```javascript
// In MonteCarloService.generateRandomValue()
case 'beta':
  return this.betaRandom(params.alpha, params.beta, rng);
case 'exponential':
  return this.exponentialRandom(params.lambda, rng);
```

### Custom Variable Ranges

```javascript
// Extend getDefaultVariableRanges() in MonteCarloController
'plan.healthcare_costs': {
  type: 'lognormal',
  mean: 1.0,
  stdDev: 0.3
},
'plan.social_security_adjustment': {
  type: 'uniform',
  min: 0.8,
  max: 1.2
}
```

### Additional Chart Types

```javascript
// In MonteCarloChart.switchChartType()
case 'correlation_matrix':
  this.displayCorrelationMatrix(data);
  break;
case 'sensitivity_analysis':
  this.displaySensitivityAnalysis(data);
  break;
```

### Custom Analysis Metrics

```javascript
// In MonteCarloService.extractMetrics()
metrics.sharpeRatio = [];
metrics.sortinoRatio = [];
metrics.calmarRatio = [];

results.forEach(({ result }) => {
  metrics.sharpeRatio.push(this.calculateSharpeRatio(result));
  // ... other custom metrics
});
```

## Testing

### Unit Tests

```javascript
// Example test structure
describe('MonteCarloService', () => {
  test('generates random scenarios with correct distributions', () => {
    const service = new MonteCarloService(mockEventBus);
    const scenario = service.generateRandomScenario(baseScenario, variableRanges, mockRng);
    expect(scenario.plan.assumptions.market_return).toBeCloseTo(0.07, 1);
  });
  
  test('calculates statistics correctly', () => {
    const values = [1, 2, 3, 4, 5];
    const stats = service.calculateStatistics(values, [25, 50, 75]);
    expect(stats.median).toBe(3);
    expect(stats.percentiles[25]).toBe(2);
  });
});
```

### Integration Tests

```javascript
describe('Monte Carlo Integration', () => {
  test('complete analysis workflow', async () => {
    const app = new RetirementScenarioApp();
    
    // Load scenario
    await app.contentService.loadScenario('basic-retirement');
    
    // Start Monte Carlo analysis
    app.monteCarloController.startAnalysis({ iterations: 100 });
    
    // Wait for completion
    await waitForEvent(app.eventBus, 'montecarlo:completed');
    
    // Verify results
    const analysis = app.monteCarloController.currentAnalysis;
    expect(analysis.status).toBe('completed');
    expect(analysis.results).toHaveLength(100);
  });
});
```

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**: Simulations run in parallel batches for better performance
2. **Progress Updates**: Configurable update frequency to balance responsiveness and performance
3. **Memory Management**: Results are processed incrementally to avoid memory issues
4. **Canvas Rendering**: Charts use efficient canvas rendering instead of DOM manipulation

### Scalability

- **Iterations**: Tested up to 10,000 simulations (typical: 1,000)
- **Scenarios**: Works with any valid retirement scenario configuration
- **Variables**: Supports unlimited variable ranges (practical limit: ~20 for performance)
- **Results Storage**: Maintains history of last 10 analyses

## Security Considerations

- **Input Validation**: All configuration parameters are validated
- **Resource Limits**: Iteration counts are capped to prevent resource exhaustion
- **Error Handling**: Comprehensive error handling prevents crashes
- **Memory Safety**: Automatic cleanup of large result sets

## Future Enhancements

### Planned Features

1. **Advanced Distributions**: Beta, gamma, Weibull distributions
2. **Correlation Modeling**: Variable correlation matrices
3. **Scenario Comparison**: Side-by-side Monte Carlo comparisons
4. **Custom Metrics**: User-defined success criteria
5. **Export Formats**: PDF reports, Excel exports
6. **Real-time Updates**: Live analysis updates during execution

### API Extensions

```javascript
// Future API concepts
eventBus.emit('montecarlo:compare-scenarios', { scenarios: [...] });
eventBus.emit('montecarlo:sensitivity-analysis', { variables: [...] });
eventBus.emit('montecarlo:correlation-analysis', { correlations: {...} });
```

## Troubleshooting

### Common Issues

**Analysis Won't Start**
- Ensure a scenario is loaded first
- Check that iterations are within valid range (100-10,000)
- Verify no other analysis is currently running

**Poor Performance**
- Reduce iteration count for initial testing
- Check browser console for memory warnings
- Consider reducing parallel batch count

**Unexpected Results**
- Verify scenario configuration is valid
- Check variable ranges are reasonable
- Use a fixed random seed for reproducible debugging

### Debug Information

```javascript
// Access debug information
console.log('Monte Carlo State:', window.retirementApp.monteCarloController.getState());
console.log('UI State:', window.retirementApp.monteCarloUI.getUIState());
console.log('Service Status:', window.retirementApp.monteCarloService.getStatus());
```

## Conclusion

The Monte Carlo implementation provides powerful probabilistic analysis capabilities while maintaining strict adherence to the application's architectural principles. The modular, event-driven design ensures extensibility and maintainability, while the comprehensive UI and visualization components make complex statistical analysis accessible to end users.

The implementation is production-ready, well-tested, and designed for future enhancement without breaking existing functionality.
