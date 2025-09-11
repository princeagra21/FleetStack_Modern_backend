import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { UserProcessor } from './processors/user.processor';
import { QueueController } from './queue.controller';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', '127.0.0.1'),
          port: parseInt(configService.get('REDIS_PORT', '6379')),
          password: configService.get('REDIS_PASSWORD'),
          connectTimeout: 10000,
          lazyConnect: false,
          maxRetriesPerRequest: 3,
          enableOfflineQueue: true,
          retryStrategy: (times) => Math.min(times * 100, 2000),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'notification' },
      { name: 'user-processing' }
    ),
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    EmailProcessor,
    NotificationProcessor,
    UserProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}