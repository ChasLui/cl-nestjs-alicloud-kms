import { DynamicModule, Module, Provider } from '@nestjs/common';
import { KmsService, KMS_CONFIG_TOKEN, KMS_LOGGER_TOKEN, KMS_CACHE_TOKEN } from './kms.service';
import { KmsModuleConfig, KmsModuleAsyncOptions, KmsModuleOptions, SecretCacheOptions } from './types';
import { validateAccessKeyId, validateAccessKeySecret } from './utils';
import { CacheService, CACHE_CONFIG_TOKEN, CACHE_LOGGER_TOKEN } from './cache.service';

/**
 * KMS 模块 - 用于集成阿里云 KMS 服务
 */
@Module({})
export class KmsModule {
  /**
   * 静态配置方式注册模块
   * @param config KMS 模块配置
   * @param global 是否为全局模块，默认 false
   * @returns 动态模块
   */
  static forRoot(config: KmsModuleConfig, global = false): DynamicModule {
    // 预验证配置
    this.validateConfig(config);

    const configProvider: Provider = {
      provide: KMS_CONFIG_TOKEN,
      useValue: config,
    };

    const providers: Provider[] = [configProvider, KmsService];

    // 如果配置中启用了缓存，则添加缓存服务
    if (config.cache?.enabled) {
      const cacheConfigProvider: Provider = {
        provide: CACHE_CONFIG_TOKEN,
        useValue: config.cache,
      };

      const cacheServiceProvider: Provider = {
        provide: KMS_CACHE_TOKEN,
        useClass: CacheService,
      };

      providers.push(cacheConfigProvider, cacheServiceProvider);
    }

    return {
      module: KmsModule,
      global,
      providers,
      exports: [KmsService],
    };
  }

  /**
   * 带自定义 Logger 的静态配置方式注册模块
   * @param options KMS 模块完整配置选项
   * @returns 动态模块
   */
  static forRootWithLogger(options: KmsModuleOptions): DynamicModule {
    if (!options) {
      throw new Error('KMS module options are required');
    }

    const { config, loggerProvider, global = false } = options;

    // 预验证配置
    this.validateConfig(config);

    const configProvider: Provider = {
      provide: KMS_CONFIG_TOKEN,
      useValue: config,
    };

    const providers: Provider[] = [configProvider, KmsService];

    // 如果提供了自定义 logger 提供者，则添加到 providers 中
    if (loggerProvider) {
      const loggerProviderWithToken: Provider = {
        provide: KMS_LOGGER_TOKEN,
        ...loggerProvider,
      } as Provider;
      providers.push(loggerProviderWithToken);
    }

    // 如果配置中启用了缓存，则添加缓存服务
    if (config.cache?.enabled) {
      const cacheConfigProvider: Provider = {
        provide: CACHE_CONFIG_TOKEN,
        useValue: config.cache,
      };

      const cacheServiceProvider: Provider = {
        provide: KMS_CACHE_TOKEN,
        useClass: CacheService,
      };

      providers.push(cacheConfigProvider, cacheServiceProvider);

      // 如果有logger提供者，也为缓存服务提供
      if (loggerProvider) {
        const cacheLoggerProvider: Provider = {
          provide: CACHE_LOGGER_TOKEN,
          ...loggerProvider,
        } as Provider;
        providers.push(cacheLoggerProvider);
      }
    }

    return {
      module: KmsModule,
      global,
      providers,
      exports: [KmsService],
    };
  }

  /**
   * 异步配置方式注册模块
   * @param options 异步配置选项
   * @returns 动态模块
   */
  static forRootAsync(options: KmsModuleAsyncOptions): DynamicModule {
    if (!options) {
      throw new Error('KMS module async options are required');
    }

    const asyncProviders = this.createAsyncProviders(options);

    const providers: Provider[] = [...asyncProviders, KmsService];

    // 如果提供了自定义 logger 提供者，则添加到 providers 中
    if (options.loggerProvider) {
      const loggerProviderWithToken: Provider = {
        provide: KMS_LOGGER_TOKEN,
        ...options.loggerProvider,
      } as Provider;
      providers.push(loggerProviderWithToken);
    }

    // 为异步配置添加缓存支持
    const cacheAsyncProvider: Provider = {
      provide: CACHE_CONFIG_TOKEN,
      useFactory: async (...args: unknown[]) => {
        const config = await options.useFactory!(...args);
        return config.cache?.enabled ? config.cache : { enabled: false };
      },
      inject: options.inject as never[],
    };

    const cacheServiceProvider: Provider = {
      provide: KMS_CACHE_TOKEN,
      useFactory: (cacheConfig: SecretCacheOptions) => {
        return cacheConfig.enabled ? new CacheService(cacheConfig) : undefined;
      },
      inject: [CACHE_CONFIG_TOKEN],
    };

    providers.push(cacheAsyncProvider, cacheServiceProvider);

    // 如果有logger提供者，也为缓存服务提供
    if (options.loggerProvider) {
      const cacheLoggerProvider: Provider = {
        provide: CACHE_LOGGER_TOKEN,
        ...options.loggerProvider,
      } as Provider;
      providers.push(cacheLoggerProvider);
    }

    return {
      module: KmsModule,
      global: options.global || false,
      providers,
      exports: [KmsService],
    };
  }

  /**
   * 创建异步提供者
   * @param options 异步配置选项
   * @returns 提供者数组
   */
  private static createAsyncProviders(options: KmsModuleAsyncOptions): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: KMS_CONFIG_TOKEN,
          useFactory: async (...args: unknown[]) => {
            const config = await options.useFactory!(...args);
            // 验证异步生成的配置
            this.validateConfig(config);
            return config;
          },
          inject: options.inject as never[],
        },
      ];
    }

    throw new Error('Invalid KMS module configuration: useFactory is required for async configuration');
  }

  /**
   * 验证 KMS 配置
   * @private
   */
  private static validateConfig(config: KmsModuleConfig): void {
    if (!config) {
      throw new Error('KMS configuration is required');
    }

    if (!config.client) {
      throw new Error('KMS client configuration is required');
    }

    if (!config.client.accessKeyId) {
      throw new Error('KMS client accessKeyId is required');
    }

    if (!config.client.accessKeySecret) {
      throw new Error('KMS client accessKeySecret is required');
    }

    if (!config.client.endpoint) {
      throw new Error('KMS client endpoint is required');
    }

    // 进行更详细的验证
    try {
      validateAccessKeyId(config.client.accessKeyId);
      validateAccessKeySecret(config.client.accessKeySecret);
    } catch (error) {
      throw new Error(`Invalid KMS configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
