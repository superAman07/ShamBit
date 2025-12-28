import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { VariantRepository } from './repositories/variant.repository';
import { VariantAuditService } from './services/variant-audit.service.js';
import { SkuGeneratorService } from './services/sku-generator.service.js';
import { VariantCombinatorService } from './services/variant-combinator.service.js';
import { LoggerService } from '../../infrastructure/observability/logger.service';

import { ProductVariant } from './entities/variant.entity';
import { VariantStatus } from './enums/variant-status.enum';
import { VariantPolicies } from './variant.policies.js';
import { VariantValidators } from './variant.validators';

import { CreateVariantDto } from './dtos/create-variant.dto';
import { UpdateVariantDto, VariantStatusUpdateDto } from './dtos/update-variant.dto.js';
import { GenerateVariantsDto } from './dtos/generate-variants.dto.js';

import {
  VariantFilters,
  PaginationOptions,
  VariantIncludeOptions,
  BulkVariantOperation,
} from './interfaces/variant-repository.interface';

import {
  VariantCreatedEvent,
  VariantUpdatedEvent,
  VariantDeletedEvent,
  VariantStatusChangedEvent,
  VariantActivatedEvent,
  VariantDisabledEvent,
  VariantArchivedEvent,
  VariantBulkGeneratedEvent,
} from './events/variant.events';

import { UserRole } from '../../common/types';

@Injectable()
export class VariantService {
  constructor(
    private readonly variantRepository: VariantRepository,
    private readonly variantAuditService: VariantAuditService,
    private readonly skuGeneratorService: SkuGeneratorService,
    private readonly variantCombinatorService: VariantCombinatorService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // BASIC CRUD OPERATIONS
  // ============================================================================

  async findAll(
    filters: VariantFilters = {},
    pagination: PaginationOptions = {},
    includes: VariantIncludeOptions = {},
    userId?: string,
    userRole?: UserRole
  ) {
    this.logger.log('VariantService.findAll', { filters, pagination, userId });

    // Apply access control filters
    const enhancedFilters = await this.applyAccessFilters(filters, userId, userRole);

    return this.variantRepository.findAll(enhancedFilters, pagination, includes);
  }

  async findById(
    id: string,
    includes: VariantIncludeOptions = {},
    userId?: string,
    userRole?: UserRole
  ): Promise<ProductVariant> {
    const variant = await this.variantRepository.findById(id, includes);
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    // Check access permissions
    await this.checkVariantAccess(variant, userId, userRole);

    return variant;
  }

  async findBySku(sku: string, includes: VariantIncludeOptions = {}): Promise<ProductVariant> {
    const variant = await this.variantRepository.findBySku(sku, includes);
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }
    return variant;
  }

  async findByProduct(
    productId: string,
    filters: VariantFilters = {},
    pagination: PaginationOptions = {},
    includes: VariantIncludeOptions = {}
  ) {
    return this.variantRepository.findByProduct(productId, filters, pagination, includes);
  }

  // ============================================================================
  // VARIANT CREATION
  // ============================================================================

  async create(createVariantDto: CreateVariantDto, createdBy: string): Promise<ProductVariant> {
    this.logger.log('VariantService.create', { createVariantDto, createdBy });

    // Validate product exists and user has access
    await this.validateProductAccess(createVariantDto.productId, createdBy);

    // Validate attribute combination
    await this.validateAttributeCombination(
      createVariantDto.productId,
      createVariantDto.attributeValues
    );

    // Generate SKU if not provided
    const sku = createVariantDto.sku || await this.skuGeneratorService.generateSku({
      sellerId: createdBy, // Assuming createdBy is sellerId
      productId: createVariantDto.productId,
      attributeValues: createVariantDto.attributeValues,
    });

    // Create variant
    const variant = await this.variantRepository.create({
      ...createVariantDto,
      sku,
      status: VariantStatus.DRAFT,
      createdBy,
    });

    // Create audit log
    await this.variantAuditService.logAction(
      variant.id,
      'CREATE',
      createdBy,
      null,
      variant,
      'Variant created'
    );

    // Emit event
    this.eventEmitter.emit('variant.created', new VariantCreatedEvent(
      variant.id,
      variant.sku,
      variant.productId,
      createdBy
    ));

    this.logger.log('Variant created successfully', { variantId: variant.id, sku: variant.sku });
    return variant;
  }

  // ============================================================================
  // BULK VARIANT GENERATION
  // ============================================================================

  async generateVariants(
    generateVariantsDto: GenerateVariantsDto,
    createdBy: string
  ): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
    this.logger.log('VariantService.generateVariants', { generateVariantsDto, createdBy });

    const { productId, attributeOptions, options = {} } = generateVariantsDto;

    // Validate product access
    await this.validateProductAccess(productId, createdBy);

    // Ensure attributeOptions include `attributeName` required by the combinator
    const combinatorAttributeOptions = attributeOptions.map(a => ({
      attributeId: a.attributeId,
      attributeName: (a as any).attributeName || a.attributeId,
      values: a.values,
    }));

