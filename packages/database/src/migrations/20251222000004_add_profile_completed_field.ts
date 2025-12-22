import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add profile_completed field to track completion status
  await knex.schema.alterTable('sellers', (table) => {
    table.boolean('profile_completed').defaultTo(false);
  });

  // Update existing sellers based on current logic
  await knex.raw(`
    UPDATE sellers 
    SET profile_completed = (
      pan_number IS NOT NULL 
      AND date_of_birth IS NOT NULL 
      AND gender IS NOT NULL 
      AND pan_number != 'XXXXXXXXXX'
      AND registered_business_address IS NOT NULL
      AND registered_business_address != '{}'
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('sellers', (table) => {
    table.dropColumn('profile_completed');
  });
}