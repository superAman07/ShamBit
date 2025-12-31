// Performance Optimization Strategies for Category System
// Enterprise-grade performance patterns and caching strategies

export class CategoryPerformanceOptimization {
  // 1. Database Index Recommendations
  static readonly RECOMMENDED_INDEXES = {
    // Primary indexes for tree operations
    categories_parent_id:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_parent_id ON categories(parent_id) WHERE deleted_at IS NULL;',
    categories_path:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_path ON categories USING btree(path) WHERE deleted_at IS NULL;',
    categories_path_ids:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_path_ids ON categories USING gin(path_ids) WHERE deleted_at IS NULL;',

    // Status and visibility indexes
    categories_status_visibility:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_status_visibility ON categories(status, visibility) WHERE deleted_at IS NULL;',
    categories_active_leaf:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_active_leaf ON categories(is_leaf) WHERE status = 'ACTIVE' AND deleted_at IS NULL;",

    // Performance indexes for common queries
    categories_depth_status:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_depth_status ON categories(depth, status) WHERE deleted_at IS NULL;',
    categories_featured:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_featured ON categories(is_featured, display_order) WHERE status = 'ACTIVE' AND deleted_at IS NULL;",

    // Composite indexes for complex queries
    categories_parent_order:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_parent_order ON categories(parent_id, display_order) WHERE deleted_at IS NULL;',
    categories_path_status:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_path_status ON categories(path, status) WHERE deleted_at IS NULL;',

    // Multi-tenant indexes (if using tenancy)
    categories_tenant_status:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_tenant_status ON categories(tenant_id, status, visibility) WHERE deleted_at IS NULL;',

    // Audit and versioning indexes
    categories_version:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_version ON categories(version);',
    audit_logs_category_action:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_category_action ON category_audit_logs(category_id, action, created_at);',
    audit_logs_batch:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_batch ON category_audit_logs(batch_id) WHERE batch_id IS NOT NULL;',

    // Product relationship indexes
    products_category_path:
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_path ON products USING gin(category_path_ids) WHERE deleted_at IS NULL;',
  };

  // 2. Materialized View for High-Performance Queries
  static readonly MATERIALIZED_VIEW_SQL = `
    CREATE MATERIALIZED VIEW IF NOT EXISTS category_tree_materialized AS
    WITH RECURSIVE category_tree AS (
      -- Base case: root categories
      SELECT 
        id,
        name,
        slug,
        path,
        parent_id,
        depth,
        status,
        visibility,
        is_leaf,
        is_featured,
        child_count,
        descendant_count,
        product_count,
        ARRAY[id] as ancestors,
        0 as level_from_root
      FROM categories 
      WHERE parent_id IS NULL AND deleted_at IS NULL
      
      UNION ALL
      
      -- Recursive case: child categories
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.path,
        c.parent_id,
        c.depth,
        c.status,
        c.visibility,
        c.is_leaf,
        c.is_featured,
        c.child_count,
        c.descendant_count,
        c.product_count,
        ct.ancestors || c.id,
        ct.level_from_root + 1
      FROM categories c
      INNER JOIN category_tree ct ON c.parent_id = ct.id
      WHERE c.deleted_at IS NULL
    )
    SELECT * FROM category_tree;
    
    CREATE UNIQUE INDEX IF NOT EXISTS idx_category_tree_materialized_id 
    ON category_tree_materialized(id);
    
    CREATE INDEX IF NOT EXISTS idx_category_tree_materialized_parent 
    ON category_tree_materialized(parent_id);
    
    CREATE INDEX IF NOT EXISTS idx_category_tree_materialized_path 
    ON category_tree_materialized(path);
    
    CREATE INDEX IF NOT EXISTS idx_category_tree_materialized_ancestors 
    ON category_tree_materialized USING gin(ancestors);
  `;

  // 3. Refresh Materialized View Strategy
  static readonly REFRESH_MATERIALIZED_VIEW = `
    -- Refresh materialized view (run during low-traffic periods)
    REFRESH MATERIALIZED VIEW CONCURRENTLY category_tree_materialized;
    
    -- Or use selective refresh for specific subtrees
    CREATE OR REPLACE FUNCTION refresh_category_subtree(root_category_id UUID)
    RETURNS void AS $$
    BEGIN
      -- Implementation for selective refresh
      -- This would update only the affected portion of the materialized view
    END;
    $$ LANGUAGE plpgsql;
  `;

