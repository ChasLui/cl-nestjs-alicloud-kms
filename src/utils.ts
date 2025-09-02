/**
 * 配置工具函数
 * 提供配置合并、验证、转换等实用功能
 */

/**
 * 类型守卫函数：检查是否为 Error 对象
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * 安全获取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * 验证密钥名称是否有效
 * @param secretName 密钥名称
 * @throws Error 如果密钥名称无效
 */
export function validateSecretName(secretName: string): void {
  if (!secretName || typeof secretName !== 'string') {
    throw new Error('Secret name must be a non-empty string');
  }

  const trimmed = secretName.trim();
  if (trimmed.length === 0) {
    throw new Error('Secret name cannot be empty or whitespace only');
  }

  if (trimmed.length > 255) {
    throw new Error('Secret name cannot exceed 255 characters');
  }

  // 阿里云 KMS 密钥名称规则
  const validPattern = /^[a-zA-Z0-9/_.-]+$/;
  if (!validPattern.test(trimmed)) {
    throw new Error(
      'Secret name can only contain letters, numbers, underscores, hyphens, periods, and forward slashes',
    );
  }
}

/**
 * 验证 Access Key ID 格式
 */
export function validateAccessKeyId(accessKeyId: string): void {
  if (!accessKeyId || typeof accessKeyId !== 'string') {
    throw new Error('Access Key ID must be a non-empty string');
  }

  const trimmed = accessKeyId.trim();
  if (trimmed.length === 0) {
    throw new Error('Access Key ID cannot be empty');
  }

  // 阿里云 Access Key ID 通常是 16-32 位字母数字组合
  if (trimmed.length < 16 || trimmed.length > 32) {
    throw new Error('Access Key ID must be between 16 and 32 characters');
  }

  const validPattern = /^[A-Za-z0-9]+$/;
  if (!validPattern.test(trimmed)) {
    throw new Error('Access Key ID can only contain letters and numbers');
  }
}

/**
 * 验证 Access Key Secret 格式
 */
export function validateAccessKeySecret(accessKeySecret: string): void {
  if (!accessKeySecret || typeof accessKeySecret !== 'string') {
    throw new Error('Access Key Secret must be a non-empty string');
  }

  const trimmed = accessKeySecret.trim();
  if (trimmed.length === 0) {
    throw new Error('Access Key Secret cannot be empty');
  }

  // 阿里云 Access Key Secret 通常是 30 位字符
  if (trimmed.length < 20 || trimmed.length > 50) {
    throw new Error('Access Key Secret must be between 20 and 50 characters');
  }
}

/**
 * 验证地域 ID
 */
export function validateRegionId(regionId: string): void {
  if (!regionId || typeof regionId !== 'string') {
    throw new Error('Region ID must be a non-empty string');
  }

  const trimmed = regionId.trim();
  if (trimmed.length === 0) {
    throw new Error('Region ID cannot be empty');
  }

  // 基本的地域 ID 格式检查
  const validPattern = /^[a-z0-9-]+$/;
  if (!validPattern.test(trimmed)) {
    throw new Error('Region ID can only contain lowercase letters, numbers, and hyphens');
  }
}

/**
 * 验证端点 URL
 * 支持带协议和不带协议的端点，不带协议时默认使用 https://
 */
export function validateEndpoint(endpoint: string): void {
  if (!endpoint || typeof endpoint !== 'string') {
    throw new Error('Endpoint must be a non-empty string');
  }

  const trimmed = endpoint.trim();
  if (trimmed.length === 0) {
    throw new Error('Endpoint cannot be empty');
  }

  try {
    // 如果没有协议，默认添加 https://
    let urlToValidate = trimmed;
    if (!trimmed.includes('://')) {
      urlToValidate = `https://${trimmed}`;
    }

    const url = new URL(urlToValidate);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Endpoint must use HTTP or HTTPS protocol');
    }
  } catch (error) {
    throw new Error(`Invalid endpoint URL: ${getErrorMessage(error)}`);
  }
}

/**
 * 清理敏感数据用于日志记录
 * @param data 原始数据
 * @returns 清理后的数据
 */
