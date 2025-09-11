import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/logs';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class LogsDatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.logsDatabase.url,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: any) {
    // Shutdown hooks can be handled by NestJS lifecycle events
    // this.$on is not needed as onModuleDestroy already handles cleanup
  }
}