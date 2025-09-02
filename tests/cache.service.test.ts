import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { CacheService, CACHE_CONFIG_TOKEN, CACHE_LOGGER_TOKEN, CacheEventType } from '../src/cache.service';
import { SecretCacheOptions, LoggerInterface } from '../src/types';

describe('CacheService', () => {
  let service: CacheService;
  let mockLogger: LoggerInterface;

  const defaultConfig: SecretCacheOptions = {
    enabled: true,
    ttl: 300,
    maxSize: 100,
    keyPrefix: 'test_cache:',
  };

  beforeEach(async () => {
    mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    } as LoggerInterface;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_CONFIG_TOKEN,
          useValue: defaultConfig,
        },
        {
          provide: CACHE_LOGGER_TOKEN,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    service?.clear();
    vi.clearAllMocks();
  });

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      expect(service).toBeDefined();
      expect(service.isEnabled()).toBe(true);
      expect(service.getConfig()).toEqual(defaultConfig);
    });

    it('应该正确设置和获取缓存值', () => {
      const key = 'test-key';
      const value = 'test-value';

      service.set(key, value);
      const retrieved = service.get(key);

      expect(retrieved).toBe(value);
      expect(service.has(key)).toBe(true);
    });

    it('应该正确删除缓存项', () => {
      const key = 'test-key';
      const value = 'test-value';

      service.set(key, value);
      expect(service.has(key)).toBe(true);

      const deleted = service.delete(key);
      expect(deleted).toBe(true);
      expect(service.has(key)).toBe(false);
      expect(service.get(key)).toBeNull();
    });

    it('应该正确清空所有缓存', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');

      expect(service.getStats().totalKeys).toBe(2);

      service.clear();

      expect(service.getStats().totalKeys).toBe(0);
      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBeNull();
    });
  });

  describe('TTL 过期功能', () => {
    it('应该在TTL过期后返回null', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 0.1; // 100ms

      service.set(key, value, ttl);
      expect(service.get(key)).toBe(value);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(service.get(key)).toBeNull();
      expect(service.has(key)).toBe(false);
    });

    it('应该支持自定义TTL', () => {
      const key = 'test-key';
      const value = 'test-value';
      const customTtl = 600; // 10分钟

      service.set(key, value, customTtl);

      // 由于我们无法直接访问内部的过期时间，我们通过检查值是否仍然存在来验证
      expect(service.get(key)).toBe(value);
    });
  });

  describe('统计功能', () => {
    it('应该正确跟踪命中和未命中', () => {
      const key = 'test-key';
      const value = 'test-value';

      // 未命中
      service.get(key);
      let stats = service.getStats();
      expect(stats.missCount).toBe(1);
      expect(stats.hitCount).toBe(0);

      // 设置并命中
      service.set(key, value);
      service.get(key);
      stats = service.getStats();
      expect(stats.hitCount).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('应该正确计算命中率', () => {
      service.set('key1', 'value1');

      // 2次命中
      service.get('key1');
      service.get('key1');

      // 1次未命中
      service.get('nonexistent');

      const stats = service.getStats();
      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3, 4);
    });

    it('应该提供内存使用统计', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');

      const stats = service.getStats();
      expect(stats.totalKeys).toBe(2);
      expect(stats.totalMemoryUsage).toBeGreaterThan(0);
    });
  });

  describe('批量操作', () => {
    it('应该支持批量获取', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key3', 'value3');

      const result = service.mget(['key1', 'key2', 'nonexistent']);

      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
      expect(result.nonexistent).toBeUndefined();
    });

    it('应该支持批量设置', () => {
      const data = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      };

      service.mset(data);

      expect(service.get('key1')).toBe('value1');
      expect(service.get('key2')).toBe('value2');
      expect(service.get('key3')).toBe('value3');
    });

    it('应该支持批量删除', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key3', 'value3');

      const deletedCount = service.mdel(['key1', 'key3', 'nonexistent']);

      expect(deletedCount).toBe(2);
      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBe('value2');
      expect(service.get('key3')).toBeNull();
    });
  });

  describe('LRU 淘汰策略', () => {
    it('应该在达到最大大小时淘汰最少使用的项', () => {
      const smallConfig: SecretCacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 2,
        keyPrefix: 'test_cache:',
      };

      const smallCacheService = new CacheService(smallConfig, mockLogger);

      // 添加2个项（达到最大大小）
      smallCacheService.set('key1', 'value1');
      smallCacheService.set('key2', 'value2');

      // 等待一小段时间确保时间戳不同
      const now = Date.now();
      // 模拟时间差
      vi.useFakeTimers();
      vi.setSystemTime(now + 1000);

      // 访问key1，使其成为最近使用的
      smallCacheService.get('key1');

      vi.setSystemTime(now + 2000);

      // 添加第3个项，应该淘汰key2（最少最近使用）
      smallCacheService.set('key3', 'value3');

      expect(smallCacheService.get('key1')).toBe('value1');
      expect(smallCacheService.get('key2')).toBeNull();
      expect(smallCacheService.get('key3')).toBe('value3');

      vi.useRealTimers();
    });
  });

  describe('事件系统', () => {
    it('应该触发缓存事件', () => {
      const events: Array<{ event: CacheEventType; key: string; value?: unknown }> = [];

      const listener = (event: CacheEventType, key: string, value?: unknown) => {
        events.push({ event, key, value });
      };

      service.addEventListener(listener);

      service.set('key1', 'value1');
      service.get('key1');
      service.get('nonexistent');
      service.delete('key1');
      service.clear();

      expect(events).toHaveLength(5);
      expect(events[0]).toEqual({ event: 'set', key: 'key1', value: 'value1' });
      expect(events[1]).toEqual({ event: 'hit', key: 'key1', value: 'value1' });
      expect(events[2]).toEqual({ event: 'miss', key: 'nonexistent' });
      expect(events[3]).toEqual({ event: 'delete', key: 'key1' });
      expect(events[4]).toEqual({ event: 'clear', key: 'all' });

      service.removeEventListener(listener);
    });

    it('应该处理监听器中的错误', () => {
      const errorListener = () => {
        throw new Error('Listener error');
      };

      service.addEventListener(errorListener);

      // 这不应该抛出错误
      expect(() => service.set('key1', 'value1')).not.toThrow();

      // 应该记录警告
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Error in cache event listener'));
    });
  });

  describe('键前缀', () => {
    it('应该使用配置的键前缀', () => {
      const keys = service.getKeys();
      service.set('test', 'value');

      const newKeys = service.getKeys();
      expect(newKeys).toContain('test');
      expect(newKeys.length).toBe(keys.length + 1);
    });
  });

  describe('禁用缓存', () => {
    let disabledService: CacheService;

    beforeEach(() => {
      const disabledConfig: SecretCacheOptions = {
        enabled: false,
        ttl: 300,
        maxSize: 100,
        keyPrefix: 'test_cache:',
      };

      disabledService = new CacheService(disabledConfig, mockLogger);
    });

    it('禁用时应该不执行缓存操作', () => {
      expect(disabledService.isEnabled()).toBe(false);

      disabledService.set('key', 'value');
      expect(disabledService.get('key')).toBeNull();

      expect(disabledService.has('key')).toBe(false);
      expect(disabledService.delete('key')).toBe(false);

      expect(disabledService.getKeys()).toEqual([]);
    });
  });

  describe('类型安全', () => {
    it('应该支持泛型类型', () => {
      interface TestData {
        id: number;
        name: string;
      }

      const testData: TestData = { id: 1, name: 'test' };

      service.set('typed-key', testData);
      const retrieved = service.get<TestData>('typed-key');

      expect(retrieved).toEqual(testData);
    });
  });

  describe('边界情况', () => {
    it('应该处理空字符串键', () => {
      expect(() => service.set('', 'value')).not.toThrow();
      expect(service.get('')).toBe('value');
    });

    it('应该处理null和undefined值', () => {
      service.set('null-key', null);
      service.set('undefined-key', undefined);

      expect(service.get('null-key')).toBe(null);
      expect(service.get('undefined-key')).toBe(undefined);
    });

    it('应该处理复杂对象', () => {
      const complexObject = {
        nested: {
          array: [1, 2, 3],
          string: 'test',
          boolean: true,
        },
        timestamp: new Date(),
      };

      service.set('complex-key', complexObject);
      const retrieved = service.get('complex-key');

      expect(retrieved).toEqual(complexObject);
    });
  });

  describe('并发操作', () => {
    it('应该处理并发的设置和获取操作', async () => {
      const promises = [];

      // 并发设置
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve(service.set(`key${i}`, `value${i}`)));
      }

      await Promise.all(promises);

      // 验证所有值都被正确设置
      for (let i = 0; i < 10; i++) {
        expect(service.get(`key${i}`)).toBe(`value${i}`);
      }
    });
  });

  describe('内存清理', () => {
    it('应该在模块销毁时清理资源', () => {
      service.set('key1', 'value1');
      expect(service.getStats().totalKeys).toBe(1);

      service.onModuleDestroy();

      expect(service.getStats().totalKeys).toBe(0);
    });
  });

  describe('额外覆盖率测试', () => {
    it('应该处理各种数据类型的内存计算', () => {
      service.set('string', 'test');
      service.set('number', 123);
      service.set('boolean', true);
      service.set('null', null);
      service.set('array', [1, 2, 3]);
      service.set('object', { key: 'value' });

      const stats = service.getStats();
      expect(stats.totalMemoryUsage).toBeGreaterThan(0);
    });

    it('应该正确处理事件监听器的添加和移除', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      service.addEventListener(listener1);
      service.addEventListener(listener2);

      service.set('test', 'value');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      service.removeEventListener(listener1);
      vi.clearAllMocks();

      service.set('test2', 'value2');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('应该处理缓存未启用的服务初始化', () => {
      const disabledConfig: SecretCacheOptions = {
        enabled: false,
      };

      const disabledService = new CacheService(disabledConfig, mockLogger);

      expect(disabledService.isEnabled()).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith('Cache service initialized but disabled');
    });

    it('应该处理无logger的情况', () => {
      const config: SecretCacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 10,
      };

      const serviceWithoutLogger = new CacheService(config);

      expect(serviceWithoutLogger).toBeDefined();
      expect(serviceWithoutLogger.isEnabled()).toBe(true);
    });

    it('应该处理事件监听器移除不存在的监听器', () => {
      const listener = vi.fn();

      // 移除一个不存在的监听器不应该抛出错误
      expect(() => service.removeEventListener(listener)).not.toThrow();
    });

    it('应该处理清理过期项目', () => {
      vi.useFakeTimers();

      const shortTtlConfig: SecretCacheOptions = {
        enabled: true,
        ttl: 0.001, // 1ms
        maxSize: 10,
      };

      const shortService = new CacheService(shortTtlConfig, mockLogger);

      shortService.set('expiring-key', 'value');
      expect(shortService.get('expiring-key')).toBe('value');

      // 快进时间让项目过期
      vi.advanceTimersByTime(2);

      // 清理应该被自动触发
      expect(shortService.get('expiring-key')).toBeNull();

      vi.useRealTimers();
    });

    it('应该处理内存计算异常', () => {
      // 测试JSON.stringify可能抛出异常的情况
      const circularObj: Record<string, unknown> = {};
      circularObj.self = circularObj;

      service.set('circular', circularObj);

      // 获取统计信息时应该处理序列化错误
      const stats = service.getStats();
      expect(stats.totalMemoryUsage).toBeGreaterThan(0);
    });
  });

  describe('覆盖率增强测试', () => {
    it('当缓存禁用时，clear应该直接返回', async () => {
      const disabledConfig = { ...defaultConfig, enabled: false };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: CACHE_CONFIG_TOKEN,
            useValue: disabledConfig,
          },
          {
            provide: CACHE_LOGGER_TOKEN,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const disabledService = module.get<CacheService>(CacheService);

      // 调用clear应该直接返回，不会出错
      expect(() => disabledService.clear()).not.toThrow();
    });

    it('should handle expired items in has() method', () => {
      return new Promise<void>((resolve) => {
        // 设置一个很短的TTL
        const shortTtlConfig = { ...defaultConfig, ttl: 0.001 }; // 1ms

        Test.createTestingModule({
          providers: [
            CacheService,
            {
              provide: CACHE_CONFIG_TOKEN,
              useValue: shortTtlConfig,
            },
            {
              provide: CACHE_LOGGER_TOKEN,
              useValue: mockLogger,
            },
          ],
        })
          .compile()
          .then((module) => {
            const shortTtlService = module.get<CacheService>(CacheService);

            // 设置缓存
            shortTtlService.set('test-key', 'test-value');

            // 等待过期
            setTimeout(() => {
              // has()方法应该检测到过期并删除缓存项
              const result = shortTtlService.has('test-key');
              expect(result).toBe(false);
              resolve();
            }, 10);
          });
      });
    });

    it('应该定期清理过期的缓存项', async () => {
      const configWithCleanup = { ...defaultConfig, ttl: 0.001 }; // 1ms TTL

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: CACHE_CONFIG_TOKEN,
            useValue: configWithCleanup,
          },
          {
            provide: CACHE_LOGGER_TOKEN,
            useValue: mockLogger,
          },
        ],
      }).compile();

      const cleanupService = module.get<CacheService>(CacheService);

      // 设置一些会过期的缓存项
      cleanupService.set('expire1', 'value1');
      cleanupService.set('expire2', 'value2');

      expect(cleanupService.getStats().totalKeys).toBe(2);

      // 等待过期后手动触发清理
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 访问私有方法进行测试
      (cleanupService as unknown as { cleanupExpired: () => void }).cleanupExpired();

      // 验证过期项被清理
      expect(cleanupService.getStats().totalKeys).toBe(0);
      expect(mockLogger.debug).toHaveBeenCalledWith('Cleaned up 2 expired cache items');
    });

    it('应该处理LRU淘汰中的键前缀逻辑', async () => {
      const smallCacheService = new CacheService(
        {
          enabled: true,
          ttl: 5000,
          maxSize: 2,
          keyPrefix: 'test_prefix:',
        },
        mockLogger,
      );

      // 填满缓存，确保时间差
      smallCacheService.set('key1', 'value1');
      await new Promise((resolve) => setTimeout(resolve, 1)); // 等待1ms确保时间差
      smallCacheService.set('key2', 'value2');

      // 访问key2，更新其lastAccessedAt
      smallCacheService.get('key2');

      // 添加第三个项目，触发LRU淘汰（应该淘汰key1，因为它的lastAccessedAt最早）
      smallCacheService.set('key3', 'value3');

      // 验证最少使用的项被移除
      expect(smallCacheService.get('key1')).toBeNull();
      expect(smallCacheService.get('key2')).toBe('value2');
      expect(smallCacheService.get('key3')).toBe('value3');
    });

    it('应该处理清理定时器的初始化', () => {
      const timerService = new CacheService(
        {
          enabled: true,
          ttl: 60000,
          maxSize: 100,
          keyPrefix: 'timer_test:',
        },
        mockLogger,
      );

      // 验证定时器已启动（通过检查服务是否正常工作）
      expect(timerService.isEnabled()).toBe(true);
      timerService.set('test', 'value');
      expect(timerService.get('test')).toBe('value');
    });
  });
});
