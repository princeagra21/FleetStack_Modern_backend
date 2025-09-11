import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { PrimaryDatabaseService } from './services/primary-database.service';
import { LogsDatabaseService } from './services/logs-database.service';
import { AddressDatabaseService } from './services/address-database.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrimaryDatabaseService,
    LogsDatabaseService,
    AddressDatabaseService,
  ],
  exports: [
    PrimaryDatabaseService,
    LogsDatabaseService,
    AddressDatabaseService,
  ],
})
export class DatabaseModule {}