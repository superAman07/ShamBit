import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger:
        process.env.NODE_ENV === 'production'
          ? ['error', 'warn', 'log']
          : ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3001);
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');

    // Cookie parser middleware
    app.use(cookieParser());

    // Enhanced security middleware with comprehensive headers
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              'https://cdnjs.cloudflare.com',
            ],
            scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false,
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        permittedCrossDomainPolicies: false,
      }),
    );

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

    // CORS configuration with enhanced security
    const allowedOrigins =
      nodeEnv === 'production'
        ? configService
            .get<string>('ALLOWED_ORIGINS', '')
            .split(',')
            .filter(Boolean)
        : [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:4200',
          ];

    app.enableCors({
      origin: allowedOrigins,
      credentials: true, // Required for cookies
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Tenant-ID',
        'X-API-Key',
      ],
      exposedHeaders: ['Set-Cookie'],
    });

    // API prefix
    app.setGlobalPrefix('api/v1');

    // Swagger documentation (only in non-production)
    if (nodeEnv !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('ShamBit API')
        .setDescription(
          `
          ShamBit Quick Commerce Platform API
          
          ## Security Features
          
          ### Authentication & Authorization:
          - **JWT-based authentication** with access and refresh tokens
          - **HttpOnly cookies** for secure token storage (prevents XSS)
          - **Token revocation** with Redis-based denylist
          - **Refresh token rotation** for enhanced security
          - **Role-based access control (RBAC)** with fine-grained permissions
          
          ### Security Headers:
          - **Content Security Policy (CSP)** to prevent XSS attacks
          - **Strict Transport Security (HSTS)** for HTTPS enforcement
          - **X-Content-Type-Options** to prevent MIME sniffing
          - **X-Frame-Options** to prevent clickjacking
          - **Referrer Policy** for privacy protection
          
          ### Session Security:
          - **Short-lived access tokens** (15 minutes)
          - **Secure cookie attributes** (HttpOnly, Secure, SameSite=Strict)
          - **Automatic token cleanup** with Redis TTL
          - **Session invalidation** on logout
          
          ## Settlement System
          
          The Settlement System manages seller payouts, wallet operations, and financial reconciliation.
          
          ### Key Features:
          - **Seller Account Management**: KYC verification, bank account setup
          - **Wallet Operations**: Balance management, transactions, reserves
          - **Settlement Processing**: Automated and manual settlement creation
          - **Razorpay Integration**: Payout processing and webhook handling
          - **Audit Trail**: Complete transaction history and status tracking
          
          ### Authentication:
          - Use Bearer token for API access or rely on secure cookies
          - Sellers can only access their own data
          - Admin/Finance roles have full access
          
          ### Rate Limiting:
          - 100 requests per minute per IP
          - Higher limits for authenticated users
        `,
        )
        .setVersion('1.0')
        .addTag('Authentication', 'Secure authentication with JWT and cookies')
        .addTag(
          'Settlements',
          'Settlement creation, processing, and management',
        )
        .addTag(
          'Seller Accounts',
          'Seller account setup, KYC, and bank details',
        )
        .addTag('Seller Wallets', 'Wallet balance operations and transactions')
        .addTag(
          'Settlement Webhooks',
          'Webhook endpoints for payment gateway integration',
        )
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
        .addServer('http://localhost:3001', 'Development server')
        .addServer('https://api.shambit.com', 'Production server')
        .build();

      const document = SwaggerModule.createDocument(app, config, {
        operationIdFactory: (controllerKey: string, methodKey: string) =>
          methodKey,
      });

      SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: 'none',
          filter: true,
          showRequestHeaders: true,
          tryItOutEnabled: true,
        },
        customSiteTitle: 'ShamBit API Documentation',
        customfavIcon: '/favicon.ico',
        customJs: [
          'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
        ],
        customCssUrl: [
          'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
        ],
      });
    }

    // Graceful shutdown
    app.enableShutdownHooks();

    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 NestJS API running on http://localhost:${port}`);
    logger.log(`📚 Environment: ${nodeEnv}`);
    logger.log(
      `🔒 Security headers enabled with CSP, HSTS, and XSS protection`,
    );
    logger.log(`🍪 Secure cookie authentication configured`);

    if (nodeEnv !== 'production') {
      logger.log(
        `📚 Swagger docs available at http://localhost:${port}/api/docs`,
      );
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
