import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisController } from './redis.controller';
import { DatabaseModule } from '../database/database.module';
import { ConfigModule } from '../config/config.module';

@Global()
@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [RedisController],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}