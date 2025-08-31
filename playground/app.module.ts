import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KMS_CONFIG_TOKEN } from '@/index';
import { KmsController } from './kms.controller';
import { ConfigController } from './config.controller';
import { AppConfigService } from './app-config.service';
import { DemoKmsService } from './demo-kms.service';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [KmsController, ConfigController],
  providers: [
    // 配置演示用的 KMS 模块
    {
      provide: KMS_CONFIG_TOKEN,
      useValue: {
        client: {
          accessKeyId: process.env.ALICLOUD_ACCESS_KEY_ID || 'demo-access-key-id',
          accessKeySecret: process.env.ALICLOUD_ACCESS_KEY_SECRET || 'demo-access-key-secret',
          regionId: process.env.ALICLOUD_REGION_ID || 'cn-hangzhou',
          endpoint: process.env.ALICLOUD_KMS_ENDPOINT || 'https://kms.cn-hangzhou.aliyuncs.com',
        },
        defaultSecretName: process.env.DEFAULT_SECRET_NAME || 'demo-app-config',
        enableLogging: process.env.NODE_ENV !== 'production',
      },
    },
    AppConfigService,
    DemoKmsService,
  ],
})
export class AppModule {}
