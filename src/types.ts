import { Provider } from '@nestjs/common';
import type { Simplify, RequireAtLeastOne, SetRequired, Merge, PartialDeep, RequiredDeep } from 'type-fest';

/**
 * 日志级别类型
 */
export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

/**
 * 日志参数类型 - 更严格的类型约束
 */
export type LogParams = readonly (string | number | boolean | object | null | undefined)[];

/**
 * 通用 Logger 接口
 */
export interface LoggerInterface {
  /** 记录普通日志 */
  log(message: string, ...optionalParams: LogParams): void;
  /** 记录错误日志 */
  error(message: string, ...optionalParams: LogParams): void;
  /** 记录警告日志 */
  warn(message: string, ...optionalParams: LogParams): void;
  /** 记录调试日志（可选） */
  debug?(message: string, ...optionalParams: LogParams): void;
  /** 记录详细日志（可选） */
  verbose?(message: string, ...optionalParams: LogParams): void;
}

/**
 * Logger 接口的必需方法版本
 */
export type RequiredLoggerInterface = RequiredDeep<LoggerInterface>;

/**
 * 阿里云地域类型
 */
export type AliCloudRegion =
  | 'cn-hangzhou'
  | 'cn-shanghai'
  | 'cn-beijing'
  | 'cn-shenzhen'
  | 'cn-qingdao'
  | 'cn-zhangjiakou'
  | 'cn-huhehaote'
  | 'cn-chengdu'
  | 'cn-hongkong'
  | 'ap-southeast-1'
  | 'ap-southeast-2'
  | 'ap-southeast-3'
  | 'ap-southeast-5'
  | 'ap-northeast-1'
  | 'us-west-1'
  | 'us-east-1'
  | 'eu-central-1'
  | 'eu-west-1'
  | 'ap-south-1'
  | (string & {}); // 允许其他字符串同时保持智能提示

/**
 * KMS 客户端配置接口
 */
export interface KmsClientConfig {
  /** 阿里云 Access Key ID */
  readonly accessKeyId: string;
  /** 阿里云 Access Key Secret */
  readonly accessKeySecret: string;
  /** KMS 服务地域 */
  readonly regionId?: AliCloudRegion;
  /** KMS 服务端点 */
  readonly endpoint: string;
  /** CA 证书内容（专属网关访问时需要） */
  readonly caCert?: string;
  /** 是否忽略 HTTPS 证书验证（仅用于专属网关且未配置 CA 证书时） */
  readonly ignoreSSL?: boolean;
}

/**
 * 必需的 KMS 客户端配置
 */
export type RequiredKmsClientConfig = SetRequired<KmsClientConfig, 'endpoint'>;

/**
 * 部分 KMS 客户端配置（用于更新）
 */
export type PartialKmsClientConfig = PartialDeep<KmsClientConfig>;

/**
 * KMS 模块配置接口
 */
export interface KmsModuleConfig {
  /** KMS 客户端配置 */
  readonly client: KmsClientConfig;
  /** 默认密钥名称 */
  readonly defaultSecretName?: string;
  /** 是否启用日志 */
  readonly enableLogging?: boolean;
  /** 自定义 Logger 实例（可选，未提供时使用默认 NestJS Logger） */
  readonly logger?: LoggerInterface;
  /** 多密钥配置映射 */
  readonly secretsConfig?: SecretConfigMapping;
  /** 网关类型：共享网关或专属网关 */
  readonly gatewayType?: 'shared' | 'dedicated';
  /** 请求超时时间（毫秒），默认30秒 */
  readonly timeout?: number;
  /** 最大重试次数，默认3次 */
  readonly maxRetries?: number;
}

/**
 * 完整的 KMS 模块配置（所有字段必填）
 */
export type CompleteKmsModuleConfig = Simplify<SetRequired<KmsModuleConfig, 'defaultSecretName' | 'enableLogging'>>;

/**
 * 部分 KMS 模块配置（用于更新）
 */
export type PartialKmsModuleConfig = PartialDeep<KmsModuleConfig>;

/**
 * 配置工厂函数类型
 */
export type ConfigFactory<T = KmsModuleConfig> = (...args: readonly unknown[]) => Promise<T> | T;

/**
 * KMS 模块异步配置选项
 */
export interface KmsModuleAsyncOptions {
  /** 配置工厂函数 */
  readonly useFactory?: ConfigFactory;
  /** 注入的依赖项 */
  readonly inject?: readonly unknown[];
  /** 全局模块 */
  readonly global?: boolean;
  /** 自定义 Logger 提供者（可选） */
  readonly loggerProvider?: Provider<LoggerInterface>;
}

/**
 * KMS 模块完整配置选项（包含 Logger 配置）- 使用 type-fest 优化
 */
