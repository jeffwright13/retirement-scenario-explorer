#!/usr/bin/env node

/**
 * Schema Validation Script for Retirement Scenario Explorer
 *
 * Validates all scenario, story, and rate schedule files against their JSON schemas.
 * Usage: node validate-schemas.js
 *
 * Requirements: npm install ajv ajv-formats glob
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { resolve, relative } from 'path';

// Initialize AJV with format support
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false  // Allow additional properties for future compatibility
});
addFormats(ajv);

// Schema file paths
const SCHEMAS = {
  scenario: './docs/scenario-schema.json',
  story: './docs/story-schema.json',
  rateSchedule: './docs/rate-schedule-schema.json'
};

// Data file patterns
const DATA_PATTERNS = {
  scenarios: './data/scenarios/*.json',
  stories: './data/stories/*.json'
};

/**
 * Load and compile a JSON schema
 */
function loadSchema(schemaPath) {
  try {
    const schemaContent = readFileSync(resolve(schemaPath), 'utf8');
    const schema = JSON.parse(schemaContent);
    return ajv.compile(schema);
  } catch (error) {
    console.error(`❌ Failed to load schema ${schemaPath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Validate a single file against a schema
 */
function validateFile(filePath, validator, schemaName) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    const isValid = validator(data);

    if (isValid) {
      console.log(`✅ ${relative('.', filePath)} - Valid ${schemaName}`);
      return true;
    } else {
      console.log(`❌ ${relative('.', filePath)} - Invalid ${schemaName}:`);
      validator.errors.forEach(error => {
        const instancePath = error.instancePath || 'root';
        console.log(`   • ${instancePath}: ${error.message}`);
        if (error.data !== undefined) {
          console.log(`     Value: ${JSON.stringify(error.data)}`);
        }
      });
      return false;
    }
  } catch (error) {
    console.log(`❌ ${relative('.', filePath)} - Parse Error: ${error.message}`);
    return false;
  }
}

/**
 * Validate all files matching a pattern
 */
async function validatePattern(pattern, validator, schemaName) {
  const files = await glob(pattern);

  if (files.length === 0) {
    console.log(`⚠️  No files found matching pattern: ${pattern}`);
    return { valid: 0, invalid: 0 };
  }

  let validCount = 0;
  let invalidCount = 0;

  for (const file of files) {
    if (validateFile(file, validator, schemaName)) {
      validCount++;
    } else {
      invalidCount++;
    }
  }

  return { valid: validCount, invalid: invalidCount };
}

/**
 * Main validation function
 */
async function validateAll() {
  console.log('🔍 Retirement Scenario Explorer - Schema Validation\n');

  // Load schemas
  console.log('📋 Loading schemas...');
  const validators = {
    scenario: loadSchema(SCHEMAS.scenario),
    story: loadSchema(SCHEMAS.story)
  };
  console.log('✅ Schemas loaded successfully\n');

  let totalValid = 0;
  let totalInvalid = 0;

  // Validate scenarios
  console.log('📊 Validating scenario files...');
  const scenarioResults = await validatePattern(
    DATA_PATTERNS.scenarios,
    validators.scenario,
    'scenario'
  );
  totalValid += scenarioResults.valid;
  totalInvalid += scenarioResults.invalid;
  console.log();

  // Validate stories
  console.log('📚 Validating story files...');
  const storyResults = await validatePattern(
    DATA_PATTERNS.stories,
    validators.story,
    'story'
  );
  totalValid += storyResults.valid;
  totalInvalid += storyResults.invalid;
  console.log();

  // Summary
  console.log('📈 Validation Summary:');
  console.log(`✅ Valid files: ${totalValid}`);
  console.log(`❌ Invalid files: ${totalInvalid}`);

  if (totalInvalid > 0) {
    console.log('\n🔧 Fix the validation errors above and run again.');
    process.exit(1);
  } else {
    console.log('\n🎉 All files are valid!');
    process.exit(0);
  }
}

/**
 * Validate specific file type
 */
async function validateSpecific(type) {
  const validators = {
    scenario: loadSchema(SCHEMAS.scenario),
    story: loadSchema(SCHEMAS.story)
  };

  if (!validators[type]) {
    console.error(`❌ Unknown validation type: ${type}`);
    console.log('Available types: scenario, story');
    process.exit(1);
  }

  const patterns = {
    scenario: DATA_PATTERNS.scenarios,
    story: DATA_PATTERNS.stories
  };

  console.log(`🔍 Validating ${type} files only...\n`);
  const results = await validatePattern(patterns[type], validators[type], type);

  console.log(`\n📈 ${type} validation complete:`);
  console.log(`✅ Valid: ${results.valid}`);
  console.log(`❌ Invalid: ${results.invalid}`);

  process.exit(results.invalid > 0 ? 1 : 0);
}

// Command line interface
const args = process.argv.slice(2);

if (args.length === 0) {
  // Validate all files
  validateAll().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
} else if (args.length === 1) {
  // Validate specific type
  validateSpecific(args[0]).catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
} else {
  console.error('Usage: node validate-schemas.js [scenario|story]');
  process.exit(1);
}
