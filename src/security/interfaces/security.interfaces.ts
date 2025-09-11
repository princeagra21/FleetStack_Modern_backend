import { Request } from 'express';

export interface RequestWithClientIP extends Request {
  clientIP: string;
  requestId?: string;
}

export interface TrustedProxyConfig {
  trustedProxies: string[];
  trustCloudflare: boolean;
  trustCloudfront: boolean;
  maxHops: number;
}

export interface ClientIPExtractionResult {
  ip: string;
  source: 'direct' | 'x-forwarded-for' | 'x-real-ip' | 'cf-connecting-ip' | 'x-client-ip' | 'unknown';
  trusted: boolean;
}

export interface SecurityMetrics {
  rateLimitHits: number;
  blacklistBlocks: number;
  suspiciousRequests: number;
  analysisLatency: number;
  redisErrors: number;
}

export interface AbusiveActivitySummary {
  ipAddress: string;
  requestCount: number;
  riskScore: number;
  patterns: string[];
  firstSeen: Date;
  lastSeen: Date;
  blocked: boolean;
}

export interface SecurityConfiguration {
  rateLimiting: {
    enabled: boolean;
    keyPrefix: string;
    defaultLimits: {
      maxRequests: number;
      windowSeconds: number;
    };
  };
  abuseDetection: {
    enabled: boolean;
    riskThreshold: number;
    blockThreshold: number;
    patterns: {
      sqlInjection: boolean;
      xss: boolean;
      pathTraversal: boolean;
      commandInjection: boolean;
      botDetection: boolean;
    };
  };
  ipManagement: {
    blacklistEnabled: boolean;
    whitelistEnabled: boolean;
    autoBlacklistThreshold: number;
  };
  monitoring: {
    metricsEnabled: boolean;
    detailedLogging: boolean;
    alertThresholds: {
      rateLimitHitsPerMinute: number;
      suspiciousRequestsPerMinute: number;
    };
  };
}

export interface EndpointRateLimitConfig {
  endpoint: string;
  method: string;
  limits: {
    maxRequests: number;
    windowSeconds: number;
  };
  description?: string;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
}

export interface RedisHealthStatus {
  connected: boolean;
  latency: number;
  memoryUsage: number;
  connectionCount: number;
  lastError?: string;
}