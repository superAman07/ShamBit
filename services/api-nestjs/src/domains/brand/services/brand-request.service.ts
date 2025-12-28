import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BrandRequestRepository, BrandRequestFilters, BrandRequestPaginationOptions } from '../repositories/brand-request.repository';
import { BrandRepository } from '../repositories/brand.repository';
import { BrandAuditService } from './brand-audit.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';
import { BrandRequest } from '../entities/brand-request.entity';
import { Brand } from '../entities/brand.entity';
import { BrandRequestStatus, BrandRequestType } from '../enums/request-status.enum';
import { BrandStatus } from '../enums/brand-status.enum';
import { CreateBrandRequestDto, HandleBrandRequestDto } from '../dtos/brand-request.dto';
import { CreateBrandDto } from '../dtos/create-brand.dto';

@Injectable()
export class BrandRequestService {
  constructor(
    private readonly brandRequestRepository: BrandRequestRepository,
    private readonly brandRepository: BrandRepository,
    private readonly brandAuditService: BrandAuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    filters: BrandRequestFilters = {},
    pagination: BrandRequestPaginationOptions = {}
  ) {
    this.logger.log('BrandRequestService.findAll', { filters, pagination });
    
    return this.brandRequestRepository.findAll(filters, pagination);
  }

  async findById(id: string): Promise<BrandRequest> {
    const request = await this.brandRequestRepository.findById(id);
    if (!request) {
      throw new NotFoundException('Brand request not found');
    }
    return request;
  }

  async createRequest(
    createRequestDto: CreateBrandRequestDto,
    requesterId: string
  ): Promise<BrandRequest> {
    this.logger.log('BrandRequestService.createRequest', { createRequestDto, requesterId });

    // Validate request based on type
    await this.validateBrandRequest(createRequestDto, requesterId);

    // Check for duplicate pending requests
    const duplicateRequests = await this.brandRequestRepository.findDuplicateRequests(
      createRequestDto.brandName,
      createRequestDto.brandSlug,
      requesterId
    );

    if (duplicateRequests.length > 0) {
      throw new ConflictException(
        'You already have a pending request for this brand name or slug'
      );
    }

    const request = await this.brandRequestRepository.create({
      ...createRequestDto,
      requesterId,
    });

    // Emit request created event
    this.eventEmitter.emit('brand.request.created', {
      requestId: request.id,
      requesterId,
      brandName: request.brandName,
      type: request.type,
      timestamp: new Date(),
    });

    this.logger.log('Brand request created successfully', { requestId: request.id });
    return request;
  }

  async handleRequest(
    id: string,
    handleDto: HandleBrandRequestDto,
    handledBy: string
  ): Promise<BrandRequest> {
    this.logger.log('BrandRequestService.handleRequest', { id, handleDto, handledBy });

    const request = await this.findById(id);

    if (!request.canBeHandled()) {
      throw new BadRequestException('Request cannot be handled in current status');
    }

    // Validate rejection reason if rejecting
    if (handleDto.status === BrandRequestStatus.REJECTED && !handleDto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting a request');
    }

    let createdBrand: Brand | null = null;

    // If approving, create or update the brand
    if (handleDto.status === BrandRequestStatus.APPROVED) {
      createdBrand = await this.processBrandApproval(request, handledBy);
    }

    // Update the request status
    const updatedRequest = await this.brandRequestRepository.handleRequest(
      id,
      handleDto.status,
      handledBy,
      handleDto.adminNotes,
      handleDto.rejectionReason
    );

    // Create audit log for the request handling
    await this.brandAuditService.logRequestAction(
      id,
      handleDto.status === BrandRequestStatus.APPROVED ? 'APPROVE' : 'REJECT',
      handledBy,
      request,
      updatedRequest,
      handleDto.adminNotes || handleDto.rejectionReason || 'Request handled'
    );

    // Emit request handled event
    this.eventEmitter.emit('brand.request.handled', {
      requestId: id,
      requesterId: request.requesterId,
      brandName: request.brandName,
      status: handleDto.status,
      handledBy,
      brandId: createdBrand?.id,
      timestamp: new Date(),
    });

    this.logger.log('Brand request handled successfully', { 
      requestId: id, 
      status: handleDto.status,
      brandId: createdBrand?.id 
    });

    return updatedRequest;
  }

