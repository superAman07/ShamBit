import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Infrastructure
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { LoggerService } from '../../infrastructure/observability/logger.service';

// Services
import { SettlementService } from './settlement.service';
import { SettlementCalculationService } from './services/settlement-calculation.service';
import { SettlementJobService } from './services/settlement-job.service';
import { SettlementAuditService } from './services/settlement-audit.service';
import { RazorpayPayoutService } from './services/razorpay-payout.service';
import { SettlementValidationService } from './services/settlement-validation.service';

// Repositories
import { SettlementRepository } from './repositories/settlement.repository';
import { SellerAccountRepository } from './repositories/seller-account.repository';
import { SellerWalletRepository } from './repositories/seller-wallet.repository';

// Controllers
import { SettlementController } from './controllers/settlement.controller';
import { SellerAccountController } from './controllers/seller-account.controller';
import { SellerWalletController } from './controllers/seller-wallet.controller';
import { SettlementWebhookController } from './controllers/settlement-webhook.controller';

// Event Listeners
import { SettlementEventListener } from './listeners/settlement-event.listener';
import { WalletEventListener } from './listeners/wallet-event.listener';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  controllers: [
    SettlementController,
    SellerAccountController,
    SellerWalletController,
    SettlementWebhookController,
  ],
  providers: [
    // Infrastructure
    LoggerService,

    // Main Services
    SettlementService,
    SettlementCalculationService,
    SettlementJobService,
    SettlementAuditService,
    RazorpayPayoutService,
    SettlementValidationService,

    // Repositories
    SettlementRepository,
    SellerAccountRepository,
    SellerWalletRepository,

    // Event Listeners
    SettlementEventListener,
    WalletEventListener,
  ],
  exports: [
    SettlementService,
    SettlementCalculationService,
    SettlementJobService,
    SettlementAuditService,
    RazorpayPayoutService,
    SettlementRepository,
    SellerAccountRepository,
    SellerWalletRepository,
  ],
})
export class SettlementModule {}
