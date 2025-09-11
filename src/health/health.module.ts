import { Module } from '@nestjs/common';
import { TerminusModule, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { CustomHealthIndicator } from './indicators/custom-health.indicator';
// Note: Redis and Scheduler health checks integrated into CustomHealthIndicator for now
import { PrismaHealthIndicator } from './indicators/prisma-health.indicator';
import { RedisModule } from '../redis/redis.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { DatabaseModule } from '../database/database.module';

// Disable TypeORM health indicator since we don't use TypeORM
const disabledTypeOrmIndicator = {
  pingCheck: () => Promise.reject(new Error('TypeORM health check disabled - using Prisma instead')),
};

/**
 * Health Module
 * 
 * Provides comprehensive application health monitoring using @nestjs/terminus.
 * Includes health indicators for various services and system components.
 * 
 * Features:
 * - Built-in health indicators (Memory, Disk, Database)
 * - Custom health indicators (Redis, Scheduler, Application)
 * - Health check endpoints with detailed reporting
 * - Graceful degradation and service monitoring
 * - Prometheus-compatible health metrics
 * 
 * Endpoints:
 * - GET /health: Basic health check
 * - GET /health/detailed: Comprehensive health report
 * - GET /health/live: Liveness probe (Kubernetes)
 * - GET /health/ready: Readiness probe (Kubernetes)
 */

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    RedisModule,
    SchedulerModule,
    DatabaseModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    CustomHealthIndicator,
    PrismaHealthIndicator,
    // Override TypeOrmHealthIndicator to prevent auto-loading issues
    { provide: TypeOrmHealthIndicator, useValue: disabledTypeOrmIndicator },
  ],
  exports: [HealthService, PrismaHealthIndicator],
})
export class HealthModule {}