import { ApiProperty } from '@nestjs/swagger';

export class PublicSellerDto {
  @ApiProperty({ description: 'Seller account ID', example: 'cmjslh5nk0001g8wk4pgl66p1' })
  id: string;

  @ApiProperty({ description: 'Seller display name', example: 'John Doe' })
  sellerName: string;

  @ApiProperty({ description: 'Store/Business name', example: 'ABC Electronics' })
  storeName?: string;

  @ApiProperty({ description: 'Whether the seller is verified', example: true })
  isVerified: boolean;

  @ApiProperty({ description: 'Account creation date', example: '2025-12-30T12:59:59.833Z' })
  createdAt: Date;
}

export class PublicSellerListResponse {
  @ApiProperty({ type: [PublicSellerDto] })
  data: PublicSellerDto[];

  @ApiProperty({ description: 'Total number of sellers', example: 25 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 3 })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page', example: true })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page', example: false })
  hasPrev: boolean;
}