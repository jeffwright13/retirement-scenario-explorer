# Integrating Your Story Into The Storytelling System

## Step-by-Step Integration Process

### 1. **File Placement** 📁

Place the files in the correct directories:

```bash
# Story definition
data/stories/jeffs-unconscious-ignorance-journey.json

# Supporting scenarios
data/scenarios/jeffs-learning-journey-scenarios.json
```

### 2. **Verify File Structure** ✅

Your directory should look like:
```
data/
├── stories/
│   ├── comprehensive-feature-tour.json
│   ├── compound-interest-magic.json
│   ├── inflation-journey.json
│   ├── jeffs-unknown-unknown.json
│   ├── jeffs-unconscious-ignorance-journey.json  ← NEW
│   └── test-story.json
└── scenarios/
    ├── compound-interest-scenarios.json
    ├── demo-scenarios.json
    ├── jeffs-learning-journey-scenarios.json      ← NEW
    ├── personal-portfolio-scenarios.json
    └── ...
```

### 3. **Test File Validity** 🔍

Open your browser's dev console and test:

```javascript
// Test scenario discovery
fetch('./data/scenarios/jeffs-learning-journey-scenarios.json')
  .then(r => r.json())
  .then(data => console.log('Scenarios loaded:', Object.keys(data)));

// Test story discovery
fetch('./data/stories/jeffs-unconscious-ignorance-journey.json')
  .then(r => r.json())
  .then(data => console.log('Story loaded:', Object.keys(data)));
```

### 4. **Automatic Discovery** 🔄

The system should automatically discover your files because:

**Story Discovery** (`story-manager.js`):
```javascript
const storyPatterns = [
  'comprehensive-feature-tour.json',
  'inflation-journey.json',
  'jeffs-unknown-unknown.json',     // Your existing file
  'jeffs-unconscious-ignorance-journey.json',  // Will be discovered
  'compound-interest-magic.json',
  // ...
];
```

**Scenario Discovery** (`scenarios.js`):
```javascript
// Tries common patterns including:
'personal.json', 'personal-test.json', 'my-scenario.json',
'personal-portfolio-scenarios.json'
// Your new file should be discovered automatically
```

### 5. **Verify Discovery** 👀

1. **Open your application**
2. **Check browser console** for discovery messages:
   ```
   🔍 Smart scenario discovery starting...
   ✅ Found: jeffs-stage-1-no-growth (Jeff's Stage 1: No Growth...)
   ✅ Found: jeffs-stage-2-with-growth (Jeff's Stage 2: Compound Interest...)
   ...
   📚 Discovering story files...
   ✅ Found story: jeffs-unconscious-ignorance-journey
   ```

### 6. **Access Story Mode** 📚

1. **Click "📚 Story Mode"** button in header
2. **Select story** from dropdown:
   ```
   Choose Your Journey:
   [Jeff's Journey: From Unconscious Ignorance to Financial Reality (5 chapters, 25 minutes)]
   ```

### 7. **Test The Story** 🧪

Go through each chapter:
1. **Chapter 1**: Should load `jeffs-stage-1-no-growth` scenario
2. **Run simulation**: Should show ~9 year linear drawdown
3. **Read insights**: Should populate with your template variables
4. **Next Chapter**: Should advance to compound interest discovery
5. **Continue through all 5 chapters**

## Troubleshooting Common Issues

### Issue: "Story not found in dropdown"

**Cause**: Story discovery failed
**Solutions**:
1. Check file path: `data/stories/jeffs-unconscious-ignorance-journey.json`
2. Validate JSON syntax (use JSONLint.com)
3. Check browser console for errors
4. Manually add to discovery patterns in `story-manager.js`:
   ```javascript
   const storyPatterns = [
     // existing patterns...
     'jeffs-unconscious-ignorance-journey.json'  // Add this line
   ];
   ```

### Issue: "Scenario not found" error

**Cause**: Scenario discovery failed or wrong scenario_key
**Solutions**:
1. Check scenario file path: `data/scenarios/jeffs-learning-journey-scenarios.json`
2. Verify scenario keys match exactly:
   ```json
   // In story chapters:
   "scenario_key": "jeffs-stage-1-no-growth"

   // In scenario file:
   "jeffs-stage-1-no-growth": { ... }
   ```
3. Check browser console for scenario discovery messages

### Issue: "Template variables not working"

**Cause**: Variable names don't match or simulation hasn't run
**Solutions**:
1. Ensure simulation completes successfully
2. Check variable names in `story-manager.js`:
   ```javascript
   // Available variables:
   {{duration_years}}
   {{money_runs_out_year}}
   {{monthly_expenses}}
   {{withdrawal_rate}}
   ```
3. Variables only populate AFTER running simulation

### Issue: "Schema validation errors"

**Cause**: JSON doesn't match schema requirements
**Solutions**:
1. Add `$schema` references to files:
   ```json
   {
     "$schema": "../docs/story-schema.json",
     "jeffs-unconscious-ignorance-journey": { ... }
   }
   ```
2. Use schema validator if you added it
3. Check required fields in schemas

## Advanced Configuration

### Adding to Discovery Patterns

If automatic discovery fails, manually add to patterns:

**For stories** (`story-manager.js`):
```javascript
const storyPatterns = [
  'comprehensive-feature-tour.json',
  'inflation-journey.json',
  'jeffs-unknown-unknown.json',
  'jeffs-unconscious-ignorance-journey.json',  // Add this
  'compound-interest-magic.json',
  // ...
];
```

**For scenarios** (`scenarios.js`):
```javascript
this.discoveryPatterns = [
  // existing patterns...
  'jeffs-learning-journey-scenarios.json'  // Add this
];
```

### Custom Story Settings

Your story includes these settings:
```json
"story_settings": {
  "auto_advance": false,                    // User controls progression
  "show_chapter_progress": true,            // Shows progress bar
  "allow_chapter_jumping": true,            // Can skip around
  "reset_ui_between_chapters": true,        // Clean state
  "require_simulation_completion": true     // Must run sim to advance
}
```

## Success Indicators

You'll know it's working when:

1. ✅ **Story appears in dropdown**
2. ✅ **Chapter 1 loads correctly** with the no-growth scenario
3. ✅ **Simulation runs** and shows ~9 year runway
4. ✅ **Insights populate** with actual numbers
5. ✅ **Next button** advances to Chapter 2
6. ✅ **Chapter 2** shows dramatic improvement with compound interest
7. ✅ **Template variables** update based on simulation results

## Next Steps After Integration

1. **Test all chapters** thoroughly
2. **Refine narrative text** based on user experience
3. **Add more template variables** if needed
4. **Consider additional stories** based on other discoveries
5. **Share with others** to get feedback on educational value

The beauty of your system is that once the files are in place, everything should work automatically through the existing discovery and story management systems!