  // 4. Caching Strategy Configuration
  static readonly CACHE_STRATEGIES = {
    // Redis cache keys and TTL configurations
    CATEGORY_TREE: {
      key: 'category:tree:{rootId}:{depth}',
      ttl: 3600, // 1 hour
      tags: ['category', 'tree'],
    },
    CATEGORY_BREADCRUMB: {
      key: 'category:breadcrumb:{categoryId}',
      ttl: 7200, // 2 hours
      tags: ['category', 'breadcrumb'],
    },
    CATEGORY_CHILDREN: {
      key: 'category:children:{parentId}:{page}:{limit}',
      ttl: 1800, // 30 minutes
      tags: ['category', 'children'],
    },
    FEATURED_CATEGORIES: {
      key: 'category:featured:{tenantId}',
      ttl: 3600, // 1 hour
      tags: ['category', 'featured'],
    },
    CATEGORY_STATS: {
      key: 'category:stats:{categoryId}',
      ttl: 900, // 15 minutes
      tags: ['category', 'stats'],
    },
  };

  // 5. Query Optimization Patterns
  static readonly OPTIMIZED_QUERIES = {
    // Get category tree with minimal data transfer
    GET_TREE_MINIMAL: `
      SELECT id, name, slug, parent_id, depth, path, child_count, is_leaf
      FROM categories 
      WHERE (parent_id IS NULL OR path_ids && $1::uuid[])
        AND status = 'ACTIVE' 
        AND deleted_at IS NULL
        AND depth <= $2
      ORDER BY depth, display_order;
    `,

    // Get leaf categories for product assignment
    GET_LEAF_CATEGORIES: `
      SELECT id, name, slug, path
      FROM categories 
      WHERE is_leaf = true 
        AND status = 'ACTIVE' 
        AND deleted_at IS NULL
        AND ($1::uuid IS NULL OR $1 = ANY(path_ids))
      ORDER BY path;
    `,

    // Get category with ancestors (breadcrumb)
    GET_WITH_ANCESTORS: `
      WITH category_data AS (
        SELECT id, name, slug, path, path_ids
        FROM categories 
        WHERE id = $1 AND deleted_at IS NULL
      )
      SELECT c.id, c.name, c.slug, c.path, c.depth
      FROM categories c
      WHERE c.id = ANY((SELECT path_ids FROM category_data) || ARRAY[(SELECT id FROM category_data)])
        AND c.deleted_at IS NULL
      ORDER BY c.depth;
    `,

    // Efficient subtree query with product counts
    GET_SUBTREE_WITH_COUNTS: `
      SELECT 
        c.id, c.name, c.slug, c.path, c.depth, c.child_count,
        COALESCE(p.product_count, 0) as actual_product_count
      FROM categories c
      LEFT JOIN (
        SELECT category_id, COUNT(*) as product_count
        FROM products 
        WHERE deleted_at IS NULL
        GROUP BY category_id
      ) p ON c.id = p.category_id
      WHERE ($1::uuid IS NULL OR c.id = $1 OR $1 = ANY(c.path_ids))
        AND c.status = 'ACTIVE'
        AND c.deleted_at IS NULL
        AND ($2::int IS NULL OR c.depth <= $2)
      ORDER BY c.depth, c.display_order;
    `,
  };

  // 6. Batch Operation Patterns
  static readonly BATCH_OPERATIONS = {
    // Batch update tree statistics
    UPDATE_TREE_STATS_BATCH: `
      WITH category_stats AS (
        SELECT 
          c.id,
          COUNT(children.id) as child_count,
          COUNT(descendants.id) as descendant_count,
          COUNT(products.id) as product_count
        FROM categories c
        LEFT JOIN categories children ON children.parent_id = c.id AND children.deleted_at IS NULL
        LEFT JOIN categories descendants ON c.id = ANY(descendants.path_ids) AND descendants.deleted_at IS NULL
        LEFT JOIN products ON products.category_id = c.id AND products.deleted_at IS NULL
        WHERE c.id = ANY($1::uuid[])
        GROUP BY c.id
      )
      UPDATE categories 
      SET 
        child_count = category_stats.child_count,
        descendant_count = category_stats.descendant_count,
        product_count = category_stats.product_count,
        updated_at = NOW()
      FROM category_stats
      WHERE categories.id = category_stats.id;
    `,

    // Batch path updates for reparenting
    UPDATE_PATHS_BATCH: `
      UPDATE categories 
      SET 
        path = data.new_path,
        path_ids = data.new_path_ids,
        depth = data.new_depth,
        version = version + 1,
        updated_at = NOW()
      FROM (VALUES $1) AS data(id, new_path, new_path_ids, new_depth)
      WHERE categories.id = data.id::uuid;
    `,
  };

