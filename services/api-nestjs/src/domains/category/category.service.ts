import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { CategoryRepository } from './category.repository';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
} from './dto/category.dto';
import { PaginationQuery } from '../../common/types';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async findAll(query: PaginationQuery) {
    return this.categoryRepository.findAll(query);
  }

  async findById(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async getCategoryTree(): Promise<CategoryResponseDto[]> {
    return this.categoryRepository.getCategoryTree();
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    // Check if slug already exists
    const existingCategory = await this.categoryRepository.findBySlug(
      createCategoryDto.slug,
    );
    if (existingCategory) {
      throw new ConflictException('Category with this slug already exists');
    }

    // Validate parent category if provided
    if (createCategoryDto.parentId) {
      const parentCategory = await this.categoryRepository.findById(
        createCategoryDto.parentId,
      );
      if (!parentCategory) {
        throw new BadRequestException('Parent category not found');
      }
    }

    return this.categoryRepository.create(createCategoryDto);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const existingCategory = await this.categoryRepository.findById(id);
    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    // Check slug uniqueness if being updated
    if (updateCategoryDto.slug && updateCategoryDto.slug !== existingCategory.slug) {
      const categoryWithSlug = await this.categoryRepository.findBySlug(
        updateCategoryDto.slug,
      );
      if (categoryWithSlug) {
        throw new ConflictException('Category with this slug already exists');
      }
    }

    // Validate parent category if being updated
    if (updateCategoryDto.parentId) {
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      const parentCategory = await this.categoryRepository.findById(
        updateCategoryDto.parentId,
      );
      if (!parentCategory) {
        throw new BadRequestException('Parent category not found');
      }

      // Check for circular reference
      const isCircular = await this.checkCircularReference(
        id,
        updateCategoryDto.parentId,
      );
      if (isCircular) {
        throw new BadRequestException('Circular reference detected');
      }
    }

    return this.categoryRepository.update(id, updateCategoryDto);
  }

  async delete(id: string): Promise<void> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has children
    const children = await this.categoryRepository.findChildren(id);
    if (children.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with child categories',
      );
    }

    // Check if category has products
    const hasProducts = await this.categoryRepository.hasProducts(id);
    if (hasProducts) {
      throw new BadRequestException('Cannot delete category with products');
    }

    await this.categoryRepository.delete(id);
  }

  private async checkCircularReference(
    categoryId: string,
    parentId: string,
  ): Promise<boolean> {
    let currentParentId = parentId;

    while (currentParentId) {
      if (currentParentId === categoryId) {
        return true;
      }

      const parent = await this.categoryRepository.findById(currentParentId);
      currentParentId = parent?.parentId || null;
    }

    return false;
  }

  async getCategoryPath(categoryId: string): Promise<string[]> {
    const path: string[] = [];
    let currentId = categoryId;

    while (currentId) {
      const category = await this.categoryRepository.findById(currentId);
      if (!category) break;

      path.unshift(category.name);
      currentId = category.parentId;
    }

    return path;
  }

  async getCategoryLevel(categoryId: string): Promise<number> {
    let level = 0;
    let currentId = categoryId;

    while (currentId) {
      const category = await this.categoryRepository.findById(currentId);
      if (!category) break;

      level++;
      currentId = category.parentId;
    }

    return level;
  }
}