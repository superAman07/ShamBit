import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SearchQuery, SearchFacets, FacetBucket } from './types/search.types';

@Injectable()
export class FilterService {
  private readonly logger = new Logger(FilterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAvailableFilters(
    categoryOrQuery?: string | { category?: string; q?: string },
  ): Promise<SearchFacets> {
    try {
      // Support both a simple category id string and the controller's query object
      const categoryId =
        typeof categoryOrQuery === 'string'
          ? categoryOrQuery
          : categoryOrQuery?.category;

      const query =
        typeof categoryOrQuery === 'object' ? categoryOrQuery.q : undefined;

      // Build base filter conditions
      const baseWhere = {
        isActive: true,
        ...(categoryId && { categoryId }),
      };

      // Get category filters
      const categories = await this.getCategoryFilters(baseWhere);

      // Get brand filters
      const brands = await this.getBrandFilters(baseWhere);

      // Get price ranges
      const priceRanges = await this.getPriceRangeFilters(baseWhere);

      // Get rating filters
      const ratings = await this.getRatingFilters(baseWhere);

      // Get attribute filters
      const attributes = await this.getAttributeFilters(categoryId);

      return {
        categories,
        brands,
        priceRanges,
        ratings,
        attributes,
      };
    } catch (error) {
      this.logger.error('Failed to get available filters', error);
      return {
        categories: [],
        brands: [],
        priceRanges: [],
        ratings: [],
        attributes: {},
      };
    }
  }

  private async getCategoryFilters(baseWhere: any): Promise<FacetBucket[]> {
    const categories = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: baseWhere,
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: 50,
    });

