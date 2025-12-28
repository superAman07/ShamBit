import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { 
  IPaymentGateway, 
  CreatePaymentIntentRequest, 
  ConfirmPaymentIntentRequest, 
  CreateRefundRequest, 
  WebhookVerificationRequest 
} from '../interfaces/payment-gateway.interface';

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

  async createPaymentIntent(provider: string, data: CreatePaymentIntentRequest): Promise<any> {
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

  async confirmPaymentIntent(provider: string, request: ConfirmPaymentIntentRequest): Promise<any> {
    const gateway = this.getGateway(provider);
    if (!gateway) {
      throw new Error(`Payment gateway not found: ${provider}`);
    }

    try {
      return await gateway.confirmPaymentIntent(request);
    } catch (error) {
      this.logger.error(`Failed to confirm payment intent with ${provider}`, error, { request });
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

  async createRefund(provider: string, request: CreateRefundRequest): Promise<any> {
    const gateway = this.getGateway(provider);
    if (!gateway) {
      throw new Error(`Payment gateway not found: ${provider}`);
    }

    try {
      return await gateway.createRefund(request);
    } catch (error) {
      this.logger.error(`Failed to create refund with ${provider}`, error, { request });
      throw error;
    }
  }

  async getPaymentStatus(provider: string, intentId: string): Promise<any> {
    const gateway = this.getGateway(provider);
    if (!gateway) {
      throw new Error(`Payment gateway not found: ${provider}`);
    }

    try {
      return await gateway.retrievePaymentIntent(intentId);
    } catch (error) {
      this.logger.error(`Failed to get payment status from ${provider}`, error, { intentId });
      throw error;
    }
  }

  async verifyWebhook(provider: string, request: WebhookVerificationRequest): Promise<boolean> {
    const gateway = this.getGateway(provider);
    if (!gateway) {
      throw new Error(`Payment gateway not found: ${provider}`);
    }

    try {
      return await gateway.verifyWebhook(request);
    } catch (error) {
      this.logger.error(`Failed to verify webhook from ${provider}`, error, { request });
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