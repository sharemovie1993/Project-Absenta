module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: [
    '<rootDir>/src/infra/storage/__tests__/**/*.test.ts'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { isolatedModules: true }]
  },
  setupFilesAfterEnv: [],
  verbose: true,
  forceExit: true
};
