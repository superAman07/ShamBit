# 🔍 Enterprise Search & Discovery System

A comprehensive, production-ready search and discovery system for the marketplace platform, built with NestJS, Elasticsearch, and Redis.

## 🌟 Features

### Core Search Capabilities
- **Full-text Search** - Multi-field search with relevance scoring
- **Faceted Search** - Dynamic filtering by category, brand, price, ratings
- **Autocomplete** - Smart suggestions with product, category, and brand hints
- **Fuzzy Matching** - Handles typos and variations
- **Synonym Support** - Expands search with related terms
- **Multi-language** - Localization support for multiple languages

### Advanced Features
- **Personalization** - User behavior-based recommendations
- **Trending Products** - Real-time popularity tracking
- **A/B Testing** - Experiment framework for search optimization
- **Analytics** - Comprehensive search behavior tracking
- **Caching** - Multi-layer caching for optimal performance
- **Real-time Updates** - Event-driven index synchronization

### Enterprise Grade
- **Scalability** - Handles millions of products
- **High Availability** - Clustered Elasticsearch and Redis
- **Performance** - Sub-100ms response times
- **Monitoring** - Health checks and performance metrics
- **Security** - Rate limiting and input validation

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Search API    │    │  Elasticsearch  │
│                 │────│                 │────│    Cluster      │
│   Rate Limiting │    │   Controllers   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Event Bus     │    │  Search Index   │    │   Redis Cache   │
│                 │────│   Management    │────│    Cluster      │
│   (EventBridge) │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (existing marketplace database)

### 1. Clone and Install

```bash
git clone <repository>
cd api-nestjs
npm install
```

### 2. Environment Setup

```bash
# Copy search environment template
cp .env.search.example .env.search

# Edit configuration
nano .env.search
```

### 3. Deploy Infrastructure

```bash
# Start Elasticsearch and Redis clusters
npm run infra:up

# Wait for services to be ready (2-3 minutes)
npm run search:health
```

### 4. Setup Search System

```bash
# Initialize indices and load data
npm run search:setup

# Check setup
npm run search:health
```

### 5. Start Application

```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## 📖 API Documentation

### Search Products

```bash
GET /api/search?q=smartphone&category=electronics&minPrice=1000&maxPrice=50000
```

### Autocomplete

```bash
GET /api/search/autocomplete?q=iph
```

### Get Filters

```bash
GET /api/search/filters?category=electronics
```

### Trending Products

```bash
GET /api/search/trending?category=electronics&limit=20
```

For complete API documentation, visit: `/api/docs#/Search%20%26%20Discovery`

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env.search`:

```bash
# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX_PREFIX=marketplace_prod

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Search Behavior
SEARCH_DEFAULT_SIZE=20
SEARCH_CACHE_TTL=300

# Features
SEARCH_PERSONALIZATION_ENABLED=true
SEARCH_ANALYTICS_ENABLED=true
```

### Performance Tuning

Adjust settings in `src/domains/search/config/search.config.ts`:

```typescript
export const SEARCH_CONFIG = {
  elasticsearch: {
    maxRetries: 3,
    requestTimeout: 30000,
  },
  cache: {
    ttl: 300,
    maxKeys: 10000,
  },
  // ... more settings
};
```

## 🛠️ Management Commands

### Reindexing

```bash
# Full reindex
npm run search:reindex -- --force

# Reindex specific category
npm run search:reindex -- --category cat_123

# Reindex specific product
npm run search:reindex -- --entity-type product --entity-id prod_456

# Dry run
npm run search:reindex -- --dry-run
```

### Health Monitoring

```bash
# Overall health
npm run search:health

# Detailed health check
curl http://localhost:3000/api/search/health | jq
```

### Infrastructure Management

```bash
# Start infrastructure
npm run infra:up

# Stop infrastructure
npm run infra:down

# View logs
npm run infra:logs

