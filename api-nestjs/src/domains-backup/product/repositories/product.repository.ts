import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { 
  ProductRepository as IProductRepository,
  ProductFilters,
  PaginationOptions,
  ProductIncludeOptions,
  ProductStatistics,
  BulkUpdateData,
  ProductValidationResult
} from '../interfaces/product-repository.interface';
import { Product } from '../entities/product.entity';
import { ProductStatus } from '../enums/product-status.enum';
import { ProductModerationStatus } from '../enums/product-moderation-status.enum';

@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    filters: ProductFilters = {},
    pagination: PaginationOptions = {},
    includes: ProductIncludeOptions = {}
  ): Promise<{ data: Product[]; total: number }> {
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderByClause(pagination);
    const include = this.buildIncludeClause(includes);

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include,
        orderBy,
        skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
        take: pagination.limit || 20,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: data.map(this.mapToEntity),
      total,
    };
  }

  async findById(id: string, includes: ProductIncludeOptions = {}): Promise<Product | null> {
    const include = this.buildIncludeClause(includes);
    
    const product = await this.prisma.product.findUnique({
      where: { id },
      include,
    });

    return product ? this.mapToEntity(product) : null;
  }

  async findBySlug(slug: string, includes: ProductIncludeOptions = {}): Promise<Product | null> {
    const include = this.buildIncludeClause(includes);
    
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include,
    });

    return product ? this.mapToEntity(product) : null;
  }

  async findByIds(ids: string[], includes: ProductIncludeOptions = {}): Promise<Product[]> {
    const include = this.buildIncludeClause(includes);
    
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      include,
    });

    return products.map(this.mapToEntity);
  }

  async create(data: Partial<Product>): Promise<Product> {
    const product = await this.prisma.product.create({
      data: {
        name: data.name!,
        slug: data.slug!,
        description: data.description || '',
        categoryId: data.categoryId!,
        brandId: data.brandId,
        sellerId: data.sellerId!,
        status: data.status || ProductStatus.DRAFT,
        // isActive: data.isActive || false,
        // TODO: Uncomment after Prisma client regeneration
        // shortDescription: data.shortDescription,
        // visibility: data.visibility || 'PRIVATE',
        // moderationStatus: data.moderationStatus || ProductModerationStatus.PENDING,
        // seoTitle: data.seoTitle,
        // seoDescription: data.seoDescription,
        // seoKeywords: data.seoKeywords || [],
        // metaData: data.metaData as any,
        // images: data.images || [],
        // videos: data.videos || [],
        // documents: data.documents || [],
        // tags: data.tags || [],
        // displayOrder: data.displayOrder || 0,
        // isFeatured: data.isFeatured || false,
        // hasVariants: data.hasVariants || false,
        // variantAttributes: data.variantAttributes || [],
        // version: data.version || 1,
        // createdBy: data.createdBy!,
        // scheduledPublishAt: data.scheduledPublishAt,
      },
      include: {
        category: true,
        brand: true,
        attributeValues: true,
      },
    });

    return this.mapToEntity(product);
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        status: data.status,
        // isActive: data.isActive,
        // TODO: Uncomment after Prisma client regeneration
        // shortDescription: data.shortDescription,
        // visibility: data.visibility,
        // seoTitle: data.seoTitle,
        // seoDescription: data.seoDescription,
        // seoKeywords: data.seoKeywords,
        // metaData: data.metaData as any,
        // images: data.images,
        // videos: data.videos,
        // documents: data.documents,
        // tags: data.tags,
        // displayOrder: data.displayOrder,
        // isFeatured: data.isFeatured,
        // hasVariants: data.hasVariants,
        // variantAttributes: data.variantAttributes,
        // version: data.version,
        // updatedBy: data.updatedBy,
        // scheduledPublishAt: data.scheduledPublishAt,
      },
      include: {
        category: true,
        brand: true,
        attributeValues: true,
      },
    });

    return this.mapToEntity(product);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({
      where: { id },
    });
  }

  async softDelete(id: string, deletedBy: string, reason?: string): Promise<void> {
    await this.prisma.product.update({
      where: { id },
      data: {
        // TODO: Uncomment after Prisma client regeneration
        // deletedAt: new Date(),
        // deletedBy,
        status: ProductStatus.ARCHIVED,
        // isActive: false,
        // updatedBy: deletedBy,
      },
    });
  }

  async validateSlug(slug: string, excludeId?: string): Promise<boolean> {
    const where: any = { 
      slug, 
      // TODO: Uncomment after Prisma client regeneration
      // deletedAt: null 
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.product.count({ where });
    return count === 0;
  }

  async validateName(name: string, sellerId: string, excludeId?: string): Promise<boolean> {
    const where: any = { 
      name, 
      sellerId, 
      // TODO: Uncomment after Prisma client regeneration
      // deletedAt: null 
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.product.count({ where });
    return count === 0;
  }

  async validateCategoryBrandCombination(categoryId: string, brandId: string): Promise<boolean> {
    // This would integrate with category and brand validation
    // For now, assume it's valid
    return true;
  }

  async updateStatus(id: string, status: ProductStatus, updatedBy: string, reason?: string): Promise<Product> {
    const updateData: any = { status, updatedBy };
    
    if (status === ProductStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        brand: true,
        attributeValues: true,
      },
    });

    return this.mapToEntity(product);
  }

  async updateModerationStatus(
    id: string, 
    moderationStatus: ProductModerationStatus, 
    moderatedBy: string, 
    notes?: string
  ): Promise<Product> {
    const product = await this.prisma.product.update({
      where: { id },
      data: { 
        // TODO: Uncomment after Prisma client regeneration
        // moderationStatus, 
        // moderatedBy, 
        // moderatedAt: new Date(),
        // moderationNotes: notes,
        // updatedBy: moderatedBy,
        status: moderationStatus === ProductModerationStatus.APPROVED ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
        updatedAt: new Date(),
      },
      include: {
        category: true,
        brand: true,
        attributeValues: true,
      },
    });

    return this.mapToEntity(product);
  }

  async bulkUpdateStatus(ids: string[], status: ProductStatus, updatedBy: string, reason?: string): Promise<Product[]> {
    const updateData: any = { status, updatedBy };
    
    if (status === ProductStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
    }

    await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return this.findByIds(ids);
  }

  async bulkUpdate(updates: BulkUpdateData[]): Promise<Product[]> {
    await this.prisma.$transaction(async (tx) => {
      for (const update of updates) {
        await tx.product.update({
          where: { id: update.id },
          data: {
            // Only update fields that exist in the current schema
            ...(update.data.name && { name: update.data.name }),
            ...(update.data.slug && { slug: update.data.slug }),
            ...(update.data.description && { description: update.data.description }),
            ...(update.data.status && { status: update.data.status }),
            // TODO: Uncomment after Prisma client regeneration
            // updatedBy: update.updatedBy,
          },
        });
      }
    });

    const ids = updates.map(u => u.id);
    return this.findByIds(ids);
  }

  async bulkDelete(ids: string[], deletedBy: string, reason?: string): Promise<void> {
    await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: {
        // TODO: Uncomment after Prisma client regeneration
        // deletedAt: new Date(),
        // deletedBy,
        status: ProductStatus.ARCHIVED,
        // isActive: false,
        // updatedBy: deletedBy,
      },
    });
  }

  async searchByName(query: string, filters: ProductFilters = {}): Promise<Product[]> {
    const where = {
      ...this.buildWhereClause(filters),
      name: { contains: query, mode: 'insensitive' },
    };

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
      },
      orderBy: { name: 'asc' },
    });

    return products.map(this.mapToEntity);
  }

  async searchByDescription(query: string, filters: ProductFilters = {}): Promise<Product[]> {
    const where = {
      ...this.buildWhereClause(filters),
      description: { contains: query, mode: 'insensitive' },
    };

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return products.map(this.mapToEntity);
  }

  async fullTextSearch(query: string, filters: ProductFilters = {}): Promise<Product[]> {
    const where = {
      ...this.buildWhereClause(filters),
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { shortDescription: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query] } },
      ],
    };

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return products.map(this.mapToEntity);
  }

  async findByCategory(categoryId: string, filters: ProductFilters = {}, pagination: PaginationOptions = {}): Promise<{ data: Product[]; total: number }> {
    return this.findAll({ ...filters, categoryId }, pagination);
  }

  async findByCategoryTree(categoryId: string, includeDescendants: boolean = false): Promise<Product[]> {
    // This would require category tree traversal
    // For now, just find products in the specific category
    const result = await this.findByCategory(categoryId);
    return result.data;
  }

  async updateCategory(id: string, categoryId: string, updatedBy: string, reason?: string): Promise<Product> {
    const product = await this.prisma.product.update({
      where: { id },
      data: { 
        categoryId, 
        // TODO: Uncomment after Prisma client regeneration
        // updatedBy 
      },
      include: {
        category: true,
        brand: true,
        attributeValues: true,
      },
    });

    return this.mapToEntity(product);
  }

  async findByBrand(brandId: string, filters: ProductFilters = {}, pagination: PaginationOptions = {}): Promise<{ data: Product[]; total: number }> {
    return this.findAll({ ...filters, brandId }, pagination);
  }

  async updateBrand(id: string, brandId: string, updatedBy: string, reason?: string): Promise<Product> {
    const product = await this.prisma.product.update({
      where: { id },
      data: { 
        brandId, 
        // TODO: Uncomment after Prisma client regeneration
        // updatedBy 
      },
      include: {
        category: true,
        brand: true,
        attributeValues: true,
      },
    });

    return this.mapToEntity(product);
  }

  async findBySeller(sellerId: string, filters: ProductFilters = {}, pagination: PaginationOptions = {}): Promise<{ data: Product[]; total: number }> {
    return this.findAll({ ...filters, sellerId }, pagination);
  }

  async getSellerStatistics(sellerId: string): Promise<ProductStatistics> {
    const baseWhere = { 
      sellerId, 
      // TODO: Uncomment after Prisma client regeneration
      // deletedAt: null 
    };

    const [
      total,
      draft,
      submitted,
      approved,
      published,
      rejected,
      suspended,
      archived,
      featured,
      withVariants,
    ] = await Promise.all([
      this.prisma.product.count({ where: baseWhere }),
      this.prisma.product.count({ where: { ...baseWhere, status: ProductStatus.DRAFT } }),
      this.prisma.product.count({ where: { ...baseWhere, status: ProductStatus.SUBMITTED } }),
      this.prisma.product.count({ where: { ...baseWhere, status: ProductStatus.APPROVED } }),
      this.prisma.product.count({ where: { ...baseWhere, status: ProductStatus.PUBLISHED } }),
      this.prisma.product.count({ where: { ...baseWhere, status: ProductStatus.REJECTED } }),
      this.prisma.product.count({ where: { ...baseWhere, status: ProductStatus.SUSPENDED } }),
      this.prisma.product.count({ where: { ...baseWhere, status: ProductStatus.ARCHIVED } }),
      // TODO: Uncomment after Prisma client regeneration
      // this.prisma.product.count({ where: { ...baseWhere, isFeatured: true } }),
      // this.prisma.product.count({ where: { ...baseWhere, hasVariants: true } }),
      this.prisma.product.count({ where: baseWhere }), // Temporary placeholder
      this.prisma.product.count({ where: baseWhere }), // Temporary placeholder
    ]);

    return {
      totalProducts: total,
      draftProducts: draft,
      submittedProducts: submitted,
      approvedProducts: approved,
      publishedProducts: published,
      rejectedProducts: rejected,
      suspendedProducts: suspended,
      archivedProducts: archived,
      featuredProducts: featured,
      productsWithVariants: withVariants,
      productsByCategory: {},
      productsByBrand: {},
      productsBySeller: { [sellerId]: total },
      lastUpdated: new Date(),
    };
  }

  async findFeatured(filters: ProductFilters = {}, limit: number = 10): Promise<Product[]> {
    // TODO: Uncomment after Prisma client regeneration
    // const result = await this.findAll({ ...filters, isFeatured: true }, { limit });
    const result = await this.findAll(filters, { limit });
    return result.data;
  }

  async setFeatured(id: string, isFeatured: boolean, updatedBy: string): Promise<Product> {
    const product = await this.prisma.product.update({
      where: { id },
      data: { 
        // TODO: Uncomment after Prisma client regeneration
        // isFeatured, 
        // updatedBy 
      },
      include: {
        category: true,
        brand: true,
        attributeValues: true,
      },
    });

    return this.mapToEntity(product);
  }

  async findScheduledForPublishing(beforeDate?: Date): Promise<Product[]> {
    const where: any = {
      status: ProductStatus.APPROVED,
      // TODO: Uncomment after Prisma client regeneration
      // scheduledPublishAt: {
      //   lte: beforeDate || new Date(),
      // },
      // deletedAt: null,
    };

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
      },
    });

    return products.map(this.mapToEntity);
  }

  async publish(id: string, publishedBy: string): Promise<Product> {
    return this.updateStatus(id, ProductStatus.PUBLISHED, publishedBy);
  }

  async unpublish(id: string, unpublishedBy: string, reason?: string): Promise<Product> {
    return this.updateStatus(id, ProductStatus.DRAFT, unpublishedBy, reason);
  }

  async findPendingModeration(limit: number = 50): Promise<Product[]> {
    const result = await this.findAll(
      { moderationStatus: ProductModerationStatus.PENDING },
      { limit, sortBy: 'createdAt', sortOrder: 'asc' }
    );
    return result.data;
  }

  async findByModerationStatus(status: ProductModerationStatus): Promise<Product[]> {
    const result = await this.findAll({ moderationStatus: status });
    return result.data;
  }

  async getStatistics(): Promise<ProductStatistics> {
    const [
      total,
      draft,
      submitted,
      approved,
      published,
      rejected,
      suspended,
      archived,
      featured,
      withVariants,
      byCategory,
      byBrand,
    ] = await Promise.all([
      // TODO: Uncomment after Prisma client regeneration
      // this.prisma.product.count({ where: { deletedAt: null } }),
      // this.prisma.product.count({ where: { status: ProductStatus.DRAFT, deletedAt: null } }),
      // this.prisma.product.count({ where: { status: ProductStatus.SUBMITTED, deletedAt: null } }),
      // this.prisma.product.count({ where: { status: ProductStatus.APPROVED, deletedAt: null } }),
      // this.prisma.product.count({ where: { status: ProductStatus.PUBLISHED, deletedAt: null } }),
      // this.prisma.product.count({ where: { status: ProductStatus.REJECTED, deletedAt: null } }),
      // this.prisma.product.count({ where: { status: ProductStatus.SUSPENDED, deletedAt: null } }),
      // this.prisma.product.count({ where: { status: ProductStatus.ARCHIVED, deletedAt: null } }),
      // this.prisma.product.count({ where: { isFeatured: true, deletedAt: null } }),
      // this.prisma.product.count({ where: { hasVariants: true, deletedAt: null } }),
      
      // Temporary placeholders
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: ProductStatus.DRAFT } }),
      this.prisma.product.count({ where: { status: ProductStatus.SUBMITTED } }),
      this.prisma.product.count({ where: { status: ProductStatus.APPROVED } }),
      this.prisma.product.count({ where: { status: ProductStatus.PUBLISHED } }),
      this.prisma.product.count({ where: { status: ProductStatus.REJECTED } }),
      this.prisma.product.count({ where: { status: ProductStatus.SUSPENDED } }),
      this.prisma.product.count({ where: { status: ProductStatus.ARCHIVED } }),
      this.prisma.product.count(), // Placeholder for featured
      this.prisma.product.count(), // Placeholder for withVariants
      
      this.prisma.product.groupBy({
        by: ['categoryId'],
        // TODO: Uncomment after Prisma client regeneration
        // where: { deletedAt: null },
        _count: true,
      }),
      this.prisma.product.groupBy({
        by: ['brandId'],
        // TODO: Uncomment after Prisma client regeneration
        // where: { deletedAt: null },
        _count: true,
      }),
    ]);

    return {
      totalProducts: total,
      draftProducts: draft,
      submittedProducts: submitted,
      approvedProducts: approved,
      publishedProducts: published,
      rejectedProducts: rejected,
      suspendedProducts: suspended,
      archivedProducts: archived,
      featuredProducts: featured,
      productsWithVariants: withVariants,
      productsByCategory: byCategory.reduce((acc, item) => {
        acc[item.categoryId] = item._count || 0;
        return acc;
      }, {} as Record<string, number>),
      productsByBrand: byBrand.reduce((acc, item) => {
        acc[item.brandId || 'unknown'] = item._count || 0;
        return acc;
      }, {} as Record<string, number>),
      productsBySeller: {},
      lastUpdated: new Date(),
    };
  }

  async getCategoryStatistics(categoryId: string): Promise<ProductStatistics> {
    const baseStats = await this.getStatistics();
    const categoryProducts = await this.findByCategory(categoryId);
    
    return {
      ...baseStats,
      totalProducts: categoryProducts.total,
      productsByCategory: { [categoryId]: categoryProducts.total },
    };
  }

  async getBrandStatistics(brandId: string): Promise<ProductStatistics> {
    const baseStats = await this.getStatistics();
    const brandProducts = await this.findByBrand(brandId);
    
    return {
      ...baseStats,
      totalProducts: brandProducts.total,
      productsByBrand: { [brandId]: brandProducts.total },
    };
  }

  async cleanupDeletedProducts(olderThanDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // TODO: Uncomment after Prisma client regeneration
    // const result = await this.prisma.product.deleteMany({
    //   where: {
    //     deletedAt: { lt: cutoffDate },
    //   },
    // });

    // Temporary placeholder
    return 0;
  }

  async refreshStatistics(): Promise<void> {
    // This would update cached statistics
    // Implementation depends on caching strategy
  }

  async incrementVersion(id: string): Promise<Product> {
    // TODO: Regenerate Prisma client to include version field
    // const product = await this.prisma.product.update({
    //   where: { id },
    //   data: {
    //     version: { increment: 1 },
    //   },
    //   include: {
    //     category: true,
    //     brand: true,
    //     attributeValues: true,
    //   },
    // });

    // Temporary workaround - just fetch the product
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        updatedAt: new Date(),
      },
      include: {
        category: true,
        brand: true,
        attributeValues: true,
      },
    });

    return this.mapToEntity(product);
  }

  async findByVersion(id: string, version: number): Promise<Product | null> {
    // TODO: Regenerate Prisma client to include version field
    // const product = await this.prisma.product.findFirst({
    //   where: { id, version },
    //   include: {
    //     category: true,
    //     brand: true,
    //     attributeValues: true,
    //   },
    // });

    // Temporary workaround - just find by id
    const product = await this.prisma.product.findFirst({
      where: { id },
      include: {
        category: true,
        brand: true,
        attributeValues: true,
      },
    });

    return product ? this.mapToEntity(product) : null;
  }

  // Private helper methods
  private buildWhereClause(filters: ProductFilters): any {
    const where: any = { 
      // TODO: Uncomment after Prisma client regeneration
      // deletedAt: null 
    };

    if (filters.status) {
      where.status = filters.status;
    }

    // TODO: Uncomment after Prisma client regeneration
    // if (filters.visibility) {
    //   where.visibility = filters.visibility;
    // }

    // if (filters.moderationStatus) {
    //   where.moderationStatus = filters.moderationStatus;
    // }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.brandId) {
      where.brandId = filters.brandId;
    }

    if (filters.sellerId) {
      where.sellerId = filters.sellerId;
    }

    if (filters.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured;
    }

    if (filters.hasVariants !== undefined) {
      where.hasVariants = filters.hasVariants;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { shortDescription: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
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

    if (filters.publishedAfter || filters.publishedBefore) {
      where.publishedAt = {};
      if (filters.publishedAfter) {
        where.publishedAt.gte = filters.publishedAfter;
      }
      if (filters.publishedBefore) {
        where.publishedAt.lte = filters.publishedBefore;
      }
    }

    return where;
  }

  private buildOrderByClause(pagination: PaginationOptions): any {
    const sortBy = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder || 'desc';

    return { [sortBy]: sortOrder };
  }

  private buildIncludeClause(includes: ProductIncludeOptions): any {
    const include: any = {};

    if (includes.includeAttributeValues) {
      include.attributeValues = {
        include: {
          attribute: true,
          option: true,
        },
      };
    }

    if (includes.includeCategory) {
      include.category = true;
    }

    if (includes.includeBrand) {
      include.brand = true;
    }

    if (includes.includeSeller) {
      include.seller = {
        select: {
          id: true,
          name: true,
          email: true,
        },
      };
    }

    if (includes.includeVariants) {
      include.variants = true;
    }

    if (includes.includeReviews) {
      include.reviews = {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      };
    }

    return include;
  }

  private mapToEntity(prismaData: any): Product {
    const product = new Product();
    
    product.id = prismaData.id;
    product.name = prismaData.name;
    product.slug = prismaData.slug;
    product.description = prismaData.description;
    product.categoryId = prismaData.categoryId;
    product.brandId = prismaData.brandId;
    product.sellerId = prismaData.sellerId;
    product.status = prismaData.status;
    // product.isActive = prismaData.isActive;
    product.createdAt = prismaData.createdAt;
    product.updatedAt = prismaData.updatedAt;
    
    // TODO: Uncomment after Prisma client regeneration
    // product.shortDescription = prismaData.shortDescription;
    // product.visibility = prismaData.visibility;
    // product.moderationStatus = prismaData.moderationStatus;
    // product.moderationNotes = prismaData.moderationNotes;
    // product.moderatedBy = prismaData.moderatedBy;
    // product.moderatedAt = prismaData.moderatedAt;
    // product.publishedAt = prismaData.publishedAt;
    // product.scheduledPublishAt = prismaData.scheduledPublishAt;
    // product.seoTitle = prismaData.seoTitle;
    // product.seoDescription = prismaData.seoDescription;
    // product.seoKeywords = prismaData.seoKeywords || [];
    // product.metaData = prismaData.metaData;
    // product.images = prismaData.images || [];
    // product.videos = prismaData.videos || [];
    // product.documents = prismaData.documents || [];
    // product.tags = prismaData.tags || [];
    // product.displayOrder = prismaData.displayOrder;
    // product.isFeatured = prismaData.isFeatured;
    // product.hasVariants = prismaData.hasVariants;
    // product.variantAttributes = prismaData.variantAttributes || [];
    // product.version = prismaData.version;
    // product.createdBy = prismaData.createdBy;
    // product.updatedBy = prismaData.updatedBy;
    // product.deletedAt = prismaData.deletedAt;
    // product.deletedBy = prismaData.deletedBy;

    // Map relationships if included
    if (prismaData.attributeValues) {
      product.attributeValues = prismaData.attributeValues.map((av: any) => {
        const attributeValue = new (require('../entities/product-attribute-value.entity').ProductAttributeValue)();
        attributeValue.id = av.id;
        attributeValue.productId = av.productId;
        attributeValue.attributeId = av.attributeId;
        attributeValue.stringValue = av.stringValue;
        attributeValue.numberValue = av.numberValue;
        attributeValue.booleanValue = av.booleanValue;
        attributeValue.dateValue = av.dateValue;
        attributeValue.jsonValue = av.jsonValue;
        attributeValue.optionId = av.optionId;
        attributeValue.locale = av.locale;
        attributeValue.inheritedFrom = av.inheritedFrom;
        attributeValue.isOverridden = av.isOverridden;
        attributeValue.createdAt = av.createdAt;
        attributeValue.updatedAt = av.updatedAt;
        
        if (av.attribute) {
          attributeValue.attribute = av.attribute;
        }
        if (av.option) {
          attributeValue.option = av.option;
        }
        
        return attributeValue;
      });
    }

    return product;
  }
}