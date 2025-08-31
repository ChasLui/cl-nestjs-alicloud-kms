# cl-nestjs-alicloud-kms

一个用于 NestJS 的阿里云 KMS（密钥管理服务）集成模块，用于安全地获取和管理密钥配置。

[![npm version](https://badge.fury.io/js/cl-nestjs-alicloud-kms.svg)](https://badge.fury.io/js/cl-nestjs-alicloud-kms)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 特性

- 🔐 **安全的密钥管理** - 与阿里云 KMS 服务集成，支持共享网关和专属网关
- 🚀 **NestJS 原生支持** - 完全兼容 NestJS 依赖注入系统
- 📦 **多密钥配置获取** - 支持批量获取、别名映射、默认值和 JSON 路径提取
- ⚡ **高性能缓存** - 内置内存缓存系统，支持TTL过期、LRU淘汰和缓存统计
- 🔄 **智能重试机制** - 指数退避算法，自动区分可重试和不可重试错误
- 🛡️ **企业级鲁棒性** - 输入验证、错误处理、敏感数据脱敏
- 🔧 **TypeScript 支持** - 完整的类型定义和智能提示
- 🌐 **多种配置方式** - 支持静态配置和异步配置
- 🛠️ **实用工具函数** - 内置配置处理和验证工具
- ✅ **完整测试覆盖** - 98.5% 代码覆盖率，232 个测试用例

```txt
src/
├── index.ts        # 统一导出入口
├── kms.module.ts   # KMS 模块定义
├── kms.service.ts  # KMS 服务实现
├── cache.service.ts # 缓存服务实现
├── types.ts        # 类型定义
└── utils.ts        # 配置处理工具函数
```

这种架构的优势：

- **易于理解** - 文件结构清晰，功能集中
- **减少依赖** - 避免复杂的内部导入关系
- **便于维护** - 代码集中，修改影响范围明确
- **快速定位** - 所有功能都能快速找到对应文件

## 安装

```bash
npm install cl-nestjs-alicloud-kms
# 或者
yarn add cl-nestjs-alicloud-kms
# 或者
pnpm add cl-nestjs-alicloud-kms
```

**环境要求：**

- Node.js >= 18.0.0
- NestJS >= 11.1.6

## 快速开始

### 1. 基本用法

```typescript
import { Module } from '@nestjs/common';
import { KmsModule } from 'cl-nestjs-alicloud-kms';

@Module({
  imports: [
    KmsModule.forRoot({
      client: {
        accessKeyId: 'your-access-key-id',
        accessKeySecret: 'your-access-key-secret',
        regionId: 'cn-hangzhou', // 可选，默认为 cn-hangzhou
        endpoint: 'https://kms.cn-hangzhou.aliyuncs.com', // 必选
      },
      defaultSecretName: 'app-config',
      enableLogging: true,
      timeout: 30000, // 请求超时时间（毫秒）
      maxRetries: 3, // 最大重试次数
    }),
  ],
})
export class AppModule {}
```

### 2. 异步配置（推荐）

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KmsModule } from 'cl-nestjs-alicloud-kms';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    KmsModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        client: {
          accessKeyId: configService.getOrThrow('ALICLOUD_ACCESS_KEY_ID'),
          accessKeySecret: configService.getOrThrow('ALICLOUD_ACCESS_KEY_SECRET'),
          endpoint: configService.getOrThrow('ALICLOUD_ENDPOINT'), // 必选
          regionId: configService.get('ALICLOUD_REGION_ID', 'cn-hangzhou'), // 可选
        },
        defaultSecretName: 'app-config',
        enableLogging: process.env.NODE_ENV !== 'production',
      }),
      inject: [ConfigService],
      global: true,
    }),
  ],
})
export class AppModule {}
```

### 3. 在服务中使用

```typescript
import { Injectable } from '@nestjs/common';
import { KmsService, SecretConfigMapping } from 'cl-nestjs-alicloud-kms';

