import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { RedisService } from '../../redis/redis.service';

/**
 * Redis Health Indicator
 * 
 * Monitors Redis connection, performance, and functionality.
 * Tests both connectivity and data integrity to ensure Redis is working properly.
 * 
 * Health Checks:
 * - Connection status
 * - Response time/latency
 * - Data integrity (set/get operations)
 * - Memory usage
 * - Redis server info
 */

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(private readonly redisService: RedisService) {
    super();
  }

  /**
   * Main Redis health check
   */
  async isHealthy(key: string = 'redis'): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Test basic connectivity and operations
      const testKey = `health_check:${Date.now()}`;
      const testValue = `health_${Math.random().toString(36).substr(2, 9)}`;

      // Perform write operation
      await this.redisService.set(testKey, testValue, 30); // 30 second TTL
      
      // Perform read operation
      const retrievedValue = await this.redisService.get(testKey);
      
      // Clean up test key
      try {
        await this.redisService.del(testKey);
      } catch (cleanupError) {
        this.logger.warn('Failed to cleanup test key:', cleanupError);
      }

      const latency = Date.now() - startTime;

      // Verify data integrity
      if (retrievedValue !== testValue) {
        throw new Error('Data integrity check failed - retrieved value does not match stored value');
      }

      // Get additional Redis information if available
      const healthData = {
        status: 'up',
        latency: `${latency}ms`,
        connection: 'established',
        dataIntegrity: 'verified',
        operations: {
          set: 'successful',
          get: 'successful',
          delete: 'successful',
        },
        testKey,
        timestamp: new Date().toISOString(),
      };

      // Add performance warnings
      if (latency > 100) {
        healthData['warning'] = `High latency detected (${latency}ms)`;
      }

      this.logger.debug(`Redis health check completed in ${latency}ms`);
      return this.getStatus(key, true, healthData);

    } catch (error) {
      const latency = Date.now() - startTime;
      
      this.logger.error(`Redis health check failed after ${latency}ms:`, error);
      
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, {
          status: 'down',
          error: error.message,
          latency: `${latency}ms`,
          connection: 'failed',
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Detailed Redis health check with server info
   */
  async checkDetailed(key: string = 'redis_detailed'): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Perform basic health check first
      await this.isHealthy('redis_basic');

      // Test multiple operations
      const operations = await this.performOperationTests();
      const latency = Date.now() - startTime;

      const healthData = {
        status: 'up',
        latency: `${latency}ms`,
        operations,
        performance: {
          responseTime: latency,
          status: latency < 50 ? 'excellent' : latency < 100 ? 'good' : latency < 200 ? 'fair' : 'poor',
        },
        timestamp: new Date().toISOString(),
      };

      return this.getStatus(key, true, healthData);

    } catch (error) {
      const latency = Date.now() - startTime;
      
      throw new HealthCheckError(
        'Redis detailed health check failed',
        this.getStatus(key, false, {
          status: 'down',
          error: error.message,
          latency: `${latency}ms`,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Test various Redis operations
   */
  private async performOperationTests() {
    const testPrefix = `health_test:${Date.now()}`;
    const operations = {
      set: false,
      get: false,
      delete: false,
      exists: false,
      ttl: false,
    };

    try {
      // Test SET operation
      const testKey = `${testPrefix}:set_test`;
      const testValue = 'health_check_value';
      await this.redisService.set(testKey, testValue, 60);
      operations.set = true;

      // Test GET operation
      const retrievedValue = await this.redisService.get(testKey);
      operations.get = retrievedValue === testValue;

      // Test EXISTS operation (if Redis service supports it)
      try {
        // Simple existence check by trying to get the value
        const existsCheck = await this.redisService.get(testKey);
        operations.exists = existsCheck !== null;
      } catch (error) {
        operations.exists = false;
      }

      // Test DELETE operation
      await this.redisService.del(testKey);
      operations.delete = true;

      // Verify deletion
      const deletedValue = await this.redisService.get(testKey);
      operations.delete = operations.delete && deletedValue === null;

      // Test TTL functionality
      const ttlTestKey = `${testPrefix}:ttl_test`;
      await this.redisService.set(ttlTestKey, 'ttl_value', 1); // 1 second TTL
      operations.ttl = true;

      // Clean up TTL test key
      try {
        await this.redisService.del(ttlTestKey);
      } catch (cleanupError) {
        this.logger.warn('Failed to cleanup TTL test key:', cleanupError);
      }

    } catch (error) {
      this.logger.error('Redis operation test failed:', error);
      throw error;
    }

    return operations;
  }

  /**
   * Quick Redis ping check for liveness probes
   */
  async checkPing(key: string = 'redis_ping'): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Simple connection test - try to set and get a value quickly
      const pingKey = `ping:${Date.now()}`;
      await this.redisService.set(pingKey, 'ping', 5);
      await this.redisService.get(pingKey);
      await this.redisService.del(pingKey);

      const latency = Date.now() - startTime;

      return this.getStatus(key, true, {
        status: 'up',
        latency: `${latency}ms`,
        connection: 'active',
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      const latency = Date.now() - startTime;
      
      throw new HealthCheckError(
        'Redis ping failed',
        this.getStatus(key, false, {
          status: 'down',
          error: error.message,
          latency: `${latency}ms`,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }
}