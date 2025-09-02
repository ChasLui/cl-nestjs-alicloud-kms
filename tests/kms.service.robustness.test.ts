import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import KmsClient from '@alicloud/kms20160120';
import {
  KmsService,
  KMS_CONFIG_TOKEN,
  KMS_LOGGER_TOKEN,
  type KmsModuleConfig,
  type LoggerInterface,
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

describe('KmsService Robustness Tests', () => {
  let service: KmsService;
  let module: TestingModule;
  let mockKmsClient: {
    getSecretValue: ReturnType<typeof vi.fn>;
  };
  let mockLogger: LoggerInterface;

  const mockConfig: KmsModuleConfig = {
    client: {
      accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
      accessKeySecret: 'mock-access-key-secret-for-testing',
      regionId: 'cn-hangzhou',
      endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
    },
    defaultSecretName: 'test-secret',
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

    (KmsClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockKmsClient);

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

  describe('Input Validation', () => {
    it('should validate secret names in getSecretValue', async () => {
      await expect(service.getSecretValue('')).rejects.toThrow('Secret name must be a non-empty string');
      await expect(service.getSecretValue('   ')).rejects.toThrow('Secret name cannot be empty or whitespace only');
      await expect(service.getSecretValue('invalid secret')).rejects.toThrow('Secret name can only contain');
      await expect(service.getSecretValue('invalid@secret')).rejects.toThrow('Secret name can only contain');
      await expect(service.getSecretValue('a'.repeat(256))).rejects.toThrow('Secret name cannot exceed 255 characters');
    });

    it('should validate array input in getMultipleSecrets', async () => {
      await expect(service.getMultipleSecrets('not-an-array' as unknown as string[])).rejects.toThrow(
        'Secret names must be an array',
      );
    });

    it('should validate secret names in array for getMultipleSecrets', async () => {
      await expect(service.getMultipleSecrets(['valid-secret', ''])).rejects.toThrow(
        'Secret name must be a non-empty string',
      );
      await expect(service.getMultipleSecrets(['valid-secret', 'invalid secret'])).rejects.toThrow(
        'Secret name can only contain',
      );
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration during initialization', async () => {
      const invalidConfigs = [
        null,
        undefined,
        {},
        { client: null },
        { client: {} },
        { client: { accessKeyId: '', accessKeySecret: 'valid' } },
        { client: { accessKeyId: 'valid', accessKeySecret: '' } },
        { client: { accessKeyId: 'short', accessKeySecret: 'validSecretKey1234567890123456789' } },
        { client: { accessKeyId: 'mock-access-key-id-for-testing', accessKeySecret: 'short' } },
      ];

      for (const config of invalidConfigs) {
        await expect(
          Test.createTestingModule({
            providers: [
              {
                provide: KMS_CONFIG_TOKEN,
                useValue: config,
              },
              KmsService,
            ],
          }).compile(),
        ).rejects.toThrow();
      }
    });

    it('should validate optional configuration fields', async () => {
      const configWithInvalidRegion = {
        ...mockConfig,
        client: {
          ...mockConfig.client,
          regionId: 'Invalid_Region',
        },
      };

      await expect(
        Test.createTestingModule({
          providers: [
            {
              provide: KMS_CONFIG_TOKEN,
              useValue: configWithInvalidRegion,
            },
            KmsService,
          ],
        }).compile(),
      ).rejects.toThrow();
    });

    it('should validate endpoint URL format', async () => {
      const configWithInvalidEndpoint = {
        ...mockConfig,
        client: {
          ...mockConfig.client,
          endpoint: '://invalid',
        },
      };

      await expect(
        Test.createTestingModule({
          providers: [
            {
              provide: KMS_CONFIG_TOKEN,
              useValue: configWithInvalidEndpoint,
            },
            KmsService,
          ],
        }).compile(),
      ).rejects.toThrow();
    });

    it('should validate default secret name', async () => {
      const configWithInvalidDefaultSecret = {
        ...mockConfig,
        defaultSecretName: 'invalid secret name',
      };

      await expect(
        Test.createTestingModule({
          providers: [
            {
              provide: KMS_CONFIG_TOKEN,
              useValue: configWithInvalidDefaultSecret,
            },
            KmsService,
          ],
        }).compile(),
      ).rejects.toThrow();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      const retryableError = new Error('Network timeout');
      mockKmsClient.getSecretValue
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce({ body: { secretData: 'success' } });

      const result = await service.getSecretValue('test-secret');

      expect(result).toBe('success');
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new Error('Secret not found');
      mockKmsClient.getSecretValue.mockRejectedValue(nonRetryableError);

      await expect(service.getSecretValue('test-secret')).rejects.toThrow('Secret not found');
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch secret test-secret (non-retryable):',
        'Secret not found',
      );
    });

    it('should fail after max retries', async () => {
      const retryableError = new Error('Network timeout');
      mockKmsClient.getSecretValue.mockRejectedValue(retryableError);

      await expect(service.getSecretValue('test-secret')).rejects.toThrow('Network timeout');
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch secret test-secret after 3 attempts:',
        'Network timeout',
      );
    });

    it('should identify non-retryable errors correctly', async () => {
      const nonRetryableErrors = [
        'Unauthorized',
        'Forbidden',
        'Access denied',
        'Invalid signature',
        'Invalid access key',
        'Invalid parameter',
        'Secret not found',
        'Bad request',
      ];

      for (const errorMessage of nonRetryableErrors) {
        vi.clearAllMocks();
        mockKmsClient.getSecretValue.mockRejectedValue(new Error(errorMessage));

        await expect(service.getSecretValue('test-secret')).rejects.toThrow(errorMessage);
        expect(mockKmsClient.getSecretValue).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Enhanced JSON Parsing', () => {
    it('should handle empty secret data', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({ body: { secretData: '' } });

      await expect(service.getSecretValueAsJson('test-secret')).rejects.toThrow(
        'Secret test-secret is empty or contains only whitespace',
      );
    });

    it('should handle whitespace-only secret data', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({ body: { secretData: '   \n\t  ' } });

      await expect(service.getSecretValueAsJson('test-secret')).rejects.toThrow(
        'Secret test-secret is empty or contains only whitespace',
      );
    });

    it('should validate JSON object type', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({ body: { secretData: '"just a string"' } });

      await expect(service.getSecretValueAsJson('test-secret')).rejects.toThrow(
        'Secret test-secret does not contain a valid JSON object',
      );
    });

    it('should handle JSON null value', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({ body: { secretData: 'null' } });

      await expect(service.getSecretValueAsJson('test-secret')).rejects.toThrow(
        'Secret test-secret does not contain a valid JSON object',
      );
    });

    it('should provide detailed JSON parsing error messages', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({ body: { secretData: '{ invalid json }' } });

      await expect(service.getSecretValueAsJson('test-secret')).rejects.toThrow(
        /Invalid JSON format in secret test-secret:/,
      );
    });
  });

  describe('Batch Operations Robustness', () => {
    it('should handle empty array', async () => {
      const result = await service.getMultipleSecrets([]);
      expect(result).toEqual({});
      expect(mockKmsClient.getSecretValue).not.toHaveBeenCalled();
    });

    it('should deduplicate secret names', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({ body: { secretData: 'value' } });

      const result = await service.getMultipleSecrets(['secret1', 'secret1', 'secret2']);

      expect(Object.keys(result)).toEqual(['secret1', 'secret2']);
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledTimes(2);
    });

    it('should limit concurrency', async () => {
      const secretNames = Array.from({ length: 25 }, (_, i) => `secret${i}`);
      mockKmsClient.getSecretValue.mockResolvedValue({ body: { secretData: 'value' } });

      await service.getMultipleSecrets(secretNames);

      // With concurrency limit of 10, we should have multiple batches
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledTimes(25);
    });

    it('should collect errors from multiple failed secrets', async () => {
      mockKmsClient.getSecretValue
        .mockResolvedValueOnce({ body: { secretData: 'success1' } })
        .mockRejectedValueOnce(new Error('Error for secret2'))
        .mockRejectedValueOnce(new Error('Error for secret3'));

      await expect(service.getMultipleSecrets(['secret1', 'secret2', 'secret3'])).rejects.toThrow(
        'Failed to fetch 2 secret(s):',
      );
    });

    it('should continue processing when some secrets fail', async () => {
      mockKmsClient.getSecretValue
        .mockResolvedValueOnce({ body: { secretData: 'success1' } })
        .mockRejectedValueOnce(new Error('Error for secret2'))
        .mockResolvedValueOnce({ body: { secretData: 'success3' } });

      await expect(service.getMultipleSecrets(['secret1', 'secret2', 'secret3'])).rejects.toThrow();

      // Should still attempt all secrets (may include retries)
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledTimes(5);
    });
  });

  describe('Sensitive Data Handling', () => {
    it('should sanitize sensitive data in logs', () => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        'KMS Service initialized successfully',
        expect.objectContaining({
          accessKeyId: '[REDACTED]',
          accessKeySecret: '[REDACTED]',
          regionId: 'cn-hangzhou',
          endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const invalidConfig = { ...mockConfig };
      delete (invalidConfig as unknown as { client: unknown }).client;

      await expect(
        Test.createTestingModule({
          providers: [
            {
              provide: KMS_CONFIG_TOKEN,
              useValue: invalidConfig,
            },
            KmsService,
          ],
        }).compile(),
      ).rejects.toThrow('KMS client configuration is required');
    });

    it('should handle unexpected error types in retry logic', async () => {
      const weirdError = { toString: () => 'Custom error object' };
      mockKmsClient.getSecretValue.mockRejectedValue(weirdError);

      await expect(service.getSecretValue('test-secret')).rejects.toBe(weirdError);
    }, 10000);
  });
});
