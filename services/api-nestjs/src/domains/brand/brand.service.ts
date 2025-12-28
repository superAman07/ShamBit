import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BrandRepository } from './brand.repository';
import { LoggerService } from '../../infrastructure/observability/logger.service';

export enum BrandStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  status: BrandStatus;
  isGlobal: boolean;
  sellerId?: string;
  categoryIds: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandDto {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  categoryIds: string[];
  isGlobal?: boolean;
  sellerId?: string;
}

@Injectable()
export class BrandService {
  constructor(
    private readonly brandRepository: BrandRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async findAll(sellerId?: string) {
    this.logger.log('BrandService.findAll', { sellerId });
    
    // Return global brands + seller-specific brands
    return this.brandRepository.findAll(sellerId);
  }

  async findById(id: string): Promise<Brand> {
    const brand = await this.brandRepository.findById(id);
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return brand;
  }

  async findBySlug(slug: string): Promise<Brand> {
    const brand = await this.brandRepository.findBySlug(slug);
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return brand;
  }

  async create(createBrandDto: CreateBrandDto, createdBy: string): Promise<Brand> {
    this.logger.log('BrandService.create', { createBrandDto, createdBy });

    // Check if slug already exists
    const existingBrand = await this.brandRepository.findBySlug(createBrandDto.slug);
    if (existingBrand) {
      throw new ConflictException('Brand with this slug already exists');
    }

    // Validate category assignments
    await this.validateCategoryAssignments(createBrandDto.categoryIds);

    const brand = await this.brandRepository.create({
      ...createBrandDto,
      status: BrandStatus.ACTIVE,
      createdBy,
    });

    // Emit brand created event
    this.eventEmitter.emit('brand.created', {
      brandId: brand.id,
      brandName: brand.name,
      isGlobal: brand.isGlobal,
      sellerId: brand.sellerId,
      createdBy,
      timestamp: new Date(),
    });

    this.logger.log('Brand created successfully', { brandId: brand.id });
    return brand;
  }