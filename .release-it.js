export default {
  git: {
    requireCleanWorkingDir: process.env.CI !== 'true', // 在CI环境中允许不干净的工作目录
    requireBranch: ['main', 'master'],
    commitMessage: 'chore: release v${version}',
    tagName: 'v${version}',
    push: true,
    pushTags: true,
    addUntrackedFiles: false,
    commit: process.env.CI === 'true', // 只在CI环境中自动提交
  },
  npm: {
    publish: true,
    access: 'public',
    publishPath: 'dist',
    ignoreVersion: false,
    skipChecks: process.env.CI === 'true', // CI环境跳过一些检查
  },
  github: {
    release: true,
    releaseName: 'Release v${version}',
    autoGenerate: true, // 自动生成release notes
    preRelease: false,
  },
  plugins: {
    '@release-it/conventional-changelog': {
      preset: 'conventionalcommits',
      infile: 'CHANGELOG.md',
      header: '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n',
    },
  },
  hooks: {
    'before:init': process.env.CI ? [] : ['pnpm test', 'pnpm build'], // CI环境跳过测试和构建
    'after:bump': 'echo Successfully released ${name} v${version} to ${repo.repository}.',
    'after:release': 'echo "🎉 Release ${version} published successfully!"',
  },
};
