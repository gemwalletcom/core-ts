module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.base.json'
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['<rootDir>/packages/*/src/**/*.test.ts'],
  moduleNameMapper: {
    '^@swap-providers/(.*)$': '<rootDir>/packages/$1/src'
  },
  moduleDirectories: ['node_modules']
};