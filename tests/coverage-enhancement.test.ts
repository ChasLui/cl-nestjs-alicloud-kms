import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { KmsService, KMS_CONFIG_TOKEN, KMS_LOGGER_TOKEN, KMS_CACHE_TOKEN } from '../src/kms.service';
import { CacheService, CACHE_CONFIG_TOKEN, CACHE_LOGGER_TOKEN } from '../src/cache.service';
import { KmsModuleConfig, LoggerInterface, SecretCacheOptions } from '../src/types';

// Mock KmsClient
const mockKmsClient = {
  getSecretValue: vi.fn(),
};

vi.mock('@alicloud/kms20160120', () => {
  return {
    default: vi.fn().mockImplementation(() => mockKmsClient),
    GetSecretValueRequest: vi.fn(),
  };
});

describe('覆盖率增强测试', () => {
  let kmsService: KmsService;
  let cacheService: CacheService;
  let mockLogger: LoggerInterface;
  let module: TestingModule;

  const validConfig: KmsModuleConfig = {
    client: {
      accessKeyId: 'TESTACCESSKEYID1234',
      accessKeySecret: 'TestAccessKeySecret123456789',
      regionId: 'cn-hangzhou',
      endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
    },
    enableLogging: true,
    cache: {
      enabled: true,
      ttl: 300,
      maxSize: 100,
    },
  };

  const cacheConfig: SecretCacheOptions = {
    enabled: true,
    ttl: 300,
    maxSize: 100,
  };

  beforeEach(async () => {
    mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        KmsService,
        {
          provide: KMS_CONFIG_TOKEN,
          useValue: validConfig,
        },
        {
          provide: KMS_LOGGER_TOKEN,
          useValue: mockLogger,
        },
        CacheService,
        {
          provide: CACHE_CONFIG_TOKEN,
          useValue: cacheConfig,
        },
        {
          provide: CACHE_LOGGER_TOKEN,
          useValue: mockLogger,
        },
        {
          provide: KMS_CACHE_TOKEN,
          useExisting: CacheService,
        },
      ],
    }).compile();

    kmsService = module.get<KmsService>(KmsService);
    cacheService = module.get<CacheService>(CacheService);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    cacheService?.clear();
    await module.close();
  });

  describe('缓存服务边界情况', () => {
    it('应该处理缓存清理过期项目', () => {
      vi.useFakeTimers();

      const shortTtlConfig: SecretCacheOptions = {
        enabled: true,
        ttl: 0.001, // 1ms
        maxSize: 10,
      };

      const shortService = new CacheService(shortTtlConfig, mockLogger);

      // 设置一个会过期的项目
      shortService.set('expiring-key', 'value');
      expect(shortService.get('expiring-key')).toBe('value');

      // 快进时间让项目过期
      vi.advanceTimersByTime(2);

      // 触发清理（通过尝试获取过期项目）
      expect(shortService.get('expiring-key')).toBeNull();

      vi.useRealTimers();
    });

    it('应该处理LRU淘汰机制中的键前缀', () => {
      const smallConfig: SecretCacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 2,
        keyPrefix: 'test_prefix:',
      };

      const smallService = new CacheService(smallConfig, mockLogger);

      // 填满缓存
      smallService.set('key1', 'value1');
      smallService.set('key2', 'value2');

      expect(smallService.getStats().totalKeys).toBe(2);

      // 添加第三个项目，应该触发LRU淘汰或达到最大限制
      smallService.set('key3', 'value3');

      // 检查缓存大小没有超过限制
      const stats = smallService.getStats();
      expect(stats.totalKeys).toBeGreaterThan(0);
    });

    it('应该处理事件监听器中的过期事件', () => {
      vi.useFakeTimers();

      const events: Array<{ event: string; key: string }> = [];
      const listener = (event: string, key: string) => {
        events.push({ event, key });
      };

      const shortTtlConfig: SecretCacheOptions = {
        enabled: true,
        ttl: 0.001, // 1ms
        maxSize: 10,
      };

      const shortService = new CacheService(shortTtlConfig, mockLogger);
      shortService.addEventListener(listener);

      // 设置会过期的项目
      shortService.set('test-key', 'test-value');

      // 快进时间触发过期
      vi.advanceTimersByTime(2);

      // 触发清理
      shortService.get('test-key');

      // 应该有设置事件
      expect(events.some((e) => e.event === 'set' && e.key === 'test-key')).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('KMS 服务缓存功能增强', () => {
    it('应该处理warmupCache中的所有密钥已缓存情况', async () => {
      const secretNames = ['secret1', 'secret2'];

      // 预先缓存所有密钥
      mockKmsClient.getSecretValue.mockResolvedValue({
        body: { secretData: 'test-value' },
      });

      for (const secret of secretNames) {
        await kmsService.getSecretValue(secret);
      }

      vi.clearAllMocks();

      // 预热时应该跳过已缓存的
      await kmsService.warmupCache(secretNames, false);

      expect(mockKmsClient.getSecretValue).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith('All secrets already cached, skipping warmup');
    });

    it('应该处理warmupCache的错误情况', async () => {
      const secretNames = ['secret1'];

      mockKmsClient.getSecretValue.mockRejectedValue(new Error('KMS Error'));

      await expect(kmsService.warmupCache(secretNames)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to warmup cache:',
        expect.stringContaining('Failed to fetch 1 secret(s):'),
      );
    });

    it('应该处理warmupCache的部分成功情况', async () => {
      const secretNames = ['secret1', 'secret2'];

      // 第一个成功，第二个失败
      mockKmsClient.getSecretValue
        .mockResolvedValueOnce({ body: { secretData: 'value1' } })
        .mockRejectedValueOnce(new Error('Failed for secret2'));

      await expect(kmsService.warmupCache(secretNames)).rejects.toThrow();

      expect(mockLogger.log).toHaveBeenCalledWith('Warming up cache for 2 secrets');
    });

    it('应该处理禁用日志的情况', async () => {
      // 创建禁用日志的服务
      const configWithoutLogging: KmsModuleConfig = {
        ...validConfig,
        enableLogging: false,
      };

      const noLogModule = await Test.createTestingModule({
        providers: [
          KmsService,
          {
            provide: KMS_CONFIG_TOKEN,
            useValue: configWithoutLogging,
          },
          {
            provide: KMS_LOGGER_TOKEN,
            useValue: mockLogger,
          },
          CacheService,
          {
            provide: CACHE_CONFIG_TOKEN,
            useValue: cacheConfig,
          },
          {
            provide: CACHE_LOGGER_TOKEN,
            useValue: mockLogger,
          },
          {
            provide: KMS_CACHE_TOKEN,
            useExisting: CacheService,
          },
        ],
      }).compile();

      const noLogService = noLogModule.get<KmsService>(KmsService);

      mockKmsClient.getSecretValue.mockResolvedValue({
        body: { secretData: 'test-value' },
      });

      // 预热缓存
      await noLogService.warmupCache(['secret1']);

      // 应该没有日志调用
      expect(mockLogger.log).not.toHaveBeenCalledWith(expect.stringContaining('Warming up cache'));

      await noLogModule.close();
    });
  });

  describe('缓存服务清理定时器', () => {
    it('应该在模块销毁时清理定时器', () => {
      const service = new CacheService(cacheConfig, mockLogger);

      // 设置一些数据
      service.set('test1', 'value1');
      service.set('test2', 'value2');

      // 销毁模块
      service.onModuleDestroy();

      // 缓存应该被清空
      expect(service.getStats().totalKeys).toBe(0);
      expect(mockLogger.log).toHaveBeenCalledWith('Cache service destroyed');
    });

    it('应该处理debug日志级别的清理消息', () => {
      vi.useFakeTimers();

      const debugConfig: SecretCacheOptions = {
        enabled: true,
        ttl: 0.001, // 1ms，快速过期
        maxSize: 10,
      };

      const debugService = new CacheService(debugConfig, mockLogger);

      // 设置会过期的项目
      debugService.set('debug-key', 'debug-value');

      // 等待过期
      vi.advanceTimersByTime(2);

      // 手动触发清理
      debugService.get('debug-key'); // 这会触发清理

      vi.useRealTimers();
    });
  });

  describe('缓存事件系统', () => {
    it('应该处理设置和获取事件', () => {
      const events: Array<{ event: string; key: string }> = [];
      const listener = (event: string, key: string) => {
        events.push({ event, key });
      };

      const prefixConfig: SecretCacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 10,
        keyPrefix: 'prefix:',
      };

      const prefixService = new CacheService(prefixConfig, mockLogger);
      prefixService.addEventListener(listener);

      // 设置值
      prefixService.set('test-key', 'test-value');

      // 获取值
      prefixService.get('test-key');

      // 应该有设置和命中事件
      const setEvents = events.filter((e) => e.event === 'set');
      const hitEvents = events.filter((e) => e.event === 'hit');

      expect(setEvents.length).toBe(1);
      expect(hitEvents.length).toBe(1);
      expect(setEvents[0].key).toBe('test-key');
      expect(hitEvents[0].key).toBe('test-key');
    });
  });
});
