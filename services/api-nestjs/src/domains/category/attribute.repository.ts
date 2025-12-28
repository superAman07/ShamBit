import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  CreateAttributeDto,
  UpdateAttributeDto,
  CategoryAttributeAssignmentDto,
} from './dto/attribute.dto';

@Injectable()
export class AttributeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.attribute.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.attribute.findUnique({
      where: { id },
    });
  }

  async findByKey(key: string) {
    return this.prisma.attribute.findUnique({
      where: { key },
    });
  }

  async create(createAttributeDto: CreateAttributeDto) {
    return this.prisma.attribute.create({
      data: createAttributeDto,
    });
  }

  async update(id: string, updateAttributeDto: UpdateAttributeDto) {
    return this.prisma.attribute.update({
      where: { id },
      data: updateAttributeDto,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.attribute.delete({
      where: { id },
    });
  }

  async isAssignedToCategories(attributeId: string): Promise<boolean> {
    const count = await this.prisma.categoryAttribute.count({
      where: { attributeId },
    });
    return count > 0;
  }

  async getCategoryAttributes(categoryId: string) {
    return this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      include: {
        attribute: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getCategoryAttributeAssignment(categoryId: string, attributeId: string) {
    return this.prisma.categoryAttribute.findUnique({
      where: {
        categoryId_attributeId: {
          categoryId,
          attributeId,
        },
      },
    });
  }

  async assignToCategory(assignmentDto: CategoryAttributeAssignmentDto) {
    return this.prisma.categoryAttribute.create({
      data: assignmentDto,
      include: {
        attribute: true,
      },
    });
  }

  async removeFromCategory(categoryId: string, attributeId: string): Promise<void> {
    await this.prisma.categoryAttribute.delete({
      where: {
        categoryId_attributeId: {
          categoryId,
          attributeId,
        },
      },
    });
  }

  async updateCategoryAttributeAssignment(
    categoryId: string,
    attributeId: string,
    updateData: Partial<CategoryAttributeAssignmentDto>,
  ) {
    return this.prisma.categoryAttribute.update({
      where: {
        categoryId_attributeId: {
          categoryId,
          attributeId,
        },
      },
      data: updateData,
      include: {
        attribute: true,
      },
    });
  }
}