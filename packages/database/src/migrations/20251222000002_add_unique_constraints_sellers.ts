import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add unique constraints to sellers table if they don't exist
  try {
    // Check if constraints already exist
    const constraints = await knex.raw(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'sellers' 
      AND constraint_type = 'UNIQUE'
      AND table_schema = current_schema()
    `);
    
    const existingConstraints = constraints.rows.map((row: any) => row.constraint_name.toLowerCase());
    
    await knex.schema.alterTable('sellers', (table) => {
      // Add unique constraint for email if it doesn't exist
      if (!existingConstraints.some((name: string) => name.includes('email'))) {
        table.unique(['email'], 'sellers_email_unique');
      }
      
      // Add unique constraint for mobile if it doesn't exist
      if (!existingConstraints.some((name: string) => name.includes('mobile'))) {
        table.unique(['mobile'], 'sellers_mobile_unique');
      }
    });
    
    console.log('✅ Unique constraints added to sellers table');
  } catch (error) {
    console.error('❌ Failed to add unique constraints:', error);
    throw error;
  }
}

export async function down(knex: Knex): Promise<void> {
  try {
    await knex.schema.alterTable('sellers', (table) => {
      table.dropUnique(['email'], 'sellers_email_unique');
      table.dropUnique(['mobile'], 'sellers_mobile_unique');
    });
    console.log('✅ Unique constraints removed from sellers table');
  } catch (error) {
    console.error('❌ Failed to remove unique constraints:', error);
    // Don't throw error on rollback to avoid blocking other migrations
  }
}