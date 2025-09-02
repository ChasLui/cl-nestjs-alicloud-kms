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

// 模拟整个 KMS 客户端模块
vi.mock('@alicloud/kms20160120', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      getSecretValue: vi.fn(),
    })),
    GetSecretValueRequest: vi.fn().mockImplementation((params) => params),
  };
});

describe('KmsService 高级 API 测试', () => {
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
    // 清除所有模拟
    vi.clearAllMocks();

    // 创建模拟日志记录器
    mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    };

    // 创建模拟 KMS 客户端
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

  describe('getSecretValue', () => {
    it('应该成功获取密钥值', async () => {
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
      expect(mockLogger.log).toHaveBeenCalledWith('从 KMS 获取密钥: test-secret');
      expect(mockLogger.log).toHaveBeenCalledWith('成功获取密钥: test-secret');
    });

    it('应该处理响应中缺少 secretData 的情况', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: {},
      });

      const result = await service.getSecretValue('test-secret');

      expect(result).toBe('');
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledWith({
        secretName: 'test-secret',
      });
    });

    it('应该处理没有 body 的响应', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({});

      const result = await service.getSecretValue('test-secret');

      expect(result).toBe('');
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledWith({
        secretName: 'test-secret',
      });
    });

    it('应该处理 KMS API 错误', async () => {
      const mockError = new Error('KMS API Error');
      mockKmsClient.getSecretValue.mockRejectedValue(mockError);

      await expect(service.getSecretValue('test-secret')).rejects.toThrow('KMS API Error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch secret test-secret after 3 attempts:',
        'KMS API Error',
      );
    });

    it('当禁用日志记录时应该在没有日志记录的情况下工作', async () => {
      // 为此测试创建单独的模拟日志记录器
      const separateLogger = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        verbose: vi.fn(),
      };

      // 创建禁用日志记录的服务
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

      // 清除初始化期间进行的任何调用
      separateLogger.log.mockClear();

      const result = await testService.getSecretValue('test-secret');

      expect(result).toBe(mockSecretData);
      // 当禁用日志记录时，日志记录器不应该被调用用于 API 调用
      expect(separateLogger.log).not.toHaveBeenCalled();

      await testModule.close();
    });
  });

  describe('getDefaultSecretValue', () => {
    it('应该成功获取默认密钥值', async () => {
      const mockSecretData = 'default-secret-value';
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: {
          secretData: mockSecretData,
        },
      });

      const result = await service.getDefaultSecretValue();

      expect(result).toBe(mockSecretData);
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledWith({
        secretName: 'test-secret', // 这是来自 mockConfig 的 defaultSecretName
      });
    });
  });

  describe('getSecretValueAsJson', () => {
    it('应该成功解析 JSON 密钥', async () => {
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

    it('应该处理 JSON 解析错误', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: {
          secretData: 'invalid-json-data',
        },
      });

      await expect(service.getSecretValueAsJson('json-secret')).rejects.toThrow(
        'Invalid JSON format in secret json-secret',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        '无法将密钥 json-secret 解析为 JSON:',
        expect.stringContaining('Unexpected token'),
      );
    });
  });

  describe('getDefaultSecretValueAsJson', () => {
    it('应该成功将默认密钥解析为 JSON', async () => {
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
    it('应该成功获取多个密钥', async () => {
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

    it('应该处理批量操作中的错误', async () => {
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

    it('应该处理空的密钥名称数组', async () => {
      const result = await service.getMultipleSecrets([]);

      expect(result).toEqual({});
      expect(mockKmsClient.getSecretValue).not.toHaveBeenCalled();
    });
  });

  describe('checkConnection', () => {
    it('当连接检查成功时应该返回 true', async () => {
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: { secretData: 'test-data' },
      });

      const result = await service.checkConnection();

      expect(result).toBe(true);
      expect(mockKmsClient.getSecretValue).toHaveBeenCalledWith({
        secretName: 'test-secret', // 默认密钥名称
      });
    });

    it('当连接检查失败时应该返回 false', async () => {
      const mockError = new Error('Connection failed');
      mockKmsClient.getSecretValue.mockRejectedValue(mockError);

      const result = await service.checkConnection();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('KMS 连接检查失败:', 'Connection failed');
    });

    it('应该处理没有默认密钥的连接检查', async () => {
      // 创建没有默认密钥的服务
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
      expect(mockLogger.warn).toHaveBeenCalledWith('连接检查未配置默认密钥');
      expect(mockKmsClient.getSecretValue).not.toHaveBeenCalled();

      await testModule.close();
    });
  });

  describe('使用 toMap 方法的客户端配置', () => {
    it('应该正确配置带有端点的客户端', async () => {
      // 此测试确保覆盖 toMap 方法和端点配置
      expect(service).toBeDefined();

      // 验证 KmsClient 是否使用正确的配置被调用
      expect(KmsClient).toHaveBeenCalledWith({
        accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
        accessKeySecret: 'validSecretKey1234567890123456789',
        regionId: 'cn-hangzhou',
        endpoint: 'https://test-endpoint.com',
        toMap: expect.any(Function),
      });

      // 测试 toMap 函数
      const constructorCall = (KmsClient as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const mappedConfig = constructorCall.toMap();
      expect(mappedConfig).toEqual({
        accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
        accessKeySecret: 'validSecretKey1234567890123456789',
        regionId: 'cn-hangzhou',
        endpoint: 'https://test-endpoint.com',
      });
    });

    it('应该使用必需的端点配置客户端', async () => {
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

      // 验证带有必需端点的客户端配置
      const mockCalls = (KmsClient as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const lastConstructorCall = mockCalls[mockCalls.length - 1][0];
      expect(lastConstructorCall.endpoint).toBe('https://kms.cn-hangzhou.aliyuncs.com');

      // 使用端点测试 toMap
      const mappedConfig = lastConstructorCall.toMap();
      expect(mappedConfig.endpoint).toBe('https://kms.cn-hangzhou.aliyuncs.com');
      expect(mappedConfig.accessKeyId).toBe('MOCKACCESSKEYIDFORTESTING');

      await testModule.close();
    });

    it('当在 toMap 中未提供时应该使用默认 regionId', async () => {
      const configWithoutRegion: KmsModuleConfig = {
        client: {
          accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
          accessKeySecret: 'validSecretKey1234567890123456789',
          // 未提供 regionId
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

      // 验证客户端配置使用默认 regionId
      const mockCalls = (KmsClient as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const lastConstructorCall = mockCalls[mockCalls.length - 1][0];
      expect(lastConstructorCall.regionId).toBe('cn-hangzhou');

      // 使用默认 regionId 测试 toMap
      const mappedConfig = lastConstructorCall.toMap();
      expect(mappedConfig.regionId).toBe('cn-hangzhou');
      expect(mappedConfig.accessKeyId).toBe('MOCKACCESSKEYIDFORTESTING');

      await testModule.close();
    });
  });
});
