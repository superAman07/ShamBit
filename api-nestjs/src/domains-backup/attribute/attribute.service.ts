import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { AttributeRepository } from './repositories/attribute.repository';
import { LoggerService } from '../../infrastructure/observability/logger.service';

import { Attribute } from './entities/attribute.entity';
import { AttributeStatus } from './enums/attribute-status.enum';
import { AttributeDataType } from './enums/attribute-data-type.enum';

import { CreateAttributeDto } from './dtos/create-attribute.dto';
import { UpdateAttributeDto } from './dtos/update-attribute.dto';

import {
  AttributeFilters,
  PaginationOptions,
  AttributeIncludeOptions,
  AttributeStatistics,
  AttributeUsageStats,
} from './interfaces/attribute-repository.interface';

@Injectable()
export class AttributeService {
  constructor(
    private readonly attributeRepository: AttributeRepository,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // BASIC CRUD OPERATIONS
  // ============================================================================

  async findAll(
    filters: AttributeFilters = {},
    pagination: PaginationOptions = {},
    includes: AttributeIncludeOptions = {}
  ) {
    this.logger.log('AttributeService.findAll', { filters, pagination });
    return this.attributeRepository.findAll(filters, pagination, includes);
  }

  async findById(id: string, includes: AttributeIncludeOptions = {}): Promise<Attribute> {
    const attribute = await this.attributeRepository.findById(id, includes);
    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }
    return attribute;
  }

