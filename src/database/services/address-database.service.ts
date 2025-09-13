import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/address';
import { ConfigService } from '../../config/config.service';
import { DatabaseEarlyInitService } from './database-early-init.service';

@Injectable()
export class AddressDatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AddressDatabaseService.name);
  
  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.addressDatabase.url,
        },
      },
    });
  }

  async onModuleInit() {
    // Wait a moment for early initialization to complete
    let retries = 0;
    const maxRetries = 10;
    
    while (!DatabaseEarlyInitService.isInitialized() && retries < maxRetries) {
      this.logger.debug(`Waiting for database initialization... (${retries + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      retries++;
    }
    
    try {
      await this.$connect();
      this.logger.log('✅ Address database connected successfully');
    } catch (error: any) {
      // Check if it's a database not found error (P1003)
      if (error?.code === 'P1003' || error?.message?.includes('does not exist')) {
        this.logger.warn('⚠️ Address database does not exist yet - this might be expected during first startup');
        // Don't throw error - database might be created later
        return;
      }
      
      // For other errors, log and throw
      this.logger.error('❌ Failed to connect to address database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: any) {
    // Shutdown hooks can be handled by NestJS lifecycle events
    // this.$on is not needed as onModuleDestroy already handles cleanup
  }
}