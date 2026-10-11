export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'routes/**/*.js',
    '!routes/**/*.test.js',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000, // 30 seconds for Firestore operations
};
