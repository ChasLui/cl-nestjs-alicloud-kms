import { resolve } from 'path';
import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  declaration: false, // playground 不需要类型声明文件
  clean: true, // 自动清理旧的构建产物
  entries: [
    {
      input: 'playground/index',
      name: 'index',
      format: 'esm',
    },
  ],
  alias: {
    '@': resolve(__dirname, './src'),
    '~': resolve(__dirname, './playground'),
  },
  rollup: {
    emitCJS: false, // playground 只需要 ESM 格式
    inlineDependencies: true, // 内联依赖以简化部署
    esbuild: {
      target: 'node18', // 配置目标为 node18
      minify: false, // 不压缩，便于调试
      format: 'esm',
    },
  },
  outDir: 'dist-playground',
  externals: [
    // 明确声明外部依赖，避免打包 Node.js 内置模块
    'fs',
    'path',
    'os',
    'crypto',
    'child_process',
    'util',
    'perf_hooks',
    'process',
  ],
});
