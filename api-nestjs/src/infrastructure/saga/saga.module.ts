import { Module } from '@nestjs/common';
import { SagaOrchestratorService } from './saga-orchestrator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DomainModule } from '../domain/domain.module';

@Module({
  imports: [PrismaModule, DomainModule],
  providers: [SagaOrchestratorService],
  exports: [SagaOrchestratorService],
})
export class SagaModule {}
