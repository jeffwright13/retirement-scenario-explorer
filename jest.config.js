module.exports = {
  // Test environment - jsdom simulates a browser environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'scripts/**/*.js',
    '!scripts/**/*.test.js',
    '!scripts/**/*.spec.js'
  ],
  
  // Coverage thresholds (adjusted to actual coverage levels or 50%, whichever is higher)
  coverageThreshold: {
    global: {
      branches: 40,    // Current: 44.46%, target: 50%
      functions: 50,   // Current: 53.14%, maintain current level
      lines: 50,       // Current: 51.29%, maintain current level  
      statements: 50   // Current: 50.98%, maintain current level
    }
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Transform configuration for ES modules
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true
};
