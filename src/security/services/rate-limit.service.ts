import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { Redis } from 'ioredis';
import { CircuitBreakerService } from './circuit-breaker.service';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly redis: Redis;
  private readonly keyPrefix: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    // Simplified Redis client - will centralize later after fixing other critical issues
    this.redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 3, // Dedicated DB for rate limiting
      keyPrefix: 'rate:',
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
      retryStrategy: (times) => Math.min(times * 100, 2000),
    });

    this.keyPrefix = '';  // Using Redis keyPrefix instead

    this.redis.on('connect', () => {
      this.logger.log('Rate limit Redis client connected');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Rate limit Redis error:', error.message);
    });
  }

  async checkRateLimit(
    clientIP: string,
    endpoint: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `${clientIP}:${endpoint}`; // Key prefix is handled by Redis client

    // Use circuit breaker to protect Redis operations
    return this.circuitBreaker.execute(
      async () => {
        // Use Redis pipeline for better performance
        const pipeline = this.redis.pipeline();
        pipeline.incr(key);
        pipeline.ttl(key);

        const results = await pipeline.exec();

        if (!results || results.length !== 2) {
          throw new Error('Pipeline execution failed');
        }

        const [incrResult, ttlResult] = results;
        const currentCount = incrResult[1] as number;
        const currentTTL = ttlResult[1] as number;

        // Set expiry on first request (when counter = 1)
        if (currentCount === 1) {
          await this.redis.expire(key, config.windowSeconds);
        }

        const resetTime = currentTTL > 0
          ? Date.now() + (currentTTL * 1000)
          : Date.now() + (config.windowSeconds * 1000);

        const remaining = Math.max(0, config.maxRequests - currentCount);
        const allowed = currentCount <= config.maxRequests;

        return {
          allowed,
          remaining,
          resetTime,
          totalHits: currentCount,
        };
      },
      // Fallback function when circuit breaker is open
      async () => {
        this.logger.warn(`Rate limit check fallback for ${clientIP}:${endpoint} - allowing request`);
        return {
          allowed: true,
          remaining: config.maxRequests,
          resetTime: Date.now() + (config.windowSeconds * 1000),
          totalHits: 0,
        };
      }
    );
  }

  async getRateLimitStatus(clientIP: string, endpoint: string): Promise<number> {
    const key = `${clientIP}:${endpoint}`;

    try {
      const count = await this.redis.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      this.logger.error(`Failed to get rate limit status for ${clientIP}:${endpoint}:`, error);
      return 0;
    }
  }

  async resetRateLimit(clientIP: string, endpoint: string): Promise<boolean> {
    const key = `${clientIP}:${endpoint}`;

    try {
      await this.redis.del(key);
      this.logger.log(`Rate limit reset for ${clientIP}:${endpoint}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to reset rate limit for ${clientIP}:${endpoint}:`, error);
      return false;
    }
  }

  async getActiveRateLimits(): Promise<string[]> {
    try {
      const keys = await this.redis.keys('*'); // Prefix is handled by client
      return keys;
    } catch (error) {
      this.logger.error('Failed to get active rate limits:', error);
      return [];
    }
  }

  async onModuleDestroy() {
    try {
      if (this.redis.status === 'ready') {
        await this.redis.quit();
      } else {
        this.redis.disconnect(false);
      }
      this.logger.log('Rate limit Redis connection closed');
    } catch (error) {
      try { this.redis.disconnect(false); } catch { }
      this.logger.error('Error closing rate limit Redis connection:', error.message);
    }
  }

  // Health check for monitoring
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.logger.error('Rate limit Redis health check failed:', error);
      return false;
    }
  }
}