export function sanitizeForLogging(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = ['secret', 'password', 'token', 'key'];

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLogging(item));
  }

  const sanitized: Record<string, unknown> = {};
  Object.keys(data as Record<string, unknown>).forEach((key) => {
    const value = (data as Record<string, unknown>)[key];
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.some((sensitiveKey) => lowerKey.includes(sensitiveKey))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * 深度合并配置对象的工具函数
 * @param target 目标配置对象（优先级较低）
 * @param source 源配置对象（优先级较高）
 * @returns 合并后的配置对象
 */
export function mergeConfig<T extends Record<string, unknown>>(
  target: T | undefined | null,
  source: T | undefined | null,
): T {
  // 如果两个都为空，返回空对象
  if (!target && !source) {
    return {} as T;
  }

  // 如果目标为空，返回源配置
  if (!target) {
    return { ...source } as T;
  }

  // 如果源为空，返回目标配置
  if (!source) {
    return { ...target } as T;
  }

  // 获取所有唯一的键
  const allKeys = new Set([...Object.keys(target), ...Object.keys(source)]);

  const result = {} as T;

  // 遍历所有键进行合并
  allKeys.forEach((key) => {
    const targetValue = target[key];
    const sourceValue = source[key];

    // 源配置优先，如果源配置中有该键，使用源配置的值
    if (sourceValue !== undefined && sourceValue !== null) {
      (result as Record<string, unknown>)[key] = sourceValue;
    } else if (targetValue !== undefined && targetValue !== null) {
      (result as Record<string, unknown>)[key] = targetValue;
    }
  });

  return result;
}

/**
 * 深度合并多个配置对象
 * @param configs 配置对象数组，后面的配置优先级更高
 * @returns 合并后的配置对象
 */
export function mergeMultipleConfigs<T extends Record<string, unknown>>(...configs: (T | undefined | null)[]): T {
  return configs.reduce((result, config) => {
    return mergeConfig(result, config || ({} as T));
  }, {} as T) as T;
}

/**
 * 验证必需的配置键是否存在
 * @param config 配置对象
 * @param requiredKeys 必需的键数组
 * @throws Error 如果缺少必需的键
 */
export function validateRequiredKeys<T extends Record<string, unknown>>(config: T, requiredKeys: (keyof T)[]): void {
  const missingKeys = requiredKeys.filter(
    (key) => config[key] === undefined || config[key] === null || config[key] === '',
  );

  if (missingKeys.length > 0) {
    throw new Error(`Missing required configuration keys: ${missingKeys.join(', ')}`);
  }
}

/**
 * 过滤掉空值（undefined, null, 空字符串）
 * @param config 配置对象
 * @returns 过滤后的配置对象
 */
export function filterEmptyValues<T extends Record<string, unknown>>(config: T): Partial<T> {
  const result: Partial<T> = {};

  Object.keys(config).forEach((key) => {
    const value = config[key];
    if (value !== undefined && value !== null && value !== '') {
      (result as Record<string, unknown>)[key] = value;
    }
  });

  return result;
}

/**
 * 将扁平的配置对象转换为嵌套对象
 * 例如: { 'database.host': 'localhost' } => { database: { host: 'localhost' } }
 * @param flatConfig 扁平配置对象
 * @param separator 分隔符，默认为 '.'
 * @returns 嵌套配置对象
 */
export function unflattenConfig<T = unknown>(flatConfig: Record<string, unknown>, separator = '.'): T {
  const result: Record<string, unknown> = {};

  Object.keys(flatConfig).forEach((key) => {
    const value = flatConfig[key];
    const keys = key.split(separator);

    let current: Record<string, unknown> = result;
    for (let i = 0; i < keys.length - 1; i++) {
      const currentKey = keys[i];
      if (!(currentKey in current)) {
        current[currentKey] = {};
      }
      current = current[currentKey] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  });

  return result as T;
}

/**
 * 将嵌套对象扁平化
 * 例如: { database: { host: 'localhost' } } => { 'database.host': 'localhost' }
 * @param nestedConfig 嵌套配置对象
 * @param separator 分隔符，默认为 '.'
 * @param prefix 前缀
 * @returns 扁平配置对象
 */
export function flattenConfig(
  nestedConfig: Record<string, unknown>,
  separator = '.',
  prefix = '',
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  Object.keys(nestedConfig).forEach((key) => {
    const value = nestedConfig[key];
    const fullKey = prefix ? `${prefix}${separator}${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // 递归处理嵌套对象
      Object.assign(result, flattenConfig(value as Record<string, unknown>, separator, fullKey));
    } else {
      result[fullKey] = value;
    }
  });

  return result;
}
