import { Injectable, Inject, Logger } from '@nestjs/common';
import { KMS_CONFIG_TOKEN, type KmsModuleConfig, getErrorMessage } from '@/index';

/**
 * 模拟 KMS 客户端 - 仅用于演示目的
 */
interface MockKmsRequest {
  secretName: string;
}

class MockKmsClient {
  constructor() {}

  async getSecretValue(request: MockKmsRequest) {
    // 模拟数据
    const mockSecrets: Record<string, string> = {
      'demo-app-config': JSON.stringify({
        'database.host': 'prod-db.example.com',
        'database.port': '5432',
        'database.name': 'myapp',
        'database.user': 'postgres',
        'database.password': 'kms-secret-password',
        'redis.host': 'redis.example.com',
        'redis.port': '6379',
        'redis.password': 'kms-redis-password',
        'app.name': 'KMS Demo App',
        'app.version': '1.0.0',
        'app.debug': true,
      }),
      'api-keys': JSON.stringify({
        'jwt.secret': 'your-jwt-secret-key',
        'encryption.key': 'your-encryption-key',
      }),
      'database-password': 'super-secure-password-123',
    };

    const secretData = mockSecrets[request.secretName] || `Mock secret value for: ${request.secretName}`;

    return {
      body: {
        secretData,
      },
    };
  }
}

/**
 * 演示用 KMS 服务 - 使用模拟客户端
 * 这个服务专门用于演示，不影响核心库代码
 */
@Injectable()
export class DemoKmsService {
  private readonly logger = new Logger(DemoKmsService.name);
  private readonly kmsClient: MockKmsClient;

  constructor(
    @Inject(KMS_CONFIG_TOKEN)
    private readonly config: KmsModuleConfig,
  ) {
    // 在演示模式下使用模拟客户端
    this.kmsClient = new MockKmsClient();

    if (this.config.enableLogging) {
      this.logger.log('Demo KMS Service initialized with mock client');
    }
  }

  /**
   * 获取指定密钥的值
   * @param secretName 密钥名称
   * @returns 密钥数据
   */
  async getSecretValue(secretName: string): Promise<string> {
    try {
      if (this.config.enableLogging) {
        this.logger.log(`Fetching secret: ${secretName} (demo mode)`);
      }

      const request = {
        secretName,
      };

      const response = await this.kmsClient.getSecretValue(request);
      const secretData = response.body?.secretData || '';

      if (this.config.enableLogging) {
        this.logger.log(`Successfully fetched secret: ${secretName} (demo mode)`);
      }

      return secretData;
    } catch (error) {
      this.logger.error(`Failed to fetch secret ${secretName}:`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * 获取默认密钥的值
   * @returns 密钥数据
   */
  async getDefaultSecretValue(): Promise<string> {
    if (!this.config.defaultSecretName) {
      throw new Error('Default secret name is not configured');
    }
    return this.getSecretValue(this.config.defaultSecretName);
  }

  /**
   * 获取密钥并解析为 JSON 数据
   * @param secretName 密钥名称
   * @returns 解析后的 JSON 数据（任意类型）
   */
  async getSecretValueAsJson(secretName: string): Promise<unknown> {
    const secretData = await this.getSecretValue(secretName);

    try {
      return JSON.parse(secretData);
    } catch (error) {
      this.logger.error(`Failed to parse secret ${secretName} as JSON:`, getErrorMessage(error));
      throw new Error(`Invalid JSON format in secret ${secretName}`);
    }
  }

  /**
   * 获取默认密钥并解析为 JSON 数据
   * @returns 解析后的 JSON 数据（任意类型）
   */
  async getDefaultSecretValueAsJson(): Promise<unknown> {
    if (!this.config.defaultSecretName) {
      throw new Error('Default secret name is not configured');
    }
    return this.getSecretValueAsJson(this.config.defaultSecretName);
  }

  /**
   * 批量获取多个密钥
   * @param secretNames 密钥名称数组
   * @returns 密钥数据映射表
   */
  async getMultipleSecrets(secretNames: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    await Promise.all(
      secretNames.map(async (secretName) => {
        try {
          results[secretName] = await this.getSecretValue(secretName);
        } catch (error) {
          this.logger.error(`Failed to fetch secret ${secretName}:`, getErrorMessage(error));
          throw error;
        }
      }),
    );

    return results;
  }

  /**
   * 检查 KMS 服务连接状态
   * @returns 连接是否正常
   */
  async checkConnection(): Promise<boolean> {
    try {
      if (this.config.defaultSecretName) {
        await this.getSecretValue(this.config.defaultSecretName);
      } else {
        this.logger.warn('No default secret configured for connection check');
      }
      return true;
    } catch (error) {
      this.logger.error('KMS connection check failed:', getErrorMessage(error));
      return false;
    }
  }

  /**
   * 获取 KMS 客户端实例（高级用法）
   * @returns KMS 客户端实例
   */
  getKmsClient(): MockKmsClient {
    return this.kmsClient;
  }
}
