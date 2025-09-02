import { Injectable, Inject, Logger, Optional } from '@nestjs/common';

// 动态导入 KMS SDK 以解决 ESM/CommonJS 兼容性问题
let KmsClient: new (config: unknown) => unknown;
let GetSecretValueRequest: new (params: unknown) => unknown;

// 使用动态导入来处理 CommonJS 模块
const initKmsModule = async () => {
  if (!KmsClient) {
    try {
      // 在测试环境中，直接使用已经模拟的模块
      if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
        // 尝试获取已经模拟的模块
        const kmsModule = await import('@alicloud/kms20160120');
        KmsClient = kmsModule.default;
        GetSecretValueRequest = kmsModule.GetSecretValueRequest;
        return { KmsClient, GetSecretValueRequest };
      }

      // 尝试 ESM 导入
      const kmsModule = await import('@alicloud/kms20160120');

      // 尝试多种导入模式来找到正确的 Client 构造函数
      KmsClient = kmsModule.default?.Client || kmsModule.Client || kmsModule.default || kmsModule;
      GetSecretValueRequest = kmsModule.GetSecretValueRequest || kmsModule.default?.GetSecretValueRequest;

      // 验证 KmsClient 是否为构造函数
      if (typeof KmsClient !== 'function') {
        throw new Error(
          `KmsClient is not a constructor. Type: ${typeof KmsClient}, Available keys: ${Object.keys(kmsModule)}`,
        );
      }
    } catch (error) {
      // 如果 ESM 导入失败，尝试使用 createRequire (仅在支持时)
      if (typeof import.meta !== 'undefined' && import.meta.url) {
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const kmsModule = require('@alicloud/kms20160120');

        // 尝试多种导入模式
        KmsClient = kmsModule.default?.Client || kmsModule.Client || kmsModule.default || kmsModule;
        GetSecretValueRequest = kmsModule.GetSecretValueRequest || kmsModule.default?.GetSecretValueRequest;

        // 验证 KmsClient 是否为构造函数
        if (typeof KmsClient !== 'function') {
          throw new Error(
            `KmsClient is not a constructor. Type: ${typeof KmsClient}, Available keys: ${Object.keys(kmsModule)}`,
          );
        }
      } else {
        throw new Error(`Unable to import @alicloud/kms20160120 in this environment. Original error: ${error.message}`);
      }
    }
  }
  return { KmsClient, GetSecretValueRequest };
};
import {
  KmsModuleConfig,
  LoggerInterface,
  SecretConfig,
  SecretConfigMapping,
  BatchSecretResult,
  SecretValidationRule,
} from './types';
import {
  getErrorMessage,
  validateSecretName,
  validateAccessKeyId,
  validateAccessKeySecret,
  validateRegionId,
  validateEndpoint,
  sanitizeForLogging,
} from './utils';
import { CacheService } from './cache.service';

/**
 * KMS 常量定义
 */
export const KMS_CONFIG_TOKEN = 'KMS_CONFIG_TOKEN';
export const KMS_LOGGER_TOKEN = 'KMS_LOGGER_TOKEN';
export const KMS_CACHE_TOKEN = 'KMS_CACHE_TOKEN';

/**
 * KMS 服务类，用于与阿里云 KMS 服务交互
 */
@Injectable()
export class KmsService {
  private readonly logger: LoggerInterface;
  private kmsClient: unknown;
  private initPromise: Promise<void>;

  constructor(
    @Inject(KMS_CONFIG_TOKEN)
    private readonly config: KmsModuleConfig,
    @Optional()
    @Inject(KMS_LOGGER_TOKEN)
    private readonly injectedLogger?: LoggerInterface,
    @Optional()
    @Inject(KMS_CACHE_TOKEN)
    private readonly cacheService?: CacheService,
  ) {
    // 优先使用注入的 logger，其次使用配置中的 logger，最后使用默认的 NestJS Logger
    this.logger = this.injectedLogger || this.config.logger || new Logger(KmsService.name);

    // 验证配置 - 同步验证以确保在构造时就能捕获错误
    this.validateConfiguration();

    // 异步初始化 KMS 客户端
    this.initPromise = this.initializeKmsClient();
  }

