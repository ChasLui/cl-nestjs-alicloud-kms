# GitHub Actions 工作流配置

本项目配置了简化高效的 CI/CD 流水线，支持自动化测试、构建、发布和安全扫描。

## 工作流说明

### 1. CI 工作流 (`ci.yml`)

**触发条件**: Push 到 `main`/`develop` 分支或创建 PR

**功能**:

- **多版本测试**: Node.js 18, 20, 22 并行测试
- **代码质量**: ESLint 检查 + TypeScript 类型检查
- **测试覆盖率**: 仅在 Node.js 20 上运行覆盖率检查
- **构建验证**: 确保库可以正确构建
- **PR 安全检查**: 依赖审查 (仅 PR 触发)

### 2. 发布工作流 (`release.yml`)

**触发条件**: Push 到 `main` 分支

**功能**:

- **智能检测**: 自动检查提交是否需要发布
- **质量保证**: 发布前运行完整测试套件
- **自动发布**: 使用 release-it 自动发布到 npm 和 GitHub

**发布触发条件**:

- `feat:` → 新功能 (minor)
- `fix:`, `perf:` → 修复/优化 (patch)
- `BREAKING CHANGE` 或 `!:` → 破坏性变更 (major)

### 3. 安全工作流 (`security.yml`)

**触发条件**: 每周一自动运行 + 手动触发

**功能**:

- **依赖审计**: pnpm audit 检查已知漏洞
- **静态分析**: CodeQL 安全代码扫描

## 环境变量配置

在 GitHub 仓库设置中需要配置以下 Secrets:

### 必需的 Secrets

- `NPM_TOKEN`: npm 发布令牌
- `GITHUB_TOKEN`: GitHub API 令牌 (自动提供)

### 获取 NPM_TOKEN

1. 登录 [npmjs.com](https://www.npmjs.com)
2. 进入 Account Settings → Access Tokens
3. 创建新的 Automation Token
4. 复制 token 并添加到 GitHub Secrets

## 约定式提交格式

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范:

```text
<类型>[可选范围]: <描述>

[可选正文]

[可选脚注]
```

### 提交类型

- `feat`: 新功能 (触发 minor 版本升级)
- `fix`: 错误修复 (触发 patch 版本升级)
- `docs`: 文档更新
- `style`: 代码格式修改
- `refactor`: 代码重构
- `perf`: 性能优化 (触发 patch 版本升级)
- `test`: 测试相关
- `chore`: 构建/工具相关

### 示例提交

```bash
# 新功能 (minor 版本升级)
git commit -m "feat: 添加缓存服务支持"

# 错误修复 (patch 版本升级)
git commit -m "fix: 修复 KMS 连接超时问题"

# 破坏性变更 (major 版本升级)
git commit -m "feat!: 重构 API 接口"
git commit -m "feat: 重构配置系统

BREAKING CHANGE: 配置格式已更改"

# 文档更新 (无版本升级)
git commit -m "docs: 更新 README"
```

## 发布流程

### 自动发布 (推荐)

1. 使用约定式提交格式提交代码
2. Push 到 `main` 分支
3. GitHub Actions 自动处理发布流程

### 手动发布

本地发布命令:

```bash
pnpm release:dry  # 预览发布
pnpm release      # 交互式发布
```

## 分支策略

- `main`: 主分支，保护分支，需要 PR 合并
- `develop`: 开发分支 (可选)
- `feature/*`: 功能分支
- `hotfix/*`: 热修复分支

## 发布检查清单

发布前确保:

- [ ] 所有测试通过
- [ ] 代码覆盖率达标
- [ ] 遵循约定式提交格式
- [ ] 更新了相关文档
- [ ] 配置了必要的 Secrets

## 故障排除

### 发布失败

1. 检查 `NPM_TOKEN` 是否正确配置
2. 确认包名是否可用
3. 验证 GitHub 权限设置
4. 检查提交格式是否正确

### 测试失败

1. 在本地运行 `pnpm test`
2. 检查代码格式: `pnpm lint`
3. 修复后重新提交

### 安全扫描问题

1. 运行 `pnpm audit` 检查漏洞
2. 使用 `pnpm audit --fix` 自动修复
3. 手动更新有问题的依赖

## 版本管理

项目使用语义化版本 (SemVer):

- `MAJOR.MINOR.PATCH` (例: 1.2.3)
- MAJOR: 不兼容的 API 变更
- MINOR: 向下兼容的新功能
- PATCH: 向下兼容的错误修复

版本号由 `release-it` 基于约定式提交自动确定。
