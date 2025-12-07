import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add warehouse_id to inventory_reservations table
  await knex.schema.alterTable('inventory_reservations', (table) => {
    table
      .uuid('warehouse_id')
      .references('id')
      .inTable('warehouses')
      .onDelete('CASCADE');
  });

  // Update existing reservations with default warehouse
  const defaultWarehouse = await knex('warehouses')
    .where('code', 'WH-MAIN')
    .select('id')
    .first();

  if (defaultWarehouse) {
    await knex('inventory_reservations')
      .whereNull('warehouse_id')
      .update({ warehouse_id: defaultWarehouse.id });
  }

  // Add index for warehouse_id
  await knex.schema.alterTable('inventory_reservations', (table) => {
    table.index('warehouse_id');
    table.index(['product_id', 'warehouse_id']);
  });

  console.log('✅ Added warehouse_id to inventory_reservations table');
}

export async function down(knex: Knex): Promise<void> {
  // Drop warehouse_id column from inventory_reservations
  await knex.schema.alterTable('inventory_reservations', (table) => {
    table.dropColumn('warehouse_id');
  });

  console.log('✅ Removed warehouse_id from inventory_reservations table');
}