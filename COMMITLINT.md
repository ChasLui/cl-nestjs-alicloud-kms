# Commitlint 使用指南

本项目使用 [commitlint](https://commitlint.js.org/) 来强制执行规范的提交信息格式，确保提交历史的一致性和可读性。

## 提交信息格式

所有提交信息必须遵循 [约定式提交](https://www.conventionalcommits.org/zh-hans/) 规范：

```txt
<类型>[可选作用域]: <描述>

[可选正文]

[可选脚注]
```

### 提交类型

支持以下提交类型：

- **feat**: 新增功能
- **fix**: 修复问题
- **docs**: 仅修改文档
- **style**: 不影响代码含义的更改（空格、格式化、缺少分号等）
- **refactor**: 既不修复问题也不添加功能的代码重构
- **perf**: 提升性能的代码更改
- **test**: 添加缺失的测试或修正现有测试
- **build**: 影响构建系统或外部依赖的更改
- **ci**: 对 CI 配置文件和脚本的更改
- **chore**: 不修改 src 或 test 文件的其他更改
- **revert**: 撤销之前的提交

### 示例

```bash
# 正确示例
git commit -m "feat: 添加用户认证功能"
git commit -m "feat: add user authentication"
git commit -m "fix(api): 修复登录接口错误"
git commit -m "docs: 更新安装指南"
git commit -m "refactor: 简化用户验证逻辑"

# 错误示例（将被拒绝）
git commit -m "修复了一个bug"
git commit -m "FEAT: 新功能"
git commit -m "更新代码"
git commit -m "fixed bug"
```

### 规则要求

- 类型必须使用小写字母
- 类型不能为空
- 描述不能为空
- 描述不能以句号结尾
- 标题（类型 + 作用域 + 描述）不能超过 100 个字符
- 作用域（如果存在）必须使用小写字母

## 验证机制

Commitlint 通过 Husky Git 钩子在每次提交时自动进行验证。如果您的提交信息不符合约定式格式，提交将被拒绝。

手动验证提交信息：

```bash
echo "feat: 添加新功能" | npx commitlint
```

## 配置文件

commitlint 配置定义在 [`commitlint.config.mjs`](./commitlint.config.mjs) 文件中。

## 最佳实践

1. **使用中文或英文**: 支持中文和英文描述，但建议在团队内保持一致
2. **描述要清晰**: 使用简洁明了的语言描述所做的更改
3. **合理使用作用域**: 对于大型项目，使用作用域来标识影响的模块
4. **关联 Issue**: 在正文或脚注中可以引用相关的 Issue 编号

### 高级示例

```bash
# 带作用域的提交
git commit -m "feat(kms): 添加阿里云 KMS 加密服务"
git commit -m "fix(cache): 修复缓存键值重复问题"

# 带正文的提交
git commit -m "feat: 添加用户权限管理

- 实现基于角色的权限控制
- 添加权限中间件
- 更新用户模型

Closes #123"
```
