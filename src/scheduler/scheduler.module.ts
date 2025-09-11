import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';

/**
 * Scheduler Module
 * 
 * Provides enterprise-grade cron job scheduling capabilities for FleetStack.
 * Uses node-cron for reliable task scheduling with monitoring and management features.
 * 
 * Features:
 * - Cron job scheduling and management
 * - Job lifecycle control (start, stop, remove)
 * - Execution monitoring and error tracking
 * - Health checks and status reporting
 * - Common scheduling patterns
 * 
 * Usage Examples:
 * - Daily data backups
 * - Periodic cache cleanup
 * - System health monitoring
 * - Log rotation and maintenance
 * - Report generation
 * - Email notifications
 */

@Module({
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}