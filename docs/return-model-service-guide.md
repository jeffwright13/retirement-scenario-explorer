# Return Model Service Guide

The ReturnModelService provides customizable random return sequence generation for Monte Carlo analysis in the Retirement Scenario Explorer. This service enables sophisticated modeling of market returns using different statistical approaches.

## Overview

The ReturnModelService follows the event-driven architecture and provides three distinct return models:

1. **Simple Random Model** - Independent normal distributions
2. **Historical Bootstrap Model** - Random sampling from historical data
3. **Historical Sequence Model** - Complete historical sequences preserving sequence risk

## Architecture

### Event Bus Integration

All interactions with the ReturnModelService occur through the event bus:

```javascript
// Set active return model
eventBus.emit('returnmodel:set-model', {
  modelType: 'historical-bootstrap',
  config: { investment_adjustment: 0.01 }
});

// Generate returns for simulation
eventBus.emit('returnmodel:generate-returns', {
  simulationId: 'sim-123',
  assetTypes: ['investment', 'bond'],
  duration: 360, // months
  seed: 12345,
  config: { investment_mean: 0.08 }
});
```

### Service Events

**Outbound Events:**
- `returnmodel:model-changed` - Emitted when active model changes
- `returnmodel:returns-generated` - Emitted when returns are generated
- `returnmodel:generation-error` - Emitted on generation errors
- `returnmodel:export-ready` - Emitted when export data is ready
- `returnmodel:available-models` - Response to model list requests

**Inbound Events:**
- `returnmodel:set-model` - Set active return model
- `returnmodel:generate-returns` - Generate return sequences
- `returnmodel:export-history` - Export return history
- `returnmodel:get-available-models` - Request available models

## Return Models

### 1. Simple Random Model

**Type:** `simple-random`

Uses independent normal distributions for each asset type and time period.

**Configuration:**
```javascript
{
  investment_mean: 0.07,     // Annual return mean (default: 0.07)
  investment_stddev: 0.15,   // Standard deviation (default: 0.15)
  bond_mean: 0.04,           // Bond-specific parameters
  bond_stddev: 0.08
}
```

**Characteristics:**
- Independent returns across time periods
- Configurable mean and standard deviation per asset type
- No correlation between consecutive periods
- Suitable for basic Monte Carlo analysis

### 2. Historical Bootstrap Model

**Type:** `historical-bootstrap`

Randomly samples from actual historical market returns (S&P 500, 1926-2023).

**Configuration:**
```javascript
{
  investment_adjustment: 0.01,  // Add 1% to historical returns
  bond_adjustment: -0.005      // Subtract 0.5% from bond returns
}
```

**Characteristics:**
- Uses 97 years of S&P 500 historical data
- Preserves natural correlation between asset classes
- Random sampling maintains statistical properties
- Adjustments allow for forward-looking assumptions

**Historical Data Coverage:**
- **Stock Returns:** S&P 500 annual returns 1926-2023
- **Bond Returns:** Representative bond index returns
- **Asset Mapping:** Automatic mapping of asset types to historical data

### 3. Historical Sequence Model

**Type:** `historical-sequence`

Uses complete historical return sequences to preserve sequence risk.

**Configuration:**
```javascript
{
  investment_adjustment: 0.01,  // Adjustment to historical sequences
  bond_adjustment: 0.0
}
```

**Characteristics:**
- Preserves actual historical sequences
- Models sequence risk (order of returns matters)
- Realistic correlation patterns
- Handles duration longer than historical data through concatenation

## Monte Carlo Integration

### Configuration

Return models are configured through Monte Carlo analysis settings:

```javascript
const monteCarloConfig = {
  iterations: 1000,
  returnModel: 'historical-bootstrap',
  returnModelConfig: {
    investment_adjustment: 0.01,
    bond_mean: 0.04
  },
  // ... other Monte Carlo settings
};
```

### UI Integration

The return model selection is available in the Monte Carlo configuration panel:

- **Return Model Dropdown:** Choose between Simple Random, Historical Bootstrap, or Historical Sequence
- **Advanced Configuration:** Additional parameters can be configured programmatically
- **Seed Control:** Reproducible results through seed specification

## Usage Examples

### Basic Usage

