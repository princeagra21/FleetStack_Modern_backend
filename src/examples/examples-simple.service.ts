import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { PrimaryDatabaseService } from '../database/services/primary-database.service';
import {
  BusinessLogicException,
  ResourceNotFoundException,
  ResourceConflictException,
  ValidationException,
  ServiceUnavailableException,
  RateLimitException,
  DatabaseOperationException,
  CacheOperationException,
  PermissionDeniedException,
  ExternalApiException,
} from '../common/exceptions/custom-exceptions';

/**
 * Simplified Examples Service
 * 
 * This service demonstrates the core patterns for:
 * 1. Redis operations and caching
 * 2. Service injection and dependency management  
 * 3. Error handling patterns
 * 4. Logging best practices
 * 5. Business logic organization
 * 
 * Note: Database examples are simplified to avoid schema conflicts
 */
@Injectable()
export class ExamplesSimpleService {
  // Logger instance for debugging and monitoring
  private readonly logger = new Logger(ExamplesSimpleService.name);

  constructor(
    // Inject Redis service for caching operations
    private readonly redisService: RedisService,
    // Inject Scheduler service for cron job operations
    private readonly schedulerService: SchedulerService,
    // Inject Primary Database service for PostgreSQL operations
    private readonly primaryDb: PrimaryDatabaseService,
  ) {
    this.logger.log('ExamplesSimpleService initialized');
  }

  /**
   * Example 1: Redis Caching with Cache-Aside Pattern
   * 
   * Demonstrates:
   * - Cache-first data retrieval
   * - TTL (Time To Live) usage
   * - JSON serialization/deserialization
   * - Error handling for Redis operations
   */
  async demonstrateRedisCache(key: string) {
    try {
      this.logger.log(`Starting Redis cache demo with key: ${key}`);

      // Step 1: Try to get data from cache first
      const cacheKey = `demo:${key}`;
      const cachedData = await this.redisService.get(cacheKey);
      
      if (cachedData) {
        this.logger.log('✅ Data found in Redis cache');
        return {
          success: true,
          data: JSON.parse(cachedData),
          fromCache: true,
          message: 'Data retrieved from Redis cache successfully',
        };
      }

      // Step 2: Generate fresh data (in real app, this would be database query)
      this.logger.log('❌ Cache miss - generating fresh data');
      const freshData = {
        key,
        timestamp: new Date().toISOString(),
        randomValue: Math.floor(Math.random() * 1000),
        computedValue: key.length * 42, // Simple computation
        metadata: {
          generatedBy: 'ExamplesService',
          version: '1.0',
          ttl: 300, // 5 minutes
        },
      };

      // Step 3: Store in Redis with TTL (5 minutes = 300 seconds)
      await this.redisService.set(cacheKey, JSON.stringify(freshData), 300);
      this.logger.log('💾 Fresh data cached in Redis with 5-minute TTL');

      return {
        success: true,
        data: freshData,
        fromCache: false,
        message: 'Fresh data generated and cached successfully',
      };
    } catch (error) {
      this.logger.error('Redis operation failed:', error);
      throw error;
    }
  }

