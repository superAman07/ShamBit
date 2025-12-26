import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop the existing enum constraint and recreate with correct values
  await knex.raw(`
    ALTER TABLE sellers 
    DROP CONSTRAINT IF EXISTS sellers_business_type_check;
  `);
  
  // Add the new enum constraint with both old and new values
  await knex.raw(`
    ALTER TABLE sellers 
    ADD CONSTRAINT sellers_business_type_check 
    CHECK (business_type IN (
      'individual', 
      'partnership', 
      'llp', 
      'private_limited', 
      'public_limited', 
      'trust', 
      'society', 
      'ngo',
      'grocery', 
      'organic', 
      'packaged', 
      'other'
    ));
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Revert to original enum values
  await knex.raw(`
    ALTER TABLE sellers 
    DROP CONSTRAINT IF EXISTS sellers_business_type_check;
  `);
  
  await knex.raw(`
    ALTER TABLE sellers 
    ADD CONSTRAINT sellers_business_type_check 
    CHECK (business_type IN ('grocery', 'organic', 'packaged', 'other'));
  `);
}