# Restart services
npm run infra:restart
```

## 📊 Monitoring & Analytics

### Health Endpoints

- `/api/search/health` - Overall system health
- `/api/search/health/elasticsearch` - Elasticsearch cluster health
- `/api/search/health/redis` - Redis cache health
- `/api/search/health/performance` - Search performance metrics

### Management UIs

- **Kibana**: http://localhost:5601 - Elasticsearch management
- **Redis Commander**: http://localhost:8081 - Redis management
- **API Documentation**: http://localhost:3000/api/docs

### Key Metrics

- Search response time (target: <100ms)
- Index size and document count
- Cache hit rates
- Error rates and availability
- Popular queries and zero-result queries

## 🧪 A/B Testing

The system includes a built-in A/B testing framework for search optimization:

### Creating Experiments

```typescript
const experiment = {
  name: 'Boost Featured Products',
  trafficAllocation: 50, // 50% of users
  variants: [
    {
      name: 'Control',
      trafficSplit: 50,
      configuration: { boostFactors: { featuredProducts: 1.0 } }
    },
    {
      name: 'Higher Boost',
      trafficSplit: 50,
      configuration: { boostFactors: { featuredProducts: 2.0 } }
    }
  ]
};
```

### Tracking Events

```typescript
await searchExperimentService.trackExperimentEvent(
  userId,
  sessionId,
  'product_click',
  { productId, position }
);
```

## 🔍 Troubleshooting

### Common Issues

1. **Elasticsearch Connection Failed**
   ```bash
   # Check if Elasticsearch is running
   curl http://localhost:9200/_cluster/health
   
   # Restart Elasticsearch
   docker-compose -f infrastructure/docker-compose.search.yml restart elasticsearch-master
   ```

2. **Search Returns No Results**
   ```bash
   # Check index status
   curl http://localhost:9200/marketplace_prod_products/_stats
   
   # Reindex data
   npm run search:reindex -- --force
   ```

3. **Slow Search Performance**
   ```bash
   # Check slow queries
   curl http://localhost:9200/_nodes/stats/indices/search
   
   # Clear cache
   curl -X POST http://localhost:9200/_cache/clear
   ```

### Debug Mode

Enable debug logging:

```bash
SEARCH_DEBUG_QUERIES=true npm run start:dev
```

### Performance Profiling

```bash
# Enable query profiling
curl -X PUT "localhost:9200/marketplace_prod_products/_settings" \
  -H "Content-Type: application/json" \
  -d '{"index.search.slowlog.threshold.query.debug": "0ms"}'
```

## 🚀 Deployment

### Development

```bash
npm run search:deploy
```

### Production

```bash
npm run search:deploy:prod
```

### Docker Deployment

```bash
# Build image
docker build -t marketplace-api .

# Run with search infrastructure
docker-compose -f docker-compose.yml -f infrastructure/docker-compose.search.yml up -d
```

### Kubernetes Deployment

See `k8s/` directory for Kubernetes manifests.

## 🧪 Testing

### Unit Tests

```bash
npm run search:test
```

### Integration Tests

```bash
npm run test:e2e -- --testPathPattern=search
```

### Load Testing

```bash
# Install k6
brew install k6

# Run load test
k6 run scripts/load-test-search.js
```

## 📈 Performance Benchmarks

### Target Metrics

- **Response Time**: <100ms (95th percentile)
- **Throughput**: 10,000 queries/second
- **Availability**: 99.9%
- **Index Size**: Support for 10M+ products

### Optimization Tips

1. **Use appropriate shard count** - 5 shards for <10M documents
2. **Enable caching** - Cache frequently accessed data
3. **Optimize queries** - Use filters instead of queries where possible
4. **Monitor performance** - Set up alerts for slow queries

## 🤝 Contributing

### Development Setup

```bash
# Install dependencies
npm install

# Start development environment
npm run infra:up
npm run start:dev

# Run tests
npm test
```

### Code Style

- Follow existing TypeScript patterns
- Add tests for new features
- Update documentation
- Use meaningful commit messages

## 📚 Additional Resources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Redis Documentation](https://redis.io/documentation)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Search API Documentation](./docs/SEARCH_API_DOCUMENTATION.md)
- [Implementation Guide](./docs/SEARCH_IMPLEMENTATION_GUIDE.md)
- [System Design](./docs/SEARCH_DISCOVERY_SYSTEM_DESIGN.md)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting guide above

---

**Built with ❤️ by the Marketplace Team**