@Injectable()
export class AppConfigService {
  constructor(private readonly kmsService: KmsService) {}

  async getAppConfig() {
    // 获取远程配置
    const remoteConfig = await this.kmsService.getSecretValueAsJson('app-config');

    // 本地默认配置
    const localDefaults = {
      'database.port': '5432',
      'redis.port': '6379',
    };

    // 合并配置（远程配置优先）
    return mergeConfig(localDefaults, remoteConfig);
  }

  async getDatabasePassword() {
    // 获取特定密钥
    return this.kmsService.getSecretValue('database-password');
  }

  // 🆕 使用多密钥配置获取
  async getMultipleConfigs() {
    const secretsConfig: SecretConfigMapping = {
      // 数据库连接字符串（必需）
      database: {
        name: 'app/database/url',
        alias: 'DATABASE_URL',
        required: true,
      },
      // Redis 连接（可选，有默认值）
      redis: {
        name: 'app/redis/url',
        alias: 'REDIS_URL',
        required: false,
        defaultValue: 'redis://localhost:6379',
      },
      // 从 JSON 密钥中提取 API 密钥
      apiKey: {
        name: 'app/external/services',
        isJson: true,
        jsonPath: 'payment.apiKey',
        required: true,
        validation: {
          pattern: /^pk_/,
          minLength: 10,
        },
      },
    };

    const result = await this.kmsService.getSecretsWithConfig(secretsConfig);
    return result.success; // { DATABASE_URL: '...', REDIS_URL: '...', apiKey: 'pk_...' }
  }
}
```

## API 文档

### KmsModule

#### `forRoot(config: KmsModuleConfig)`

静态配置模块。

```typescript
interface KmsModuleConfig {
  client: KmsClientConfig;
  defaultSecretName?: string;
  enableLogging?: boolean;
  logger?: LoggerInterface;
  secretsConfig?: SecretConfigMapping;
  gatewayType?: 'shared' | 'dedicated';
  timeout?: number;
  maxRetries?: number;
  cache?: SecretCacheOptions;
}

interface KmsClientConfig {
  accessKeyId: string;
  accessKeySecret: string;
  regionId?: string; // 可选，默认为 cn-hangzhou
  endpoint: string; // 必选
  caCert?: string;
  ignoreSSL?: boolean;
}
```

#### `forRootAsync(options: KmsModuleAsyncOptions)`

异步配置模块。

```typescript
interface KmsModuleAsyncOptions {
  useFactory?: (...args: unknown[]) => Promise<KmsModuleConfig> | KmsModuleConfig;
  inject?: readonly unknown[];
  global?: boolean;
  loggerProvider?: Provider<LoggerInterface>;
}
```

### KmsService

#### `getSecretValue(secretName: string, skipCache?: boolean): Promise<string>`

获取指定密钥的字符串值。支持自动重试、输入验证和缓存控制。

#### `getSecretValueAsJson<T>(secretName: string): Promise<T>`

获取密钥并解析为 JSON 对象。支持空值检查和详细错误信息。

#### `getDefaultSecretValue(): Promise<string>`

获取默认密钥的值。

#### `getDefaultSecretValueAsJson<T>(): Promise<T>`

获取默认密钥并解析为 JSON 对象。

#### `getMultipleSecrets(secretNames: string[]): Promise<Record<string, string>>`

批量获取多个密钥。支持去重、并发控制和错误收集。

#### `getSecretsWithConfig(secretsConfig: SecretConfigMapping): Promise<BatchSecretResult>` 🆕

根据配置批量获取多个密钥，支持：

- **别名映射**：密钥名到配置键的映射
- **默认值**：可选密钥的默认值
- **JSON 路径提取**：从复杂 JSON 中提取特定字段
- **验证规则**：长度、正则表达式、自定义验证器
- **部分失败处理**：必需密钥失败时终止，可选密钥失败时使用默认值

```typescript
interface SecretConfig {
  name: string;
  alias?: string;
  required?: boolean;
  defaultValue?: string;
  isJson?: boolean;
  jsonPath?: string;
  validation?: SecretValidationRule;
}

