import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	testMatch: ['<rootDir>/src/**/*.spec.{ts,tsx}', '<rootDir>/src/**/*.test.{ts,tsx}'],
	transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.app.json' }] },
	moduleNameMapper: {
		'^~/mocks/(.*)': '<rootDir>/__mock__/$1',
		'^~/(.*)$': '<rootDir>/src/$1',
		'\\.(css|less|scss|sass)$': 'identity-obj-proxy'
	},
	coverageThreshold: {
		global: {
			lines: 80,
			branches: 80,
			functions: 80,
			statements: 80
		}
	},
	collectCoverageFrom: ['!__mock__/**']
};

export default config;
