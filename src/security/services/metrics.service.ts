import { Injectable, Logger } from '@nestjs/common';
import { SecurityMetrics } from '../interfaces/security.interfaces';

interface MetricCounters {
  rateLimitHits: number;
  blacklistBlocks: number;
  suspiciousRequests: number;
  analysisLatency: number[];
  redisErrors: number;
}

@Injectable()
export class SecurityMetricsService {
  private readonly logger = new Logger(SecurityMetricsService.name);
  private readonly metrics: MetricCounters;
  private readonly maxLatencyHistory = 1000; // Keep last 1000 latency measurements

  constructor() {
    this.metrics = {
      rateLimitHits: 0,
      blacklistBlocks: 0,
      suspiciousRequests: 0,
      analysisLatency: [],
      redisErrors: 0,
    };
  }

  incrementRateLimitHits(): void {
    this.metrics.rateLimitHits++;
  }

  incrementBlacklistBlocks(): void {
    this.metrics.blacklistBlocks++;
  }

  incrementSuspiciousRequests(): void {
    this.metrics.suspiciousRequests++;
  }

  recordAnalysisLatency(latencyMs: number): void {
    this.metrics.analysisLatency.push(latencyMs);
    
    // Keep only recent measurements to prevent memory bloat
    if (this.metrics.analysisLatency.length > this.maxLatencyHistory) {
      this.metrics.analysisLatency.shift();
    }
  }

  incrementRedisErrors(): void {
    this.metrics.redisErrors++;
  }

  getMetrics(): SecurityMetrics {
    const avgLatency = this.metrics.analysisLatency.length > 0
      ? this.metrics.analysisLatency.reduce((sum, val) => sum + val, 0) / this.metrics.analysisLatency.length
      : 0;

    return {
      rateLimitHits: this.metrics.rateLimitHits,
      blacklistBlocks: this.metrics.blacklistBlocks,
      suspiciousRequests: this.metrics.suspiciousRequests,
      analysisLatency: Math.round(avgLatency * 100) / 100, // Round to 2 decimal places
      redisErrors: this.metrics.redisErrors,
    };
  }

  getPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    
    return `
# HELP fleetstack_rate_limit_hits_total Total number of rate limit hits
# TYPE fleetstack_rate_limit_hits_total counter
fleetstack_rate_limit_hits_total ${metrics.rateLimitHits}

# HELP fleetstack_blacklist_blocks_total Total number of blacklist blocks
# TYPE fleetstack_blacklist_blocks_total counter
fleetstack_blacklist_blocks_total ${metrics.blacklistBlocks}

# HELP fleetstack_suspicious_requests_total Total number of suspicious requests detected
# TYPE fleetstack_suspicious_requests_total counter
fleetstack_suspicious_requests_total ${metrics.suspiciousRequests}

# HELP fleetstack_analysis_latency_seconds Average analysis latency in seconds
# TYPE fleetstack_analysis_latency_seconds gauge
fleetstack_analysis_latency_seconds ${metrics.analysisLatency / 1000}

# HELP fleetstack_redis_errors_total Total number of Redis errors
# TYPE fleetstack_redis_errors_total counter
fleetstack_redis_errors_total ${metrics.redisErrors}
`.trim();
  }

  reset(): void {
    this.metrics.rateLimitHits = 0;
    this.metrics.blacklistBlocks = 0;
    this.metrics.suspiciousRequests = 0;
    this.metrics.analysisLatency = [];
    this.metrics.redisErrors = 0;
    this.logger.log('Security metrics reset');
  }

  logMetricsSummary(): void {
    const metrics = this.getMetrics();
    this.logger.log('Security Metrics Summary', {
      rateLimitHits: metrics.rateLimitHits,
      blacklistBlocks: metrics.blacklistBlocks,
      suspiciousRequests: metrics.suspiciousRequests,
      avgAnalysisLatency: `${metrics.analysisLatency}ms`,
      redisErrors: metrics.redisErrors,
    });
  }
}