interface BatchSecretResult {
  success: Record<string, string>;
  failed: Record<string, string>;
  total: number;
  successCount: number;
  failureCount: number;
}
```

#### `checkConnection(): Promise<boolean>`

检查 KMS 服务连接状态。

#### 🆕 **缓存管理方法**

##### `clearSecretCache(secretName: string): boolean`

清除指定密钥的缓存。

##### `clearAllCache(): void`

清除所有密钥缓存。

##### `refreshSecretCache(secretName: string): Promise<string>`

刷新指定密钥的缓存（先清除，再重新获取）。

##### `warmupCache(secretNames: string[], force?: boolean): Promise<void>`

预热缓存，批量加载密钥到缓存。

##### `getCacheStats(): CacheStats | null`

获取缓存统计信息。

## 🚀 缓存功能

本模块内置了高性能的内存缓存系统，可以显著减少对 KMS 的调用次数，提升应用性能。

### 启用缓存

在模块配置中启用缓存：

```typescript
import { KmsModule } from 'cl-nestjs-alicloud-kms';

@Module({
  imports: [
    KmsModule.forRoot({
      client: {
        accessKeyId: 'your-access-key-id',
        accessKeySecret: 'your-access-key-secret',
        regionId: 'cn-hangzhou', // 可选
        endpoint: 'https://kms.cn-hangzhou.aliyuncs.com', // 必选
      },
      enableLogging: true,
      // 启用缓存配置
      cache: {
        enabled: true,
        ttl: 300, // 缓存 5 分钟（秒）
        maxSize: 1000, // 最大缓存 1000 个密钥
        keyPrefix: 'kms_secret:', // 缓存键前缀
      },
    }),
  ],
})
export class AppModule {}
```

### 缓存配置选项

```typescript
export interface SecretCacheOptions {
  /** 是否启用缓存 */
  enabled: boolean;
  /** 缓存 TTL（秒），默认 300 秒 */
  ttl?: number;
  /** 最大缓存数量，默认 1000 */
  maxSize?: number;
  /** 缓存键前缀，默认 'kms_secret:' */
  keyPrefix?: string;
}
```

### 缓存管理 API

##### `clearSecretCache(secretName: string): boolean`

清除指定密钥的缓存。

```typescript
const cleared = await kmsService.clearSecretCache('my-secret');
console.log('缓存已清除:', cleared);
```

##### `clearAllCache(): void`

清除所有密钥缓存。

```typescript
kmsService.clearAllCache();
```

##### `refreshSecretCache(secretName: string): Promise<string>`

刷新指定密钥的缓存。

```typescript
const newValue = await kmsService.refreshSecretCache('my-secret');
```

##### `warmupCache(secretNames: string[], force?: boolean): Promise<void>`

预热缓存，批量加载密钥到缓存。

```typescript
// 预热常用密钥
await kmsService.warmupCache(['app/database/config', 'app/redis/config', 'app/oauth/secret']);

// 强制刷新缓存
await kmsService.warmupCache(secretNames, true);
```

##### `getCacheStats(): CacheStats | null`

获取缓存统计信息。

```typescript
const stats = kmsService.getCacheStats();
if (stats) {
  console.log('缓存统计:', {
    totalKeys: stats.totalKeys,
    hitRate: stats.hitRate,
    hitCount: stats.hitCount,
    missCount: stats.missCount,
    memoryUsage: stats.totalMemoryUsage,
  });
}
```

### 缓存特性

#### 🕒 TTL 过期机制

- 缓存项会在指定的 TTL 时间后自动过期
- 支持自定义每个密钥的 TTL 时间
- 定时清理过期缓存项，避免内存泄漏

#### 🔄 LRU 淘汰策略

- 当缓存达到最大容量时，自动淘汰最少使用的缓存项
- 基于访问时间和频次进行智能淘汰

#### 📊 缓存统计

- 实时统计缓存命中率、内存使用等指标
- 支持缓存事件监听，便于监控和调试

#### ⚡ 性能优化

- 内存缓存，毫秒级响应
- 批量操作自动利用缓存
- 支持缓存预热，减少冷启动时间

### 使用示例

```typescript
@Injectable()
export class ConfigService {
  constructor(private readonly kmsService: KmsService) {}

