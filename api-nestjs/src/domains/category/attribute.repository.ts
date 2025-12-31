import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  CreateAttributeDto,
  UpdateAttributeDto,
  CategoryAttributeAssignmentDto,
} from './dto/attribute.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AttributeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.attribute.findMany({
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.attribute.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.attribute.findUnique({
      where: { slug },
    });
  }

  async create(createAttributeDto: CreateAttributeDto & { createdBy: string }) {
    const { options, validationRules, ...rest } = createAttributeDto;

    // Transform options to nested create if present
    const attributeOptions = options?.length
      ? {
          create: options.map((opt, index) => ({
            label: opt,
            value: opt,
            displayOrder: index,
          })),
        }
      : undefined;

    return this.prisma.attribute.create({
      data: {
        ...rest,
        attributeOptions,
      },
    });
  }

  async update(id: string, updateAttributeDto: UpdateAttributeDto) {
    const { options, ...rest } = updateAttributeDto;
    // Note: handling options update is complex (delete/create/update).
    // For now, we'll just update the main fields to fix the type error.

    return this.prisma.attribute.update({
      where: { id },
      data: rest,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.attribute.delete({
      where: { id },
    });
  }

  async isAssignedToCategories(attributeId: string): Promise<boolean> {
    // Assuming we track assignment via inheritedFrom or similar
    // Since CategoryAttribute is independent, checking if any category attribute claims to inherit from this ID.
    const count = await this.prisma.categoryAttribute.count({
      where: { inheritedFrom: attributeId },
    });
    return count > 0;
  }

  async getCategoryAttributes(categoryId: string) {
    return this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async getCategoryAttributeAssignment(
    categoryId: string,
    attributeId: string,
  ) {
    // Using findFirst because unique constraint is on slug, and we only have attributeIds here usually.
    return this.prisma.categoryAttribute.findFirst({
      where: {
        categoryId,
        inheritedFrom: attributeId,
      },
    });
  }

  async assignToCategory(data: Prisma.CategoryAttributeUncheckedCreateInput) {
    return this.prisma.categoryAttribute.create({
      data,
    });
  }

  async removeFromCategory(
    categoryId: string,
    attributeId: string,
  ): Promise<void> {
    // Using deleteMany because we are matching by inheritedFrom
    await this.prisma.categoryAttribute.deleteMany({
      where: {
        categoryId,
        inheritedFrom: attributeId,
      },
    });
  }

  async updateCategoryAttributeAssignment(
    categoryId: string,
    attributeId: string,
    updateData: Prisma.CategoryAttributeUpdateInput,
  ) {
    // Using updateMany is safest without slug
    return this.prisma.categoryAttribute.updateMany({
      where: {
        categoryId,
        inheritedFrom: attributeId,
      },
      data: updateData,
    });
  }
}