  async cancelRequest(id: string, requesterId: string): Promise<BrandRequest> {
    this.logger.log('BrandRequestService.cancelRequest', { id, requesterId });

    const request = await this.findById(id);

    // Verify ownership
    if (request.requesterId !== requesterId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    if (!request.canBeHandled()) {
      throw new BadRequestException('Request cannot be cancelled in current status');
    }

    const updatedRequest = await this.brandRequestRepository.update(id, {
      status: BrandRequestStatus.CANCELLED,
    });

    // Emit request cancelled event
    this.eventEmitter.emit('brand.request.cancelled', {
      requestId: id,
      requesterId,
      brandName: request.brandName,
      timestamp: new Date(),
    });

    this.logger.log('Brand request cancelled successfully', { requestId: id });
    return updatedRequest;
  }

  async findByRequesterId(requesterId: string): Promise<BrandRequest[]> {
    return this.brandRequestRepository.findByRequesterId(requesterId);
  }

  async getPendingRequests(): Promise<BrandRequest[]> {
    return this.brandRequestRepository.findPendingRequests();
  }

  async getStatistics(requesterId?: string): Promise<Record<BrandRequestStatus, number>> {
    return this.brandRequestRepository.countByStatus(requesterId);
  }

  // Private helper methods
  private async validateBrandRequest(
    createRequestDto: CreateBrandRequestDto,
    requesterId: string
  ): Promise<void> {
    // Validate category assignments
    if (createRequestDto.categoryIds.length === 0) {
      throw new BadRequestException('At least one category must be assigned');
    }

    // Type-specific validations
    switch (createRequestDto.type) {
      case BrandRequestType.NEW_BRAND:
        await this.validateNewBrandRequest(createRequestDto);
        break;
      case BrandRequestType.BRAND_UPDATE:
        await this.validateBrandUpdateRequest(createRequestDto, requesterId);
        break;
      case BrandRequestType.BRAND_REACTIVATION:
        await this.validateBrandReactivationRequest(createRequestDto, requesterId);
        break;
    }
  }

  private async validateNewBrandRequest(createRequestDto: CreateBrandRequestDto): Promise<void> {
    // Check if brand with same slug already exists
    const existingBrand = await this.brandRepository.findBySlug(createRequestDto.brandSlug);
    if (existingBrand) {
      throw new ConflictException('A brand with this slug already exists');
    }
  }

  private async validateBrandUpdateRequest(
    createRequestDto: CreateBrandRequestDto,
    requesterId: string
  ): Promise<void> {
    if (!createRequestDto.brandId) {
      throw new BadRequestException('Brand ID is required for update requests');
    }

    const existingBrand = await this.brandRepository.findById(createRequestDto.brandId);
    if (!existingBrand) {
      throw new NotFoundException('Brand not found');
    }

    // Verify ownership for seller requests
    if (existingBrand.sellerId !== requesterId) {
      throw new ForbiddenException('You can only request updates for your own brands');
    }
  }

  private async validateBrandReactivationRequest(
    createRequestDto: CreateBrandRequestDto,
    requesterId: string
  ): Promise<void> {
    if (!createRequestDto.brandId) {
      throw new BadRequestException('Brand ID is required for reactivation requests');
    }

    const existingBrand = await this.brandRepository.findById(createRequestDto.brandId);
    if (!existingBrand) {
      throw new NotFoundException('Brand not found');
    }

    // Verify ownership for seller requests
    if (existingBrand.sellerId !== requesterId) {
      throw new ForbiddenException('You can only request reactivation for your own brands');
    }

    // Check if brand is actually inactive
    if (existingBrand.status === BrandStatus.ACTIVE) {
      throw new BadRequestException('Brand is already active');
    }
  }

  private async processBrandApproval(request: BrandRequest, approvedBy: string): Promise<Brand> {
    switch (request.type) {
      case BrandRequestType.NEW_BRAND:
        return this.createBrandFromRequest(request, approvedBy);
      case BrandRequestType.BRAND_UPDATE:
        return this.updateBrandFromRequest(request, approvedBy);
      case BrandRequestType.BRAND_REACTIVATION:
        return this.reactivateBrandFromRequest(request, approvedBy);
      default:
        throw new BadRequestException(`Unsupported request type: ${request.type}`);
    }
  }

  private async createBrandFromRequest(request: BrandRequest, createdBy: string): Promise<Brand> {
    const createBrandDto: CreateBrandDto = {
      name: request.brandName,
      slug: request.brandSlug,
      description: request.description,
      logoUrl: request.logoUrl,
      websiteUrl: request.websiteUrl,
      categoryIds: request.categoryIds,
      isGlobal: false, // Requested brands are seller-specific by default
      sellerId: request.requesterId,
    };

    return this.brandRepository.create({
      ...createBrandDto,
      status: BrandStatus.ACTIVE,
      createdBy,
    });
  }

  private async updateBrandFromRequest(request: BrandRequest, updatedBy: string): Promise<Brand> {
    if (!request.brandId) {
      throw new BadRequestException('Brand ID is required for update');
    }

    const updateData = {
      name: request.brandName,
      description: request.description,
      logoUrl: request.logoUrl,
      websiteUrl: request.websiteUrl,
      categoryIds: request.categoryIds,
      updatedBy,
    };

    return this.brandRepository.update(request.brandId, updateData);
  }

  private async reactivateBrandFromRequest(request: BrandRequest, updatedBy: string): Promise<Brand> {
    if (!request.brandId) {
      throw new BadRequestException('Brand ID is required for reactivation');
    }

    return this.brandRepository.updateStatus(request.brandId, BrandStatus.ACTIVE, updatedBy);
  }
}