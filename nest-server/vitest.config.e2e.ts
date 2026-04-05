import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-key-for-e2e-testing',
    }
  },
});