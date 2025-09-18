import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { securityConfig } from './common/config/security.config';
import { initializePrisma } from '../prisma/init/initialize';
import { WinstonLoggerService } from './common/services/winston-logger.service';
import { LoggerUtil } from './common/utils/logger.util';

async function bootstrap() {
  console.log('🚀 Starting FleetStack Backend Server...\n');

  try {
    await initializePrisma();
  } catch (error) {
    console.error('💥 Failed to initialize Prisma. Server startup aborted.');
    process.exit(1);
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      logger: new WinstonLoggerService(),
    }
  );

  app.use(securityConfig.helmet);
  app.use(new LoggingMiddleware().use);
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('FleetStack API')
    .setDescription('Modern Backend API for FleetStack')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('health', 'Health check endpoints')
    .addTag('test', 'Test endpoints with dummy data')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3007;
  await app.listen(port, '0.0.0.0');

  LoggerUtil.logSystemEvent('Server started', { port, environment: process.env.NODE_ENV || 'development' });

  console.log(`\n🎉 FleetStack Backend Server is running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
  console.log(`🏥 Health Check: http://localhost:${port}/health`);
  console.log(`📊 CSV Logs: api_logs/ directory`);
  console.log(`📝 Application Logs: winston_logs/ directory\n`);
}

bootstrap().catch((error) => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});
