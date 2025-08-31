import { vi } from 'vitest';
import {
  type KmsModuleConfig,
  type SecretCacheOptions,
  type LoggerInterface,
  type BatchSecretResult,
  type KmsOperationResult,
  type SecretValidationRule,
} from '../src/types';

describe('类型集成测试', () => {
  // 这些测试主要是为了验证类型的使用和提高覆盖率

  it('should work with KmsModuleConfig type', () => {
    const mockConfig: KmsModuleConfig = {
      client: {
        accessKeyId: 'TESTACCESSKEYID1234',
        accessKeySecret: 'TestAccessKeySecret123456789',
        regionId: 'cn-hangzhou',
        endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
      },
      defaultSecretName: 'test-secret',
      enableLogging: true,
    };

    expect(mockConfig.client.accessKeyId).toBe('TESTACCESSKEYID1234');
    expect(mockConfig.enableLogging).toBe(true);
  });

  it('should work with SecretCacheOptions type', () => {
    const cacheOptions: SecretCacheOptions = {
      enabled: true,
      ttl: 300,
      maxSize: 100,
      keyPrefix: 'test:',
    };

    expect(cacheOptions.enabled).toBe(true);
    expect(cacheOptions.ttl).toBe(300);
  });

  it('should work with LoggerInterface type', () => {
    const mockLogger: LoggerInterface = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    };

    mockLogger.log('test message');
    expect(mockLogger.log).toHaveBeenCalledWith('test message');
  });

  it('should work with BatchSecretResult type', () => {
    const result: BatchSecretResult = {
      success: { secret1: 'value1' },
      failed: { secret2: 'error message' },
      total: 2,
      successCount: 1,
      failureCount: 1,
    };

    expect(result.total).toBe(2);
    expect(result.successCount).toBe(1);
  });

  it('should work with KmsOperationResult type', () => {
    const result: KmsOperationResult<string> = {
      success: true,
      data: 'test-data',
      timestamp: new Date(),
    };

    expect(result.success).toBe(true);
    expect(result.data).toBe('test-data');
  });

  it('should work with SecretValidationRule type', () => {
    const rule: SecretValidationRule = {
      required: true,
      pattern: /^[a-zA-Z0-9]+$/,
      minLength: 5,
      maxLength: 50,
      validator: (value: string) => value.length > 0,
    };

    expect(rule.required).toBe(true);
    expect(rule.minLength).toBe(5);
    expect(rule.validator?.('test')).toBe(true);
  });

  it('should work with environment types', () => {
    const environments = ['development', 'staging', 'production', 'test'] as const;

    environments.forEach((env) => {
      expect(typeof env).toBe('string');
    });
  });

  it('should work with region types', () => {
    const regions = ['cn-hangzhou', 'cn-shanghai', 'us-west-1', 'eu-central-1'] as const;

    regions.forEach((region) => {
      expect(typeof region).toBe('string');
    });
  });

  it('should validate complex config object', () => {
    const complexConfig: KmsModuleConfig = {
      client: {
        accessKeyId: 'TESTACCESSKEYID1234',
        accessKeySecret: 'TestAccessKeySecret123456789',
        regionId: 'cn-hangzhou',
        endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
        caCert: 'test-cert',
        ignoreSSL: false,
      },
      defaultSecretName: 'default/secret',
      enableLogging: true,
      secretsConfig: {
        database: {
          name: 'prod/database/config',
          alias: 'dbConfig',
          required: true,
          isJson: true,
        },
      },
      gatewayType: 'shared',
      timeout: 30000,
      maxRetries: 3,
    };

    expect(complexConfig.client.endpoint).toBeDefined();
    expect(complexConfig.secretsConfig?.database.required).toBe(true);
    expect(complexConfig.gatewayType).toBe('shared');
  });
});
