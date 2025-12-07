import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add foreign key constraint for product_batches.received_by_user_id
  // First check if admins table exists, if not use users table
  const adminTableExists = await knex.schema.hasTable('admins');
  
  if (adminTableExists) {
    await knex.schema.alterTable('product_batches', (table) => {
      table
        .foreign('received_by_user_id')
        .references('id')
        .inTable('admins')
        .onDelete('SET NULL');
    });
  }

  // Add foreign key constraint for inventory.last_updated_by_id
  if (adminTableExists) {
    await knex.schema.alterTable('inventory', (table) => {
      table
        .foreign('last_updated_by_id')
        .references('id')
        .inTable('admins')
        .onDelete('SET NULL');
    });
  }

  // Add check constraints for data integrity
  await knex.raw(`
    ALTER TABLE product_batches 
    ADD CONSTRAINT chk_batch_quantity_positive 
    CHECK (quantity > 0 AND available_qty >= 0 AND available_qty <= quantity)
  `);

  await knex.raw(`
    ALTER TABLE product_batches 
    ADD CONSTRAINT chk_batch_dates 
    CHECK (expiry_date IS NULL OR manufacture_date IS NULL OR expiry_date > manufacture_date)
  `);

  await knex.raw(`
    ALTER TABLE inventory 
    ADD CONSTRAINT chk_inventory_stock_positive 
    CHECK (total_stock >= 0 AND available_stock >= 0 AND reserved_stock >= 0)
  `);

  await knex.raw(`
    ALTER TABLE inventory 
    ADD CONSTRAINT chk_inventory_stock_balance 
    CHECK (total_stock = available_stock + reserved_stock)
  `);

  await knex.raw(`
    ALTER TABLE product_offers 
    ADD CONSTRAINT chk_offer_dates 
    CHECK (end_date > start_date)
  `);

  await knex.raw(`
    ALTER TABLE product_offers 
    ADD CONSTRAINT chk_offer_discount_positive 
    CHECK (discount_value > 0)
  `);

  console.log('✅ Added foreign key constraints and data integrity checks');
}

export async function down(knex: Knex): Promise<void> {
  // Drop check constraints
  await knex.raw('ALTER TABLE product_batches DROP CONSTRAINT IF EXISTS chk_batch_quantity_positive');
  await knex.raw('ALTER TABLE product_batches DROP CONSTRAINT IF EXISTS chk_batch_dates');
  await knex.raw('ALTER TABLE inventory DROP CONSTRAINT IF EXISTS chk_inventory_stock_positive');
  await knex.raw('ALTER TABLE inventory DROP CONSTRAINT IF EXISTS chk_inventory_stock_balance');
  await knex.raw('ALTER TABLE product_offers DROP CONSTRAINT IF EXISTS chk_offer_dates');
  await knex.raw('ALTER TABLE product_offers DROP CONSTRAINT IF EXISTS chk_offer_discount_positive');

  // Drop foreign key constraints
  const adminTableExists = await knex.schema.hasTable('admins');
  
  if (adminTableExists) {
    await knex.schema.alterTable('product_batches', (table) => {
      table.dropForeign(['received_by_user_id']);
    });

    await knex.schema.alterTable('inventory', (table) => {
      table.dropForeign(['last_updated_by_id']);
    });
  }

  console.log('✅ Dropped foreign key constraints and data integrity checks');
}