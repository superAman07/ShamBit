# Search & Discovery Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing and deploying the enterprise search and discovery system.

## Prerequisites

### Infrastructure Requirements

1. **Elasticsearch Cluster**
   - Version: 8.x or higher
   - Minimum 3 nodes for production
   - 16GB RAM per node recommended
   - SSD storage for better performance

2. **Redis Cache**
   - Version: 6.x or higher
   - Cluster mode for high availability
   - 8GB RAM recommended

3. **Database**
   - PostgreSQL with existing marketplace schema
   - Read replicas for search indexing

### Environment Variables

Add these to your `.env` file:

```bash
# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_password
ELASTICSEARCH_INDEX_PREFIX=marketplace_prod

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Search Configuration
SEARCH_CACHE_TTL=300
SEARCH_ANALYTICS_ENABLED=true
SEARCH_PERSONALIZATION_ENABLED=true

# Performance Tuning
SEARCH_BULK_SIZE=1000
SEARCH_MAX_RESULTS=10000
SEARCH_REQUEST_TIMEOUT=30000
```

## Installation Steps

### 1. Install Dependencies

```bash
npm install @elastic/elasticsearch ioredis
npm install @nestjs/schedule @nestjs/event-emitter
```

### 2. Database Schema Updates

Add search-related tables to your Prisma schema:

```prisma
model SearchAnalytics {
  id           String   @id @default(cuid())
  query        String
  userId       String?
  sessionId    String
  results      Int
  responseTime Int
  filters      Json     @default("{}")
  timestamp    DateTime @default(now())
  
  @@map("search_analytics")
}

model PopularityMetrics {
  id           String   @id @default(cuid())
  entityType   String
  entityId     String
  viewCount    Int      @default(0)
  orderCount   Int      @default(0)
  rating       Float    @default(0)
  reviewCount  Int      @default(0)
  score        Float    @default(0)
  updatedAt    DateTime @updatedAt
  
  @@unique([entityType, entityId])
  @@map("popularity_metrics")
}
```

### 3. Elasticsearch Setup

#### Create Index Template

```bash
curl -X PUT "localhost:9200/_index_template/marketplace_products" \
-H "Content-Type: application/json" \
-d @elasticsearch-template.json
```

#### Configure Synonyms

Create `config/synonyms.txt`:

```
mobile,phone,smartphone
laptop,notebook,computer
tv,television
fridge,refrigerator
ac,air conditioner,cooling
```

### 4. Module Integration

Update your `app.module.ts`:

```typescript
import { SearchModule } from './domains/search/search.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // ... other modules
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    SearchModule,
  ],
})
export class AppModule {}
```

### 5. Event Integration

Add event emitters to your existing services:

```typescript
// In ProductService
async createProduct(data: CreateProductDto) {
  const product = await this.prisma.product.create({ data });
  
  // Emit event for search indexing
  this.eventEmitter.emit('product.created', { productId: product.id });
  
  return product;
}

async updateProduct(id: string, data: UpdateProductDto) {
  const product = await this.prisma.product.update({
    where: { id },
    data,
  });
  
  // Emit event for search reindexing
  this.eventEmitter.emit('product.updated', { productId: id });
  
  return product;
}
```

## Deployment Steps

### 1. Infrastructure Deployment

#### Elasticsearch Cluster (Docker Compose)

```yaml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - cluster.name=marketplace-search
      - node.name=es-node-1
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data
    ulimits:
      memlock:
        soft: -1
        hard: -1

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  es_data:
  redis_data:
```

#### Production Elasticsearch (Kubernetes)

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: marketplace-search
spec:
  version: 8.11.0
  nodeSets:
  - name: default
    count: 3
    config:
      node.store.allow_mmap: false
    podTemplate:
      spec:
        containers:
        - name: elasticsearch
          resources:
            requests:
              memory: 4Gi
              cpu: 2
            limits:
              memory: 8Gi
              cpu: 4
```

### 2. Application Deployment

#### Build and Deploy

```bash
# Build the application
npm run build

# Run database migrations
npx prisma migrate deploy

# Start the application
npm run start:prod
```

#### Health Checks

Add health check endpoints:

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private readonly searchService: SearchService,
    private readonly cacheService: CacheService,
  ) {}

  @Get('search')
  async checkSearch() {
    try {
      await this.searchService.search({ q: 'test', limit: 1 });
      return { status: 'ok', service: 'search' };
    } catch (error) {
      throw new ServiceUnavailableException('Search service unavailable');
    }
  }
}
```

### 3. Initial Data Load

#### Full Reindex

```bash
# Trigger initial reindex via API
curl -X POST "http://localhost:3000/api/search/reindex" \
-H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Or run via CLI
npm run search:reindex
```

#### Batch Processing Script

```typescript
// scripts/initial-index.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SearchIndexService } from '../src/domains/search/search-index.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const searchIndexService = app.get(SearchIndexService);
  
  console.log('Starting initial indexing...');
  const result = await searchIndexService.reindexAll();
  console.log(`Indexed ${result.totalIndexed} products`);
  
  await app.close();
}

bootstrap();
```

## Configuration

### 1. Performance Tuning

#### Elasticsearch Settings

```json
{
  "index": {
    "number_of_shards": 5,
    "number_of_replicas": 1,
    "refresh_interval": "1s",
    "max_result_window": 50000,
    "mapping": {
      "total_fields": {
        "limit": 2000
      }
    }
  }
}
```

#### Application Settings

```typescript
// config/search.config.ts
export const searchConfig = {
  elasticsearch: {
    maxRetries: 3,
    requestTimeout: 30000,
    pingTimeout: 3000,
    sniffOnStart: true,
    sniffInterval: 300000,
  },
  cache: {
    ttl: 300,
    maxKeys: 10000,
  },
  performance: {
    bulkSize: 1000,
    concurrency: 5,
    batchDelay: 100,
  },
};
```

