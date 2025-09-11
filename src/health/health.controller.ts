import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiProduces,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthService } from './health.service';
import { HealthCheckResult } from '@nestjs/terminus';
import { Public } from '../modules/auth/decorators/public.decorator';

/**
 * Health Controller
 * 
 * Provides health check endpoints for monitoring application status.
 * Uses @nestjs/terminus for comprehensive health monitoring.
 * 
 * Endpoints:
 * - GET /health: Basic health check
 * - GET /health/detailed: Comprehensive health report
 * - GET /health/live: Liveness probe (Kubernetes)
 * - GET /health/ready: Readiness probe (Kubernetes)
 * - GET /health/metrics: Prometheus-compatible metrics
 */

@ApiTags('Health')
@Controller('health')
// SECURITY: Health endpoints are selectively public - detailed endpoints require authentication
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic Health Check
   * 
   * Minimal health check for load balancers and basic monitoring.
   * Low overhead and fast response time.
   */
  @Get()
  @Public() // Basic health check is public for load balancers
  @ApiOperation({
    summary: 'Basic application health check',
    description: `
    Provides a basic health status check with minimal overhead.
    
    **Use Cases:**
    - Load balancer health checks
    - Basic monitoring systems
    - Quick status verification
    - Uptime monitoring
    
    **Response Time:** < 100ms typically
    **Dependencies:** Application core only
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      example: {
        status: 'ok',
        info: {
          app: {
            status: 'up',
            uptime: 3600,
            memory: {
              heapUsed: '45MB',
              heapTotal: '89MB',
              rss: '120MB',
              external: '12MB',
            },
            process: {
              pid: 12345,
              uptime: '3600s',
              version: 'v18.17.0',
              platform: 'linux',
              arch: 'x64',
            },
          },
        },
        error: {},
        details: {
          app: {
            status: 'up',
            uptime: 3600,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is unhealthy',
    schema: {
      example: {
        status: 'error',
        info: {},
        error: {
          app: {
            status: 'down',
            error: 'Application startup failed',
          },
        },
        details: {
          app: {
            status: 'down',
            error: 'Application startup failed',
          },
        },
      },
    },
  })
  async check(@Res() res: Response): Promise<void> {
    try {
      const result = await this.healthService.checkBasic();
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json(error);
    }
  }

  /**
   * Detailed Health Check
   * 
   * Comprehensive health check including all services and dependencies.
   * More thorough but higher overhead than basic check.
   */
  @Get('detailed')
  @ApiOperation({
    summary: 'Detailed application health check',
    description: `
    Provides comprehensive health status for all services and dependencies.
    
    **Includes:**
    - Application health
    - Memory usage
    - Disk space
    - Redis connectivity
    - Scheduler status
    - Performance metrics
    
    **Use Cases:**
    - Detailed monitoring dashboards
    - Health status pages
    - Troubleshooting and diagnostics
    - Service dependency mapping
    
    **Response Time:** 200-500ms typically
    **Dependencies:** All application services
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health report',
    schema: {
      example: {
        status: 'ok',
        info: {
          application: { status: 'up', uptime: 3600 },
          memory_heap: { status: 'up', heapUsed: 45000000 },
          memory_rss: { status: 'up', rss: 120000000 },
          disk_health: { status: 'up', free: 50000000000 },
          redis: { status: 'up', latency: '15ms' },
          scheduler: { status: 'up', jobs: { total: 3, running: 3 } },
        },
        error: {},
        details: {
          application: { status: 'up', uptime: 3600 },
          redis: { status: 'up', latency: '15ms', connection: 'established' },
          scheduler: { status: 'up', jobs: { total: 3, running: 3, failed: 0 } },
        },
      },
    },
  })
  async checkDetailed(@Res() res: Response): Promise<void> {
    try {
      const result = await this.healthService.checkDetailed();
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json(error);
    }
  }

  /**
   * Liveness Probe
   * 
   * Kubernetes liveness probe endpoint.
   * Determines if the application should be restarted.
   */
  @Get('live')
  @Public() // Liveness probe must be public for Kubernetes
  @ApiOperation({
    summary: 'Liveness probe for Kubernetes',
    description: `
    Kubernetes liveness probe endpoint to determine if the application is alive.
    
    **Purpose:**
    - Kubernetes container restart decisions
    - Basic application responsiveness check
    - Detect frozen or deadlocked applications
    
    **Failure Action:** Container will be restarted by Kubernetes
    **Check Frequency:** Every 30 seconds (configurable)
    **Response Time:** < 50ms typically
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
    schema: {
      example: {
        status: 'ok',
        info: {
          liveness: {
            status: 'up',
            uptime: 3600,
            timestamp: '2024-01-01T12:00:00.000Z',
          },
        },
        error: {},
        details: {
          liveness: {
            status: 'up',
            uptime: 3600,
          },
        },
      },
    },
  })
  async checkLiveness(@Res() res: Response): Promise<void> {
    try {
      const result = await this.healthService.checkLiveness();
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json(error);
    }
  }

  /**
   * Readiness Probe
   * 
   * Kubernetes readiness probe endpoint.
   * Determines if the application is ready to serve traffic.
   */
  @Get('ready')
  @Public() // Readiness probe must be public for Kubernetes
  @ApiOperation({
    summary: 'Readiness probe for Kubernetes',
    description: `
    Kubernetes readiness probe endpoint to determine if the application is ready to serve traffic.
    
    **Purpose:**
    - Kubernetes service endpoint management
    - Determine if app can handle requests
    - Check critical dependencies
    
    **Failure Action:** Traffic will be routed away from this instance
    **Dependencies:** Redis, Scheduler, Core services
    **Response Time:** < 200ms typically
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
    schema: {
      example: {
        status: 'ok',
        info: {
          readiness: { status: 'up' },
          redis_readiness: { status: 'up', latency: '10ms' },
          scheduler_readiness: { status: 'up', jobs: { total: 3, running: 3 } },
        },
        error: {},
        details: {
          readiness: { status: 'up' },
          redis_readiness: { status: 'up', connection: 'established' },
          scheduler_readiness: { status: 'up', responsive: true },
        },
      },
    },
  })
  async checkReadiness(@Res() res: Response): Promise<void> {
    try {
      const result = await this.healthService.checkReadiness();
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json(error);
    }
  }

  /**
   * Health Summary
   * 
   * High-level health summary with metrics and statistics.
   */
  @Get('summary')
  @ApiOperation({
    summary: 'Health summary with metrics',
    description: `
    Provides a high-level summary of application health with key metrics.
    
    **Includes:**
    - Overall health status
    - Check execution statistics
    - Performance metrics
    - System information
    
    **Use Cases:**
    - Health dashboards
    - Monitoring alerts
    - Status pages
    - Performance tracking
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Health summary report',
    schema: {
      example: {
        status: 'ok',
        checks: 6,
        passed: 6,
        failed: 0,
        duration: 145,
        timestamp: '2024-01-01T12:00:00.000Z',
        uptime: 3600,
        version: '1.0.0',
        environment: 'production',
      },
    },
  })
  async getSummary() {
    return this.healthService.getHealthSummary();
  }

  /**
   * Prometheus Metrics
   * 
   * Prometheus-compatible health metrics for monitoring systems.
   */
  @Get('metrics')
  @ApiOperation({
    summary: 'Prometheus-compatible health metrics',
    description: `
    Provides health metrics in Prometheus format for monitoring systems.
    
    **Metrics Include:**
    - fleetstack_health_status: Overall health status
    - fleetstack_health_check: Individual check statuses
    - fleetstack_health_duration_ms: Check execution time
    - fleetstack_uptime_seconds: Application uptime
    
    **Use Cases:**
    - Prometheus monitoring
    - Grafana dashboards
    - AlertManager rules
    - Custom monitoring systems
    `,
  })
  @ApiProduces('text/plain')
  @ApiResponse({
    status: 200,
    description: 'Prometheus metrics',
    content: {
      'text/plain': {
        example: `# HELP fleetstack_health_status Overall application health status
# TYPE fleetstack_health_status gauge
fleetstack_health_status 2

# HELP fleetstack_health_check Individual health check status
# TYPE fleetstack_health_check gauge
fleetstack_health_check{check="application"} 1
fleetstack_health_check{check="redis"} 1
fleetstack_health_check{check="scheduler"} 1

# HELP fleetstack_health_duration_ms Health check duration in milliseconds
# TYPE fleetstack_health_duration_ms gauge
fleetstack_health_duration_ms 145

# HELP fleetstack_uptime_seconds Application uptime in seconds
# TYPE fleetstack_uptime_seconds counter
fleetstack_uptime_seconds 3600`,
      },
    },
  })
  async getMetrics(): Promise<string> {
    return this.healthService.getPrometheusMetrics();
  }
}