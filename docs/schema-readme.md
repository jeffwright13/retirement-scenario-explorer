# JSON Schema System for Retirement Scenario Explorer

This directory contains the formal JSON Schema definitions for validating scenario files, story files, and rate schedules used by the Retirement Scenario Explorer.

## Quick Start

### 1. Install Dependencies (Optional)
For validation during development:
```bash
npm install ajv ajv-formats glob
```

### 2. Validate Your Files
```bash
# Validate all files
node scripts/validate-schemas.js

# Validate only scenarios
node scripts/validate-schemas.js scenario

# Validate only stories
node scripts/validate-schemas.js story
```

### 3. IDE Integration
Add schema references to your JSON files for real-time validation:

**Scenario files:**
```json
{
  "$schema": "../docs/scenario-schema.json",
  "my-scenario": {
    "metadata": {
      "title": "My Retirement Scenario"
    },
    "plan": {
      "monthly_expenses": 5000,
      "duration_months": 300
    },
    "assets": [...]
  }
}
```

**Story files:**
```json
{
  "$schema": "../docs/story-schema.json",
  "my-story": {
    "metadata": {
      "title": "My Financial Journey"
    },
    "chapters": [...]
  }
}
```

## Schema Files

| File | Purpose | Validates |
|------|---------|-----------|
| `scenario-schema.json` | Individual retirement scenarios | `data/scenarios/*.json` |
| `story-schema.json` | Storyteller mode narratives | `data/stories/*.json` |
| `rate-schedule-schema.json` | Time-varying rate definitions | Rate schedules within scenarios |

## Common Validation Errors

### Missing Required Fields
```
❌ root/plan: must have required property 'monthly_expenses'
```
**Fix:** Add the required field to your scenario.

### Invalid Data Types
```
❌ root/plan/duration_months: must be integer
```
**Fix:** Use a whole number, not a decimal.

### Invalid References
```
❌ root/assets/0/return_schedule: 'unknown_schedule' not found in rate_schedules
```
**Fix:** Ensure all schedule references exist in the `rate_schedules` section.

### Invalid Enum Values
```
❌ root/metadata/difficulty: must be equal to one of the allowed values
```
**Fix:** Use only: `beginner`, `intermediate`, or `advanced`.

## Examples

### Minimal Valid Scenario
```json
{
  "simple-example": {
    "plan": {
      "monthly_expenses": 4000,
      "duration_months": 240
    },
    "assets": [
      {
        "name": "Savings",
        "balance": 300000,
        "return_schedule": "growth_rate"
      }
    ],
    "rate_schedules": {
      "growth_rate": {
        "type": "fixed",
        "rate": 0.04
      }
    }
  }
}
```

### Minimal Valid Story
```json
{
  "basic-story": {
    "metadata": {
      "title": "Basic Retirement Story",
      "description": "Learn the basics of retirement planning"
    },
    "chapters": [
      {
        "title": "Chapter 1: Getting Started",
        "scenario_key": "simple-example",
        "narrative": {
          "introduction": "Let's explore basic retirement planning..."
        }
      }
    ]
  }
}
```

## Development Workflow

### 1. Create/Edit JSON Files
- Use your favorite editor with JSON Schema support
- VS Code, WebStorm, and Vim all provide excellent schema validation

### 2. Validate Before Committing
```bash
npm run validate
```

### 3. Fix Any Errors
The validator provides specific error messages with exact locations:
```
❌ data/scenarios/my-scenario.json - Invalid scenario:
   • root/plan: must have required property 'duration_months'
     Value: {"monthly_expenses": 5000}
```

### 4. Commit When Clean
```bash
git add .
git commit -m "Add new retirement scenario"
```

## Advanced Features

### Rate Schedule Validation
Rate schedules are validated as part of scenarios:

```json
"rate_schedules": {
  "variable_inflation": {
    "type": "sequence",
    "values": [0.02, 0.03, 0.04, 0.03],
    "default_rate": 0.025
  },
  "market_cycles": {
    "type": "pipeline",
    "pipeline": [
      {"start_with": 0.07},
      {"add_cycles": {"period": 10, "amplitude": 0.03}},
      {"clamp": {"min": 0.01, "max": 0.15}}
    ]
  }
}
```

### Template Variables in Stories
Stories support dynamic content that updates based on simulation results:

```json
"insights": [
  "Your money lasts {{duration_years}} years",
  "This represents a {{withdrawal_rate}}% withdrawal rate",
  "Final balance: ${{final_balance_formatted}}"
]
```

### Proportional Withdrawals
Scenarios support weight-based withdrawals:

```json
"order": [
  {"account": "Taxable", "order": 1, "weight": 0.7},
  {"account": "IRA", "order": 1, "weight": 0.3},
  {"account": "Roth", "order": 2}
]
```

## Troubleshooting

### Schema Not Found
If you get schema loading errors:
- Ensure schema files exist in `docs/` directory
- Check file paths in your `$schema` references
- Verify you're running validation from the project root

### Validation Script Fails
```bash
# Install missing dependencies
npm install

# Check Node.js version (requires 16+)
node --version

# Run with verbose output
node scripts/validate-schemas.js --verbose
```

### IDE Not Showing Validation
- Ensure your editor supports JSON Schema
- Check that `$schema` paths are correct
- Try restarting your editor/language server

## Contributing

When modifying schemas:

1. **Test thoroughly** with existing files
2. **Add examples** for new features
3. **Update documentation**
4. **Version appropriately** using semantic versioning
5. **Validate all files** before committing

The schemas are designed to be forward-compatible, so new optional fields can be added without breaking existing scenarios.

## Resources

- [JSON Schema Documentation](https://json-schema.org/learn/)
- [AJV Validator](https://ajv.js.org/)
- [VS Code JSON Schema Support](https://code.visualstudio.com/docs/languages/json#_json-schemas-and-settings)
- [Complete Modeling Guide](../docs/complete-guide.md)
