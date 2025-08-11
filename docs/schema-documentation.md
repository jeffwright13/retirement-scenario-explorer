# Retirement Scenario Explorer - JSON Schema Documentation

## Overview

The Retirement Scenario Explorer uses three main JSON schema types to define scenarios, stories, and rate schedules. These schemas provide validation, documentation, and IDE support for creating and maintaining financial scenarios.

## Schema Files

- **`scenario-schema.json`** - Individual retirement scenario records
- **`story-schema.json`** - Storyteller mode narrative files
- **`rate-schedule-schema.json`** - Time-varying rate calculation definitions

## 1. Scenario Schema (`scenario-schema.json`)

### Purpose
Defines the structure for individual retirement scenarios that can be simulated by the engine.

### Root Structure
```json
{
  "scenario-key": {
    "metadata": { /* scenario information */ },
    "plan": { /* simulation parameters */ },
    "assets": [ /* account definitions */ ],
    "income": [ /* income sources */ ],
    "order": [ /* withdrawal strategy */ ],
    "deposits": [ /* money additions */ ],
    "rate_schedules": { /* time-varying rates */ }
  }
}
```

### Key Sections

#### Metadata
Optional but recommended information about the scenario:
- `title` - Human-readable name
- `description` - Detailed explanation
- `tags` - Categories for organization
- `difficulty` - Complexity level
- `discussion_file` - Link to detailed analysis

#### Plan (Required)
Core simulation parameters:
- `monthly_expenses` (required) - Fixed monthly costs
- `duration_months` (required) - Simulation length
- `inflation_schedule` - Reference to rate schedule
- `stop_on_shortfall` - Auto-stop when money runs out

#### Assets (Required)
Array of financial accounts:
- `name` (required) - Unique identifier
- `balance` (required) - Starting amount
- `type` - Tax treatment (taxable/tax_deferred/tax_free)
- `return_schedule` - Reference to growth rate schedule
- `compounding` - Frequency of returns

#### Income (Optional)
Array of income sources:
- `name` (required) - Descriptive identifier
- `amount` (required) - Monthly amount (negative for expenses)
- `start_month` - When income begins
- `stop_month` - When income ends (omit for permanent)

#### Order (Optional)
Withdrawal strategy definition:
- `account` (required) - Asset name to withdraw from
- `order` (required) - Priority (1 = first, 2 = second, etc.)
- `weight` - For proportional withdrawals within same order

#### Deposits (Optional)
Planned additions to assets:
- `target` (required) - Asset to receive deposit
- `amount` (required) - Monthly deposit amount
- `start_month`/`stop_month` (required) - Timing

### Validation Features
- Ensures required fields are present
- Validates data types and ranges
- Checks enum values for categorical fields
- Provides detailed error messages for debugging

## 2. Story Schema (`story-schema.json`)

### Purpose
Defines narrative-driven tutorials that guide users through multiple related scenarios.

### Root Structure
```json
{
  "story-key": {
    "metadata": { /* story information */ },
    "chapters": [ /* narrative chapters */ ],
    "story_settings": { /* behavior configuration */ }
  }
}
```

### Key Sections

#### Metadata (Required)
Story information and organization:
- `title` (required) - Story name
- `description` (required) - What the story teaches
- `estimated_duration` - Expected completion time
- `difficulty` - Complexity level
- `tags` - Categories for discovery

#### Chapters (Required)
Array of story chapters:
- `title` (required) - Chapter name
- `scenario_key` (required) - Reference to scenario
- `narrative` (required) - Chapter content

#### Narrative Content
Each chapter narrative contains:
- `introduction` (required) - What this chapter explores
- `setup` - Scenario details and context
- `insights` - Dynamic content with template variables
- `key_takeaway` - Main lesson
- `transition` - Setup for next chapter
- `completion_message` - Final story message

### Template Variables
Stories support dynamic content that updates based on simulation results:
- `{{duration_years}}` - How long money lasts
- `{{money_runs_out_year}}` - When funds are depleted
- `{{monthly_expenses}}` - Monthly spending (formatted)
- `{{withdrawal_rate}}` - Annual withdrawal percentage
- `{{final_balance_formatted}}` - Ending balance
- `{{profit_formatted}}` - Investment gains
- `{{multiplier_formatted}}` - Growth multiplier

### Story Settings
Behavioral configuration:
- `auto_advance` - Automatically go to next chapter
- `show_chapter_progress` - Display progress indicator
- `allow_chapter_jumping` - Enable chapter navigation
- `reset_ui_between_chapters` - Clean state between chapters

## 3. Rate Schedule Schema (`rate-schedule-schema.json`)

### Purpose
Defines time-varying rates for inflation, asset returns, and other financial calculations.

### Rate Types

#### Fixed Rate
Constant rate throughout simulation:
```json
{
  "type": "fixed",
  "rate": 0.03
}
```

