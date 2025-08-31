import { resolve } from 'path';
import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  declaration: true,
  clean: true,
  entries: ['src/index'],
  alias: {
    '@': resolve(__dirname, './src'),
    '~': resolve(__dirname, './playground'),
  },
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
    esbuild: {
      target: 'node18',
      minify: false,
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    },
  },
  outDir: 'dist',
  externals: [
    // 外部依赖，不打包进库中
    'fs',
    'path',
    'os',
    'crypto',
    'child_process',
    'util',
    'perf_hooks',
    '@nestjs/common',
    '@nestjs/core',
    '@alicloud/kms20160120',
    'reflect-metadata',
  ],
});
