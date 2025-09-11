import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class ThrottlerConfigService implements OnModuleDestroy {
  private readonly logger = new Logger(ThrottlerConfigService.name);
  private redisClient: Redis | null = null;
  private isRedisAvailable = false;
  private shutdownPromise: Promise<void> | null = null;
  createThrottlerConfig(): ThrottlerModuleOptions {
    // Create resilient Redis client for throttling
    this.redisClient = this.createRedisClient();

    return {
      throttlers: [
        {
          name: 'short',
          ttl: 1, // 1 second
          limit: 10, // 10 requests per second
        },
        {
          name: 'medium',
          ttl: parseInt(process.env.RATE_LIMIT_TTL || '60'), // 1 minute
          limit: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests per minute
        },
        {
          name: 'long',
          ttl: 3600, // 1 hour
          limit: 1000, // 1000 requests per hour
        },
        {
          name: 'sensitive',
          ttl: 300, // 5 minutes
          limit: parseInt(process.env.RATE_LIMIT_SENSITIVE_MAX || '10'), // 10 requests per 5 minutes for sensitive endpoints
        },
      ],
      storage: new ThrottlerStorageRedisService(this.redisClient),
    };
  }

  private createRedisClient(): Redis {
    const redisClient = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: 2, // Use different database for rate limiting
      keyPrefix: 'throttler:',
      connectTimeout: 5000,        // Reduced timeout
      commandTimeout: 3000,
      lazyConnect: true,
      maxRetriesPerRequest: 2,     // Reduced retries
      enableOfflineQueue: false,
      // 🚀 RESILIENT RETRY - Stop after 5 attempts to prevent infinite loops
      retryStrategy: (times) => {
        if (times > 5) {
          this.logger.warn(`🔴 Throttler Redis retry limit reached after ${times} attempts`);
          return null; // Stop retrying
        }
        const delay = Math.min(times * 1000, 15000); // Max 15s delay
        return delay;
      },
    });

    // Setup event handlers for monitoring
    redisClient.on('connect', () => {
      this.logger.log('✅ Throttler Redis connected');
      this.isRedisAvailable = true;
    });

    redisClient.on('ready', () => {
      this.isRedisAvailable = true;
    });

    redisClient.on('error', (error) => {
      this.logger.warn(`⚠️ Throttler Redis error: ${error.message}`);
      this.isRedisAvailable = false;
      // Don't spam logs for connection refused
      if (!error.message.includes('ECONNREFUSED')) {
        this.logger.debug('Throttler Redis error details:', error);
      }
    });

    redisClient.on('close', () => {
      this.logger.debug('🟡 Throttler Redis connection closed');
      this.isRedisAvailable = false;
    });

    redisClient.on('end', () => {
      this.logger.debug('🔴 Throttler Redis connection ended');
      this.isRedisAvailable = false;
    });

    return redisClient;
  }

  async onModuleDestroy() {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = new Promise(async (resolve) => {
      try {
        if (this.redisClient && this.redisClient.status !== 'end') {
          await this.redisClient.quit();
        }
        this.logger.log('✅ Throttler Redis shutdown complete');
      } catch (error) {
        this.logger.warn('❌ Throttler Redis shutdown error:', error);
      }
      resolve();
    });

    return this.shutdownPromise;
  }
}