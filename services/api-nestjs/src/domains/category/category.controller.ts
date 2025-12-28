import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { CategoryService } from './category.service';
import { AttributeService } from './attribute.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
} from './dto/category.dto';
import {
  CreateAttributeDto,
  UpdateAttributeDto,
  CategoryAttributeAssignmentDto,
} from './dto/attribute.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';
import { UserRole, PaginationQuery } from '../../common/types';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(AuthGuard, RolesGuard)
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly attributeService: AttributeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async getCategories(@Query() query: PaginationQuery) {
    return this.categoryService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get category tree' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async getCategoryTree() {
    return this.categoryService.getCategoryTree();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  async getCategory(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new category' })
  @ApiResponse({ status: 201, type: CategoryResponseDto })
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 200 })
  async deleteCategory(@Param('id') id: string) {
    await this.categoryService.delete(id);
    return { message: 'Category deleted successfully' };
  }

  // Attribute management endpoints
  @Get(':id/attributes')
  @ApiOperation({ summary: 'Get category attributes' })
  @ApiResponse({ status: 200 })
  async getCategoryAttributes(@Param('id') id: string) {
    return this.attributeService.getCategoryAttributes(id);
  }

  @Post('attributes')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new attribute' })
  @ApiResponse({ status: 201 })
  async createAttribute(@Body() createAttributeDto: CreateAttributeDto) {
    return this.attributeService.create(createAttributeDto);
  }

  @Put('attributes/:id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update attribute' })
  @ApiResponse({ status: 200 })
  async updateAttribute(
    @Param('id') id: string,
    @Body() updateAttributeDto: UpdateAttributeDto,
  ) {
    return this.attributeService.update(id, updateAttributeDto);
  }

  @Post(':categoryId/attributes/:attributeId')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign attribute to category' })
  @ApiResponse({ status: 201 })
  async assignAttributeToCategory(
    @Param('categoryId') categoryId: string,
    @Param('attributeId') attributeId: string,
    @Body() assignmentDto: Omit<CategoryAttributeAssignmentDto, 'categoryId' | 'attributeId'>,
  ) {
    return this.attributeService.assignToCategory({
      categoryId,
      attributeId,
      ...assignmentDto,
    });
  }

  @Delete(':categoryId/attributes/:attributeId')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove attribute from category' })
  @ApiResponse({ status: 200 })
  async removeAttributeFromCategory(
    @Param('categoryId') categoryId: string,
    @Param('attributeId') attributeId: string,
  ) {
    await this.attributeService.removeFromCategory(categoryId, attributeId);
    return { message: 'Attribute removed from category successfully' };
  }
}