import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CategoryService } from '../../category/category.service';
import { BrandService } from '../../brand/brand.service';
import { BrandAccessService } from '../../brand/services/brand-access.service';
import { AttributeService } from '../../attribute/attribute.service';
import { LoggerService } from '../../../infrastructure/observability/logger.service';

@Injectable()
export class ProductIntegrationService {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly brandService: BrandService,
    private readonly brandAccessService: BrandAccessService,
    private readonly attributeService: AttributeService,
    private readonly logger: LoggerService,
  ) {}

  // ============================================================================
  // CATEGORY INTEGRATION
  // ============================================================================

  async validateCategoryExists(categoryId: string): Promise<void> {
    try {
      const category = await this.categoryService.findById(categoryId);
      
      if (!category.isActive) {
        throw new BadRequestException('Selected category is not active');
      }

      if (category.isLeaf === false) {
        throw new BadRequestException('Products can only be assigned to leaf categories');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException('Selected category does not exist');
      }
      throw error;
    }
  }

  async getCategoryAttributes(categoryId: string): Promise<any[]> {
    try {
      return await this.categoryService.getEffectiveAttributes(categoryId);
    } catch (error) {
      this.logger.error('Failed to get category attributes', { categoryId, error });
      return [];
    }
  }

  async validateCategoryAllowsProducts(categoryId: string): Promise<void> {
    const category = await this.categoryService.findById(categoryId);
    
    // Only leaf categories can have products
    if (!category.isLeaf) {
      throw new BadRequestException('Products can only be assigned to leaf categories');
    }

    // Check if category allows products (business rule)
    if (category.metadata?.allowsProducts === false) {
      throw new BadRequestException('This category does not allow products');
    }
  }

  // ============================================================================
  // BRAND INTEGRATION
  // ============================================================================

  async validateBrandExists(brandId: string): Promise<void> {
    try {
      const brand = await this.brandService.findById(brandId);
      
      if (!brand.isActive) {
        throw new BadRequestException('Selected brand is not active');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException('Selected brand does not exist');
      }
      throw error;
    }
  }

  async validateSellerCanUseBrand(sellerId: string, brandId: string): Promise<void> {
    try {
      const canUse = await this.brandAccessService.canSellerUseBrand(sellerId, brandId);
      
      if (!canUse) {
        throw new BadRequestException('You do not have permission to use this brand');
      }
    } catch (error) {
      this.logger.error('Brand access validation failed', { sellerId, brandId, error });
      throw new BadRequestException('Brand access validation failed');
    }
  }

  async getBrandConstraints(brandId: string): Promise<any> {
    try {
      const brand = await this.brandService.findById(brandId);
      return {
        allowedCategories: brand.allowedCategories || [],
        restrictedCategories: brand.restrictedCategories || [],
        requiresApproval: brand.requiresApproval || false,
        qualityStandards: brand.qualityStandards || {},
      };
    } catch (error) {
      this.logger.error('Failed to get brand constraints', { brandId, error });
      return {};
    }
  }

  // ============================================================================
  // CATEGORY-BRAND VALIDATION
  // ============================================================================

  async validateCategoryBrandCombination(categoryId: string, brandId: string): Promise<void> {
    this.logger.log('Validating category-brand combination', { categoryId, brandId });

    // Validate both exist and are active
    await Promise.all([
      this.validateCategoryExists(categoryId),
      this.validateBrandExists(brandId),
    ]);

    // Get brand constraints
    const brandConstraints = await this.getBrandConstraints(brandId);

    // Check if category is allowed for this brand
    if (brandConstraints.allowedCategories?.length > 0) {
      const categoryPath = await this.getCategoryPath(categoryId);
      const isAllowed = brandConstraints.allowedCategories.some((allowedCat: string) =>
        categoryPath.includes(allowedCat)
      );

      if (!isAllowed) {
        throw new BadRequestException('This brand is not allowed in the selected category');
      }
    }

    // Check if category is restricted for this brand
    if (brandConstraints.restrictedCategories?.length > 0) {
      const categoryPath = await this.getCategoryPath(categoryId);
      const isRestricted = brandConstraints.restrictedCategories.some((restrictedCat: string) =>
        categoryPath.includes(restrictedCat)
      );

      if (isRestricted) {
        throw new BadRequestException('This brand is restricted in the selected category');
      }
    }

    // Additional business rules can be added here
    await this.validateBusinessRules(categoryId, brandId);
  }

  private async getCategoryPath(categoryId: string): Promise<string[]> {
    try {
      const ancestors = await this.categoryService.getAncestors(categoryId, true);
      return ancestors.map(cat => cat.id);
    } catch (error) {
      this.logger.error('Failed to get category path', { categoryId, error });
      return [categoryId];
    }
  }

  private async validateBusinessRules(categoryId: string, brandId: string): Promise<void> {
    // Example business rules - customize based on your requirements
    
    // Rule 1: Luxury brands only in premium categories
    const brand = await this.brandService.findById(brandId);
    const category = await this.categoryService.findById(categoryId);

    if (brand.metadata?.tier === 'luxury' && category.metadata?.tier !== 'premium') {
      throw new BadRequestException('Luxury brands can only be used in premium categories');
    }

    // Rule 2: Age-restricted products
    if (brand.metadata?.ageRestricted && !category.metadata?.allowsAgeRestricted) {
      throw new BadRequestException('Age-restricted brands cannot be used in this category');
    }

    // Rule 3: Geographic restrictions
    if (brand.metadata?.geographicRestrictions && category.metadata?.region) {
      const allowedRegions = brand.metadata.geographicRestrictions;
      if (!allowedRegions.includes(category.metadata.region)) {
        throw new BadRequestException('This brand is not available in the category\'s region');
      }
    }
  }

  // ============================================================================
  // ATTRIBUTE INTEGRATION
  // ============================================================================

  async getRequiredAttributesForCategory(categoryId: string): Promise<any[]> {
    try {
      const attributes = await this.getCategoryAttributes(categoryId);
      return attributes.filter(attr => attr.isRequired);
    } catch (error) {
      this.logger.error('Failed to get required attributes', { categoryId, error });
      return [];
    }
  }

  async getVariantAttributesForCategory(categoryId: string): Promise<any[]> {
    try {
      const attributes = await this.getCategoryAttributes(categoryId);
      return attributes.filter(attr => attr.isVariant);
    } catch (error) {
      this.logger.error('Failed to get variant attributes', { categoryId, error });
      return [];
    }
  }

  async validateAttributeValue(
    attributeId: string,
    value: any,
    categoryId?: string
  ): Promise<void> {
    try {
      const attribute = await this.attributeService.findById(attributeId);
      
      // Validate the value against attribute rules
      const validation = attribute.validateValue(value);
      if (!validation.isValid) {
        throw new BadRequestException(`Invalid value for ${attribute.name}: ${validation.errors.join(', ')}`);
      }

      // Additional category-specific validation
      if (categoryId) {
        await this.validateAttributeInCategory(attributeId, categoryId);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException('Attribute does not exist');
      }
      throw error;
    }
  }

  private async validateAttributeInCategory(attributeId: string, categoryId: string): Promise<void> {
    const categoryAttributes = await this.getCategoryAttributes(categoryId);
    const isAllowed = categoryAttributes.some(attr => attr.id === attributeId);

    if (!isAllowed) {
      throw new BadRequestException('Attribute is not allowed in this category');
    }
  }

  // ============================================================================
  // PRODUCT VALIDATION HELPERS
  // ============================================================================

  async validateProductData(productData: {
    categoryId: string;
    brandId: string;
    sellerId: string;
    attributeValues?: Array<{ attributeId: string; value: any }>;
  }): Promise<void> {
    this.logger.log('Validating complete product data', { 
      categoryId: productData.categoryId, 
      brandId: productData.brandId 
    });

    // Validate category-brand combination
    await this.validateCategoryBrandCombination(productData.categoryId, productData.brandId);

    // Validate seller can use brand
    await this.validateSellerCanUseBrand(productData.sellerId, productData.brandId);

    // Validate category allows products
    await this.validateCategoryAllowsProducts(productData.categoryId);

    // Validate attribute values if provided
    if (productData.attributeValues) {
      for (const attrValue of productData.attributeValues) {
        await this.validateAttributeValue(
          attrValue.attributeId,
          attrValue.value,
          productData.categoryId
        );
      }
    }

    // Validate required attributes are provided
    await this.validateRequiredAttributes(productData.categoryId, productData.attributeValues || []);
  }

  private async validateRequiredAttributes(
    categoryId: string,
    providedAttributes: Array<{ attributeId: string; value: any }>
  ): Promise<void> {
    const requiredAttributes = await this.getRequiredAttributesForCategory(categoryId);
    const providedAttributeIds = providedAttributes.map(attr => attr.attributeId);

    const missingRequired = requiredAttributes.filter(
      reqAttr => !providedAttributeIds.includes(reqAttr.id)
    );

    if (missingRequired.length > 0) {
      const missingNames = missingRequired.map(attr => attr.name).join(', ');
      throw new BadRequestException(`Missing required attributes: ${missingNames}`);
    }
  }

  // ============================================================================
  // INHERITANCE HELPERS
  // ============================================================================

  async getInheritedAttributeValues(categoryId: string): Promise<Array<{
    attributeId: string;
    value: any;
    inheritedFrom: string;
  }>> {
    try {
      // Get category hierarchy
      const ancestors = await this.categoryService.getAncestors(categoryId, true);
      const inheritedValues: Array<{ attributeId: string; value: any; inheritedFrom: string }> = [];

      // Traverse from root to leaf, collecting attribute values
      for (const ancestor of ancestors.reverse()) {
        const categoryAttributes = await this.getCategoryAttributes(ancestor.id);
        
        for (const attr of categoryAttributes) {
          // Only inherit if not already set by a closer ancestor
          const alreadySet = inheritedValues.some(iv => iv.attributeId === attr.id);
          
          if (!alreadySet && attr.defaultValue !== undefined) {
            inheritedValues.push({
              attributeId: attr.id,
              value: attr.defaultValue,
              inheritedFrom: ancestor.id,
            });
          }
        }
      }

      return inheritedValues;
    } catch (error) {
      this.logger.error('Failed to get inherited attribute values', { categoryId, error });
      return [];
    }
  }

  // ============================================================================
  // SEARCH INTEGRATION
  // ============================================================================

  async getSearchableAttributes(categoryId: string): Promise<any[]> {
    try {
      const attributes = await this.getCategoryAttributes(categoryId);
      return attributes.filter(attr => attr.isSearchable);
    } catch (error) {
      this.logger.error('Failed to get searchable attributes', { categoryId, error });
      return [];
    }
  }

  async getFilterableAttributes(categoryId: string): Promise<any[]> {
    try {
      const attributes = await this.getCategoryAttributes(categoryId);
      return attributes.filter(attr => attr.isFilterable);
    } catch (error) {
      this.logger.error('Failed to get filterable attributes', { categoryId, error });
      return [];
    }
  }

  // ============================================================================
  // QUALITY ASSURANCE
  // ============================================================================

  async validateProductQuality(productData: any): Promise<{
    isValid: boolean;
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check basic completeness
    if (!productData.description || productData.description.length < 100) {
      issues.push('Product description is too short');
      recommendations.push('Add a detailed product description (at least 100 characters)');
      score -= 10;
    }

    if (!productData.images || productData.images.length < 2) {
      issues.push('Insufficient product images');
      recommendations.push('Add at least 2 high-quality product images');
      score -= 15;
    }

    if (!productData.seoTitle || !productData.seoDescription) {
      issues.push('Missing SEO optimization');
      recommendations.push('Add SEO title and description for better search visibility');
      score -= 5;
    }

    // Check brand-specific quality standards
    try {
      const brandConstraints = await this.getBrandConstraints(productData.brandId);
      if (brandConstraints.qualityStandards) {
        const brandScore = await this.validateBrandQualityStandards(productData, brandConstraints.qualityStandards);
        score = Math.min(score, brandScore);
      }
    } catch (error) {
      this.logger.error('Failed to validate brand quality standards', { error });
    }

    return {
      isValid: issues.length === 0,
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  private async validateBrandQualityStandards(productData: any, standards: any): Promise<number> {
    let score = 100;

    if (standards.minImages && productData.images.length < standards.minImages) {
      score -= 20;
    }

    if (standards.minDescriptionLength && productData.description.length < standards.minDescriptionLength) {
      score -= 15;
    }

    if (standards.requiredAttributes) {
      const providedAttrs = productData.attributeValues?.map((av: any) => av.attributeId) || [];
      const missingRequired = standards.requiredAttributes.filter((req: string) => !providedAttrs.includes(req));
      score -= missingRequired.length * 10;
    }

    return Math.max(0, score);
  }
}