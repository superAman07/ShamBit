import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CategoryAttribute } from '../entities/category-attribute.entity';
import { AttributeType } from '../enums/attribute-type.enum';

export interface CreateCategoryAttributeData {
  categoryId: string;
  name: string;
  slug: string;
  type: AttributeType;
  description?: string;
  isRequired?: boolean;
  isInheritable?: boolean;
  isOverridable?: boolean;
  isVariant?: boolean;
  isFilterable?: boolean;
  isSearchable?: boolean;
  defaultValue?: string;
  allowedValues?: string[];
  validationRules?: any;
  displayOrder?: number;
  displayName?: string;
  helpText?: string;
  placeholder?: string;
  inheritedFrom?: string;
  createdBy: string;
}

export interface InheritanceRuleData {
  sourceAttributeId: string;
  targetCategoryId: string;
  isActive: boolean;
  isOverridden: boolean;
  overriddenValues?: any;
}

@Injectable()
export class CategoryAttributeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CategoryAttribute | null> {
    const attribute = await this.prisma.categoryAttribute.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    } as unknown as Prisma.CategoryAttributeFindUniqueArgs);

    return attribute ? this.mapToDomain(attribute) : null;
  }

  async findBySlug(
    categoryId: string,
    slug: string,
  ): Promise<CategoryAttribute | null> {
    const attribute = await this.prisma.categoryAttribute.findUnique({
      where: {
        categoryId_slug: {
          categoryId,
          slug,
        },
      },
    } as unknown as Prisma.CategoryAttributeFindUniqueArgs);

    return attribute ? this.mapToDomain(attribute) : null;
  }

  async findByCategoryId(
    categoryId: string,
    includeInherited: boolean = true,
  ): Promise<CategoryAttribute[]> {
    const where: any = { categoryId };

    const attributes = await this.prisma.categoryAttribute.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    } as unknown as Prisma.CategoryAttributeFindManyArgs);

    let result = attributes.map(this.mapToDomain);

    if (includeInherited) {
      // Get inherited attributes from parent categories
      const inheritedAttributes = await this.getInheritedAttributes(categoryId);
      result = [...result, ...inheritedAttributes];

      // Sort by display order
      result.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    return result;
  }

  async create(data: CreateCategoryAttributeData): Promise<CategoryAttribute> {
    const attribute = await this.prisma.categoryAttribute.create({
      data: {
        ...data,
        version: 1,
      },
    } as unknown as Prisma.CategoryAttributeCreateArgs);

    return this.mapToDomain(attribute);
  }

  async update(
    id: string,
    data: Partial<CategoryAttribute>,
  ): Promise<CategoryAttribute> {
    const attribute = await this.prisma.categoryAttribute.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    } as unknown as Prisma.CategoryAttributeUpdateArgs);

    return this.mapToDomain(attribute);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.categoryAttribute.delete({
      where: { id },
    } as unknown as Prisma.CategoryAttributeDeleteArgs);
  }

  async getEffectiveAttributes(
    categoryId: string,
  ): Promise<CategoryAttribute[]> {
    // Get category with its path to find all ancestor categories
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { pathIds: true },
    } as unknown as Prisma.CategoryFindUniqueArgs);

    if (!category) {
      return [];
    }

    // Get all attributes from this category and its ancestors
    const allCategoryIds = [...category.pathIds, categoryId];

    const attributes = await this.prisma.categoryAttribute.findMany({
      where: {
        categoryId: { in: allCategoryIds },
      },
      orderBy: [
        { categoryId: 'desc' }, // Child categories override parent attributes
        { displayOrder: 'asc' },
      ],
    } as unknown as Prisma.CategoryAttributeFindManyArgs);

    // Remove duplicates (child attributes override parent attributes with same slug)
    const uniqueAttributes = new Map<string, any>();

    for (const attribute of attributes) {
      if (!uniqueAttributes.has(attribute.slug)) {
        uniqueAttributes.set(attribute.slug, attribute);
      }
    }

    return Array.from(uniqueAttributes.values()).map(this.mapToDomain);
  }

  async createInheritanceRule(data: InheritanceRuleData): Promise<void> {
    await this.prisma.categoryAttributeInheritance.create({
      data: {
        ...data,
        version: 1,
      },
    } as unknown as Prisma.CategoryAttributeInheritanceCreateArgs);
  }

  async updateInheritanceRule(
    sourceAttributeId: string,
    targetCategoryId: string,
    data: Partial<InheritanceRuleData>,
  ): Promise<void> {
    await this.prisma.categoryAttributeInheritance.update({
      where: {
        sourceAttributeId_targetCategoryId: {
          sourceAttributeId,
          targetCategoryId,
        },
      },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  }

  async removeInheritanceRules(sourceAttributeId: string): Promise<void> {
    await this.prisma.categoryAttributeInheritance.deleteMany({
      where: { sourceAttributeId },
    });
  }

  async updateInheritedAttributes(
    sourceAttributeId: string,
    updatedBy: string,
  ): Promise<void> {
    // Get the source attribute
    const sourceAttribute = await this.findById(sourceAttributeId);
    if (!sourceAttribute) {
      return;
    }

    // Find all inherited instances
    const inheritedAttributes = await this.prisma.categoryAttribute.findMany({
      where: { inheritedFrom: sourceAttributeId },
    } as unknown as Prisma.CategoryAttributeFindManyArgs);

    // Update each inherited attribute
    for (const inherited of inheritedAttributes) {
      // Only update if not overridden
      if (!inherited.overriddenAt) {
        await this.prisma.categoryAttribute.update({
          where: { id: inherited.id },
          data: {
            name: sourceAttribute.name,
            description: sourceAttribute.description,
            isRequired: sourceAttribute.isRequired,
            isVariant: sourceAttribute.isVariant,
            isFilterable: sourceAttribute.isFilterable,
            isSearchable: sourceAttribute.isSearchable,
            defaultValue: sourceAttribute.defaultValue,
            allowedValues: sourceAttribute.allowedValues,
            validationRules: sourceAttribute.validationRules,
            displayName: sourceAttribute.displayName,
            helpText: sourceAttribute.helpText,
            placeholder: sourceAttribute.placeholder,
            updatedBy,
            version: { increment: 1 },
          },
        } as unknown as Prisma.CategoryAttributeUpdateArgs);
      }
    }
  }

  async isAttributeUsedInProducts(attributeId: string): Promise<boolean> {
    // This would check if the attribute is used in any product attributes
    // Implementation depends on your product attribute schema
    // For now, return false as placeholder
    return false;
  }

  async getAttributesByType(type: AttributeType): Promise<CategoryAttribute[]> {
    const attributes = await this.prisma.categoryAttribute.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
    } as unknown as Prisma.CategoryAttributeFindManyArgs);

    return attributes.map(this.mapToDomain);
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

  async bulkCreate(
    attributes: CreateCategoryAttributeData[],
  ): Promise<CategoryAttribute[]> {
    const results: CategoryAttribute[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const attributeData of attributes) {
        const attribute = await tx.categoryAttribute.create({
          data: {
            ...attributeData,
            version: 1,
          },
        } as unknown as Prisma.CategoryAttributeCreateArgs);
        results.push(this.mapToDomain(attribute));
      }
    });

    return results;
  }

  async bulkUpdate(
    updates: Array<{ id: string; data: Partial<CategoryAttribute> }>,
  ): Promise<CategoryAttribute[]> {
    const results: CategoryAttribute[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const { id, data } of updates) {
        const attribute = await tx.categoryAttribute.update({
          where: { id },
          data: {
            ...data,
            version: { increment: 1 },
          },
        } as unknown as Prisma.CategoryAttributeUpdateArgs);
        results.push(this.mapToDomain(attribute));
      }
    });

    return results;
  }

  async getAttributeStatistics(categoryId?: string): Promise<{
    totalAttributes: number;
    attributesByType: Record<AttributeType, number>;
    inheritedAttributes: number;
    overriddenAttributes: number;
    variantAttributes: number;
    requiredAttributes: number;
  }> {
    const where: any = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [
      totalAttributes,
      attributesByType,
      inheritedAttributes,
      overriddenAttributes,
      variantAttributes,
      requiredAttributes,
    ] = await Promise.all([
      this.prisma.categoryAttribute.count({ where } as any),
      this.prisma.categoryAttribute.groupBy({
        by: ['type' as any],
        where,
        _count: true,
      } as any),
      this.prisma.categoryAttribute.count({
        where: { ...where, inheritedFrom: { not: null } },
      } as any),
      this.prisma.categoryAttribute.count({
        where: { ...where, overriddenAt: { not: null } },
      } as any),
      this.prisma.categoryAttribute.count({
        where: { ...where, isVariant: true },
      } as any),
      this.prisma.categoryAttribute.count({
        where: { ...where, isRequired: true },
      } as any),
    ]);

    const typeCountsMap = Object.values(AttributeType).reduce(
      (acc, type) => {
        acc[type] = 0;
        return acc;
      },
      {} as Record<AttributeType, number>,
    );

    attributesByType.forEach(({ type, _count }) => {
      typeCountsMap[type] = _count;
    });

    return {
      totalAttributes,
      attributesByType: typeCountsMap,
      inheritedAttributes,
      overriddenAttributes,
      variantAttributes,
      requiredAttributes,
    };
  }

  // Private helper methods
  private async getInheritedAttributes(
    categoryId: string,
  ): Promise<CategoryAttribute[]> {
    // Get category path to find ancestors
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { pathIds: true },
    } as unknown as Prisma.CategoryFindUniqueArgs);

    if (!category || category.pathIds.length === 0) {
      return [];
    }

    // Get inheritable attributes from ancestor categories
    const inheritableAttributes = await this.prisma.categoryAttribute.findMany({
      where: {
        categoryId: { in: category.pathIds },
        isInheritable: true,
      },
      orderBy: { displayOrder: 'asc' },
    } as unknown as Prisma.CategoryAttributeFindManyArgs);

    // Filter out attributes that are already defined in the target category
    const existingAttributeSlugs = await this.prisma.categoryAttribute.findMany(
      {
        where: { categoryId },
        select: { slug: true },
      } as unknown as Prisma.CategoryAttributeFindManyArgs,
    );

    const existingSlugs = new Set(
      existingAttributeSlugs.map((attr) => attr.slug),
    );

    return inheritableAttributes
      .filter((attr) => !existingSlugs.has(attr.slug))
      .map(this.mapToDomain);
  }

  private mapToDomain(prismaData: any): CategoryAttribute {
    return new CategoryAttribute({
      id: prismaData.id,
      categoryId: prismaData.categoryId,
      name: prismaData.name,
      slug: prismaData.slug,
      type: prismaData.type,
      description: prismaData.description,
      isRequired: prismaData.isRequired,
      isInheritable: prismaData.isInheritable,
      isOverridable: prismaData.isOverridable,
      isVariant: prismaData.isVariant,
      isFilterable: prismaData.isFilterable,
      isSearchable: prismaData.isSearchable,
      defaultValue: prismaData.defaultValue,
      allowedValues: prismaData.allowedValues,
      validationRules: prismaData.validationRules,
      displayOrder: prismaData.displayOrder,
      displayName: prismaData.displayName,
      helpText: prismaData.helpText,
      placeholder: prismaData.placeholder,
      inheritedFrom: prismaData.inheritedFrom,
      overriddenAt: prismaData.overriddenAt,
      createdBy: prismaData.createdBy,
      updatedBy: prismaData.updatedBy,
      createdAt: prismaData.createdAt,
      updatedAt: prismaData.updatedAt,
    });
  }
}
