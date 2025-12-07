import { Knex } from 'knex';

/**
 * Migration: Create Settings Table
 * 
 * This migration creates the settings table for storing application-wide
 * configuration values like tax rate and delivery fee.
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Creating settings table...');

  await knex.schema.createTable('settings', (table) => {
    table.string('key', 100).primary();
    table.text('value').notNullable();
    table.string('description', 500);
    table.string('value_type', 20).notNullable().defaultTo('string').comment('string, number, boolean, json');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  console.log('✅ Created settings table');

  // Insert default settings
  console.log('📋 Inserting default settings...');
  
  await knex('settings').insert([
    {
      key: 'tax_rate',
      value: '5',
      description: 'Tax rate percentage (GST)',
      value_type: 'number',
    },
    {
      key: 'delivery_fee',
      value: '5000',
      description: 'Delivery fee in paise (₹50)',
      value_type: 'number',
    },
    {
      key: 'free_delivery_threshold',
      value: '50000',
      description: 'Minimum order amount for free delivery in paise (₹500)',
      value_type: 'number',
    },
  ]);

  console.log('✅ Inserted default settings');
  console.log('🎉 Settings table created successfully!');
}

export async function down(knex: Knex): Promise<void> {
  console.log('🔄 Rolling back settings table...');
  
  await knex.schema.dropTableIfExists('settings');
  
  console.log('✅ Settings table rollback completed');
}
