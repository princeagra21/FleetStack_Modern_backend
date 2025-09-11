import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ExamplesSimpleService } from './examples-simple.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';

/**
 * Examples Controller - Service Integration Patterns
 * 
 * This controller demonstrates comprehensive usage of FleetStack services:
 * 
 * 🔐 AUTHENTICATION & AUTHORIZATION:
 * - JWT token validation with @UseGuards(JwtAuthGuard)
 * - Role-based access control with @Roles() decorator
 * - Token information extraction from JWT payload
 * 
 * 🚀 REDIS INTEGRATION:
 * - Cache-aside pattern implementation
 * - TTL-based cache expiration
 * - Complex Redis operations
 * - Session management with Redis
 * 
 * 🛡️ RATE LIMITING:
 * - Per-user rate limiting based on roles
 * - Sliding window rate limiting algorithm
 * - Rate limit status tracking
 * 
 * 📊 MONITORING & HEALTH CHECKS:
 * - Service health monitoring
 * - Performance metrics collection
 * - Error tracking and logging
 * 
 * 📝 API DOCUMENTATION:
 * - Comprehensive Swagger documentation
 * - Request/response examples
 * - Error code documentation
 * 
 * Each endpoint demonstrates specific patterns and best practices
 * for building enterprise-grade APIs with NestJS.
 */
@ApiTags('Examples - Complete Service Integration')
@Controller('examples')
@UseGuards(JwtAuthGuard, RolesGuard) // Require authentication for all endpoints
@ApiBearerAuth() // Swagger: Show JWT requirement
export class ExamplesSimpleController {
  constructor(private readonly examplesService: ExamplesSimpleService) {}

  /**
   * 🔍 REDIS CACHING DEMONSTRATION
   * 
   * Shows cache-aside pattern with Redis:
   * 1. Check cache first
   * 2. Generate data if cache miss
   * 3. Store in cache with TTL
   * 4. Return data with cache status
   */
  @Get('redis-cache/:key')
  @Roles('user', 'admin', 'superadmin') // All authenticated users
  @ApiOperation({
    summary: 'Demonstrate Redis caching patterns',
    description: `
    This endpoint shows how to implement cache-aside pattern with Redis:
    
    **First Request (Cache Miss):**
    - Checks Redis for data
    - Generates fresh data
    - Stores in Redis with 5-minute TTL
    - Returns data with fromCache: false
    
    **Subsequent Requests (Cache Hit):**
    - Retrieves data from Redis
    - Returns cached data with fromCache: true
    
    **Use Cases:**
    - Expensive database queries
    - API responses
    - Computed results
    - User preferences
    `,
  })
  @ApiParam({
    name: 'key',
    description: 'Cache key to demonstrate with',
    example: 'user_profile_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache operation completed successfully',
    schema: {
      example: {
        success: true,
        data: {
          key: 'user_profile_123',
          timestamp: '2024-01-01T12:00:00.000Z',
          randomValue: 456,
          computedValue: 630,
          metadata: {
            generatedBy: 'ExamplesService',
            version: '1.0',
            ttl: 300,
          },
        },
        fromCache: false,
        message: 'Fresh data generated and cached successfully',
      },
    },
  })
  async demonstrateRedisCache(@Param('key') key: string) {
    return this.examplesService.demonstrateRedisCache(key);
  }

