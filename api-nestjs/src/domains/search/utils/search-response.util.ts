import { SearchResult, SearchFacets, FacetBucket } from '../types/search.types';

export class SearchResponseUtil {
  static processSearchResponse(response: any, query: any): SearchResult {
    const hits = response.hits?.hits || [];
    const total = response.hits?.total?.value || 0;

    const results = hits.map((hit) => ({
      ...hit._source,
      _score: hit._score,
      _highlights: hit.highlight,
    }));

    const facets = this.processFacets(response.aggregations || {});
    const suggestions = this.extractSuggestions(response, query);

    return {
      results,
      total,
      page: query.page || 1,
      limit: query.limit || 20,
      facets,
      suggestions,
      took: response.took,
    };
  }

  static processFacets(aggregations: any): SearchFacets {
    const processBuckets = (
      buckets: any[],
      nameField?: string,
    ): FacetBucket[] => {
      return buckets.map((bucket: any) => {
        let label = bucket.key;

        // Try to get human-readable label from sub-aggregation
        if (nameField && bucket[nameField]?.buckets?.[0]?.key) {
          label = bucket[nameField].buckets[0].key;
        }

        return {
          key: bucket.key,
          label: label || bucket.key_as_string || bucket.key,
          count: bucket.doc_count,
        };
      });
    };

    const facets: SearchFacets = {
      categories: processBuckets(
        aggregations.categories?.buckets || [],
        'category_name',
      ),
      brands: processBuckets(aggregations.brands?.buckets || [], 'brand_name'),
      priceRanges: processBuckets(aggregations.price_ranges?.buckets || []),
      ratings: processBuckets(aggregations.ratings?.buckets || []),
      attributes: {},
    };

    // Process dynamic attribute facets
    if (aggregations.attributes?.attribute_names?.buckets) {
      aggregations.attributes.attribute_names.buckets.forEach(
        (attrBucket: any) => {
          const attributeName = attrBucket.key;
          const values = processBuckets(
            attrBucket.attribute_values?.buckets || [],
          );

          if (values.length > 0) {
            facets.attributes[attributeName] = values;
          }
        },
      );
    }

    // Process availability facet
    if (aggregations.availability?.buckets) {
      const availabilityBuckets = aggregations.availability.buckets.map(
        (bucket: any) => ({
          key: bucket.key.toString(),
          label: bucket.key ? 'In Stock' : 'Out of Stock',
          count: bucket.doc_count,
        }),
      );

      // Add to facets if needed
      facets.availability = availabilityBuckets;
    }

    return facets;
  }

  static extractSuggestions(response: any, query: any): string[] {
    const suggestions: string[] = [];

    // Extract from suggest response if available
    if (response.suggest) {
      Object.values(response.suggest).forEach((suggestionGroup: any) => {
        suggestionGroup.forEach((suggestion: any) => {
          suggestion.options?.forEach((option: any) => {
            if (option.text && typeof option.text === 'string') {
              suggestions.push(option.text);
            }
          });
        });
      });
    }

    // Extract from completion suggestions
    if (response.aggregations?.suggestions?.buckets) {
      response.aggregations.suggestions.buckets.forEach((bucket: any) => {
        if (bucket.key && typeof bucket.key === 'string') {
          suggestions.push(bucket.key);
        }
      });
    }

    return [...new Set(suggestions)].slice(0, 10);
  }

  static formatPriceRange(key: string): string {
    const priceLabels = {
      '0-500': 'Under ₹500',
      '500-1000': '₹500 - ₹1,000',
      '1000-5000': '₹1,000 - ₹5,000',
      '5000-10000': '₹5,000 - ₹10,000',
      '10000-50000': '₹10,000 - ₹50,000',
      '50000+': 'Above ₹50,000',
    };

    return priceLabels[key] || key;
  }

  static formatRatingRange(key: string): string {
    const ratingLabels = {
      '4+': '4★ & above',
      '3+': '3★ & above',
      '2+': '2★ & above',
      '1+': '1★ & above',
    };

    return ratingLabels[key] || key;
  }

  static enrichFacets(facets: SearchFacets): SearchFacets {
    // Enrich price ranges with formatted labels
    facets.priceRanges = facets.priceRanges.map((bucket) => ({
      ...bucket,
      label: this.formatPriceRange(bucket.key),
    }));

    // Enrich rating ranges with formatted labels
    facets.ratings = facets.ratings.map((bucket) => ({
      ...bucket,
      label: this.formatRatingRange(bucket.key),
    }));

    // Sort facets by count (descending)
    facets.categories.sort((a, b) => b.count - a.count);
    facets.brands.sort((a, b) => b.count - a.count);

    // Sort availability facets if they exist
    if (facets.availability) {
      facets.availability.sort((a, b) => b.count - a.count);
    }

    // Sort attribute values by count
    Object.keys(facets.attributes).forEach((attr) => {
      facets.attributes[attr].sort((a, b) => b.count - a.count);
    });

    return facets;
  }

  static buildSearchSummary(result: SearchResult, query: any): string {
    const { total, results } = result;
    const queryText = query.q || '';

    if (total === 0) {
      return queryText
        ? `No results found for "${queryText}"`
        : 'No products found matching your criteria';
    }

    if (total === 1) {
      return queryText
        ? `1 result found for "${queryText}"`
        : '1 product found';
    }

    const showing = results.length;
    const totalText = total > 10000 ? '10,000+' : total.toLocaleString();

    if (queryText) {
      return `Showing ${showing} of ${totalText} results for "${queryText}"`;
    }

    return `Showing ${showing} of ${totalText} products`;
  }

  static extractDidYouMean(response: any): string | null {
    // Extract spell correction suggestions
    if (response.suggest?.text_suggest?.[0]?.options?.length > 0) {
      return response.suggest.text_suggest[0].options[0].text;
    }

    return null;
  }

  static calculateRelevanceScore(hit: any, query: any): number {
    let score = hit._score || 0;

    // Boost for exact matches
    if (
      query.q &&
      hit._source.name?.toLowerCase().includes(query.q.toLowerCase())
    ) {
      score *= 1.2;
    }

    // Boost for high-rated products
    if (hit._source.popularity?.rating >= 4) {
      score *= 1.1;
    }

    // Boost for in-stock products
    if (hit._source.inventory?.isInStock) {
      score *= 1.05;
    }

    return Math.round(score * 100) / 100;
  }
}