    // Generate combinations
    const combinations = this.variantCombinatorService.generateCombinations(
      combinatorAttributeOptions,
      options
    );

    if (combinations.length === 0) {
      throw new BadRequestException('No valid combinations found');
    }

    // Check combination limit
    const maxVariants = options.maxCombinations || 1000;
    if (combinations.length > maxVariants) {
      throw new BadRequestException(
        `Too many combinations (${combinations.length}). Maximum allowed: ${maxVariants}`
      );
    }

    // Get existing variants for this product
    const existingVariants = await this.variantRepository.findByProduct(productId);
    const existingCombinations = new Set(
      existingVariants.data.map(v => 
        this.variantCombinatorService.generateCombinationHash(
          v.getAttributeValuesByType(attributeOptions.map(a => a.attributeId))
        )
      )
    );

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process combinations
    for (const combination of combinations) {
      try {
        if (existingCombinations.has(combination.hash)) {
          results.skipped++;
          continue;
        }

        // Generate SKU
        const sku = await this.skuGeneratorService.generateSku({
          sellerId: createdBy,
          productId,
          attributeValues: combination.attributeValues,
        });

        // Create variant
        await this.variantRepository.create({
          productId,
          sku,
          attributeValues: combination.attributeValues,
          status: VariantStatus.DRAFT,
          createdBy,
        });

        results.created++;
      } catch (error) {
        results.errors.push(`Combination ${combination.hash}: ${error.message}`);
      }
    }

    // Create audit log
    await this.variantAuditService.logAction(
      productId,
      'BULK_GENERATE',
      createdBy,
      null,
      results,
      `Generated ${results.created} variants`
    );

    // Emit event
    this.eventEmitter.emit('variant.bulk.generated', new VariantBulkGeneratedEvent(
      productId,
      results.created,
      results.updated,
      results.skipped,
      createdBy
    ));