export interface KmsModuleOptions {
  /** KMS 模块配置 */
  readonly config: KmsModuleConfig;
  /** 自定义 Logger 提供者（可选） */
  readonly loggerProvider?: Provider<LoggerInterface>;
  /** 是否为全局模块 */
  readonly global?: boolean;
}

/**
 * 从 KMS 获取的密钥数据类型 - 简单的 JSON 对象，不预设结构
 */
export type KmsSecretData = unknown;

/**
 * 强类型的密钥数据（已简化为通用类型）
 */
export type TypedKmsSecretData<T = unknown> = T;

/**
 * 密钥名称类型
 */
export type SecretName = string;

/**
 * 密钥值类型
 */
export type SecretValue = string;

// ===========================
// 高级工具类型和类型约束
// ===========================

/**
 * KMS 服务的操作结果类型
 */
export type KmsOperationResult<T = unknown> = Simplify<{
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly timestamp: Date;
}>;

/**
 * 批量操作结果
 */
export type BatchOperationResult<T> = Simplify<{
  readonly success: Record<string, T>;
  readonly failed: Record<string, string>;
  readonly total: number;
  readonly successCount: number;
  readonly failureCount: number;
}>;

/**
 * 密钥配置验证规则
 */
export interface SecretValidationRule {
  readonly required?: boolean;
  readonly pattern?: RegExp;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly validator?: (value: string) => boolean | string;
}

/**
 * 密钥验证配置
 */
export type SecretValidationConfig = Record<string, SecretValidationRule>;

/**
 * 连接状态类型
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * KMS 连接信息
 */
export interface KmsConnectionInfo {
  readonly status: ConnectionStatus;
  readonly region: AliCloudRegion;
  readonly endpoint?: string;
  readonly lastConnected?: Date;
  readonly errorMessage?: string;
}

/**
 * 环境类型
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * 环境特定的配置
 */
export type EnvironmentConfig<T> = RequireAtLeastOne<Record<Environment, T>>;

/**
 * KMS 客户端工厂选项
 */
export interface KmsClientFactoryOptions {
  readonly environment: Environment;
  readonly config: EnvironmentConfig<KmsClientConfig>;
  readonly logger?: LoggerInterface;
  readonly retryAttempts?: number;
  readonly timeout?: number;
}

/**
 * 密钥缓存选项
 */
export interface SecretCacheOptions {
  readonly enabled: boolean;
  readonly ttl?: number; // Time to live in seconds
  readonly maxSize?: number;
  readonly keyPrefix?: string;
}

/**
 * 扩展的 KMS 模块配置，包含缓存和环境支持
 */
export type ExtendedKmsModuleConfig = Merge<
  KmsModuleConfig,
  {
    readonly environment?: Environment;
    readonly cache?: SecretCacheOptions;
    readonly validation?: SecretValidationConfig;
    readonly retryAttempts?: number;
    readonly timeout?: number;
  }
>;

/**
 * 简化的密钥映射
 */
export type SecretMapping<T = Record<string, unknown>> = Simplify<{
  readonly [K in keyof T]: {
    readonly secretName: string;
    readonly defaultValue?: T[K];
    readonly required?: boolean;
    readonly validation?: SecretValidationRule;
  };
}>;

/**
 * 简化的密钥值提取器类型
 */
export type SecretExtractor<T = unknown> = (secrets: Record<string, string>) => Promise<T> | T;

/**
 * 密钥配置项
 */
export interface SecretConfig {
  /** 密钥名称 */
  readonly name: string;
  /** 密钥别名（用于映射到配置键） */
  readonly alias?: string;
  /** 是否必需 */
  readonly required?: boolean;
  /** 默认值（当密钥不存在且非必需时使用） */
  readonly defaultValue?: string;
  /** 是否为 JSON 格式 */
  readonly isJson?: boolean;
  /** JSON 路径（用于从 JSON 密钥中提取特定字段） */
  readonly jsonPath?: string;
  /** 验证规则 */
  readonly validation?: SecretValidationRule;
}

/**
 * 多密钥配置映射
 */
export type SecretConfigMapping = Record<string, SecretConfig>;

/**
 * 环境特定的密钥配置
 */
export interface EnvironmentSecretConfig {
  /** 环境名称 */
  readonly environment: Environment;
  /** 该环境下的密钥配置 */
  readonly secrets: SecretConfigMapping;
  /** 环境特定的客户端配置覆盖 */
  readonly clientOverrides?: Partial<KmsClientConfig>;
}

/**
 * 批量获取结果
 */
export interface BatchSecretResult {
  /** 成功获取的密钥 */
  readonly success: Record<string, string>;
  /** 获取失败的密钥及错误信息 */
  readonly failed: Record<string, string>;
  /** 总数量 */
  readonly total: number;
  /** 成功数量 */
  readonly successCount: number;
  /** 失败数量 */
  readonly failureCount: number;
}
