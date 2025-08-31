# 发布指南

本项目使用 [release-it](https://github.com/release-it/release-it) 进行自动化发布，支持传统变更日志生成和 GitHub 发布。

## 发布流程

### 自动化发布（推荐）

1. **提交变更**，遵循 [约定式提交](https://www.conventionalcommits.org/) 格式：

   ```bash
   git commit -m "feat: 添加新功能"
   git commit -m "fix: 修复错误问题"
   git commit -m "docs: 更新文档"
   ```

2. **推送到主分支**：

   ```bash
   git push origin main
   ```

3. **GitHub Actions 将自动**：
   - 运行测试和构建
   - 根据提交消息确定下一个版本
   - 生成变更日志
   - 创建 Git 标签
   - 创建 GitHub 发布
   - 发布到 npm

### 手动发布

对于手动发布，使用以下命令：

#### 试运行（预览）

```bash
pnpm release:dry
```

#### 交互式发布

```bash
pnpm release
```

#### CI 发布（非交互式）

```bash
pnpm release:ci
```

## 配置

### Release-it 配置 (`.release-it.json`)

- **Git**: 自动提交、标记和推送
- **npm**: 以公共访问权限发布到 npm
- **GitHub**: 创建带有自动生成说明的发布
- **变更日志**: 使用传统变更日志格式
- **钩子**: 发布前运行测试和构建

### 必需的环境变量

对于自动化 GitHub 发布，在您的仓库中设置这些密钥：

- `GITHUB_TOKEN`: 由 GitHub Actions 自动提供
- `NPM_TOKEN`: 您的 npm 认证令牌（用于发布）

## 提交消息格式

遵循 [约定式提交](https://www.conventionalcommits.org/) 规范：

```
<类型>[可选范围]: <描述>

[可选正文]

[可选脚注]
```

### 类型

- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 仅文档变更
- `style`: 不影响代码含义的变更
- `refactor`: 既不修复错误也不添加功能的代码变更
- `perf`: 提高性能的代码变更
- `test`: 添加缺失的测试或修正现有测试
- `chore`: 构建过程或辅助工具的变更

### 示例

```bash
feat: 添加自定义配置支持
fix: 修复缓存模块内存泄漏
docs: 更新 API 文档
chore: 升级依赖
```

## 版本升级

版本升级根据提交消息自动确定：

- **补丁版本** (0.0.x): `fix:`、`docs:`、`style:`、`refactor:`、`perf:`、`test:`、`chore:`
- **次要版本** (0.x.0): `feat:`
- **主要版本** (x.0.0): 在脚注中包含 `BREAKING CHANGE:` 或在类型后有 `!` 的任何提交

## 故障排除

### 清理工作目录

发布前确保工作目录是干净的：

```bash
git status
git add .
git commit -m "chore: 准备发布"
```

### GitHub 令牌问题

如果 GitHub 发布创建失败，确保：

1. 设置了 `GITHUB_TOKEN` 环境变量
2. 令牌对仓库具有适当的权限

### npm 发布问题

如果 npm 发布失败：

1. 验证 `NPM_TOKEN` 设置正确
2. 确保您已登录：`npm whoami`
3. 检查包名可用性

## 手动创建 GitHub 发布

如果自动化 GitHub 发布失败，手动创建：

1. 前往 [GitHub 发布页面](https://github.com/ChasLui/node-typescript-library-starter/releases)
2. 点击"创建新发布"
3. 使用 release-it 创建的标签
4. 从 `CHANGELOG.md` 复制变更日志内容