#### Sequence Rate
Different rate each year:
```json
{
  "type": "sequence",
  "start_year": 0,
  "values": [0.08, 0.06, 0.04, 0.03],
  "default_rate": 0.03
}
```

#### Map Rate
Rate based on time periods:
```json
{
  "type": "map",
  "periods": [
    {"start_year": 2025, "stop_year": 2030, "rate": 0.08},
    {"start_year": 2031, "stop_year": 2040, "rate": 0.03}
  ],
  "default_rate": 0.025
}
```

#### Pipeline Rate
Complex mathematical operations:
```json
{
  "type": "pipeline",
  "pipeline": [
    {"start_with": 0.05},
    {"add_trend": {"annual_change": 0.001}},
    {"add_noise": {"std_dev": 0.005}},
    {"clamp": {"min": 0.01, "max": 0.12}}
  ]
}
```

### Pipeline Operations
- `start_with` - Initialize rate
- `add` - Add constant value
- `multiply` - Multiply by factor
- `add_trend` - Add yearly change
- `add_noise` - Add random variation
- `add_cycles` - Add boom/bust cycles
- `overlay_sequence` - Override specific years
- `clamp` - Limit to min/max range
- `floor`/`ceiling` - Set minimum/maximum

## Usage and Validation

### File Organization
```
docs/
├── scenario-schema.json      # Scenario validation
├── story-schema.json         # Story validation
├── rate-schedule-schema.json # Rate schedule validation
└── schema-documentation.md   # This file

data/
├── scenarios/                # Scenario files
├── stories/                  # Story files
└── discussions/              # Supporting documentation
```

### IDE Integration
Most modern IDEs support JSON Schema validation when you add a `$schema` reference:

```json
{
  "$schema": "../docs/scenario-schema.json",
  "my-scenario": {
    "metadata": {
      "title": "My Retirement Scenario"
    },
    ...
  }
}
```

### Validation Tools
You can validate files using:
- **Online**: JSONSchemaLint.com
- **CLI**: `ajv-cli validate -s schema.json -d data.json`
- **Node.js**: AJV library
- **IDE**: Built-in JSON Schema support

### Error Messages
The schemas provide detailed validation errors:
- Missing required fields
- Incorrect data types
- Invalid enum values
- Out-of-range numbers
- Malformed references

## Migration Guide

### From Legacy Format
If you have scenarios using the old format:

1. **Withdrawal Priority**: Change `withdrawal_priority` to `order`
   ```json
   // Old
   "withdrawal_priority": [
     {"account": "Savings", "priority": 1}
   ]

   // New
   "order": [
     {"account": "Savings", "order": 1}
   ]
   ```

2. **Interest Rates**: Use `return_schedule` instead of `interest_rate`
   ```json
   // Old
   "assets": [
     {"name": "Savings", "interest_rate": 0.03}
   ]

   // New
   "assets": [
     {"name": "Savings", "return_schedule": "savings_rate"}
   ],
   "rate_schedules": {
     "savings_rate": {"type": "fixed", "rate": 0.03}
   }
   ```

3. **Inflation**: Use `inflation_schedule` instead of `inflation_rate`
   ```json
   // Old
   "plan": {
     "inflation_rate": 0.03
   }

   // New
   "plan": {
     "inflation_schedule": "standard_inflation"
   },
   "rate_schedules": {
     "standard_inflation": {"type": "fixed", "rate": 0.03}
   }
   ```

## Best Practices

### Scenario Design
1. **Use descriptive names** for assets and income sources
2. **Include metadata** for documentation and discovery
3. **Reference rate schedules** instead of inline rates
4. **Validate before committing** to catch errors early

### Story Creation
1. **Start with simple scenarios** and build complexity
2. **Use template variables** for dynamic insights
3. **Test chapter progression** to ensure smooth flow
4. **Include clear takeaways** for educational value

### Rate Schedule Design
1. **Use fixed rates** for simple scenarios
2. **Use sequences** for planned rate changes
3. **Use maps** for economic periods
4. **Use pipelines** for complex mathematical models

## Future Enhancements

The schema system is designed to evolve. Planned additions include:

### Scenario Schema
- Tax calculation fields
- RMD (Required Minimum Distribution) modeling
- Asset liquidity constraints
- Scenario branching for sensitivity analysis

### Story Schema
- Interactive elements (quizzes, decisions)
- Conditional chapter progression
- Multi-path narratives
- Embedded media support

### Rate Schedule Schema
- Historical data integration
- Monte Carlo parameters
- Correlation modeling between rates
- Machine learning rate predictions

## Contributing

When adding new features to the schemas:

1. **Update the schema files** with new fields and validation
2. **Add examples** demonstrating the new features
3. **Update this documentation** with usage instructions
4. **Test thoroughly** with existing scenarios to ensure backward compatibility
5. **Version the schemas** for tracking changes

## Support

For questions about the JSON schemas:
- Check the examples in each schema file
- Review existing scenario and story files
- Consult the complete modeling guide
- Open an issue for schema-related bugs or enhancement requests