  /**
   * 异步初始化 KMS 客户端
   * @private
   */
  private async initializeKmsClient(): Promise<void> {
    try {
      // 初始化 KMS 模块
      const { KmsClient: ClientClass } = await initKmsModule();

      const clientConfig = {
        accessKeyId: this.config.client.accessKeyId,
        accessKeySecret: this.config.client.accessKeySecret,
        regionId: this.config.client.regionId || 'cn-hangzhou',
        endpoint: this.config.client.endpoint,
        toMap: () => ({
          accessKeyId: this.config.client.accessKeyId,
          accessKeySecret: this.config.client.accessKeySecret,
          regionId: this.config.client.regionId || 'cn-hangzhou',
          endpoint: this.config.client.endpoint,
        }),
      };

      this.kmsClient = new ClientClass(clientConfig);

      if (this.config.enableLogging) {
        this.logger.log('KMS Service initialized successfully', sanitizeForLogging(clientConfig));
      }
    } catch (error) {
      this.logger.error('Failed to initialize KMS Service:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * 确保 KMS 客户端已初始化
   * @private
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.kmsClient) {
      await this.initPromise;
    }
  }

  /**
   * 验证 KMS 配置
   * @private
   */
  private validateConfiguration(): void {
    if (!this.config) {
      throw new Error('KMS configuration is required');
    }

    if (!this.config.client) {
      throw new Error('KMS client configuration is required');
    }

    // 验证必需的配置字段
    validateAccessKeyId(this.config.client.accessKeyId);
    validateAccessKeySecret(this.config.client.accessKeySecret);
    validateEndpoint(this.config.client.endpoint);

    // 验证可选字段
    if (this.config.client.regionId) {
      validateRegionId(this.config.client.regionId);
    }

    if (this.config.defaultSecretName) {
      validateSecretName(this.config.defaultSecretName);
    }
  }

  /**
   * 获取指定密钥的值
   * @param secretName 密钥名称
   * @param skipCache 是否跳过缓存，直接从KMS获取
   * @returns 密钥数据
   */
  async getSecretValue(secretName: string, skipCache = false): Promise<string> {
    // 确保 KMS 客户端已初始化
    await this.ensureInitialized();

    // 验证输入参数
    validateSecretName(secretName);

    // 如果启用缓存且不跳过缓存，先尝试从缓存获取
    if (!skipCache && this.cacheService?.isEnabled()) {
      const cachedValue = this.cacheService.get<string>(secretName);
      if (cachedValue !== null) {
        if (this.config.enableLogging) {
          this.logger.log(`Cache hit for secret: ${secretName}`);
        }
        return cachedValue;
      }
    }

    return this.executeWithRetry(async () => {
      if (this.config.enableLogging) {
        this.logger.log(`从 KMS 获取密钥: ${secretName}`);
      }

      // 动态获取 GetSecretValueRequest
      const { GetSecretValueRequest: RequestClass } = await initKmsModule();
      const request = new RequestClass({
        secretName,
      });

      const response = await this.kmsClient.getSecretValue(request);
      const secretData = response.body?.secretData || '';

      // 如果启用缓存，将结果存入缓存
      if (!skipCache && this.cacheService?.isEnabled()) {
        this.cacheService.set(secretName, secretData);
        if (this.config.enableLogging) {
          this.logger.log(`Cached secret: ${secretName}`);
        }
      }

      if (this.config.enableLogging) {
        this.logger.log(`成功获取密钥: ${secretName}`);
      }

      return secretData;
    }, `fetch secret ${secretName}`);
  }

  /**
   * 带重试机制的执行函数
   * @private
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationDescription: string,
    maxRetries = 3,
    baseDelay = 1000,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorMessage = getErrorMessage(error);

        // 不需要重试的错误类型
        if (this.isNonRetryableError(error)) {
          this.logger.error(`Failed to ${operationDescription} (non-retryable):`, errorMessage);
          throw error;
        }

        if (attempt === maxRetries) {
          this.logger.error(`Failed to ${operationDescription} after ${maxRetries} attempts:`, errorMessage);
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000; // 指数退避 + 抖动
        this.logger.warn(
          `Attempt ${attempt} failed for ${operationDescription}, retrying in ${Math.round(delay)}ms:`,
          errorMessage,
        );
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * 判断是否为不可重试的错误
   * @private
   */
  private isNonRetryableError(error: unknown): boolean {
    const errorMessage = getErrorMessage(error).toLowerCase();

    // 认证错误、权限错误、参数错误等不应重试
    const nonRetryablePatterns = [
      'unauthorized',
      'forbidden',
      'access denied',
      'invalid signature',
      'invalid access key',
      'invalid parameter',
      'secret not found',
      'bad request',
    ];

    return nonRetryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  /**
   * 睡眠函数
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取默认密钥的值
   * @returns 密钥数据
   */
  async getDefaultSecretValue(): Promise<string> {
    if (!this.config.defaultSecretName) {
      throw new Error('Default secret name is not configured');
    }
    return this.getSecretValue(this.config.defaultSecretName);
  }

  /**
   * 获取密钥并解析为 JSON 对象
   * @param secretName 密钥名称
   * @returns 解析后的 JSON 对象（任意类型）
   */
  async getSecretValueAsJson(secretName: string): Promise<unknown> {
    const secretData = await this.getSecretValue(secretName);

    if (!secretData || secretData.trim().length === 0) {
      throw new Error(`Secret ${secretName} is empty or contains only whitespace`);
    }

    try {
      return JSON.parse(secretData);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`无法将密钥 ${secretName} 解析为 JSON:`, errorMessage);

      // 提供更具体的错误信息
      if (errorMessage.includes('Unexpected token') || errorMessage.includes('JSON')) {
        throw new Error(`Invalid JSON format in secret ${secretName}: ${errorMessage}`);
      }

      throw new Error(`Failed to parse secret ${secretName} as JSON: ${errorMessage}`);
    }
  }

  /**
   * 获取默认密钥并解析为 JSON 对象
   * @returns 解析后的 JSON 对象（任意类型）
   */
  async getDefaultSecretValueAsJson(): Promise<unknown> {
    if (!this.config.defaultSecretName) {
      throw new Error('Default secret name is not configured');
    }
    return this.getSecretValueAsJson(this.config.defaultSecretName);
  }

  /**
   * 批量获取多个密钥
   * @param secretNames 密钥名称数组
   * @returns 密钥数据映射表
   */
  async getMultipleSecrets(secretNames: string[]): Promise<Record<string, string>> {
    if (!Array.isArray(secretNames)) {
      throw new Error('Secret names must be an array');
    }

    if (secretNames.length === 0) {
      return {};
    }

    // 验证所有密钥名称
    secretNames.forEach((secretName) => validateSecretName(secretName));

    // 去重处理
    const uniqueSecretNames = [...new Set(secretNames)];

    const results: Record<string, string> = {};
    const errors: Record<string, string> = {};

    // 限制并发数量以避免过多的并发请求
    const concurrencyLimit = Math.min(uniqueSecretNames.length, 10);
    const batches: string[][] = [];

    for (let i = 0; i < uniqueSecretNames.length; i += concurrencyLimit) {
      batches.push(uniqueSecretNames.slice(i, i + concurrencyLimit));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (secretName) => {
          try {
            results[secretName] = await this.getSecretValue(secretName);
          } catch (error) {
            const errorMessage = getErrorMessage(error);
            errors[secretName] = errorMessage;
            this.logger.error(`Failed to fetch secret ${secretName}:`, errorMessage);
          }
        }),
      );
    }