### 2. Monitoring Setup

#### Metrics Collection

```typescript
// monitoring/search-metrics.service.ts
@Injectable()
export class SearchMetricsService {
  private readonly metrics = new Map();

  recordSearchLatency(duration: number) {
    // Record to Prometheus/DataDog
  }

  recordSearchVolume() {
    // Record search request count
  }

  recordErrorRate(error: Error) {
    // Record error metrics
  }
}
```

#### Alerting Rules

```yaml
# prometheus-alerts.yml
groups:
- name: search-alerts
  rules:
  - alert: SearchHighLatency
    expr: search_request_duration_p95 > 1000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Search latency is high"

  - alert: SearchErrorRate
    expr: search_error_rate > 0.05
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Search error rate is high"
```

## Testing

### 1. Unit Tests

```typescript
// search.service.spec.ts
describe('SearchService', () => {
  let service: SearchService;
  let mockElasticsearch: jest.Mocked<Client>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: 'ELASTICSEARCH_CLIENT',
          useValue: mockElasticsearch,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should search products', async () => {
    mockElasticsearch.search.mockResolvedValue(mockSearchResponse);
    
    const result = await service.search({ q: 'test' });
    
    expect(result.results).toHaveLength(10);
    expect(result.total).toBe(100);
  });
});
```

### 2. Integration Tests

```typescript
// search.integration.spec.ts
describe('Search Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/search (GET)', () => {
    return request(app.getHttpServer())
      .get('/search?q=test')
      .expect(200)
      .expect((res) => {
        expect(res.body.results).toBeDefined();
        expect(res.body.total).toBeGreaterThanOrEqual(0);
      });
  });
});
```

### 3. Load Testing

```javascript
// k6-load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const response = http.get('http://localhost:3000/api/search?q=test');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## Maintenance

### 1. Index Management

#### Reindexing Strategy

```typescript
// Scheduled reindexing
@Cron('0 2 * * *') // Daily at 2 AM
async scheduledReindex() {
  const startTime = Date.now();
  
  try {
    await this.searchIndexService.reindexAll();
    this.logger.log(`Scheduled reindex completed in ${Date.now() - startTime}ms`);
  } catch (error) {
    this.logger.error('Scheduled reindex failed', error);
  }
}
```

#### Index Cleanup

```typescript
// Remove old indices
async cleanupOldIndices() {
  const indices = await this.elasticsearchClient.cat.indices({
    index: `${this.indexPrefix}_*`,
    format: 'json',
  });

  const oldIndices = indices.body
    .filter(index => this.isOldIndex(index.index))
    .map(index => index.index);

  if (oldIndices.length > 0) {
    await this.elasticsearchClient.indices.delete({
      index: oldIndices,
    });
  }
}
```

### 2. Performance Monitoring

#### Query Analysis

```typescript
// Slow query logging
async logSlowQueries(query: any, duration: number) {
  if (duration > this.slowQueryThreshold) {
    this.logger.warn('Slow query detected', {
      query,
      duration,
      timestamp: new Date(),
    });
  }
}
```

#### Index Statistics

```typescript
// Monitor index health
async getIndexStats() {
  const stats = await this.elasticsearchClient.indices.stats({
    index: this.getIndexName(),
  });

  return {
    documentCount: stats.body._all.total.docs.count,
    indexSize: stats.body._all.total.store.size_in_bytes,
    searchTime: stats.body._all.total.search.time_in_millis,
    indexingTime: stats.body._all.total.indexing.index_time_in_millis,
  };
}
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Reduce field data cache size
   - Optimize mapping to use `keyword` instead of `text` where appropriate
   - Implement proper pagination

2. **Slow Search Performance**
   - Add more shards for better parallelization
   - Optimize queries to use filters instead of queries where possible
   - Implement proper caching

3. **Index Corruption**
   - Monitor cluster health regularly
   - Implement automated backups
   - Have rollback procedures in place

4. **Out of Sync Data**
   - Monitor event processing
   - Implement retry mechanisms
   - Regular data consistency checks

### Debugging Tools

```typescript
// Debug search queries
async debugSearch(query: SearchQuery) {
  const esQuery = this.buildElasticsearchQuery(query);
  
  // Log the actual Elasticsearch query
  this.logger.debug('Elasticsearch query', { esQuery });
  
  // Explain the query
  const explanation = await this.elasticsearchClient.indices.validateQuery({
    index: this.getIndexName(),
    body: { query: esQuery.query },
    explain: true,
  });
  
  return explanation;
}
```

## Security

### 1. Access Control

```typescript
// Rate limiting
@UseGuards(ThrottlerGuard)
@Throttle(100, 60) // 100 requests per minute
@Controller('search')
export class SearchController {
  // ... controller methods
}
```

### 2. Input Validation

```typescript
// Query sanitization
sanitizeQuery(query: string): string {
  return query
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/[{}]/g, '') // Remove JSON injection
    .trim()
    .substring(0, 200); // Limit length
}
```

### 3. Data Privacy

```typescript
// Anonymize search analytics
async trackSearch(analytics: SearchAnalytics) {
  const anonymized = {
    ...analytics,
    userId: analytics.userId ? this.hashUserId(analytics.userId) : null,
    query: this.sanitizeQuery(analytics.query),
  };
  
  await this.storeAnalytics(anonymized);
}
```

This implementation guide provides a comprehensive roadmap for deploying the enterprise search system. Follow these steps carefully and adapt them to your specific infrastructure and requirements.