  async getDatabaseConfig() {
    // 首次调用会从 KMS 获取并缓存
    const config = await this.kmsService.getSecretValueAsJson('app/database/config');

    // 后续调用会从缓存返回（如果未过期）
    return config;
  }

  async refreshAllConfigs() {
    // 清空缓存，强制重新获取
    this.kmsService.clearAllCache();

    // 预热常用配置
    await this.kmsService.warmupCache(['app/database/config', 'app/redis/config', 'app/external/api-keys']);
  }

  async getCacheInfo() {
    const stats = this.kmsService.getCacheStats();
    return {
      enabled: !!stats,
      hitRate: stats?.hitRate || 0,
      totalKeys: stats?.totalKeys || 0,
    };
  }
}
```

### 工具函数

#### `mergeConfig<T>(target: T, source: T): T`

合并两个配置对象，源配置优先。

#### `validateRequiredKeys<T>(config: T, requiredKeys: (keyof T)[]): void`

验证必需的配置键是否存在。

#### `unflattenConfig(flatConfig: Record<string, unknown>): T`

将扁平配置转换为嵌套对象。

#### `flattenConfig(nestedConfig: Record<string, unknown>): Record<string, unknown>`

将嵌套对象扁平化。

#### 🆕 **验证工具函数**

```typescript
// 密钥名称验证
validateSecretName(secretName: string): void

// 阿里云访问密钥验证
validateAccessKeyId(accessKeyId: string): void
validateAccessKeySecret(accessKeySecret: string): void

// 地域和端点验证
validateRegionId(regionId: string): void
validateEndpoint(endpoint: string): void

// 敏感数据脱敏
sanitizeForLogging(data: unknown): unknown
```

## 集成模式

### 🆕 企业级多密钥配置模式

```typescript
@Injectable()
export class EnterpriseConfigService {
  constructor(private readonly kmsService: KmsService) {}

  async initializeAppConfig(): Promise<AppConfig> {
    const secretsConfig: SecretConfigMapping = {
      // 数据库配置
      dbUrl: {
        name: 'prod/database/connection',
        alias: 'DATABASE_URL',
        required: true,
        validation: { pattern: /^(mysql|postgresql):\/\//, minLength: 20 },
      },
      dbPassword: {
        name: 'prod/database/credentials',
        isJson: true,
        jsonPath: 'password',
        alias: 'DB_PASSWORD',
        required: true,
        validation: { minLength: 8 },
      },

      // 缓存配置
      redisUrl: {
        name: 'prod/redis/connection',
        alias: 'REDIS_URL',
        required: false,
        defaultValue: 'redis://localhost:6379',
      },

      // 第三方服务配置
      paymentApiKey: {
        name: 'prod/external/services',
        isJson: true,
        jsonPath: 'payment.apiKey',
        alias: 'PAYMENT_API_KEY',
        required: true,
        validation: { pattern: /^pk_live_/ },
      },
      emailApiKey: {
        name: 'prod/external/services',
        isJson: true,
        jsonPath: 'email.apiKey',
        alias: 'EMAIL_API_KEY',
        required: false,
        defaultValue: 'dev-key',
      },

      // JWT 密钥
      jwtSecret: {
        name: 'prod/auth/jwt-secret',
        alias: 'JWT_SECRET',
        required: true,
        validation: { minLength: 32 },
      },
    };

    const result = await this.kmsService.getSecretsWithConfig(secretsConfig);

    // 将所有配置注入到环境变量中
    Object.entries(result.success).forEach(([key, value]) => {
      process.env[key] = value;
    });

    return result.success as AppConfig;
  }
}
```

### 数据库配置模式

```typescript
@Injectable()
export class DatabaseConfigService {
  constructor(private readonly kmsService: KmsService) {}