    this.logger.log('Variant generation completed', { productId, results });
    return results;
  }

  // ============================================================================
  // VARIANT UPDATES
  // ============================================================================

  async update(
    id: string,
    updateVariantDto: UpdateVariantDto,
    updatedBy: string
  ): Promise<ProductVariant> {
    this.logger.log('VariantService.update', { id, updateVariantDto, updatedBy });

    const existingVariant = await this.findById(id);

    // Check permissions
    await this.checkVariantAccess(existingVariant, updatedBy);

    // Validate business rules
    await this.validateVariantUpdate(existingVariant, updateVariantDto);

    // Handle SKU changes
    if (updateVariantDto.sku && updateVariantDto.sku !== existingVariant.sku) {
      await this.skuGeneratorService.validateSkuUniqueness(updateVariantDto.sku);
    }

    // Update variant
    const updatedVariant = await this.variantRepository.update(id, {
      ...updateVariantDto,
      updatedBy,
    });

    // Create audit log
    await this.variantAuditService.logAction(
      id,
      'UPDATE',
      updatedBy,
      existingVariant,
      updatedVariant,
      'Variant updated'
    );

    // Emit event
    this.eventEmitter.emit('variant.updated', new VariantUpdatedEvent(
      id,
      updatedVariant.sku,
      updatedVariant.productId,
      this.calculateChanges(existingVariant, updatedVariant),
      updatedBy
    ));

    this.logger.log('Variant updated successfully', { variantId: id });
    return updatedVariant;
  }

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================

  async updateStatus(
    id: string,
    statusUpdate: VariantStatusUpdateDto,
    updatedBy: string
  ): Promise<ProductVariant> {
    this.logger.log('VariantService.updateStatus', { id, statusUpdate, updatedBy });

    const variant = await this.findById(id);

    // Check permissions
    await this.checkVariantAccess(variant, updatedBy);

    // Validate status transition
    VariantValidators.validateStatusTransition(variant.status, statusUpdate.status);

    // Apply business rules for status changes
    await this.validateStatusChange(variant, statusUpdate.status);

    // Update status
    const updatedVariant = await this.variantRepository.updateStatus(
      id,
      statusUpdate.status,
      updatedBy
    );

    // Create audit log
    await this.variantAuditService.logAction(
      id,
      'STATUS_CHANGE',
      updatedBy,
      { status: variant.status },
      { status: statusUpdate.status },
      statusUpdate.reason || 'Status changed'
    );

    // Emit status-specific events
    this.emitStatusChangeEvent(updatedVariant, variant.status, updatedBy);

    this.logger.log('Variant status updated successfully', {
      variantId: id,
      from: variant.status,
      to: statusUpdate.status,
    });

    return updatedVariant;
  }

  async activate(id: string, activatedBy: string): Promise<ProductVariant> {
    return this.updateStatus(id, { status: VariantStatus.ACTIVE }, activatedBy);
  }

  async disable(id: string, disabledBy: string, reason?: string): Promise<ProductVariant> {
    return this.updateStatus(id, { status: VariantStatus.DISABLED, reason }, disabledBy);
  }

  async archive(id: string, archivedBy: string, reason?: string): Promise<ProductVariant> {
    return this.updateStatus(id, { status: VariantStatus.ARCHIVED, reason }, archivedBy);
  }

  // ============================================================================
  // VARIANT DELETION
  // ============================================================================

  async delete(id: string, deletedBy: string, reason?: string): Promise<void> {
    this.logger.log('VariantService.delete', { id, deletedBy, reason });

    const variant = await this.findById(id);

    // Check permissions
    await this.checkVariantAccess(variant, deletedBy);

    // Validate deletion rules
    await this.validateVariantDeletion(variant);

    // Soft delete
    await this.variantRepository.softDelete(id, deletedBy);

    // Create audit log
    await this.variantAuditService.logAction(
      id,
      'DELETE',
      deletedBy,
      variant,
      null,
      reason || 'Variant deleted'
    );

    // Emit event
    this.eventEmitter.emit('variant.deleted', new VariantDeletedEvent(
      id,
      variant.sku,
      variant.productId,
      deletedBy,
      reason
    ));

    this.logger.log('Variant deleted successfully', { variantId: id });
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  async bulkUpdate(
    operation: BulkVariantOperation,
    updatedBy: string
  ): Promise<{ updated: number; errors: string[] }> {
    this.logger.log('VariantService.bulkUpdate', { operation, updatedBy });

    const results = { updated: 0, errors: [] as string[] };

    for (const variantId of operation.variantIds) {
      try {
        await this.update(variantId, operation.updates, updatedBy);
        results.updated++;
      } catch (error) {
        results.errors.push(`Variant ${variantId}: ${error.message}`);
      }
    }

    this.logger.log('Bulk update completed', { results });
    return results;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async applyAccessFilters(
    filters: VariantFilters,
    userId?: string,
    userRole?: UserRole
  ): Promise<VariantFilters> {
    // Apply role-based filtering
    if (userRole === UserRole.SELLER) {
      // Sellers can only see their own variants
      return { ...filters, sellerId: userId };
    }

    return filters;
  }

  private async checkVariantAccess(
    variant: ProductVariant,
    userId?: string,
    userRole?: UserRole
  ): Promise<void> {
    if (!VariantPolicies.canAccess(variant, userId, userRole)) {
      throw new ForbiddenException('Access denied to this variant');
    }
  }

  private async validateProductAccess(productId: string, userId: string): Promise<void> {
    // This would typically check if the user owns the product or has permission
    // Implementation depends on your product access control logic
  }

  private async validateAttributeCombination(
    productId: string,
    attributeValues: Record<string, string>
  ): Promise<void> {
    // Check if combination already exists
    const existingVariant = await this.variantRepository.findByAttributeCombination(
      productId,
      attributeValues
    );

    if (existingVariant) {
      throw new ConflictException('Variant with this attribute combination already exists');
    }
  }

  private async validateVariantUpdate(
    existingVariant: ProductVariant,
    updateDto: UpdateVariantDto
  ): Promise<void> {
    // Validate business rules for updates
    if (existingVariant.status === VariantStatus.ARCHIVED) {
      throw new BadRequestException('Cannot update archived variant');
    }
  }

  private async validateStatusChange(
    variant: ProductVariant,
    newStatus: VariantStatus
  ): Promise<void> {
    // Additional business rule validations for status changes
    if (newStatus === VariantStatus.ACTIVE) {
      // Check if product is approved
      // Check if all required fields are present
    }
  }

  private async validateVariantDeletion(variant: ProductVariant): Promise<void> {
    // Check if variant has inventory
    // Check if variant has pending orders
    // Check if variant can be deleted based on business rules
  }

  private calculateChanges(
    oldVariant: ProductVariant,
    newVariant: ProductVariant
  ): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};

    // Compare relevant fields
    const fieldsToCompare = ['sku', 'status', 'priceOverride', 'images', 'metadata'];

    for (const field of fieldsToCompare) {
      const oldValue = (oldVariant as any)[field];
      const newValue = (newVariant as any)[field];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[field] = { from: oldValue, to: newValue };
      }
    }

    return changes;
  }

  private emitStatusChangeEvent(
    variant: ProductVariant,
    oldStatus: VariantStatus,
    updatedBy: string
  ): void {
    // Emit generic status change event
    this.eventEmitter.emit('variant.status.changed', new VariantStatusChangedEvent(
      variant.id,
      variant.sku,
      variant.productId,
      oldStatus,
      variant.status,
      updatedBy
    ));

    // Emit specific status events
    switch (variant.status) {
      case VariantStatus.ACTIVE:
        this.eventEmitter.emit('variant.activated', new VariantActivatedEvent(
          variant.id,
          variant.sku,
          variant.productId,
          updatedBy
        ));
        break;

      case VariantStatus.DISABLED:
        this.eventEmitter.emit('variant.disabled', new VariantDisabledEvent(
          variant.id,
          variant.sku,
          variant.productId,
          updatedBy
        ));
        break;

      case VariantStatus.ARCHIVED:
        this.eventEmitter.emit('variant.archived', new VariantArchivedEvent(
          variant.id,
          variant.sku,
          variant.productId,
          updatedBy
        ));
        break;
    }
  }
}