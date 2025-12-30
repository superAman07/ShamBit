import { IsString, IsNumber, IsArray, IsOptional, IsEnum, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, PaymentGatewayProvider } from '../enums/payment-status.enum';

export class CreatePaymentIntentDto {
  @IsString()
  orderId: string;

  @IsNumber()
  @Min(1)
  @Max(99999999) // $999,999.99 in cents
  amount: number;

  @IsString()
  currency: string;

  @IsEnum(PaymentGatewayProvider)
  gatewayProvider: PaymentGatewayProvider;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  allowedPaymentMethods: PaymentMethod[];

  @IsOptional()
  @IsString()
  confirmationMethod?: 'AUTOMATIC' | 'MANUAL';

  @IsOptional()
  @IsString()
  captureMethod?: 'AUTOMATIC' | 'MANUAL';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  applicationFee?: number;

  @IsOptional()
  @IsString()
  transferGroup?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class PaymentMethodDto {
  @IsEnum(PaymentMethod)
  type: PaymentMethod;

  @IsOptional()
  @IsObject()
  card?: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  };

  @IsOptional()
  @IsObject()
  billingDetails?: {
    name: string;
    email: string;
    phone?: string;
    address?: Record<string, any>;
  };
}