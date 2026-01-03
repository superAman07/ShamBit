import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';

export interface SearchExperiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  trafficAllocation: number; // Percentage of traffic (0-100)
  variants: SearchExperimentVariant[];
  startDate: Date;
  endDate?: Date;
  targetMetrics: string[];
  segmentationRules?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchExperimentVariant {
  id: string;
  name: string;
  trafficSplit: number; // Percentage within experiment (0-100)
  configuration: SearchVariantConfig;
  isControl: boolean;
}

export interface SearchVariantConfig {
  // Ranking adjustments
  boostFactors?: {
    featuredProducts?: number;
    promotedProducts?: number;
    verifiedSellers?: number;
    highRatedProducts?: number;
    inStockProducts?: number;
  };

  // Search behavior
  searchSettings?: {
    fuzziness?: string;
    minimumShouldMatch?: string;
    enableSynonyms?: boolean;
    enableSpellCorrection?: boolean;
  };

  // Facet configuration
  facetSettings?: {
    maxFacets?: number;
    facetOrder?: string[];
    enableDynamicFacets?: boolean;
  };

  // Personalization
  personalizationSettings?: {
    enabled?: boolean;
    weight?: number;
    fallbackToPopular?: boolean;
  };

  // UI/UX changes
  uiSettings?: {
    resultsPerPage?: number;
    enableInfiniteScroll?: boolean;
    showRelevanceScore?: boolean;
    highlightSearchTerms?: boolean;
  };
}

export interface ExperimentAssignment {
  userId?: string;
  sessionId: string;
  experimentId: string;
  variantId: string;
  assignedAt: Date;
}

export interface ExperimentMetrics {
  experimentId: string;
  variantId: string;
  metrics: {
    searches: number;
    clickThroughRate: number;
    conversionRate: number;
    averagePosition: number;
    zeroResultRate: number;
    averageResponseTime: number;
    userSatisfactionScore?: number;
  };
  period: {
    startDate: Date;
    endDate: Date;
  };
}

