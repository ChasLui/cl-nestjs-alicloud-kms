import { describe, it, expect } from 'vitest';
import type {
  KmsModuleConfig,
  KmsModuleAsyncOptions,
  KmsModuleOptions,
  LoggerInterface,
  AliCloudRegion,
  KmsSecretData,
  LogParams,
  KmsClientConfig,
} from '../src/types';

describe('类型模块', () => {
  describe('类型定义', () => {
    it('should have correct KmsModuleConfig interface', () => {
      const config: KmsModuleConfig = {
        client: {
          accessKeyId: 'test-key',
          accessKeySecret: 'test-secret',
          endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
        },
        enableLogging: false,
      };

      expect(typeof config.client.accessKeyId).toBe('string');
      expect(typeof config.client.accessKeySecret).toBe('string');
      expect(typeof config.enableLogging).toBe('boolean');
    });

    it('should support optional regionId in KmsClientConfig', () => {
      const config1: KmsClientConfig = {
        accessKeyId: 'test-key',
        accessKeySecret: 'test-secret',
      };

      const config2: KmsClientConfig = {
        accessKeyId: 'test-key',
        accessKeySecret: 'test-secret',
        regionId: 'cn-hangzhou',
      };

      expect(config1.regionId).toBeUndefined();
      expect(config2.regionId).toBe('cn-hangzhou');
    });

    it('should support optional endpoint in KmsClientConfig', () => {
      const config: KmsClientConfig = {
        accessKeyId: 'test-key',
        accessKeySecret: 'test-secret',
        endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
      };

      expect(config.endpoint).toBe('https://kms.cn-hangzhou.aliyuncs.com');
    });

    it('should support all AliCloud regions', () => {
      const regions: AliCloudRegion[] = [
        'cn-hangzhou',
        'cn-shanghai',
        'cn-beijing',
        'cn-shenzhen',
        'cn-qingdao',
        'cn-zhangjiakou',
        'cn-huhehaote',
        'cn-chengdu',
        'cn-hongkong',
        'ap-southeast-1',
        'ap-southeast-2',
        'ap-southeast-3',
        'ap-southeast-5',
        'ap-northeast-1',
        'ap-south-1',
        'us-east-1',
        'us-west-1',
        'eu-west-1',
        'eu-central-1',
      ];

      regions.forEach((region) => {
        const config: KmsModuleConfig = {
          client: {
            accessKeyId: 'test-key',
            accessKeySecret: 'test-secret',
            regionId: region,
            endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
          },
          enableLogging: false,
        };
        expect(config.client.regionId).toBe(region);
      });
    });

    it('should support LoggerInterface implementation', () => {
      const logger: LoggerInterface = {
        log: (message: string, ...params: LogParams) => {
          console.log(message, ...params);
        },
        error: (message: string, ...params: LogParams) => {
          console.error(message, ...params);
        },
        warn: (message: string, ...params: LogParams) => {
          console.warn(message, ...params);
        },
      };

      expect(typeof logger.log).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
    });

    it('should support optional logger methods', () => {
      const logger: LoggerInterface = {
        log: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {},
        verbose: () => {},
      };

      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.verbose).toBe('function');
    });

    it('should support KmsSecretData as unknown type', () => {
      const secretData: KmsSecretData = {
        'database.host': 'localhost',
        'database.port': '5432',
        'redis.host': 'redis-server',
        nested: {
          value: 'test',
        },
      };

      // Since KmsSecretData is now unknown, we need to cast it to access properties
      const typedData = secretData as Record<string, unknown>;
      expect((typedData as { [key: string]: string })['database.host']).toBe('localhost');
      expect((typedData as { nested: { value: string } }).nested.value).toBe('test');
    });

    it('should support KmsModuleAsyncOptions with useFactory', () => {
      const options: KmsModuleAsyncOptions = {
        useFactory: () => ({
          client: {
            accessKeyId: 'test-key',
            accessKeySecret: 'test-secret',
            endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
          },
          enableLogging: false,
        }),
        inject: [],
      };

      expect(typeof options.useFactory).toBe('function');
      expect(Array.isArray(options.inject)).toBe(true);
    });

    it('should support KmsModuleOptions with provider', () => {
      const options: KmsModuleOptions = {
        config: {
          client: {
            accessKeyId: 'test-key',
            accessKeySecret: 'test-secret',
            endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
          },
          enableLogging: false,
        },
        loggerProvider: {
          provide: 'LOGGER',
          useValue: {
            log: () => {},
            error: () => {},
            warn: () => {},
          },
        },
        global: true,
      };

      expect(options.config.client.accessKeyId).toBe('test-key');
      expect(options.loggerProvider?.provide).toBe('LOGGER');
      expect(options.global).toBe(true);
    });

    it('should support LogParams as rest parameters', () => {
      const testFunction = (message: string, ...params: LogParams) => {
        return { message, params };
      };

      const result1 = testFunction('test');
      const result2 = testFunction('test', 'param1', 'param2');
      const result3 = testFunction('test', { key: 'value' }, 123, true);

      expect(result1.params).toEqual([]);
      expect(result2.params).toEqual(['param1', 'param2']);
      expect(result3.params).toEqual([{ key: 'value' }, 123, true]);
    });
  });

  describe('类型兼容性', () => {
    it('should allow partial KmsModuleConfig for merging', () => {
      const baseConfig: Partial<KmsModuleConfig> = {
        enableLogging: true,
      };

      const fullConfig: KmsModuleConfig = {
        ...baseConfig,
        client: {
          accessKeyId: 'test-key',
          accessKeySecret: 'test-secret',
          endpoint: 'https://kms.cn-hangzhou.aliyuncs.com',
        },
        enableLogging: baseConfig.enableLogging || false,
      };

      expect(fullConfig.enableLogging).toBe(true);
    });

    it('should allow extending LoggerInterface', () => {
      interface ExtendedLogger extends LoggerInterface {
        trace?: (message: string, ...params: LogParams) => void;
      }

      const extendedLogger: ExtendedLogger = {
        log: () => {},
        error: () => {},
        warn: () => {},
        trace: () => {},
      };

      expect(typeof extendedLogger.trace).toBe('function');
    });
  });
});
