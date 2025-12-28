import { Attribute } from '../entities/attribute.entity';
import { AttributeOption } from '../entities/attribute-option.entity';
import { AttributeValue } from '../entities/attribute-value.entity';
import { AttributeDataType } from '../enums/attribute-data-type.enum';
import { AttributeStatus } from '../enums/attribute-status.enum';
import { AttributeVisibility } from '../enums/attribute-visibility.enum';
import { AttributeEntityType } from '../enums/attribute-entity-type.enum';

export interface AttributeFilters {
  status?: AttributeStatus;
  visibility?: AttributeVisibility;
  dataType?: AttributeDataType;
  isRequired?: boolean;
  isVariant?: boolean;
  isFilterable?: boolean;
  isSearchable?: boolean;
  isComparable?: boolean;
  groupName?: string;
  search?: string;
  createdBy?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AttributeIncludeOptions {
  includeOptions?: boolean;
  includeLocalizations?: boolean;
  includeUsageStats?: boolean;
}

export interface AttributeStatistics {
  totalAttributes: number;
  activeAttributes: number;
  draftAttributes: number;
  deprecatedAttributes: number;
  archivedAttributes: number;
  variantAttributes: number;
  filterableAttributes: number;
  searchableAttributes: number;
  localizableAttributes: number;
  attributesByType: Record<string, number>;
  attributesByGroup: Record<string, number>;
  lastUpdated: Date;
}

export interface AttributeUsageStats {
  attributeId: string;
  totalUsage: number;
  productUsage: number;
  variantUsage: number;
  categoryUsage: number;
  lastUsed?: Date;
}

export interface BulkUpdateData {
  id: string;
  data: Partial<Attribute>;
  updatedBy: string;
}

export interface AttributeRepository {
  // Basic CRUD operations
  findAll(
    filters?: AttributeFilters,
    pagination?: PaginationOptions,
    includes?: AttributeIncludeOptions
  ): Promise<{ data: Attribute[]; total: number }>;

  findById(id: string, includes?: AttributeIncludeOptions): Promise<Attribute | null>;
  findBySlug(slug: string, includes?: AttributeIncludeOptions): Promise<Attribute | null>;
  findByIds(ids: string[], includes?: AttributeIncludeOptions): Promise<Attribute[]>;

  create(data: Partial<Attribute>): Promise<Attribute>;
  update(id: string, data: Partial<Attribute>): Promise<Attribute>;
  delete(id: string): Promise<void>;
  softDelete(id: string, deletedBy: string, reason?: string): Promise<void>;

  // Validation operations
  validateSlug(slug: string, excludeId?: string): Promise<boolean>;
  validateName(name: string, excludeId?: string): Promise<boolean>;

  // Status operations
  updateStatus(id: string, status: AttributeStatus, updatedBy: string): Promise<Attribute>;
  bulkUpdateStatus(ids: string[], status: AttributeStatus, updatedBy: string): Promise<Attribute[]>;

  // Bulk operations
  bulkUpdate(updates: BulkUpdateData[]): Promise<Attribute[]>;
  bulkDelete(ids: string[], deletedBy: string, reason?: string): Promise<void>;

  // Search operations
  searchByName(query: string, filters?: AttributeFilters): Promise<Attribute[]>;
  findByGroup(groupName: string, filters?: AttributeFilters): Promise<Attribute[]>;
  findByDataType(dataType: AttributeDataType, filters?: AttributeFilters): Promise<Attribute[]>;

  // Category integration
  findByCategoryId(categoryId: string, includeInherited?: boolean): Promise<Attribute[]>;
  findVariantAttributesForCategory(categoryId: string): Promise<Attribute[]>;
  findFilterableAttributesForCategory(categoryId: string): Promise<Attribute[]>;

  // Statistics and analytics
  getStatistics(): Promise<AttributeStatistics>;
  getUsageStats(attributeId: string): Promise<AttributeUsageStats>;
  getPopularAttributes(limit?: number): Promise<Attribute[]>;
  getUnusedAttributes(olderThanDays?: number): Promise<Attribute[]>;

  // Maintenance operations
  refreshUsageStats(attributeId?: string): Promise<void>;
  cleanupDeletedAttributes(olderThanDays?: number): Promise<number>;
}

export interface AttributeOptionRepository {
  // Basic CRUD operations
  findByAttributeId(attributeId: string): Promise<AttributeOption[]>;
  findById(id: string): Promise<AttributeOption | null>;
  create(data: Partial<AttributeOption>): Promise<AttributeOption>;
  update(id: string, data: Partial<AttributeOption>): Promise<AttributeOption>;
  delete(id: string): Promise<void>;

  // Bulk operations
  createMany(options: Partial<AttributeOption>[]): Promise<AttributeOption[]>;
  updateMany(updates: { id: string; data: Partial<AttributeOption> }[]): Promise<AttributeOption[]>;
  deleteByAttributeId(attributeId: string): Promise<void>;

  // Validation operations
  validateValue(attributeId: string, value: string, excludeId?: string): Promise<boolean>;
  reorderOptions(attributeId: string, optionIds: string[]): Promise<void>;
}

export interface AttributeValueRepository {
  // Basic CRUD operations
  findByEntity(
    entityType: AttributeEntityType,
    entityId: string,
    locale?: string
  ): Promise<AttributeValue[]>;

  findByEntityAndAttribute(
    entityType: AttributeEntityType,
    entityId: string,
    attributeId: string,
    locale?: string
  ): Promise<AttributeValue | null>;

  create(data: Partial<AttributeValue>): Promise<AttributeValue>;
  update(id: string, data: Partial<AttributeValue>): Promise<AttributeValue>;
  upsert(data: Partial<AttributeValue>): Promise<AttributeValue>;
  delete(id: string): Promise<void>;

  // Bulk operations
  createMany(values: Partial<AttributeValue>[]): Promise<AttributeValue[]>;
  updateMany(updates: { id: string; data: Partial<AttributeValue> }[]): Promise<AttributeValue[]>;
  deleteByEntity(entityType: AttributeEntityType, entityId: string): Promise<void>;
  deleteByAttribute(attributeId: string): Promise<void>;

  // Query operations
  findByAttributeValue(
    attributeId: string,
    value: any,
    entityType?: AttributeEntityType
  ): Promise<AttributeValue[]>;

  findEntitiesWithAttribute(
    attributeId: string,
    entityType: AttributeEntityType,
    value?: any
  ): Promise<string[]>;

  // Statistics
  getAttributeUsageCount(attributeId: string): Promise<number>;
  getValueDistribution(attributeId: string): Promise<Record<string, number>>;
}