import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AbuseDetectionService } from './abuse-detection/abuse-detection.service';
import { AbuseDetectionInterceptor } from './interceptors/abuse-detection.interceptor';
import { SecurityController } from './controllers/security.controller';
import { SecurityMetricsController } from './controllers/metrics.controller';
import { RateLimitService } from './services/rate-limit.service';
import { IPExtractionService } from './services/ip-extraction.service';
import { SecurityMetricsService } from './services/metrics.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { ConfigModule } from '../config/config.module';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
  imports: [ConfigModule, RedisModule],
  controllers: [SecurityController, SecurityMetricsController],
  providers: [
    AbuseDetectionService,
    RateLimitService,
    IPExtractionService,
    SecurityMetricsService,
    CircuitBreakerService,
    AbuseDetectionInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AbuseDetectionInterceptor,
    },
  ],
  exports: [
    AbuseDetectionService,
    RateLimitService,
    IPExtractionService,
    SecurityMetricsService,
    AbuseDetectionInterceptor,
  ],
})
export class SecurityModule {}