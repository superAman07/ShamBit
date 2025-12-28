import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { IPaymentGateway } from '../interfaces/payment-gateway.interface';

export interface PaymentGatewayConfig {
  provider: string;
  apiKey: string;
  secretKey: string;
  webhookSecret?: string;
  environment: 'sandbox' | 'production';
}

@Injectable()
export class PaymentGatewayService {
  private gateways: Map<string, IPaymentGateway> = new Map();

  constructor(
    private readonly logger: LoggerService,
  ) {}

  registerGateway(provider: string, gateway: IPaymentGateway): void {
    this.gateways.set(provider, gateway);
    this.logger.log(`Payment gateway registered: ${provider}`);
  }

  getGateway(provider: string): IPaymentGateway | undefined {
    return this.gateways.get(provider);
  }

  async createPaymentIntent(provider: string, data: any): Promise<any> {
    const gateway = this.getGateway(provider);
    if (!gateway) {
      throw new Error(`Payment gateway not found: ${provider}`);
    }

    try {
      return await gateway.createPaymentIntent(data);
    } catch (error) {
      this.logger.error(`Failed to create payment intent with ${provider}`, error, { data });
      throw error;
    }
  }

  async confirmPaymentIntent(provider: string, intentId: string, data?: any): Promise<any> {
    const gateway = this.getGateway(provider);
    if (!gateway) {
      throw new Error(`Payment gateway not found: ${provider}`);
    }

    try {
      return await gateway.confirmPaymentIntent(intentId, data);
    } catch (error) {
      this.logger.error(`Failed to confirm payment intent with ${provider}`, error, { intentId, data });
      throw error;
    }
  }

  async cancelPaymentIntent(provider: string, intentId: string): Promise<any> {
    const gateway = this.getGateway(provider);
    if (!gateway) {
      throw new Error(`Payment gateway not found: ${provider}`);
    }

    try {
      return await gateway.cancelPaymentIntent(intentId);
    } catch (error) {
      this.logger.error(`Failed to cancel payment intent with ${provider}`, error, { intentId });
      throw error;
    }
  }

  async createRefund(provider: string, transactionId: string, amount: number, reason?: string): Promise<any> {
    const gateway = this.getGateway(provider);
    if (!gateway) {
      throw new Error(`Payment gateway not found: ${provider}`);
    }

    try {
      return await gateway.createRefund(transactionId, amount, reason);
    } catch (error) {
      this.logger.error(`Failed to create refund with ${provider}`, error, { transactionId, amount, reason });
      throw error;
    }
  }

  async getPaymentStatus(provider: string, intentId: string): Promise<any> {
    const gateway = this.getGateway(provider);
    if (!gateway) {
      throw new Error(`Payment gateway not found: ${provider}`);
    }

    try {
      return await gateway.getPaymentStatus(intentId);
    } catch (error) {
      this.logger.error(`Failed to get payment status from ${provider}`, error, { intentId });
      throw error;
    }
  }

  async verifyWebhook(provider: string, payload: any, signature: string): Promise<boolean> {
    const gateway = this.getGateway(provider);
    if (!gateway) {
      throw new Error(`Payment gateway not found: ${provider}`);
    }

    try {
      return await gateway.verifyWebhook(payload, signature);
    } catch (error) {
      this.logger.error(`Failed to verify webhook from ${provider}`, error, { signature });
      return false;
    }
  }

  getAvailableGateways(): string[] {
    return Array.from(this.gateways.keys());
  }

  selectGateway(criteria: any): string {
    // Placeholder implementation - return default gateway
    return 'razorpay';
  }

  getWebhookSecret(provider: string): string | undefined {
    const gateway = this.getGateway(provider);
    // Placeholder implementation
    return 'mock-webhook-secret';
  }
}