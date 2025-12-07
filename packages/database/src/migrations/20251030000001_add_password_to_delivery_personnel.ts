import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add password_hash column to delivery_personnel table
  await knex.schema.alterTable('delivery_personnel', (table) => {
    table.string('password_hash', 255);
  });

  // Create index for faster mobile number lookups (if not exists)
  await knex.schema.alterTable('delivery_personnel', (table) => {
    table.index('mobile_number', 'idx_delivery_personnel_mobile');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('delivery_personnel', (table) => {
    table.dropIndex('mobile_number', 'idx_delivery_personnel_mobile');
    table.dropColumn('password_hash');
  });
}