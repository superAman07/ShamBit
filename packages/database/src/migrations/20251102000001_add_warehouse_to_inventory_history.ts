import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add warehouse_id to inventory_history table
  await knex.schema.alterTable('inventory_history', (table) => {
    table
      .uuid('warehouse_id')
      .references('id')
      .inTable('warehouses')
      .onDelete('CASCADE');
  });

  // Update existing inventory_history records with warehouse_id from inventory table
  await knex.raw(`
    UPDATE inventory_history 
    SET warehouse_id = (
      SELECT warehouse_id 
      FROM inventory 
      WHERE inventory.product_id = inventory_history.product_id 
      LIMIT 1
    )
    WHERE warehouse_id IS NULL
  `);

  // Make warehouse_id not nullable after migration
  await knex.schema.alterTable('inventory_history', (table) => {
    table.uuid('warehouse_id').notNullable().alter();
  });

  // Add index for warehouse_id
  await knex.schema.alterTable('inventory_history', (table) => {
    table.index('warehouse_id');
    table.index(['product_id', 'warehouse_id']);
  });

  console.log('✅ Added warehouse_id to inventory_history table');
}

export async function down(knex: Knex): Promise<void> {
  // Drop warehouse_id column from inventory_history
  await knex.schema.alterTable('inventory_history', (table) => {
    table.dropColumn('warehouse_id');
  });

  console.log('✅ Removed warehouse_id from inventory_history table');
}