import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { 
  ProductAttributeValueRepository as IProductAttributeValueRepository,
  ProductValidationResult
} from '../interfaces/product-repository.interface';
import { ProductAttributeValue } from '../entities/product-attribute-value.entity';

@Injectable()
export class ProductAttributeValueRepository implements IProductAttributeValueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(productId: string): Promise<ProductAttributeValue[]> {
    const values = await this.prisma.productAttributeValue.findMany({
      where: { productId },
      include: {
        attribute: true,
      },
      orderBy: [
        { attribute: { name: 'asc' } },
      ],
    });

    return values.map(this.mapToEntity);
  }

  async findByProductAndAttribute(
    productId: string, 
    attributeId: string
  ): Promise<ProductAttributeValue | null> {
    const value = await this.prisma.productAttributeValue.findFirst({
      where: { productId, attributeId },
      include: {
        attribute: true,
      },
    });

    return value ? this.mapToEntity(value) : null;
  }

  async create(data: Partial<ProductAttributeValue>): Promise<ProductAttributeValue> {
    const value = await this.prisma.productAttributeValue.create({
      data: {
        productId: data.productId!,
        attributeId: data.attributeId!,
        value: data.value || {},
        stringValue: data.stringValue,
        numberValue: data.numberValue,
        booleanValue: data.booleanValue,
      },
      include: {
        attribute: true,
      },
    });

    return this.mapToEntity(value);
  }

  async update(id: string, data: Partial<ProductAttributeValue>): Promise<ProductAttributeValue> {
    const value = await this.prisma.productAttributeValue.update({
      where: { id },
      data: {
        stringValue: data.stringValue,
        numberValue: data.numberValue,
        booleanValue: data.booleanValue,
      },
      include: {
        attribute: true,
      },
    });

    return this.mapToEntity(value);
  }

  async upsert(data: Partial<ProductAttributeValue>): Promise<ProductAttributeValue> {
    const existing = await this.findByProductAndAttribute(
      data.productId!,
      data.attributeId!
    );

    if (existing) {
      return this.update(existing.id, data);
    } else {
      return this.create(data);
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.productAttributeValue.delete({
      where: { id },
    });
  }

  async createMany(values: Partial<ProductAttributeValue>[]): Promise<ProductAttributeValue[]> {
    const created = await this.prisma.$transaction(
      values.map(value => 
        this.prisma.productAttributeValue.create({
          data: {
            productId: value.productId!,
            attributeId: value.attributeId!,
            value: value.value || {},
            stringValue: value.stringValue,
            numberValue: value.numberValue,
            booleanValue: value.booleanValue,
          },
          include: {
            attribute: true,
          },
        })
      )
    );

    return created.map(this.mapToEntity);
  }

  async updateMany(updates: { id: string; data: Partial<ProductAttributeValue> }[]): Promise<ProductAttributeValue[]> {
    const updated = await this.prisma.$transaction(
      updates.map(update => 
        this.prisma.productAttributeValue.update({
          where: { id: update.id },
          data: {
            stringValue: update.data.stringValue,
            numberValue: update.data.numberValue,
            booleanValue: update.data.booleanValue,
          },
          include: {
            attribute: true,
          },
        })
      )
    );

    return updated.map(this.mapToEntity);
  }

  async deleteByProduct(productId: string): Promise<void> {
    await this.prisma.productAttributeValue.deleteMany({
      where: { productId },
    });
  }

  async deleteByAttribute(attributeId: string): Promise<void> {
    await this.prisma.productAttributeValue.deleteMany({
      where: { attributeId },
    });
  }

  async inheritFromCategory(productId: string, categoryId: string, createdBy: string): Promise<ProductAttributeValue[]> {
    // This would integrate with the category attribute system
    // For now, return empty array as placeholder
    return [];
  }

  async resolveInheritance(productId: string): Promise<ProductAttributeValue[]> {
    const values = await this.findByProduct(productId);
    
    // Group by attribute, keeping only the most specific value
    const resolved = new Map<string, ProductAttributeValue>();
    
    for (const value of values) {
      const key = value.attributeId;
      const existing = resolved.get(key);
      
      if (!existing) {
        resolved.set(key, value);
      }
    }
    
    return Array.from(resolved.values());
  }

  async overrideInheritedValue(id: string, newValue: any, updatedBy: string): Promise<ProductAttributeValue> {
    // First, get the current value to determine the correct field to update
    const current = await this.prisma.productAttributeValue.findUnique({
      where: { id },
      include: { attribute: true },
    });

    if (!current) {
      throw new Error('Attribute value not found');
    }

    // Determine which field to update based on attribute type
    const updateData: any = {};
    
    switch (current.attribute.dataType) {
      case 'STRING':
      case 'TEXT':
      case 'EMAIL':
      case 'URL':
      case 'PHONE':
      case 'COLOR':
        updateData.stringValue = String(newValue);
        break;
      case 'NUMBER':
      case 'DECIMAL':
        updateData.numberValue = Number(newValue);
        break;
      case 'BOOLEAN':
        updateData.booleanValue = Boolean(newValue);
        break;
      case 'JSON':
      case 'MULTI_SELECT':
        updateData.value = newValue;
        break;
      default:
        updateData.stringValue = String(newValue);
    }

    const updated = await this.prisma.productAttributeValue.update({
      where: { id },
      data: updateData,
      include: {
        attribute: true,
      },
    });

    return this.mapToEntity(updated);
  }

  async findByAttributeValue(attributeId: string, value: any): Promise<ProductAttributeValue[]> {
    // This is a complex query that depends on the attribute type
    // For simplicity, we'll search in string values
    const values = await this.prisma.productAttributeValue.findMany({
      where: {
        attributeId,
        OR: [
          { stringValue: String(value) },
          { numberValue: Number(value) },
          { booleanValue: Boolean(value) },
        ],
      },
      include: {
        attribute: true,
      },
    });

    return values.map(this.mapToEntity);
  }

  async findProductsWithAttribute(attributeId: string, value?: any): Promise<string[]> {
    const where: any = { attributeId };
    
    if (value !== undefined) {
      where.OR = [
        { stringValue: String(value) },
        { numberValue: Number(value) },
        { booleanValue: Boolean(value) },
      ];
    }

    const values = await this.prisma.productAttributeValue.findMany({
      where,
      select: { productId: true },
      distinct: ['productId'],
    });

    return values.map(v => v.productId);
  }

  async findVariantAttributes(productId: string): Promise<ProductAttributeValue[]> {
    const values = await this.prisma.productAttributeValue.findMany({
      where: {
        productId,
        attribute: {
          isVariant: true,
        },
      },
      include: {
        attribute: true,
      },
    });

    return values.map(this.mapToEntity);
  }

  async validateAttributeValues(productId: string): Promise<ProductValidationResult> {
    const values = await this.findByProduct(productId);
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const value of values) {
      if (value.attribute) {
        const validation = value.validate();
        if (!validation.isValid) {
          errors.push(...validation.errors);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async validateRequiredAttributes(productId: string, categoryId: string): Promise<ProductValidationResult> {
    // This would integrate with category attribute requirements
    // For now, return valid
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  async getAttributeUsageCount(attributeId: string): Promise<number> {
    return this.prisma.productAttributeValue.count({
      where: { attributeId },
    });
  }

  async getValueDistribution(attributeId: string): Promise<Record<string, number>> {
    const values = await this.prisma.productAttributeValue.groupBy({
      by: ['stringValue'],
      where: { 
        attributeId,
        stringValue: { not: null },
      },
      _count: {
        stringValue: true,
      },
    });

    return values.reduce((acc, item) => {
      if (item.stringValue) {
        acc[item.stringValue] = item._count.stringValue || 0;
      }
      return acc;
    }, {} as Record<string, number>);
  }

  private mapToEntity(prismaData: any): ProductAttributeValue {
    const value = new ProductAttributeValue();
    
    value.id = prismaData.id;
    value.productId = prismaData.productId;
    value.attributeId = prismaData.attributeId;
    value.stringValue = prismaData.stringValue;
    value.numberValue = prismaData.numberValue;
    value.booleanValue = prismaData.booleanValue;
    value.locale = prismaData.locale || 'en';
    value.inheritedFrom = prismaData.inheritedFrom;
    value.isOverridden = prismaData.isOverridden || false;
    value.createdAt = prismaData.createdAt;
    value.updatedAt = prismaData.updatedAt;

    if (prismaData.attribute) {
      value.attribute = prismaData.attribute;
    }

    return value;
  }
}
