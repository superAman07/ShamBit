import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Starting warehouse module removal migration...');

  // Phase 1: Remove foreign key constraints
  console.log('📋 Phase 1: Removing foreign key constraints...');
  
  // Drop foreign key from inventory table
  await knex.schema.alterTable('inventory', (table) => {
    table.dropForeign(['warehouse_id']);
  });
  
  // Drop foreign key from inventory_history table
  await knex.schema.alterTable('inventory_history', (table) => {
    table.dropForeign(['warehouse_id']);
  });
  
  // Drop foreign key from inventory_reservations table
  await knex.schema.alterTable('inventory_reservations', (table) => {
    table.dropForeign(['warehouse_id']);
  });
  
  // Drop foreign key from product_batches table
  await knex.schema.alterTable('product_batches', (table) => {
    table.dropForeign(['warehouse_id']);
  });
  
  console.log('✅ Foreign key constraints removed');

  // Phase 2: Consolidate inventory data
  console.log('📋 Phase 2: Consolidating inventory data...');
  
  // Get all products with multiple warehouse entries
  const productsWithMultipleWarehouses = await knex('inventory')
    .select('product_id')
    .groupBy('product_id')
    .havingRaw('COUNT(*) > 1');
  
  console.log(`Found ${productsWithMultipleWarehouses.length} products with multiple warehouse entries`);
  
  // Consolidate inventory for each product
  for (const { product_id } of productsWithMultipleWarehouses) {
    // Get all warehouse entries for this product
    const warehouseEntries = await knex('inventory')
      .where('product_id', product_id)
      .select('*');
    
    // Calculate aggregated values
    const aggregated = {
      total_stock: warehouseEntries.reduce((sum, entry) => sum + (entry.total_stock || 0), 0),
      available_stock: warehouseEntries.reduce((sum, entry) => sum + (entry.available_stock || 0), 0),
      reserved_stock: warehouseEntries.reduce((sum, entry) => sum + (entry.reserved_stock || 0), 0),
      threshold_stock: Math.max(...warehouseEntries.map(e => e.threshold_stock || 10)),
      last_restock_date: warehouseEntries
        .map(e => e.last_restock_date)
        .filter(d => d)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null,
      last_sale_date: warehouseEntries
        .map(e => e.last_sale_date)
        .filter(d => d)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null,
      last_updated_by_id: warehouseEntries
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
        .last_updated_by_id,
      status: warehouseEntries.some(e => e.status === 'Active') ? 'Active' : 'Inactive'
    };
    
    // Calculate stock level
    let stock_level: 'Normal' | 'Low' | 'Out' = 'Normal';
    if (aggregated.available_stock === 0) {
      stock_level = 'Out';
    } else if (aggregated.available_stock <= aggregated.threshold_stock) {
      stock_level = 'Low';
    }
    
    // Keep the first entry and update it with aggregated values
    const firstEntry = warehouseEntries[0];
    await knex('inventory')
      .where('id', firstEntry.id)
      .update({
        total_stock: aggregated.total_stock,
        available_stock: aggregated.available_stock,
        reserved_stock: aggregated.reserved_stock,
        threshold_stock: aggregated.threshold_stock,
        stock_level: stock_level,
        last_restock_date: aggregated.last_restock_date,
        last_sale_date: aggregated.last_sale_date,
        last_updated_by_id: aggregated.last_updated_by_id,
        status: aggregated.status,
        updated_at: knex.fn.now()
      });
    
    // Delete other entries
    await knex('inventory')
      .where('product_id', product_id)
      .whereNot('id', firstEntry.id)
      .delete();
  }
  
  console.log('✅ Inventory data consolidated');

  // Phase 3: Remove warehouse columns and indexes
  console.log('📋 Phase 3: Removing warehouse columns and indexes...');
  
  // Drop composite unique constraint from inventory
  await knex.schema.alterTable('inventory', (table) => {
    table.dropUnique(['product_id', 'warehouse_id']);
  });
  
  // Drop warehouse-related indexes from inventory
  await knex.raw('DROP INDEX IF EXISTS inventory_warehouse_id_index');
  await knex.raw('DROP INDEX IF EXISTS inventory_warehouse_id_stock_level_index');
  await knex.raw('DROP INDEX IF EXISTS idx_inventory_low_stock');
  
  // Drop warehouse_id column from inventory
  await knex.schema.alterTable('inventory', (table) => {
    table.dropColumn('warehouse_id');
  });
  
  // Drop warehouse-related indexes from inventory_history
  await knex.raw('DROP INDEX IF EXISTS inventory_history_warehouse_id_index');
  await knex.raw('DROP INDEX IF EXISTS inventory_history_product_id_warehouse_id_index');
  
  // Drop warehouse_id column from inventory_history
  await knex.schema.alterTable('inventory_history', (table) => {
    table.dropColumn('warehouse_id');
  });
  
  // Drop warehouse-related indexes from inventory_reservations
  await knex.raw('DROP INDEX IF EXISTS inventory_reservations_warehouse_id_index');
  await knex.raw('DROP INDEX IF EXISTS inventory_reservations_product_id_warehouse_id_index');
  
  // Drop warehouse_id column from inventory_reservations
  await knex.schema.alterTable('inventory_reservations', (table) => {
    table.dropColumn('warehouse_id');
  });
  
  // Drop warehouse-related indexes from product_batches
  await knex.raw('DROP INDEX IF EXISTS product_batches_warehouse_id_index');
  await knex.raw('DROP INDEX IF EXISTS product_batches_product_id_warehouse_id_index');
  
  // Drop warehouse_id column from product_batches
  await knex.schema.alterTable('product_batches', (table) => {
    table.dropColumn('warehouse_id');
  });
  
  console.log('✅ Warehouse columns and indexes removed');

  // Phase 4: Add unique constraint on product_id
  console.log('📋 Phase 4: Adding unique constraint on product_id...');
  
  await knex.schema.alterTable('inventory', (table) => {
    table.unique(['product_id']);
  });
  
  console.log('✅ Unique constraint added');

  // Phase 5: Drop warehouses table
  console.log('📋 Phase 5: Dropping warehouses table...');
  
  // First check if batch_movements table exists and drop its foreign keys if it does
  const batchMovementsExists = await knex.schema.hasTable('batch_movements');
  if (batchMovementsExists) {
    console.log('Found batch_movements table, dropping foreign keys...');
    await knex.schema.alterTable('batch_movements', (table) => {
      table.dropForeign(['from_warehouse_id']);
      table.dropForeign(['to_warehouse_id']);
    });
    console.log('✅ Batch movements foreign keys dropped');
  }
  
  await knex.schema.dropTableIfExists('warehouses');
  
  console.log('✅ Warehouses table dropped');
  console.log('🎉 Warehouse module removal migration completed successfully!');
}

