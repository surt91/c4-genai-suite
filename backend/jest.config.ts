import { Config } from 'jest';

// Note: transpile-only alternatives were evaluated and do not work with this code base: @swc/jest breaks on the
// circular TypeORM entity imports (decorator metadata TDZ), ts-jest with isolatedModules changes the import elision
// and triggers NestJS circular-dependency errors. ts-jest `diagnostics: false` brought no measurable speed-up.
const transform: Config['transform'] = {
  '^.+\\.(t|j)s$': 'ts-jest',
};

const config: Config = {
  projects: [
    {
      displayName: 'Unit Tests',
      testRegex: '.*\\.spec\\.ts$',
      testPathIgnorePatterns: ['.*\\.e2e\\.spec\\.ts$'],
      coveragePathIgnorePatterns: ['/generated/'],
      collectCoverageFrom: ['**/*.(t|j)s'],
      coverageDirectory: '../coverage',
      testEnvironment: 'node',
      transform,
      moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/$1',
      },
      moduleFileExtensions: ['js', 'json', 'ts'],
      rootDir: 'src',
    },
    {
      displayName: 'E2E Tests',
      testRegex: '.*\\.e2e\\.spec\\.ts$',
      collectCoverageFrom: ['**/*.(t|j)s'],
      coveragePathIgnorePatterns: ['/generated/', '/migrations/'],
      coverageDirectory: '../coverage',
      testEnvironment: 'node',
      transform,
      moduleNameMapper: {
        '^../extensions/(.*).js$': '<rootDir>/extensions/$1.ts',
        '^src/(.*)$': '<rootDir>/$1',
      },
      moduleFileExtensions: ['js', 'json', 'ts'],
      globalSetup: '../jest.setup.e2e.ts',
      setupFiles: ['../jest.setup-db.e2e.ts'],
      rootDir: 'src',
    },
  ],
  coverageReporters: ['html', 'text', 'text-summary', 'cobertura'],
};

export default config;
