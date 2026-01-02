import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  AttributeRepository as IAttributeRepository,
  AttributeFilters,
  PaginationOptions,
  AttributeIncludeOptions,
  AttributeStatistics,
  AttributeUsageStats,
  BulkUpdateData,
  AttributeUpdateData,
} from '../interfaces/attribute-repository.interface';
import { Prisma } from '@prisma/client';
import { Attribute } from '../entities/attribute.entity';
import { AttributeStatus } from '../enums/attribute-status.enum';
import { AttributeDataType } from '../enums/attribute-data-type.enum';

@Injectable()
export class AttributeRepository implements IAttributeRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(
    filters: AttributeFilters = {},
    pagination: PaginationOptions = {},
    includes: AttributeIncludeOptions = {},
  ): Promise<{ data: Attribute[]; total: number }> {
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderByClause(pagination);
    const include = this.buildIncludeClause(includes);

    const [data, total] = await Promise.all([
      this.prisma.attribute.findMany({
        where,
        include,
        orderBy,
        skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
        take: pagination.limit || 20,
      }),
      this.prisma.attribute.count({ where }),
    ]);

    return {
      data: data.map(this.mapToEntity),
      total,
    };
  }

  async findById(
    id: string,
    includes: AttributeIncludeOptions = {},
  ): Promise<Attribute | null> {
    const include = this.buildIncludeClause(includes);

    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
      include,
    });

    return attribute ? this.mapToEntity(attribute) : null;
  }

  async findBySlug(
    slug: string,
    includes: AttributeIncludeOptions = {},
  ): Promise<Attribute | null> {
    const include = this.buildIncludeClause(includes);

    const attribute = await this.prisma.attribute.findUnique({
      where: { slug },
      include,
    });

    return attribute ? this.mapToEntity(attribute) : null;
  }

  async findByIds(
    ids: string[],
    includes: AttributeIncludeOptions = {},
  ): Promise<Attribute[]> {
    const include = this.buildIncludeClause(includes);

    const attributes = await this.prisma.attribute.findMany({
      where: { id: { in: ids } },
      include,
    });

    return attributes.map(this.mapToEntity);
  }

  async create(data: Partial<Attribute>): Promise<Attribute> {
    const attribute = await this.prisma.attribute.create({
      data: {
        name: data.name!,
        slug: data.slug!,
        description: data.description,
        dataType: data.dataType!,
        // validation: this.convertValidationToPrisma(data.validation), // Field doesn't exist in schema
        isRequired: data.isRequired || false,
        isVariant: data.isVariant || false,
        isFilterable: data.isFilterable !== false, // Default to true
        isSearchable: data.isSearchable || false,
        isComparable: data.isComparable || false,
        displayOrder: data.displayOrder || 0,
        groupName: data.groupName,
        helpText: data.helpText,
        placeholder: data.placeholder,
        visibility: data.visibility || 'PUBLIC',
        adminOnly: data.adminOnly || false,
        isLocalizable: data.isLocalizable || false,
        status: data.status || AttributeStatus.DRAFT,
        createdBy: data.createdBy!,
        localizations: data.localizations
          ? {
            createMany: {
              data: data.localizations.map((loc) => ({
                locale: loc.locale,
                name: loc.name,
                description: loc.description,
                helpText: loc.helpText,
                placeholder: loc.placeholder,
              })),
            },
          }
          : undefined,
      },
      include: {
        attributeOptions: true,
        localizations: true,
      },
    });

    return this.mapToEntity(attribute);
  }

  async update(id: string, data: AttributeUpdateData): Promise<Attribute> {
    const attribute = await this.prisma.attribute.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isRequired: data.isRequired,
        isVariant: data.isVariant,
        isFilterable: data.isFilterable,
        isSearchable: data.isSearchable,
        isComparable: data.isComparable,
        displayOrder: data.displayOrder,
        groupName: data.groupName,
        helpText: data.helpText,
        placeholder: data.placeholder,
        visibility: data.visibility,
        adminOnly: data.adminOnly,
        isLocalizable: data.isLocalizable,
        status: data.status,
        updatedBy: data.updatedBy,
      },
      include: {
        attributeOptions: true,
        localizations: true,
      },
    });

    return this.mapToEntity(attribute);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.attribute.delete({
      where: { id },
    });
  }

  async softDelete(
    id: string,
    deletedBy: string,
    reason?: string,
  ): Promise<void> {
    await this.prisma.attribute.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
        status: AttributeStatus.ARCHIVED,
      },
    });
  }

  async validateSlug(slug: string, excludeId?: string): Promise<boolean> {
    const where: any = { slug };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.attribute.count({ where });
    return count === 0;
  }

  async validateName(name: string, excludeId?: string): Promise<boolean> {
    const where: any = { name };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.attribute.count({ where });
    return count === 0;
  }

  async updateStatus(
    id: string,
    status: AttributeStatus,
    updatedBy: string,
  ): Promise<Attribute> {
    const attribute = await this.prisma.attribute.update({
      where: { id },
      data: { status, updatedBy },
      include: {
        attributeOptions: true,
        localizations: true,
      },
    });

    return this.mapToEntity(attribute);
  }

  async bulkUpdateStatus(
    ids: string[],
    status: AttributeStatus,
    updatedBy: string,
  ): Promise<Attribute[]> {
    await this.prisma.attribute.updateMany({
      where: { id: { in: ids } },
      data: { status, updatedBy },
    });

    return this.findByIds(ids);
  }

  async bulkUpdate(updates: BulkUpdateData[]): Promise<Attribute[]> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const update of updates) {
        await (tx as any).attribute.update({
          where: { id: update.id },
          data: {
            ...update.data,
            updatedBy: update.updatedBy,
          },
        });
      }
    });

    const ids = updates.map((u) => u.id);
    return this.findByIds(ids);
  }

  async bulkDelete(
    ids: string[],
    deletedBy: string,
    reason?: string,
  ): Promise<void> {
    await this.prisma.attribute.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
        status: AttributeStatus.ARCHIVED,
      },
    });
  }

  async searchByName(
    query: string,
    filters: AttributeFilters = {},
  ): Promise<Attribute[]> {
    const where = {
      ...this.buildWhereClause(filters),
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
      ],
    };

    const attributes = await this.prisma.attribute.findMany({
      where,
      include: {
        attributeOptions: true,
        localizations: true,
      },
      orderBy: { name: 'asc' },
    });

    return attributes.map(this.mapToEntity);
  }

  async findByGroup(
    groupName: string,
    filters: AttributeFilters = {},
  ): Promise<Attribute[]> {
    const where = {
      ...this.buildWhereClause(filters),
      groupName,
    };

    const attributes = await this.prisma.attribute.findMany({
      where,
      include: {
        attributeOptions: true,
        localizations: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    return attributes.map(this.mapToEntity);
  }

  async findByDataType(
    dataType: AttributeDataType,
    filters: AttributeFilters = {},
  ): Promise<Attribute[]> {
    const where = {
      ...this.buildWhereClause(filters),
      dataType,
    };

    const attributes = await this.prisma.attribute.findMany({
      where,
      include: {
        attributeOptions: true,
        localizations: true,
      },
      orderBy: { name: 'asc' },
    });

    return attributes.map(this.mapToEntity);
  }

  async findByCategoryId(
    categoryId: string,
    includeInherited: boolean = true,
  ): Promise<Attribute[]> {
    // This would integrate with the category system
    // For now, return attributes that are commonly used
    const attributes = await this.prisma.attribute.findMany({
      where: {
        status: AttributeStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        attributeOptions: true,
        localizations: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    return attributes.map(this.mapToEntity);
  }

  async findVariantAttributesForCategory(
    categoryId: string,
  ): Promise<Attribute[]> {
    const attributes = await this.prisma.attribute.findMany({
      where: {
        isVariant: true,
        status: AttributeStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        attributeOptions: true,
        localizations: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    return attributes.map(this.mapToEntity);
  }

  async findFilterableAttributesForCategory(
    categoryId: string,
  ): Promise<Attribute[]> {
    const attributes = await this.prisma.attribute.findMany({
      where: {
        isFilterable: true,
        status: AttributeStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        attributeOptions: true,
        localizations: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    return attributes.map(this.mapToEntity);
  }

  async getStatistics(): Promise<AttributeStatistics> {
    const [
      total,
      active,
      draft,
      deprecated,
      archived,
      variant,
      filterable,
      searchable,
      localizable,
      byType,
      byGroup,
    ] = await Promise.all([
      this.prisma.attribute.count({ where: { deletedAt: null } }),
      this.prisma.attribute.count({
        where: { status: AttributeStatus.ACTIVE, deletedAt: null },
      }),
      this.prisma.attribute.count({
        where: { status: AttributeStatus.DRAFT, deletedAt: null },
      }),
      this.prisma.attribute.count({
        where: { status: AttributeStatus.DEPRECATED, deletedAt: null },
      }),
      this.prisma.attribute.count({
        where: { status: AttributeStatus.ARCHIVED, deletedAt: null },
      }),
      this.prisma.attribute.count({
        where: { isVariant: true, deletedAt: null },
      }),
      this.prisma.attribute.count({
        where: { isFilterable: true, deletedAt: null },
      }),
      this.prisma.attribute.count({
        where: { isSearchable: true, deletedAt: null },
      }),
      this.prisma.attribute.count({
        where: { isLocalizable: true, deletedAt: null },
      }),
      this.prisma.attribute.groupBy({
        by: ['dataType'],
        where: { deletedAt: null },
        _count: true,
      }),
      this.prisma.attribute.groupBy({
        by: ['groupName'],
        where: { deletedAt: null, groupName: { not: null } },
        _count: true,
      }),
    ]);

    return {
      totalAttributes: total,
      activeAttributes: active,
      draftAttributes: draft,
      deprecatedAttributes: deprecated,
      archivedAttributes: archived,
      variantAttributes: variant,
      filterableAttributes: filterable,
      searchableAttributes: searchable,
      localizableAttributes: localizable,
      attributesByType: byType.reduce(
        (acc, item) => {
          acc[item.dataType] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      attributesByGroup: byGroup.reduce(
        (acc, item) => {
          if (item.groupName) {
            acc[item.groupName] = item._count;
          }
          return acc;
        },
        {} as Record<string, number>,
      ),
      lastUpdated: new Date(),
    };
  }

  async getUsageStats(attributeId: string): Promise<AttributeUsageStats> {
    const [productUsage, variantUsage, categoryUsage] = await Promise.all([
      this.prisma.attributeValue.count({
        where: { attributeId, entityType: 'PRODUCT' },
      }),
      this.prisma.attributeValue.count({
        where: { attributeId, entityType: 'VARIANT' },
      }),
      this.prisma.attributeValue.count({
        where: { attributeId, entityType: 'CATEGORY' },
      }),
    ]);

    const lastUsed = await this.prisma.attributeValue.findFirst({
      where: { attributeId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return {
      attributeId,
      totalUsage: productUsage + variantUsage + categoryUsage,
      productUsage,
      variantUsage,
      categoryUsage,
      lastUsed: lastUsed?.updatedAt,
    };
  }

  async getPopularAttributes(limit: number = 10): Promise<Attribute[]> {
    // This would require a more complex query with usage statistics
    // For now, return most recently used attributes
    const attributes = await this.prisma.attribute.findMany({
      where: {
        status: AttributeStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        attributeOptions: true,
        localizations: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return attributes.map(this.mapToEntity);
  }

  async getUnusedAttributes(olderThanDays: number = 90): Promise<Attribute[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const attributes = await this.prisma.attribute.findMany({
      where: {
        updatedAt: { lt: cutoffDate },
        status: { not: AttributeStatus.ARCHIVED },
        deletedAt: null,
      },
      include: {
        attributeOptions: true,
        localizations: true,
      },
      orderBy: { updatedAt: 'asc' },
    });

    return attributes.map(this.mapToEntity);
  }

  async refreshUsageStats(attributeId?: string): Promise<void> {
    // This would update cached usage statistics
    // Implementation depends on caching strategy
  }

  async cleanupDeletedAttributes(olderThanDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.attribute.deleteMany({
      where: {
        deletedAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  // Private helper methods
  private buildWhereClause(filters: AttributeFilters): any {
    const where: any = { deletedAt: null };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.visibility) {
      where.visibility = filters.visibility;
    }

    if (filters.dataType) {
      where.dataType = filters.dataType;
    }

    if (filters.isRequired !== undefined) {
      where.isRequired = filters.isRequired;
    }

    if (filters.isVariant !== undefined) {
      where.isVariant = filters.isVariant;
    }

    if (filters.isFilterable !== undefined) {
      where.isFilterable = filters.isFilterable;
    }

    if (filters.isSearchable !== undefined) {
      where.isSearchable = filters.isSearchable;
    }

    if (filters.isComparable !== undefined) {
      where.isComparable = filters.isComparable;
    }

    if (filters.groupName) {
      where.groupName = filters.groupName;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) {
        where.createdAt.gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        where.createdAt.lte = filters.createdBefore;
      }
    }

    return where;
  }

  private buildOrderByClause(pagination: PaginationOptions): any {
    const sortBy = pagination.sortBy || 'displayOrder';
    const sortOrder = pagination.sortOrder || 'asc';

    return { [sortBy]: sortOrder };
  }

  private buildIncludeClause(includes: AttributeIncludeOptions): any {
    const include: any = {};

    if (includes.includeOptions) {
      include.attributeOptions = {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      };
    }

    if (includes.includeLocalizations) {
      include.localizations = true;
    }

    return include;
  }

  private mapToEntity(prismaData: any): Attribute {
    const attribute = new Attribute();

    attribute.id = prismaData.id;
    attribute.name = prismaData.name;
    attribute.slug = prismaData.slug;
    attribute.description = prismaData.description;
    attribute.dataType = prismaData.dataType;
    attribute.validation = undefined; // Field doesn't exist in schema, set to undefined
    attribute.isRequired = prismaData.isRequired;
    attribute.isVariant = prismaData.isVariant;
    attribute.isFilterable = prismaData.isFilterable;
    attribute.isSearchable = prismaData.isSearchable;
    attribute.isComparable = prismaData.isComparable;
    attribute.displayOrder = prismaData.displayOrder;
    attribute.groupName = prismaData.groupName;
    attribute.helpText = prismaData.helpText;
    attribute.placeholder = prismaData.placeholder;
    attribute.visibility = prismaData.visibility;
    attribute.adminOnly = prismaData.adminOnly;
    attribute.isLocalizable = prismaData.isLocalizable;
    attribute.status = prismaData.status;
    attribute.createdBy = prismaData.createdBy;
    attribute.updatedBy = prismaData.updatedBy;
    attribute.createdAt = prismaData.createdAt;
    attribute.updatedAt = prismaData.updatedAt;
    attribute.deletedAt = prismaData.deletedAt;

    // Map relationships if included
    if (prismaData.attributeOptions) {
      attribute.options = prismaData.attributeOptions.map((option: any) => {
        const opt =
          new (require('../entities/attribute-option.entity').AttributeOption)();
        opt.id = option.id;
        opt.attributeId = option.attributeId;
        opt.value = option.value;
        opt.label = option.label;
        opt.description = option.description;
        opt.color = option.color;
        opt.imageUrl = option.imageUrl;
        opt.displayOrder = option.displayOrder;
        opt.isDefault = option.isDefault;
        opt.isActive = option.isActive;
        opt.createdAt = option.createdAt;
        opt.updatedAt = option.updatedAt;
        return opt;
      });
    }

    if (prismaData.localizations) {
      attribute.localizations = prismaData.localizations.map((loc: any) => {
        const localization =
          new (require('../entities/attribute-localization.entity').AttributeLocalization)();
        localization.id = loc.id;
        localization.attributeId = loc.attributeId;
        localization.locale = loc.locale;
        localization.name = loc.name;
        localization.description = loc.description;
        localization.helpText = loc.helpText;
        localization.placeholder = loc.placeholder;
        localization.createdAt = loc.createdAt;
        localization.updatedAt = loc.updatedAt;
        return localization;
      });
    }

    return attribute;
  }

  private convertValidationToPrisma(validation: any): any {
    if (!validation) return null;
    return validation;
  }

  private convertValidationFromPrisma(validation: any): any {
    if (!validation) return undefined;
    return validation;
  }
}
