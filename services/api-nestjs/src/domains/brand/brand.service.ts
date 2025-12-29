import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BrandRepository, BrandFilters, PaginationOptions } from './repositories/brand.repository';
import { BrandAuditService } from './services/brand-audit.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';
import { Brand } from './entities/brand.entity';
import { BrandStatus } from './enums/brand-status.enum';
import { CreateBrandDto } from './dtos/create-brand.dto';
import { UpdateBrandDto, BrandStatusUpdateDto } from './dtos/update-brand.dto';

@Injectable()
export class BrandService {
  constructor(
    private readonly brandRepository: BrandRepository,
    private readonly brandAuditService: BrandAuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    filters: BrandFilters = {},
    pagination: PaginationOptions = {}
  ) {
    this.logger.log('BrandService.findAll', { filters, pagination });
    
    return this.brandRepository.findAll(filters, pagination);
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

    // Validate seller ownership if not global
    if (!createBrandDto.isGlobal && createBrandDto.sellerId) {
      await this.validateSellerExists(createBrandDto.sellerId);
    }

    const brand = await this.brandRepository.create({
      ...createBrandDto,
      status: BrandStatus.ACTIVE,
      createdBy,
    });

    // Create audit log
    await this.brandAuditService.logAction(
      brand.id,
      'CREATE',
      createdBy,
      null,
      brand,
      'Brand created'
    );

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

  async update(
    id: string,
    updateBrandDto: UpdateBrandDto,
    updatedBy: string,
    userRole?: string
  ): Promise<Brand> {
    this.logger.log('BrandService.update', { id, updateBrandDto, updatedBy });

    const existingBrand = await this.findById(id);

    // Check permissions
    await this.validateUpdatePermissions(existingBrand, updatedBy, userRole);

    // Validate category assignments if provided
    if (updateBrandDto.categoryIds) {
      await this.validateCategoryAssignments(updateBrandDto.categoryIds);
    }

    // Validate status change if provided
    if (updateBrandDto.status) {
      this.validateStatusTransition(existingBrand.status, updateBrandDto.status);
    }

    const updatedBrand = await this.brandRepository.update(id, {
      ...updateBrandDto,
      updatedBy,
    });

    // Create audit log
    await this.brandAuditService.logAction(
      id,
      'UPDATE',
      updatedBy,
      existingBrand,
      updatedBrand,
      'Brand updated'
    );

    // Emit brand updated event
    this.eventEmitter.emit('brand.updated', {
      brandId: id,
      brandName: updatedBrand.name,
      changes: updateBrandDto,
      updatedBy,
      timestamp: new Date(),
    });

    this.logger.log('Brand updated successfully', { brandId: id });
    return updatedBrand;
  }

  async updateStatus(
    id: string,
    statusUpdate: BrandStatusUpdateDto,
    updatedBy: string,
    userRole?: string
  ): Promise<Brand> {
    this.logger.log('BrandService.updateStatus', { id, statusUpdate, updatedBy });

    const existingBrand = await this.findById(id);

    // Check permissions
    await this.validateUpdatePermissions(existingBrand, updatedBy, userRole);

    // Validate status transition
    this.validateStatusTransition(existingBrand.status, statusUpdate.status);

    const updatedBrand = await this.brandRepository.updateStatus(
      id,
      statusUpdate.status,
      updatedBy
    );

    // Create audit log
    await this.brandAuditService.logAction(
      id,
      `STATUS_CHANGE_${statusUpdate.status}`,
      updatedBy,
      { status: existingBrand.status },
      { status: statusUpdate.status },
      statusUpdate.reason || 'Status changed'
    );

    // Emit status change event
    this.eventEmitter.emit('brand.status.changed', {
      brandId: id,
      brandName: updatedBrand.name,
      oldStatus: existingBrand.status,
      newStatus: statusUpdate.status,
      reason: statusUpdate.reason,
      updatedBy,
      timestamp: new Date(),
    });

    this.logger.log('Brand status updated successfully', { brandId: id, status: statusUpdate.status });
    return updatedBrand;
  }

  async delete(id: string, deletedBy: string, userRole?: string): Promise<void> {
    this.logger.log('BrandService.delete', { id, deletedBy });

    const existingBrand = await this.findById(id);

    // Check permissions
    await this.validateDeletePermissions(existingBrand, deletedBy, userRole);

    // Check if brand is in use
    await this.validateBrandNotInUse(id);

    await this.brandRepository.softDelete(id, deletedBy);

    // Create audit log
    await this.brandAuditService.logAction(
      id,
      'DELETE',
      deletedBy,
      existingBrand,
      null,
      'Brand deleted'
    );

    // Emit brand deleted event
    this.eventEmitter.emit('brand.deleted', {
      brandId: id,
      brandName: existingBrand.name,
      deletedBy,
      timestamp: new Date(),
    });

    this.logger.log('Brand deleted successfully', { brandId: id });
  }

  async findBySellerId(sellerId: string): Promise<Brand[]> {
    return this.brandRepository.findBySellerId(sellerId);
  }

  async getStatistics(sellerId?: string): Promise<Record<BrandStatus, number>> {
    return this.brandRepository.countByStatus(sellerId);
  }

  // Validation methods
  private async validateCategoryAssignments(categoryIds: string[]): Promise<void> {
    // TODO: Implement category validation
    // This would check if all category IDs exist and are active
    if (categoryIds.length === 0) {
      throw new BadRequestException('At least one category must be assigned');
    }
  }

  private async validateSellerExists(sellerId: string): Promise<void> {
    // TODO: Implement seller validation
    // This would check if the seller exists and is active
  }

  private async validateUpdatePermissions(
    brand: Brand,
    userId: string,
    userRole?: string
  ): Promise<void> {
    // Admins can update any brand
    if (userRole === 'ADMIN') {
      return;
    }

    // Sellers can only update their own brands
    if (userRole === 'SELLER' && brand.sellerId === userId) {
      return;
    }

    throw new ForbiddenException('Insufficient permissions to update this brand');
  }

  private async validateDeletePermissions(
    brand: Brand,
    userId: string,
    userRole?: string
  ): Promise<void> {
    // Only admins can delete brands
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can delete brands');
    }
  }

  private validateStatusTransition(
    currentStatus: BrandStatus,
    newStatus: BrandStatus
  ): void {
    const validTransitions: Record<BrandStatus, BrandStatus[]> = {
      [BrandStatus.ACTIVE]: [BrandStatus.INACTIVE, BrandStatus.SUSPENDED],
      [BrandStatus.INACTIVE]: [BrandStatus.ACTIVE],
      [BrandStatus.SUSPENDED]: [BrandStatus.ACTIVE, BrandStatus.INACTIVE],
      [BrandStatus.PENDING_APPROVAL]: [BrandStatus.ACTIVE, BrandStatus.REJECTED],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  private async validateBrandNotInUse(brandId: string): Promise<void> {
    // TODO: Check if brand is used in any products
    // This would prevent deletion of brands that are actively used
  }
}