import { Injectable, Logger } from '@nestjs/common';
import { KmsService } from '../src/kms.service';

/**
 * 缓存演示服务
 * 展示KMS服务的缓存功能
 */
@Injectable()
export class CacheDemoService {
  private readonly logger = new Logger(CacheDemoService.name);

  constructor(private readonly kmsService: KmsService) {}

  /**
   * 演示基本缓存功能
   */
  async demonstrateBasicCache(): Promise<void> {
    this.logger.log('=== 基本缓存功能演示 ===');

    const secretName = 'demo/database/config';

    try {
      // 首次获取 - 从KMS获取并缓存
      this.logger.log('首次获取密钥...');
      const startTime = Date.now();
      const value1 = await this.kmsService.getSecretValue(secretName);
      const firstCallTime = Date.now() - startTime;
      this.logger.log(`首次获取耗时: ${firstCallTime}ms`);

      // 第二次获取 - 从缓存获取
      this.logger.log('第二次获取密钥（应该从缓存返回）...');
      const startTime2 = Date.now();
      const value2 = await this.kmsService.getSecretValue(secretName);
      const secondCallTime = Date.now() - startTime2;
      this.logger.log(`第二次获取耗时: ${secondCallTime}ms`);

      this.logger.log(`缓存加速比: ${(firstCallTime / secondCallTime).toFixed(2)}x`);
      this.logger.log(`值一致性: ${value1 === value2 ? '✓' : '✗'}`);
    } catch (error) {
      this.logger.error('缓存演示失败:', error);
    }
  }

