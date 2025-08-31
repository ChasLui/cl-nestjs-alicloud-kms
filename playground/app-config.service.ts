import { Injectable, Logger } from '@nestjs/common';
import { mergeConfig, getErrorMessage } from '@/index';

/**
 * 应用配置接口定义
 */
interface DatabaseConfig {
  'database.host': string;
  'database.port': string;
  'database.name': string;
  'database.user': string;
  'database.password': string;
}

interface RedisConfig {
  'redis.host': string;
  'redis.port': string;
  'redis.password': string;
}

type AppConfig = DatabaseConfig &
  RedisConfig & {
    'app.name': string;
    'app.version': string;
    'app.debug': boolean;
  };

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  constructor() {}

  /**
   * 获取完整的应用配置
   * 演示配置合并功能
   */
  async getAppConfig(): Promise<{
    config: AppConfig;
    demo: boolean;
    explanation: string;
  }> {
    try {
      // 模拟从 KMS 获取远程配置
      const remoteConfig: Partial<AppConfig> = {
        'database.host': 'prod-db.example.com',
        'database.password': 'kms-secret-password',
        'redis.host': 'redis.example.com',
        'redis.password': 'kms-redis-password',
        'app.name': 'KMS Demo App',
      };

      // 本地默认配置
      const localDefaults: Partial<AppConfig> = {
        'database.port': '5432',
        'database.name': 'myapp',
        'database.user': 'postgres',
        'redis.port': '6379',
        'app.version': '1.0.0',
        'app.debug': process.env.NODE_ENV !== 'production',
      };

      // 合并配置（远程配置优先）
      const mergedConfig = mergeConfig(localDefaults, remoteConfig) as AppConfig;

      this.logger.log('Application configuration loaded successfully');

      return {
        config: mergedConfig,
        demo: true,
        explanation: 'Configuration merged from local defaults and remote KMS secrets (simulated)',
      };
    } catch (error) {
      this.logger.error('Failed to load application configuration:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * 获取数据库配置
   */
  async getDatabaseConfig(): Promise<{
    config: DatabaseConfig;
    demo: boolean;
  }> {
    const { config } = await this.getAppConfig();

    const databaseConfig: DatabaseConfig = {
      'database.host': config['database.host'],
      'database.port': config['database.port'],
      'database.name': config['database.name'],
      'database.user': config['database.user'],
      'database.password': config['database.password'],
    };

    return {
      config: databaseConfig,
      demo: true,
    };
  }

  /**
   * 获取 Redis 配置
   */
  async getRedisConfig(): Promise<{
    config: RedisConfig;
    demo: boolean;
  }> {
    const { config } = await this.getAppConfig();

    const redisConfig: RedisConfig = {
      'redis.host': config['redis.host'],
      'redis.port': config['redis.port'],
      'redis.password': config['redis.password'],
    };

    return {
      config: redisConfig,
      demo: true,
    };
  }

  /**
   * 演示缓存配置功能
   */
  private configCache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 分钟

  async getCachedConfig(key: string): Promise<unknown> {
    const cached = this.configCache.get(key);

    if (cached && Date.now() - cached.timestamp < this.TTL) {
      this.logger.log(`Configuration cache hit for key: ${key}`);
      return {
        ...(cached.data as Record<string, unknown>),
        fromCache: true,
        cacheAge: Math.floor((Date.now() - cached.timestamp) / 1000),
      };
    }

    // 模拟从 KMS 获取配置
    const freshConfig = await this.getAppConfig();
    this.configCache.set(key, {
      data: freshConfig,
      timestamp: Date.now(),
    });

    this.logger.log(`Configuration refreshed for key: ${key}`);
    return {
      ...(freshConfig as Record<string, unknown>),
      fromCache: false,
      cacheAge: 0,
    };
  }

  /**
   * 清除配置缓存
   */
  clearCache(): void {
    this.configCache.clear();
    this.logger.log('Configuration cache cleared');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    const stats = {
      size: this.configCache.size,
      keys: Array.from(this.configCache.keys()),
      ttl: this.TTL,
      demo: true,
    };

    return stats;
  }
}
