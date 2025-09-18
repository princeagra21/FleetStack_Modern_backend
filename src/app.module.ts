import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { TestModule } from './modules/test/test.module';
import { AuthModule } from './modules/auth/auth.module';
import { WinstonLoggerModule } from './common/modules/winston-logger.module';

@Module({
  imports: [WinstonLoggerModule, HealthModule, TestModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
