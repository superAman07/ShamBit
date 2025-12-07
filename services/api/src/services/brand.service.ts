import { getDatabase } from '@shambit/database';
import { AppError, createLogger } from '@shambit/shared';
import {
  Brand,
  CreateBrandDto,
  UpdateBrandDto,
  BrandListQuery,
  BrandListResponse,
} from '../types/brand.types';

const logger = createLogger('brand-service');

export class BrandService {
  private get db() {
    return getDatabase();
  }

  /**
   * Create a new brand
   */
  async createBrand(data: CreateBrandDto): Promise<Brand> {
    try {
      // Validate required fields
      if (!data.name || data.name.trim().length === 0) {
        throw new AppError('Brand name is required', 400, 'VALIDATION_ERROR');
      }

      // Check for duplicate brand name
      const existingBrand = await this.db('brands')
        .where('name', data.name.trim())
        .first();

      if (existingBrand) {
        throw new AppError('Brand with this name already exists', 400, 'DUPLICATE_BRAND');
      }

      logger.info('Creating brand in database', { name: data.name });

      const [brand] = await this.db('brands')
        .insert({
          name: data.name.trim(),
          description: data.description?.trim() || null,
          logo_url: data.logoUrl || null,
          website_url: data.website?.trim() || null,
          country: data.country?.trim() || null,
          is_active: data.isActive ?? true,
        })
        .returning('*');

      logger.info('Brand created successfully', { brandId: brand.id, name: brand.name });

      return this.mapToBrand(brand);
    } catch (error) {
      logger.error('Failed to create brand', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get all brands with filtering and pagination
   */
  async getBrands(query: BrandListQuery = {}): Promise<BrandListResponse> {
    logger.info('Getting brands with query', { query });

    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;

    let queryBuilder = this.db('brands');

    // Filter by active status
    if (query.isActive !== undefined) {
      queryBuilder = queryBuilder.where('is_active', query.isActive);
    }

    // Filter by country
    if (query.country) {
      queryBuilder = queryBuilder.whereILike('country', `%${query.country}%`);
    }

    // Search functionality
    if (query.search) {
      const searchTerm = query.search.trim();
      queryBuilder = queryBuilder.where(function() {
        this.whereILike('name', `%${searchTerm}%`)
            .orWhereILike('description', `%${searchTerm}%`)
            .orWhereILike('country', `%${searchTerm}%`);
      });
    }

    // Get total count
    const [{ count }] = await queryBuilder.clone().count('* as count');
    const totalItems = parseInt(count as string, 10);
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get paginated results
    const brands = await queryBuilder
      .orderBy('name', 'asc')
      .limit(pageSize)
      .offset(offset);

    logger.info('Brand query result', { 
      foundBrands: brands.length, 
      totalItems, 
      page, 
      pageSize 
    });

    const result: BrandListResponse = {
      brands: brands.map(this.mapToBrand),
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems,
      },
    };

    return result;
  }

  /**
   * Get a single brand by ID
   */
  async getBrandById(id: string): Promise<Brand> {
    const brand = await this.db('brands')
      .where('id', id)
      .first();

    if (!brand) {
      throw new AppError('Brand not found', 404, 'BRAND_NOT_FOUND');
    }

    return this.mapToBrand(brand);
  }

  /**
   * Update a brand
   */
  async updateBrand(id: string, data: UpdateBrandDto): Promise<Brand> {
    const brand = await this.db('brands').where('id', id).first();

    if (!brand) {
      throw new AppError('Brand not found', 404, 'BRAND_NOT_FOUND');
    }

    // Check for duplicate name if updating name
    if (data.name && data.name !== brand.name) {
      const existingBrand = await this.db('brands')
        .where('name', data.name.trim())
        .whereNot('id', id)
        .first();
      
      if (existingBrand) {
        throw new AppError('Brand with this name already exists', 400, 'DUPLICATE_BRAND');
      }
    }

    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl || null;
    if (data.website !== undefined) updateData.website_url = data.website?.trim() || null;
    if (data.country !== undefined) updateData.country = data.country?.trim() || null;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const [updatedBrand] = await this.db('brands')
      .where('id', id)
      .update(updateData)
      .returning('*');

    logger.info('Brand updated', { brandId: id });

    return this.mapToBrand(updatedBrand);
  }

  /**
   * Delete a brand
   */
  async deleteBrand(id: string): Promise<void> {
    const brand = await this.db('brands').where('id', id).first();

    if (!brand) {
      throw new AppError('Brand not found', 404, 'BRAND_NOT_FOUND');
    }

    // Prevent deletion of default "Generic Brand"
    if (brand.name === 'Generic Brand') {
      throw new AppError(
        'Cannot delete the default Generic Brand. This brand is used for products without a specific brand.',
        400,
        'CANNOT_DELETE_DEFAULT_BRAND'
      );
    }

    // Check if brand is used by any products
    const productCount = await this.db('products')
      .where('brand_id', id)
      .count('* as count')
      .first();

    if (productCount && parseInt(productCount.count as string, 10) > 0) {
      throw new AppError(
        'Cannot delete brand that is used by products. Please update or delete the products first.',
        400,
        'BRAND_IN_USE'
      );
    }

    await this.db('brands').where('id', id).delete();

    logger.info('Brand deleted', { brandId: id });
  }

  /**
   * Search brands for dropdown/autocomplete
   */
  async searchBrands(query: string, limit: number = 10, isActive?: boolean): Promise<Brand[]> {
    let queryBuilder = this.db('brands')
      .whereILike('name', `%${query}%`)
      .orderBy('name', 'asc')
      .limit(limit);

    if (isActive !== undefined) {
      queryBuilder = queryBuilder.where('is_active', isActive);
    }

    const brands = await queryBuilder;
    return brands.map(this.mapToBrand);
  }

  /**
   * Upload brand logo
   */
  async uploadBrandLogo(id: string, fileBuffer: Buffer): Promise<{ logoUrl: string }> {
    const brand = await this.db('brands').where('id', id).first();

    if (!brand) {
      throw new AppError('Brand not found', 404, 'BRAND_NOT_FOUND');
    }

    // Save file to disk
    const fs = require('fs');
    const path = require('path');
    
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'brands', id);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save the file
    const filePath = path.join(uploadDir, 'logo.jpg');
    fs.writeFileSync(filePath, fileBuffer);

    const logoUrl = `/uploads/brands/${id}/logo.jpg`;

    await this.db('brands')
      .where('id', id)
      .update({
        logo_url: logoUrl,
        updated_at: this.db.fn.now(),
      });

    return { logoUrl };
  }

  /**
   * Map database row to Brand object
   */
  private mapToBrand(row: any): Brand {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      logoUrl: row.logo_url,
      website: row.website_url,
      country: row.country,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const brandService = new BrandService();