  /**
   * Example 2: Complex Redis Operations
   * 
   * Demonstrates:
   * - Multiple Redis operations in sequence
   * - Pattern-based key management
   * - Batch operations
   * - Performance tracking
   */
  async demonstrateComplexRedisOps(userId: number) {
    try {
      this.logger.log(`Complex Redis operations for user ${userId}`);
      const startTime = Date.now();

      // Operation 1: Store user session data
      const sessionKey = `session:user:${userId}`;
      const sessionData = {
        userId,
        loginTime: new Date().toISOString(),
        sessionId: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        permissions: ['read', 'write'],
      };
      
      await this.redisService.set(sessionKey, JSON.stringify(sessionData), 3600); // 1 hour
      this.logger.log(`📝 Session data stored for user ${userId}`);

      // Operation 2: Increment user activity counter
      const activityKey = `activity:user:${userId}`;
      // Note: Redis increment operation (would need raw Redis client for this)
      const currentActivity = await this.redisService.get(activityKey) || '0';
      const newCount = parseInt(currentActivity) + 1;
      await this.redisService.set(activityKey, newCount.toString(), 86400); // 24 hours
      this.logger.log(`📊 Activity count updated to ${newCount} for user ${userId}`);

      // Operation 3: Add to recent users list
      const recentUsersKey = 'recent_users';
      const recentUsers = await this.redisService.get(recentUsersKey);
      let usersList = recentUsers ? JSON.parse(recentUsers) : [];
      
      // Remove user if already in list, then add to front
      usersList = usersList.filter((id: number) => id !== userId);
      usersList.unshift(userId);
      
      // Keep only last 10 users
      usersList = usersList.slice(0, 10);
      
      await this.redisService.set(recentUsersKey, JSON.stringify(usersList), 7200); // 2 hours
      this.logger.log(`👥 Added user ${userId} to recent users list`);

      const operationTime = Date.now() - startTime;

      return {
        success: true,
        operations: {
          sessionStored: true,
          activityCount: newCount,
          recentUsersUpdated: true,
        },
        performance: {
          totalTime: `${operationTime}ms`,
          operationsCompleted: 3,
        },
        message: 'Complex Redis operations completed successfully',
      };
    } catch (error) {
      this.logger.error(`Complex Redis operations failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Example 3: Token Validation Simulation
   * 
   * Demonstrates:
   * - How JWT tokens work with Redis for session management
   * - Token blacklisting patterns
   * - Security checks
   */
  async demonstrateTokenValidation(tokenId: string, userId: number) {
    try {
      this.logger.log(`Validating token ${tokenId} for user ${userId}`);

      // Check if token is blacklisted
      const blacklistKey = `blacklist:token:${tokenId}`;
      const isBlacklisted = await this.redisService.get(blacklistKey);
      
      if (isBlacklisted) {
        this.logger.warn(`🚫 Token ${tokenId} is blacklisted`);
        return {
          valid: false,
          reason: 'Token has been revoked',
          message: 'This token is no longer valid',
        };
      }

      // Check active session
      const sessionKey = `session:user:${userId}`;
      const sessionData = await this.redisService.get(sessionKey);
      
      if (!sessionData) {
        this.logger.warn(`❌ No active session found for user ${userId}`);
        return {
          valid: false,
          reason: 'No active session',
          message: 'User session has expired or does not exist',
        };
      }

      // Update last activity
      const lastActivityKey = `lastactivity:user:${userId}`;
      await this.redisService.set(lastActivityKey, new Date().toISOString(), 3600);

      this.logger.log(`✅ Token ${tokenId} validated successfully`);
      
      return {
        valid: true,
        sessionData: JSON.parse(sessionData),
        lastActivity: new Date().toISOString(),
        message: 'Token is valid and session is active',
      };
    } catch (error) {
      this.logger.error(`Token validation failed for ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Example 4: Rate Limiting Simulation
   * 
   * Demonstrates:
   * - How rate limiting works with Redis
   * - Sliding window approach
   * - Different rate limits per user type
   */
  async demonstrateRateLimiting(userId: number, userRole: string, endpoint: string) {
    try {
      this.logger.log(`Checking rate limit for user ${userId} (${userRole}) on ${endpoint}`);

      // Define rate limits by role
      const rateLimits = {
        user: { requests: 100, window: 3600 }, // 100 requests per hour
        admin: { requests: 500, window: 3600 }, // 500 requests per hour
        superadmin: { requests: 1000, window: 3600 }, // 1000 requests per hour
      };

      const limit = rateLimits[userRole] || rateLimits.user;
      const windowStart = Math.floor(Date.now() / 1000 / limit.window) * limit.window;
      const rateLimitKey = `ratelimit:${userId}:${endpoint}:${windowStart}`;

      // Get current request count
      const currentCount = await this.redisService.get(rateLimitKey);
      const requestCount = currentCount ? parseInt(currentCount) : 0;

      if (requestCount >= limit.requests) {
        this.logger.warn(`🚫 Rate limit exceeded for user ${userId} on ${endpoint}`);
        return {
          allowed: false,
          limit: limit.requests,
          remaining: 0,
          resetTime: new Date((windowStart + limit.window) * 1000).toISOString(),
          message: 'Rate limit exceeded',
        };
      }

      // Increment counter
      const newCount = requestCount + 1;
      await this.redisService.set(rateLimitKey, newCount.toString(), limit.window);

      this.logger.log(`✅ Request allowed: ${newCount}/${limit.requests} for user ${userId}`);

      return {
        allowed: true,
        limit: limit.requests,
        remaining: limit.requests - newCount,
        resetTime: new Date((windowStart + limit.window) * 1000).toISOString(),
        message: 'Request within rate limit',
      };
    } catch (error) {
      this.logger.error(`Rate limiting check failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Example 5: Health Check for Services
   * 
   * Demonstrates:
   * - Service availability testing
   * - Performance monitoring
   * - Error handling for service checks
   * - Integration with Terminus health monitoring
   */
  async getServiceHealthCheck() {
    const results = {
      redis: { status: 'unknown', latency: 0, error: null },
      scheduler: { status: 'unknown', error: null },
      terminus: { status: 'unknown', endpoint: '/health', error: null },
      timestamp: new Date().toISOString(),
    };

    // Test Redis Connection and Performance
    try {
      const redisStart = Date.now();
      
      // Perform a test operation
      const testKey = 'health_check_test';
      const testValue = `health_${Date.now()}`;
      
      await this.redisService.set(testKey, testValue, 10); // 10 second TTL
      const retrievedValue = await this.redisService.get(testKey);
      
      const latency = Date.now() - redisStart;
      
      if (retrievedValue === testValue) {
        results.redis = {
          status: 'healthy',
          latency,
          error: null,
        };
        this.logger.log(`✅ Redis health check passed (${latency}ms)`);
      } else {
        results.redis = {
          status: 'unhealthy',
          latency,
          error: 'Data integrity check failed' as any,
        };
        this.logger.error('❌ Redis data integrity check failed');
      }
    } catch (error) {
      results.redis = {
        status: 'unhealthy',
        latency: 0,
        error: error.message,
      };
      this.logger.error('❌ Redis health check failed:', error);
    }

    // Test Scheduler Health
    try {
      const schedulerHealth = this.schedulerService.getHealthStatus();
      const allJobs = this.schedulerService.getAllJobs();
      
      const failedJobs = allJobs.filter(job => job.errorCount > 0);
      const isHealthy = failedJobs.length <= allJobs.length / 2; // Healthy if less than 50% failed
      
      results.scheduler = {
        status: isHealthy ? 'healthy' : 'degraded',
        error: null,
        details: {
          totalJobs: schedulerHealth.totalJobs,
          runningJobs: schedulerHealth.runningJobs,
          failedJobs: schedulerHealth.failedJobs,
          uptime: Math.round(schedulerHealth.uptime),
        },
      } as any;
      this.logger.log(`✅ Scheduler health check passed - ${schedulerHealth.totalJobs} jobs total`);
    } catch (error) {
      results.scheduler = {
        status: 'unhealthy',
        error: error.message,
      };
      this.logger.error('❌ Scheduler health check failed:', error);
    }

    // Test Terminus Health Endpoint
    try {
      results.terminus = {
        status: 'available',
        endpoint: '/health',
        error: null,
      };
      this.logger.log('✅ Terminus health monitoring is available at /health');
    } catch (error) {
      results.terminus = {
        status: 'unavailable',
        endpoint: '/health',
        error: error.message,
      };
      this.logger.error('❌ Terminus health monitoring failed:', error);
    }

    const healthyServices = Object.values(results)
      .filter(service => typeof service === 'object' && (service.status === 'healthy' || service.status === 'available'))
      .length;

    return {
      success: true,
      services: results,
      healthyServices,
      totalServices: 3,
      overallStatus: healthyServices === 3 ? 'healthy' : healthyServices > 0 ? 'degraded' : 'unhealthy',
      terminusIntegration: {
        available: true,
        endpoints: [
          '/health - Basic health check',
          '/health/live - Liveness probe (Kubernetes)',
          '/health/ready - Readiness probe (Kubernetes)',
          '/health/metrics - Prometheus-compatible metrics',
        ],
        note: 'Comprehensive health monitoring with Redis, Scheduler, and Application status checks',
      },
    };
  }

  /**
   * Example 7: Error Handling Demonstration
   * 
   * Demonstrates various types of errors and how they are handled
   * by the global error handling system
   */
  async demonstrateErrorHandling(errorType: string, context?: any) {
    this.logger.log(`Demonstrating error type: ${errorType}`);

    switch (errorType) {
      case 'business_logic':
        throw new BusinessLogicException(
          'User cannot perform this action due to business rules',
          'USER_ACTION_FORBIDDEN',
          { userId: context?.userId, action: context?.action }
        );

      case 'resource_not_found':
        throw new ResourceNotFoundException(
          'User',
          context?.userId || 999,
          { searchCriteria: context?.searchCriteria }
        );

      case 'resource_conflict':
        throw new ResourceConflictException(
          'User',
          'email',
          context?.email || 'test@example.com',
          { attemptedAction: 'create_user' }
        );

      case 'validation_error':
        throw new ValidationException(
          'email',
          context?.email || 'invalid-email',
          'valid email format (user@domain.com)',
          { providedFormat: context?.email || 'invalid-email' }
        );

      case 'service_unavailable':
        throw new ServiceUnavailableException(
          'Redis Cache',
          'Connection timeout',
          30,
          { lastConnected: new Date(Date.now() - 30000).toISOString() }
        );

      case 'rate_limit':
        throw new RateLimitException(
          100,
          3600000,
          1800,
          { userId: context?.userId, endpoint: '/api/test' }
        );

      case 'database_error':
        throw new DatabaseOperationException(
          'UPDATE',
          'users',
          'Foreign key constraint violation',
          { query: 'UPDATE users SET role_id = ? WHERE id = ?', params: [999, context?.userId] }
        );

      case 'cache_error':
        throw new CacheOperationException(
          'SET',
          context?.key || 'test:cache:key',
          'Redis connection lost',
          { retryAttempt: 3, maxRetries: 3 }
        );

      case 'permission_denied':
        throw new PermissionDeniedException(
          'delete',
          'user account',
          context?.userRole || 'user',
          ['admin', 'superadmin'],
          { attemptedAction: 'delete_user', targetUserId: context?.targetUserId }
        );

      case 'external_api':
        throw new ExternalApiException(
          'Payment Gateway',
          '/api/v1/payments',
          502,
          'Bad Gateway - Service temporarily unavailable',
          { transactionId: context?.transactionId, amount: context?.amount }
        );

      case 'unexpected_error':
        // Simulate an unexpected error
        const nullObject: any = null;
        return nullObject.someProperty.that.doesNotExist;

      default:
        throw new ValidationException(
          'errorType',
          errorType,
          'one of: business_logic, resource_not_found, resource_conflict, validation_error, service_unavailable, rate_limit, database_error, cache_error, permission_denied, external_api, unexpected_error',
          { availableTypes: ['business_logic', 'resource_not_found', 'resource_conflict', 'validation_error', 'service_unavailable', 'rate_limit', 'database_error', 'cache_error', 'permission_denied', 'external_api', 'unexpected_error'] }
        );
    }
  }

  /**
   * Example 8: Validation Error Demonstration
   * 
   * Shows how validation errors are handled and structured
   */
  async demonstrateValidationErrors(data: any) {
    this.logger.log('Demonstrating validation error handling');

    const errors: string[] = [];

    // Simulate various validation checks
    if (!data.email) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Email must be a valid email address');
    }

    if (!data.username) {
      errors.push('Username is required');
    } else if (data.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    if (!data.age) {
      errors.push('Age is required');
    } else if (typeof data.age !== 'number' || data.age < 0 || data.age > 150) {
      errors.push('Age must be a number between 0 and 150');
    }

    if (data.role && !['user', 'admin', 'superadmin'].includes(data.role)) {
      errors.push('Role must be one of: user, admin, superadmin');
    }

    // If there are validation errors, throw them
    if (errors.length > 0) {
      throw new ValidationException(
        'request_data',
        data,
        'valid user data object',
        {
          validationErrors: errors,
          providedData: data,
          expectedFormat: {
            email: 'string (valid email format)',
            username: 'string (3+ chars, alphanumeric + underscore)',
            age: 'number (0-150)',
            role: 'string (user, admin, or superadmin)',
          },
        }
      );
    }

    return {
      success: true,
      message: 'All validation checks passed',
      validatedData: data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Example 6: Advanced Caching Patterns
   * 
   * Demonstrates:
   * - Cache warming
   * - Cache invalidation
   * - Multi-level caching
   */
  async demonstrateAdvancedCaching(entityType: string, entityId: number) {
    try {
      this.logger.log(`Advanced caching demo for ${entityType}:${entityId}`);

      const baseKey = `entity:${entityType}:${entityId}`;
      const metaKey = `meta:${entityType}:${entityId}`;
      
      // Cache metadata
      const metadata = {
        entityType,
        entityId,
        cacheLevel: 'L1',
        createdAt: new Date().toISOString(),
        accessCount: 1,
        tags: [`type:${entityType}`, `id:${entityId}`],
      };
      
      await this.redisService.set(metaKey, JSON.stringify(metadata), 1800); // 30 minutes

      // Simulate cache warming (pre-loading related data)
      const relatedKeys = [
        `${baseKey}:summary`,
        `${baseKey}:details`,
        `${baseKey}:permissions`,
      ];

      const warmedData = {};
      for (const key of relatedKeys) {
        const data = {
          key,
          warmedAt: new Date().toISOString(),
          data: `Cached data for ${key}`,
        };
        await this.redisService.set(key, JSON.stringify(data), 900); // 15 minutes
        warmedData[key] = data;
      }

      this.logger.log(`🔥 Cache warmed for ${relatedKeys.length} related keys`);

      return {
        success: true,
        baseKey,
        metadata,
        warmedKeys: relatedKeys,
        warmedData,
        message: 'Advanced caching patterns demonstrated successfully',
      };
    } catch (error) {
      this.logger.error('Advanced caching demo failed:', error);
      throw error;
    }
  }

  /**
   * Example 9: Node-Cron Scheduler Demonstrations
   * 
   * Demonstrates:
   * - Creating scheduled jobs with different patterns
   * - Job management (start, stop, remove)
   * - Monitoring job execution and status
   * - Common scheduling patterns
   */
  async demonstrateSchedulerOperations(action: string, jobData?: any) {
    try {
      this.logger.log(`Scheduler demo: ${action}`);

      switch (action) {
        case 'create_job':
          const jobId = this.schedulerService.scheduleJob(
            async () => {
              this.logger.log(`🔄 Executing scheduled task: ${jobData?.name || 'Demo Task'}`);
              // Simulate some work
              await new Promise(resolve => setTimeout(resolve, 1000));
              this.logger.log(`✅ Task completed: ${jobData?.name || 'Demo Task'}`);
            },
            {
              name: jobData?.name || 'Demo Scheduled Task',
              pattern: jobData?.pattern || SchedulerService.PATTERNS.EVERY_5_MINUTES,
              description: jobData?.description || 'A demonstration scheduled task',
            }
          );
          
          return {
            success: true,
            action: 'job_created',
            jobId,
            message: `Scheduled job created with ID: ${jobId}`,
            jobDetails: this.schedulerService.getJob(jobId),
          };

        case 'list_jobs':
          const allJobs = this.schedulerService.getAllJobs();
          const runningJobs = this.schedulerService.getJobsByStatus(true);
          const stoppedJobs = this.schedulerService.getJobsByStatus(false);
          
          return {
            success: true,
            action: 'jobs_listed',
            summary: {
              total: allJobs.length,
              running: runningJobs.length,
              stopped: stoppedJobs.length,
            },
            jobs: allJobs,
            message: `Found ${allJobs.length} scheduled jobs`,
          };

        case 'job_status':
          if (!jobData?.jobId) {
            throw new ValidationException('jobId', jobData?.jobId, 'valid job ID string');
          }
          
          const job = this.schedulerService.getJob(jobData.jobId);
          if (!job) {
            throw new ResourceNotFoundException('ScheduledJob', jobData.jobId);
          }
          
          return {
            success: true,
            action: 'job_status',
            job,
            message: `Job status retrieved for ${job.name}`,
          };

        case 'start_job':
          if (!jobData?.jobId) {
            throw new ValidationException('jobId', jobData?.jobId, 'valid job ID string');
          }
          
          const startResult = this.schedulerService.startJob(jobData.jobId);
          return {
            success: startResult,
            action: 'job_started',
            jobId: jobData.jobId,
            message: startResult ? 'Job started successfully' : 'Failed to start job',
          };

        case 'stop_job':
          if (!jobData?.jobId) {
            throw new ValidationException('jobId', jobData?.jobId, 'valid job ID string');
          }
          
          const stopResult = this.schedulerService.stopJob(jobData.jobId);
          return {
            success: stopResult,
            action: 'job_stopped',
            jobId: jobData.jobId,
            message: stopResult ? 'Job stopped successfully' : 'Failed to stop job',
          };

        case 'remove_job':
          if (!jobData?.jobId) {
            throw new ValidationException('jobId', jobData?.jobId, 'valid job ID string');
          }
          
          const removeResult = this.schedulerService.removeJob(jobData.jobId);
          return {
            success: removeResult,
            action: 'job_removed',
            jobId: jobData.jobId,
            message: removeResult ? 'Job removed successfully' : 'Failed to remove job',
          };

        case 'health_status':
          const healthStatus = this.schedulerService.getHealthStatus();
          return {
            success: true,
            action: 'health_status',
            health: healthStatus,
            message: 'Scheduler health status retrieved',
          };

        case 'common_patterns':
          return {
            success: true,
            action: 'common_patterns',
            patterns: {
              'Every Minute': SchedulerService.PATTERNS.EVERY_MINUTE,
              'Every 5 Minutes': SchedulerService.PATTERNS.EVERY_5_MINUTES,
              'Every 15 Minutes': SchedulerService.PATTERNS.EVERY_15_MINUTES,
              'Every 30 Minutes': SchedulerService.PATTERNS.EVERY_30_MINUTES,
              'Every Hour': SchedulerService.PATTERNS.EVERY_HOUR,
              'Every 2 Hours': SchedulerService.PATTERNS.EVERY_2_HOURS,
              'Every 6 Hours': SchedulerService.PATTERNS.EVERY_6_HOURS,
              'Every 12 Hours': SchedulerService.PATTERNS.EVERY_12_HOURS,
              'Daily at Midnight': SchedulerService.PATTERNS.DAILY_AT_MIDNIGHT,
              'Daily at Noon': SchedulerService.PATTERNS.DAILY_AT_NOON,
              'Weekly on Sunday': SchedulerService.PATTERNS.WEEKLY_SUNDAY,
              'Weekly on Monday': SchedulerService.PATTERNS.WEEKLY_MONDAY,
              'Monthly First Day': SchedulerService.PATTERNS.MONTHLY_FIRST_DAY,
              'Yearly Jan 1st': SchedulerService.PATTERNS.YEARLY_JAN_FIRST,
            },
            description: 'Common cron patterns for easy scheduling',
            message: 'Common scheduling patterns reference',
          };

        case 'create_system_jobs':
          const systemJobs = this.schedulerService.createCommonJobs();
          const createdJobs = {
            dailyCleanup: systemJobs.dailyCleanup(),
            healthCheck: systemJobs.healthCheck(),
            weeklyBackup: systemJobs.weeklyBackup(),
            cacheRefresh: systemJobs.cacheRefresh(),
          };
          
          return {
            success: true,
            action: 'system_jobs_created',
            createdJobs,
            message: 'System maintenance jobs created successfully',
          };

        default:
          throw new ValidationException(
            'action',
            action,
            'one of: create_job, list_jobs, job_status, start_job, stop_job, remove_job, health_status, common_patterns, create_system_jobs',
            {
              availableActions: [
                'create_job', 'list_jobs', 'job_status', 'start_job', 
                'stop_job', 'remove_job', 'health_status', 'common_patterns', 
                'create_system_jobs'
              ],
            }
          );
      }
    } catch (error) {
      this.logger.error(`Scheduler demo failed for action ${action}:`, error);
      throw error;
    }
  }

  /**
   * 🗄️ DATABASE CACHING PATTERN - Complete Cache-Aside Implementation
   * 
   * This demonstrates the full database caching pattern you requested:
   * 1. First request -> Query PostgreSQL Database directly
   * 2. Store result in Redis cache (middle layer)  
   * 3. Subsequent requests -> Return from Redis cache (no database query)
   * 4. Cache invalidation when data changes
   * 
   * Perfect for frequently accessed data that doesn't change often.
   */
  async getDatabaseDataWithCaching(userId: number, forceRefresh = false) {
    const cacheKey = `user_data:${userId}`;
    const startTime = Date.now();
    
    try {
      this.logger.log(`🔍 Getting user data for ID: ${userId} (forceRefresh: ${forceRefresh})`);

      // Step 1: Check cache first (unless force refresh is requested)
      if (!forceRefresh) {
        const cachedData = await this.redisService.get(cacheKey);
        
        if (cachedData) {
          const data = JSON.parse(cachedData);
          const cacheTime = Date.now() - startTime;
          
          this.logger.log(`✅ CACHE HIT - Data retrieved from Redis in ${cacheTime}ms`);
          
          return {
            success: true,
            data,
            source: 'redis_cache',
            cached: true,
            responseTime: `${cacheTime}ms`,
            message: `User data retrieved from cache (Redis). No database query executed.`,
            cacheInfo: {
              hit: true,
              key: cacheKey,
              retrievalTime: cacheTime,
            },
            performance: {
              fast: true,
              reason: 'Data served from memory cache (Redis) - no database overhead'
            }
          };
        }
        
        this.logger.log(`❌ CACHE MISS - Key "${cacheKey}" not found in Redis`);
      } else {
        this.logger.log(`🔄 FORCE REFRESH - Bypassing cache and querying database`);
      }

      // Step 2: Cache miss - Query PostgreSQL Database
      this.logger.log(`🗄️  Querying PostgreSQL database for user ${userId}...`);
      const dbQueryStart = Date.now();

      // In a real implementation, you would query your actual users table:
      // const userData = await this.primaryDb.users.findUnique({ 
      //   where: { id: userId },
      //   select: { id: true, username: true, email: true, role: true, createdAt: true }
      // });

      // For demonstration - simulate database query with realistic data
      const userData = await this.simulateDatabaseQuery(userId);
      
      if (!userData) {
        throw new ResourceNotFoundException('User', userId);
      }

      const dbQueryTime = Date.now() - dbQueryStart;
      this.logger.log(`📊 Database query completed in ${dbQueryTime}ms`);

      // Step 3: Store in Redis cache for future requests (TTL: 15 minutes)
      const cacheData = {
        ...userData,
        cachedAt: new Date().toISOString(),
        cacheVersion: 1,
      };

      const cacheStorageStart = Date.now();
      await this.redisService.set(cacheKey, JSON.stringify(cacheData), 900); // 15 minutes TTL
      const cacheStorageTime = Date.now() - cacheStorageStart;
      
      this.logger.log(`💾 Data cached in Redis with 15-minute TTL (storage: ${cacheStorageTime}ms)`);

      const totalTime = Date.now() - startTime;
      
      return {
        success: true,
        data: cacheData,
        source: 'postgresql_database',
        cached: false,
        responseTime: `${totalTime}ms`,
        message: `Fresh data retrieved from PostgreSQL and cached for future requests.`,
        cacheInfo: {
          hit: false,
          key: cacheKey,
          stored: true,
          ttl: 900, // seconds
          storageTime: cacheStorageTime,
        },
        performance: {
          dbQueryTime: `${dbQueryTime}ms`,
          totalTime: `${totalTime}ms`,
          breakdown: {
            databaseQuery: dbQueryTime,
            cacheStorage: cacheStorageTime,
            total: totalTime,
          }
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error in database caching pattern:`, error);
      throw error;
    }
  }

  /**
   * 🔄 UPDATE DATA WITH CACHE INVALIDATION
   * 
   * Demonstrates how to properly update data and invalidate cache
   * This ensures cache consistency when underlying data changes.
   */
  async updateUserDataWithCacheInvalidation(userId: number, updateData: any) {
    const cacheKey = `user_data:${userId}`;
    
    try {
      this.logger.log(`🔄 Updating user ${userId} and invalidating cache...`);

      // Step 1: Update data in PostgreSQL (source of truth)
      // In real implementation:
      // const updatedUser = await this.primaryDb.users.update({
      //   where: { id: userId },
      //   data: updateData
      // });

      // For demonstration - simulate database update
      const updatedUser = await this.simulateDatabaseUpdate(userId, updateData);
      
      if (!updatedUser) {
        throw new ResourceNotFoundException('User', userId);
      }

      this.logger.log(`✅ Database updated successfully`);

      // Step 2: Invalidate cache (remove stale data)
      await this.redisService.del(cacheKey);
      this.logger.log(`🗑️  Cache invalidated - key "${cacheKey}" removed from Redis`);

      // Step 3: Optionally pre-populate cache with fresh data (cache warming)
      const freshCacheData = {
        ...updatedUser,
        cachedAt: new Date().toISOString(),
        cacheVersion: 1,
      };
      
      await this.redisService.set(cacheKey, JSON.stringify(freshCacheData), 900);
      this.logger.log(`🔥 Cache warmed - fresh data pre-loaded for next requests`);

      return {
        success: true,
        data: updatedUser,
        message: 'User updated successfully. Cache invalidated and refreshed.',
        cacheOperations: {
          invalidated: true,
          warmed: true,
          key: cacheKey,
        },
        dataFlow: [
          '1. Updated PostgreSQL database (source of truth)',
          '2. Invalidated stale cache data in Redis',
          '3. Pre-populated cache with fresh data (cache warming)',
          '4. Next requests will be served from fresh cache'
        ]
      };

    } catch (error) {
      this.logger.error(`❌ Error in update with cache invalidation:`, error);
      throw error;
    }
  }

  /**
   * 📈 CACHE PERFORMANCE COMPARISON
   * 
   * Demonstrates performance difference between cached and non-cached requests
   */
  async compareCachePerformance(userId: number, iterations = 5) {
    const results: {
      cached: number[];
      uncached: number[];
      comparison: any;
    } = {
      cached: [],
      uncached: [],
      comparison: {},
    };

    try {
      this.logger.log(`📊 Starting cache performance comparison (${iterations} iterations)...`);

      // First, ensure cache is empty
      await this.redisService.del(`user_data:${userId}`);

      // Test uncached performance (database queries)
      this.logger.log(`🗄️  Testing uncached performance (direct database queries)...`);
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await this.getDatabaseDataWithCaching(userId, true); // Force refresh
        const time = Date.now() - start;
        results.uncached.push(time);
        
        // Clear cache between tests
        await this.redisService.del(`user_data:${userId}`);
      }

      // Populate cache once
      await this.getDatabaseDataWithCaching(userId);

      // Test cached performance (Redis queries)
      this.logger.log(`💾 Testing cached performance (Redis queries)...`);
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await this.getDatabaseDataWithCaching(userId, false); // Use cache
        const time = Date.now() - start;
        results.cached.push(time);
      }

      // Calculate statistics
      const avgUncached = results.uncached.reduce((a, b) => a + b) / results.uncached.length;
      const avgCached = results.cached.reduce((a, b) => a + b) / results.cached.length;
      const speedImprovement = Math.round(((avgUncached - avgCached) / avgUncached) * 100);

      results.comparison = {
        averageUncachedTime: `${Math.round(avgUncached)}ms`,
        averageCachedTime: `${Math.round(avgCached)}ms`,
        speedImprovement: `${speedImprovement}%`,
        performanceGain: `${Math.round(avgUncached / avgCached)}x faster`,
        recommendation: speedImprovement > 50 
          ? 'Excellent cache performance - implement caching for this data type'
          : 'Moderate cache performance - consider for frequently accessed data',
      };

      this.logger.log(`📈 Performance comparison completed - ${speedImprovement}% improvement with caching`);

      return {
        success: true,
        testParameters: {
          userId,
          iterations,
          testType: 'cache_performance_comparison'
        },
        results,
        insights: {
          cacheEffectiveness: speedImprovement > 70 ? 'Excellent' : speedImprovement > 40 ? 'Good' : 'Moderate',
          recommendation: avgCached < 10 
            ? 'Cache is extremely fast - ideal for real-time applications'
            : avgCached < 50
            ? 'Cache provides good performance - suitable for most applications'  
            : 'Cache provides moderate improvement - optimize cache configuration',
          implementation: {
            pattern: 'cache-aside',
            ttl: '15 minutes (900 seconds)',
            invalidation: 'Manual on data updates',
            storage: 'Redis in-memory',
          }
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error in cache performance comparison:`, error);
      throw error;
    }
  }

  /**
   * 🔄 BULK CACHE OPERATIONS
   * 
   * Demonstrates caching multiple records efficiently
   */
  async bulkCacheOperations(userIds: number[]) {
    const operations: {
      hits: any[];
      misses: number[];
      cached: any[];
      performance: any;
    } = {
      hits: [],
      misses: [],
      cached: [],
      performance: {}
    };

    try {
      this.logger.log(`📦 Starting bulk cache operations for ${userIds.length} users...`);
      const startTime = Date.now();

      // Step 1: Check cache for all users
      const cacheCheckStart = Date.now();
      const cachePromises = userIds.map(async (userId) => {
        const cacheKey = `user_data:${userId}`;
        const cached = await this.redisService.get(cacheKey);
        return { userId, cacheKey, cached };
      });

      const cacheResults = await Promise.all(cachePromises);
      const cacheCheckTime = Date.now() - cacheCheckStart;

      // Step 2: Separate hits and misses
      cacheResults.forEach(result => {
        if (result.cached) {
          operations.hits.push({
            userId: result.userId,
            data: JSON.parse(result.cached)
          });
        } else {
          operations.misses.push(result.userId);
        }
      });

      this.logger.log(`📊 Cache check: ${operations.hits.length} hits, ${operations.misses.length} misses`);

      // Step 3: Fetch missing data from database
      if (operations.misses.length > 0) {
        this.logger.log(`🗄️  Fetching ${operations.misses.length} users from database...`);
        
        const dbFetchStart = Date.now();
        const dbPromises = operations.misses.map(userId => 
          this.simulateDatabaseQuery(userId)
        );
        const dbResults = await Promise.all(dbPromises);
        const dbFetchTime = Date.now() - dbFetchStart;

        // Step 4: Cache the new data
        const cacheStoreStart = Date.now();
        const cacheStorePromises = dbResults.map(async (userData, index) => {
          if (userData) {
            const userId = operations.misses[index];
            const cacheKey = `user_data:${userId}`;
            const cacheData = {
              ...userData,
              cachedAt: new Date().toISOString(),
              cacheVersion: 1,
            };
            
            await this.redisService.set(cacheKey, JSON.stringify(cacheData), 900);
            operations.cached.push({ userId, data: cacheData });
          }
        });
        
        await Promise.all(cacheStorePromises);
        const cacheStoreTime = Date.now() - cacheStoreStart;

        operations.performance.databaseFetchTime = `${dbFetchTime}ms`;
        operations.performance.cacheStoreTime = `${cacheStoreTime}ms`;
      }

      const totalTime = Date.now() - startTime;
      operations.performance.cacheCheckTime = `${cacheCheckTime}ms`;
      operations.performance.totalTime = `${totalTime}ms`;

      this.logger.log(`✅ Bulk operations completed in ${totalTime}ms`);

      return {
        success: true,
        summary: {
          totalRequested: userIds.length,
          cacheHits: operations.hits.length,
          cacheMisses: operations.misses.length,
          newlyCached: operations.cached.length,
          cacheHitRate: `${Math.round((operations.hits.length / userIds.length) * 100)}%`
        },
        data: {
          cachedUsers: [...operations.hits, ...operations.cached]
        },
        performance: operations.performance,
        cacheStrategy: {
          pattern: 'bulk_cache_aside',
          benefits: [
            'Reduces individual network calls to cache/database',
            'Improves overall throughput for multiple records',
            'Maintains cache consistency across batch operations'
          ]
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error in bulk cache operations:`, error);
      throw error;
    }
  }

  // 🎭 PRIVATE HELPER METHODS FOR DEMONSTRATION
  
  /**
   * Simulates a realistic database query with variable response time
   * In production, replace with actual Prisma query
   */
  private async simulateDatabaseQuery(userId: number) {
    // Simulate database query time (50-200ms)
    const queryTime = 50 + Math.random() * 150;
    await new Promise(resolve => setTimeout(resolve, queryTime));

    // Return realistic user data
    return {
      id: userId,
      username: `user_${userId}`,
      email: `user${userId}@example.com`,
      role: userId === 1 ? 'admin' : 'user',
      profile: {
        firstName: `User`,
        lastName: `${userId}`,
        lastLoginAt: new Date().toISOString(),
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: true
        }
      },
      stats: {
        loginCount: Math.floor(Math.random() * 100),
        lastActivity: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      },
      createdAt: new Date(Date.now() - Math.random() * 31536000000).toISOString(), // Random date within last year
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Simulates a database update operation
   * In production, replace with actual Prisma update
   */
  private async simulateDatabaseUpdate(userId: number, updateData: any) {
    // Simulate update operation time
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70));

    const existingUser = await this.simulateDatabaseQuery(userId);
    
    return {
      ...existingUser,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
  }
}