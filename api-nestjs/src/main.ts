import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: process.env.NODE_ENV === 'production' 
        ? ['error', 'warn', 'log'] 
        : ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3001);
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }));

    // Compression middleware
    app.use(compression());

    // Global validation pipe with enhanced security
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: nodeEnv === 'production',
        validateCustomDecorators: true,
      }),
    );

    // CORS configuration
    const allowedOrigins = nodeEnv === 'production' 
      ? (configService.get<string>('ALLOWED_ORIGINS', '').split(',').filter(Boolean))
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4200'];

    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-API-Key'],
    });

    // API prefix
    app.setGlobalPrefix('api/v1');

    // Swagger documentation (only in non-production)
    if (nodeEnv !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('ShamBit API')
        .setDescription('ShamBit Quick Commerce Platform API')
        .setVersion('1.0')
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
        .addApiKey(
          {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
            description: 'API Key for service-to-service communication',
          },
          'API-Key',
        )
        .build();
      
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
        },
      });
    }

    // Graceful shutdown
    app.enableShutdownHooks();

    await app.listen(port, '0.0.0.0');
    
    logger.log(`🚀 NestJS API running on http://localhost:${port}`);
    logger.log(`📚 Environment: ${nodeEnv}`);
    
    if (nodeEnv !== 'production') {
      logger.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
    }
    
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

bootstrap();