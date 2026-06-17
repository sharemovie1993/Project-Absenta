/**
 * Jest Configuration for Attendance Management System
 * 
 * @author AI Assistant
 * @date 2025-01-27
 * @version 1.0.0
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory for tests
  rootDir: '.',

  // Test directories
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.test.ts'
  ],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],

  // Coverage configuration
  collectCoverage: false,
  coverageProvider: 'v8',
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.js',
    'src/**/*.ts',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/utils/prisma.ts'
  ],

  // Module paths
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src'
  ],

  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',

  // Test patterns to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '<rootDir>/tests/unit/attendance/',
    '<rootDir>/tests/integration/attendance/mode-validation.test.js'
  ],

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'ts',
    'tsx',
    'json',
    'node'
  ],

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Maximum worker processes
  maxWorkers: '50%',

  // Test suites
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/tests/unit/**/*.test.js',
        '<rootDir>/src/**/*.spec.ts',
        '<rootDir>/src/**/*.test.ts'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/',
        '<rootDir>/tests/unit/attendance/'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
      },
      transform: {
        '^.+\\.js$': 'babel-jest',
        '^.+\\.(ts|tsx)$': 'ts-jest'
      }
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/',
        '<rootDir>/tests/integration/attendance/mode-validation.test.js'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
      },
      transform: {
        '^.+\\.js$': 'babel-jest',
        '^.+\\.(ts|tsx)$': 'ts-jest'
      }
    }
  ]
};