  /**
   * 🔄 COMPLEX REDIS OPERATIONS
   * 
   * Shows multiple Redis operations for user session management:
   * 1. Session data storage
   * 2. Activity counters
   * 3. Recent users tracking
   * 4. Performance monitoring
   */
  @Post('redis-complex')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Complex Redis operations demo',
    description: `
    Demonstrates multiple Redis operations working together:
    
    **Operations Performed:**
    1. **Session Storage**: Stores user session with 1-hour TTL
    2. **Activity Tracking**: Increments user activity counter
    3. **Recent Users**: Maintains list of recent active users
    
    **Redis Patterns Shown:**
    - Multi-key operations
    - Different TTL strategies
    - List management
    - Performance tracking
    `,
  })
  @ApiBody({
    description: 'User ID for operations',
    schema: {
      example: { userId: 123 },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Complex operations completed',
    schema: {
      example: {
        success: true,
        operations: {
          sessionStored: true,
          activityCount: 5,
          recentUsersUpdated: true,
        },
        performance: {
          totalTime: '45ms',
          operationsCompleted: 3,
        },
        message: 'Complex Redis operations completed successfully',
      },
    },
  })
  async complexRedisOperations(@Body() body: { userId: number }) {
    return this.examplesService.demonstrateComplexRedisOps(body.userId);
  }

  /**
   * 🔐 JWT TOKEN VALIDATION PATTERNS
   * 
   * Shows how JWT tokens work with Redis for session management:
   * 1. Token blacklist checking
   * 2. Session validation
   * 3. Activity tracking
   * 4. Security enforcement
   */
  @Post('token-validation')
  @Roles('admin', 'superadmin') // Admin access only
  @ApiOperation({
    summary: 'JWT token validation with Redis',
    description: `
    Demonstrates comprehensive token validation:
    
    **Validation Steps:**
    1. **Blacklist Check**: Verify token isn't revoked
    2. **Session Check**: Confirm active user session
    3. **Activity Update**: Track last user activity
    
    **Security Features:**
    - Token revocation support
    - Session timeout handling
    - Activity monitoring
    - Audit trail generation
    `,
  })
  @ApiBody({
    description: 'Token validation request',
    schema: {
      example: {
        tokenId: 'jwt_abc123def456',
        userId: 123,
      },
    },
  })
  async validateToken(@Body() body: { tokenId: string; userId: number }) {
    return this.examplesService.demonstrateTokenValidation(body.tokenId, body.userId);
  }

  /**
   * 🚦 RATE LIMITING DEMONSTRATION
   * 
   * Shows role-based rate limiting with Redis:
   * 1. Role-specific limits
   * 2. Sliding window algorithm
   * 3. Remaining quota tracking
   * 4. Reset time calculation
   */
  @Get('rate-limit-demo')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Rate limiting demonstration',
    description: `
    Shows how rate limiting works based on user roles:
    
    **Rate Limits by Role:**
    - **User**: 100 requests/hour
    - **Admin**: 500 requests/hour  
    - **Superadmin**: 1000 requests/hour
    
    **Algorithm**: Sliding window with Redis
    **Features**: Remaining quota, reset time, role-based limits
    `,
  })
  @ApiQuery({
    name: 'userId',
    description: 'User ID to check rate limit for',
    example: 123,
  })
  @ApiQuery({
    name: 'userRole',
    description: 'User role for rate limit calculation',
    example: 'user',
    enum: ['user', 'admin', 'superadmin'],
  })
  @ApiQuery({
    name: 'endpoint',
    description: 'API endpoint being accessed',
    example: '/api/users',
  })
  @ApiResponse({
    status: 200,
    description: 'Rate limit check completed',
    schema: {
      example: {
        allowed: true,
        limit: 100,
        remaining: 95,
        resetTime: '2024-01-01T13:00:00.000Z',
        message: 'Request within rate limit',
      },
    },
  })
  async demonstrateRateLimit(
    @Query('userId', ParseIntPipe) userId: number,
    @Query('userRole') userRole: string,
    @Query('endpoint') endpoint: string,
  ) {
    return this.examplesService.demonstrateRateLimiting(userId, userRole, endpoint);
  }

  /**
   * 🏥 SERVICE HEALTH MONITORING
   * 
   * Shows health check patterns:
   * 1. Redis connectivity testing
   * 2. Performance measurement
   * 3. Error detection
   * 4. Service status reporting
   */
  @Get('health-check')
  @Roles('admin', 'superadmin') // Admin access only
  @ApiOperation({
    summary: 'Service health check demonstration',
    description: `
    Demonstrates comprehensive service health monitoring:
    
    **Health Checks Performed:**
    - Redis connectivity test
    - Data integrity verification
    - Performance measurement
    - Error detection
    
    **Use Cases:**
    - Load balancer health checks
    - Monitoring dashboards
    - Alerting systems
    - Service discovery
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed',
    schema: {
      example: {
        success: true,
        services: {
          redis: {
            status: 'healthy',
            latency: 15,
            error: null,
          },
          timestamp: '2024-01-01T12:00:00.000Z',
        },
        overallStatus: 'healthy',
      },
    },
  })
  async getHealthCheck() {
    return this.examplesService.getServiceHealthCheck();
  }

  /**
   * 🚀 ADVANCED CACHING PATTERNS
   * 
   * Shows sophisticated caching strategies:
   * 1. Cache warming
   * 2. Multi-level caching
   * 3. Cache invalidation
   * 4. Metadata tracking
   */
  @Post('advanced-cache')
  @Roles('admin', 'superadmin')
  @ApiOperation({
    summary: 'Advanced caching patterns',
    description: `
    Demonstrates enterprise-grade caching strategies:
    
    **Patterns Shown:**
    - **Cache Warming**: Pre-load related data
    - **Metadata Tracking**: Cache statistics and tags
    - **Multi-level Keys**: Hierarchical cache structure
    - **TTL Strategies**: Different expiration times
    
    **Benefits:**
    - Improved performance
    - Reduced database load
    - Better user experience
    - Scalable architecture
    `,
  })
  @ApiBody({
    description: 'Entity information for caching',
    schema: {
      example: {
        entityType: 'user',
        entityId: 123,
      },
    },
  })
  async advancedCaching(@Body() body: { entityType: string; entityId: number }) {
    return this.examplesService.demonstrateAdvancedCaching(body.entityType, body.entityId);
  }

  /**
   * 📋 INTEGRATION SUMMARY
   * 
   * Provides overview of all available examples:
   */
  @Get('integration-summary')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Integration examples summary',
    description: 'Overview of all available service integration examples',
  })
  async getIntegrationSummary() {
    return {
      success: true,
      examples: {
        error_handling: {
          endpoint: 'GET /examples/error-demo',
          description: 'Comprehensive error handling demonstration',
          useCase: 'Learning error patterns, debugging, monitoring',
        },
        validation_errors: {
          endpoint: 'POST /examples/validation-demo',
          description: 'Validation error handling with detailed feedback',
          useCase: 'Form validation, input sanitization',
        },
        redis_caching: {
          endpoint: 'GET /examples/redis-cache/:key',
          description: 'Cache-aside pattern with TTL',
          useCase: 'Expensive computations, API responses',
        },
        complex_redis: {
          endpoint: 'POST /examples/redis-complex',
          description: 'Multi-operation Redis workflows',
          useCase: 'Session management, activity tracking',
        },
        token_validation: {
          endpoint: 'POST /examples/token-validation',
          description: 'JWT token validation with blacklisting',
          useCase: 'Authentication, security, audit trails',
        },
        rate_limiting: {
          endpoint: 'GET /examples/rate-limit-demo',
          description: 'Role-based rate limiting',
          useCase: 'API protection, abuse prevention',
        },
        health_checks: {
          endpoint: 'GET /examples/health-check',
          description: 'Service availability monitoring',
          useCase: 'DevOps, monitoring, alerting',
        },
        advanced_caching: {
          endpoint: 'POST /examples/advanced-cache',
          description: 'Enterprise caching strategies',
          useCase: 'Performance optimization, scalability',
        },
      },
      services_demonstrated: [
        'Redis (caching, sessions, counters)',
        'JWT Authentication (tokens, roles)',
        'Rate Limiting (role-based, sliding window)',
        'Health Monitoring (connectivity, performance)',
        'Error Handling (global filters, custom exceptions)',
        'API Documentation (Swagger, examples)',
      ],
      message: 'All service integration patterns are available for testing',
    };
  }

  /**
   * 🚨 ERROR HANDLING DEMONSTRATION
   * 
   * Shows global error handling with custom exceptions:
   * 1. Business logic errors
   * 2. Resource not found
   * 3. Validation errors
   * 4. Service unavailable
   * 5. Rate limiting
   * 6. Database errors
   * 7. Cache errors
   * 8. Permission denied
   * 9. External API errors
   * 10. Unexpected errors
   */
  @Get('error-demo')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Error handling demonstration',
    description: `
    Demonstrates comprehensive global error handling with custom exceptions.
    
    **Error Types Available:**
    - **business_logic**: Domain-specific business rule violations
    - **resource_not_found**: Resource lookup failures
    - **resource_conflict**: Duplicate resource conflicts
    - **validation_error**: Input validation failures
    - **service_unavailable**: External service downtime
    - **rate_limit**: API rate limiting exceeded
    - **database_error**: Database operation failures
    - **cache_error**: Cache service errors
    - **permission_denied**: Access control violations
    - **external_api**: Third-party API failures
    - **unexpected_error**: Unhandled system errors
    
    **Global Error Handling Features:**
    - Standardized error response format
    - Detailed error logging with context
    - Error categorization and severity levels
    - Request correlation IDs
    - Stack trace filtering (dev mode only)
    - Performance metrics collection
    `,
  })
  @ApiQuery({
    name: 'type',
    required: true,
    description: 'Type of error to demonstrate',
    enum: [
      'business_logic',
      'resource_not_found',
      'resource_conflict',
      'validation_error',
      'service_unavailable',
      'rate_limit',
      'database_error',
      'cache_error',
      'permission_denied',
      'external_api',
      'unexpected_error',
    ],
    example: 'business_logic',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for context (optional)',
    example: 123,
  })
  @ApiResponse({
    status: 422,
    description: 'Business Logic Error Example',
    schema: {
      example: {
        success: false,
        error: 'Business Logic Error',
        message: 'User cannot perform this action due to business rules',
        statusCode: 422,
        path: '/examples/error-demo',
        method: 'GET',
        timestamp: '2024-01-01T12:00:00.000Z',
        requestId: 'req_abc123',
        details: {
          errorCode: 'USER_ACTION_FORBIDDEN',
          context: {
            userId: 123,
            action: 'delete_account',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Resource Not Found Error Example',
    schema: {
      example: {
        success: false,
        error: 'Resource Not Found',
        message: "User with identifier '999' was not found",
        statusCode: 404,
        path: '/examples/error-demo',
        method: 'GET',
        timestamp: '2024-01-01T12:00:00.000Z',
        requestId: 'req_abc123',
        details: {
          resourceType: 'User',
          identifier: 999,
        },
      },
    },
  })
  async demonstrateErrorHandling(
    @Query('type') errorType: string,
    @Query('userId') userId?: number,
  ) {
    return this.examplesService.demonstrateErrorHandling(errorType, { userId });
  }

  /**
   * 📝 VALIDATION ERROR DEMONSTRATION
   * 
   * Shows detailed validation error handling:
   * 1. Field-level validation
   * 2. Format validation
   * 3. Business rule validation
   * 4. Multiple error aggregation
   */
  @Post('validation-demo')
  @Roles('user', 'admin', 'superadmin')
  @ApiOperation({
    summary: 'Validation error demonstration',
    description: `
    Demonstrates comprehensive validation error handling.
    
    **Validation Rules Enforced:**
    - **Email**: Required, valid email format
    - **Username**: Required, 3+ characters, alphanumeric + underscore only
    - **Age**: Required, number between 0-150
    - **Role**: Optional, must be 'user', 'admin', or 'superadmin'
    
    **Features:**
    - Multiple validation errors aggregated
    - Clear error messages with expected formats
    - Context-aware error responses
    - Field-specific error details
    `,
  })
  @ApiBody({
    description: 'User data to validate',
    schema: {
      example: {
        email: 'invalid-email',
        username: 'ab',
        age: -5,
        role: 'invalid_role',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Validation successful',
    schema: {
      example: {
        success: true,
        message: 'All validation checks passed',
        validatedData: {
          email: 'user@example.com',
          username: 'valid_user',
          age: 25,
          role: 'user',
        },
        timestamp: '2024-01-01T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    schema: {
      example: {
        success: false,
        error: 'Validation Error',
        message: 'Invalid value for field \'request_data\'. Expected: valid user data object',
        statusCode: 400,
        path: '/examples/validation-demo',
        method: 'POST',
        timestamp: '2024-01-01T12:00:00.000Z',
        requestId: 'req_abc123',
        details: {
          field: 'request_data',
          value: { email: 'invalid', username: 'ab' },
          expectedFormat: 'valid user data object',
          context: {
            validationErrors: [
              'Email must be a valid email address',
              'Username must be at least 3 characters long',
            ],
            expectedFormat: {
              email: 'string (valid email format)',
              username: 'string (3+ chars, alphanumeric + underscore)',
              age: 'number (0-150)',
              role: 'string (user, admin, or superadmin)',
            },
          },
        },
      },
    },
  })
  async demonstrateValidationErrors(@Body() data: any) {
    return this.examplesService.demonstrateValidationErrors(data);
  }

  /**
   * 🕒 NODE-CRON SCHEDULER DEMONSTRATION
   * 
   * Shows comprehensive scheduling functionality:
   * 1. Create scheduled jobs with custom patterns
   * 2. Job management (start, stop, remove)
   * 3. Monitor execution status and health
   * 4. Common scheduling patterns
   */
  @Post('scheduler/:action')
  @Roles('admin', 'superadmin') // Admin access for job management
  @ApiOperation({
    summary: 'Demonstrate node-cron scheduler operations',
    description: `
    This endpoint shows comprehensive scheduled job management using node-cron:
    
    **Available Actions:**
    - create_job: Create a new scheduled job
    - list_jobs: List all scheduled jobs
    - job_status: Get detailed job status
    - start_job: Start a stopped job
    - stop_job: Stop a running job
    - remove_job: Remove a job completely
    - health_status: Get scheduler health metrics
    - common_patterns: Show common cron patterns
    - create_system_jobs: Create predefined system jobs
    
    **Use Cases:**
    - Daily data backups
    - Periodic cache cleanup
    - System health monitoring
    - Report generation
    - Email notifications
    - Log rotation
    `,
  })
  @ApiParam({
    name: 'action',
    description: 'Scheduler action to perform',
    enum: [
      'create_job',
      'list_jobs', 
      'job_status',
      'start_job',
      'stop_job',
      'remove_job',
      'health_status',
      'common_patterns',
      'create_system_jobs'
    ],
    example: 'list_jobs',
  })
  @ApiBody({
    description: 'Job data (required for create_job, job_status, start_job, stop_job, remove_job)',
    required: false,
    schema: {
      example: {
        name: 'Daily Report Generation',
        pattern: '0 9 * * *',
        description: 'Generate daily reports at 9 AM',
        jobId: 'job_1_1234567890'
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduler operation completed successfully',
    schema: {
      example: {
        success: true,
        action: 'list_jobs',
        summary: {
          total: 3,
          running: 3,
          stopped: 0,
        },
        jobs: [
          {
            id: 'job_1_1234567890',
            name: 'System Health Monitor',
            pattern: '*/5 * * * *',
            description: 'Monitors system health and logs status',
            isRunning: true,
            executionCount: 5,
            errorCount: 0,
            nextExecution: '2024-01-01T12:05:00.000Z',
          },
        ],
        message: 'Found 3 scheduled jobs',
      },
    },
  })
  async demonstrateScheduler(
    @Param('action') action: string,
    @Body() jobData?: any,
  ) {
    return this.examplesService.demonstrateSchedulerOperations(action, jobData);
  }

  /**
   * 🗄️ DATABASE CACHING EXAMPLES
   * 
   * Complete cache-aside pattern demonstrations showing:
   * 1st Request -> PostgreSQL Database -> Store in Redis Cache
   * 2nd+ Requests -> Return from Redis Cache (no DB query)
   */

  /**
   * Get User Data with Database Caching
   */
  @Get('database-cache/:userId')
  @ApiOperation({
    summary: 'Database Caching Pattern Demo',
    description: `
    **The Exact Pattern You Requested:**
    
    📊 **First Time Request:**
    1. Query PostgreSQL Database directly
    2. Store result in Redis cache (middle layer)
    3. Return data with performance metrics
    
    🚀 **Subsequent Requests:**
    1. Check Redis cache first
    2. Return cached data instantly (no database query)
    3. Dramatically faster response times
    
    **Perfect for:**
    - Frequently accessed user profiles
    - Product catalogs
    - Configuration data
    - Any data that doesn't change often
    
    **Query Parameters:**
    - \`refresh=true\`: Force database query (bypass cache)
    - \`refresh=false\`: Use cache if available (default)
    `,
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to fetch data for',
    example: 123,
  })
  @ApiQuery({
    name: 'refresh',
    required: false,
    description: 'Force refresh from database (bypass cache)',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'User data with caching information',
    schema: {
      example: {
        success: true,
        data: {
          id: 123,
          username: 'user_123',
          email: 'user123@example.com',
          role: 'user',
          profile: {
            firstName: 'User',
            lastName: '123',
            lastLoginAt: '2024-01-01T12:00:00.000Z',
            preferences: {
              theme: 'dark',
              language: 'en',
              notifications: true
            }
          },
          cachedAt: '2024-01-01T12:00:00.000Z',
          cacheVersion: 1
        },
        source: 'redis_cache',
        cached: true,
        responseTime: '2ms',
        message: 'User data retrieved from cache (Redis). No database query executed.',
        cacheInfo: {
          hit: true,
          key: 'user_data:123',
          retrievalTime: 2
        },
        performance: {
          fast: true,
          reason: 'Data served from memory cache (Redis) - no database overhead'
        }
      },
    },
  })
  async getDatabaseCache(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('refresh') refresh?: string,
  ) {
    const forceRefresh = refresh === 'true';
    return this.examplesService.getDatabaseDataWithCaching(userId, forceRefresh);
  }

  /**
   * Update User Data with Cache Invalidation
   */
  @Post('database-cache/:userId/update')
  @ApiOperation({
    summary: 'Update Data with Cache Invalidation',
    description: `
    **Cache Invalidation Pattern:**
    
    🔄 **Update Process:**
    1. Update PostgreSQL database (source of truth)
    2. Remove stale data from Redis cache
    3. Pre-populate cache with fresh data (cache warming)
    4. Next requests serve fresh cached data
    
    **Why Cache Invalidation Matters:**
    - Prevents serving stale data
    - Maintains data consistency
    - Improves user experience
    - Keeps cache and database synchronized
    
    This ensures users always see the most current information.
    `,
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to update',
    example: 123,
  })
  @ApiBody({
    description: 'Data to update',
    examples: {
      updateProfile: {
        summary: 'Update user profile',
        value: {
          username: 'new_username',
          profile: {
            firstName: 'John',
            lastName: 'Doe',
            preferences: {
              theme: 'light',
              language: 'es'
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully with cache operations',
  })
  async updateDatabaseCache(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateData: any,
  ) {
    return this.examplesService.updateUserDataWithCacheInvalidation(userId, updateData);
  }

  /**
   * Cache Performance Comparison
   */
  @Get('database-cache-performance/:userId')
  @ApiOperation({
    summary: 'Cache vs Database Performance Test',
    description: `
    **Performance Analysis:**
    
    📈 **Comparison Test:**
    1. Measures database query times (uncached)
    2. Measures cache retrieval times (cached)  
    3. Calculates speed improvement percentage
    4. Shows performance recommendations
    
    **Typical Results:**
    - Database queries: 50-200ms
    - Cache retrieval: 1-10ms  
    - Speed improvement: 80-95%
    - Performance gain: 10-50x faster
    
    **Real-world Impact:**
    - Better user experience
    - Reduced server load
    - Lower database costs
    - Higher application throughput
    `,
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID for performance test',
    example: 123,
  })
  @ApiQuery({
    name: 'iterations',
    required: false,
    description: 'Number of test iterations (default: 5)',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Performance comparison results',
  })
  async comparePerformance(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('iterations') iterations?: string,
  ) {
    const testIterations = iterations ? parseInt(iterations, 10) : 5;
    return this.examplesService.compareCachePerformance(userId, testIterations);
  }

  /**
   * Bulk Cache Operations Demo
   */
  @Post('database-cache-bulk')
  @ApiOperation({
    summary: 'Bulk Database Caching Demo',
    description: `
    **Bulk Caching Strategy:**
    
    📦 **Efficient Batch Processing:**
    1. Check cache for multiple users simultaneously
    2. Identify cache hits vs misses
    3. Fetch missing data from database in batch
    4. Cache all new data efficiently
    
    **Benefits:**
    - Reduces network round trips
    - Improves throughput for multiple records
    - Maintains cache consistency
    - Optimizes resource usage
    
    **Use Cases:**
    - User list pages
    - Dashboard data loading
    - Report generation
    - Bulk data synchronization
    `,
  })
  @ApiBody({
    description: 'Array of user IDs to process',
    examples: {
      bulkUsers: {
        summary: 'Multiple user IDs',
        value: {
          userIds: [1, 2, 3, 4, 5]
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk cache operations results',
  })
  async bulkCacheOperations(@Body() body: { userIds: number[] }) {
    return this.examplesService.bulkCacheOperations(body.userIds);
  }
}