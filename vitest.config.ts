import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['worker/__tests__/**/*.test.ts'],
    environment: 'node',
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      include: [
        'src/lib/template.ts',
        'src/lib/workflowGraph.ts',
        'src/lib/thresholdEval.ts',
        'src/app/api/actions/test/route.ts',
        'src/app/api/workflows/run/route.ts',
        'src/app/api/workflows/save/route.ts',
        'worker/template.ts',
        'worker/threshold.ts',
        'worker/notifier.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 70,
        functions: 90,
        lines: 90,
      },
    },
  },
});
