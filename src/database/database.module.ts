import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { DatabaseEarlyInitService } from './services/database-early-init.service';
import { PrimaryDatabaseService } from './services/primary-database.service';
import { LogsDatabaseService } from './services/logs-database.service';
import { AddressDatabaseService } from './services/address-database.service';
import { DatabaseSchemaSyncService } from './services/database-schema-sync.service';
import { PrismaClientEnsureService } from './services/prisma-client-ensure.service';
import { DatabaseSchemaController } from './controllers/database-schema.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [DatabaseSchemaController],
  providers: [
    PrismaClientEnsureService,
    DatabaseEarlyInitService,
    DatabaseSchemaSyncService,
    PrimaryDatabaseService,
    LogsDatabaseService,
    AddressDatabaseService,
  ],
  exports: [
    PrismaClientEnsureService,
    PrimaryDatabaseService,
    LogsDatabaseService,
    AddressDatabaseService,
    DatabaseSchemaSyncService,
  ],
})
export class DatabaseModule {}