# Monte Carlo Analysis - Technical Implementation Guide

## Overview

This document describes the technical implementation of Monte Carlo simulation for retirement planning in the Retirement Scenario Explorer, including mathematical foundations, return modeling approaches, and references for further research.

## Architecture

### Event-Driven Design
The Monte Carlo system follows strict event bus architecture:

```
MonteCarloController → MonteCarloService → SimulationService → ReturnModelService
                                      ↓
                                  TimeAware Engine
```

All data flows through events - no direct parameter passing between components.

### Core Components

**MonteCarloService** (`/scripts/services/MonteCarloService.js`)
- Orchestrates thousands of simulation iterations
- Manages random number generation with seeded reproducibility
- Calculates statistical analysis and risk metrics
- Handles progress tracking and cancellation

**ReturnModelService** (`/scripts/services/ReturnModelService.js`)
- Generates return sequences using configurable models
- Supports three return generation approaches
- Maintains return history for export and analysis

**SimulationService** (`/scripts/services/SimulationService.js`)
- Triggers return sequence generation for Monte Carlo context
- Executes individual simulations via timeaware-engine
- Generates business insights and metrics

## Return Models

### 1. Simple Random Model
**Mathematical Foundation**: Independent normal distributions per asset type per year.

```
R_t ~ N(μ, σ²)
```

Where:
- `R_t` = Return in year t
- `μ` = Mean annual return (10% for stocks, 4% for bonds, 2% for cash)
- `σ` = Standard deviation (16% for stocks, 5% for bonds, 1% for cash)

**Characteristics**:
- No serial correlation between years
- Configurable mean and volatility per asset type
- Fastest computation, simplest assumptions

### 2. Historical Bootstrap Model
**Mathematical Foundation**: Random sampling with replacement from historical data (1926-2023).

```
R_t = Historical_Returns[random_index]
```

**Characteristics**:
- Uses actual S&P 500 return data
- Preserves historical distribution shape
- Some implicit correlation from real market patterns
- 97 years of historical data

### 3. Historical Sequence Model
**Mathematical Foundation**: Complete historical sequences preserving temporal correlations.

```
R_t, R_{t+1}, ..., R_{t+n} = Historical_Sequence[start_year:start_year+n]
```

**Characteristics**:
- Preserves actual year-to-year correlations
- Maintains sequence risk patterns
- Most realistic for retirement planning
- Captures regime switching and volatility clustering

## Statistical Analysis

### Risk Metrics Calculated

**Value at Risk (VaR)**:
```
VaR_α = Percentile(Final_Balances, α)
```
Typically α = 5% (worst 5% of outcomes)

**Conditional Value at Risk (CVaR)**:
```
CVaR_α = E[Final_Balance | Final_Balance ≤ VaR_α]
```
Expected loss in worst α% of cases

**Maximum Drawdown**:
```
MDD = max_t((Peak_Balance - Current_Balance_t) / Peak_Balance)
```

**Success Rate**:
```
Success_Rate = Count(Survival_Time ≥ Target_Years) / Total_Iterations
```

### Survival Time Analysis
The system calculates when portfolios become depleted:

```javascript
// Find depletion month
const depletionMonth = results.findIndex(month => totalBalance <= 0);
const survivalTime = depletionMonth === -1 ? totalMonths : depletionMonth;
```

## Sequence Risk Implementation

### The Problem
Sequence risk occurs when poor returns happen early in retirement when portfolio balances are highest. A -20% loss on $1M hurts more than -20% on $500K.

### Our Approach
1. **Multiple Return Models**: Different correlation assumptions
2. **Percentile Analysis**: Identify worst-case scenarios
3. **Key Scenario Extraction**: Export specific return sequences for analysis
4. **Survival Time Focus**: Emphasize duration over final balance

## Export Functionality

### Monte Carlo Results Export
Exports comprehensive trajectory data:
- Monthly balance history per asset
- Success/failure classification
- Survival time metrics
- Statistical summaries

### Monte Carlo Returns Export
Exports year-over-year return sequences:
- Annual returns per asset type per scenario
- Enables correlation analysis
- Supports custom return model validation

## Mathematical Foundations

### Normal Distribution Generation
Uses Box-Muller transform for high-quality random numbers:

```javascript
const u1 = rng(), u2 = rng();
const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
return mean + stdDev * z0;
```

### Seeded Randomization
Mulberry32 PRNG for reproducible results:

```javascript
let t = state += 0x6D2B79F5;
t = Math.imul(t ^ t >>> 15, t | 1);
t ^= t + Math.imul(t ^ t >>> 7, t | 61);
return ((t ^ t >>> 14) >>> 0) / 4294967296;
```