  /**
   * 演示缓存统计功能
   */
  async demonstrateCacheStats(): Promise<void> {
    this.logger.log('=== 缓存统计功能演示 ===');

    const secrets = ['demo/database/config', 'demo/redis/config', 'demo/elasticsearch/config'];

    try {
      // 生成一些缓存活动
      for (const secret of secrets) {
        await this.kmsService.getSecretValue(secret);
        await this.kmsService.getSecretValue(secret); // 缓存命中
      }

      // 获取统计信息
      const stats = this.kmsService.getCacheStats();
      if (stats) {
        this.logger.log('缓存统计信息:');
        this.logger.log(`- 总缓存键数: ${stats.totalKeys}`);
        this.logger.log(`- 命中次数: ${stats.hitCount}`);
        this.logger.log(`- 未命中次数: ${stats.missCount}`);
        this.logger.log(`- 命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
        this.logger.log(`- 内存使用: ${(stats.totalMemoryUsage / 1024).toFixed(2)} KB`);
      } else {
        this.logger.warn('缓存未启用或不可用');
      }
    } catch (error) {
      this.logger.error('统计演示失败:', error);
    }
  }

  /**
   * 演示缓存预热功能
   */
  async demonstrateCacheWarmup(): Promise<void> {
    this.logger.log('=== 缓存预热功能演示 ===');

    const secretsToWarmup = ['demo/app/jwt-secret', 'demo/app/encryption-key', 'demo/app/oauth-config'];

    try {
      // 清除现有缓存
      this.kmsService.clearAllCache();
      this.logger.log('已清除所有缓存');

      // 预热缓存
      this.logger.log(`开始预热 ${secretsToWarmup.length} 个密钥...`);
      const startTime = Date.now();

      await this.kmsService.warmupCache(secretsToWarmup);

      const warmupTime = Date.now() - startTime;
      this.logger.log(`缓存预热完成，耗时: ${warmupTime}ms`);

      // 验证预热效果
      this.logger.log('验证预热效果...');
      for (const secret of secretsToWarmup) {
        const startTime = Date.now();
        await this.kmsService.getSecretValue(secret);
        const accessTime = Date.now() - startTime;
        this.logger.log(`${secret}: ${accessTime}ms (缓存命中)`);
      }
    } catch (error) {
      this.logger.error('预热演示失败:', error);
    }
  }

  /**
   * 演示缓存刷新功能
   */
  async demonstrateCacheRefresh(): Promise<void> {
    this.logger.log('=== 缓存刷新功能演示 ===');

    const secretName = 'demo/config/version';

    try {
      // 首次获取并缓存
      this.logger.log('首次获取密钥...');
      const value1 = await this.kmsService.getSecretValue(secretName);
      this.logger.log(`首次获取值: ${value1?.substring(0, 20)}...`);

      // 模拟配置更新（实际场景中，密钥值可能在KMS中被更新）
      this.logger.log('模拟密钥在KMS中被更新...');

      // 刷新缓存
      this.logger.log('刷新缓存...');
      const refreshedValue = await this.kmsService.refreshSecretCache(secretName);
      this.logger.log(`刷新后的值: ${refreshedValue?.substring(0, 20)}...`);

      // 验证缓存已更新
      const cachedValue = await this.kmsService.getSecretValue(secretName);
      this.logger.log(`验证缓存值: ${cachedValue?.substring(0, 20)}...`);
      this.logger.log(`缓存一致性: ${refreshedValue === cachedValue ? '✓' : '✗'}`);
    } catch (error) {
      this.logger.error('刷新演示失败:', error);
    }
  }

  /**
   * 演示批量操作的缓存优化
   */
  async demonstrateBatchCacheOptimization(): Promise<void> {
    this.logger.log('=== 批量操作缓存优化演示 ===');

    const allSecrets = [
      'demo/service1/config',
      'demo/service2/config',
      'demo/service3/config',
      'demo/service4/config',
      'demo/service5/config',
    ];

    try {
      // 清除缓存
      this.kmsService.clearAllCache();

      // 预先缓存一部分密钥
      const preCachedSecrets = allSecrets.slice(0, 2);
      this.logger.log(`预先缓存 ${preCachedSecrets.length} 个密钥...`);
      await this.kmsService.warmupCache(preCachedSecrets);

      // 批量获取所有密钥
      this.logger.log(`批量获取 ${allSecrets.length} 个密钥...`);
      const startTime = Date.now();

      const results = await this.kmsService.getMultipleSecrets(allSecrets);

      const batchTime = Date.now() - startTime;
      this.logger.log(`批量获取完成，耗时: ${batchTime}ms`);
      this.logger.log(`成功获取 ${Object.keys(results).length} 个密钥`);

      // 显示缓存效率
      const stats = this.kmsService.getCacheStats();
      if (stats) {
        this.logger.log(`缓存命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
      }
    } catch (error) {
      this.logger.error('批量演示失败:', error);
    }
  }

  /**
   * 运行所有缓存演示
   */
  async runAllDemonstrations(): Promise<void> {
    this.logger.log('🚀 开始KMS缓存功能完整演示');

    // 检查缓存是否启用
    const cacheService = this.kmsService.getCacheService();
    if (!cacheService?.isEnabled()) {
      this.logger.warn('❌ 缓存未启用，演示将跳过');
      return;
    }

    this.logger.log('✅ 缓存已启用，开始演示...');

    try {
      await this.demonstrateBasicCache();
      await this.demonstrateCacheStats();
      await this.demonstrateCacheWarmup();
      await this.demonstrateCacheRefresh();
      await this.demonstrateBatchCacheOptimization();

      this.logger.log('🎉 所有缓存演示完成');
    } catch (error) {
      this.logger.error('演示过程中出现错误:', error);
    }
  }

  /**
   * 监控缓存性能
   */
  startCacheMonitoring(): void {
    const cacheService = this.kmsService.getCacheService();
    if (!cacheService?.isEnabled()) {
      this.logger.warn('缓存未启用，无法监控');
      return;
    }

    // 添加缓存事件监听器
    cacheService.addEventListener((event, key, _value) => {
      switch (event) {
        case 'hit':
          this.logger.debug(`🎯 缓存命中: ${key}`);
          break;
        case 'miss':
          this.logger.debug(`❌ 缓存未命中: ${key}`);
          break;
        case 'set':
          this.logger.debug(`💾 缓存设置: ${key}`);
          break;
        case 'expire':
          this.logger.debug(`⏰ 缓存过期: ${key}`);
          break;
        case 'delete':
          this.logger.debug(`🗑️ 缓存删除: ${key}`);
          break;
        case 'clear':
          this.logger.debug(`🧹 缓存清空`);
          break;
      }
    });

    // 定期打印缓存统计
    setInterval(() => {
      const stats = this.kmsService.getCacheStats();
      if (stats && stats.totalKeys > 0) {
        this.logger.log(`📊 缓存状态 - 键数: ${stats.totalKeys}, 命中率: ${(stats.hitRate * 100).toFixed(1)}%`);
      }
    }, 30000); // 每30秒打印一次

    this.logger.log('📡 缓存监控已启动');
  }
}