```javascript
// Initialize service
const returnModelService = new ReturnModelService(eventBus);

// Set historical bootstrap model
eventBus.emit('returnmodel:set-model', {
  modelType: 'historical-bootstrap',
  config: {}
});

// Generate returns
eventBus.emit('returnmodel:generate-returns', {
  simulationId: 'retirement-analysis-1',
  assetTypes: ['investment'],
  duration: 360, // 30 years
  seed: 42
});
```

### Advanced Configuration

```javascript
// Configure multiple asset types with custom parameters
eventBus.emit('returnmodel:set-model', {
  modelType: 'simple-random',
  config: {
    stock_mean: 0.08,
    stock_stddev: 0.18,
    bond_mean: 0.04,
    bond_stddev: 0.06,
    cash_mean: 0.02,
    cash_stddev: 0.01
  }
});
```

### Export and Analysis

```javascript
// Export return history for analysis
eventBus.emit('returnmodel:export-history', {
  simulationId: 'retirement-analysis-1'
});

// Listen for export completion
eventBus.on('returnmodel:export-ready', (data) => {
  console.log('Export ready:', data.filename);
  // data.data contains complete return history
});
```

## Performance Considerations

### Model Performance

- **Simple Random:** Fastest generation, minimal memory usage
- **Historical Bootstrap:** Moderate performance, loads historical data once
- **Historical Sequence:** Similar to bootstrap, may require sequence concatenation

### Memory Management

The service includes automatic history cleanup:

```javascript
// Clear old return history (default: 24 hours)
returnModelService.clearHistory(24 * 60 * 60 * 1000);
```

### Seeded Randomization

All models support seeded randomization for reproducible results:

```javascript
// Same seed produces identical results
const seed = 12345;
// Multiple runs with same seed will generate identical return sequences
```

## Testing

Comprehensive test coverage includes:

- **Unit Tests:** Individual model functionality
- **Integration Tests:** Event bus integration
- **Statistical Tests:** Return distribution validation
- **Reproducibility Tests:** Seeded randomization verification

Run tests:
```bash
npm test -- --testPathPatterns=return-model-service
```

## Extending the Service

### Adding New Return Models

1. Create model class extending `BaseReturnModel`
2. Implement required methods:
   - `generateReturns(params)`
   - `getDisplayName()`
   - `getDescription()`
   - `getCapabilities()`
3. Register model with service:
   ```javascript
   returnModelService.registerModel('custom-model', CustomModel);
   ```

### Custom Return Model Example

```javascript
export class CustomReturnModel extends BaseReturnModel {
  generateReturns({ assetTypes, duration, seed, config = {} }) {
    const rng = this.createRNG(seed);
    const returns = {};
    
    for (const assetType of assetTypes) {
      returns[assetType] = [];
      for (let period = 0; period < duration; period++) {
        // Custom return generation logic
        const customReturn = this.customGenerationLogic(rng, config);
        returns[assetType].push(customReturn);
      }
    }
    
    return returns;
  }
  
  getDisplayName() { return 'Custom Model'; }
  getDescription() { return 'Custom return generation approach'; }
  getCapabilities() {
    return {
      supportsMultipleAssets: true,
      supportsCorrelation: false,
      supportsRegimes: false,
      supportsSequenceRisk: false
    };
  }
}
```

## Troubleshooting

### Common Issues

**Model Not Found Error:**
```javascript
// Error: Unknown return model: invalid-model
// Solution: Use valid model names: 'simple-random', 'historical-bootstrap', 'historical-sequence'
```

**Generation Errors:**
```javascript
// Listen for generation errors
eventBus.on('returnmodel:generation-error', (data) => {
  console.error('Generation failed:', data.error);
});
```

**Missing Configuration:**
```javascript
// Models handle missing config gracefully with defaults
// No explicit error handling needed for missing config parameters
```

### Debugging

Enable debug logging:
```javascript
// Service logs key operations to console
// Look for messages prefixed with "📈 ReturnModelService:"
```

## Future Enhancements

Potential extensions to the ReturnModelService:

1. **Regime-Switching Models** - Different market regimes (bull/bear markets)
2. **Correlation Models** - Explicit asset correlation modeling
3. **Economic Factor Models** - Returns based on economic indicators
4. **Custom Distribution Models** - Non-normal return distributions
5. **Real-Time Data Integration** - Live market data incorporation

## References

- **Historical Data Source:** S&P 500 returns 1926-2023
- **Statistical Methods:** Box-Muller transformation for normal distributions
- **Random Number Generation:** Mulberry32 PRNG for seeded randomization
- **Architecture Pattern:** Event-driven service architecture