  // 7. Connection Pool Optimization
  static readonly CONNECTION_POOL_CONFIG = {
    // Prisma connection pool settings for high-performance
    datasource: {
      url: process.env.DATABASE_URL,
      // Connection pool configuration
      connection_limit: 20,
      pool_timeout: 10,
      statement_cache_size: 100,
    },
    // Read replica configuration for read-heavy operations
    readReplica: {
      url: process.env.DATABASE_READ_URL,
      connection_limit: 30,
    },
  };

  // 8. Monitoring and Alerting Queries
  static readonly MONITORING_QUERIES = {
    // Detect performance issues
    SLOW_QUERIES: `
      SELECT query, mean_time, calls, total_time
      FROM pg_stat_statements 
      WHERE query LIKE '%categories%'
      ORDER BY mean_time DESC 
      LIMIT 10;
    `,

    // Monitor tree depth distribution
    TREE_DEPTH_DISTRIBUTION: `
      SELECT depth, COUNT(*) as category_count
      FROM categories 
      WHERE deleted_at IS NULL
      GROUP BY depth 
      ORDER BY depth;
    `,

    // Monitor large subtrees
    LARGE_SUBTREES: `
      SELECT id, name, path, descendant_count
      FROM categories 
      WHERE descendant_count > 1000 
        AND deleted_at IS NULL
      ORDER BY descendant_count DESC;
    `,

    // Monitor orphaned categories
    ORPHANED_CATEGORIES: `
      SELECT c.id, c.name, c.path
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.parent_id IS NOT NULL 
        AND p.id IS NULL 
        AND c.deleted_at IS NULL;
    `,
  };

  // 9. Migration Scripts for Performance Optimization
  static readonly MIGRATION_SCRIPTS = {
    // Add missing indexes
    ADD_PERFORMANCE_INDEXES: Object.values(
      CategoryPerformanceOptimization.RECOMMENDED_INDEXES,
    ).join('\n'),

    // Create materialized view
    CREATE_MATERIALIZED_VIEW:
      CategoryPerformanceOptimization.MATERIALIZED_VIEW_SQL,

    // Update existing data for performance
    UPDATE_EXISTING_DATA: `
      -- Update path_ids for existing categories
      WITH RECURSIVE category_paths AS (
        SELECT id, parent_id, ARRAY[]::uuid[] as path_ids, 0 as depth
        FROM categories 
        WHERE parent_id IS NULL
        
        UNION ALL
        
        SELECT c.id, c.parent_id, cp.path_ids || c.parent_id, cp.depth + 1
        FROM categories c
        JOIN category_paths cp ON c.parent_id = cp.id
      )
      UPDATE categories 
      SET path_ids = category_paths.path_ids,
          depth = category_paths.depth
      FROM category_paths
      WHERE categories.id = category_paths.id;
      
      -- Update tree statistics
      ${CategoryPerformanceOptimization.BATCH_OPERATIONS.UPDATE_TREE_STATS_BATCH.replace('$1::uuid[]', '(SELECT array_agg(id) FROM categories WHERE deleted_at IS NULL)')}
    `,
  };

  // 10. Performance Testing Queries
  static readonly PERFORMANCE_TESTS = {
    // Test tree traversal performance
    TREE_TRAVERSAL_TEST: `
      EXPLAIN (ANALYZE, BUFFERS) 
      SELECT * FROM categories 
      WHERE path_ids && ARRAY['${'{test-category-id}'}']::uuid[]
        AND deleted_at IS NULL
      ORDER BY depth, display_order;
    `,

    // Test ancestor lookup performance
    ANCESTOR_LOOKUP_TEST: `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT * FROM categories 
      WHERE id = ANY((
        SELECT path_ids FROM categories WHERE id = '${'{test-category-id}'}'
      ))
      ORDER BY depth;
    `,

    // Test search performance
    SEARCH_PERFORMANCE_TEST: `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT * FROM categories 
      WHERE (name ILIKE '%${'{search-term}'}%' OR description ILIKE '%${'{search-term}'}%')
        AND status = 'ACTIVE'
        AND deleted_at IS NULL
      ORDER BY depth, display_order;
    `,
  };
}
