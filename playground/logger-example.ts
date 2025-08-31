import { Injectable, Logger, Module } from '@nestjs/common';
import { KmsModule, LoggerInterface, KmsModuleOptions, LogParams } from '../src';

/**
 * 自定义 Logger 实现示例
 * 可以是 Winston、Pino 或其他日志库的实例
 */
@Injectable()
export class CustomLoggerService implements LoggerInterface {
  private readonly logger = new Logger('CustomKmsLogger');

  log(message: string, ...optionalParams: LogParams): void {
    this.logger.log(`[CUSTOM] ${message}`, ...optionalParams);
  }

  error(message: string, ...optionalParams: LogParams): void {
    this.logger.error(`[CUSTOM ERROR] ${message}`, ...optionalParams);
  }

  warn(message: string, ...optionalParams: LogParams): void {
    this.logger.warn(`[CUSTOM WARN] ${message}`, ...optionalParams);
  }

  debug?(message: string, ...optionalParams: LogParams): void {
    this.logger.debug(`[CUSTOM DEBUG] ${message}`, ...optionalParams);
  }

  verbose?(message: string, ...optionalParams: LogParams): void {
    this.logger.verbose(`[CUSTOM VERBOSE] ${message}`, ...optionalParams);
  }
}

/**
 * 单例 Logger 服务示例
 * 在生产环境中，通常会有一个全局的单例 logger
 */
class SingletonLogger implements LoggerInterface {
  private static instance: SingletonLogger;
  private readonly logger = new Logger('SingletonKmsLogger');

  static getInstance(): SingletonLogger {
    if (!SingletonLogger.instance) {
      SingletonLogger.instance = new SingletonLogger();
    }
    return SingletonLogger.instance;
  }

  log(message: string, ...optionalParams: LogParams): void {
    this.logger.log(`[SINGLETON] ${message}`, ...optionalParams);
  }

  error(message: string, ...optionalParams: LogParams): void {
    this.logger.error(`[SINGLETON ERROR] ${message}`, ...optionalParams);
  }

  warn(message: string, ...optionalParams: LogParams): void {
    this.logger.warn(`[SINGLETON WARN] ${message}`, ...optionalParams);
  }
}

// 方式 1: 使用 forRootWithLogger 方法注册自定义 Logger 提供者
const kmsModuleOptions: KmsModuleOptions = {
  config: {
    client: {
      accessKeyId: 'your-access-key-id',
      accessKeySecret: 'your-access-key-secret',
      regionId: 'cn-hangzhou',
    },
    enableLogging: true,
  },
  loggerProvider: {
    provide: 'KMS_LOGGER',
    useClass: CustomLoggerService,
  },
  global: true,
};

@Module({
  imports: [KmsModule.forRootWithLogger(kmsModuleOptions)],
})
export class AppModuleWithCustomLogger {}

// 方式 2: 使用 forRootAsync 方法注册自定义 Logger 提供者
@Module({
  imports: [
    KmsModule.forRootAsync({
      useFactory: () => ({
        client: {
          accessKeyId: 'your-access-key-id',
          accessKeySecret: 'your-access-key-secret',
          regionId: 'cn-hangzhou',
        },
        enableLogging: true,
      }),
      loggerProvider: {
        provide: 'KMS_LOGGER',
        useValue: SingletonLogger.getInstance(),
      },
      global: true,
    }),
  ],
})
export class AppModuleWithAsyncLogger {}

// 方式 3: 通过配置对象传入 logger 实例
@Module({
  imports: [
    KmsModule.forRoot({
      client: {
        accessKeyId: 'your-access-key-id',
        accessKeySecret: 'your-access-key-secret',
        regionId: 'cn-hangzhou',
      },
      enableLogging: true,
      logger: SingletonLogger.getInstance(), // 直接传入 logger 实例
    }),
  ],
})
export class AppModuleWithConfigLogger {}

// 方式 4: 在应用模块中单独注册 Logger 并通过 DI 使用
@Module({
  providers: [
    {
      provide: 'GLOBAL_LOGGER',
      useValue: SingletonLogger.getInstance(),
    },
  ],
  exports: ['GLOBAL_LOGGER'],
})
export class LoggerModule {}

@Module({
  imports: [
    LoggerModule,
    KmsModule.forRootAsync({
      useFactory: () => ({
        client: {
          accessKeyId: 'your-access-key-id',
          accessKeySecret: 'your-access-key-secret',
          regionId: 'cn-hangzhou',
        },
        enableLogging: true,
      }),
      loggerProvider: {
        provide: 'KMS_LOGGER',
        useExisting: 'GLOBAL_LOGGER',
      },
    }),
  ],
})
export class AppModuleWithGlobalLogger {}
