import { getDatabase } from '@shambit/database';
import { AppError } from '@shambit/shared';
import {
  Category,
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryListQuery,
} from '../types/category.types';

export class CategoryService {
  private get db() {
    return getDatabase();
  }

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryDto): Promise<Category> {
    // Generate slug from name
    let slug = this.generateSlug(data.name);
    
    // Validate parent category if provided
    if (data.parentId) {
      const parentCategory = await this.db('categories')
        .where('id', data.parentId)
        .first();
      
      if (!parentCategory) {
        throw new AppError('Parent category not found', 404, 'PARENT_CATEGORY_NOT_FOUND');
      }
    }

    // Check for duplicate slug and make it unique if necessary
    const existingCategory = await this.db('categories')
      .where('slug', slug)
      .first();
    
    if (existingCategory) {
      // Append a number to make it unique
      let counter = 1;
      let uniqueSlug = `${slug}-${counter}`;
      
      while (await this.db('categories').where('slug', uniqueSlug).first()) {
        counter++;
        uniqueSlug = `${slug}-${counter}`;
      }
      
      slug = uniqueSlug;
    }

    const [category] = await this.db('categories')
      .insert({
        parent_id: data.parentId || null,
        name: data.name,
        slug,
        description: data.description || null,
        image_url: data.imageUrl || null,
        banner_url: data.bannerUrl || null,
        icon_url: data.iconUrl || null,
        meta_title: data.metaTitle || null,
        meta_description: data.metaDescription || null,
        display_order: data.displayOrder ?? 0,
        is_featured: data.isFeatured ?? false,
        is_active: data.isActive ?? true,
      })
      .returning('*');

    return this.mapToCategory(category);
  }

  /**
   * Get all categories with optional filtering and hierarchical support
   */
  async getCategories(query: CategoryListQuery = {}): Promise<{
    categories: Category[];
    pagination: {
      page: number;
      pageSize: number;
      totalPages: number;
      totalItems: number;
    };
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let queryBuilder = this.db('categories');

    // Filter by parent category if specified
    if (query.parentId !== undefined) {
      queryBuilder = queryBuilder.where('parent_id', query.parentId);
    }

    // Filter by active status if specified
    if (query.isActive !== undefined) {
      queryBuilder = queryBuilder.where('is_active', query.isActive);
    }

    // Filter by featured status if specified
    if (query.isFeatured !== undefined) {
      queryBuilder = queryBuilder.where('is_featured', query.isFeatured);
    }

    // Get total count (without order by)
    const [{ count }] = await queryBuilder.clone().count('* as count');
    const totalItems = parseInt(count as string, 10);
    const totalPages = Math.ceil(totalItems / pageSize);

    // Get paginated results with ordering
    const categories = await queryBuilder
      .orderBy('display_order', 'asc')
      .orderBy('name', 'asc')
      .limit(pageSize)
      .offset(offset);

    const mappedCategories = categories.map(this.mapToCategory);

    // Add product counts for each category (optimized - single query)
    if (mappedCategories.length > 0) {
      const categoryIds = mappedCategories.map(c => c.id);
      const productCounts = await this.db('products')
        .select('category_id')
        .count('* as count')
        .whereIn('category_id', categoryIds)
        .groupBy('category_id');

      const countMap = new Map(
        productCounts.map(row => [row.category_id, parseInt(row.count as string, 10)])
      );

      mappedCategories.forEach(category => {
        category.productCount = countMap.get(category.id) || 0;
      });
    }

    // Include subcategories if requested
    if (query.includeSubcategories) {
      for (const category of mappedCategories) {
        category.subcategories = await this.getSubcategories(category.id);
      }
    }

    return {
      categories: mappedCategories,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems,
      },
    };
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(id: string): Promise<Category> {
    const category = await this.db('categories').where('id', id).first();

    if (!category) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    const mappedCategory = this.mapToCategory(category);

    // Add product count
    const [{ count }] = await this.db('products')
      .where('category_id', id)
      .count('* as count');
    mappedCategory.productCount = parseInt(count as string, 10);

    return mappedCategory;
  }

  /**
   * Update a category
   */
  async updateCategory(
    id: string,
    data: UpdateCategoryDto
  ): Promise<Category> {
    const category = await this.db('categories').where('id', id).first();

    if (!category) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    // Validate parent category if provided
    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new AppError('Category cannot be its own parent', 400, 'INVALID_PARENT_CATEGORY');
      }
      
      if (data.parentId) {
        const parentCategory = await this.db('categories')
          .where('id', data.parentId)
          .first();
        
        if (!parentCategory) {
          throw new AppError('Parent category not found', 404, 'PARENT_CATEGORY_NOT_FOUND');
        }

        // Check for circular reference
        if (await this.wouldCreateCircularReference(id, data.parentId)) {
          throw new AppError('Cannot create circular category hierarchy', 400, 'CIRCULAR_REFERENCE');
        }
      }
    }

    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (data.parentId !== undefined) updateData.parent_id = data.parentId;
    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.slug = this.generateSlug(data.name);
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;
    if (data.bannerUrl !== undefined) updateData.banner_url = data.bannerUrl;
    if (data.iconUrl !== undefined) updateData.icon_url = data.iconUrl;
    if (data.metaTitle !== undefined) updateData.meta_title = data.metaTitle;
    if (data.metaDescription !== undefined) updateData.meta_description = data.metaDescription;
    if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;
    if (data.isFeatured !== undefined) updateData.is_featured = data.isFeatured;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const [updatedCategory] = await this.db('categories')
      .where('id', id)
      .update(updateData)
      .returning('*');

    return this.mapToCategory(updatedCategory);
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    const category = await this.db('categories').where('id', id).first();

    if (!category) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    // Check if category has products
    const [{ count: productCount }] = await this.db('products')
      .where('category_id', id)
      .count('* as count');

    const products = parseInt(productCount as string, 10);
    if (products > 0) {
      throw new AppError(
        `Cannot delete category. It has ${products} product${products > 1 ? 's' : ''} associated with it. Please move or delete the products first.`,
        400,
        'CATEGORY_HAS_PRODUCTS'
      );
    }

    // Check if category has subcategories
    const [{ count: subcategoryCount }] = await this.db('categories')
      .where('parent_id', id)
      .count('* as count');

    const subcategories = parseInt(subcategoryCount as string, 10);
    if (subcategories > 0) {
      throw new AppError(
        `Cannot delete category. It has ${subcategories} subcategor${subcategories > 1 ? 'ies' : 'y'} associated with it. Please move or delete the subcategories first.`,
        400,
        'CATEGORY_HAS_SUBCATEGORIES'
      );
    }

    await this.db('categories').where('id', id).delete();
  }

  /**
   * Get subcategories for a given category
   */
  async getSubcategories(parentId: string): Promise<Category[]> {
    const subcategories = await this.db('categories')
      .where('parent_id', parentId)
      .where('is_active', true)
      .orderBy('display_order', 'asc')
      .orderBy('name', 'asc');

    const mappedSubcategories = subcategories.map(this.mapToCategory);

    // Add product counts (optimized - single query)
    if (mappedSubcategories.length > 0) {
      const categoryIds = mappedSubcategories.map(c => c.id);
      const productCounts = await this.db('products')
        .select('category_id')
        .count('* as count')
        .whereIn('category_id', categoryIds)
        .groupBy('category_id');

      const countMap = new Map(
        productCounts.map(row => [row.category_id, parseInt(row.count as string, 10)])
      );

      mappedSubcategories.forEach(category => {
        category.productCount = countMap.get(category.id) || 0;
      });
    }

    return mappedSubcategories;
  }

  /**
   * Get category hierarchy (tree structure)
   */
  async getCategoryHierarchy(): Promise<Category[]> {
    // Get all root categories (no parent)
    const rootCategories = await this.db('categories')
      .whereNull('parent_id')
      .where('is_active', true)
      .orderBy('display_order', 'asc')
      .orderBy('name', 'asc');

    const mappedRootCategories = rootCategories.map(this.mapToCategory);

    // Recursively load subcategories
    for (const category of mappedRootCategories) {
      category.subcategories = await this.loadSubcategoriesRecursive(category.id);
    }

    return mappedRootCategories;
  }

  /**
   * Get featured categories
   */
  async getFeaturedCategories(): Promise<Category[]> {
    const categories = await this.db('categories')
      .where('is_featured', true)
      .where('is_active', true)
      .orderBy('display_order', 'asc')
      .orderBy('name', 'asc');

    return categories.map(this.mapToCategory);
  }

  /**
   * Generate URL-friendly slug from category name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Check if setting a parent would create a circular reference
   */
  private async wouldCreateCircularReference(categoryId: string, parentId: string): Promise<boolean> {
    let currentParentId = parentId;
    
    while (currentParentId) {
      if (currentParentId === categoryId) {
        return true;
      }
      
      const parent = await this.db('categories')
        .where('id', currentParentId)
        .select('parent_id')
        .first();
      
      currentParentId = parent?.parent_id;
    }
    
    return false;
  }

  /**
   * Recursively load subcategories
   */
  private async loadSubcategoriesRecursive(parentId: string): Promise<Category[]> {
    const subcategories = await this.getSubcategories(parentId);
    
    for (const subcategory of subcategories) {
      subcategory.subcategories = await this.loadSubcategoriesRecursive(subcategory.id);
    }
    
    return subcategories;
  }

  /**
   * Map database row to Category object
   */
  private mapToCategory(row: any): Category {
    return {
      id: row.id,
      parentId: row.parent_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      imageUrl: row.image_url,
      bannerUrl: row.banner_url,
      iconUrl: row.icon_url,
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      displayOrder: row.display_order,
      isFeatured: row.is_featured,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const categoryService = new CategoryService();