    // 如果有错误，抛出包含详细信息的错误
    if (Object.keys(errors).length > 0) {
      const errorDetails = Object.entries(errors)
        .map(([name, error]) => `${name}: ${error}`)
        .join('; ');
      throw new Error(`Failed to fetch ${Object.keys(errors).length} secret(s): ${errorDetails}`);
    }

    return results;
  }

  /**
   * 根据配置批量获取多个密钥（支持别名映射和默认值）
   * @param secretsConfig 密钥配置映射
   * @returns 批量获取结果
   */
  async getSecretsWithConfig(secretsConfig: SecretConfigMapping): Promise<BatchSecretResult> {
    const configEntries = Object.entries(secretsConfig);
    const success: Record<string, string> = {};
    const failed: Record<string, string> = {};

    if (configEntries.length === 0) {
      return {
        success: {},
        failed: {},
        total: 0,
        successCount: 0,
        failureCount: 0,
      };
    }

    // 分离必需和可选的密钥
    const requiredSecrets = configEntries.filter(([, config]) => config.required);

    // 处理所有密钥配置
    for (const [key, config] of configEntries) {
      try {
        await this.processSecretConfig(key, config, success, failed);
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        failed[key] = errorMessage;

        if (config.required) {
          this.logger.error(`Failed to fetch required secret ${key}:`, errorMessage);
          // 如果是验证错误，立即抛出原始错误
          if (
            errorMessage.includes('validation') ||
            errorMessage.includes('length must be') ||
            errorMessage.includes('does not match') ||
            errorMessage.includes('Path not found') ||
            errorMessage.includes('Invalid JSON path')
          ) {
            throw error;
          }
        } else {
          this.logger.warn(`Failed to fetch optional secret ${key}:`, errorMessage);
        }
      }
    }

    const total = configEntries.length;
    const successCount = Object.keys(success).length;
    const failureCount = Object.keys(failed).length;

    // 检查是否所有必需的密钥都成功获取
    const failedRequiredSecrets = requiredSecrets.filter(([key]) => failed[key]);
    if (failedRequiredSecrets.length > 0) {
      const failedNames = failedRequiredSecrets.map(([key]) => key).join(', ');
      throw new Error(`Failed to fetch required secrets: ${failedNames}`);
    }

    if (this.config.enableLogging) {
      this.logger.log(`Batch secret retrieval completed: ${successCount}/${total} successful`);
    }

    return {
      success,
      failed,
      total,
      successCount,
      failureCount,
    };
  }

  /**
   * 处理单个密钥配置
   * @private
   */
  private async processSecretConfig(
    key: string,
    config: SecretConfig,
    success: Record<string, string>,
    _failed: Record<string, string>,
  ): Promise<void> {
    const alias = config.alias || key;

    try {
      let secretValue: string;

      if (config.isJson) {
        const jsonData = await this.getSecretValueAsJson(config.name);
        if (config.jsonPath) {
          secretValue = this.extractJsonPath(jsonData, config.jsonPath);
        } else {
          secretValue = JSON.stringify(jsonData);
        }
      } else {
        secretValue = await this.getSecretValue(config.name);
      }

      // 验证密钥值
      if (config.validation) {
        this.validateSecretValue(secretValue, config.validation);
      }

      success[alias] = secretValue;
    } catch (error) {
      if (!config.required && config.defaultValue !== undefined) {
        success[alias] = config.defaultValue;
        if (this.config.enableLogging) {
          this.logger.warn(`Using default value for optional secret ${key}:`, getErrorMessage(error));
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * 从 JSON 对象中提取指定路径的值
   * @private
   */
  private extractJsonPath(data: unknown, path: string): string {
    const keys = path.split('.');
    let current = data;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        throw new Error(`Invalid JSON path: ${path}`);
      }
      current = (current as Record<string, unknown>)[key];
    }

    if (current === undefined) {
      throw new Error(`Path not found in JSON: ${path}`);
    }

    return typeof current === 'string' ? current : JSON.stringify(current);
  }

  /**
   * 验证密钥值
   * @private
   */
  private validateSecretValue(value: string, validation: SecretValidationRule): void {
    if (validation.required && (!value || value.trim().length === 0)) {
      throw new Error('Secret value is required but empty');
    }

    if (validation.minLength && value.length < validation.minLength) {
      throw new Error(`Secret value length must be at least ${validation.minLength}`);
    }

    if (validation.maxLength && value.length > validation.maxLength) {
      throw new Error(`Secret value length must not exceed ${validation.maxLength}`);
    }

    if (validation.pattern && !validation.pattern.test(value)) {
      throw new Error('Secret value does not match required pattern');
    }

    if (validation.validator && !validation.validator(value)) {
      throw new Error('Secret value failed custom validation');
    }
  }

  /**
   * 检查 KMS 服务连接状态
   * @returns 连接是否正常
   */
  async checkConnection(): Promise<boolean> {
    try {
      // 确保 KMS 客户端已初始化
      await this.ensureInitialized();

      if (this.config.defaultSecretName) {
        await this.getSecretValue(this.config.defaultSecretName);
      } else {
        this.logger.warn('连接检查未配置默认密钥');
      }
      return true;
    } catch (error) {
      this.logger.error('KMS 连接检查失败:', getErrorMessage(error));
      return false;
    }
  }

  /**
   * 获取 KMS 客户端实例（高级用法）
   * @returns KMS 客户端实例
   */
  async getKmsClient(): Promise<unknown> {
    await this.ensureInitialized();
    return this.kmsClient;
  }

  /**
   * 获取缓存服务实例
   * @returns 缓存服务实例
   */
  getCacheService(): CacheService | undefined {
    return this.cacheService;
  }

  /**
   * 清除指定密钥的缓存
   * @param secretName 密钥名称
   * @returns 是否成功清除
   */
  clearSecretCache(secretName: string): boolean {
    if (!this.cacheService?.isEnabled()) {
      return false;
    }
    return this.cacheService.delete(secretName);
  }

  /**
   * 清除所有密钥缓存
   */
  clearAllCache(): void {
    if (this.cacheService?.isEnabled()) {
      this.cacheService.clear();
      if (this.config.enableLogging) {
        this.logger.log('All secret cache cleared');
      }
    }
  }

  /**
   * 预热缓存 - 批量加载指定密钥到缓存
   * @param secretNames 密钥名称数组
   * @param force 是否强制刷新已存在的缓存
   */
  async warmupCache(secretNames: string[], force = false): Promise<void> {
    if (!this.cacheService?.isEnabled()) {
      this.logger.warn('Cache is not enabled, skipping warmup');
      return;
    }

    if (secretNames.length === 0) {
      return;
    }

    const secretsToLoad = force ? secretNames : secretNames.filter((name) => !this.cacheService!.has(name));

    if (secretsToLoad.length === 0) {
      if (this.config.enableLogging) {
        this.logger.log('All secrets already cached, skipping warmup');
      }
      return;
    }

    if (this.config.enableLogging) {
      this.logger.log(`Warming up cache for ${secretsToLoad.length} secrets`);
    }

    try {
      const results = await this.getMultipleSecrets(secretsToLoad);

      // 确保所有成功获取的密钥都已缓存（getMultipleSecrets 内部会调用 getSecretValue，已包含缓存逻辑）
      const cachedCount = Object.keys(results).length;

      if (this.config.enableLogging) {
        this.logger.log(`Cache warmup completed: ${cachedCount}/${secretsToLoad.length} secrets cached`);
      }
    } catch (error) {
      this.logger.error('Failed to warmup cache:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * 刷新指定密钥的缓存
   * @param secretName 密钥名称
   * @returns 新的密钥值
   */
  async refreshSecretCache(secretName: string): Promise<string> {
    // 先清除缓存
    this.clearSecretCache(secretName);
    // 重新获取并缓存
    return this.getSecretValue(secretName);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return this.cacheService?.getStats() || null;
  }
}
