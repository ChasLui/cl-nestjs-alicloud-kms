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

describe('KmsService Advanced API Tests', () => {
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
      endpoint: 'https://test-endpoint.com',
    },
    defaultSecretName: 'test-secret',
    enableLogging: true,
  };

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    };

    // Create mock KMS client
    mockKmsClient = {
      getSecretValue: vi.fn(),
    };

    // Mock the KmsClient constructor
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

  describe('getSecretValue', () => {
    it('should successfully fetch secret value', async () => {
      const mockSecretData = 'test-secret-value';
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: {
          secretData: mockSecretData,
        },
      });

      const result = await service.getSecretValue('test-secret');

      expect(result).toBe(mockSecretData);
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledWith({
        secretName: 'test-secret',
      });
      expect(mockLogger.log).toHaveBeenCalledWith('Fetching secret from KMS: test-secret');
      expect(mockLogger.log).toHaveBeenCalledWith('Successfully fetched secret: test-secret');
    });

    it('should handle missing secretData in response', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: {},
      });

      const result = await service.getSecretValue('test-secret');

      expect(result).toBe('');
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledWith({
        secretName: 'test-secret',
      });
    });

    it('should handle response without body', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({});

      const result = await service.getSecretValue('test-secret');

      expect(result).toBe('');
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledWith({
        secretName: 'test-secret',
      });
    });

    it('should handle KMS API errors', async () => {
      const mockError = new Error('KMS API Error');
      mockKmsClient.getSecretValue.mockRejectedValue(mockError);

      await expect(service.getSecretValue('test-secret')).rejects.toThrow('KMS API Error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch secret test-secret after 3 attempts:',
        'KMS API Error',
      );
    });

    it('should work without logging when logging is disabled', async () => {
      // Create separate mock logger for this test
      const separateLogger = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        verbose: vi.fn(),
      };

      // Create service with logging disabled
      const configWithoutLogging: KmsModuleConfig = {
        ...mockConfig,
        enableLogging: false,
      };

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: configWithoutLogging,
          },
          {
            provide: KMS_LOGGER_TOKEN,
            useValue: separateLogger,
          },
          KmsService,
        ],
      }).compile();

      const testService = testModule.get<KmsService>(KmsService);
      const mockSecretData = 'test-secret-value';
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: {
          secretData: mockSecretData,
        },
      });

      // Clear any calls made during initialization
      separateLogger.log.mockClear();

      const result = await testService.getSecretValue('test-secret');

      expect(result).toBe(mockSecretData);
      // Logger should not be called when logging is disabled for API calls
      expect(separateLogger.log).not.toHaveBeenCalled();

      await testModule.close();
    });
  });

  describe('getDefaultSecretValue', () => {
    it('should successfully fetch default secret value', async () => {
      const mockSecretData = 'default-secret-value';
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: {
          secretData: mockSecretData,
        },
      });

      const result = await service.getDefaultSecretValue();

      expect(result).toBe(mockSecretData);
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledWith({
        secretName: 'test-secret', // This is the defaultSecretName from mockConfig
      });
    });
  });

  describe('getSecretValueAsJson', () => {
    it('should successfully parse JSON secret', async () => {
      const mockJsonData = { key: 'value', number: 123 };
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: {
          secretData: JSON.stringify(mockJsonData),
        },
      });

      const result = await service.getSecretValueAsJson('json-secret');

      expect(result).toEqual(mockJsonData);
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledWith({
        secretName: 'json-secret',
      });
    });

    it('should handle JSON parsing errors', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: {
          secretData: 'invalid-json-data',
        },
      });

      await expect(service.getSecretValueAsJson('json-secret')).rejects.toThrow(
        'Invalid JSON format in secret json-secret',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to parse secret json-secret as JSON:',
        expect.stringContaining('Unexpected token'),
      );
    });
  });

  describe('getDefaultSecretValueAsJson', () => {
    it('should successfully parse default secret as JSON', async () => {
      const mockJsonData = { default: true, value: 'test' };
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: {
          secretData: JSON.stringify(mockJsonData),
        },
      });

      const result = await service.getDefaultSecretValueAsJson();

      expect(result).toEqual(mockJsonData);
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledWith({
        secretName: 'test-secret',
      });
    });
  });

  describe('getMultipleSecrets', () => {
    it('should successfully fetch multiple secrets', async () => {
      const secretNames = ['secret1', 'secret2', 'secret3'];
      const secretValues = ['value1', 'value2', 'value3'];

      mockKmsClient.getSecretValue
        .mockResolvedValueOnce({ body: { secretData: secretValues[0] } })
        .mockResolvedValueOnce({ body: { secretData: secretValues[1] } })
        .mockResolvedValueOnce({ body: { secretData: secretValues[2] } });

      const result = await service.getMultipleSecrets(secretNames);

      expect(result).toEqual({
        secret1: 'value1',
        secret2: 'value2',
        secret3: 'value3',
      });
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledTimes(3);
    });

    it('should handle errors in batch operations', async () => {
      const secretNames = ['secret1', 'secret2'];
      const mockError = new Error('Failed to fetch secret2');

      mockKmsClient.getSecretValue
        .mockResolvedValueOnce({ body: { secretData: 'value1' } })
        .mockRejectedValue(mockError);

      await expect(service.getMultipleSecrets(secretNames)).rejects.toThrow('Failed to fetch 1 secret(s):');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch secret secret2 after 3 attempts:',
        'Failed to fetch secret2',
      );
    });

    it('should handle empty secret names array', async () => {
      const result = await service.getMultipleSecrets([]);

      expect(result).toEqual({});
      expect(mockKmsClient.getSecretValue).not.toHaveBeenCalled();
    });
  });

  describe('checkConnection', () => {
    it('should return true when connection check succeeds', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: { secretData: 'test-data' },
      });

      const result = await service.checkConnection();

      expect(result).toBe(true);
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledWith({
        secretName: 'test-secret', // Default secret name
      });
    });

    it('should return false when connection check fails', async () => {
      const mockError = new Error('Connection failed');
      mockKmsClient.getSecretValue.mockRejectedValue(mockError);

      const result = await service.checkConnection();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('KMS connection check failed:', 'Connection failed');
    });

    it('should handle connection check without default secret', async () => {
      // Create service without default secret
      const configWithoutDefault: KmsModuleConfig = {
        ...mockConfig,
        defaultSecretName: undefined,
      };

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: configWithoutDefault,
          },
          {
            provide: KMS_LOGGER_TOKEN,
            useValue: mockLogger,
          },
          KmsService,
        ],
      }).compile();

      const testService = testModule.get<KmsService>(KmsService);

      const result = await testService.checkConnection();

      expect(result).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith('No default secret configured for connection check');
      expect(mockKmsClient.getSecretValue).not.toHaveBeenCalled();

      await testModule.close();
    });
  });

  describe('Client configuration with toMap method', () => {
    it('should properly configure client with endpoint', async () => {
      // This test ensures the toMap method and endpoint configuration are covered
      expect(service).toBeDefined();

      // Verify that the KmsClient was called with the correct configuration
      expect(KmsClient).toHaveBeenCalledWith({
        accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
        accessKeySecret: 'validSecretKey1234567890123456789',
        regionId: 'cn-hangzhou',
        endpoint: 'https://test-endpoint.com',
        toMap: expect.any(Function),
      });

      // Test the toMap function
      const constructorCall = (KmsClient as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const mappedConfig = constructorCall.toMap();
      expect(mappedConfig).toEqual({
        accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
        accessKeySecret: 'validSecretKey1234567890123456789',
        regionId: 'cn-hangzhou',
        endpoint: 'https://test-endpoint.com',
      });
    });

    it('should configure client with required endpoint', async () => {
      const configWithEndpoint: KmsModuleConfig = {
        client: {
          accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
          accessKeySecret: 'validSecretKey1234567890123456789',
          regionId: 'cn-hangzhou',
          endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
        },
        defaultSecretName: 'test-secret',
        enableLogging: true,
      };

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: configWithEndpoint,
          },
          KmsService,
        ],
      }).compile();

      const testService = testModule.get<KmsService>(KmsService);
      expect(testService).toBeDefined();

      // Verify client configuration with required endpoint
      const mockCalls = (KmsClient as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const lastConstructorCall = mockCalls[mockCalls.length - 1][0];
      expect(lastConstructorCall.endpoint).toBe('https://kms.cn-hangzhou.aliyuncs.com');

      // Test toMap with endpoint
      const mappedConfig = lastConstructorCall.toMap();
      expect(mappedConfig.endpoint).toBe('https://kms.cn-hangzhou.aliyuncs.com');
      expect(mappedConfig.accessKeyId).toBe('MOCKACCESSKEYIDFORTESTING');

      await testModule.close();
    });

    it('should use default regionId when not provided in toMap', async () => {
      const configWithoutRegion: KmsModuleConfig = {
        client: {
          accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
          accessKeySecret: 'validSecretKey1234567890123456789',
          // No regionId provided
          endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
        },
        defaultSecretName: 'test-secret',
        enableLogging: true,
      };

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: configWithoutRegion,
          },
          KmsService,
        ],
      }).compile();

      const testService = testModule.get<KmsService>(KmsService);
      expect(testService).toBeDefined();

      // Verify client configuration uses default regionId
      const mockCalls = (KmsClient as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const lastConstructorCall = mockCalls[mockCalls.length - 1][0];
      expect(lastConstructorCall.regionId).toBe('cn-hangzhou');

      // Test toMap with default regionId
      const mappedConfig = lastConstructorCall.toMap();
      expect(mappedConfig.regionId).toBe('cn-hangzhou');
      expect(mappedConfig.accessKeyId).toBe('MOCKACCESSKEYIDFORTESTING');

      await testModule.close();
    });
  });
});
