import {
  mergeConfig,
  mergeMultipleConfigs,
  validateRequiredKeys,
  filterEmptyValues,
  unflattenConfig,
  flattenConfig,
  getErrorMessage,
  validateSecretName,
  validateAccessKeyId,
  validateAccessKeySecret,
  validateRegionId,
  validateEndpoint,
  sanitizeForLogging,
} from '../src/utils';

describe('工具函数', () => {
  describe('mergeConfig', () => {
    it('should merge two objects correctly', () => {
      const target = { a: 1, b: 2 };
      const source = { a: 1, b: 3, c: 4 };
      const result = mergeConfig(target, source);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should handle null and undefined values', () => {
      const target = { a: 1, b: null as number | null };
      const source = { a: 1, b: 2 as number | null };
      const result = mergeConfig(target, source);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle empty objects', () => {
      expect(mergeConfig({}, {})).toEqual({});
      expect(mergeConfig(null, { a: 1 })).toEqual({ a: 1 });
      expect(mergeConfig({ a: 1 }, null)).toEqual({ a: 1 });
      expect(mergeConfig(null, null)).toEqual({});
    });

    it('should handle undefined values in source', () => {
      const target = { a: 1, b: 2 };
      const source = { a: undefined, b: 3, c: 4 };
      const result = mergeConfig(target, source);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should handle null values in source', () => {
      const target = { a: 1, b: 2 };
      const source = { a: null, b: 3, c: 4 };
      const result = mergeConfig(target, source);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should handle values that are undefined and null in target', () => {
      const target = { a: undefined, b: null, c: 3 };
      const source = { a: 1, d: 4 };
      const result = mergeConfig(target, source);

      expect(result).toEqual({ a: 1, c: 3, d: 4 });
    });
  });

  describe('mergeMultipleConfigs', () => {
    it('should merge multiple configurations', () => {
      const config1 = { a: 1, b: 2 };
      const config2 = { a: 1, b: 3, c: 4 };
      const config3 = { a: 1, b: 2, c: 5, d: 6 };

      const result = mergeMultipleConfigs(config1, config2, config3);
      expect(result).toEqual({ a: 1, b: 2, c: 5, d: 6 });
    });

    it('should handle mixed null and valid configs', () => {
      const result = mergeMultipleConfigs({ a: 1 }, null, { b: 2 }, undefined, { c: 3 });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('validateRequiredKeys', () => {
    it('should not throw for valid configuration', () => {
      const config = { host: 'localhost', port: 3000, name: 'test' };
      expect(() => {
        validateRequiredKeys(config, ['host', 'port']);
      }).not.toThrow();
    });

    it('should throw for missing keys', () => {
      const config = { host: 'localhost' };
      expect(() => {
        validateRequiredKeys(config, ['host', 'port'] as (keyof typeof config)[]);
      }).toThrow('Missing required configuration keys: port');
    });

    it('should treat empty strings as missing', () => {
      const config = { host: '', port: 3000 };
      expect(() => {
        validateRequiredKeys(config, ['host', 'port']);
      }).toThrow('Missing required configuration keys: host');
    });

    it('should treat null values as missing', () => {
      const config = { host: null, port: 3000 };
      expect(() => {
        validateRequiredKeys(config, ['host', 'port']);
      }).toThrow('Missing required configuration keys: host');
    });

    it('should treat undefined values as missing', () => {
      const config = { host: undefined, port: 3000 };
      expect(() => {
        validateRequiredKeys(config, ['host', 'port']);
      }).toThrow('Missing required configuration keys: host');
    });

    it('should handle multiple missing keys', () => {
      const config = { name: 'test' };
      expect(() => {
        validateRequiredKeys(config, ['host', 'port'] as (keyof typeof config)[]);
      }).toThrow('Missing required configuration keys: host, port');
    });
  });

  describe('filterEmptyValues', () => {
    it('should filter out empty values', () => {
      const config = {
        a: 1,
        b: '',
        c: null,
        d: undefined,
        e: 'valid',
        f: 0,
        g: false,
      };

      const result = filterEmptyValues(config);
      expect(result).toEqual({
        a: 1,
        e: 'valid',
        f: 0,
        g: false,
      });
    });
  });

  describe('unflattenConfig', () => {
    it('should unflatten dot-notation keys', () => {
      const flatConfig = {
        'database.host': 'localhost',
        'database.port': 5432,
        'redis.host': 'redis-server',
        'cache.ttl': 3600,
      };

      const result = unflattenConfig(flatConfig);
      expect(result).toEqual({
        database: {
          host: 'localhost',
          port: 5432,
        },
        redis: {
          host: 'redis-server',
        },
        cache: {
          ttl: 3600,
        },
      });
    });

    it('should handle custom separator', () => {
      const flatConfig = {
        database__host: 'localhost',
        database__port: 5432,
      };

      const result = unflattenConfig(flatConfig, '__');
      expect(result).toEqual({
        database: {
          host: 'localhost',
          port: 5432,
        },
      });
    });

    it('should handle nested paths', () => {
      const flatConfig = {
        'app.database.connection.host': 'localhost',
        'app.database.connection.port': 5432,
        'app.cache.redis.host': 'redis-server',
      };

      const result = unflattenConfig(flatConfig);
      expect(result).toEqual({
        app: {
          database: {
            connection: {
              host: 'localhost',
              port: 5432,
            },
          },
          cache: {
            redis: {
              host: 'redis-server',
            },
          },
        },
      });
    });
  });

  describe('flattenConfig', () => {
    it('should flatten nested object', () => {
      const nestedConfig = {
        database: {
          host: 'localhost',
          port: 5432,
        },
        redis: {
          host: 'redis-server',
        },
        cache: {
          ttl: 3600,
        },
      };

      const result = flattenConfig(nestedConfig);
      expect(result).toEqual({
        'database.host': 'localhost',
        'database.port': 5432,
        'redis.host': 'redis-server',
        'cache.ttl': 3600,
      });
    });

    it('should handle custom separator', () => {
      const nestedConfig = {
        database: {
          host: 'localhost',
          port: 5432,
        },
      };

      const result = flattenConfig(nestedConfig, '__');
      expect(result).toEqual({
        database__host: 'localhost',
        database__port: 5432,
      });
    });

    it('should handle deeply nested objects', () => {
      const nestedConfig = {
        app: {
          database: {
            connection: {
              host: 'localhost',
              port: 5432,
            },
          },
        },
      };

      const result = flattenConfig(nestedConfig);
      expect(result).toEqual({
        'app.database.connection.host': 'localhost',
        'app.database.connection.port': 5432,
      });
    });

    it('should handle arrays and primitive values', () => {
      const nestedConfig = {
        simple: 'value',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: {
          key: 'value',
        },
      };

      const result = flattenConfig(nestedConfig);
      expect(result).toEqual({
        simple: 'value',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        'nested.key': 'value',
      });
    });
  });

  describe('flatten and unflatten round trip', () => {
    it('should maintain data integrity in round trip', () => {
      const original = {
        database: {
          host: 'localhost',
          port: 5432,
          credentials: {
            username: 'admin',
            password: 'secret',
          },
        },
        redis: {
          host: 'redis-server',
          port: 6379,
        },
        features: {
          caching: true,
          logging: false,
        },
      };

      const flattened = flattenConfig(original);
      const unflattened = unflattenConfig(flattened);

      expect(unflattened).toEqual(original);
    });
  });

  describe('getErrorMessage', () => {
    it('should return error message for Error object', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('should return string for string input', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should convert non-string/non-Error to string', () => {
      expect(getErrorMessage(123)).toBe('123');
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
      expect(getErrorMessage({ error: 'object' })).toBe('[object Object]');
    });

    it('should handle boolean values', () => {
      expect(getErrorMessage(true)).toBe('true');
      expect(getErrorMessage(false)).toBe('false');
    });

    it('should handle arrays', () => {
      expect(getErrorMessage([1, 2, 3])).toBe('1,2,3');
    });

    it('should handle custom Error subclasses', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new CustomError('Custom error message');
      expect(getErrorMessage(error)).toBe('Custom error message');
    });
  });

  describe('validateSecretName', () => {
    it('should validate correct secret names', () => {
      expect(() => validateSecretName('valid-secret')).not.toThrow();
      expect(() => validateSecretName('valid_secret')).not.toThrow();
      expect(() => validateSecretName('valid.secret')).not.toThrow();
      expect(() => validateSecretName('valid/secret')).not.toThrow();
      expect(() => validateSecretName('validSecret123')).not.toThrow();
    });

    it('should throw for invalid secret names', () => {
      expect(() => validateSecretName('')).toThrow('Secret name must be a non-empty string');
      expect(() => validateSecretName('   ')).toThrow('Secret name cannot be empty or whitespace only');
      expect(() => validateSecretName('invalid secret')).toThrow('Secret name can only contain');
      expect(() => validateSecretName('invalid@secret')).toThrow('Secret name can only contain');
      expect(() => validateSecretName('a'.repeat(256))).toThrow('Secret name cannot exceed 255 characters');
    });

    it('should throw for non-string inputs', () => {
      expect(() => validateSecretName(null as unknown as string)).toThrow('Secret name must be a non-empty string');
      expect(() => validateSecretName(123 as unknown as string)).toThrow('Secret name must be a non-empty string');
      expect(() => validateSecretName(undefined as unknown as string)).toThrow(
        'Secret name must be a non-empty string',
      );
    });
  });

  describe('validateAccessKeyId', () => {
    it('should validate correct access key IDs', () => {
      expect(() => validateAccessKeyId('MOCK4G3D5E7F8H9I0J1K2L3M')).not.toThrow();
      expect(() => validateAccessKeyId('ABCDEFGHIJKLMNOP1234')).not.toThrow();
    });

    it('should throw for invalid access key IDs', () => {
      expect(() => validateAccessKeyId('')).toThrow('Access Key ID must be a non-empty string');
      expect(() => validateAccessKeyId('   ')).toThrow('Access Key ID cannot be empty');
      expect(() => validateAccessKeyId('too-short')).toThrow('Access Key ID must be between 16 and 32 characters');
      expect(() => validateAccessKeyId('a'.repeat(33))).toThrow('Access Key ID must be between 16 and 32 characters');
      expect(() => validateAccessKeyId('invalid-key-id@123')).toThrow(
        'Access Key ID can only contain letters and numbers',
      );
    });

    it('should throw for non-string inputs', () => {
      expect(() => validateAccessKeyId(null as unknown as string)).toThrow('Access Key ID must be a non-empty string');
      expect(() => validateAccessKeyId(123 as unknown as string)).toThrow('Access Key ID must be a non-empty string');
    });
  });

  describe('validateAccessKeySecret', () => {
    it('should validate correct access key secrets', () => {
      expect(() => validateAccessKeySecret('a'.repeat(30))).not.toThrow();
      expect(() => validateAccessKeySecret('validSecretKey12345678901234567890')).not.toThrow();
    });

    it('should throw for invalid access key secrets', () => {
      expect(() => validateAccessKeySecret('')).toThrow('Access Key Secret must be a non-empty string');
      expect(() => validateAccessKeySecret('   ')).toThrow('Access Key Secret cannot be empty');
      expect(() => validateAccessKeySecret('too-short')).toThrow(
        'Access Key Secret must be between 20 and 50 characters',
      );
      expect(() => validateAccessKeySecret('a'.repeat(51))).toThrow(
        'Access Key Secret must be between 20 and 50 characters',
      );
    });

    it('should throw for non-string inputs', () => {
      expect(() => validateAccessKeySecret(null as unknown as string)).toThrow(
        'Access Key Secret must be a non-empty string',
      );
      expect(() => validateAccessKeySecret(123 as unknown as string)).toThrow(
        'Access Key Secret must be a non-empty string',
      );
    });
  });

  describe('validateRegionId', () => {
    it('should validate correct region IDs', () => {
      expect(() => validateRegionId('cn-hangzhou')).not.toThrow();
      expect(() => validateRegionId('us-east-1')).not.toThrow();
      expect(() => validateRegionId('eu-central-1')).not.toThrow();
    });

    it('should throw for invalid region IDs', () => {
      expect(() => validateRegionId('')).toThrow('Region ID must be a non-empty string');
      expect(() => validateRegionId('   ')).toThrow('Region ID cannot be empty');
      expect(() => validateRegionId('Invalid_Region')).toThrow(
        'Region ID can only contain lowercase letters, numbers, and hyphens',
      );
      expect(() => validateRegionId('invalid@region')).toThrow(
        'Region ID can only contain lowercase letters, numbers, and hyphens',
      );
    });

    it('should throw for non-string inputs', () => {
      expect(() => validateRegionId(null as unknown as string)).toThrow('Region ID must be a non-empty string');
      expect(() => validateRegionId(123 as unknown as string)).toThrow('Region ID must be a non-empty string');
    });
  });

  describe('validateEndpoint', () => {
    it('should validate correct endpoints with protocol', () => {
      expect(() => validateEndpoint('https://kms.cn-hangzhou.aliyuncs.com')).not.toThrow();
      expect(() => validateEndpoint('http://localhost:8080')).not.toThrow();
    });

    it('should validate correct endpoints without protocol (auto-prepend https://)', () => {
      expect(() => validateEndpoint('kms.cn-beijing.aliyuncs.com')).not.toThrow();
      expect(() => validateEndpoint('kms.cn-hangzhou.aliyuncs.com')).not.toThrow();
      expect(() => validateEndpoint('localhost:8080')).not.toThrow();
      expect(() => validateEndpoint('example.com')).not.toThrow();
    });

    it('should throw for invalid endpoints', () => {
      expect(() => validateEndpoint('')).toThrow('Endpoint must be a non-empty string');
      expect(() => validateEndpoint('   ')).toThrow('Endpoint cannot be empty');
      expect(() => validateEndpoint('ftp://invalid.com')).toThrow('Endpoint must use HTTP or HTTPS protocol');
      expect(() => validateEndpoint('://invalid')).toThrow('Invalid endpoint URL');
    });

    it('should throw for non-string inputs', () => {
      expect(() => validateEndpoint(null as unknown as string)).toThrow('Endpoint must be a non-empty string');
      expect(() => validateEndpoint(123 as unknown as string)).toThrow('Endpoint must be a non-empty string');
    });
  });

  describe('sanitizeForLogging', () => {
    it('should sanitize sensitive data', () => {
      const data = {
        accessKeyId: 'MOCKACCESSKEYIDFORTESTING',
        accessKeySecret: 'secret-key-value',
        secretData: 'sensitive-data',
        normalField: 'normal-value',
      };

      const sanitized = sanitizeForLogging(data);
      expect(sanitized).toEqual({
        accessKeyId: '[REDACTED]',
        accessKeySecret: '[REDACTED]',
        secretData: '[REDACTED]',
        normalField: 'normal-value',
      });
    });

    it('should handle nested objects', () => {
      const data = {
        config: {
          client: {
            accessKeySecret: 'secret-value',
            endpoint: 'https://example.com',
          },
        },
        normalField: 'value',
      };

      const sanitized = sanitizeForLogging(data);
      expect(sanitized).toEqual({
        config: {
          client: {
            accessKeySecret: '[REDACTED]',
            endpoint: 'https://example.com',
          },
        },
        normalField: 'value',
      });
    });

    it('should handle arrays', () => {
      const data = [{ accessKeySecret: 'secret1' }, { normalField: 'value1' }, { password: 'secret2' }];

      const sanitized = sanitizeForLogging(data);
      expect(sanitized).toEqual([
        { accessKeySecret: '[REDACTED]' },
        { normalField: 'value1' },
        { password: '[REDACTED]' },
      ]);
    });

    it('should handle non-object types', () => {
      expect(sanitizeForLogging('string')).toBe('string');
      expect(sanitizeForLogging(123)).toBe(123);
      expect(sanitizeForLogging(null)).toBe(null);
      expect(sanitizeForLogging(undefined)).toBe(undefined);
    });
  });
});