  async getDatabaseConfig(): Promise<DatabaseConfig> {
    const remoteConfig = await this.kmsService.getSecretValueAsJson('db-config');
    const localDefaults = { port: '5432', ssl: 'true' };
    return mergeConfig(localDefaults, remoteConfig);
  }
}
```

### 配置缓存模式

```typescript
@Injectable()
export class CachedConfigService {
  private configCache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 分钟

  async getConfig(secretName: string): Promise<unknown> {
    const cached = this.configCache.get(secretName);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.data;
    }

    const data = await this.kmsService.getSecretValueAsJson(secretName);
    this.configCache.set(secretName, { data, timestamp: Date.now() });
    return data;
  }
}
```

### 🆕 环境特定配置模式

```typescript
@Injectable()
export class EnvironmentConfigService {
  constructor(private readonly kmsService: KmsService) {}

  async loadEnvironmentConfig(env: 'dev' | 'staging' | 'prod'): Promise<Record<string, string>> {
    const secretsConfig: SecretConfigMapping = {
      database: {
        name: `${env}/database/connection`,
        required: true,
      },
      redis: {
        name: `${env}/cache/redis`,
        required: false,
        defaultValue: env === 'dev' ? 'redis://localhost:6379' : undefined,
      },
      apiKeys: {
        name: `${env}/external/api-keys`,
        isJson: true,
        required: true,
      },
    };

    const result = await this.kmsService.getSecretsWithConfig(secretsConfig);
    return result.success;
  }
}
```

## 环境变量

设置以下环境变量：

```bash
ALICLOUD_ACCESS_KEY_ID=your-access-key-id
ALICLOUD_ACCESS_KEY_SECRET=your-access-key-secret
ALICLOUD_REGION_ID=cn-hangzhou  # 可选，默认为 cn-hangzhou
```

## 故障排除

### 1. 身份验证问题

- ✅ 验证 `ALICLOUD_ACCESS_KEY_ID` 和 `ALICLOUD_ACCESS_KEY_SECRET` 格式正确
- ✅ 检查 IAM 权限是否包含 `KMS:GetSecretValue`
- ✅ 确保 `regionId` 配置正确
- 🆕 验证访问密钥长度：AccessKeyId（16-32位）、AccessKeySecret（20-50位）

### 2. 密钥未找到

- ✅ 验证密钥名称拼写和格式（只能包含字母、数字、下划线、连字符、点、斜杠）
- ✅ 检查密钥是否存在于指定区域
- ✅ 确认对特定密钥的访问权限
- 🆕 使用 `validateSecretName()` 预验证密钥名称格式

### 3. JSON 解析错误

- ✅ 验证密钥内容是有效的 JSON
- ✅ 对于非 JSON 密钥使用 `getSecretValue()`
- ✅ 检查编码问题
- 🆕 自动检测空值和空白字符，提供详细错误信息

### 4. 连接和网络问题

- ✅ 使用 `checkConnection()` 方法测试连接
- ✅ 验证网络访问 KMS 端点
- ✅ 检查防火墙和代理设置
- 🆕 自动重试机制处理临时网络问题
- 🆕 支持专属网关配置（caCert、ignoreSSL）

### 5. 🆕 多密钥配置问题

- 验证 `SecretConfigMapping` 配置正确性
- 检查必需密钥是否都能成功获取
- 使用验证规则确保密钥值符合预期格式
- 查看 `BatchSecretResult` 中的错误详情

### 6. 🆕 性能和重试问题

- 调整 `maxRetries` 和 `timeout` 配置
- 监控并发请求数量（默认限制10个）
- 查看日志中的重试和错误信息

## 开发和演示

```bash
# 安装依赖
pnpm install

