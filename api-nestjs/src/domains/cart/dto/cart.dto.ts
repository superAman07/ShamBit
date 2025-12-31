import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CartStatus } from '../entities/cart.entity';

export class AddItemToCartDto {
  @ApiProperty({
    description: 'Product variant ID',
    example: 'clp1234567890abcdef123456',
  })
  @IsString()
  @IsUUID()
  variantId: string;

  @ApiProperty({
    description: 'Quantity to add',
    example: 2,
    minimum: 1,
    maximum: 999,
  })
  @IsNumber()
  @Min(1)
  @Max(999)
  quantity: number;

  @ApiPropertyOptional({
    description:
      'Seller ID (optional, will be fetched from variant if not provided)',
    example: 'clp1234567890abcdef123456',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  sellerId?: string;
}

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'New quantity for the item',
    example: 3,
    minimum: 0,
    maximum: 999,
  })
  @IsNumber()
  @Min(0)
  @Max(999)
  quantity: number;
}

export class ApplyPromotionDto {
  @ApiProperty({
    description: 'Promotion code to apply',
    example: 'SAVE20',
  })
  @IsString()
  promotionCode: string;
}

export class ApplyMultiplePromotionsDto {
  @ApiProperty({
    description: 'Array of promotion codes to apply',
    example: ['SAVE20', 'FREESHIP'],
  })
  @IsArray()
  @IsString({ each: true })
  promotionCodes: string[];
}

