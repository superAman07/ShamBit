import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryStatus } from '../enums/category-status.enum';
import { CategoryVisibility } from '../enums/category-visibility.enum';
import { CategoryMetadata } from '../entities/category.entity';
import { CategoryAttributeResponseDto } from './category-attribute.dto';

export class CategoryResponseDto {
  @ApiProperty({ example: 'cat_123' })
  id: string;

  @ApiProperty({ example: 'Electronics' })
  name: string;

  @ApiProperty({ example: 'electronics' })
  slug: string;

  @ApiPropertyOptional({ example: 'Electronic devices and accessories' })
  description?: string;

  @ApiPropertyOptional({ example: 'cat_parent123' })
  parentId?: string;

  @ApiProperty({ example: '/electronics' })
  path: string;

  @ApiProperty({ example: ['cat_root', 'cat_parent123'] })
  pathIds: string[];

  @ApiProperty({ example: 1 })
  depth: number;

  @ApiProperty({ example: 5 })
  childCount: number;

  @ApiProperty({ example: 25 })
  descendantCount: number;

  @ApiProperty({ example: 150 })
  productCount: number;

  @ApiProperty({ enum: CategoryStatus, example: CategoryStatus.ACTIVE })
  status: CategoryStatus;

  @ApiProperty({ enum: CategoryVisibility, example: CategoryVisibility.PUBLIC })
  visibility: CategoryVisibility;

  @ApiPropertyOptional({ example: 'Electronics - Best Deals' })
  seoTitle?: string;

  @ApiPropertyOptional({ example: 'Shop the latest electronics...' })
  seoDescription?: string;

  @ApiProperty({ example: ['electronics', 'gadgets'] })
  seoKeywords: string[];

  @ApiPropertyOptional()
  metadata?: CategoryMetadata;

  @ApiPropertyOptional({ example: 'https://example.com/icons/electronics.svg' })
  iconUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/banners/electronics.jpg' })
  bannerUrl?: string;

  @ApiProperty({ example: 1 })
  displayOrder: number;

  @ApiProperty({ example: true })
  isLeaf: boolean;

  @ApiProperty({ example: false })
  isFeatured: boolean;

  @ApiProperty({ example: ['brand_123', 'brand_456'] })
  allowedBrands: string[];

  @ApiProperty({ example: ['brand_789'] })
  restrictedBrands: string[];

  @ApiProperty({ example: false })
  requiresBrand: boolean;

  @ApiProperty({ example: 'admin_123' })
  createdBy: string;

  @ApiPropertyOptional({ example: 'admin_456' })
  updatedBy?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-02T00:00:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: [CategoryAttributeResponseDto] })
  attributes?: CategoryAttributeResponseDto[];

  @ApiPropertyOptional({ type: [CategoryResponseDto] })
  children?: CategoryResponseDto[];

  @ApiPropertyOptional({ type: CategoryResponseDto })
  parent?: CategoryResponseDto;
}

export class CategoryTreeResponseDto {
  @ApiProperty({ type: [CategoryResponseDto] })
  data: CategoryResponseDto[];

  @ApiPropertyOptional({ example: 'cat_root123' })
  rootId?: string;

  @ApiPropertyOptional({ example: 3 })
  maxDepth?: number;

  @ApiProperty({ example: 25 })
  totalNodes: number;
}

export class CategoryListResponseDto {
  @ApiProperty({ type: [CategoryResponseDto] })
  data: CategoryResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class CategoryBreadcrumbDto {
  @ApiProperty({ example: 'cat_123' })
  id: string;

  @ApiProperty({ example: 'Electronics' })
  name: string;

  @ApiProperty({ example: 'electronics' })
  slug: string;

  @ApiProperty({ example: '/electronics' })
  path: string;

  @ApiProperty({ example: 1 })
  level: number;
}

export class CategoryStatsDto {
  @ApiProperty({ example: 'cat_123' })
  categoryId: string;

  @ApiProperty({ example: 'Electronics' })
  categoryName: string;

  @ApiProperty({ example: 5 })
  directChildren: number;

  @ApiProperty({ example: 25 })
  totalDescendants: number;

  @ApiProperty({ example: 150 })
  totalProducts: number;

  @ApiProperty({ example: 1250 })
  totalViews: number;

  @ApiProperty({ example: 85 })
  totalSales: number;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  lastUpdated: Date;
}

export class CategoryValidationResultDto {
  @ApiProperty({ example: true })
  isValid: boolean;

  @ApiProperty({ example: [] })
  errors: string[];

  @ApiProperty({ example: [] })
  warnings: string[];

  @ApiPropertyOptional({ example: 'Category structure is valid' })
  message?: string;
}

export class CategoryMoveResultDto {
  @ApiProperty({ example: 'cat_123' })
  categoryId: string;

  @ApiProperty({ example: '/electronics/computers' })
  oldPath: string;

  @ApiProperty({ example: '/technology/computers' })
  newPath: string;

  @ApiProperty({ example: 5 })
  affectedDescendants: number;

  @ApiProperty({ example: 25 })
  updatedProducts: number;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  completedAt: Date;
}