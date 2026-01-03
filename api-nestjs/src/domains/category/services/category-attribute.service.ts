import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { CategoryAttributeRepository } from '../repositories/category-attribute.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CategoryAuditService } from './category-audit.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

import { CategoryAttribute } from '../entities/category-attribute.entity';
import { Category } from '../entities/category.entity';
import { AttributeType } from '../enums/attribute-type.enum';
import { CategoryPolicies } from '../category.policies';
import { CategoryValidators } from '../category.validators';

import {
  CreateCategoryAttributeDto,
  UpdateCategoryAttributeDto,
  InheritAttributeDto,
  OverrideAttributeDto,
} from '../dtos/category-attribute.dto';

import {
  CategoryAttributeCreatedEvent,
  CategoryAttributeUpdatedEvent,
  CategoryAttributeDeletedEvent,
  CategoryAttributeInheritedEvent,
  CategoryAttributeOverriddenEvent,
} from '../events/category.events';

import { UserRole } from '../../../common/types';

export interface AttributeInheritanceResult {
  inherited: CategoryAttribute[];
  skipped: string[];
  errors: string[];
}

@Injectable()
export class CategoryAttributeService {
  constructor(
    private readonly categoryAttributeRepository: CategoryAttributeRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly categoryAuditService: CategoryAuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  // Basic CRUD operations
  async findByCategoryId(
    categoryId: string,
    includeInherited: boolean = true,
  ): Promise<CategoryAttribute[]> {
    return this.categoryAttributeRepository.findByCategoryId(
      categoryId,
      includeInherited,
    );
  }

  async findById(id: string): Promise<CategoryAttribute> {
    const attribute = await this.categoryAttributeRepository.findById(id);
    if (!attribute) {
      throw new NotFoundException('Category attribute not found');
    }
    return attribute;
  }

  async findBySlug(
    categoryId: string,
    slug: string,
  ): Promise<CategoryAttribute> {
    const attribute = await this.categoryAttributeRepository.findBySlug(
      categoryId,
      slug,
    );
    if (!attribute) {
      throw new NotFoundException('Category attribute not found');
    }
    return attribute;
  }

  // Create operations
  async create(
    categoryId: string,
    createAttributeDto: CreateCategoryAttributeDto,
    createdBy: string,
    userRole: UserRole,
  ): Promise<CategoryAttribute> {
    this.logger.log('CategoryAttributeService.create', {
      categoryId,
      createAttributeDto,
      createdBy,
    });

    // Validate permissions
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (
      !CategoryPolicies.canAddAttributeToCategory(category, createdBy, userRole)
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to add attributes to this category',
      );
    }

    // Validate input data
    CategoryValidators.validateAttributeName(createAttributeDto.name);
    const normalizedSlug = CategoryValidators.validateAttributeSlug(
      createAttributeDto.slug,
    );

    if (
      createAttributeDto.allowedValues &&
      createAttributeDto.allowedValues.length > 0
    ) {
      CategoryValidators.validateAllowedValues(
        createAttributeDto.allowedValues,
        createAttributeDto.type,
      );
    }

    // Check slug uniqueness within category
    const existingAttribute = await this.categoryAttributeRepository.findBySlug(
      categoryId,
      normalizedSlug,
    );
    if (existingAttribute) {
      throw new ConflictException(
        'Attribute with this slug already exists in this category',
      );
    }

    // Validate type-specific requirements
    this.validateAttributeTypeRequirements(createAttributeDto);

    const attributeData = {
      ...createAttributeDto,
      categoryId,
      slug: normalizedSlug,
      createdBy,
    };

    const attribute =
      await this.categoryAttributeRepository.create(attributeData);

    // Create audit log
    await this.categoryAuditService.logAction(
      categoryId,
      'ATTRIBUTE_CREATE',
      createdBy,
      null,
      attribute,
      `Attribute ${attribute.name} created`,
    );

    // Emit event
    this.eventEmitter.emit(
      CategoryAttributeCreatedEvent.eventName,
      new CategoryAttributeCreatedEvent(
        categoryId,
        attribute.id,
        attribute.name,
        attribute.slug,
        attribute.type,
        createdBy,
      ),
    );

    // Auto-inherit to child categories if inheritable
    if (attribute.isInheritable) {
      await this.inheritToChildren(categoryId, attribute.id, createdBy);
    }

    this.logger.log('Category attribute created successfully', {
      attributeId: attribute.id,
    });
    return attribute;
  }