@Injectable()
export class SearchExperimentService {
  private readonly logger = new Logger(SearchExperimentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getActiveExperiments(): Promise<SearchExperiment[]> {
    const cacheKey = 'search:experiments:active';

    try {
      // Try cache first
      const cached = await this.cacheService.get<SearchExperiment[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Mock data - replace with actual database queries
      const experiments: SearchExperiment[] = [
        {
          id: 'exp_001',
          name: 'Boost Featured Products',
          description: 'Test different boost factors for featured products',
          status: 'active',
          trafficAllocation: 50,
          variants: [
            {
              id: 'var_001_control',
              name: 'Control',
              trafficSplit: 50,
              isControl: true,
              configuration: {
                boostFactors: {
                  featuredProducts: 1.0,
                  promotedProducts: 1.0,
                  verifiedSellers: 1.0,
                },
              },
            },
            {
              id: 'var_001_test',
              name: 'Higher Boost',
              trafficSplit: 50,
              isControl: false,
              configuration: {
                boostFactors: {
                  featuredProducts: 2.0,
                  promotedProducts: 1.5,
                  verifiedSellers: 1.3,
                },
              },
            },
          ],
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-02-01'),
          targetMetrics: ['clickThroughRate', 'conversionRate'],
          createdAt: new Date('2023-12-15'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, experiments, 300);

      return experiments;
    } catch (error) {
      this.logger.error('Failed to get active experiments:', error);
      return [];
    }
  }

  async assignUserToExperiment(
    userId?: string,
    sessionId?: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<ExperimentAssignment[]> {
    try {
      const activeExperiments = await this.getActiveExperiments();
      const assignments: ExperimentAssignment[] = [];

      for (const experiment of activeExperiments) {
        // Check if user should be included in this experiment
        if (
          !this.shouldIncludeInExperiment(
            experiment,
            userId,
            userAgent,
            ipAddress,
          )
        ) {
          continue;
        }

        // Check traffic allocation
        const trafficHash = this.hashString(
          `${userId || sessionId}_${experiment.id}`,
        );
        const trafficPercentile = trafficHash % 100;

        if (trafficPercentile >= experiment.trafficAllocation) {
          continue; // User not in experiment traffic
        }

        // Assign to variant
        const variantHash = this.hashString(
          `${userId || sessionId}_${experiment.id}_variant`,
        );
        const variantPercentile = variantHash % 100;

        let cumulativeWeight = 0;
        let assignedVariant: SearchExperimentVariant | null = null;

        for (const variant of experiment.variants) {
          cumulativeWeight += variant.trafficSplit;
          if (variantPercentile < cumulativeWeight) {
            assignedVariant = variant;
            break;
          }
        }

        if (assignedVariant) {
          const assignment: ExperimentAssignment = {
            userId,
            sessionId: sessionId || `session_${Date.now()}`,
            experimentId: experiment.id,
            variantId: assignedVariant.id,
            assignedAt: new Date(),
          };

          assignments.push(assignment);

          // Cache assignment
          const cacheKey = `search:assignment:${userId || sessionId}:${experiment.id}`;
          await this.cacheService.set(cacheKey, assignment, 3600); // 1 hour
        }
      }

      return assignments;
    } catch (error) {
      this.logger.error('Failed to assign user to experiments:', error);
      return [];
    }
  }

  async getExperimentConfiguration(
    userId?: string,
    sessionId?: string,
  ): Promise<SearchVariantConfig> {
    try {
      const assignments = await this.assignUserToExperiment(userId, sessionId);

      if (assignments.length === 0) {
        return this.getDefaultConfiguration();
      }

      // Merge configurations from all active experiments
      let mergedConfig: SearchVariantConfig = this.getDefaultConfiguration();

      for (const assignment of assignments) {
        const experiment = await this.getExperimentById(
          assignment.experimentId,
        );
        const variant = experiment?.variants.find(
          (v) => v.id === assignment.variantId,
        );

        if (variant) {
          mergedConfig = this.mergeConfigurations(
            mergedConfig,
            variant.configuration,
          );
        }
      }

      return mergedConfig;
    } catch (error) {
      this.logger.error('Failed to get experiment configuration:', error);
      return this.getDefaultConfiguration();
    }
  }

  async trackExperimentEvent(
    eventType: string,
    eventData: any,
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    try {
      // Get user's experiment assignments
      const assignments = await this.getUserAssignments(userId, sessionId);

      for (const assignment of assignments) {
        // Track event for each experiment the user is part of
        await this.recordExperimentMetric(
          assignment.experimentId,
          assignment.variantId,
          eventType,
          eventData,
        );
      }
    } catch (error) {
      this.logger.error('Failed to track experiment event:', error);
    }
  }

  async getExperimentMetrics(
    experimentId: string,
  ): Promise<ExperimentMetrics[]> {
    try {
      // Mock metrics - replace with actual analytics data
      const experiment = await this.getExperimentById(experimentId);
      if (!experiment) {
        return [];
      }

      const metrics: ExperimentMetrics[] = experiment.variants.map(
        (variant) => ({
          experimentId,
          variantId: variant.id,
          metrics: {
            searches: Math.floor(Math.random() * 10000),
            clickThroughRate: Math.random() * 0.3,
            conversionRate: Math.random() * 0.1,
            averagePosition: Math.random() * 10 + 1,
            zeroResultRate: Math.random() * 0.2,
            averageResponseTime: Math.random() * 200 + 50,
          },
          period: {
            startDate: experiment.startDate,
            endDate: experiment.endDate || new Date(),
          },
        }),
      );

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get experiment metrics:', error);
      return [];
    }
  }

  private shouldIncludeInExperiment(
    experiment: SearchExperiment,
    userId?: string,
    userAgent?: string,
    ipAddress?: string,
  ): boolean {
    // Check experiment status
    if (experiment.status !== 'active') {
      return false;
    }

    // Check date range
    const now = new Date();
    if (
      now < experiment.startDate ||
      (experiment.endDate && now > experiment.endDate)
    ) {
      return false;
    }

    // Apply segmentation rules if any
    if (experiment.segmentationRules) {
      // Implement segmentation logic here
      // e.g., user type, location, device type, etc.
    }

    return true;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private getDefaultConfiguration(): SearchVariantConfig {
    return {
      boostFactors: {
        featuredProducts: 1.5,
        promotedProducts: 1.3,
        verifiedSellers: 1.2,
        highRatedProducts: 1.1,
        inStockProducts: 1.0,
      },
      searchSettings: {
        fuzziness: 'AUTO',
        minimumShouldMatch: '75%',
        enableSynonyms: true,
        enableSpellCorrection: true,
      },
      facetSettings: {
        maxFacets: 50,
        enableDynamicFacets: true,
      },
      personalizationSettings: {
        enabled: true,
        weight: 0.2,
        fallbackToPopular: true,
      },
      uiSettings: {
        resultsPerPage: 20,
        enableInfiniteScroll: false,
        showRelevanceScore: false,
        highlightSearchTerms: true,
      },
    };
  }

  private mergeConfigurations(
    base: SearchVariantConfig,
    override: SearchVariantConfig,
  ): SearchVariantConfig {
    return {
      boostFactors: { ...base.boostFactors, ...override.boostFactors },
      searchSettings: { ...base.searchSettings, ...override.searchSettings },
      facetSettings: { ...base.facetSettings, ...override.facetSettings },
      personalizationSettings: {
        ...base.personalizationSettings,
        ...override.personalizationSettings,
      },
      uiSettings: { ...base.uiSettings, ...override.uiSettings },
    };
  }

  private async getExperimentById(
    experimentId: string,
  ): Promise<SearchExperiment | null> {
    const experiments = await this.getActiveExperiments();
    return experiments.find((exp) => exp.id === experimentId) || null;
  }

  private async getUserAssignments(
    userId?: string,
    sessionId?: string,
  ): Promise<ExperimentAssignment[]> {
    // In a real implementation, this would query the database
    // For now, we'll re-assign to get current assignments
    return this.assignUserToExperiment(userId, sessionId);
  }

  private async recordExperimentMetric(
    experimentId: string,
    variantId: string,
    eventType: string,
    eventData: any,
  ): Promise<void> {
    // In a real implementation, this would store metrics in a time-series database
    // or analytics service like ClickHouse, BigQuery, etc.
    this.logger.debug('Recording experiment metric', {
      experimentId,
      variantId,
      eventType,
      eventData,
    });
  }
}
