import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { SchedulerService } from '../../scheduler/scheduler.service';

/**
 * Scheduler Health Indicator
 * 
 * Monitors the node-cron scheduler service health and job execution status.
 * Provides insights into background job performance and system reliability.
 * 
 * Health Checks:
 * - Scheduler service availability
 * - Job execution status
 * - Error rates and failure patterns
 * - System resource usage
 * - Job queue health
 */

@Injectable()
export class SchedulerHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(SchedulerHealthIndicator.name);

  constructor(private readonly schedulerService: SchedulerService) {
    super();
  }

  /**
   * Main scheduler health check
   */
  async isHealthy(key: string = 'scheduler'): Promise<HealthIndicatorResult> {
    try {
      // Get scheduler health status
      const schedulerHealth = this.schedulerService.getHealthStatus();
      const allJobs = this.schedulerService.getAllJobs();
      
      // Calculate health metrics
      const metrics = this.calculateHealthMetrics(allJobs, schedulerHealth);
      
      // Determine if scheduler is healthy
      const isHealthy = this.evaluateHealth(metrics);
      
      const healthData = {
        status: isHealthy ? 'up' : 'degraded',
        jobs: {
          total: schedulerHealth.totalJobs,
          running: schedulerHealth.runningJobs,
          stopped: schedulerHealth.stoppedJobs,
          failed: schedulerHealth.failedJobs,
        },
        metrics,
        uptime: `${Math.round(schedulerHealth.uptime)}s`,
        memory: {
          heapUsed: `${Math.round(schedulerHealth.memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(schedulerHealth.memoryUsage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(schedulerHealth.memoryUsage.rss / 1024 / 1024)}MB`,
        },
        lastUpdate: schedulerHealth.lastUpdate,
        timestamp: new Date().toISOString(),
      };

      // Add warnings if any
      const warnings = this.getHealthWarnings(metrics);
      if (warnings.length > 0) {
        healthData['warnings'] = warnings;
      }

      if (!isHealthy) {
        throw new HealthCheckError(
          'Scheduler health check failed',
          this.getStatus(key, false, healthData)
        );
      }

      this.logger.debug('Scheduler health check passed');
      return this.getStatus(key, true, healthData);

    } catch (error) {
      this.logger.error('Scheduler health check failed:', error);
      
      throw new HealthCheckError(
        'Scheduler health check failed',
        this.getStatus(key, false, {
          status: 'down',
          error: error.message,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Detailed scheduler health check with job analysis
   */
  async checkDetailed(key: string = 'scheduler_detailed'): Promise<HealthIndicatorResult> {
    try {
      const allJobs = this.schedulerService.getAllJobs();
      const schedulerHealth = this.schedulerService.getHealthStatus();
      
      // Analyze individual jobs
      const jobAnalysis = this.analyzeJobs(allJobs);
      
      // Calculate comprehensive metrics
      const metrics = this.calculateDetailedMetrics(allJobs, schedulerHealth);
      
      const healthData = {
        status: 'up',
        overview: {
          totalJobs: schedulerHealth.totalJobs,
          runningJobs: schedulerHealth.runningJobs,
          stoppedJobs: schedulerHealth.stoppedJobs,
          failedJobs: schedulerHealth.failedJobs,
        },
        jobAnalysis,
        metrics,
        systemInfo: {
          uptime: `${Math.round(schedulerHealth.uptime)}s`,
          memory: schedulerHealth.memoryUsage,
          lastUpdate: schedulerHealth.lastUpdate,
        },
        performance: {
          successRate: `${((metrics.successfulExecutions / (metrics.totalExecutions || 1)) * 100).toFixed(2)}%`,
          errorRate: `${((metrics.failedExecutions / (metrics.totalExecutions || 1)) * 100).toFixed(2)}%`,
        },
        timestamp: new Date().toISOString(),
      };

      return this.getStatus(key, true, healthData);

    } catch (error) {
      this.logger.error('Detailed scheduler health check failed:', error);
      
      throw new HealthCheckError(
        'Detailed scheduler health check failed',
        this.getStatus(key, false, {
          status: 'down',
          error: error.message,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Quick scheduler ping for liveness probes
   */
  async checkPing(key: string = 'scheduler_ping'): Promise<HealthIndicatorResult> {
    try {
      // Quick check - just verify scheduler service is responsive
      const health = this.schedulerService.getHealthStatus();
      
      return this.getStatus(key, true, {
        status: 'up',
        responsive: true,
        jobCount: health.totalJobs,
        uptime: `${Math.round(health.uptime)}s`,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      throw new HealthCheckError(
        'Scheduler ping failed',
        this.getStatus(key, false, {
          status: 'down',
          responsive: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Calculate basic health metrics
   */
  private calculateHealthMetrics(jobs: any[], health: any) {
    const totalExecutions = jobs.reduce((sum, job) => sum + (job.executionCount || 0), 0);
    const totalErrors = jobs.reduce((sum, job) => sum + (job.errorCount || 0), 0);
    const successfulExecutions = totalExecutions - totalErrors;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions: totalErrors,
      errorRate: totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 100,
      activeJobs: jobs.filter(job => job.isRunning).length,
      stoppedJobs: jobs.filter(job => !job.isRunning).length,
    };
  }

  /**
   * Calculate detailed metrics with more analysis
   */
  private calculateDetailedMetrics(jobs: any[], health: any) {
    const basicMetrics = this.calculateHealthMetrics(jobs, health);
    
    // Additional detailed metrics
    const jobsWithErrors = jobs.filter(job => job.errorCount > 0);
    const recentlyExecuted = jobs.filter(job => 
      job.lastExecuted && 
      new Date(job.lastExecuted).getTime() > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
    );

    return {
      ...basicMetrics,
      jobsWithErrors: jobsWithErrors.length,
      recentlyExecutedJobs: recentlyExecuted.length,
      avgErrorsPerJob: jobs.length > 0 ? basicMetrics.failedExecutions / jobs.length : 0,
      avgExecutionsPerJob: jobs.length > 0 ? basicMetrics.totalExecutions / jobs.length : 0,
    };
  }

  /**
   * Analyze individual jobs for detailed reporting
   */
  private analyzeJobs(jobs: any[]) {
    const analysis = {
      byStatus: {
        running: jobs.filter(job => job.isRunning),
        stopped: jobs.filter(job => !job.isRunning),
      },
      byErrorRate: {
        healthy: jobs.filter(job => job.errorCount === 0),
        warning: jobs.filter(job => job.errorCount > 0 && job.errorCount <= 3),
        critical: jobs.filter(job => job.errorCount > 3),
      },
      patterns: this.analyzeJobPatterns(jobs),
    };

    return {
      statusCounts: {
        running: analysis.byStatus.running.length,
        stopped: analysis.byStatus.stopped.length,
      },
      errorCounts: {
        healthy: analysis.byErrorRate.healthy.length,
        warning: analysis.byErrorRate.warning.length,
        critical: analysis.byErrorRate.critical.length,
      },
      patterns: analysis.patterns,
    };
  }

  /**
   * Analyze job patterns for insights
   */
  private analyzeJobPatterns(jobs: any[]) {
    const patterns = {};
    
    jobs.forEach(job => {
      const pattern = job.pattern;
      if (!patterns[pattern]) {
        patterns[pattern] = {
          count: 0,
          jobs: [],
          totalExecutions: 0,
          totalErrors: 0,
        };
      }
      
      patterns[pattern].count++;
      patterns[pattern].jobs.push(job.name);
      patterns[pattern].totalExecutions += job.executionCount || 0;
      patterns[pattern].totalErrors += job.errorCount || 0;
    });

    return patterns;
  }

  /**
   * Evaluate overall health based on metrics
   */
  private evaluateHealth(metrics: any): boolean {
    // Consider unhealthy if:
    // - Error rate > 50%
    // - All jobs are stopped
    // - No jobs exist (might indicate initialization issues)
    
    if (metrics.errorRate > 50) return false;
    if (metrics.activeJobs === 0 && metrics.stoppedJobs > 0) return false;
    
    return true;
  }

  /**
   * Get health warnings based on metrics
   */
  private getHealthWarnings(metrics: any): string[] {
    const warnings: string[] = [];

    if (metrics.errorRate > 25) {
      warnings.push(`High error rate detected (${metrics.errorRate.toFixed(2)}%)`);
    }

    if (metrics.activeJobs === 0 && metrics.stoppedJobs > 0) {
      warnings.push('All scheduled jobs are stopped');
    }

    if (metrics.totalExecutions === 0) {
      warnings.push('No job executions recorded yet');
    }

    return warnings;
  }
}