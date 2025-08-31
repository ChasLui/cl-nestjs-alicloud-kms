import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // 启用 CORS
    app.enableCors();

    // 设置全局前缀
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 KMS Demo Application is running on: http://localhost:${port}`);
    logger.log(`📖 API Documentation: http://localhost:${port}/api`);
    logger.log(`🔐 KMS Health Check: http://localhost:${port}/api/kms/health`);
    logger.log(`⚙️  Configuration Demo: http://localhost:${port}/api/config`);
  } catch (error) {
    logger.error(`❌ Failed to start application: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

bootstrap();
