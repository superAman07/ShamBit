# Variant Engine & Inventory System - Index Strategy

## Variant Engine Indexes

### ProductVariant Table
```sql
-- Primary key
PRIMARY KEY (id)

-- Unique constraints
UNIQUE (sku)
UNIQUE (variantId, sellerId, warehouseId) -- For inventory

-- Performance indexes
INDEX idx_product_variants_product_id (productId)
INDEX idx_product_variants_status (status)
INDEX idx_product_variants_sku (sku)
INDEX idx_product_variants_product_status (productId, status)
INDEX idx_product_variants_created_at (createdAt)
INDEX idx_product_variants_deleted_at (deletedAt)

-- Composite indexes for common queries
INDEX idx_product_variants_seller_status (sellerId, status) -- Seller's active variants
INDEX idx_product_variants_product_active (productId, status) WHERE status = 'ACTIVE'
```

### ProductVariantAttribute Table
```sql
-- Primary key
PRIMARY KEY (id)

-- Unique constraints
UNIQUE (variantId, attributeId)

-- Performance indexes
INDEX idx_variant_attributes_variant_id (variantId)
INDEX idx_variant_attributes_attribute_id (attributeId)
INDEX idx_variant_attributes_value (value) -- For value-based searches

-- Composite indexes
INDEX idx_variant_attributes_attr_value (attributeId, value) -- Attribute filtering
```

### SkuConfiguration Table
```sql
-- Primary key
PRIMARY KEY (id)

-- Unique constraints
UNIQUE (sellerId)

-- Performance indexes
INDEX idx_sku_config_seller_active (sellerId, isActive)
```

## Inventory System Indexes

### Inventory Table
```sql
-- Primary key
PRIMARY KEY (id)

-- Unique constraints
UNIQUE (variantId, sellerId, warehouseId)

-- Performance indexes
INDEX idx_inventory_variant_id (variantId)
INDEX idx_inventory_seller_id (sellerId)
INDEX idx_inventory_warehouse_id (warehouseId)
INDEX idx_inventory_available_quantity (availableQuantity)
INDEX idx_inventory_total_quantity (totalQuantity)
INDEX idx_inventory_created_at (createdAt)
INDEX idx_inventory_updated_at (updatedAt)

-- Composite indexes for common queries
INDEX idx_inventory_seller_available (sellerId, availableQuantity)
INDEX idx_inventory_variant_seller (variantId, sellerId)
INDEX idx_inventory_low_stock (sellerId, availableQuantity) WHERE availableQuantity <= lowStockThreshold
INDEX idx_inventory_out_of_stock (sellerId, availableQuantity) WHERE availableQuantity <= 0

-- Partial indexes for performance
INDEX idx_inventory_active (variantId, sellerId) WHERE deletedAt IS NULL
```

### InventoryLedger Table
```sql
-- Primary key
PRIMARY KEY (id)

-- Performance indexes
INDEX idx_inventory_ledger_inventory_id (inventoryId)
INDEX idx_inventory_ledger_inventory_created (inventoryId, createdAt)
INDEX idx_inventory_ledger_type (type)
INDEX idx_inventory_ledger_reference (referenceType, referenceId)
INDEX idx_inventory_ledger_created_at (createdAt)

-- Composite indexes for reporting
INDEX idx_inventory_ledger_inventory_type_date (inventoryId, type, createdAt)
INDEX idx_inventory_ledger_seller_date (sellerId, createdAt) -- Via inventory join
```

### InventoryReservation Table
```sql
-- Primary key
PRIMARY KEY (id)

-- Unique constraints
UNIQUE (reservationKey)

-- Performance indexes
INDEX idx_inventory_reservations_inventory_id (inventoryId)
INDEX idx_inventory_reservations_key (reservationKey)
INDEX idx_inventory_reservations_expires_at (expiresAt)
INDEX idx_inventory_reservations_status (status)
INDEX idx_inventory_reservations_reference (referenceType, referenceId)
INDEX idx_inventory_reservations_created_at (createdAt)

-- Composite indexes for cleanup and queries
INDEX idx_inventory_reservations_active_expired (status, expiresAt) WHERE status = 'ACTIVE'
INDEX idx_inventory_reservations_inventory_active (inventoryId, status) WHERE status = 'ACTIVE'
```

## Query Optimization Patterns

### Variant Queries

#### Find variants by product and status
```sql
-- Optimized by: idx_product_variants_product_status
SELECT * FROM product_variants 
WHERE productId = ? AND status = 'ACTIVE'
ORDER BY displayOrder, createdAt;
```

#### Find variants by attribute combination
```sql
-- Optimized by: idx_variant_attributes_attr_value
SELECT v.* FROM product_variants v
JOIN product_variant_attributes va1 ON v.id = va1.variantId
JOIN product_variant_attributes va2 ON v.id = va2.variantId
WHERE va1.attributeId = ? AND va1.value = ?
  AND va2.attributeId = ? AND va2.value = ?;
```

#### Seller's variant catalog
```sql
-- Optimized by: idx_product_variants_seller_status
SELECT v.*, p.name as productName 
FROM product_variants v
JOIN products p ON v.productId = p.id
WHERE p.sellerId = ? AND v.status = 'ACTIVE'
ORDER BY v.createdAt DESC;
```

### Inventory Queries

#### Check stock availability
```sql
-- Optimized by: idx_inventory_variant_seller
SELECT availableQuantity 
FROM inventory 
WHERE variantId = ? AND sellerId = ? AND deletedAt IS NULL;
```

#### Low stock alerts
```sql
-- Optimized by: idx_inventory_low_stock (partial index)
SELECT i.*, v.sku, p.name 
FROM inventory i
JOIN product_variants v ON i.variantId = v.id
JOIN products p ON v.productId = p.id
WHERE i.sellerId = ? 
  AND i.availableQuantity <= i.lowStockThreshold
  AND i.deletedAt IS NULL;
```

#### Inventory movements report
```sql
-- Optimized by: idx_inventory_ledger_inventory_type_date
SELECT * FROM inventory_ledger 
WHERE inventoryId = ? 
  AND type IN ('INBOUND', 'OUTBOUND')
  AND createdAt BETWEEN ? AND ?
ORDER BY createdAt DESC;
```

#### Active reservations cleanup
```sql
-- Optimized by: idx_inventory_reservations_active_expired
SELECT * FROM inventory_reservations 
WHERE status = 'ACTIVE' 
  AND expiresAt < NOW()
LIMIT 100;
```

## Performance Considerations

### Concurrency Optimization
- Use row-level locking for inventory updates
- Implement optimistic locking with version fields
- Use serializable isolation for reservation operations

### Query Performance
- Partition large tables by date (ledger entries)
- Use covering indexes where possible
- Implement query result caching for read-heavy operations

### Maintenance
- Regular VACUUM and ANALYZE on PostgreSQL
- Monitor index usage and remove unused indexes
- Consider archiving old ledger entries

## Scaling Strategies

### Read Replicas
- Route read queries to replicas
- Use eventual consistency for reporting
- Implement read-through caching

### Sharding Considerations
- Shard by sellerId for multi-tenant scaling
- Keep variant and inventory data co-located
- Use distributed transactions carefully

### Caching Strategy
- Cache frequently accessed inventory levels
- Invalidate cache on stock movements
- Use Redis for reservation state