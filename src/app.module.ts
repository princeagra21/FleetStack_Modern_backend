import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { TestModule } from './modules/test/test.module';
import { LoggerModule } from './common/modules/logger.module';

@Module({
  imports: [HealthModule, TestModule, LoggerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
