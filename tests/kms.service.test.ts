import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  KmsModule,
  KmsService,
  KMS_CONFIG_TOKEN,
  KMS_LOGGER_TOKEN,
  KMS_CACHE_TOKEN,
  type KmsModuleConfig,
  type LoggerInterface,
} from '../src/index';

// Mock KmsClient to prevent real KMS connections
const mockKmsClient = {
  getSecretValue: vi.fn(),
};

vi.mock('@alicloud/kms20160120', () => {
  return {
    default: vi.fn().mockImplementation(() => mockKmsClient),
    GetSecretValueRequest: vi.fn(),
  };
});

describe('KMS服务', () => {
  let service: KmsService;
  let module: TestingModule;

  const mockConfig: KmsModuleConfig = {
    client: {
      accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
      accessKeySecret: 'validSecretKey1234567890123456789',
      regionId: 'cn-hangzhou',
      endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
    },
    defaultSecretName: 'test-secret',
    enableLogging: false,
  };

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    module = await Test.createTestingModule({
      imports: [KmsModule.forRoot(mockConfig)],
    }).compile();

    service = module.get<KmsService>(KmsService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Basic functionality', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have kms client initialized', () => {
      const kmsClient = service.getKmsClient();
      expect(kmsClient).toBeDefined();
    });

    it('should return the KMS client instance', () => {
      const client = service.getKmsClient();
      expect(client).toBeDefined();
    });
  });

  describe('Default secret configuration', () => {
    it('should throw error when getting default secret without configuration', async () => {
      const serviceWithoutDefault = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: {
              client: mockConfig.client,
              enableLogging: false,
            },
          },
          KmsService,
        ],
      })
        .compile()
        .then((m) => m.get<KmsService>(KmsService));

      await expect(serviceWithoutDefault.getDefaultSecretValue()).rejects.toThrow(
        'Default secret name is not configured',
      );
    });

    it('should throw error when getting default secret as JSON without configuration', async () => {
      const configWithoutDefault: KmsModuleConfig = {
        client: {
          accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
          accessKeySecret: 'validSecretKey1234567890123456789',
          regionId: 'cn-hangzhou',
          endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
        },
        enableLogging: false,
      };

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: configWithoutDefault,
          },
          KmsService,
        ],
      }).compile();

      const testService = testModule.get<KmsService>(KmsService);

      await expect(testService.getDefaultSecretValue()).rejects.toThrow('Default secret name is not configured');
      await expect(testService.getDefaultSecretValueAsJson()).rejects.toThrow('Default secret name is not configured');

      await testModule.close();
    });
  });

  describe('JSON parsing', () => {
    it('should handle JSON parsing errors', async () => {
      // Mock the getSecretValue method to return invalid JSON
      vi.spyOn(service, 'getSecretValue').mockResolvedValue('invalid-json');

      await expect(service.getSecretValueAsJson('test-secret')).rejects.toThrow(
        'Invalid JSON format in secret test-secret',
      );
    });
  });

  describe('Service initialization configurations', () => {
    it('should initialize with minimal configuration', async () => {
      const mockConfigMinimal: KmsModuleConfig = {
        client: {
          accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
          accessKeySecret: 'validSecretKey1234567890123456789',
          endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
        },
        enableLogging: false,
      };

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: mockConfigMinimal,
          },
          KmsService,
        ],
      }).compile();

      const testService = testModule.get<KmsService>(KmsService);
      expect(testService).toBeDefined();

      // Test that client was initialized (covers getKmsClient method)
      const client = testService.getKmsClient();
      expect(client).toBeDefined();

      await testModule.close();
    });

    it('should initialize with custom regionId', async () => {
      const mockConfigWithRegion: KmsModuleConfig = {
        client: {
          accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
          accessKeySecret: 'validSecretKey1234567890123456789',
          regionId: 'cn-shanghai',
          endpoint: 'https://kms.cn-shanghai.aliyuncs.com',
        },
        enableLogging: false,
      };

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: mockConfigWithRegion,
          },
          KmsService,
        ],
      }).compile();

      const testService = testModule.get<KmsService>(KmsService);
      expect(testService).toBeDefined();

      await testModule.close();
    });

    it('should initialize with endpoint configuration', async () => {
      const mockConfigWithEndpoint: KmsModuleConfig = {
        client: {
          accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
          accessKeySecret: 'validSecretKey1234567890123456789',
          regionId: 'cn-hangzhou',
          endpoint: 'https://test-endpoint.com',
        },
        enableLogging: false,
      };

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: mockConfigWithEndpoint,
          },
          KmsService,
        ],
      }).compile();

      const testService = testModule.get<KmsService>(KmsService);
      expect(testService).toBeDefined();

      await testModule.close();
    });

    it('should initialize with logging enabled', async () => {
      const mockConfigWithLogging: KmsModuleConfig = {
        client: {
          accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
          accessKeySecret: 'validSecretKey1234567890123456789',
          regionId: 'cn-hangzhou',
          endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
        },
        enableLogging: true,
      };

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: mockConfigWithLogging,
          },
          KmsService,
        ],
      }).compile();

      const testService = testModule.get<KmsService>(KmsService);
      expect(testService).toBeDefined();

      await testModule.close();
    });

    it('should handle default regionId when not provided', async () => {
      const configNoRegion: KmsModuleConfig = {
        client: {
          accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
          accessKeySecret: 'validSecretKey1234567890123456789',
          // regionId not provided - should default to 'cn-hangzhou'
          endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
        },
        enableLogging: false,
      };

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: configNoRegion,
          },
          KmsService,
        ],
      }).compile();

      const testService = testModule.get<KmsService>(KmsService);
      expect(testService).toBeDefined();

      await testModule.close();
    });
  });

  describe('Logger integration', () => {
    let customLogger: LoggerInterface;

    beforeEach(() => {
      customLogger = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        verbose: vi.fn(),
      };
    });

    it('should use injected logger', async () => {
      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: { ...mockConfig, enableLogging: true },
          },
          {
            provide: KMS_LOGGER_TOKEN,
            useValue: customLogger,
          },
          KmsService,
        ],
      }).compile();

      const service = testModule.get<KmsService>(KmsService);
      expect(service).toBeDefined();

      await testModule.close();
    });

    it('should use config logger when no injected logger', async () => {
      const configWithLogger: KmsModuleConfig = {
        ...mockConfig,
        logger: customLogger,
        enableLogging: true,
      };

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: configWithLogger,
          },
          KmsService,
        ],
      }).compile();

      const service = testModule.get<KmsService>(KmsService);
      expect(service).toBeDefined();

      await testModule.close();
    });

    it('should use default NestJS Logger when no custom logger provided', async () => {
      const configWithoutLogger: KmsModuleConfig = {
        ...mockConfig,
        enableLogging: true,
        logger: undefined,
      };

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: configWithoutLogger,
          },
          KmsService,
        ],
      }).compile();

      const service = testModule.get<KmsService>(KmsService);
      expect(service).toBeDefined();

      await testModule.close();
    });
  });

  describe('缓存功能测试', () => {
    it('应该获取缓存服务实例（未启用缓存）', () => {
      const cacheService = service.getCacheService();
      expect(cacheService).toBeUndefined();
    });

    it('应该返回null的缓存统计（未启用缓存）', () => {
      const stats = service.getCacheStats();
      expect(stats).toBeNull();
    });

    it('应该在未启用缓存时返回false', () => {
      const cleared = service.clearSecretCache('test-key');
      expect(cleared).toBe(false);
    });

    it('应该处理清空所有缓存（未启用缓存）', () => {
      expect(() => service.clearAllCache()).not.toThrow();
    });

    it('应该处理预热缓存（未启用缓存）', async () => {
      await service.warmupCache(['secret1', 'secret2']);
      // Should complete without errors
    });

    it('应该处理刷新缓存（未启用缓存）', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: { secretData: 'test-value' },
      });

      const result = await service.refreshSecretCache('test-secret');
      expect(result).toBe('test-value');
    });
  });

  describe('密钥验证覆盖率测试', () => {
    it('应该正确测试validateSecretValue私有方法的各种验证规则', () => {
      const testValidation = {
        minLength: 5,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9]+$/,
        validator: (value: string) => value !== 'invalid',
      };

      type KmsServiceWithPrivate = KmsService & {
        validateSecretValue: (
          value: string,
          validation: {
            minLength?: number;
            maxLength?: number;
            pattern?: RegExp;
            validator?: (value: string) => boolean;
          },
        ) => void;
      };

      // 测试最小长度验证
      expect(() => {
        (service as KmsServiceWithPrivate).validateSecretValue('abc', testValidation);
      }).toThrow('Secret value length must be at least 5');

      // 测试最大长度验证
      expect(() => {
        (service as KmsServiceWithPrivate).validateSecretValue('a'.repeat(25), testValidation);
      }).toThrow('Secret value length must not exceed 20');

      // 测试模式验证
      expect(() => {
        (service as KmsServiceWithPrivate).validateSecretValue('invalid-chars!', testValidation);
      }).toThrow('Secret value does not match required pattern');

      // 测试自定义验证器
      expect(() => {
        (service as KmsServiceWithPrivate).validateSecretValue('invalid', testValidation);
      }).toThrow('Secret value failed custom validation');

      // 测试通过验证的情况
      expect(() => {
        (service as KmsServiceWithPrivate).validateSecretValue('validValue123', testValidation);
      }).not.toThrow();
    });
  });

  describe('缓存管理覆盖率测试', () => {
    let mockLogger: LoggerInterface;

    beforeEach(async () => {
      mockLogger = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        verbose: vi.fn(),
      };

      const mockCacheService = {
        isEnabled: vi.fn().mockReturnValue(true),
        clear: vi.fn(),
        has: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KmsService,
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: { ...mockConfig, enableLogging: true },
          },
          {
            provide: KMS_LOGGER_TOKEN,
            useValue: mockLogger,
          },
          {
            provide: KMS_CACHE_TOKEN,
            useValue: mockCacheService,
          },
        ],
      }).compile();

      service = module.get<KmsService>(KmsService);
    });

    it('应该在启用日志时记录清空所有缓存', () => {
      service.clearAllCache();
      expect(mockLogger.log).toHaveBeenCalledWith('All secret cache cleared');
    });

    it('应该处理warmupCache的早期返回条件', async () => {
      // 测试空数组的情况
      await service.warmupCache([]);
      // 应该直接返回，不执行任何操作
    });

    it('应该处理warmupCache的已缓存情况', async () => {
      const mockCacheService = service.getCacheService() as unknown as { has: ReturnType<typeof vi.fn> };
      mockCacheService.has.mockReturnValue(true); // 所有密钥都已缓存

      await service.warmupCache(['secret1', 'secret2']);

      expect(mockLogger.log).toHaveBeenCalledWith('All secrets already cached, skipping warmup');
    });

    it('应该在warmupCache完成时记录日志', async () => {
      const mockCacheService = service.getCacheService() as unknown as { has: ReturnType<typeof vi.fn> };
      mockCacheService.has.mockReturnValue(false); // 没有缓存

      mockKmsClient.getSecretValue
        .mockResolvedValueOnce({ body: { secretData: 'value1' } })
        .mockResolvedValueOnce({ body: { secretData: 'value2' } });

      await service.warmupCache(['secret1', 'secret2']);

      expect(mockLogger.log).toHaveBeenCalledWith('Cache warmup completed: 2/2 secrets cached');
    });
  });
});
