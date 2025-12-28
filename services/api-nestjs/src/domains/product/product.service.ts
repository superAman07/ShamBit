import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ProductRepository } from './product.repository';
import { VariantService } from './variant.service';
import { LoggerService } from '../../infrastructure/observability/logger.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductApprovalDto,
  ProductStatus,
} from './dto/product.dto';
import { PaginationQuery, UserRole } from '../../common/types';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly variantService: VariantService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  async findAll(query: PaginationQuery, sellerId?: string) {
    this.logger.log('ProductService.findAll', { query, sellerId });
    return this.productRepository.findAll(query, sellerId);
  }

  async findById(id: string, sellerId?: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check seller access
    if (sellerId && product.sellerId !== sellerId) {
      throw new ForbiddenException('Access denied to this product');
    }

    return product;
  }

  async findBySlug(slug: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findBySlug(slug);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Only return active products for public access
    if (product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(
    createProductDto: CreateProductDto,
    sellerId: string,
  ): Promise<ProductResponseDto> {
    this.logger.log('ProductService.create', { createProductDto, sellerId });

    // Check if slug already exists
    const existingProduct = await this.productRepository.findBySlug(
      createProductDto.slug,
    );
    if (existingProduct) {
      throw new ConflictException('Product with this slug already exists');
    }

    // Validate category and brand exist
    await this.validateCategoryAndBrand(
      createProductDto.categoryId,
      createProductDto.brandId,
    );

    // Validate attribute values against category schema
    await this.validateAttributeValues(
      createProductDto.categoryId,
      createProductDto.attributeValues || {},
    );

    const product = await this.productRepository.create({
      ...createProductDto,
      sellerId,
      status: ProductStatus.DRAFT,
    });

    // Emit product created event
    this.eventEmitter.emit('product.created', {
      productId: product.id,
      sellerId,
      categoryId: product.categoryId,
      timestamp: new Date(),
    });

    this.logger.log('Product created successfully', { productId: product.id });
    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    sellerId: string,
    userRole?: UserRole,
  ): Promise<ProductResponseDto> {
    this.logger.log('ProductService.update', { id, updateProductDto, sellerId });

    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    // Check seller access (admins can update any product)
    if (userRole !== UserRole.ADMIN && existingProduct.sellerId !== sellerId) {
      throw new ForbiddenException('Access denied to this product');
    }

    // Validate status transitions
    if (updateProductDto.status) {
      this.validateStatusTransition(existingProduct.status, updateProductDto.status);
    }

    // Validate attribute values if provided
    if (updateProductDto.attributeValues) {
      await this.validateAttributeValues(
        existingProduct.categoryId,
        updateProductDto.attributeValues,
      );
    }

    const updatedProduct = await this.productRepository.update(id, updateProductDto);

    // Emit product updated event
    this.eventEmitter.emit('product.updated', {
      productId: id,
      sellerId: existingProduct.sellerId,
      changes: updateProductDto,
      timestamp: new Date(),
    });

    this.logger.log('Product updated successfully', { productId: id });
    return updatedProduct;
  }

  async submitForApproval(id: string, sellerId: string): Promise<ProductResponseDto> {
    this.logger.log('ProductService.submitForApproval', { id, sellerId });

    const product = await this.findById(id, sellerId);

    if (product.status !== ProductStatus.DRAFT) {
      throw new BadRequestException('Only draft products can be submitted for approval');
    }

    // Validate product has required data
    await this.validateProductForApproval(product);

    const updatedProduct = await this.productRepository.update(id, {
      status: ProductStatus.PENDING_APPROVAL,
    });

    // Emit product submitted event
    this.eventEmitter.emit('product.submitted_for_approval', {
      productId: id,
      sellerId,
      timestamp: new Date(),
    });

    this.logger.log('Product submitted for approval', { productId: id });
    return updatedProduct;
  }

  async approveProduct(
    id: string,
    approvalDto: ProductApprovalDto,
    adminId: string,
  ): Promise<ProductResponseDto> {
    this.logger.log('ProductService.approveProduct', { id, approvalDto, adminId });

    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== ProductStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Product is not pending approval');
    }

    const updatedProduct = await this.productRepository.update(id, {
      status: approvalDto.status,
      approvedAt: approvalDto.status === ProductStatus.APPROVED ? new Date() : null,
      approvedBy: approvalDto.status === ProductStatus.APPROVED ? adminId : null,
      rejectedAt: approvalDto.status === ProductStatus.REJECTED ? new Date() : null,
      rejectedBy: approvalDto.status === ProductStatus.REJECTED ? adminId : null,
      rejectionReason: approvalDto.reason,
    });

    // Emit approval event
    this.eventEmitter.emit('product.approval_status_changed', {
      productId: id,
      sellerId: product.sellerId,
      status: approvalDto.status,
      adminId,
      reason: approvalDto.reason,
      timestamp: new Date(),
    });

    this.logger.log('Product approval status changed', {
      productId: id,
      status: approvalDto.status,
    });

    return updatedProduct;
  }

  async delete(id: string, sellerId: string, userRole?: UserRole): Promise<void> {
    this.logger.log('ProductService.delete', { id, sellerId });

    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check seller access (admins can delete any product)
    if (userRole !== UserRole.ADMIN && product.sellerId !== sellerId) {
      throw new ForbiddenException('Access denied to this product');
    }

    // Check if product has active orders
    const hasActiveOrders = await this.productRepository.hasActiveOrders(id);
    if (hasActiveOrders) {
      throw new BadRequestException('Cannot delete product with active orders');
    }

    await this.productRepository.delete(id);

    // Emit product deleted event
    this.eventEmitter.emit('product.deleted', {
      productId: id,
      sellerId: product.sellerId,
      timestamp: new Date(),
    });

    this.logger.log('Product deleted successfully', { productId: id });
  }

  private async validateCategoryAndBrand(categoryId: string, brandId: string) {
    // This would validate against category and brand repositories
    // Implementation depends on your category/brand services
  }

  private async validateAttributeValues(
    categoryId: string,
    attributeValues: Record<string, any>,
  ) {
    // This would validate attribute values against category schema
    // Implementation depends on your attribute validation logic
  }

  private validateStatusTransition(currentStatus: ProductStatus, newStatus: ProductStatus) {
    const allowedTransitions: Record<ProductStatus, ProductStatus[]> = {
      [ProductStatus.DRAFT]: [ProductStatus.PENDING_APPROVAL, ProductStatus.INACTIVE],
      [ProductStatus.PENDING_APPROVAL]: [ProductStatus.APPROVED, ProductStatus.REJECTED],
      [ProductStatus.APPROVED]: [ProductStatus.ACTIVE, ProductStatus.INACTIVE],
      [ProductStatus.REJECTED]: [ProductStatus.DRAFT],
      [ProductStatus.ACTIVE]: [ProductStatus.INACTIVE, ProductStatus.ARCHIVED],
      [ProductStatus.INACTIVE]: [ProductStatus.ACTIVE, ProductStatus.ARCHIVED],
      [ProductStatus.ARCHIVED]: [],
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private async validateProductForApproval(product: ProductResponseDto) {
    // Validate product has all required fields
    if (!product.name || !product.description || !product.categoryId || !product.brandId) {
      throw new BadRequestException('Product missing required fields for approval');
    }

    // Validate product has at least one variant
    const variants = await this.variantService.findByProductId(product.id);
    if (!variants || variants.length === 0) {
      throw new BadRequestException('Product must have at least one variant for approval');
    }
  }
}