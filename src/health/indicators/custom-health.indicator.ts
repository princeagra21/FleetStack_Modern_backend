import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

/**
 * Custom Health Indicator
 * 
 * Provides custom health checks for application-specific functionality.
 * Can be extended to monitor business logic, external APIs, or custom metrics.
 * 
 * Use Cases:
 * - Application startup status
 * - Business logic health
 * - Custom metrics monitoring
 * - Feature flag status
 * - License validation
 */

@Injectable()
export class CustomHealthIndicator extends HealthIndicator {
  
  /**
   * Generic health check method
   * @param key - Health check identifier
   * @param data - Additional data to include in health response
   */
  async isHealthy(key: string, data?: any): Promise<HealthIndicatorResult> {
    try {
      // Basic application health checks
      const healthData = {
        status: 'up',
        timestamp: new Date().toISOString(),
        ...data,
      };

      // Add memory information if not provided
      if (!data?.memory) {
        const memUsage = process.memoryUsage();
        healthData.memory = {
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        };
      }

      // Add process information
      if (!data?.process) {
        healthData.process = {
          pid: process.pid,
          uptime: `${Math.round(process.uptime())}s`,
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        };
      }

      // Check for potential issues
      const warnings = this.checkForWarnings(healthData);
      if (warnings.length > 0) {
        healthData.warnings = warnings;
      }

      return this.getStatus(key, true, healthData);
    } catch (error) {
      throw new HealthCheckError(
        `${key} health check failed`,
        this.getStatus(key, false, { error: error.message })
      );
    }
  }

  /**
   * Check for warning conditions
   */
  private checkForWarnings(data: any): string[] {
    const warnings: string[] = [];

    // Memory warnings
    if (data.memory) {
      const heapUsed = parseFloat(data.memory.heapUsed);
      const heapTotal = parseFloat(data.memory.heapTotal);
      const rss = parseFloat(data.memory.rss);

      if (heapUsed / heapTotal > 0.8) {
        warnings.push('High heap memory usage (>80%)');
      }

      if (rss > 1000) {
        warnings.push('High RSS memory usage (>1GB)');
      }
    }

    // Uptime warnings
    if (data.uptime && data.uptime < 60) {
      warnings.push('Application recently started (uptime < 60s)');
    }

    return warnings;
  }

  /**
   * Application startup health check
   */
  async checkStartup(key: string = 'startup'): Promise<HealthIndicatorResult> {
    const uptime = process.uptime();
    const isHealthy = uptime > 10; // Consider healthy after 10 seconds

    const data = {
      uptime: `${Math.round(uptime)}s`,
      status: isHealthy ? 'ready' : 'starting',
      startedAt: new Date(Date.now() - uptime * 1000).toISOString(),
    };

    if (!isHealthy) {
      throw new HealthCheckError(
        'Application is still starting up',
        this.getStatus(key, false, data)
      );
    }

    return this.getStatus(key, true, data);
  }

  /**
   * Environment configuration health check
   */
  async checkEnvironment(key: string = 'environment'): Promise<HealthIndicatorResult> {
    const requiredEnvVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'REDIS_HOST',
    ];

    const missing: string[] = [];
    const present: string[] = [];

    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        present.push(envVar);
      } else {
        missing.push(envVar);
      }
    });

    const data = {
      environment: process.env.NODE_ENV || 'unknown',
      requiredVariables: {
        present: present.length,
        missing: missing.length,
        total: requiredEnvVars.length,
      },
      missingVariables: missing,
    };

    if (missing.length > 0) {
      throw new HealthCheckError(
        `Missing required environment variables: ${missing.join(', ')}`,
        this.getStatus(key, false, data)
      );
    }

    return this.getStatus(key, true, data);
  }

  /**
   * Performance metrics health check
   */
  async checkPerformance(key: string = 'performance'): Promise<HealthIndicatorResult> {
    const startTime = process.hrtime.bigint();
    
    // Simulate some work to measure performance
    await new Promise(resolve => setTimeout(resolve, 1));
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const data = {
      responseTime: `${duration.toFixed(2)}ms`,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      eventLoop: {
        delay: duration,
        status: duration < 10 ? 'good' : duration < 50 ? 'warning' : 'critical',
      },
    };

    // Check for performance issues
    const isHealthy = duration < 100; // Consider unhealthy if response takes >100ms

    if (!isHealthy) {
      throw new HealthCheckError(
        `Poor performance detected (response time: ${duration.toFixed(2)}ms)`,
        this.getStatus(key, false, data)
      );
    }

    return this.getStatus(key, true, data);
  }
}