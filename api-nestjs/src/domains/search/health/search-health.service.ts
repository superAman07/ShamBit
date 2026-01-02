import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { CacheService } from '../../../infrastructure/cache/cache.service';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details?: any;
  timestamp: Date;
  responseTime?: number;
}

export interface SearchSystemHealth {
  overall: HealthCheckResult;
  elasticsearch: HealthCheckResult;
  redis: HealthCheckResult;
  indexHealth: HealthCheckResult;
  searchPerformance: HealthCheckResult;
}

@Injectable()
export class SearchHealthService {
  private readonly logger = new Logger(SearchHealthService.name);
  private elasticsearchClient: Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    const elasticsearchUsername = this.configService.get('ELASTICSEARCH_USERNAME');
    const elasticsearchPassword = this.configService.get('ELASTICSEARCH_PASSWORD');

    this.elasticsearchClient = new Client({
      node: this.configService.get('ELASTICSEARCH_URL', 'http://localhost:9200'),
      ...(elasticsearchUsername && elasticsearchPassword && {
        auth: {
          username: elasticsearchUsername,
          password: elasticsearchPassword,
        },
      }),
    });
  }

  async checkOverallHealth(): Promise<SearchSystemHealth> {
    const startTime = Date.now();
    
    try {
      // Run all health checks in parallel
      const [
        elasticsearchHealth,
        redisHealth,
        indexHealth,
        performanceHealth
      ] = await Promise.allSettled([
        this.checkElasticsearchHealth(),
        this.checkRedisHealth(),
        this.checkIndexHealth(),
        this.checkSearchPerformance()
      ]);

      // Process results
      const elasticsearch = this.getResultValue(elasticsearchHealth);
      const redis = this.getResultValue(redisHealth);
      const indexHealthResult = this.getResultValue(indexHealth);
      const searchPerformance = this.getResultValue(performanceHealth);

      // Determine overall health
      const overall = this.calculateOverallHealth([
        elasticsearch,
        redis,
        indexHealthResult,
        searchPerformance
      ]);

      const responseTime = Date.now() - startTime;

      return {
        overall: {
          ...overall,
          responseTime,
          timestamp: new Date()
        },
        elasticsearch,
        redis,
        indexHealth: indexHealthResult,
        searchPerformance
      };

    } catch (error) {
      this.logger.error('Health check failed:', error);
      
      return {
        overall: {
          status: 'unhealthy',
          message: 'Health check system failure',
          details: { error: error.message },
          timestamp: new Date(),
          responseTime: Date.now() - startTime
        },
        elasticsearch: this.createErrorResult('Elasticsearch check failed'),
        redis: this.createErrorResult('Redis check failed'),
        indexHealth: this.createErrorResult('Index health check failed'),
        searchPerformance: this.createErrorResult('Performance check failed')
      };
    }
  }

  async checkElasticsearchHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Check cluster health
      const clusterHealth = await this.elasticsearchClient.cluster.health({
        timeout: '5s'
      });

      const responseTime = Date.now() - startTime;

      // Check cluster status
      if (clusterHealth.status === 'red') {
        return {
          status: 'unhealthy',
          message: 'Elasticsearch cluster is in RED status',
          details: {
            clusterStatus: clusterHealth.status,
            numberOfNodes: clusterHealth.number_of_nodes,
            numberOfDataNodes: clusterHealth.number_of_data_nodes,
            activePrimaryShards: clusterHealth.active_primary_shards,
            activeShards: clusterHealth.active_shards,
            relocatingShards: clusterHealth.relocating_shards,
            initializingShards: clusterHealth.initializing_shards,
            unassignedShards: clusterHealth.unassigned_shards
          },
          timestamp: new Date(),
          responseTime
        };
      }

      if (clusterHealth.status === 'yellow') {
        return {
          status: 'degraded',
          message: 'Elasticsearch cluster is in YELLOW status',
          details: {
            clusterStatus: clusterHealth.status,
            numberOfNodes: clusterHealth.number_of_nodes,
            unassignedShards: clusterHealth.unassigned_shards
          },
          timestamp: new Date(),
          responseTime
        };
      }

      return {
        status: 'healthy',
        message: 'Elasticsearch cluster is healthy',
        details: {
          clusterStatus: clusterHealth.status,
          numberOfNodes: clusterHealth.number_of_nodes,
          numberOfDataNodes: clusterHealth.number_of_data_nodes,
          activeShards: clusterHealth.active_shards
        },
        timestamp: new Date(),
        responseTime
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Failed to connect to Elasticsearch',
        details: { error: error.message },
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  async checkRedisHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test Redis connectivity with a simple operation
      const testKey = 'health_check_test';
      const testValue = Date.now().toString();
      
      await this.cacheService.set(testKey, testValue, 10); // 10 seconds TTL
      const retrievedValue = await this.cacheService.get(testKey);
      await this.cacheService.del(testKey);

      const responseTime = Date.now() - startTime;

      if (retrievedValue !== testValue) {
        return {
          status: 'unhealthy',
          message: 'Redis data integrity check failed',
          details: { expected: testValue, received: retrievedValue },
          timestamp: new Date(),
          responseTime
        };
      }

      return {
        status: 'healthy',
        message: 'Redis is healthy',
        details: { connectionTest: 'passed' },
        timestamp: new Date(),
        responseTime
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Failed to connect to Redis',
        details: { error: error.message },
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  async checkIndexHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const indexName = `${this.configService.get('ELASTICSEARCH_INDEX_PREFIX', 'marketplace')}_products`;
      
      // Check if index exists
      const indexExists = await this.elasticsearchClient.indices.exists({
        index: indexName
      });

      if (!indexExists) {
        return {
          status: 'unhealthy',
          message: 'Search index does not exist',
          details: { indexName },
          timestamp: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      // Get index stats
      const indexStats = await this.elasticsearchClient.indices.stats({
        index: indexName
      });

      const stats = indexStats.indices?.[indexName];
      const docCount = stats?.total?.docs?.count || 0;
      const indexSize = stats?.total?.store?.size_in_bytes || 0;
      const searchTime = (stats?.total?.search as any)?.time_in_millis || 0;
      const searchCount = stats?.total?.search?.query_total || 0;

      const responseTime = Date.now() - startTime;

      // Check for potential issues
      const issues: string[] = [];
      
      if (docCount === 0) {
        issues.push('Index is empty');
      }
      
      if (searchCount > 0 && searchTime / searchCount > 100) {
        issues.push('Average search time is high');
      }

      const status = issues.length > 0 ? 'degraded' : 'healthy';
      const message = issues.length > 0 
        ? `Index has issues: ${issues.join(', ')}`
        : 'Search index is healthy';

      return {
        status,
        message,
        details: {
          indexName,
          documentCount: docCount,
          indexSizeBytes: indexSize,
          averageSearchTime: searchCount > 0 ? Math.round(searchTime / searchCount) : 0,
          totalSearches: searchCount,
          issues
        },
        timestamp: new Date(),
        responseTime
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Failed to check index health',
        details: { error: error.message },
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  async checkSearchPerformance(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const indexName = `${this.configService.get('ELASTICSEARCH_INDEX_PREFIX', 'marketplace')}_products`;
      
      // Perform a simple search to test performance
      const searchResponse = await this.elasticsearchClient.search({
        index: indexName,
        body: {
          query: { match_all: {} },
          size: 1
        },
        timeout: '5s'
      });

      const responseTime = Date.now() - startTime;
      const searchTook = searchResponse.took;

      // Performance thresholds
      const slowQueryThreshold = this.configService.get('SEARCH_SLOW_QUERY_THRESHOLD', 1000);
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'Search performance is good';

      if (searchTook > slowQueryThreshold) {
        status = 'degraded';
        message = 'Search queries are slow';
      }

      if (responseTime > slowQueryThreshold * 2) {
        status = 'unhealthy';
        message = 'Search system is very slow';
      }

      return {
        status,
        message,
        details: {
          searchResponseTime: searchTook,
          totalResponseTime: responseTime,
          threshold: slowQueryThreshold,
          totalHits: searchResponse.hits.total
        },
        timestamp: new Date(),
        responseTime
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Search performance check failed',
        details: { error: error.message },
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  private getResultValue(result: PromiseSettledResult<HealthCheckResult>): HealthCheckResult {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        message: 'Health check failed',
        details: { error: result.reason?.message || 'Unknown error' },
        timestamp: new Date()
      };
    }
  }

  private calculateOverallHealth(results: HealthCheckResult[]): HealthCheckResult {
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    const degradedCount = results.filter(r => r.status === 'degraded').length;

    if (unhealthyCount > 0) {
      return {
        status: 'unhealthy',
        message: `${unhealthyCount} critical issues detected`,
        details: {
          unhealthy: unhealthyCount,
          degraded: degradedCount,
          healthy: results.length - unhealthyCount - degradedCount
        },
        timestamp: new Date()
      };
    }

    if (degradedCount > 0) {
      return {
        status: 'degraded',
        message: `${degradedCount} performance issues detected`,
        details: {
          degraded: degradedCount,
          healthy: results.length - degradedCount
        },
        timestamp: new Date()
      };
    }

    return {
      status: 'healthy',
      message: 'All search systems are healthy',
      details: {
        healthy: results.length
      },
      timestamp: new Date()
    };
  }

  private createErrorResult(message: string): HealthCheckResult {
    return {
      status: 'unhealthy',
      message,
      timestamp: new Date()
    };
  }
}