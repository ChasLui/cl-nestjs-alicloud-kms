// 导出核心模块和服务
export { KmsModule } from './kms.module';
export { KmsService, KMS_CONFIG_TOKEN, KMS_LOGGER_TOKEN, KMS_CACHE_TOKEN } from './kms.service';
export { CacheService, CACHE_CONFIG_TOKEN, CACHE_LOGGER_TOKEN } from './cache.service';

// 导出缓存相关类型
export type { CacheStats, CacheEventType, CacheEventListener } from './cache.service';

// 导出基础类型
export type {
  // Logger 相关类型
  LoggerInterface,
  RequiredLoggerInterface,
  LogLevel,
  LogParams,

  // KMS 配置类型
  KmsClientConfig,
  RequiredKmsClientConfig,
  PartialKmsClientConfig,
  KmsModuleConfig,
  CompleteKmsModuleConfig,
  PartialKmsModuleConfig,
  KmsModuleAsyncOptions,
  KmsModuleOptions,
  ExtendedKmsModuleConfig,

  // 密钥数据类型
  KmsSecretData,
  TypedKmsSecretData,
  SecretName,
  SecretValue,

  // 阿里云相关类型
  AliCloudRegion,

  // 工具类型
  ConfigFactory,
  KmsOperationResult,
  BatchOperationResult,
  SecretValidationRule,
  SecretValidationConfig,
  ConnectionStatus,
  KmsConnectionInfo,
  Environment,
  EnvironmentConfig,
  KmsClientFactoryOptions,
  SecretCacheOptions,
  SecretMapping,
  SecretExtractor,

  // 多密钥配置类型
  SecretConfig,
  SecretConfigMapping,
  EnvironmentSecretConfig,
  BatchSecretResult,
} from './types';

// 导出工具函数
export {
  mergeConfig,
  mergeMultipleConfigs,
  validateRequiredKeys,
  filterEmptyValues,
  unflattenConfig,
  flattenConfig,
  getErrorMessage,
  validateSecretName,
  validateAccessKeyId,
  validateAccessKeySecret,
  validateRegionId,
  validateEndpoint,
  sanitizeForLogging,
} from './utils';