    const categoryIds = categories.map((c) => c.categoryId);
    const categoryDetails = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categoryDetails.map((c) => [c.id, c.name]));

    return categories.map((category) => ({
      key: category.categoryId,
      label: categoryMap.get(category.categoryId) || 'Unknown',
      count: category._count.categoryId,
    }));
  }

  private async getBrandFilters(baseWhere: any): Promise<FacetBucket[]> {
    const brands = await this.prisma.product.groupBy({
      by: ['brandId'],
      where: {
        ...baseWhere,
        brandId: { not: null },
      },
      _count: { brandId: true },
      orderBy: { _count: { brandId: 'desc' } },
      take: 50,
    });

    const brandIds = brands
      .map((b) => b.brandId)
      .filter((v): v is string => v !== null);
    const brandDetails = await this.prisma.brand.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true },
    });

    const brandMap = new Map(brandDetails.map((b) => [b.id, b.name]));

    return brands
      .filter((brand) => brand.brandId)
      .map((brand) => ({
        key: brand.brandId!,
        label: brandMap.get(brand.brandId!) || 'Unknown',
        count: brand._count.brandId,
      }));
  }

  private async getPriceRangeFilters(baseWhere: any): Promise<FacetBucket[]> {
    // Get price statistics
    const priceStats = await this.prisma.variantPricing.aggregate({
      where: {
        variant: {
          product: baseWhere,
        },
        isActive: true,
      },
      _min: { sellingPrice: true },
      _max: { sellingPrice: true },
    });

    const minPrice = Number(priceStats._min.sellingPrice) || 0;
    const maxPrice = Number(priceStats._max.sellingPrice) || 10000;

    // Define price ranges based on data
    const ranges = [
      { key: '0-500', from: 0, to: 500, label: 'Under ₹500' },
      { key: '500-1000', from: 500, to: 1000, label: '₹500 - ₹1,000' },
      { key: '1000-5000', from: 1000, to: 5000, label: '₹1,000 - ₹5,000' },
      { key: '5000-10000', from: 5000, to: 10000, label: '₹5,000 - ₹10,000' },
      { key: '10000+', from: 10000, to: maxPrice + 1, label: 'Above ₹10,000' },
    ];

    // Count products in each range
    const rangeCounts = await Promise.all(
      ranges.map(async (range) => {
        const count = await this.prisma.product.count({
          where: {
            ...baseWhere,
            variants: {
              some: {
                pricing: {
                  sellingPrice: {
                    gte: range.from,
                    ...(range.to && { lt: range.to }),
                  },
                  isActive: true,
                },
              },
            },
          },
        });

        return {
          key: range.key,
          label: range.label,
          count,
        };
      }),
    );

    return rangeCounts.filter((range) => range.count > 0);
  }

  private async getRatingFilters(baseWhere: any): Promise<FacetBucket[]> {
    // TODO: Implement when review system is integrated
    // For now, return static rating filters
    return [
      { key: '4+', label: '4★ & above', count: 0 },
      { key: '3+', label: '3★ & above', count: 0 },
      { key: '2+', label: '2★ & above', count: 0 },
      { key: '1+', label: '1★ & above', count: 0 },
    ];
  }

  private async getAttributeFilters(
    categoryId?: string,
  ): Promise<Record<string, FacetBucket[]>> {
    if (!categoryId) return {};

    try {
      // Get category attributes
      const categoryAttributes = await this.prisma.categoryAttribute.findMany({
        where: {
          categoryId,
          isFilterable: true,
        },
        select: {
          slug: true,
          name: true,
          type: true,
          allowedValues: true,
        },
      });

      const attributeFilters: Record<string, FacetBucket[]> = {};

      for (const attr of categoryAttributes) {
        if (attr.allowedValues && attr.allowedValues.length > 0) {
          // For predefined values, count products for each value
          const valueCounts = await Promise.all(
            attr.allowedValues.map(async (value) => {
              const count = await this.prisma.product.count({
                where: {
                  categoryId,
                  isActive: true,
                  attributeValues: {
                    some: {
                      attribute: { slug: attr.slug },
                      stringValue: value,
                    },
                  },
                },
              });

              return {
                key: value,
                label: value,
                count,
              };
            }),
          );

          attributeFilters[attr.slug] = valueCounts.filter((v) => v.count > 0);
        } else {
          // For dynamic values, get unique values from products
          const uniqueValues = await this.prisma.productAttributeValue.groupBy({
            by: ['stringValue'],
            where: {
              product: {
                categoryId,
                isActive: true,
              },
              attribute: { slug: attr.slug },
              stringValue: { not: null },
            },
            _count: { stringValue: true },
            orderBy: { _count: { stringValue: 'desc' } },
            take: 20,
          });

          attributeFilters[attr.slug] = uniqueValues
            .filter((v) => v.stringValue)
            .map((v) => ({
              key: v.stringValue!,
              label: v.stringValue!,
              count: v._count.stringValue,
            }));
        }
      }

      return attributeFilters;
    } catch (error) {
      this.logger.error('Failed to get attribute filters', error);
      return {};
    }
  }

  async applyFilters(query: SearchQuery, filters: any): Promise<SearchQuery> {
    // This method is used to apply additional filter logic
    // The main filtering is handled in the SearchService
    return { ...query, ...filters };
  }

  async getFilterCounts(categoryId?: string): Promise<Record<string, number>> {
    try {
      const baseWhere = {
        isActive: true,
        ...(categoryId && { categoryId }),
      };

      const [totalProducts, inStockProducts, featuredProducts] =
        await Promise.all([
          this.prisma.product.count({ where: baseWhere }),
          this.prisma.product.count({
            where: {
              ...baseWhere,
              variants: {
                some: {
                  inventory: {
                    quantity: { gt: 0 },
                  },
                },
              },
            },
          }),
          this.prisma.product.count({
            where: { ...baseWhere, isFeatured: true },
          }),
        ]);

      return {
        total: totalProducts,
        inStock: inStockProducts,
        featured: featuredProducts,
      };
    } catch (error) {
      this.logger.error('Failed to get filter counts', error);
      return {
        total: 0,
        inStock: 0,
        featured: 0,
      };
    }
  }
}