export class CartFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by cart status',
    enum: CartStatus,
  })
  @IsOptional()
  @IsEnum(CartStatus)
  status?: CartStatus;

  @ApiPropertyOptional({
    description: 'Filter by seller ID',
    example: 'clp1234567890abcdef123456',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  sellerId?: string;

  @ApiPropertyOptional({
    description: 'Filter carts created after this date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  createdAfter?: Date;

  @ApiPropertyOptional({
    description: 'Filter carts created before this date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  createdBefore?: Date;
}

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class CartIncludeOptionsDto {
  @ApiPropertyOptional({
    description: 'Include cart items',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  items?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include applied promotions',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  appliedPromotions?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include user information',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  user?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include inventory reservations',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  reservations?: boolean = false;
}

export class MergeCartDto {
  @ApiProperty({
    description: 'Guest session ID to merge from',
    example: 'sess_1234567890abcdef',
  })
  @IsString()
  guestSessionId: string;
}

export class UpdateCartItemRequest {
  @ApiProperty({
    description: 'Cart item ID',
    example: 'clp1234567890abcdef123456',
  })
  @IsString()
  @IsUUID()
  itemId: string;

  @ApiProperty({
    description: 'New quantity',
    example: 2,
    minimum: 0,
    maximum: 999,
  })
  @IsNumber()
  @Min(0)
  @Max(999)
  quantity: number;
}

export class BulkUpdateCartItemsDto {
  @ApiProperty({
    description: 'Array of item updates',
    type: [UpdateCartItemRequest],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCartItemRequest)
  items: UpdateCartItemRequest[];
}

export class CartPricingOptionsDto {
  @ApiPropertyOptional({
    description: 'Include promotions in pricing calculation',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includePromotions?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include taxes in pricing calculation',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeTaxes?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include shipping in pricing calculation',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeShipping?: boolean = true;
}

// Response DTOs
export class CartItemResponseDto {
  @ApiProperty({ example: 'clp1234567890abcdef123456' })
  id: string;

  @ApiProperty({ example: 'clp1234567890abcdef123456' })
  variantId: string;

  @ApiProperty({ example: 'clp1234567890abcdef123456' })
  sellerId: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 1299.99 })
  unitPrice: number;

  @ApiProperty({ example: 1199.99 })
  currentUnitPrice: number;

  @ApiProperty({ example: 2399.98 })
  totalPrice: number;

  @ApiProperty({ example: 200.0 })
  discountAmount: number;

  @ApiProperty({ example: true })
  isAvailable: boolean;

  @ApiProperty({ example: null, required: false })
  availabilityReason?: string;

  @ApiProperty({ example: 'res_1234567890abcdef', required: false })
  reservationId?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', required: false })
  reservationExpiresAt?: string;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  addedAt: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  lastCheckedAt: string;

  @ApiProperty({ example: {} })
  variantSnapshot: any;

  @ApiProperty({ example: {} })
  pricingSnapshot: any;
}

export class CartResponseDto {
  @ApiProperty({ example: 'clp1234567890abcdef123456' })
  id: string;

  @ApiProperty({ example: 'clp1234567890abcdef123456', required: false })
  userId?: string;

  @ApiProperty({ example: 'sess_1234567890abcdef', required: false })
  sessionId?: string;

  @ApiProperty({ enum: CartStatus, example: CartStatus.ACTIVE })
  status: CartStatus;

  @ApiProperty({ example: 2399.98 })
  subtotal: number;

  @ApiProperty({ example: 200.0 })
  discountAmount: number;

  @ApiProperty({ example: 432.0 })
  taxAmount: number;

  @ApiProperty({ example: 50.0 })
  shippingAmount: number;

  @ApiProperty({ example: 2681.98 })
  totalAmount: number;

  @ApiProperty({ example: ['SAVE20'], type: [String] })
  appliedPromotions: string[];

  @ApiProperty({ example: ['PROMO1', 'PROMO2'], type: [String] })
  availablePromotions: string[];

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ example: 'en-IN' })
  locale: string;

  @ApiProperty({ example: 'Asia/Kolkata' })
  timezone: string;

  @ApiProperty({ example: '2024-01-16T10:00:00Z', required: false })
  expiresAt?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  lastActivityAt: string;

  @ApiProperty({ example: 'ord_1234567890abcdef', required: false })
  convertedToOrderId?: string;

  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: string;

  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];
}

export class CartSummaryResponseDto extends CartResponseDto {
  @ApiProperty({ example: 3 })
  itemCount: number;

  @ApiProperty({ example: 2 })
  sellerCount: number;

  @ApiProperty({ example: false })
  hasUnavailableItems: boolean;

  @ApiProperty({ example: false })
  hasPriceChanges: boolean;

  @ApiProperty({ example: 2681.98 })
  estimatedTotal: number;
}

export class PriceChangeItemDto {
  @ApiProperty({ example: 'clp1234567890abcdef123456' })
  itemId: string;

  @ApiProperty({ example: 'clp1234567890abcdef123456' })
  variantId: string;

  @ApiProperty({ example: 1199.99 })
  oldPrice: number;

  @ApiProperty({ example: 1299.99 })
  newPrice: number;

  @ApiProperty({ example: true })
  priceIncrease: boolean;

  @ApiProperty({ example: 8.33 })
  percentageChange: number;

  @ApiProperty({ example: 200.0 })
  impact: number;
}

export class PriceChangeResponseDto {
  @ApiProperty({ example: true })
  hasChanges: boolean;

  @ApiProperty({ type: [PriceChangeItemDto] })
  changes: PriceChangeItemDto[];

  @ApiProperty({ example: 100.0 })
  totalImpact: number;

  @ApiProperty({ example: 2 })
  affectedItemsCount: number;
}

export class CartPricingResponseDto {
  @ApiProperty({ example: 2399.98 })
  subtotal: number;

  @ApiProperty({ example: 200.0 })
  discountAmount: number;

  @ApiProperty({ example: 432.0 })
  taxAmount: number;

  @ApiProperty({ example: 50.0 })
  shippingAmount: number;

  @ApiProperty({ example: 2681.98 })
  totalAmount: number;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ type: Object })
  breakdown: any;
}

export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiProperty({ example: 'Operation completed successfully', required: false })
  message?: string;

  @ApiProperty({ example: null, required: false })
  error?: string;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: T[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;
}
