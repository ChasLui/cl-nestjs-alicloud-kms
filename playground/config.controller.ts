import { Controller, Get, Query } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { mergeConfig, validateRequiredKeys, unflattenConfig, flattenConfig, filterEmptyValues } from '@/index';

/**
 * 配置接口定义
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

@Controller('config')
export class ConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  /**
   * 获取应用配置
   */
  @Get()
  async getAppConfig(): Promise<{
    config: AppConfig;
    demo: boolean;
    explanation: string;
  }> {
    return this.appConfigService.getAppConfig();
  }

  /**
   * 获取数据库配置
   */
  @Get('database')
  async getDatabaseConfig(): Promise<{
    config: DatabaseConfig;
    demo: boolean;
  }> {
    return this.appConfigService.getDatabaseConfig();
  }

  /**
   * 获取 Redis 配置
   */
  @Get('redis')
  async getRedisConfig(): Promise<{
    config: RedisConfig;
    demo: boolean;
  }> {
    return this.appConfigService.getRedisConfig();
  }

  /**
   * 演示配置合并功能
   */
  @Get('demo/merge')
  async demoConfigMerge() {
    const localConfig = {
      'database.host': 'localhost',
      'database.port': '5432',
      'redis.port': '6379',
      'app.debug': true,
    };

    const remoteConfig = {
      'database.host': 'prod-db.example.com',
      'database.port': '5432',
      'database.password': 'secret123',
      'redis.port': '6379',
      'redis.host': 'redis.example.com',
      'app.debug': true,
      'app.version': '1.0.0',
    };

    const merged = mergeConfig(localConfig, remoteConfig);

    return {
      demo: 'Configuration Merge',
      local: localConfig,
      remote: remoteConfig,
      merged,
      explanation: 'Remote configuration takes precedence over local defaults',
    };
  }

  /**
   * 演示配置验证功能
   */
  @Get('demo/validate')
  async demoConfigValidation(@Query('keys') requiredKeys?: string) {
    const config = {
      'database.host': 'localhost',
      'database.port': '5432',
      'redis.host': 'redis-server',
    };

    const keys = requiredKeys ? requiredKeys.split(',') : ['database.host', 'redis.host'];

    try {
      validateRequiredKeys(config, keys as (keyof typeof config)[]);
      return {
        demo: 'Configuration Validation',
        config,
        requiredKeys: keys,
        status: 'valid',
        message: 'All required keys are present',
      };
    } catch (error) {
      return {
        demo: 'Configuration Validation',
        config,
        requiredKeys: keys,
        status: 'invalid',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 演示配置扁平化和嵌套化
   */
  @Get('demo/transform')
  async demoConfigTransform() {
    // 扁平配置
    const flatConfig = {
      'app.name': 'KMS Demo',
      'app.version': '1.0.0',
      'database.host': 'localhost',
      'database.port': 5432,
      'database.ssl': true,
      'redis.host': 'redis-server',
      'redis.port': 6379,
    };

    // 转换为嵌套结构
    const nested = unflattenConfig(flatConfig);

    // 再转换回扁平结构
    const flattened = flattenConfig(nested as Record<string, unknown>);

    return {
      demo: 'Configuration Transformation',
      original: flatConfig,
      nested,
      flattened,
      explanation: 'Demonstrates conversion between flat and nested configuration formats',
    };
  }

  /**
   * 演示空值过滤功能
   */
  @Get('demo/filter')
  async demoFilterEmpty() {
    const configWithEmpties = {
      host: 'localhost',
      port: 3000,
      password: '',
      token: null,
      debug: undefined,
      ssl: false,
      timeout: 0,
    };

    const filtered = filterEmptyValues(configWithEmpties);

    return {
      demo: 'Empty Values Filtering',
      original: configWithEmpties,
      filtered,
      explanation: 'Removes undefined, null, and empty string values while preserving false and 0',
    };
  }

  /**
   * 获取所有演示功能列表
   */
  @Get('demo')
  async getDemoList() {
    return {
      title: 'Configuration Utilities Demo',
      demos: [
        {
          name: 'Config Merge',
          url: '/api/config/demo/merge',
          description: 'Demonstrates merging local and remote configurations',
        },
        {
          name: 'Config Validation',
          url: '/api/config/demo/validate',
          description: 'Validates required configuration keys',
          params: '?keys=database.host,redis.host',
        },
        {
          name: 'Config Transform',
          url: '/api/config/demo/transform',
          description: 'Converts between flat and nested configuration formats',
        },
        {
          name: 'Filter Empty',
          url: '/api/config/demo/filter',
          description: 'Filters out empty values from configuration',
        },
      ],
      realConfig: [
        {
          name: 'App Configuration',
          url: '/api/config',
          description: 'Get complete application configuration',
        },
        {
          name: 'Database Config',
          url: '/api/config/database',
          description: 'Get database-specific configuration',
        },
        {
          name: 'Redis Config',
          url: '/api/config/redis',
          description: 'Get Redis-specific configuration',
        },
      ],
    };
  }
}
