import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { securityConfig } from './common/config/security.config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.use(securityConfig.helmet);
  app.use(new LoggingMiddleware().use);
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('FleetStack API')
    .setDescription('Modern Backend API for FleetStack')
    .setVersion('1.0')
    .addTag('health', 'Health check endpoints')
    .addTag('test', 'Test endpoints with dummy data')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3007, '0.0.0.0');
}
bootstrap();