export async function down(knex: Knex): Promise<void> {
  console.log('🔄 Starting warehouse module restoration migration...');

  // Phase 1: Recreate warehouses table
  console.log('📋 Phase 1: Recreating warehouses table...');
  
  await knex.schema.createTable('warehouses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('code', 100).unique().notNullable();
    table.string('address_line1', 255).notNullable();
    table.string('address_line2', 255);
    table.string('city', 100).notNullable();
    table.string('state', 100).notNullable();
    table.string('country', 100).notNullable();
    table.string('postal_code', 20).notNullable();
    table.decimal('latitude', 10, 8);
    table.decimal('longitude', 11, 8);
    table.string('contact_person', 255);
    table.string('phone', 50);
    table.string('email', 100);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('code');
    table.index('is_active');
    table.index(['latitude', 'longitude']);
    table.index(['is_active', 'city']);
  });
  
  console.log('✅ Warehouses table recreated');

  // Phase 2: Create default warehouse
  console.log('📋 Phase 2: Creating default warehouse...');
  
  const [defaultWarehouse] = await knex('warehouses')
    .insert({
      name: 'Main Warehouse',
      code: 'WH-MAIN',
      address_line1: 'Default Address',
      city: 'Default City',
      state: 'Default State',
      country: 'India',
      postal_code: '000000',
      is_active: true
    })
    .returning('id');
  
  console.log('✅ Default warehouse created');

  // Phase 3: Remove unique constraint from inventory
  console.log('📋 Phase 3: Removing unique constraint from inventory...');
  
  await knex.schema.alterTable('inventory', (table) => {
    table.dropUnique(['product_id']);
  });
  
  console.log('✅ Unique constraint removed');

  // Phase 4: Add warehouse_id columns back
  console.log('📋 Phase 4: Adding warehouse_id columns back...');
  
  // Add warehouse_id to inventory
  await knex.schema.alterTable('inventory', (table) => {
    table
      .uuid('warehouse_id')
      .references('id')
      .inTable('warehouses')
      .onDelete('CASCADE');
  });
  
  // Update all inventory records with default warehouse
  await knex('inventory').update({ warehouse_id: defaultWarehouse.id });
  
  // Add warehouse_id to inventory_history
  await knex.schema.alterTable('inventory_history', (table) => {
    table
      .uuid('warehouse_id')
      .references('id')
      .inTable('warehouses')
      .onDelete('CASCADE');
  });
  
  // Update all inventory_history records with default warehouse
  await knex('inventory_history').update({ warehouse_id: defaultWarehouse.id });
  
  // Add warehouse_id to inventory_reservations
  await knex.schema.alterTable('inventory_reservations', (table) => {
    table
      .uuid('warehouse_id')
      .references('id')
      .inTable('warehouses')
      .onDelete('CASCADE');
  });
  
  // Update all inventory_reservations records with default warehouse
  await knex('inventory_reservations').update({ warehouse_id: defaultWarehouse.id });
  
  // Add warehouse_id to product_batches
  await knex.schema.alterTable('product_batches', (table) => {
    table
      .uuid('warehouse_id')
      .references('id')
      .inTable('warehouses')
      .onDelete('SET NULL');
  });
  
  // Update all product_batches records with default warehouse
  await knex('product_batches').update({ warehouse_id: defaultWarehouse.id });
  
  console.log('✅ Warehouse_id columns added back');

  // Phase 5: Restore indexes and constraints
  console.log('📋 Phase 5: Restoring indexes and constraints...');
  
  // Add composite unique constraint to inventory
  await knex.schema.alterTable('inventory', (table) => {
    table.unique(['product_id', 'warehouse_id']);
  });
  
  // Add indexes to inventory
  await knex.schema.alterTable('inventory', (table) => {
    table.index('warehouse_id');
    table.index(['warehouse_id', 'stock_level']);
  });
  
  // Add partial index for low stock items
  await knex.raw(`
    CREATE INDEX idx_inventory_low_stock 
    ON inventory(warehouse_id, stock_level) 
    WHERE stock_level = 'Low'
  `);
  
  // Add indexes to inventory_history
  await knex.schema.alterTable('inventory_history', (table) => {
    table.index('warehouse_id');
    table.index(['product_id', 'warehouse_id']);
  });
  
  // Add indexes to inventory_reservations
  await knex.schema.alterTable('inventory_reservations', (table) => {
    table.index('warehouse_id');
    table.index(['product_id', 'warehouse_id']);
  });
  
  // Add indexes to product_batches
  await knex.schema.alterTable('product_batches', (table) => {
    table.index('warehouse_id');
    table.index(['product_id', 'warehouse_id']);
  });
  
  console.log('✅ Indexes and constraints restored');
  console.log('🎉 Warehouse module restoration migration completed successfully!');
}
