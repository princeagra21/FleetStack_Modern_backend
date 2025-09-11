import { Controller, Get, UseGuards, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityMetricsService } from '../services/metrics.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../modules/auth/decorators/roles.decorator';

@ApiTags('Security Metrics')
@Controller('security/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SecurityMetricsController {
  constructor(private readonly metricsService: SecurityMetricsService) {}

  @Get()
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Get security metrics summary' })
  @ApiResponse({ 
    status: 200, 
    description: 'Security metrics summary',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            rateLimitHits: { type: 'number', description: 'Total rate limit violations' },
            blacklistBlocks: { type: 'number', description: 'Total IP blacklist blocks' },
            suspiciousRequests: { type: 'number', description: 'Total suspicious requests detected' },
            analysisLatency: { type: 'number', description: 'Average analysis latency in milliseconds' },
            redisErrors: { type: 'number', description: 'Total Redis connection errors' },
          }
        }
      }
    }
  })
  async getMetrics() {
    const metrics = this.metricsService.getMetrics();
    return {
      success: true,
      data: metrics,
    };
  }

  @Get('prometheus')
  @Roles('admin', 'superadmin')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ 
    summary: 'Get Prometheus-compatible metrics',
    description: 'Returns security metrics in Prometheus exposition format for monitoring systems'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Prometheus metrics format',
    headers: {
      'Content-Type': {
        description: 'Prometheus metrics content type',
        schema: { type: 'string', example: 'text/plain; version=0.0.4; charset=utf-8' }
      }
    }
  })
  async getPrometheusMetrics(): Promise<string> {
    return this.metricsService.getPrometheusMetrics();
  }

  @Get('reset')
  @Roles('superadmin')
  @ApiOperation({ 
    summary: 'Reset all security metrics (superadmin only)',
    description: 'Resets all security metric counters to zero. Use with caution in production.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Metrics reset successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async resetMetrics() {
    this.metricsService.reset();
    return {
      success: true,
      message: 'Security metrics have been reset',
    };
  }
}