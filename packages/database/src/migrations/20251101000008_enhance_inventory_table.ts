import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // First, create a default warehouse for existing inventory
  const [defaultWarehouse] = await knex('warehouses')
    .insert({
      name: 'Main Warehouse',
      code: 'WH-MAIN',
      address_line1: 'Default Address',
      city: 'Default City',
      state: 'Default State',
      country: 'India',
      postal_code: null,
      is_active: true
    })
    .returning('id');

  // Remove the unique constraint on product_id to allow multi-warehouse
  await knex.schema.alterTable('inventory', (table) => {
    table.dropUnique(['product_id']);
  });

  // Add new columns to inventory table
  await knex.schema.alterTable('inventory', (table) => {
    table
      .uuid('warehouse_id')
      .references('id')
      .inTable('warehouses')
      .onDelete('CASCADE');
    table.integer('threshold_stock').defaultTo(10);
    table
      .enum('stock_level', ['Normal', 'Low', 'Out'])
      .defaultTo('Normal');
    table.timestamp('last_restock_date');
    table.timestamp('last_sale_date');
    table.uuid('last_updated_by_id');
    table
      .enum('status', ['Active', 'Inactive'])
      .defaultTo('Active');
  });

  // Migrate existing inventory to default warehouse
  await knex('inventory')
    .update({
      warehouse_id: defaultWarehouse.id,
      threshold_stock: knex.raw('low_stock_threshold'),
      last_restock_date: knex.raw('last_restocked_at')
    });

  // Create composite unique constraint for product_id + warehouse_id
  await knex.schema.alterTable('inventory', (table) => {
    table.unique(['product_id', 'warehouse_id']);
  });

  // Drop old columns
  await knex.schema.alterTable('inventory', (table) => {
    table.dropColumn('low_stock_threshold');
    table.dropColumn('last_restocked_at');
  });

  // Add new indexes
  await knex.schema.alterTable('inventory', (table) => {
    table.index('warehouse_id');
    table.index('stock_level');
    table.index(['warehouse_id', 'stock_level']);
  });

  // Add partial index for low stock items using raw SQL
  await knex.raw(`
    CREATE INDEX idx_inventory_low_stock 
    ON inventory(warehouse_id, stock_level) 
    WHERE stock_level = 'Low'
  `);

  // Update stock levels based on available stock vs threshold
  await knex.raw(`
    UPDATE inventory 
    SET stock_level = CASE 
      WHEN available_stock = 0 THEN 'Out'
      WHEN available_stock <= threshold_stock THEN 'Low'
      ELSE 'Normal'
    END
  `);

  console.log('✅ Enhanced inventory table with multi-warehouse support');
}

export async function down(knex: Knex): Promise<void> {
  // Remove composite unique constraint
  await knex.schema.alterTable('inventory', (table) => {
    table.dropUnique(['product_id', 'warehouse_id']);
  });

  // Add back old columns
  await knex.schema.alterTable('inventory', (table) => {
    table.integer('low_stock_threshold').defaultTo(10);
    table.timestamp('last_restocked_at');
  });

  // Migrate data back
  await knex('inventory')
    .update({
      low_stock_threshold: knex.raw('threshold_stock'),
      last_restocked_at: knex.raw('last_restock_date')
    });

  // Drop new columns
  await knex.schema.alterTable('inventory', (table) => {
    table.dropColumn('warehouse_id');
    table.dropColumn('threshold_stock');
    table.dropColumn('stock_level');
    table.dropColumn('last_restock_date');
    table.dropColumn('last_sale_date');
    table.dropColumn('last_updated_by_id');
    table.dropColumn('status');
  });

  // Restore unique constraint on product_id
  await knex.schema.alterTable('inventory', (table) => {
    table.unique(['product_id']);
  });

  console.log('✅ Reverted inventory table enhancements');
}