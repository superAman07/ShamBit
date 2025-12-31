import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'prod_123' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 'var_123' })
  @IsString()
  variantId: string;

  @ApiProperty({ example: 'seller_123' })
  @IsString()
  sellerId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 29.99 })
  @IsNumber()
  unitPrice: number;

  @ApiPropertyOptional({ example: { gift: true } })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: 'Gift wrap please' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderAddressDto {
  @ApiProperty({ example: '123 Main St' })
  @IsString()
  street: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  state: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  postalCode: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  country: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'cust_123' })
  @IsString()
  customerId: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ type: CreateOrderAddressDto })
  @ValidateNested()
  @Type(() => CreateOrderAddressDto)
  shippingAddress: CreateOrderAddressDto;

  @ApiPropertyOptional({ type: CreateOrderAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrderAddressDto)
  billingAddress?: CreateOrderAddressDto;

  @ApiPropertyOptional({ example: 'CARD' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'Please deliver to front door' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: { source: 'mobile_app' } })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: 'PROMO123' })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;
}
