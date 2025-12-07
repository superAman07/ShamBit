import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add unique constraint on warehouse name (case-insensitive)
  await knex.raw(`
    CREATE UNIQUE INDEX warehouses_name_unique 
    ON warehouses (LOWER(name))
  `);

  // Add unique constraint on address combination (case-insensitive)
  await knex.raw(`
    CREATE UNIQUE INDEX warehouses_address_unique 
    ON warehouses (LOWER(address_line1), LOWER(city), LOWER(state), LOWER(country), LOWER(postal_code))
  `);

  console.log('✅ Added unique constraints to warehouses table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS warehouses_name_unique');
  await knex.raw('DROP INDEX IF EXISTS warehouses_address_unique');

  console.log('✅ Removed unique constraints from warehouses table');
}