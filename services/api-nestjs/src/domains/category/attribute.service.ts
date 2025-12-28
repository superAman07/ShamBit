import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { AttributeRepository } from './attribute.repository';
import {
  CreateAttributeDto,
  UpdateAttributeDto,
  CategoryAttributeAssignmentDto,
} from './dto/attribute.dto';

@Injectable()
export class AttributeService {
  constructor(private readonly attributeRepository: AttributeRepository) {}

  async findAll() {
    return this.attributeRepository.findAll();
  }

  async findById(id: string) {
    const attribute = await this.attributeRepository.findById(id);
    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }
    return attribute;
  }

  async create(createAttributeDto: CreateAttributeDto) {
    // Check if key already exists
    const existingAttribute = await this.attributeRepository.findByKey(
      createAttributeDto.key,
    );
    if (existingAttribute) {
      throw new ConflictException('Attribute with this key already exists');
    }

    return this.attributeRepository.create(createAttributeDto);
  }

  async update(id: string, updateAttributeDto: UpdateAttributeDto) {
    const existingAttribute = await this.attributeRepository.findById(id);
    if (!existingAttribute) {
      throw new NotFoundException('Attribute not found');
    }

    return this.attributeRepository.update(id, updateAttributeDto);
  }

  async delete(id: string): Promise<void> {
    const attribute = await this.attributeRepository.findById(id);
    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    // Check if attribute is assigned to any categories
    const isAssigned = await this.attributeRepository.isAssignedToCategories(id);
    if (isAssigned) {
      throw new BadRequestException(
        'Cannot delete attribute that is assigned to categories',
      );
    }

    await this.attributeRepository.delete(id);
  }

  async getCategoryAttributes(categoryId: string) {
    return this.attributeRepository.getCategoryAttributes(categoryId);
  }

  async assignToCategory(assignmentDto: CategoryAttributeAssignmentDto) {
    // Check if attribute exists
    const attribute = await this.attributeRepository.findById(
      assignmentDto.attributeId,
    );
    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    // Check if already assigned
    const existingAssignment = await this.attributeRepository.getCategoryAttributeAssignment(
      assignmentDto.categoryId,
      assignmentDto.attributeId,
    );
    if (existingAssignment) {
      throw new ConflictException('Attribute already assigned to this category');
    }

    return this.attributeRepository.assignToCategory(assignmentDto);
  }

  async removeFromCategory(categoryId: string, attributeId: string): Promise<void> {
    const assignment = await this.attributeRepository.getCategoryAttributeAssignment(
      categoryId,
      attributeId,
    );
    if (!assignment) {
      throw new NotFoundException('Attribute assignment not found');
    }

    await this.attributeRepository.removeFromCategory(categoryId, attributeId);
  }

  async updateCategoryAttributeAssignment(
    categoryId: string,
    attributeId: string,
    updateData: Partial<CategoryAttributeAssignmentDto>,
  ) {
    const assignment = await this.attributeRepository.getCategoryAttributeAssignment(
      categoryId,
      attributeId,
    );
    if (!assignment) {
      throw new NotFoundException('Attribute assignment not found');
    }

    return this.attributeRepository.updateCategoryAttributeAssignment(
      categoryId,
      attributeId,
      updateData,
    );
  }

  async validateAttributeValue(attributeId: string, value: any): Promise<boolean> {
    const attribute = await this.findById(attributeId);
    
    // Basic type validation
    switch (attribute.type) {
      case 'STRING':
        if (typeof value !== 'string') return false;
        break;
      case 'NUMBER':
        if (typeof value !== 'number' && !Number.isFinite(Number(value))) return false;
        break;
      case 'BOOLEAN':
        if (typeof value !== 'boolean') return false;
        break;
      case 'DATE':
        if (!Date.parse(value)) return false;
        break;
      case 'ENUM':
        if (!attribute.options?.includes(value)) return false;
        break;
      case 'MULTI_SELECT':
        if (!Array.isArray(value) || !value.every(v => attribute.options?.includes(v))) return false;
        break;
    }

    // Validation rules
    if (attribute.validationRules) {
      for (const rule of attribute.validationRules) {
        const isValid = await this.validateRule(value, rule);
        if (!isValid) return false;
      }
    }

    return true;
  }

  private async validateRule(value: any, rule: any): Promise<boolean> {
    switch (rule.rule) {
      case 'required':
        return value !== null && value !== undefined && value !== '';
      case 'min':
        return typeof value === 'string' ? value.length >= rule.params.min : value >= rule.params.min;
      case 'max':
        return typeof value === 'string' ? value.length <= rule.params.max : value <= rule.params.max;
      case 'pattern':
        return new RegExp(rule.params.pattern).test(value);
      default:
        return true;
    }
  }
}