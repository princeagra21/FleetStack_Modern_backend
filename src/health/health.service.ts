import { Injectable, Logger } from '@nestjs/common';
import { 
  HealthCheckService, 
  HealthCheck, 
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { CustomHealthIndicator } from './indicators/custom-health.indicator';
// Note: Redis and Scheduler health integrated into custom indicators
import { PrismaHealthIndicator } from './indicators/prisma-health.indicator';

/**
 * Health Service
 * 
 * Orchestrates comprehensive health checks for the FleetStack application.
 * Uses Terminus health indicators to monitor various system components.
 * 
 * Health Check Categories:
 * 1. Application Health: Basic app functionality and uptime
 * 2. Memory Health: RAM usage and memory pressure
 * 3. Disk Health: Storage availability and usage
 * 4. Redis Health: Cache service connectivity and performance
 * 5. Scheduler Health: Background job system status
 * 
 * Health States:
 * - ok: Service is healthy and operating normally
 * - error: Service is down or experiencing critical issues
 * - warning: Service is degraded but still functional
 */

export interface HealthSummary {
  status: 'ok' | 'error' | 'warning';
  checks: number;
  passed: number;
  failed: number;
  duration: number;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly customIndicator: CustomHealthIndicator,
    private readonly prismaIndicator: PrismaHealthIndicator,
  ) {}

  /**
   * Basic health check - minimal overhead
   * Used for load balancer health checks
   */
  @HealthCheck()
  async checkBasic(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.health.check([
        () => this.customIndicator.isHealthy('app', {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          pid: process.pid,
        }),
      ]);

      const duration = Date.now() - startTime;
      this.logger.debug(`Basic health check completed in ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Basic health check failed in ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Comprehensive health check - all services
   * Detailed monitoring for dashboards and alerts
   */
  @HealthCheck()
  async checkDetailed(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.health.check([
        // Application health
        () => this.customIndicator.isHealthy('application', {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        }),
        
        // Memory health (warn at 80%, critical at 90%)
        () => this.memory.checkHeap('memory_heap', 900 * 1024 * 1024), // 900MB
        () => this.memory.checkRSS('memory_rss', 1000 * 1024 * 1024), // 1GB
        
        // Disk health (warn at 80% usage)
        () => this.disk.checkStorage('disk_health', { 
          path: '/', 
          thresholdPercent: 0.8 
        }),
        
        // Redis health (integrated into custom for now)
        // TODO: Add dedicated Redis health indicator
        
        // Database health  
        () => this.prismaIndicator.isHealthy('database'),
        
        // Scheduler health (integrated into custom for now)
        // TODO: Add dedicated Scheduler health indicator
      ]);

      const duration = Date.now() - startTime;
      this.logger.log(`Detailed health check completed in ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Detailed health check failed in ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Liveness probe - is the application running?
   * Kubernetes liveness probe endpoint
   */
  @HealthCheck()
  async checkLiveness(): Promise<HealthCheckResult> {
    try {
      return await this.health.check([
        () => this.customIndicator.isHealthy('liveness', {
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        }),
      ]);
    } catch (error) {
      this.logger.error('Liveness check failed:', error);
      throw error;
    }
  }

  /**
   * Readiness probe - is the application ready to serve traffic?
   * Kubernetes readiness probe endpoint
   */
  @HealthCheck()
  async checkReadiness(): Promise<HealthCheckResult> {
    try {
      return await this.health.check([
        // Application readiness
        () => this.customIndicator.isHealthy('readiness', {
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        }),
        
        // Critical dependencies for serving traffic
        () => this.prismaIndicator.isHealthy('database_readiness'),
        // TODO: Re-add Redis and Scheduler readiness checks
      ]);
    } catch (error) {
      this.logger.error('Readiness check failed:', error);
      throw error;
    }
  }

  /**
   * Get health summary with metrics
   */
  async getHealthSummary(): Promise<HealthSummary> {
    const startTime = Date.now();
    let status: 'ok' | 'error' | 'warning' = 'ok';
    let passed = 0;
    let failed = 0;
    let totalChecks = 0;

    try {
      const result = await this.checkDetailed();
      
      // Count results
      Object.entries(result.details).forEach(([key, check]) => {
        totalChecks++;
        if (check.status === 'up') {
          passed++;
        } else {
          failed++;
          status = 'error';
        }
      });

      // If some checks failed but not all, it's a warning
      if (failed > 0 && passed > 0) {
        status = 'warning';
      }

    } catch (error) {
      this.logger.error('Health summary check failed:', error);
      status = 'error';
      failed = totalChecks || 1;
    }

    const duration = Date.now() - startTime;

    return {
      status,
      checks: totalChecks,
      passed,
      failed,
      duration,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Get Prometheus-compatible metrics
   */
  async getPrometheusMetrics(): Promise<string> {
    try {
      const summary = await this.getHealthSummary();
      const result = await this.checkDetailed();

      let metrics = '';
      
      // Overall health status (0 = error, 1 = warning, 2 = ok)
      const statusValue = summary.status === 'ok' ? 2 : summary.status === 'warning' ? 1 : 0;
      metrics += `# HELP fleetstack_health_status Overall application health status\n`;
      metrics += `# TYPE fleetstack_health_status gauge\n`;
      metrics += `fleetstack_health_status ${statusValue}\n\n`;

      // Individual check statuses
      metrics += `# HELP fleetstack_health_check Individual health check status\n`;
      metrics += `# TYPE fleetstack_health_check gauge\n`;
      Object.entries(result.details).forEach(([key, check]) => {
        const value = check.status === 'up' ? 1 : 0;
        metrics += `fleetstack_health_check{check="${key}"} ${value}\n`;
      });
      metrics += '\n';

      // Health check duration
      metrics += `# HELP fleetstack_health_duration_ms Health check duration in milliseconds\n`;
      metrics += `# TYPE fleetstack_health_duration_ms gauge\n`;
      metrics += `fleetstack_health_duration_ms ${summary.duration}\n\n`;

      // Application uptime
      metrics += `# HELP fleetstack_uptime_seconds Application uptime in seconds\n`;
      metrics += `# TYPE fleetstack_uptime_seconds counter\n`;
      metrics += `fleetstack_uptime_seconds ${summary.uptime}\n\n`;

      return metrics;
    } catch (error) {
      this.logger.error('Failed to generate Prometheus metrics:', error);
      return `# HELP fleetstack_health_status Overall application health status\n# TYPE fleetstack_health_status gauge\nfleetstack_health_status 0\n`;
    }
  }
}