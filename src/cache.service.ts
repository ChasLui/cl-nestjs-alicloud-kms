import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { LoggerInterface, SecretCacheOptions } from './types';
import { getErrorMessage, sanitizeForLogging } from './utils';

/**
 * 缓存项接口
 */
interface CacheItem<T = unknown> {
  /** 缓存的值 */
  readonly value: T;
  /** 缓存创建时间 */
  readonly createdAt: number;
  /** 缓存过期时间 */
  readonly expiresAt: number;
  /** 访问次数 */
  accessCount: number;
  /** 最后访问时间 */
  lastAccessedAt: number;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  readonly totalKeys: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly hitRate: number;
  readonly totalMemoryUsage: number;
}

/**
 * 缓存事件类型
 */
export type CacheEventType = 'hit' | 'miss' | 'set' | 'delete' | 'expire' | 'clear';

/**
 * 缓存事件监听器
 */
export type CacheEventListener = (event: CacheEventType, key: string, value?: unknown) => void;

/**
 * 缓存常量定义
 */
export const CACHE_CONFIG_TOKEN = 'CACHE_CONFIG_TOKEN';
export const CACHE_LOGGER_TOKEN = 'CACHE_LOGGER_TOKEN';

/**
 * 内存缓存服务
 * 提供高性能的内存缓存功能，支持TTL、LRU淘汰策略、统计信息等
 */
@Injectable()
export class CacheService {
  private readonly cache = new Map<string, CacheItem>();
  private readonly logger: LoggerInterface;
  private readonly config: Required<SecretCacheOptions>;
  private readonly eventListeners = new Set<CacheEventListener>();

  // 统计信息
  private hitCount = 0;
  private missCount = 0;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    @Inject(CACHE_CONFIG_TOKEN)
    config: SecretCacheOptions,
    @Optional()
    @Inject(CACHE_LOGGER_TOKEN)
    private readonly injectedLogger?: LoggerInterface,
  ) {
    this.logger = this.injectedLogger || new Logger(CacheService.name);

    // 设置默认配置
    this.config = {
      enabled: config.enabled,
      ttl: config.ttl || 300, // 默认5分钟
      maxSize: config.maxSize || 1000, // 默认最大1000个缓存项
      keyPrefix: config.keyPrefix || 'kms_secret:',
    };

    if (this.config.enabled) {
      this.startCleanupTimer();
      this.logger.log(
        'Cache service initialized',
        sanitizeForLogging({
          ttl: this.config.ttl,
          maxSize: this.config.maxSize,
          keyPrefix: this.config.keyPrefix,
        }),
      );
    } else {
      this.logger.log('Cache service initialized but disabled');
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * 检查缓存项是否过期
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.expiresAt;
  }

  /**
   * 触发缓存事件
   */
  private emitEvent(event: CacheEventType, key: string, value?: unknown): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event, key, value);
      } catch (error) {
        this.logger.warn(`Error in cache event listener: ${getErrorMessage(error)}`);
      }
    }
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: CacheEventListener): void {
    this.eventListeners.add(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: CacheEventListener): void {
    this.eventListeners.delete(listener);
  }

  /**
   * 获取缓存值
   */
  get<T = string>(key: string): T | null {
    if (!this.config.enabled) {
      return null;
    }

    const cacheKey = this.generateKey(key);
    const item = this.cache.get(cacheKey);

    if (!item) {
      this.missCount++;
      this.emitEvent('miss', key);
      return null;
    }

    if (this.isExpired(item)) {
      this.cache.delete(cacheKey);
      this.missCount++;
      this.emitEvent('expire', key);
      return null;
    }

    // 更新访问统计
    item.accessCount++;
    item.lastAccessedAt = Date.now();
    this.hitCount++;
    this.emitEvent('hit', key, item.value);

    return item.value as T;
  }

  /**
   * 设置缓存值
   */
  set<T = string>(key: string, value: T, customTtl?: number): void {
    if (!this.config.enabled) {
      return;
    }

    const cacheKey = this.generateKey(key);
    const ttl = (customTtl || this.config.ttl) * 1000; // 转换为毫秒
    const now = Date.now();

    const item: CacheItem<T> = {
      value,
      createdAt: now,
      expiresAt: now + ttl,
      accessCount: 0,
      lastAccessedAt: now,
    };

    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize && !this.cache.has(cacheKey)) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(cacheKey, item);
    this.emitEvent('set', key, value);
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const cacheKey = this.generateKey(key);
    const deleted = this.cache.delete(cacheKey);

    if (deleted) {
      this.emitEvent('delete', key);
    }

    return deleted;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    if (!this.config.enabled) {
      return;
    }

    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.emitEvent('clear', 'all');
  }

  /**
   * 检查缓存项是否存在且未过期
   */
  has(key: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const cacheKey = this.generateKey(key);
    const item = this.cache.get(cacheKey);

    if (!item) {
      return false;
    }

    if (this.isExpired(item)) {
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

    // 估算内存使用量（粗略计算）
    let totalMemoryUsage = 0;
    for (const [key, item] of this.cache.entries()) {
      totalMemoryUsage += key.length * 2; // 字符串占用2字节
      try {
        totalMemoryUsage += JSON.stringify(item.value).length * 2;
      } catch {
        totalMemoryUsage += 64; // 无法序列化时使用估算值
      }
      totalMemoryUsage += 64; // CacheItem 其他字段的估算大小
    }

    return {
      totalKeys: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: Number(hitRate.toFixed(4)),
      totalMemoryUsage,
    };
  }

  /**
   * 获取所有缓存键
   */
  getKeys(): string[] {
    if (!this.config.enabled) {
      return [];
    }

    return Array.from(this.cache.keys()).map((key) =>
      key.startsWith(this.config.keyPrefix) ? key.substring(this.config.keyPrefix.length) : key,
    );
  }

  /**
   * 批量获取缓存值
   */
  mget(keys: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const key of keys) {
      const value = this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 批量设置缓存值
   */
  mset(data: Record<string, unknown>, customTtl?: number): void {
    for (const [key, value] of Object.entries(data)) {
      this.set(key, value, customTtl);
    }
  }

  /**
   * 批量删除缓存项
   */
  mdel(keys: string[]): number {
    let deletedCount = 0;

    for (const key of keys) {
      if (this.delete(key)) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * LRU 淘汰策略 - 移除最少使用的缓存项
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessedAt < oldestTime) {
        oldestTime = item.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      const originalKey = oldestKey.startsWith(this.config.keyPrefix)
        ? oldestKey.substring(this.config.keyPrefix.length)
        : oldestKey;
      this.emitEvent('delete', originalKey);
    }
  }

  /**
   * 清理过期的缓存项
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      const originalKey = key.startsWith(this.config.keyPrefix) ? key.substring(this.config.keyPrefix.length) : key;
      this.emitEvent('expire', originalKey);
    }

    if (keysToDelete.length > 0) {
      this.logger.debug(`Cleaned up ${keysToDelete.length} expired cache items`);
    }
  }

  /**
   * 启动定时清理任务
   */
  private startCleanupTimer(): void {
    // 每分钟执行一次清理
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, 60_000);
  }

  /**
   * 停止定时清理任务
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 销毁缓存服务
   */
  onModuleDestroy(): void {
    this.stopCleanupTimer();
    this.clear();
    this.eventListeners.clear();
    this.logger.log('Cache service destroyed');
  }

  /**
   * 获取缓存配置
   */
  getConfig(): Required<SecretCacheOptions> {
    return { ...this.config };
  }

  /**
   * 检查缓存是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}
