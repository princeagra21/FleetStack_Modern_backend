import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseSchemaSyncService } from './database-schema-sync.service';

/**
 * This service initializes very early to ensure databases are created
 * before other database services try to connect to them
 */
@Injectable()
export class DatabaseEarlyInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseEarlyInitService.name);
  private static initialized = false;

  constructor(
    private readonly schemaSyncService: DatabaseSchemaSyncService,
  ) {}

  async onModuleInit() {
    // Ensure this only runs once, even if multiple instances are created
    if (DatabaseEarlyInitService.initialized) {
      this.logger.debug('Database initialization already completed, skipping...');
      return;
    }

    this.logger.log('🚀 Starting fully automated database initialization...');
    
    try {
      const nodeEnv = process.env.NODE_ENV || 'development';
      
      this.logger.log(`🏗️ Using intelligent Prisma automation for database and schema management...`);
      this.logger.log(`🌍 Environment: ${nodeEnv} | Auto-detection enabled`);
      
      // Run schema synchronization - Prisma will automatically choose the best strategy
      const result = await this.schemaSyncService.manualSync();
      
      // Run seeds automatically regardless of environment flags
      try {
        await this.schemaSyncService.runSeeds();
      } catch (seedErr: any) {
        this.logger.error('❌ Automatic seeding failed:', seedErr?.message || seedErr);
      }

      if (result.success) {
        DatabaseEarlyInitService.initialized = true;
        this.logger.log('✅ Fully automated database initialization completed successfully');
        this.logger.log('✅ All databases and tables created/synchronized automatically');
      } else {
        this.logger.error(`❌ Automated database initialization failed: ${result.message}`);
        // Still mark as initialized to prevent blocking the app
        DatabaseEarlyInitService.initialized = true;
      }
      
    } catch (error: any) {
      this.logger.error('❌ Automated database initialization failed:', error);
      // Mark as initialized anyway to prevent blocking the app
      DatabaseEarlyInitService.initialized = true;
    }
  }

  static isInitialized(): boolean {
    return DatabaseEarlyInitService.initialized;
  }
}
