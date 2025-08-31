import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './playground'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // 排除 playground 目录，不进行测试
    exclude: ['playground/**', 'node_modules/**', 'dist/**', 'coverage/**', '.git/**'],
    // 测试覆盖率配置，排除 playground 目录
    coverage: {
      exclude: [
        'playground/**',
        'tests/**',
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '*.config.*',
        'commitlint.config.mjs',
        '.release-it.js',
      ],
      // 设置覆盖率阈值
      thresholds: {
        global: {
          statements: 75,
          branches: 90,
          functions: 75,
          lines: 75,
        },
        // 为 src 目录设置合理的阈值
        'src/**': {
          statements: 80,
          branches: 95,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});