  async findBySlug(slug: string, includes: AttributeIncludeOptions = {}): Promise<Attribute> {
    const attribute = await this.attributeRepository.findBySlug(slug, includes);
    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }
    return attribute;
  }

  async findByIds(ids: string[], includes: AttributeIncludeOptions = {}): Promise<Attribute[]> {
    return this.attributeRepository.findByIds(ids, includes);
  }

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================

  async create(createAttributeDto: CreateAttributeDto, createdBy: string): Promise<Attribute> {
    this.logger.log('AttributeService.create', { createAttributeDto, createdBy });

    // Generate slug if not provided
    const slug = createAttributeDto.slug || this.generateSlug(createAttributeDto.name);

    // Validate slug uniqueness
    const slugExists = !(await this.attributeRepository.validateSlug(slug));
    if (slugExists) {
      throw new ConflictException('Attribute with this slug already exists');
    }

    // Validate name uniqueness
    const nameExists = !(await this.attributeRepository.validateName(createAttributeDto.name));
    if (nameExists) {
      throw new ConflictException('Attribute with this name already exists');
    }

    // Separate options and localizations from the main data
    const { options, localizations, ...mainData } = createAttributeDto;

    const attributeData = {
      ...mainData,
      slug,
      createdBy,
      status: AttributeStatus.DRAFT,
    };

    const attribute = await this.attributeRepository.create(attributeData);

    this.logger.log('Attribute created successfully', { attributeId: attribute.id });
    return attribute;
  }

  // ============================================================================
  // UPDATE OPERATIONS
  // ============================================================================

  async update(id: string, updateAttributeDto: UpdateAttributeDto, updatedBy: string): Promise<Attribute> {
    this.logger.log('AttributeService.update', { id, updateAttributeDto, updatedBy });

    const existingAttribute = await this.findById(id);

    // Validate slug uniqueness if changed
    if (updateAttributeDto.slug && updateAttributeDto.slug !== existingAttribute.slug) {
      const slugExists = !(await this.attributeRepository.validateSlug(updateAttributeDto.slug, id));
      if (slugExists) {
        throw new ConflictException('Attribute with this slug already exists');
      }
    }

    // Validate name uniqueness if changed
    if (updateAttributeDto.name && updateAttributeDto.name !== existingAttribute.name) {
      const nameExists = !(await this.attributeRepository.validateName(updateAttributeDto.name, id));
      if (nameExists) {
        throw new ConflictException('Attribute with this name already exists');
      }
    }

    // Separate options and localizations from the main data
    const { options, localizations, ...mainData } = updateAttributeDto;

    const updatedAttribute = await this.attributeRepository.update(id, {
      ...mainData,
      updatedBy,
    });

    this.logger.log('Attribute updated successfully', { attributeId: id });
    return updatedAttribute;
  }

  // ============================================================================
  // STATUS OPERATIONS
  // ============================================================================

  async updateStatus(id: string, status: AttributeStatus, updatedBy: string): Promise<Attribute> {
    this.logger.log('AttributeService.updateStatus', { id, status, updatedBy });

    const existingAttribute = await this.findById(id);
    
    // Validate status transition
    this.validateStatusTransition(existingAttribute.status, status);

    const updatedAttribute = await this.attributeRepository.updateStatus(id, status, updatedBy);

    this.logger.log('Attribute status updated successfully', { attributeId: id, status });
    return updatedAttribute;
  }

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  async delete(id: string, deletedBy: string, reason?: string): Promise<void> {
    this.logger.log('AttributeService.delete', { id, deletedBy });

    const attribute = await this.findById(id);

    // Check if attribute is in use
    const usageStats = await this.attributeRepository.getUsageStats(id);
    if (usageStats.totalUsage > 0) {
      throw new BadRequestException('Cannot delete attribute that is currently in use');
    }

    await this.attributeRepository.softDelete(id, deletedBy, reason);

    this.logger.log('Attribute deleted successfully', { attributeId: id });
  }

  // ============================================================================
  // SEARCH OPERATIONS
  // ============================================================================

  async searchByName(query: string, filters: AttributeFilters = {}): Promise<Attribute[]> {
    return this.attributeRepository.searchByName(query, filters);
  }

  async findByGroup(groupName: string, filters: AttributeFilters = {}): Promise<Attribute[]> {
    return this.attributeRepository.findByGroup(groupName, filters);
  }

  async findByDataType(dataType: AttributeDataType, filters: AttributeFilters = {}): Promise<Attribute[]> {
    return this.attributeRepository.findByDataType(dataType, filters);
  }

  // ============================================================================
  // CATEGORY INTEGRATION
  // ============================================================================

  async findByCategoryId(categoryId: string, includeInherited: boolean = true): Promise<Attribute[]> {
    return this.attributeRepository.findByCategoryId(categoryId, includeInherited);
  }

  async findVariantAttributesForCategory(categoryId: string): Promise<Attribute[]> {
    return this.attributeRepository.findVariantAttributesForCategory(categoryId);
  }

  async findFilterableAttributesForCategory(categoryId: string): Promise<Attribute[]> {
    return this.attributeRepository.findFilterableAttributesForCategory(categoryId);
  }

  // ============================================================================
  // VALIDATION OPERATIONS
  // ============================================================================

  async validateAttributeValue(attributeId: string, value: any): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const attribute = await this.findById(attributeId);
    return attribute.validateValue(value);
  }

  // ============================================================================
  // STATISTICS OPERATIONS
  // ============================================================================

  async getStatistics(): Promise<AttributeStatistics> {
    return this.attributeRepository.getStatistics();
  }

  async getUsageStats(attributeId: string): Promise<AttributeUsageStats> {
    return this.attributeRepository.getUsageStats(attributeId);
  }

  async getPopularAttributes(limit: number = 10): Promise<Attribute[]> {
    return this.attributeRepository.getPopularAttributes(limit);
  }

  async getUnusedAttributes(olderThanDays: number = 90): Promise<Attribute[]> {
    return this.attributeRepository.getUnusedAttributes(olderThanDays);
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  async bulkUpdateStatus(ids: string[], status: AttributeStatus, updatedBy: string): Promise<Attribute[]> {
    this.logger.log('AttributeService.bulkUpdateStatus', { ids, status, updatedBy });

    // Validate all attributes exist
    const attributes = await this.findByIds(ids);
    if (attributes.length !== ids.length) {
      throw new BadRequestException('One or more attributes not found');
    }

    // Validate status transitions
    for (const attribute of attributes) {
      this.validateStatusTransition(attribute.status, status);
    }

    const updatedAttributes = await this.attributeRepository.bulkUpdateStatus(ids, status, updatedBy);

    this.logger.log('Bulk status update completed', { count: updatedAttributes.length });
    return updatedAttributes;
  }

  async bulkDelete(ids: string[], deletedBy: string, reason?: string): Promise<void> {
    this.logger.log('AttributeService.bulkDelete', { ids, deletedBy });

    // Validate all attributes exist and are not in use
    const attributes = await this.findByIds(ids);
    if (attributes.length !== ids.length) {
      throw new BadRequestException('One or more attributes not found');
    }

    // Check usage for all attributes
    for (const attribute of attributes) {
      const usageStats = await this.attributeRepository.getUsageStats(attribute.id);
      if (usageStats.totalUsage > 0) {
        throw new BadRequestException(`Cannot delete attribute '${attribute.name}' that is currently in use`);
      }
    }

    await this.attributeRepository.bulkDelete(ids, deletedBy, reason);

    this.logger.log('Bulk delete completed', { count: ids.length });
  }

  // ============================================================================
  // MAINTENANCE OPERATIONS
  // ============================================================================

  async refreshUsageStats(attributeId?: string): Promise<void> {
    await this.attributeRepository.refreshUsageStats(attributeId);
  }

  async cleanupDeletedAttributes(olderThanDays: number = 365): Promise<number> {
    const count = await this.attributeRepository.cleanupDeletedAttributes(olderThanDays);
    this.logger.log('Cleanup completed', { deletedCount: count });
    return count;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private validateStatusTransition(currentStatus: AttributeStatus, newStatus: AttributeStatus): void {
    const validTransitions: Record<AttributeStatus, AttributeStatus[]> = {
      [AttributeStatus.DRAFT]: [AttributeStatus.ACTIVE, AttributeStatus.ARCHIVED],
      [AttributeStatus.ACTIVE]: [AttributeStatus.DEPRECATED, AttributeStatus.ARCHIVED],
      [AttributeStatus.DEPRECATED]: [AttributeStatus.ACTIVE, AttributeStatus.ARCHIVED],
      [AttributeStatus.ARCHIVED]: [AttributeStatus.ACTIVE], // Can reactivate archived attributes
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }
}