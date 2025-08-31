import { vi } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  KmsModule,
  KmsService,
  type KmsModuleConfig,
  type KmsModuleAsyncOptions,
  type KmsModuleOptions,
  type LoggerInterface,
} from '../src/index';

// 模拟KmsClient以防止真实的KMS连接
const mockKmsClient = {
  getSecretValue: vi.fn(),
};

vi.mock('@alicloud/kms20160120', () => {
  return {
    default: vi.fn().mockImplementation(() => mockKmsClient),
    GetSecretValueRequest: vi.fn(),
  };
});

describe('KMS模块', () => {
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

  describe('forRoot 方法', () => {
    it('应该使用 forRoot 创建模块', async () => {
      const testModule = await Test.createTestingModule({
        imports: [KmsModule.forRoot(mockConfig)],
      }).compile();

      const kmsService = testModule.get<KmsService>(KmsService);
      expect(kmsService).toBeDefined();

      await testModule.close();
    });

    it('should create global module when global is true', async () => {
      const testModule = await Test.createTestingModule({
        imports: [KmsModule.forRoot(mockConfig, true)],
      }).compile();

      const dynamicModule = KmsModule.forRoot(mockConfig, true);
      expect(dynamicModule.global).toBe(true);

      await testModule.close();
    });

    it('should create non-global module by default', async () => {
      const dynamicModule = KmsModule.forRoot(mockConfig);
      expect(dynamicModule.global).toBe(false);
    });

    it('should handle configuration with custom logger', async () => {
      const customLogger: LoggerInterface = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        verbose: vi.fn(),
      };

      const configWithLogger: KmsModuleConfig = {
        ...mockConfig,
        logger: customLogger,
      };

      const testModule = await Test.createTestingModule({
        imports: [KmsModule.forRoot(configWithLogger)],
      }).compile();

      const service = testModule.get<KmsService>(KmsService);
      expect(service).toBeDefined();

      await testModule.close();
    });
  });

  describe('forRootWithLogger', () => {
    it('should create module with custom logger provider', async () => {
      const customLogger: LoggerInterface = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      };

      const options: KmsModuleOptions = {
        config: mockConfig,
        loggerProvider: {
          provide: 'CUSTOM_LOGGER',
          useValue: customLogger,
        },
        global: true,
      };

      const testModule = await Test.createTestingModule({
        imports: [KmsModule.forRootWithLogger(options)],
      }).compile();

      const service = testModule.get<KmsService>(KmsService);
      expect(service).toBeDefined();

      await testModule.close();
    });

    it('should create module without logger provider', async () => {
      const options: KmsModuleOptions = {
        config: mockConfig,
        global: false,
      };

      const testModule = await Test.createTestingModule({
        imports: [KmsModule.forRootWithLogger(options)],
      }).compile();

      const service = testModule.get<KmsService>(KmsService);
      expect(service).toBeDefined();

      await testModule.close();
    });
  });

  describe('forRootAsync', () => {
    it('should create module with forRootAsync', async () => {
      const testModule = await Test.createTestingModule({
        imports: [
          KmsModule.forRootAsync({
            useFactory: () => mockConfig,
          }),
        ],
      }).compile();

      const kmsService = testModule.get<KmsService>(KmsService);
      expect(kmsService).toBeDefined();

      await testModule.close();
    });

    it('should throw error for invalid async configuration', () => {
      expect(() => {
        KmsModule.forRootAsync({});
      }).toThrow('Invalid KMS module configuration');
    });

    it('should create module with async configuration and logger provider', async () => {
      const customLogger: LoggerInterface = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      };

      const options: KmsModuleAsyncOptions = {
        useFactory: () => Promise.resolve(mockConfig),
        inject: [],
        global: true,
        loggerProvider: {
          provide: 'ASYNC_LOGGER',
          useValue: customLogger,
        },
      };

      const testModule = await Test.createTestingModule({
        imports: [KmsModule.forRootAsync(options)],
      }).compile();

      const service = testModule.get<KmsService>(KmsService);
      expect(service).toBeDefined();

      await testModule.close();
    });

    it('should handle synchronous factory function', async () => {
      const options: KmsModuleAsyncOptions = {
        useFactory: () => mockConfig, // Synchronous factory
        inject: [],
      };

      const testModule = await Test.createTestingModule({
        imports: [KmsModule.forRootAsync(options)],
      }).compile();

      const service = testModule.get<KmsService>(KmsService);
      expect(service).toBeDefined();

      await testModule.close();
    });

    it('should handle factory with dependencies injection', async () => {
      const mockDependency = { value: 'test-dependency' };

      // Create a test module that provides the dependency first
      const TestModule = {
        module: class TestModule {},
        providers: [
          {
            provide: 'TEST_DEPENDENCY',
            useValue: mockDependency,
          },
        ],
        exports: ['TEST_DEPENDENCY'],
      };

      const options: KmsModuleAsyncOptions = {
        useFactory: (dep: typeof mockDependency) => {
          expect(dep).toBe(mockDependency);
          return mockConfig;
        },
        inject: ['TEST_DEPENDENCY'],
      };

      const testModule = await Test.createTestingModule({
        imports: [
          {
            module: TestModule.module,
            providers: TestModule.providers,
            exports: TestModule.exports,
            global: true,
          },
          KmsModule.forRootAsync(options),
        ],
      }).compile();

      const service = testModule.get<KmsService>(KmsService);
      expect(service).toBeDefined();

      await testModule.close();
    });

    it('should handle async factory with Promise', async () => {
      const options: KmsModuleAsyncOptions = {
        useFactory: async () => {
          // Simulate async operation
          await new Promise((resolve) => setTimeout(resolve, 1));
          return mockConfig;
        },
        inject: [],
      };

      const testModule = await Test.createTestingModule({
        imports: [KmsModule.forRootAsync(options)],
      }).compile();

      const service = testModule.get<KmsService>(KmsService);
      expect(service).toBeDefined();

      await testModule.close();
    });

    it('should throw error for configuration without useFactory', () => {
      const options: KmsModuleAsyncOptions = {
        // Missing useFactory
        inject: [],
      };

      expect(() => {
        KmsModule.forRootAsync(options);
      }).toThrow('Invalid KMS module configuration');
    });

    it('should create module without logger provider in async mode', async () => {
      const options: KmsModuleAsyncOptions = {
        useFactory: () => mockConfig,
        inject: [],
        global: false,
        // No loggerProvider
      };

      const testModule = await Test.createTestingModule({
        imports: [KmsModule.forRootAsync(options)],
      }).compile();

      const service = testModule.get<KmsService>(KmsService);
      expect(service).toBeDefined();

      await testModule.close();
    });
  });

  describe('Configuration Validation', () => {
    it('should throw error for invalid config in forRoot', () => {
      const invalidConfig = {
        client: {
          accessKeyId: 'short',
          accessKeySecret: 'validSecretKey1234567890123456789',
          endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
        },
      };

      expect(() => {
        KmsModule.forRoot(invalidConfig as unknown as KmsModuleConfig);
      }).toThrow('Invalid KMS configuration');
    });

    it('should throw error for missing client config in forRoot', () => {
      expect(() => {
        KmsModule.forRoot({} as unknown as KmsModuleConfig);
      }).toThrow('KMS client configuration is required');
    });

    it('should throw error for null config in forRoot', () => {
      expect(() => {
        KmsModule.forRoot(null as unknown as KmsModuleConfig);
      }).toThrow('KMS configuration is required');
    });

    it('should throw error for missing accessKeyId in forRoot', () => {
      const configWithoutKeyId = {
        client: {
          accessKeySecret: 'validSecretKey1234567890123456789',
          endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
        },
      };

      expect(() => {
        KmsModule.forRoot(configWithoutKeyId as unknown as KmsModuleConfig);
      }).toThrow('KMS client accessKeyId is required');
    });

    it('should throw error for missing accessKeySecret in forRoot', () => {
      const configWithoutKeySecret = {
        client: {
          accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
          endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
        },
      };

      expect(() => {
        KmsModule.forRoot(configWithoutKeySecret as unknown as KmsModuleConfig);
      }).toThrow('KMS client accessKeySecret is required');
    });

    it('should throw error for missing endpoint in forRoot', () => {
      const configWithoutEndpoint = {
        client: {
          accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
          accessKeySecret: 'validSecretKey1234567890123456789',
        },
      };

      expect(() => {
        KmsModule.forRoot(configWithoutEndpoint as unknown as KmsModuleConfig);
      }).toThrow('KMS client endpoint is required');
    });

    it('should throw error for null options in forRootWithLogger', () => {
      expect(() => {
        KmsModule.forRootWithLogger(null as unknown as KmsModuleOptions);
      }).toThrow('KMS module options are required');
    });

    it('should throw error for invalid config in forRootWithLogger', () => {
      const invalidOptions = {
        config: {
          client: {
            accessKeyId: 'short',
            accessKeySecret: 'validSecretKey1234567890123456789',
            endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
          },
        },
      };

      expect(() => {
        KmsModule.forRootWithLogger(invalidOptions as unknown as KmsModuleOptions);
      }).toThrow('Invalid KMS configuration');
    });

    it('should throw error for null options in forRootAsync', () => {
      expect(() => {
        KmsModule.forRootAsync(null as unknown as KmsModuleAsyncOptions);
      }).toThrow('KMS module async options are required');
    });

    it('should validate async factory result', async () => {
      const invalidAsyncConfig = {
        useFactory: () => ({
          client: {
            accessKeyId: 'short',
            accessKeySecret: 'validSecretKey1234567890123456789',
            endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
          },
        }),
      };

      const testModulePromise = Test.createTestingModule({
        imports: [KmsModule.forRootAsync(invalidAsyncConfig as unknown as KmsModuleAsyncOptions)],
      }).compile();

      await expect(testModulePromise).rejects.toThrow('Invalid KMS configuration');
    });

    it('should validate async factory Promise result', async () => {
      const invalidAsyncConfig = {
        useFactory: async () => ({
          client: {
            accessKeyId: 'short',
            accessKeySecret: 'validSecretKey1234567890123456789',
            endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
          },
        }),
      };

      const testModulePromise = Test.createTestingModule({
        imports: [KmsModule.forRootAsync(invalidAsyncConfig as unknown as KmsModuleAsyncOptions)],
      }).compile();

      await expect(testModulePromise).rejects.toThrow('Invalid KMS configuration');
    });

    it('should provide better error message for useFactory requirement', () => {
      expect(() => {
        KmsModule.forRootAsync({} as unknown as KmsModuleAsyncOptions);
      }).toThrow('Invalid KMS module configuration: useFactory is required for async configuration');
    });
  });

  describe('Cache Configuration Tests', () => {
    it('should create module with cache enabled', async () => {
      const configWithCache: KmsModuleConfig = {
        ...mockConfig,
        cache: {
          enabled: true,
          ttl: 300,
          maxSize: 100,
        },
      };

      const module = await Test.createTestingModule({
        imports: [KmsModule.forRoot(configWithCache)],
      }).compile();

      const kmsService = module.get<KmsService>(KmsService);
      expect(kmsService).toBeDefined();

      await module.close();
    });

    it('should create module with cache disabled', async () => {
      const configWithoutCache: KmsModuleConfig = {
        ...mockConfig,
        cache: {
          enabled: false,
        },
      };

      const module = await Test.createTestingModule({
        imports: [KmsModule.forRoot(configWithoutCache)],
      }).compile();

      const kmsService = module.get<KmsService>(KmsService);
      expect(kmsService).toBeDefined();

      await module.close();
    });

    it('should handle forRootWithLogger with cache enabled', async () => {
      const mockLogger = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      };

      const options: KmsModuleOptions = {
        config: {
          ...mockConfig,
          cache: {
            enabled: true,
            ttl: 600,
          },
        },
        loggerProvider: {
          provide: 'CUSTOM_LOGGER',
          useValue: mockLogger,
        },
        global: true,
      };

      const module = await Test.createTestingModule({
        imports: [KmsModule.forRootWithLogger(options)],
      }).compile();

      const kmsService = module.get<KmsService>(KmsService);
      expect(kmsService).toBeDefined();

      await module.close();
    });

    it('should handle forRootAsync with cache configuration', async () => {
      const asyncOptions: KmsModuleAsyncOptions = {
        useFactory: () => ({
          ...mockConfig,
          cache: {
            enabled: true,
            ttl: 300,
            maxSize: 50,
          },
        }),
        global: false,
      };

      const module = await Test.createTestingModule({
        imports: [KmsModule.forRootAsync(asyncOptions)],
      }).compile();

      const kmsService = module.get<KmsService>(KmsService);
      expect(kmsService).toBeDefined();

      await module.close();
    });

    it('should handle forRootAsync with logger and cache', async () => {
      const mockLogger = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      };

      const asyncOptions: KmsModuleAsyncOptions = {
        useFactory: () => ({
          ...mockConfig,
          cache: {
            enabled: true,
            ttl: 300,
          },
        }),
        loggerProvider: {
          provide: 'ASYNC_LOGGER',
          useValue: mockLogger,
        },
        inject: [],
      };

      const module = await Test.createTestingModule({
        imports: [KmsModule.forRootAsync(asyncOptions)],
      }).compile();

      const kmsService = module.get<KmsService>(KmsService);
      expect(kmsService).toBeDefined();

      await module.close();
    });
  });
});