# 构建库
pnpm build

# 运行测试
pnpm test

# 启动 NestJS 演示应用
pnpm dev

# 构建演示应用
pnpm playground:build

# 运行构建后的演示应用
pnpm playground:run

# 代码检查
pnpm lint
```

### 🚀 NestJS 演示应用

运行 `pnpm dev` 启动完整的 NestJS 演示应用，包含以下端点：

- **🏠 主页**: <http://localhost:3000>
- **🔐 KMS 健康检查**: <http://localhost:3000/api/kms/health>
- **📊 KMS 服务信息**: <http://localhost:3000/api/kms/info>
- **🔑 获取密钥**: <http://localhost:3000/api/kms/secret/:name>
- **⚙️ 配置演示**: <http://localhost:3000/api/config/demo>
- **🛠️ 配置工具**: <http://localhost:3000/api/config/demo/merge>

### 🧰 配置工具演示

运行 `pnpm playground` 或 `pnpm dev` 启动 NestJS 应用查看完整的功能演示。

## 🛡️ 企业级鲁棒性特性

### 🔍 输入验证

本库对所有输入进行严格验证，确保数据安全性：

```typescript
// 自动验证密钥名称格式
await kmsService.getSecretValue('invalid@name'); // ❌ 抛出验证错误

// 自动验证访问密钥格式
KmsModule.forRoot({
  client: {
    accessKeyId: 'too-short', // ❌ 长度验证失败
    accessKeySecret: 'invalid', // ❌ 长度验证失败
    endpoint: 'https://kms.cn-hangzhou.aliyuncs.com', // 必选
  },
});
```

### 🔄 智能重试机制

内置指数退避算法，自动处理临时故障：

```typescript
// 自动重试可重试错误（网络超时、服务繁忙等）
// 不重试不可重试错误（认证失败、权限不足等）
const secret = await kmsService.getSecretValue('app-config');
// 内部自动重试最多 3 次，每次延迟递增（1s, 2s, 4s）
```

### 🔒 敏感数据保护

自动脱敏日志中的敏感信息：

```typescript
import { sanitizeForLogging } from 'cl-nestjs-alicloud-kms';

const config = {
  accessKeyId: 'your-access-key-id',
  accessKeySecret: 'sensitive-secret-key',
  database: {
    password: 'db-password',
    host: 'localhost',
  },
};

console.log(sanitizeForLogging(config));
// 输出: {
//   accessKeyId: '[REDACTED]',
//   accessKeySecret: '[REDACTED]',
//   database: { password: '[REDACTED]', host: 'localhost' }
// }
```

### 📊 质量保证

- **98.5% 测试覆盖率** - 232 个测试用例覆盖所有场景
- **零 Lint 错误** - 严格的代码质量标准
- **类型安全** - 100% TypeScript 严格模式兼容
- **错误处理** - 详细的错误信息和上下文

### 🚀 性能优化

- **并发控制** - 批量操作限制并发数量防止过载
- **去重处理** - 自动去除重复的密钥请求
- **连接复用** - 高效的 KMS 客户端连接管理
- **内存优化** - 避免内存泄漏的资源管理

## 许可证

[MIT](LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### 开发流程

1. Fork 项目
2. 创建功能分支: `git checkout -b feature/my-feature`
3. 提交更改: `git commit -am 'Add some feature'`
4. 推送到分支: `git push origin feature/my-feature`
5. 提交 Pull Request

### 代码质量要求

- 所有测试必须通过
- 代码覆盖率需保持在 95% 以上
- 遵循 ESLint 和 Prettier 规则
- 提交信息需符合 [Conventional Commits](https://conventionalcommits.org/) 规范

### 运行开发环境

```bash
# 安装依赖
pnpm install

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 启动开发服务器
pnpm dev

# 构建项目
pnpm build
```

## 更新日志

查看 [RELEASE.md](RELEASE.md) 了解版本历史。
