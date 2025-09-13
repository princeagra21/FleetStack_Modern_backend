import { Module } from '@nestjs/common';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminService } from './superadmin.service';
import { DatabaseModule } from '../../database/database.module';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
  ],
  controllers: [
    SuperAdminController,
  ],
  providers: [
    SuperAdminService,
  ],
  exports: [
    SuperAdminService,
  ],
})
export class SuperAdminModule {}
