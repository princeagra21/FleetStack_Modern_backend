import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../modules/auth/decorators/public.decorator';
import { SchedulerService } from '../scheduler/scheduler.service';
import { RedisService } from '../redis/redis.service';
import { PrimaryDatabaseService } from '../database/services/primary-database.service';
import { Logger } from '@nestjs/common';

/**
 * Simple Health Controller
 * 
 * Provides basic health check endpoints without Terminus dependency.
 * This implementation works around TypeOrmHealthIndicator issues
 * while still providing comprehensive health monitoring.
 */

export interface SimpleHealthResponse {
  status: 'ok' | 'error' | 'warning';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      latency?: number;
      error?: string;
      details?: any;
    };
  };
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

@ApiTags('Health')
@Controller('health')
export class SimpleHealthController {
  private readonly logger = new Logger(SimpleHealthController.name);

  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly redisService: RedisService,
    private readonly primaryDb: PrimaryDatabaseService,
  ) {}

  /**
   * Basic Health Check
   */
  @Get()
  @ApiOperation({
    summary: 'Basic application health check',
    description: `
    Provides comprehensive health status for FleetStack application and services.
    
    **Includes:**
    - Application status and uptime
    - Redis connectivity and performance
    - Scheduler service status
    - Memory and system metrics
    - Service summary statistics
    
    **Response Codes:**
    - 200: All services healthy
    - 503: One or more services unhealthy
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-01T12:00:00.000Z',
        uptime: 3600,
        version: '1.0.0',
        environment: 'development',
        services: {
          application: {
            status: 'up',
            details: {
              pid: 12345,
              memory: { heapUsed: '45MB', rss: '120MB' },
            },
          },
          redis: {
            status: 'up',
            latency: 15,
            details: { connection: 'established', operations: 'functional' },
          },
          scheduler: {
            status: 'up',
            details: { totalJobs: 3, runningJobs: 3, failedJobs: 0 },
          },
        },
        summary: { total: 3, healthy: 3, unhealthy: 0, degraded: 0 },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'One or more services are unhealthy',
    schema: {
      example: {
        status: 'error',
        timestamp: '2024-01-01T12:00:00.000Z',
        uptime: 3600,
        version: '1.0.0',
        environment: 'development',
        services: {
          application: { status: 'up' },
          redis: { status: 'down', error: 'Connection timeout' },
          scheduler: { status: 'degraded', details: { failedJobs: 2 } },
        },
        summary: { total: 3, healthy: 1, unhealthy: 1, degraded: 1 },
      },
    },
  })
  /**
   * Internal method to get health data without HTTP response handling
   */
  private async getHealthData(): Promise<SimpleHealthResponse> {
    const startTime = Date.now();
    const services: SimpleHealthResponse['services'] = {};

    // Check Database Health (PostgreSQL via Prisma)
    try {
      const dbStart = Date.now();
      await this.primaryDb.$queryRaw`SELECT 1`;
      services.database = {
        status: 'up',
        latency: Date.now() - dbStart,
        details: {
          connection: 'established',
          queryExecution: 'functional'
        }
      };
    } catch (error) {
      services.database = {
        status: 'down',
        error: error.message,
        details: {
          connection: 'failed',
          queryExecution: 'error'
        }
      };
    }

    // Check Application Health
    try {
      const memUsage = process.memoryUsage();
      services.application = {
        status: 'up',
        details: {
          pid: process.pid,
          uptime: Math.round(process.uptime()),
          nodeVersion: process.version,
          platform: process.platform,
          memory: {
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          },
        },
      };
    } catch (error) {
      services.application = {
        status: 'down',
        error: error.message,
      };
    }

    // Check Redis Health
    try {
      const redisStart = Date.now();
      const testKey = `health_check:${Date.now()}`;
      const testValue = `test_${Math.random().toString(36).substr(2, 9)}`;

      await this.redisService.set(testKey, testValue, 30);
      const retrievedValue = await this.redisService.get(testKey);
      await this.redisService.del(testKey);

      const latency = Date.now() - redisStart;

      if (retrievedValue === testValue) {
        services.redis = {
          status: 'up',
          latency,
          details: {
            connection: 'established',
            operations: 'functional',
            dataIntegrity: 'verified',
          },
        };
      } else {
        services.redis = {
          status: 'degraded',
          latency,
          error: 'Data integrity check failed',
        };
      }
    } catch (error) {
      services.redis = {
        status: 'down',
        error: error.message,
      };
    }

    // Check Scheduler Health
    try {
      const schedulerHealth = this.schedulerService.getHealthStatus();
      const allJobs = this.schedulerService.getAllJobs();
      
      const runningJobs = allJobs.filter(job => job.isRunning);
      const failedJobs = allJobs.filter(job => job.errorCount > 0);

      let schedulerStatus: 'up' | 'down' | 'degraded' = 'up';
      
      if (failedJobs.length > allJobs.length / 2) {
        schedulerStatus = 'down';
      } else if (failedJobs.length > 0) {
        schedulerStatus = 'degraded';
      }

      services.scheduler = {
        status: schedulerStatus,
        details: {
          totalJobs: schedulerHealth.totalJobs,
          runningJobs: schedulerHealth.runningJobs,
          stoppedJobs: schedulerHealth.stoppedJobs,
          failedJobs: schedulerHealth.failedJobs,
          uptime: Math.round(schedulerHealth.uptime),
        },
      };
    } catch (error) {
      services.scheduler = {
        status: 'down',
        error: error.message,
      };
    }

    // Calculate summary
    const serviceStatuses = Object.values(services).map(service => service.status);
    const summary = {
      total: serviceStatuses.length,
      healthy: serviceStatuses.filter(status => status === 'up').length,
      unhealthy: serviceStatuses.filter(status => status === 'down').length,
      degraded: serviceStatuses.filter(status => status === 'degraded').length,
    };

    // Determine overall status
    let overallStatus: 'ok' | 'error' | 'warning' = 'ok';
    if (summary.unhealthy > 0) {
      overallStatus = 'error';
    } else if (summary.degraded > 0) {
      overallStatus = 'warning';
    }

    const response: SimpleHealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      summary,
    };

    const totalTime = Date.now() - startTime;
    this.logger.log(`Health check completed in ${totalTime}ms - Status: ${overallStatus}`);

    return response;
  }

  async check(@Res() res: Response): Promise<void> {
    const healthData = await this.getHealthData();
    
    // Set appropriate HTTP status code
    const httpStatus = healthData.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(httpStatus).json(healthData);
  }

  /**
   * Liveness Probe
   */
  @Get('live')
  @Public() // Only liveness probe should be public
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Simple liveness check for Kubernetes or load balancers',
  })
  async liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      pid: process.pid,
    };
  }

  /**
   * Readiness Probe
   */
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Check if application is ready to serve traffic',
  })
  async readiness() {
    try {
      // Quick Redis connectivity check
      const testKey = `readiness:${Date.now()}`;
      await this.redisService.set(testKey, 'ready', 5);
      await this.redisService.get(testKey);
      await this.redisService.del(testKey);

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        services: ['redis', 'scheduler'],
      };
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Prometheus Metrics
   */
  @Get('metrics')
  @ApiOperation({
    summary: 'Prometheus-compatible metrics',
    description: 'Health metrics in Prometheus format',
  })
  async metrics(): Promise<string> {
    try {
      const health = await this.getHealthData();
      
      let metrics = '';
      
      // Overall health status
      const statusValue = health.status === 'ok' ? 2 : health.status === 'warning' ? 1 : 0;
      metrics += `# HELP fleetstack_health_status Overall application health status\n`;
      metrics += `# TYPE fleetstack_health_status gauge\n`;
      metrics += `fleetstack_health_status ${statusValue}\n\n`;

      // Service health statuses
      metrics += `# HELP fleetstack_service_health Individual service health status\n`;
      metrics += `# TYPE fleetstack_service_health gauge\n`;
      Object.entries(health.services).forEach(([service, status]) => {
        const value = status.status === 'up' ? 1 : 0;
        metrics += `fleetstack_service_health{service="${service}"} ${value}\n`;
      });
      metrics += '\n';

      // Application uptime
      metrics += `# HELP fleetstack_uptime_seconds Application uptime in seconds\n`;
      metrics += `# TYPE fleetstack_uptime_seconds counter\n`;
      metrics += `fleetstack_uptime_seconds ${health.uptime}\n\n`;

      return metrics;
    } catch (error) {
      return `# HELP fleetstack_health_status Overall application health status\n# TYPE fleetstack_health_status gauge\nfleetstack_health_status 0\n`;
    }
  }
}