### Percentile Calculation
Linear interpolation for accurate percentiles:

```javascript
const index = (p / 100) * (sortedArray.length - 1);
const lower = Math.floor(index), upper = Math.ceil(index);
const weight = index - lower;
return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
```

## Real-World Correlation Patterns

### Serial Correlation
Real markets show slight negative correlation (-0.1 to -0.2):
- Mean reversion tendency
- Extreme years often followed by corrections
- Not implemented in Simple Random model

### Volatility Clustering
High volatility periods cluster together:
- Bear markets: 1-3 years of high volatility
- Bull markets: 5-10 years of lower volatility
- Captured in Historical Sequence model

### Regime Switching
Markets alternate between regimes:
- Bull regime: μ = 12%, σ = 14%
- Bear regime: μ = -5%, σ = 25%
- Transition probabilities: P(Bull→Bear) = 0.1, P(Bear→Bull) = 0.3

## Performance Considerations

### Batch Processing
Simulations run in configurable batches to prevent browser freeze:
- Default: 2 batches with 10ms delays
- Progress updates every 10 iterations
- Maximum 1000 iterations to prevent overload

### Memory Management
- Return sequences stored temporarily during analysis
- Automatic cleanup of old return history
- Efficient percentile calculations using sorted arrays

## Configuration Options

### Monte Carlo Parameters
- **Iterations**: 10-1000 (default: 100)
- **Random Seed**: For reproducible results
- **Target Years**: Success rate calculation
- **Confidence Intervals**: [10, 25, 50, 75, 90]%

### Return Model Parameters
- **Asset-specific means**: Configurable per asset type
- **Volatility levels**: Realistic defaults by asset class
- **Correlation settings**: Model-dependent

## Further Research & Resources

### Academic Foundations
- **Wade Pfau** - Leading researcher on sequence risk and retirement income
  - SSRN Papers: https://papers.ssrn.com/sol3/cf_dev/AbsByAuth.cfm?per_id=388906
  - RetirementResearcher.com - Technical blog and research
- **"The Four Approaches to Managing Retirement Income Risk"** - Foundational paper on sequence risk management

### Technical Resources
- **Journal of Financial Planning** - Academic papers on Monte Carlo methods
- **CFA Institute Research** - Professional-grade modeling techniques
- **Morningstar Research** - Practical implementation guides

### Advanced Topics
- **Copula Models** - Advanced correlation modeling between asset classes
- **Regime Switching Models** - Bull/bear market state transitions with different parameters
- **Bootstrap vs Parametric** - Historical sampling vs mathematical distributions
- **Volatility Clustering** - GARCH models for time-varying volatility
- **Fat Tails & Skewness** - Non-normal return distributions

### Practical Tools
- **Portfolio Visualizer** - Online Monte Carlo experimentation
- **FidSafe Research** - Technical papers on return correlation
- **R/Python Libraries**: 
  - `quantmod`, `PerformanceAnalytics` (R)
  - `numpy`, `scipy.stats`, `arch` (Python)

### Key Concepts
- **Sequence Risk** - Why order of returns matters more than average returns
- **Safe Withdrawal Rates** - 4% rule and dynamic alternatives
- **Glide Paths** - Asset allocation changes during retirement
- **Buffer Assets** - Cash reserves and alternative income sources

## Implementation Notes

### Current Limitations
1. **Simple Random Model**: No year-to-year correlation
2. **Asset Correlation**: No cross-asset correlation modeling
3. **Regime Switching**: Not implemented (could be added)
4. **Fat Tails**: Normal distributions don't capture market crashes well

### Future Enhancements
1. **AR(1) Process**: Add serial correlation to Simple Random model
2. **Multi-Asset Correlation**: Implement correlation matrices
3. **Regime Switching**: Add bull/bear market states
4. **Custom Distributions**: Support for skewed/fat-tailed distributions
5. **Economic Scenarios**: Inflation, interest rate modeling

## Code Examples

### Switching Return Models
```javascript
// Via UI dropdown or programmatically:
eventBus.emit('returnmodel:set-model', {
  modelType: 'historical-sequence',  // or 'simple-random', 'historical-bootstrap'
  config: {
    stock_mean: 0.10,
    stock_stddev: 0.16
  }
});
```

### Custom Return Generation
```javascript
// Request return sequences for analysis
eventBus.emit('returnmodel:generate-returns', {
  simulationId: 'analysis-123',
  assetTypes: ['stock', 'bond', 'cash'],
  duration: 30,  // years
  seed: 42,      // for reproducibility
  config: { stock_adjustment: 0.02 }  // 2% premium
});
```

---

*This implementation provides a solid foundation for retirement income analysis while maintaining flexibility for future enhancements and research.*
