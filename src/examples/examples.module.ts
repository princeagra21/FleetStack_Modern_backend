import { Module } from '@nestjs/common';
import { ExamplesSimpleController } from './examples-simple.controller';
import { ExamplesSimpleService } from './examples-simple.service';
import { SecurityExamplesController } from './security-examples.controller';
// import { I18nExamplesController } from './i18n-examples.controller';
// import { I18nExamplesService } from './i18n-examples.service';
import { RedisModule } from '../redis/redis.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

/**
 * Examples Module - Service Integration Demonstrations
 * 
 * This module provides comprehensive examples of how to integrate
 * and use various services in the FleetStack application:
 * 
 * 🔐 AUTHENTICATION & AUTHORIZATION:
 * - JWT token validation and user context extraction
 * - Role-based access control with guards
 * - Token blacklisting and session management
 * 
 * 🚀 REDIS INTEGRATION:
 * - Cache-aside pattern implementation
 * - Session storage and management
 * - Rate limiting with sliding windows
 * - Health checks and performance monitoring
 * 
 * 📊 BEST PRACTICES:
 * - Error handling patterns
 * - Logging strategies
 * - API documentation with Swagger
 * - Performance monitoring
 * 
 * 🛡️ SECURITY PATTERNS:
 * - Input validation
 * - Rate limiting by user role
 * - Token validation workflows
 * - Audit trail generation
 * 
 * Dependencies:
 * - RedisModule: For caching and session operations
 * - AuthModule: For JWT authentication (global)
 * - SecurityModule: For rate limiting (global)
 */
@Module({
  imports: [RedisModule, SchedulerModule], // Import Redis for caching examples and Scheduler for cron jobs
  controllers: [ExamplesSimpleController, SecurityExamplesController], // I18nExamplesController temporarily disabled
  providers: [ExamplesSimpleService], // I18nExamplesService temporarily disabled
  exports: [ExamplesSimpleService], // Export for other modules
})
export class ExamplesModule {}