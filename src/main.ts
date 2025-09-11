import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyUnderPressure from '@fastify/under-pressure';
import fastifyCompress from '@fastify/compress';
import fastifyCors from '@fastify/cors';
import { ClusterManager } from './cluster';

async function bootstrap() {
  // 🚀 ENTERPRISE CLUSTERING: Initialize cluster before app creation
  const isClusterMaster = await ClusterManager.startCluster();
  if (isClusterMaster) {
    // This is the master process, workers will handle requests
    return;
  }

  const logger = new Logger('Bootstrap');
  
  // 🔥 EXTREME PERFORMANCE CONFIGURATIONS FOR 10K+ REQUESTS
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = !isProduction;
  
  // SECURITY: Ensure NODE_ENV is properly set
  if (!process.env.NODE_ENV) {
    logger.warn('⚠️ NODE_ENV not set, defaulting to development mode');
  }
  
  // 🚀 ENTERPRISE FASTIFY ADAPTER - MAXIMUM PERFORMANCE (10K+ requests/4GB RAM)
  const fastifyAdapter = new FastifyAdapter({
    logger: false, // Disable Fastify logging for performance
    maxParamLength: 500, // Optimize URL parsing
    bodyLimit: 1048576, // 1MB body limit for performance
    keepAliveTimeout: 5000, // 5s keep-alive for connection reuse
    connectionTimeout: 10000, // 10s connection timeout
    // 🔥 EXTREME PERFORMANCE OPTIMIZATIONS
    disableRequestLogging: true, // Disable request logging for speed
    ignoreTrailingSlash: true, // Ignore trailing slashes for faster routing
    caseSensitive: false, // Case insensitive routing
    // SECURITY: Enhanced trustProxy configuration for production
    trustProxy: isProduction ? ['127.0.0.1', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'] : true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter);
  
  // SECURITY: Configure logging based on environment
  if (isProduction) {
    app.useLogger(['error']); // Only log errors in production
  } else {
    app.useLogger(['error', 'warn', 'log']); // Full logging in development
  }

  // 🚀 HIGH-THROUGHPUT OPTIMIZED COMPRESSION (optimized for 10K+ concurrent requests)
  await app.register(fastifyCompress, {
    global: true,
    threshold: 2048, // Higher threshold to reduce CPU overhead (compress responses > 2KB)
    encodings: ['gzip'], // Single encoding for performance - gzip is fastest
    zlibOptions: {
      level: 4, // Lower compression level for speed (1-9, 4 balances speed vs size for high concurrency)
      chunkSize: 32768, // Larger 32KB chunks for better throughput with high concurrency
      windowBits: 13, // Smaller window size for better CPU performance (faster)
      memLevel: 6, // Lower memory usage for high concurrency scenarios
    },
    inflateIfDeflated: true, // Auto-inflate deflated content for compatibility
    customTypes: /^(text\/|application\/json)/i, // Only compress essential text/JSON content
  });

  // 🛡️ INTELLIGENT BACKPRESSURE FOR 4GB RAM / 10K REQUESTS
  if (isProduction) {
    await app.register(fastifyUnderPressure, {
      maxEventLoopDelay: 1000,
      maxHeapUsedBytes: 3221225472, // 3GB of 4GB (75% memory usage)
      maxRssBytes: 3435973836, // 3.2GB RSS limit (80% of total)
      maxEventLoopUtilization: 0.85, // 85% event loop utilization
      message: 'Server optimizing for peak performance - retry in 5s',
      retryAfter: 5,
      exposeStatusRoute: '/health/pressure', // Expose pressure status
      healthCheck: async () => ({ status: 'peak-performance' }),
      healthCheckInterval: 1000, // 1s health checks for high load
    });
    logger.log('🛡️ Production: Advanced backpressure enabled for 10K+ requests');
  }

  // 🚀 CRITICAL FIX: REMOVED FASTIFY RATE LIMITING BOTTLENECK
  // Using Redis-based NestJS throttler instead for true 10K+ concurrent capability
  // The in-memory fastify-rate-limit was creating a bottleneck before requests reach the optimized Redis throttler
  logger.log('🔥 Performance: In-memory rate limiting DISABLED - using Redis-based throttler for 10K+ concurrency');

  // 🔒 ENTERPRISE SECURITY HEADERS
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: isDevelopment ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: isProduction,
    crossOriginOpenerPolicy: isProduction,
    crossOriginResourcePolicy: isProduction ? { policy: "same-site" } : false,
    hsts: isProduction ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    } : false,
  });

  // 🚀 FASTIFY CORS (High-Performance) - SECURITY HARDENED
  await app.register(fastifyCors, {
    origin: isDevelopment 
      ? true 
      : (process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || false),
    methods: isDevelopment 
      ? ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
      : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Remove OPTIONS in production
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Accept', 
      'X-Requested-With',
      ...(isDevelopment ? ['X-Debug-Token'] : []) // Debug headers only in dev
    ],
    credentials: true,
    optionsSuccessStatus: 204,
    maxAge: isDevelopment ? undefined : 86400, // Cache preflight for 24h in production
  });

  if (isDevelopment) {
    logger.log('🔧 Development: All performance optimizations active, security relaxed');
  } else {
    logger.log('🚀 Production: EXTREME PERFORMANCE MODE - 10K+ req capability enabled');
  }

  // SECURITY: Enable strict validation pipes globally
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip properties not defined in DTOs
    forbidNonWhitelisted: true, // Throw error for unknown properties
    transform: true, // Enable automatic type transformation
    disableErrorMessages: isProduction, // Hide detailed validation errors in production
    forbidUnknownValues: true, // Reject unknown values
    validationError: {
      target: false, // Don't expose target object in error
      value: false, // Don't expose rejected value in production
    },
  }));

  // SECURITY: Configure Swagger only in development - NEVER in production
  if (isDevelopment) {
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : `http://localhost:${process.env.PORT ?? 5000}`;

    const config = new DocumentBuilder()
      .setTitle('FleetStack Backend API')
      .setDescription('Comprehensive REST API for Fleet Management System with JWT Authentication')
      .setVersion('1.0')
      .addTag('Authentication', 'User authentication and authorization endpoints')
      .addTag('Users', 'User management and profile operations')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addServer(baseUrl, 'Development server')
      .build();

    const document = SwaggerModule.createDocument(app as any, config);
    SwaggerModule.setup('api/docs', app as any, document, {
      customSiteTitle: 'FleetStack API Documentation',
      customfavIcon: 'https://avatars.githubusercontent.com/u/20165699?s=200&v=4',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
      ],
      customCssUrl: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      ],
    });
    
    logger.log('📚 Development: Swagger documentation enabled at /api/docs');
  } else {
    logger.log('🔒 Production: Swagger documentation DISABLED for security');
  }

  // 🔄 Enterprise Graceful Shutdown
  app.enableShutdownHooks();
  
  process.on('SIGTERM', async () => {
    logger.log('🔄 SIGTERM received, starting graceful shutdown...');
    await app.close();
    logger.log('✅ Application shut down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('🔄 SIGINT received, starting graceful shutdown...');
    await app.close();
    logger.log('✅ Application shut down gracefully');
    process.exit(0);
  });

  const port = process.env.PORT ?? 5000;
  await app.listen(port, '0.0.0.0');
  
  const appUrl = isDevelopment 
    ? (process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : `http://localhost:${port}`)
    : 'PRODUCTION';
  
  logger.log(`🚀 Application is running on: ${appUrl}`);
  if (isDevelopment) {
    logger.log(`📚 Swagger documentation available at: ${appUrl}/api/docs`);
  } else {
    logger.log('🔒 Production: API documentation DISABLED for security');
  }
  logger.log(`🏥 Health check available at: ${appUrl}/health`);
  logger.log(`⚡ Performance mode: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🛡️ Security mode: ${isProduction ? 'PRODUCTION HARDENED' : 'DEVELOPMENT'}`);
}

bootstrap().catch((error) => {
  console.error('💥 Failed to start application:', error);
  process.exit(1);
});