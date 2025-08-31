import { Controller, Get, Post, Param, Body, HttpException, HttpStatus } from '@nestjs/common';

@Controller('kms')
export class KmsController {
  constructor() {}

  /**
   * 健康检查端点
   */
  @Get('health')
  async checkHealth() {
    try {
      // 在演示模式下，模拟健康检查
      const isHealthy = Math.random() > 0.1; // 90% 概率返回健康状态

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        service: 'kms',
        timestamp: new Date().toISOString(),
        demo: true,
        message: isHealthy ? 'KMS service is running normally (demo mode)' : 'KMS service check failed (demo mode)',
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          demo: true,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * 获取密钥信息（演示模式）
   */
  @Get('secret/:name')
  async getSecret(@Param('name') secretName: string) {
    try {
      // 在演示模式下，返回模拟数据
      const mockSecrets = {
        'app-config': JSON.stringify({
          'database.host': 'prod-db.example.com',
          'database.port': '5432',
          'database.name': 'myapp',
          'redis.host': 'redis.example.com',
          'redis.port': '6379',
        }),
        'api-keys': JSON.stringify({
          'jwt.secret': 'your-jwt-secret-key',
          'encryption.key': 'your-encryption-key',
        }),
        'database-password': 'super-secure-password-123',
      };

      const secretValue = mockSecrets[secretName as keyof typeof mockSecrets] || `Mock secret value for: ${secretName}`;

      return {
        secretName,
        value: secretValue,
        demo: true,
        message: 'This is a mock secret value for demonstration purposes',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          error: 'Failed to fetch secret',
          message: error instanceof Error ? error.message : String(error),
          demo: true,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 批量获取密钥
   */
  @Post('secrets/batch')
  async getMultipleSecrets(@Body() body: { secretNames: string[] }) {
    try {
      const { secretNames } = body;

      if (!Array.isArray(secretNames)) {
        throw new HttpException('secretNames must be an array', HttpStatus.BAD_REQUEST);
      }

      const results: Record<string, string> = {};

      // 模拟批量获取
      for (const name of secretNames) {
        results[name] = `Mock value for ${name}`;
      }

      return {
        results,
        count: secretNames.length,
        demo: true,
        message: 'Batch secret retrieval completed (demo mode)',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          error: 'Failed to fetch multiple secrets',
          message: error instanceof Error ? error.message : String(error),
          demo: true,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取 KMS 客户端信息
   */
  @Get('info')
  async getKmsInfo() {
    return {
      service: 'Alicloud KMS Integration',
      version: '1.0.0',
      demo: true,
      features: [
        'Secret retrieval',
        'JSON parsing',
        'Batch operations',
        'Health monitoring',
        'Configuration management',
      ],
      endpoints: {
        health: 'GET /api/kms/health',
        secret: 'GET /api/kms/secret/:name',
        batch: 'POST /api/kms/secrets/batch',
        info: 'GET /api/kms/info',
      },
      message: 'This is a demonstration of the cl-nestjs-alicloud-kms library',
    };
  }
}
