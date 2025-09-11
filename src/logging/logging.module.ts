import { Global, Module } from '@nestjs/common';
import { WinstonLoggerService } from './winston-logger.service';
import { ConfigModule } from '../config/config.module';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [WinstonLoggerService],
  exports: [WinstonLoggerService],
})
export class LoggingModule {}