  // Update operations
  async update(
    id: string,
    updateAttributeDto: UpdateCategoryAttributeDto,
    updatedBy: string,
    userRole: UserRole,
  ): Promise<CategoryAttribute> {
    this.logger.log('CategoryAttributeService.update', {
      id,
      updateAttributeDto,
      updatedBy,
    });

    const existingAttribute = await this.findById(id);
    const category = await this.categoryRepository.findById(
      existingAttribute.categoryId,
    );

    // Check permissions
    if (
      !CategoryPolicies.canAddAttributeToCategory(
        category!,
        updatedBy,
        userRole,
      )
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to update this attribute',
      );
    }

    // Validate input data
    if (updateAttributeDto.name) {
      CategoryValidators.validateAttributeName(updateAttributeDto.name);
    }

    if (updateAttributeDto.allowedValues) {
      CategoryValidators.validateAllowedValues(
        updateAttributeDto.allowedValues,
        updateAttributeDto.type || existingAttribute.type,
      );
    }

    // Validate type-specific requirements if type is changing
    if (
      updateAttributeDto.type &&
      updateAttributeDto.type !== existingAttribute.type
    ) {
      this.validateAttributeTypeRequirements({
        ...existingAttribute,
        ...updateAttributeDto,
      } as CreateCategoryAttributeDto);
    }

    const updatedAttribute = await this.categoryAttributeRepository.update(id, {
      ...updateAttributeDto,
      updatedBy,
    });

    // Create audit log
    await this.categoryAuditService.logAction(
      existingAttribute.categoryId,
      'ATTRIBUTE_UPDATE',
      updatedBy,
      existingAttribute,
      updatedAttribute,
      `Attribute ${updatedAttribute.name} updated`,
    );

    // Emit event
    this.eventEmitter.emit(
      CategoryAttributeUpdatedEvent.eventName,
      new CategoryAttributeUpdatedEvent(
        existingAttribute.categoryId,
        id,
        updatedAttribute.name,
        this.calculateAttributeChanges(existingAttribute, updatedAttribute),
        updatedBy,
      ),
    );

    // Update inherited attributes if inheritance properties changed
    if (
      updateAttributeDto.isInheritable !== undefined ||
      updateAttributeDto.allowedValues !== undefined ||
      updateAttributeDto.defaultValue !== undefined
    ) {
      await this.updateInheritedAttributes(
        existingAttribute.categoryId,
        id,
        updatedBy,
      );
    }

