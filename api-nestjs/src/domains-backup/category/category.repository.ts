import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
} from './dto/category.dto';
import { PaginationQuery } from '../../common/types';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQuery) {
    const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          parent: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { children: true },
          },
        },
      }),
      this.prisma.category.count(),
    ]);

    return {
      data: categories.map(this.mapToResponseDto),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findById(id: string): Promise<CategoryResponseDto | null> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          select: { id: true, name: true, slug: true, isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { children: true },
        },
      },
    });

    return category ? this.mapToResponseDto(category) : null;
  }

  async findBySlug(slug: string): Promise<CategoryResponseDto | null> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { children: true },
        },
      },
    });

    return category ? this.mapToResponseDto(category) : null;
  }

  async getCategoryTree(): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
          include: {
            children: {
              orderBy: { sortOrder: 'asc' },
              include: {
                children: true,
              },
            },
          },
        },
      },
    });

    return categories.map(this.mapToTreeResponseDto);
  }

  async findChildren(parentId: string) {
    return this.prisma.category.findMany({
      where: { parentId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async hasProducts(categoryId: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { categoryId },
    });
    return count > 0;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    // Calculate level and path
    let level = 0;
    let path = createCategoryDto.slug;

    if (createCategoryDto.parentId) {
      const parent = await this.findById(createCategoryDto.parentId);
      if (parent) {
        level = parent.level + 1;
        path = `${parent.path}/${createCategoryDto.slug}`;
      }
    }

    const category = await this.prisma.category.create({
      data: {
        ...createCategoryDto,
        level,
        path,
        sortOrder: createCategoryDto.sortOrder || 0,
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { children: true },
        },
      },
    });

    return this.mapToResponseDto(category);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    // Recalculate level and path if parent changed
    let updateData: any = { ...updateCategoryDto };

    if (updateCategoryDto.parentId !== undefined) {
      let level = 0;
      let path = updateCategoryDto.slug || (await this.findById(id))?.slug || '';

      if (updateCategoryDto.parentId) {
        const parent = await this.findById(updateCategoryDto.parentId);
        if (parent) {
          level = parent.level + 1;
          path = `${parent.path}/${path}`;
        }
      }

      updateData = { ...updateData, level, path };
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { children: true },
        },
      },
    });

    return this.mapToResponseDto(category);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({
      where: { id },
    });
  }

  private mapToResponseDto(category: any): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      slug: category.slug,
      parentId: category.parentId,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      imageUrl: category.imageUrl,
      level: category.level,
      path: category.path,
      children: category.children?.map(this.mapToResponseDto) || [],
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private mapToTreeResponseDto = (category: any): CategoryResponseDto => {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      slug: category.slug,
      parentId: category.parentId,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      imageUrl: category.imageUrl,
      level: category.level,
      path: category.path,
      children: category.children?.map(this.mapToTreeResponseDto) || [],
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  };
}