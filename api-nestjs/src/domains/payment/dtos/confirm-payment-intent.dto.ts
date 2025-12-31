import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmPaymentIntentDto {
  @ApiProperty({ description: 'Payment method details' })
  @IsObject()
  paymentMethod: {
    type: string;
    card?: {
      number: string;
      exp_month: number;
      exp_year: number;
      cvc: string;
      name?: string;
    };
    bank_account?: {
      account_number: string;
      routing_number: string;
      account_holder_name: string;
    };
    wallet?: {
      type: string;
      email?: string;
      phone?: string;
    };
  };

  @ApiPropertyOptional({
    description: 'Return URL for redirect-based payment methods',
    example: 'https://example.com/payment/success',
  })
  @IsOptional()
  @IsString()
  returnUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether to save the payment method for future use',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  savePaymentMethod?: boolean = false;

  @ApiPropertyOptional({
    description: 'Customer information for payment processing',
  })
  @IsOptional()
  @IsObject()
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };

  @ApiPropertyOptional({
    description: 'Billing address (if different from customer address)',
  })
  @IsOptional()
  @IsObject()
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };

  @ApiPropertyOptional({ description: 'Additional metadata for the payment' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Confirmation method',
    enum: ['automatic', 'manual'],
    default: 'automatic',
  })
  @IsOptional()
  @IsEnum(['automatic', 'manual'])
  confirmationMethod?: string = 'automatic';

  @ApiPropertyOptional({
    description: 'Client-side confirmation token (for some gateways)',
  })
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiPropertyOptional({
    description: 'Device fingerprint for fraud detection',
  })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @ApiPropertyOptional({ description: 'IP address of the customer' })
  @IsOptional()
  @IsString()
  customerIpAddress?: string;

  @ApiPropertyOptional({ description: 'User agent of the customer browser' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
