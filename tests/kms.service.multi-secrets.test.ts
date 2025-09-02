import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  KmsService,
  KMS_CONFIG_TOKEN,
  KMS_LOGGER_TOKEN,
  type KmsModuleConfig,
  type LoggerInterface,
  type SecretConfigMapping,
} from '../src/index';

// Mock the entire KMS client module
vi.mock('@alicloud/kms20160120', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      getSecretValue: vi.fn(),
    })),
    GetSecretValueRequest: vi.fn().mockImplementation((params) => params),
  };
});

describe('KmsService Multi-Secrets Configuration Tests', () => {
  let service: KmsService;
  let module: TestingModule;
  let mockKmsClient: {
    getSecretValue: ReturnType<typeof vi.fn>;
  };
  let mockLogger: LoggerInterface;

  const mockConfig: KmsModuleConfig = {
    client: {
      accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
      accessKeySecret: 'validSecretKey1234567890123456789',
      regionId: 'cn-hangzhou',
      endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
    },
    enableLogging: true,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    };

    mockKmsClient = {
      getSecretValue: vi.fn(),
    };

    // Re-establish the mock implementation after clearing
    const KmsClientMock = (await import('@alicloud/kms20160120')).default;
    vi.mocked(KmsClientMock).mockImplementation(() => mockKmsClient);

    module = await Test.createTestingModule({
      providers: [
        {
          provide: KMS_CONFIG_TOKEN,
          useValue: mockConfig,
        },
        {
          provide: KMS_LOGGER_TOKEN,
          useValue: mockLogger,
        },
        KmsService,
      ],
    }).compile();

    service = module.get<KmsService>(KmsService);
  });

  afterEach(async () => {
    await module.close();
    vi.clearAllMocks();
  });

  describe('getSecretsWithConfig', () => {
    it('should handle empty configuration', async () => {
      const result = await service.getSecretsWithConfig({});

      expect(result).toEqual({
        success: {},
        failed: {},
        total: 0,
        successCount: 0,
        failureCount: 0,
      });
    });

    it('should fetch multiple secrets with basic configuration', async () => {
      const secretsConfig: SecretConfigMapping = {
        database: {
          name: 'app/database/url',
          required: true,
        },
        redis: {
          name: 'app/redis/url',
          required: false,
          defaultValue: 'redis://localhost:6379',
        },
      };

      mockKmsClient.getSecretValue
        .mockResolvedValueOnce({ body: { secretData: 'mysql://db:3306/app' } })
        .mockResolvedValueOnce({ body: { secretData: 'redis://redis:6379' } });

      const result = await service.getSecretsWithConfig(secretsConfig);

      expect(result.success).toEqual({
        database: 'mysql://db:3306/app',
        redis: 'redis://redis:6379',
      });
      expect(result.total).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('should use aliases for key mapping', async () => {
      const secretsConfig: SecretConfigMapping = {
        dbUrl: {
          name: 'app/database/url',
          alias: 'DATABASE_URL',
          required: true,
        },
        redisUrl: {
          name: 'app/redis/url',
          alias: 'REDIS_URL',
          required: true,
        },
      };

      mockKmsClient.getSecretValue
        .mockResolvedValueOnce({ body: { secretData: 'mysql://db:3306/app' } })
        .mockResolvedValueOnce({ body: { secretData: 'redis://redis:6379' } });

      const result = await service.getSecretsWithConfig(secretsConfig);

      expect(result.success).toEqual({
        DATABASE_URL: 'mysql://db:3306/app',
        REDIS_URL: 'redis://redis:6379',
      });
      expect(result.successCount).toBe(2);
    });

    it('should handle JSON secrets with path extraction', async () => {
      const secretsConfig: SecretConfigMapping = {
        dbPassword: {
          name: 'app/database/config',
          isJson: true,
          jsonPath: 'password',
          required: true,
        },
        dbHost: {
          name: 'app/database/config',
          isJson: true,
          jsonPath: 'host',
          required: true,
        },
      };

      const jsonData = {
        host: 'localhost',
        port: 3306,
        username: 'admin',
        password: 'secret123',
      };

      mockKmsClient.getSecretValue.mockResolvedValue({ body: { secretData: JSON.stringify(jsonData) } });

      const result = await service.getSecretsWithConfig(secretsConfig);

      expect(result.success).toEqual({
        dbPassword: 'secret123',
        dbHost: 'localhost',
      });
      expect(result.successCount).toBe(2);
    });

    it('should use default values for optional secrets when fetch fails', async () => {
      const secretsConfig: SecretConfigMapping = {
        required: {
          name: 'app/required-secret',
          required: true,
        },
        optional: {
          name: 'app/optional-secret',
          required: false,
          defaultValue: 'default-value',
        },
      };

      mockKmsClient.getSecretValue
        .mockResolvedValueOnce({ body: { secretData: 'required-value' } })
        .mockRejectedValueOnce(new Error('Secret not found'));

      const result = await service.getSecretsWithConfig(secretsConfig);

      expect(result.success).toEqual({
        required: 'required-value',
        optional: 'default-value',
      });
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Using default value for optional secret optional:',
        'Secret not found',
      );
    });

    it('should fail when required secrets cannot be fetched', async () => {
      const secretsConfig: SecretConfigMapping = {
        required1: {
          name: 'app/required-secret-1',
          required: true,
        },
        required2: {
          name: 'app/required-secret-2',
          required: true,
        },
        optional: {
          name: 'app/optional-secret',
          required: false,
          defaultValue: 'default-value',
        },
      };

      mockKmsClient.getSecretValue
        .mockRejectedValueOnce(new Error('Secret not found'))
        .mockRejectedValueOnce(new Error('Access denied'))
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getSecretsWithConfig(secretsConfig)).rejects.toThrow(
        'Failed to fetch required secrets: required1, required2',
      );
    });

    it('should validate secret values according to validation rules', async () => {
      const secretsConfig: SecretConfigMapping = {
        password: {
          name: 'app/password',
          required: true,
          validation: {
            minLength: 8,
            maxLength: 50,
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
          },
        },
      };

      mockKmsClient.getSecretValue.mockResolvedValueOnce({ body: { secretData: 'weak' } });

      await expect(service.getSecretsWithConfig(secretsConfig)).rejects.toThrow(
        'Secret value length must be at least 8',
      );
    });

    it('should handle custom validation functions', async () => {
      const secretsConfig: SecretConfigMapping = {
        email: {
          name: 'app/admin-email',
          required: true,
          validation: {
            validator: (value: string) => value.includes('@') && value.includes('.'),
          },
        },
      };

      mockKmsClient.getSecretValue.mockResolvedValueOnce({ body: { secretData: 'invalid-email' } });

      await expect(service.getSecretsWithConfig(secretsConfig)).rejects.toThrow(
        'Secret value failed custom validation',
      );
    });

    it('should handle complex JSON path extraction', async () => {
      const secretsConfig: SecretConfigMapping = {
        apiKey: {
          name: 'app/services/config',
          isJson: true,
          jsonPath: 'external.apis.payment.key',
          required: true,
        },
      };

      const jsonData = {
        external: {
          apis: {
            payment: {
              key: 'pk_test_123456',
              secret: 'sk_test_789012',
            },
            email: {
              key: 'em_test_345678',
            },
          },
        },
      };

      mockKmsClient.getSecretValue.mockResolvedValueOnce({ body: { secretData: JSON.stringify(jsonData) } });

      const result = await service.getSecretsWithConfig(secretsConfig);

      expect(result.success).toEqual({
        apiKey: 'pk_test_123456',
      });
    });

    it('should handle invalid JSON paths gracefully', async () => {
      const secretsConfig: SecretConfigMapping = {
        invalid: {
          name: 'app/config',
          isJson: true,
          jsonPath: 'nonexistent.path',
          required: true,
        },
      };

      mockKmsClient.getSecretValue.mockResolvedValueOnce({ body: { secretData: '{"key": "value"}' } });

      await expect(service.getSecretsWithConfig(secretsConfig)).rejects.toThrow('Invalid JSON path: nonexistent.path');
    });

    it('should log batch operation results', async () => {
      const secretsConfig: SecretConfigMapping = {
        secret1: { name: 'app/secret1', required: true },
        secret2: { name: 'app/secret2', required: true },
      };

      mockKmsClient.getSecretValue
        .mockResolvedValueOnce({ body: { secretData: 'value1' } })
        .mockResolvedValueOnce({ body: { secretData: 'value2' } });

      await service.getSecretsWithConfig(secretsConfig);

      expect(mockLogger.log).toHaveBeenCalledWith('Batch secret retrieval completed: 2/2 successful');
    });
  });
});