    this.logger.log('Category attribute updated successfully', {
      attributeId: id,
    });
    return updatedAttribute;
  }

  // Delete operations
  async delete(
    id: string,
    deletedBy: string,
    userRole: UserRole,
  ): Promise<void> {
    this.logger.log('CategoryAttributeService.delete', { id, deletedBy });

    const attribute = await this.findById(id);
    const category = await this.categoryRepository.findById(
      attribute.categoryId,
    );

    // Check permissions
    if (
      !CategoryPolicies.canAddAttributeToCategory(
        category!,
        deletedBy,
        userRole,
      )
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to delete this attribute',
      );
    }

    // Check if attribute is being used in products
    const isUsedInProducts =
      await this.categoryAttributeRepository.isAttributeUsedInProducts(id);
    if (isUsedInProducts) {
      throw new BadRequestException(
        'Cannot delete attribute that is being used in products',
      );
    }

    await this.categoryAttributeRepository.delete(id);

    // Remove from inherited attributes
    await this.categoryAttributeRepository.removeInheritanceRules(id);

    // Create audit log
    await this.categoryAuditService.logAction(
      attribute.categoryId,
      'ATTRIBUTE_DELETE',
      deletedBy,
      attribute,
      null,
      `Attribute ${attribute.name} deleted`,
    );

    // Emit event
    this.eventEmitter.emit(
      CategoryAttributeDeletedEvent.eventName,
      new CategoryAttributeDeletedEvent(
        attribute.categoryId,
        id,
        attribute.name,
        deletedBy,
      ),
    );

    this.logger.log('Category attribute deleted successfully', {
      attributeId: id,
    });
  }

  // Inheritance operations
  async inheritAttributes(
    targetCategoryId: string,
    inheritDto: InheritAttributeDto,
    inheritedBy: string,
    userRole: UserRole,
  ): Promise<AttributeInheritanceResult> {
    this.logger.log('CategoryAttributeService.inheritAttributes', {
      targetCategoryId,
      inheritDto,
      inheritedBy,
    });

    const targetCategory =
      await this.categoryRepository.findById(targetCategoryId);
    const sourceCategory = await this.categoryRepository.findById(
      inheritDto.sourceCategoryId,
    );

    if (!targetCategory || !sourceCategory) {
      throw new NotFoundException('Category not found');
    }

    // Validate inheritance relationship
    if (
      !CategoryPolicies.canInheritAttribute(sourceCategory, targetCategory, '')
    ) {
      throw new BadRequestException(
        'Cannot inherit attributes from this category',
      );
    }

    // Check permissions
    if (
      !CategoryPolicies.canAddAttributeToCategory(
        targetCategory,
        inheritedBy,
        userRole,
      )
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to inherit attributes',
      );
    }

    const sourceAttributes =
      await this.categoryAttributeRepository.findByCategoryId(
        inheritDto.sourceCategoryId,
        false, // Don't include inherited attributes
      );

    const inherited: CategoryAttribute[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const sourceAttribute of sourceAttributes) {
      try {
        // Check if we should inherit this attribute
        if (
          inheritDto.attributeSlugs &&
          !inheritDto.attributeSlugs.includes(sourceAttribute.slug)
        ) {
          continue;
        }

        if (!sourceAttribute.isInheritable) {
          skipped.push(`${sourceAttribute.name}: not inheritable`);
          continue;
        }

        // Check if attribute already exists in target category
        const existingAttribute =
          await this.categoryAttributeRepository.findBySlug(
            targetCategoryId,
            sourceAttribute.slug,
          );

        if (existingAttribute && !inheritDto.overrideExisting) {
          skipped.push(`${sourceAttribute.name}: already exists`);
          continue;
        }

        // Create inherited attribute
        const inheritedAttribute = await this.createInheritedAttribute(
          targetCategoryId,
          sourceAttribute,
          inheritedBy,
        );

        inherited.push(inheritedAttribute);

        // Create inheritance rule
        await this.categoryAttributeRepository.createInheritanceRule({
          sourceAttributeId: sourceAttribute.id,
          targetCategoryId,
          isActive: true,
          isOverridden: false,
        });

        // Emit event
        this.eventEmitter.emit(
          CategoryAttributeInheritedEvent.eventName,
          new CategoryAttributeInheritedEvent(
            inheritDto.sourceCategoryId,
            targetCategoryId,
            inheritedAttribute.id,
            inheritedAttribute.name,
            inheritedBy,
          ),
        );
      } catch (error) {
        errors.push(`${sourceAttribute.name}: ${error.message}`);
      }
    }

    this.logger.log('Attribute inheritance completed', {
      inherited: inherited.length,
      skipped: skipped.length,
      errors: errors.length,
    });

    return { inherited, skipped, errors };
  }

  async overrideAttribute(
    categoryId: string,
    overrideDto: OverrideAttributeDto,
    overriddenBy: string,
    userRole: UserRole,
  ): Promise<CategoryAttribute> {
    this.logger.log('CategoryAttributeService.overrideAttribute', {
      categoryId,
      overrideDto,
      overriddenBy,
    });

    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check permissions
    if (
      !CategoryPolicies.canOverrideAttribute(
        category,
        overrideDto.attributeSlug,
        overriddenBy,
        userRole,
      )
    ) {
      throw new ForbiddenException(
        'Insufficient permissions to override this attribute',
      );
    }

    // Find the inherited attribute
    const inheritedAttribute =
      await this.categoryAttributeRepository.findBySlug(
        categoryId,
        overrideDto.attributeSlug,
      );

    if (!inheritedAttribute || !inheritedAttribute.inheritedFrom) {
      throw new BadRequestException(
        'Attribute is not inherited or does not exist',
      );
    }

    if (!inheritedAttribute.isOverridable) {
      throw new BadRequestException('This attribute cannot be overridden');
    }

    // Create override data
    const overrideData: Partial<CategoryAttribute> = {
      overriddenAt: categoryId,
      updatedBy: overriddenBy,
    };

    if (overrideDto.allowedValues) {
      overrideData.allowedValues = overrideDto.allowedValues;
    }

    if (overrideDto.defaultValue !== undefined) {
      overrideData.defaultValue = overrideDto.defaultValue;
    }

    if (overrideDto.validationRules) {
      overrideData.validationRules = overrideDto.validationRules;
    }

    const overriddenAttribute = await this.categoryAttributeRepository.update(
      inheritedAttribute.id,
      overrideData,
    );

    // Update inheritance rule
    await this.categoryAttributeRepository.updateInheritanceRule(
      inheritedAttribute.inheritedFrom,
      categoryId,
      {
        isOverridden: true,
        overriddenValues: {
          allowedValues: overrideDto.allowedValues,
          defaultValue: overrideDto.defaultValue,
          validationRules: overrideDto.validationRules,
        },
      },
    );

    // Create audit log
    await this.categoryAuditService.logAction(
      categoryId,
      'ATTRIBUTE_OVERRIDE',
      overriddenBy,
      inheritedAttribute,
      overriddenAttribute,
      overrideDto.reason || `Attribute ${overriddenAttribute.name} overridden`,
    );

    // Emit event
    this.eventEmitter.emit(
      CategoryAttributeOverriddenEvent.eventName,
      new CategoryAttributeOverriddenEvent(
        categoryId,
        overriddenAttribute.id,
        overriddenAttribute.name,
        {
          allowedValues: overrideDto.allowedValues,
          defaultValue: overrideDto.defaultValue,
          validationRules: overrideDto.validationRules,
        },
        overriddenBy,
        overrideDto.reason,
      ),
    );

    this.logger.log('Attribute overridden successfully', {
      attributeId: overriddenAttribute.id,
    });
    return overriddenAttribute;
  }

  // Query operations
  async getEffectiveAttributes(
    categoryId: string,
  ): Promise<CategoryAttribute[]> {
    return this.categoryAttributeRepository.getEffectiveAttributes(categoryId);
  }

  async getVariantAttributes(categoryId: string): Promise<CategoryAttribute[]> {
    const attributes = await this.getEffectiveAttributes(categoryId);
    return attributes.filter((attr) => attr.isVariant);
  }

  async getFilterableAttributes(
    categoryId: string,
  ): Promise<CategoryAttribute[]> {
    const attributes = await this.getEffectiveAttributes(categoryId);
    return attributes.filter((attr) => attr.isFilterable);
  }

  async getRequiredAttributes(
    categoryId: string,
  ): Promise<CategoryAttribute[]> {
    const attributes = await this.getEffectiveAttributes(categoryId);
    return attributes.filter((attr) => attr.isRequired);
  }

  // Validation operations
  async validateAttributeValue(
    attributeId: string,
    value: any,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const attribute = await this.findById(attributeId);
    return attribute.validateValue(value);
  }

  async validateProductAttributes(
    categoryId: string,
    attributeValues: Record<string, any>,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const attributes = await this.getEffectiveAttributes(categoryId);
    const errors: string[] = [];

    for (const attribute of attributes) {
      const value = attributeValues[attribute.slug];
      const validation = attribute.validateValue(value);

      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Private helper methods
  private validateAttributeTypeRequirements(
    attributeDto: CreateCategoryAttributeDto,
  ): void {
    switch (attributeDto.type) {
      case AttributeType.SELECT:
      case AttributeType.MULTI_SELECT:
        if (
          !attributeDto.allowedValues ||
          attributeDto.allowedValues.length === 0
        ) {
          throw new BadRequestException(
            'Select attributes must have allowed values',
          );
        }
        break;

      case AttributeType.DIMENSION:
      case AttributeType.WEIGHT:
      case AttributeType.CURRENCY:
        if (!attributeDto.validationRules) {
          throw new BadRequestException(
            `${attributeDto.type} attributes must have validation rules`,
          );
        }
        break;
    }
  }

  private async createInheritedAttribute(
    targetCategoryId: string,
    sourceAttribute: CategoryAttribute,
    inheritedBy: string,
  ): Promise<CategoryAttribute> {
    const inheritedData = {
      categoryId: targetCategoryId,
      name: sourceAttribute.name,
      slug: sourceAttribute.slug,
      type: sourceAttribute.type,
      description: sourceAttribute.description,
      isRequired: sourceAttribute.isRequired,
      isInheritable: sourceAttribute.isInheritable,
      isOverridable: sourceAttribute.isOverridable,
      isVariant: sourceAttribute.isVariant,
      isFilterable: sourceAttribute.isFilterable,
      isSearchable: sourceAttribute.isSearchable,
      defaultValue: sourceAttribute.defaultValue,
      allowedValues: sourceAttribute.allowedValues,
      validationRules: sourceAttribute.validationRules,
      displayOrder: sourceAttribute.displayOrder,
      displayName: sourceAttribute.displayName,
      helpText: sourceAttribute.helpText,
      placeholder: sourceAttribute.placeholder,
      inheritedFrom: sourceAttribute.id,
      createdBy: inheritedBy,
    };

    return this.categoryAttributeRepository.create(inheritedData);
  }

  private async inheritToChildren(
    categoryId: string,
    attributeId: string,
    inheritedBy: string,
  ): Promise<void> {
    const children = await this.categoryRepository.findChildren(
      categoryId,
      {},
      { limit: 1000 },
    );

    for (const child of children.data) {
      try {
        const sourceAttribute = await this.findById(attributeId);
        await this.createInheritedAttribute(
          child.id,
          sourceAttribute,
          inheritedBy,
        );

        // Recursively inherit to grandchildren
        await this.inheritToChildren(child.id, attributeId, inheritedBy);
      } catch (error) {
        this.logger.warn('Failed to inherit attribute to child category', {
          categoryId: child.id,
          attributeId,
          error: error.message,
        });
      }
    }
  }

  private async updateInheritedAttributes(
    categoryId: string,
    attributeId: string,
    updatedBy: string,
  ): Promise<void> {
    // Update all inherited instances of this attribute
    await this.categoryAttributeRepository.updateInheritedAttributes(
      attributeId,
      updatedBy,
    );
  }

  private calculateAttributeChanges(
    oldAttribute: CategoryAttribute,
    newAttribute: CategoryAttribute,
  ): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};

    const fields = [
      'name',
      'description',
      'type',
      'isRequired',
      'isVariant',
      'isFilterable',
      'defaultValue',
      'allowedValues',
      'displayOrder',
    ];

    for (const field of fields) {
      const oldValue = (oldAttribute as any)[field];
      const newValue = (newAttribute as any)[field];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[field] = { from: oldValue, to: newValue };
      }
    }

    return changes;
  }
}
