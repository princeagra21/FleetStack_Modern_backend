import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD, APP_FILTER } from '@nestjs/core';
// import { I18nModule, QueryResolver, AcceptLanguageResolver, HeaderResolver } from 'nestjs-i18n';
// import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { LoggingModule } from './logging/logging.module';
import { RedisModule } from './redis/redis.module';
import { SecurityModule } from './security/security.module';
import { SchedulerModule } from './scheduler/scheduler.module';
// Replaced by comprehensive HealthModule with Terminus integration
import { HealthModule } from './health/health.module';
import { QueueModule } from './queue/queue.module';
import { ExamplesModule } from './examples/examples.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ErrorLoggingInterceptor } from './common/interceptors/error-logging.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule,
    // Internationalization (i18n) configuration
    // TODO: Temporarily disabled due to dependency issues
    // I18nModule.forRoot({
    //   fallbackLanguage: 'en',
    //   loaderOptions: {
    //     path: path.join(__dirname, '/i18n/'),
    //     watch: true,
    //   },
    // }),
    LoggingModule,
    DatabaseModule,
    SecurityModule,
    RedisModule,
    SchedulerModule,
    HealthModule,
    AuthModule,
    UsersModule,
    QueueModule,
    ExamplesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global exception filter for consistent error handling
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorLoggingInterceptor,
    },
    // Global guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
