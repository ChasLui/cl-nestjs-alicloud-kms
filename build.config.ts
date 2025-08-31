import { resolve } from 'path';
import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  declaration: true,
  clean: true,
  entries: [
    {
      input: 'src/index',
      name: 'index',
    },
  ],
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
      sourcemap: true, // 启用 sourcemap
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          sourceMap: true, // TypeScript 源码映射
          declarationMap: true, // 声明文件映射
        },
      },
    },
  },
  sourcemap: true, // 全局启用 sourcemap
  outDir: 'dist',
  externals: [
    // PeerDependencies - 必须外部化，由用户项目提供
    '@nestjs/common',
    '@nestjs/core',
    'reflect-metadata',

    // 阿里云 SDK - 外部化以避免版本冲突和减小包体积 (2.6MB)
    '@alicloud/kms20160120',

    // type-fest 是纯类型库，编译后无运行时代码，可以打包
  ],
  // 确保生成正确的文件扩展名和类型声明
  format: ['cjs', 'esm'],
});
